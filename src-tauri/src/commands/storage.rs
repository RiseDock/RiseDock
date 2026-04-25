use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Scene {
    pub id: String,
    pub name: String,
    pub items: Vec<LaunchItem>,
    pub order: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaunchItem {
    pub id: String,
    pub scene_id: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub name: String,
    pub path: String,
    #[serde(rename = "delay", default)]
    pub delay: i32,
    #[serde(rename = "order", default)]
    pub order: i32,
    #[serde(rename = "enabled", default = "default_enabled")]
    pub enabled: bool,
}

fn default_enabled() -> bool {
    true
}

fn get_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = app.path().app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败: {}", e))?;
    
    if !data_dir.exists() {
        std::fs::create_dir_all(&data_dir)
            .map_err(|e| format!("创建数据目录失败: {}", e))?;
    }
    
    Ok(data_dir)
}

// 获取数据库路径
fn get_db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = get_data_dir(app)?;
    Ok(data_dir.join("risedock.db"))
}

#[tauri::command]
pub fn get_data_path(app: tauri::AppHandle) -> Result<String, String> {
    let data_dir = get_data_dir(&app)?;
    Ok(data_dir.to_string_lossy().to_string())
}

// 获取数据库路径（新增命令）
#[tauri::command]
pub fn get_db_path_cmd(app: tauri::AppHandle) -> Result<String, String> {
    let db_path = get_db_path(&app)?;
    Ok(db_path.to_string_lossy().to_string())
}

// 保存场景数据到文件（保持兼容，但用 JSON）
#[tauri::command]
pub fn save_scenes(app: tauri::AppHandle, scenes: Vec<Scene>) -> Result<(), String> {
    let data_dir = get_data_dir(&app)?;
    let file_path = data_dir.join("scenes.json");
    
    let json = serde_json::to_string_pretty(&scenes)
        .map_err(|e| format!("序列化失败: {}", e))?;
    
    std::fs::write(&file_path, json)
        .map_err(|e| format!("保存失败: {}", e))?;
    
    Ok(())
}

// 加载场景数据
#[tauri::command]
pub fn load_scenes(app: tauri::AppHandle) -> Result<Vec<Scene>, String> {
    let data_dir = get_data_dir(&app)?;
    let file_path = data_dir.join("scenes.json");
    
    if !file_path.exists() {
        return Ok(Vec::new());
    }
    
    let content = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("读取失败: {}", e))?;
    
    let scenes: Vec<Scene> = serde_json::from_str(&content)
        .map_err(|e| format!("解析失败: {}", e))?;
    
    Ok(scenes)
}

// 初始化数据库表结构
#[tauri::command]
pub fn init_database(app: tauri::AppHandle) -> Result<String, String> {
    let db_path = get_db_path(&app)?;
    
    // 使用 rusqlite 连接数据库
    let conn = rusqlite::Connection::open(&db_path)
        .map_err(|e| format!("打开数据库失败: {}", e))?;
    
    // 创建场景表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS scenes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            order_index INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    ).map_err(|e| format!("创建场景表失败: {}", e))?;
    
    // 创建启动项表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS launch_items (
            id TEXT PRIMARY KEY,
            scene_id TEXT NOT NULL,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            item_type TEXT NOT NULL,
            delay INTEGER DEFAULT 0,
            order_index INTEGER DEFAULT 0,
            enabled INTEGER DEFAULT 1,
            FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("创建启动项表失败: {}", e))?;
    
    // 创建授权表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS license (
            id INTEGER PRIMARY KEY,
            is_activated INTEGER DEFAULT 0,
            license_type TEXT,
            expires_at INTEGER,
            machine_code TEXT,
            is_professional INTEGER DEFAULT 0,
            license_key TEXT
        )",
        [],
    ).map_err(|e| format!("创建授权表失败: {}", e))?;
    
    // 创建应用设置表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    ).map_err(|e| format!("创建设置表失败: {}", e))?;
    
    Ok(db_path.to_string_lossy().to_string())
}

