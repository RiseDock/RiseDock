use crate::crypto::machine_code::generate_machine_code;
use crate::crypto::license_key::verify_license_key;
use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct LicenseStatus {
    pub is_activated: bool,
    pub license_type: Option<String>,
    pub expires_at: Option<i64>,
    pub machine_code: String,
    pub is_professional: bool,
}

#[derive(Debug, Serialize)]
pub struct CommandError {
    pub message: String,
}

impl From<String> for CommandError {
    fn from(s: String) -> Self {
        CommandError { message: s }
    }
}

impl From<&str> for CommandError {
    fn from(s: &str) -> Self {
        CommandError { message: s.to_string() }
    }
}

/// 生成机器码
#[command]
pub fn generate_machine_code_cmd() -> Result<String, String> {
    generate_machine_code().map_err(|e| e.to_string())
}

/// 获取授权状态
#[command]
pub fn get_license_status(app: tauri::AppHandle) -> Result<LicenseStatus, String> {
    use tauri::Manager;
    
    let machine_code = generate_machine_code().map_err(|e| e.to_string())?;

    // 使用 app_data_dir 作为数据目录（与 storage.rs 一致）
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败: {}", e))?;
    
    let license_path = app_data_dir.join("license.dat");

    if !license_path.exists() {
        return Ok(LicenseStatus {
            is_activated: false,
            license_type: None,
            expires_at: None,
            machine_code,
            is_professional: false,
        });
    }

    let license_content = std::fs::read_to_string(&license_path)
        .map_err(|e| e.to_string())?;

    let payload = verify_license_key(&license_content, &machine_code)
        .map_err(|e| e.to_string())?;

    let is_professional = payload.license_type != "free" && payload.license_type != "trial";

    Ok(LicenseStatus {
        is_activated: true,
        license_type: Some(payload.license_type),
        expires_at: Some(payload.expires_at),
        machine_code,
        is_professional,
    })
}

/// 激活授权
#[command]
pub fn activate_license(app: tauri::AppHandle, license_key: String) -> Result<LicenseStatus, String> {
    use tauri::Manager;
    
    let machine_code = generate_machine_code().map_err(|e| e.to_string())?;

    // 验证授权码
    let _payload = verify_license_key(&license_key, &machine_code)
        .map_err(|e| e.to_string())?;

    // 使用 app_data_dir 作为数据目录
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败: {}", e))?;
    
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| e.to_string())?;

    let license_path = app_data_dir.join("license.dat");
    std::fs::write(&license_path, &license_key)
        .map_err(|e| e.to_string())?;

    // 返回新的状态
    get_license_status(app)
}

/// 清除授权
#[command]
pub fn clear_license(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;
    
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败: {}", e))?;
    
    let license_path = app_data_dir.join("license.dat");

    if license_path.exists() {
        std::fs::remove_file(&license_path)
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
