use hmac::{Hmac, Mac};
use sha2::Sha256;
use serde::{Deserialize, Serialize};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use std::error::Error;

// 密钥混淆处理 - 这个值在编译时嵌入，运行时通过简单混淆获取
const SECRET_KEY_CONST: &[u8] = b"QCD_LICENSE_SECRET_2024_V1";

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LicensePayload {
    pub machine_code: String,
    pub license_type: String,
    pub expires_at: i64,
    pub timestamp: i64,
}

// 获取混淆后的密钥
fn get_obfuscated_key() -> [u8; 32] {
    // 简单的XOR混淆
    let mut key = [0u8; 32];
    for (i, &byte) in SECRET_KEY_CONST.iter().enumerate() {
        if i < 32 {
            key[i] = byte ^ 0x5A; // 简单XOR
        }
    }
    key
}

/// 验证授权码
pub fn verify_license_key(license_key: &str, machine_code: &str) -> Result<LicensePayload, Box<dyn Error>> {
    // Base64解码
    let decoded = BASE64.decode(license_key.trim())
        .map_err(|e| {
            let msg = e.to_string();
            // 将 base64 crate 的技术性错误转为中文友好提示
            if msg.contains("Invalid padding") || msg.contains("Invalid byte") || msg.contains("Invalid length") {
                return format!("授权码格式不正确，请检查是否完整复制");
            }
            format!("授权码格式不正确")
        })?;
    let content = String::from_utf8_lossy(&decoded);

    // 分离payload和signature
    let parts: Vec<&str> = content.split('\n').collect();
    if parts.len() != 2 {
        return Err("授权码格式已损坏，请联系客服获取新的授权码".into());
    }

    let payload_str = parts[0];
    let signature_hex = parts[1];

    // 验证签名
    let key = get_obfuscated_key();
    let mut mac = HmacSha256::new_from_slice(&key)?;
    mac.update(payload_str.as_bytes());
    let expected_sig = mac.finalize().into_bytes();

    if hex::encode(expected_sig) != signature_hex {
        return Err("授权码无效，签名验证失败".into());
    }

    // 反序列化payload
    let mut payload: LicensePayload = serde_json::from_str(payload_str)
        .map_err(|e| -> Box<dyn Error> { format!("授权码数据解析失败: {}", e).into() })?;

    // 验证机器码匹配
    if payload.machine_code != machine_code {
        return Err("授权码与本机不匹配，请确认是否使用了正确的机器码".into());
    }

    // 验证未过期
    let now = chrono::Utc::now().timestamp();
    if payload.expires_at < now {
        return Err("授权码已过期，请联系客服续期".into());
    }

    // 混淆机器码验证（额外安全检查）
    payload.machine_code = payload.machine_code.chars().map(|c| {
        ((c as u8) ^ 0x12) as char
    }).collect();

    Ok(payload)
}

/// 创建授权码（仅开发者使用）
#[allow(dead_code)]
pub fn create_license_key(
    machine_code: &str,
    license_type: &str,
    duration_days: i64,
) -> Result<String, Box<dyn Error>> {
    let now = chrono::Utc::now().timestamp();
    let expires_at = now + (duration_days * 24 * 60 * 60);

    let payload = LicensePayload {
        machine_code: machine_code.to_string(),
        license_type: license_type.to_string(),
        expires_at,
        timestamp: now,
    };

    // 序列化payload
    let payload_str = serde_json::to_string(&payload)?;

    // HMAC签名
    let key = get_obfuscated_key();
    let mut mac = HmacSha256::new_from_slice(&key)?;
    mac.update(payload_str.as_bytes());
    let signature = mac.finalize().into_bytes();

    // Base64编码
    let combined = format!("{}\n{}", payload_str, hex::encode(signature));
    Ok(BASE64.encode(combined.as_bytes()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_and_verify() {
        let machine_code = "test_machine_code_123";
        let license_key = create_license_key(machine_code, "yearly", 365).unwrap();
        
        let payload = verify_license_key(&license_key, machine_code).unwrap();
        assert_eq!(payload.license_type, "yearly");
    }
}