// 导出场景数据到文件
#[tauri::command]
pub fn export_scenes(app: tauri::AppHandle, file_path: String) -> Result<(), String> {
    let data_dir = get_data_dir(&app)?;
    let scenes_file = data_dir.join("scenes.json");
    
    if !scenes_file.exists() {
        return Err("没有可导出的场景数据".to_string());
    }
    
    let content = std::fs::read_to_string(&scenes_file)
        .map_err(|e| format!("读取场景文件失败: {}", e))?;
    
    // 写入用户指定的位置
    std::fs::write(&file_path, content)
        .map_err(|e| format!("写入导出文件失败: {}", e))?;
    
    Ok(())
}

// 导入场景数据
#[derive(Debug, Serialize, Deserialize)]
pub struct ImportResult {
    pub imported: usize,
    pub skipped: usize,
    pub errors: Vec<String>,
}

#[tauri::command]
pub fn get_subdirectories(path: String, recursive: bool) -> Result<Vec<String>, String> {
    let mut dirs = Vec::new();
    let path = std::path::Path::new(&path);
    
    if !path.exists() {
        return Err("路径不存在".to_string());
    }
    
    if !path.is_dir() {
        return Err("路径不是文件夹".to_string());
    }
    
    fn read_dir_recursive(dir: &std::path::Path, dirs: &mut Vec<String>, recursive: bool) -> Result<(), String> {
        for entry in std::fs::read_dir(dir).map_err(|e| format!("读取目录失败: {}", e))? {
            let entry = entry.map_err(|e| format!("读取目录项失败: {}", e))?;
            let path = entry.path();
            if path.is_dir() {
                dirs.push(path.to_string_lossy().to_string());
                if recursive {
                    read_dir_recursive(&path, dirs, recursive)?;
                }
            }
        }
        Ok(())
    }
    
    read_dir_recursive(path, &mut dirs, recursive)?;
    Ok(dirs)
}

#[tauri::command]
pub fn import_scenes(app: tauri::AppHandle, file_path: String) -> Result<ImportResult, String> {
    // 读取导入文件
    let content = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("读取导入文件失败: {}", e))?;
    
    let imported_scenes: Vec<Scene> = serde_json::from_str(&content)
        .map_err(|e| format!("解析导入文件失败，请确认是有效的JSON格式: {}", e))?;
    
    if imported_scenes.is_empty() {
        return Ok(ImportResult {
            imported: 0,
            skipped: 0,
            errors: vec!["导入文件中没有场景数据".to_string()],
        });
    }
    
    let data_dir = get_data_dir(&app)?;
    let scenes_file = data_dir.join("scenes.json");
    
    // 读取现有数据
    let existing_scenes: Vec<Scene> = if scenes_file.exists() {
        let existing_content = std::fs::read_to_string(&scenes_file)
            .map_err(|e| format!("读取现有场景文件失败: {}", e))?;
        serde_json::from_str(&existing_content).unwrap_or_default()
    } else {
        Vec::new()
    };
    
    let mut result = ImportResult {
        imported: 0,
        skipped: 0,
        errors: Vec::new(),
    };
    
    // 导入每个场景
    let mut all_scenes = existing_scenes.clone();
    
    for scene in imported_scenes {
        // 检查是否已存在同名场景
        let exists = all_scenes.iter().any(|s| s.name == scene.name);
        if exists {
            result.skipped += 1;
            continue;
        }
        
        // 为导入的场景生成新ID
        let new_scene = Scene {
            id: uuid::Uuid::new_v4().to_string(),
            name: scene.name,
            items: scene.items.into_iter().map(|mut item| {
                item.id = uuid::Uuid::new_v4().to_string();
                item
            }).collect(),
            order: all_scenes.len() as i32,
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
        };
        
        all_scenes.push(new_scene);
        result.imported += 1;
    }
    
    // 保存结果（合并后的完整数据）
    let json = serde_json::to_string_pretty(&all_scenes)
        .map_err(|e| format!("序列化失败: {}", e))?;
    
    std::fs::write(&scenes_file, json)
        .map_err(|e| format!("保存失败: {}", e))?;
    
    Ok(result)
}