use sha2::{Sha256, Digest};
use std::error::Error;

#[cfg(windows)]
use std::process::Command;

#[cfg(windows)]
pub struct MachineCodeInfo {
    cpu_id: String,
    mb_id: String,
    disk_id: String,
}

#[cfg(windows)]
impl MachineCodeInfo {
    pub fn new() -> Result<Self, Box<dyn Error>> {
        let cpu_id = get_wmic("cpu", "ProcessorId").unwrap_or_else(|_| "CPU_DEFAULT".to_string());
        let mb_id = get_wmic("baseboard", "SerialNumber").unwrap_or_else(|_| "MB_DEFAULT".to_string());
        let disk_id = get_wmic("diskdrive", "SerialNumber").unwrap_or_else(|_| "DISK_DEFAULT".to_string());
        
        Ok(Self {
            cpu_id,
            mb_id,
            disk_id,
        })
    }

    pub fn generate(&self) -> Result<String, Box<dyn Error>> {
        // 盐值，防止彩虹表攻击
        let salt = "QCD_2024_V1_SALT";
        let raw = format!("{}{}{}{}", self.cpu_id, self.mb_id, self.disk_id, salt);

        // SHA256哈希
        let mut hasher = Sha256::new();
        hasher.update(raw.as_bytes());
        let result = hasher.finalize();

        // 转为十六进制字符串
        Ok(hex::encode(result))
    }
}

#[cfg(windows)]
fn get_wmic(category: &str, field: &str) -> Result<String, Box<dyn Error>> {
    // 尝试使用 wmic
    let output = Command::new("wmic")
        .args([category, "get", field, "/value"])
        .output()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    
    // 解析输出
    for line in stdout.lines() {
        if line.starts_with(&format!("{}=", field)) {
            let value = line.split('=').nth(1).unwrap_or("").trim().to_string();
            if !value.is_empty() {
                return Ok(value);
            }
        }
    }

    // 如果找不到，尝试另一种方式
    let output = Command::new("wmic")
        .args([category, "get", field])
        .output()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.lines().collect();
    if lines.len() >= 2 {
        let value = lines[1].trim().to_string();
        if !value.is_empty() {
            return Ok(value);
        }
    }

    // 尝试 PowerShell 作为备选
    let ps_output = Command::new("powershell")
        .args(["-Command", &format!("(Get-WmiObject Win32_{} | Select-Object -First 1).{} -replace '\\s'", 
            get_wmi_class(category), field)])
        .output()?;
    
    let ps_stdout = String::from_utf8_lossy(&ps_output.stdout).trim().to_string();
    if !ps_stdout.is_empty() && ps_stdout != "0" {
        return Ok(ps_stdout);
    }

    Err(format!("无法获取 {} 的 {}", category, field).into())
}

#[cfg(windows)]
fn get_wmi_class(category: &str) -> &'static str {
    match category {
        "cpu" => "Processor",
        "baseboard" => "BaseBoard",
        "diskdrive" => "DiskDrive",
        _ => "ComputerSystem",
    }
}

// 非Windows平台的占位实现
#[cfg(not(windows))]
pub struct MachineCodeInfo;

#[cfg(not(windows))]
impl MachineCodeInfo {
    pub fn new() -> Result<Self, Box<dyn Error>> {
        Ok(Self)
    }

    pub fn generate(&self) -> Result<String, Box<dyn Error>> {
        use std::time::{SystemTime, UNIX_EPOCH};
        let duration = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap();
        Ok(format!("NON_WINDOWS_{}", duration.as_secs()))
    }
}

/// 生成机器码（顶层函数）
pub fn generate_machine_code() -> Result<String, Box<dyn Error>> {
    let info = MachineCodeInfo::new()?;
    info.generate()
}
