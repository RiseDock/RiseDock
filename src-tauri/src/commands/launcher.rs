use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::command;
use sysinfo::System;

#[derive(Debug, Serialize, Deserialize)]
pub struct LaunchResult {
    #[serde(rename = "itemId")]
    pub item_id: String,
    pub name: String,
    pub success: bool,
    pub message: String,
    #[serde(rename = "pid", default)]
    pub pid: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessStatus {
    pub path: String,
    #[serde(rename = "isRunning")]
    pub is_running: bool,
    pub pid: Option<u32>,
}

// 检查进程是否在运行
#[tauri::command]
pub async fn check_process_running(pid: u32) -> Result<ProcessStatus, String> {
    let mut sys = System::new_all();
    sys.refresh_all();
    
    // 检查指定 PID 是否存在
    if sys.process(sysinfo::Pid::from_u32(pid)).is_some() {
        return Ok(ProcessStatus {
            path: String::new(),
            is_running: true,
            pid: Some(pid),
        });
    }
    
    Ok(ProcessStatus {
        path: String::new(),
        is_running: false,
        pid: None,
    })
}

#[tauri::command]
pub async fn launch_item(
    item_path: String,
    item_type: String,
    item_name: String,
) -> Result<LaunchResult, String> {
    if item_path.trim().is_empty() {
        return Err("路径不能为空".to_string());
    }

    let path = item_path.trim();
    
    match item_type.as_str() {
        "folder" => {
            // 文件夹类型 - 使用 explorer 打开
            match Command::new("explorer")
                .args([path])
                .spawn()
            {
                Ok(_) => Ok(LaunchResult {
                    item_id: String::new(),
                    name: item_name,
                    success: true,
                    message: "已打开".to_string(),
                    pid: None,
                }),
                Err(e) => Err(format!("打开文件夹失败: {}", e)),
            }
        }
        "url" => {
            // 网址类型 - 使用 cmd start 打开
            let url = if !path.starts_with("http://") && !path.starts_with("https://") {
                format!("https://{}", path)
            } else {
                path.to_string()
            };
            
            // 使用 cmd /C start "" "url" 格式最可靠
            match Command::new("cmd")
                .args(["/C", "start", "", &url])
                .spawn()
            {
                Ok(_) => Ok(LaunchResult {
                    item_id: String::new(),
                    name: item_name,
                    success: true,
                    message: "已打开".to_string(),
                    pid: None, // URL 类型不跟踪进程
                }),
                Err(e) => Err(format!("打开失败: {}", e)),
            }
        }
        _ => {
            // 文件类型 - 直接用程序路径启动，获取真实 PID
            match Command::new(path)
                .spawn()
            {
                Ok(child) => {
                    let pid = child.id();
                    Ok(LaunchResult {
                        item_id: String::new(),
                        name: item_name,
                        success: true,
                        message: "已启动".to_string(),
                        pid: Some(pid),
                    })
                },
                Err(_) => {
                    // 如果直接启动失败，尝试用 cmd start
                    match Command::new("cmd")
                        .args(["/C", "start", "", path])
                        .spawn()
                    {
                        Ok(_) => Ok(LaunchResult {
                            item_id: String::new(),
                            name: item_name,
                            success: true,
                            message: "已启动".to_string(),
                            pid: None, // cmd start 无法获取真实 PID
                        }),
                        Err(e) => Err(format!("启动失败: {}", e)),
                    }
                }
            }
        }
    }
}

#[command]
pub async fn launch_items(items: Vec<serde_json::Value>) -> Result<Vec<LaunchResult>, String> {
    let mut results = Vec::new();

    for item in items {
        let item_type = item["type"].as_str().unwrap_or("file");
        let item_path = item["path"].as_str().unwrap_or("");
        let item_name = item["name"].as_str().unwrap_or("Unknown");
        let delay = item["delay"].as_i64().unwrap_or(0);

        if delay > 0 {
            tokio::time::sleep(tokio::time::Duration::from_secs(delay as u64)).await;
        }

        let result = launch_item(
            item_path.to_string(),
            item_type.to_string(),
            item_name.to_string(),
        )
        .await?;

        results.push(result);
    }

    Ok(results)
}
