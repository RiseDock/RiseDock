use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

// ==================== 数据模型 ====================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Scene {
    pub id: String,
    pub name: String,
    pub items: Vec<LaunchItem>,
    pub order: i32,
    pub created_at: i64,
    pub updated_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hotkey: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaunchItem {
    pub id: String,
    pub scene_id: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub name: String,
    pub path: String,
    #[serde(default)]
    pub delay: i32,
    #[serde(rename = "order", default)]
    pub order: i32,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub pinned: bool,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportResult {
    pub imported: usize,
    pub skipped: usize,
    pub errors: Vec<String>,
}

// ==================== 辅助函数 ====================

fn get_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败: {}", e))?;

    if !data_dir.exists() {
        std::fs::create_dir_all(&data_dir).map_err(|e| format!("创建数据目录失败: {}", e))?;
    }

    Ok(data_dir)
}

fn get_db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = get_data_dir(app)?;
    Ok(data_dir.join("risedock.db"))
}

/// 打开数据库连接并执行 PRAGMA 设置
fn open_db(db_path: &PathBuf) -> Result<rusqlite::Connection, String> {
    let conn = rusqlite::Connection::open(db_path)
        .map_err(|e| format!("打开数据库失败: {}", e))?;

    // 开启外键约束
    conn.execute_batch("PRAGMA foreign_keys = ON")
        .map_err(|e| format!("设置外键约束失败: {}", e))?;

    // WAL 模式
    conn.execute_batch("PRAGMA journal_mode = WAL")
        .map_err(|e| format!("设置 WAL 模式失败: {}", e))?;

    Ok(conn)
}

/// 确保所有表存在 + 迁移列
fn ensure_tables(conn: &rusqlite::Connection) -> Result<(), String> {
    // 创建场景表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS scenes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            order_index INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            hotkey TEXT
        )",
        [],
    )
    .map_err(|e| format!("创建场景表失败: {}", e))?;

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
            pinned INTEGER DEFAULT 0,
            FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
        )",
        [],
    )
    .map_err(|e| format!("创建启动项表失败: {}", e))?;

    // 创建授权表（保留兼容）
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
    )
    .map_err(|e| format!("创建授权表失败: {}", e))?;

    // 创建设置表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| format!("创建设置表失败: {}", e))?;

    // ===== 迁移：检查并补充旧表缺失的列 =====

    // 迁移1：launch_items.type → item_type
    migrate_rename_column(conn, "launch_items", "type", "item_type")?;

    // 迁移2：launch_items 添加 pinned 列
    migrate_add_column(conn, "launch_items", "pinned", "INTEGER DEFAULT 0")?;

    // 迁移3：scenes 添加 hotkey 列
    migrate_add_column(conn, "scenes", "hotkey", "TEXT")?;

    Ok(())
}

/// 迁移：重命名列（如果旧列存在且新列不存在）
fn migrate_rename_column(
    conn: &rusqlite::Connection,
    table: &str,
    old_col: &str,
    new_col: &str,
) -> Result<(), String> {
    let cols = get_column_names(conn, table)?;
    if cols.contains(&old_col.to_string()) && !cols.contains(&new_col.to_string()) {
        let sql = format!("ALTER TABLE {} RENAME COLUMN {} TO {}", table, old_col, new_col);
        conn.execute_batch(&sql)
            .map_err(|e| format!("迁移 {} 列重命名失败: {}", table, e))?;
        println!("已迁移 {}.{} → {}.{}", table, old_col, table, new_col);
    }
    Ok(())
}

/// 迁移：添加列（如果不存在）
fn migrate_add_column(
    conn: &rusqlite::Connection,
    table: &str,
    col: &str,
    col_def: &str,
) -> Result<(), String> {
    let cols = get_column_names(conn, table)?;
    if !cols.contains(&col.to_string()) {
        let sql = format!("ALTER TABLE {} ADD COLUMN {} {}", table, col, col_def);
        conn.execute_batch(&sql)
            .map_err(|e| format!("迁移 {} 添加 {} 列失败: {}", table, col, e))?;
        println!("已迁移 {}.{} 添加列", table, col);
    }
    Ok(())
}

/// 获取表的列名列表
fn get_column_names(
    conn: &rusqlite::Connection,
    table: &str,
) -> Result<Vec<String>, String> {
    let sql = format!("PRAGMA table_info({})", table);
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("查询表结构失败: {}", e))?;
    let col_rows = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|e| format!("读取列名失败: {}", e))?;

    let mut cols = Vec::new();
    for col in col_rows {
        cols.push(col.map_err(|e| format!("解析列名失败: {}", e))?);
    }
    Ok(cols)
}

