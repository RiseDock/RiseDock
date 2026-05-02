use base64::{engine::general_purpose::STANDARD, Engine};
use image::ImageEncoder;
use std::io::Cursor;
use std::path::Path;
use tauri::command;

#[cfg(windows)]
use std::os::windows::ffi::OsStrExt;

/// 提取 exe 文件的图标，返回 Base64 编码的 PNG
#[command]
pub fn extract_icon(exe_path: String) -> Result<String, String> {
    #[cfg(windows)]
    {
        extract_icon_windows(&exe_path)
    }

    #[cfg(not(windows))]
    {
        Err("图标提取仅支持 Windows".to_string())
    }
}

#[cfg(windows)]
fn extract_icon_windows(exe_path: &str) -> Result<String, String> {
    use std::ffi::OsStr;
    use windows::Win32::UI::Shell::{
        SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_SMALLICON,
    };
    use windows::Win32::UI::WindowsAndMessaging::{DestroyIcon, GetIconInfo, HICON, ICONINFO};
    use windows::Win32::Storage::FileSystem::FILE_FLAGS_AND_ATTRIBUTES;

    let path = Path::new(exe_path);
    if !path.exists() {
        eprintln!("extract_icon: 文件不存在: {}", exe_path);
        return Err(format!("文件不存在: {}", exe_path));
    }

    // 将路径转换为宽字符串
    let wide_path: Vec<u16> = OsStr::new(exe_path)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let mut shfi = SHFILEINFOW::default();

    // 获取文件图标
    let result = unsafe {
        SHGetFileInfoW(
            windows::core::PCWSTR(wide_path.as_ptr()),
            FILE_FLAGS_AND_ATTRIBUTES(0),
            Some(&mut shfi as *mut _ as *mut SHFILEINFOW),
            std::mem::size_of::<SHFILEINFOW>() as u32,
            SHGFI_ICON | SHGFI_SMALLICON,
        )
    };

    eprintln!("extract_icon: SHGetFileInfoW result = {}, hIcon valid = {}", result, !shfi.hIcon.is_invalid());

    if result == 0 || shfi.hIcon.is_invalid() {
        eprintln!("extract_icon: 获取图标失败 result={}, exe={}", result, exe_path);
        return Err(format!("无法获取图标: {}", exe_path));
    }

    let hicon: HICON = shfi.hIcon;

    // 获取图标信息
    let mut icon_info = ICONINFO::default();
    if unsafe { GetIconInfo(hicon, &mut icon_info) }.is_err() {
        unsafe { DestroyIcon(hicon) };
        return Err("获取图标信息失败".to_string());
    }

    // 优先使用彩色图标 (hbmColor)
    let hbm = if !icon_info.hbmColor.is_invalid() {
        icon_info.hbmColor
    } else {
        icon_info.hbmMask
    };

    if hbm.is_invalid() {
        unsafe { DestroyIcon(hicon) };
        return Err("无法获取位图".to_string());
    }

    // 将 HBITMAP 转换为 PNG
    let png_data = match bitmap_to_png(hbm) {
        Ok(data) => data,
        Err(e) => {
            unsafe { DestroyIcon(hicon) };
            return Err(e);
        }
    };

    unsafe { DestroyIcon(hicon) };

    // 编码为 Base64
    Ok(STANDARD.encode(&png_data))
}