/// 从数据库行构造 Scene 对象（不含 items）
fn scene_from_row(row: &rusqlite::Row) -> Result<Scene, rusqlite::Error> {
    Ok(Scene {
        id: row.get("id")?,
        name: row.get("name")?,
        items: Vec::new(), // 后续填充
        order: row.get("order_index")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        hotkey: row.get("hotkey").unwrap_or(None),
    })
}

/// 从数据库行构造 LaunchItem 对象
fn item_from_row(row: &rusqlite::Row) -> Result<LaunchItem, rusqlite::Error> {
    Ok(LaunchItem {
        id: row.get("id")?,
        scene_id: row.get("scene_id")?,
        item_type: row.get("item_type")?,
        name: row.get("name")?,
        path: row.get("path")?,
        delay: row.get("delay").unwrap_or(0),
        order: row.get("order_index").unwrap_or(0),
        enabled: row.get::<_, i32>("enabled").map(|v| v == 1).unwrap_or(true),
        pinned: row.get::<_, i32>("pinned").map(|v| v == 1).unwrap_or(false),
    })
}

// ==================== Tauri Commands ====================

/// 获取应用数据目录路径
#[tauri::command]
pub fn get_data_path(app: tauri::AppHandle) -> Result<String, String> {
    let data_dir = get_data_dir(&app)?;
    Ok(data_dir.to_string_lossy().to_string())
}

/// 获取数据库文件路径
#[tauri::command]
pub fn get_db_path_cmd(app: tauri::AppHandle) -> Result<String, String> {
    let db_path = get_db_path(&app)?;
    Ok(db_path.to_string_lossy().to_string())
}

/// 初始化数据库（建表 + 迁移）
#[tauri::command]
pub fn init_database(app: tauri::AppHandle) -> Result<String, String> {
    let db_path = get_db_path(&app)?;
    let conn = open_db(&db_path)?;
    ensure_tables(&conn)?;
    Ok(db_path.to_string_lossy().to_string())
}

/// 加载所有场景（含启动项）
#[tauri::command]
pub fn load_scenes(app: tauri::AppHandle) -> Result<Vec<Scene>, String> {
    let db_path = get_db_path(&app)?;

    // 如果数据库文件不存在，返回空列表
    if !db_path.exists() {
        return Ok(Vec::new());
    }

    let conn = open_db(&db_path)?;

    // 查询所有场景
    let mut scene_stmt = conn
        .prepare(
            "SELECT id, name, order_index, created_at, updated_at, hotkey FROM scenes ORDER BY order_index",
        )
        .map_err(|e| format!("查询场景失败: {}", e))?;

    let scene_rows = scene_stmt
        .query_map([], scene_from_row)
        .map_err(|e| format!("读取场景失败: {}", e))?;

    let mut scenes: Vec<Scene> = Vec::new();
    for scene_result in scene_rows {
        let scene = scene_result.map_err(|e| format!("解析场景失败: {}", e))?;
        scenes.push(scene);
    }

    // 查询每个场景的启动项
    let mut item_stmt = conn
        .prepare(
            "SELECT id, scene_id, name, path, item_type, delay, order_index, enabled, pinned \
             FROM launch_items WHERE scene_id = ? ORDER BY order_index",
        )
        .map_err(|e| format!("准备启动项查询失败: {}", e))?;

    for scene in &mut scenes {
        let item_rows = item_stmt
            .query_map(rusqlite::params![scene.id], item_from_row)
            .map_err(|e| format!("查询启动项失败: {}", e))?;

        let mut items = Vec::new();
        for item_result in item_rows {
            let item = item_result.map_err(|e| format!("解析启动项失败: {}", e))?;
            items.push(item);
        }
        scene.items = items;
    }

    Ok(scenes)
}

/// 保存所有场景（全量替换，带事务）
#[tauri::command]
pub fn save_scenes(app: tauri::AppHandle, scenes: Vec<Scene>) -> Result<(), String> {
    let db_path = get_db_path(&app)?;
    let conn = open_db(&db_path)?;

    // 整个操作在一个事务中，要么全成功要么全回滚
    let tx = conn
        .unchecked_transaction()
        .map_err(|e| format!("开启事务失败: {}", e))?;

    // 1. 清空旧数据
    tx.execute("DELETE FROM launch_items", [])
        .map_err(|e| format!("清空启动项失败: {}", e))?;
    tx.execute("DELETE FROM scenes", [])
        .map_err(|e| format!("清空场景失败: {}", e))?;

    // 2. 插入新数据
    for scene in &scenes {
        tx.execute(
            "INSERT INTO scenes (id, name, order_index, created_at, updated_at, hotkey) VALUES (?, ?, ?, ?, ?, ?)",
            rusqlite::params![
                scene.id,
                scene.name,
                scene.order,
                scene.created_at,
                scene.updated_at,
                scene.hotkey,
            ],
        )
        .map_err(|e| format!("插入场景失败 ({}): {}", scene.name, e))?;

        for item in &scene.items {
            tx.execute(
                "INSERT INTO launch_items (id, scene_id, name, path, item_type, delay, order_index, enabled, pinned) \
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                rusqlite::params![
                    item.id,
                    item.scene_id,
                    item.name,
                    item.path,
                    item.item_type,
                    item.delay,
                    item.order,
                    item.enabled as i32,
                    item.pinned as i32,
                ],
            )
            .map_err(|e| format!("插入启动项失败 ({}): {}", item.name, e))?;
        }
    }

    // 3. 提交事务
    tx.commit().map_err(|e| format!("提交事务失败: {}", e))?;

    Ok(())
}

/// 导出场景到 JSON 文件
#[tauri::command]
pub fn export_scenes(app: tauri::AppHandle, file_path: String) -> Result<(), String> {
    // 从数据库读取所有场景
    let scenes = load_scenes(app)?;

    if scenes.is_empty() {
        return Err("没有可导出的场景数据".to_string());
    }

    // 序列化为 JSON
    let json = serde_json::to_string_pretty(&scenes)
        .map_err(|e| format!("序列化失败: {}", e))?;

    // 写入用户指定的位置
    std::fs::write(&file_path, json)
        .map_err(|e| format!("写入导出文件失败: {}", e))?;

    Ok(())
}

/// 导入场景（追加模式：跳过同名场景，为新场景生成新 ID）
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

    // 加载现有场景
    let existing_scenes = load_scenes(app.clone())?;
    let existing_names: Vec<String> = existing_scenes.iter().map(|s| s.name.clone()).collect();

    let mut result = ImportResult {
        imported: 0,
        skipped: 0,
        errors: Vec::new(),
    };

    let mut all_scenes = existing_scenes.clone();

    for scene in imported_scenes {
        // 检查是否已存在同名场景
        if existing_names.contains(&scene.name) {
            result.skipped += 1;
            continue;
        }

        // 为导入的场景生成新 ID，防止冲突
        let new_scene_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis();

        let new_scene = Scene {
            id: new_scene_id.clone(),
            name: scene.name,
            items: scene
                .items
                .into_iter()
                .map(|mut item| {
                    item.id = uuid::Uuid::new_v4().to_string();
                    item.scene_id = new_scene_id.clone();
                    item
                })
                .collect(),
            order: all_scenes.len() as i32,
            created_at: now,
            updated_at: now,
            hotkey: scene.hotkey,
        };

        all_scenes.push(new_scene);
        result.imported += 1;
    }

    // 保存合并后的完整数据
    save_scenes(app, all_scenes)?;

    Ok(result)
}

/// 获取指定路径下的子目录列表
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

    fn read_dir_recursive(
        dir: &std::path::Path,
        dirs: &mut Vec<String>,
        recursive: bool,
    ) -> Result<(), String> {
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

// ==================== 设置操作 ====================

/// 保存设置项
#[tauri::command]
pub fn save_setting(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    let db_path = get_db_path(&app)?;
    let conn = open_db(&db_path)?;

    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        rusqlite::params![key, value],
    )
    .map_err(|e| format!("保存设置失败: {}", e))?;

    Ok(())
}

/// 读取设置项
#[tauri::command]
pub fn load_setting(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    let db_path = get_db_path(&app)?;

    if !db_path.exists() {
        return Ok(None);
    }

    let conn = open_db(&db_path)?;

    let mut stmt = conn
        .prepare("SELECT value FROM settings WHERE key = ?")
        .map_err(|e| format!("查询设置失败: {}", e))?;

    let result = stmt
        .query_row(rusqlite::params![key], |row| row.get::<_, String>(0))
        .ok();

    Ok(result)
}

/// 删除设置项
#[tauri::command]
pub fn delete_setting(app: tauri::AppHandle, key: String) -> Result<(), String> {
    let db_path = get_db_path(&app)?;
    let conn = open_db(&db_path)?;

    conn.execute("DELETE FROM settings WHERE key = ?", rusqlite::params![key])
        .map_err(|e| format!("删除设置失败: {}", e))?;

    Ok(())
}