#[cfg(windows)]
fn bitmap_to_png(hbm: windows::Win32::Graphics::Gdi::HBITMAP) -> Result<Vec<u8>, String> {
    use windows::Win32::Graphics::Gdi::{
        CreateCompatibleDC, DeleteDC, GetDIBits, GetDC, GetObjectW, ReleaseDC,
        BITMAP, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
    };
    use windows::Win32::Foundation::HWND;

    // 获取屏幕 DC
    let hdc = unsafe { GetDC(HWND::default()) };
    if hdc.is_invalid() {
        return Err("无法获取 DC".to_string());
    }

    // 创建兼容 DC
    let hdc_mem = unsafe { CreateCompatibleDC(hdc) };
    if hdc_mem.is_invalid() {
        let _ = unsafe { ReleaseDC(HWND::default(), hdc) };
        return Err("无法创建兼容 DC".to_string());
    }

    // 获取位图信息
    let mut bm = BITMAP::default();
    let size = unsafe {
        GetObjectW(
            hbm,
            std::mem::size_of::<BITMAP>() as i32,
            Some(&mut bm as *mut _ as *mut std::ffi::c_void),
        )
    };

    if size == 0 {
        let _ = unsafe { DeleteDC(hdc_mem) };
        let _ = unsafe { ReleaseDC(HWND::default(), hdc) };
        return Err("无法获取位图对象".to_string());
    }

    let width = bm.bmWidth as u32;
    let height = bm.bmHeight as u32;

    if width == 0 || height == 0 {
        let _ = unsafe { DeleteDC(hdc_mem) };
        let _ = unsafe { ReleaseDC(HWND::default(), hdc) };
        return Err("位图尺寸无效".to_string());
    }

    // 限制最大尺寸为 64x64 以加快处理速度
    let target_size = width.min(64).min(height);

    // 分配内存获取位图数据
    let mut bmi = BITMAPINFOHEADER::default();
    bmi.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
    bmi.biWidth = width as i32;
    bmi.biHeight = -(height as i32); // 自上而下
    bmi.biPlanes = 1;
    bmi.biBitCount = 32; // 转换为 32 位 ARGB
    bmi.biCompression = BI_RGB.0;

    let mut bits: Vec<u8> = vec![0; (width * height * 4) as usize];

    let lines = unsafe {
        GetDIBits(
            hdc_mem,
            hbm,
            0,
            height,
            Some(bits.as_mut_ptr() as *mut std::ffi::c_void),
            &mut bmi as *mut _ as *mut BITMAPINFO,
            DIB_RGB_COLORS,
        )
    };

    // 释放 DC
    let _ = unsafe { DeleteDC(hdc_mem) };
    let _ = unsafe { ReleaseDC(HWND::default(), hdc) };

    if lines == 0 {
        return Err("无法获取位图数据".to_string());
    }

    // 缩放图片
    let resized_bits = if target_size < width || target_size < height {
        resize_argb_bits(&bits, width, height, target_size)?
    } else {
        bits
    };

    // 转换为 RGBA 格式 (BGRA -> RGBA)
    let rgba_bits = convert_bgra_to_rgba(&resized_bits);

    // 创建 PNG
    let mut png_data = Vec::new();
    {
        let mut cursor = Cursor::new(&mut png_data);
        let encoder = image::codecs::png::PngEncoder::new(&mut cursor);
        encoder
            .write_image(
                &rgba_bits,
                target_size,
                target_size,
                image::ExtendedColorType::Rgba8,
            )
            .map_err(|e| format!("PNG 编码失败: {}", e))?;
    }

    Ok(png_data)
}

#[cfg(windows)]
fn resize_argb_bits(bits: &[u8], width: u32, height: u32, target: u32) -> Result<Vec<u8>, String> {
    // 简单的最近邻缩放
    let mut result = vec![0u8; (target * target * 4) as usize];

    for y in 0..target {
        for x in 0..target {
            let src_x = (x * width / target) as usize;
            let src_y = (y * height / target) as usize;
            let src_idx = (src_y * width as usize + src_x) * 4;
            let dst_idx = (y * target + x) as usize * 4;

            if src_idx + 3 < bits.len() && dst_idx + 3 < result.len() {
                result[dst_idx..dst_idx + 4].copy_from_slice(&bits[src_idx..src_idx + 4]);
            }
        }
    }

    Ok(result)
}

#[cfg(windows)]
fn convert_bgra_to_rgba(bits: &[u8]) -> Vec<u8> {
    let mut result = bits.to_vec();
    for chunk in result.chunks_mut(4) {
        if chunk.len() == 4 {
            // 交换 B 和 R
            let temp = chunk[0];
            chunk[0] = chunk[2];
            chunk[2] = temp;
        }
    }
    result
}
