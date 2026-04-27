import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

// 初始化数据库
export async function initDb(): Promise<Database> {
  if (db) return db;
  
  // 使用 SQLite 数据库
  db = await Database.load('sqlite:risedock.db');
  
  // 关键：开启外键约束（SQLite 默认关闭）
  await db.execute('PRAGMA foreign_keys = ON');
  // 确保使用 WAL 模式以避免读写锁冲突
  await db.execute('PRAGMA journal_mode = WAL');
  // 设置 WAL 自动 checkpoint 阈值
  await db.execute('PRAGMA wal_autocheckpoint = 500');
  
  // 创建表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS scenes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      order_index INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS launch_items (
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
    )
  `);

  // 迁移：如果旧表有 type 列，重命名为 item_type
  try {
    const cols = await db.select<Array<{ name: string }>>("PRAGMA table_info(launch_items)");
    const colNames = cols.map(c => c.name);
    if (colNames.includes('type') && !colNames.includes('item_type')) {
      await db.execute('ALTER TABLE launch_items RENAME COLUMN type TO item_type');
      console.log('已迁移 launch_items.type → item_type');
    }
  } catch (e) {
    console.warn('列迁移检查跳过:', e);
  }

  // 迁移：如果旧表没有 pinned 列，添加它
  try {
    const cols = await db.select<Array<{ name: string }>>("PRAGMA table_info(launch_items)");
    const colNames = cols.map(c => c.name);
    if (!colNames.includes('pinned')) {
      await db.execute('ALTER TABLE launch_items ADD COLUMN pinned INTEGER DEFAULT 0');
      console.log('已迁移 launch_items 添加 pinned 列');
    }
  } catch (e) {
    console.warn('pinned 列迁移检查跳过:', e);
  }
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS license (
      id INTEGER PRIMARY KEY,
      is_activated INTEGER DEFAULT 0,
      license_type TEXT,
      expires_at INTEGER,
      machine_code TEXT,
      is_professional INTEGER DEFAULT 0,
      license_key TEXT
    )
  `);
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  
  return db;
}

// 获取数据库实例
export async function getDb(): Promise<Database> {
  if (!db) {
    return initDb();
  }
  return db;
}

// ==================== 场景操作 ====================

// 加载所有场景
export async function loadScenesFromDb(): Promise<any[]> {
  const database = await getDb();
  
  // 查询所有场景
  const scenes = await database.select<any[]>(
    'SELECT id, name, order_index, created_at, updated_at FROM scenes ORDER BY order_index'
  );
  
  // 查询每个场景的启动项
  for (const scene of scenes) {
    const items = await database.select<any[]>(
      `SELECT id, scene_id, name, path, item_type, delay, order_index, enabled, pinned
       FROM launch_items WHERE scene_id = ? ORDER BY order_index`,
      [scene.id]
    );
    
    // 转换字段名（数据库 item_type → 前端 type）
    scene.items = items.map(item => ({
      id: item.id,
      sceneId: item.scene_id,
      name: item.name,
      path: item.path,
      type: item.item_type,
      delay: item.delay,
      order: item.order_index,
      enabled: item.enabled === 1,
      pinned: item.pinned === 1,
    }));
    
    scene.order = scene.order_index;
    scene.createdAt = scene.created_at;
    scene.updatedAt = scene.updated_at;
    delete scene.order_index;
    delete scene.created_at;
    delete scene.updated_at;
  }
  
  return scenes;
}

// 保存所有场景
// 策略：先插入/更新新数据（INSERT OR REPLACE），再删除不在列表中的旧数据
// 不用事务（@tauri-apps/plugin-sql 不支持 BEGIN/COMMIT），但保证即使中途失败旧数据不丢
export async function saveScenesToDb(scenes: any[]): Promise<void> {
  const database = await getDb();
  
  // 第一步：先插入/更新所有场景和启动项（INSERT OR REPLACE 保证幂等）
  for (const scene of scenes) {
    await database.execute(
      `INSERT OR REPLACE INTO scenes (id, name, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      [scene.id, scene.name, scene.order ?? 0, scene.createdAt ?? 0, scene.updatedAt ?? 0]
    );
    
    const items = scene.items || [];
    for (const item of items) {
      await database.execute(
        `INSERT OR REPLACE INTO launch_items (id, scene_id, name, path, item_type, delay, order_index, enabled, pinned) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, item.sceneId, item.name, item.path, item.type, item.delay ?? 0, item.order ?? 0, item.enabled ? 1 : 0, item.pinned ? 1 : 0]
      );
    }
  }
  
  // 第二步：收集当前有效的 ID
  const validSceneIds = scenes.map((s: any) => s.id);
  const validItemIds = scenes.flatMap((s: any) => (s.items || []).map((i: any) => i.id));
  
  // 第三步：删除不在新列表中的旧数据（只删多余的，不删刚插入的）
  if (validSceneIds.length > 0) {
    await database.execute(
      'DELETE FROM launch_items WHERE scene_id NOT IN (' + validSceneIds.map(() => '?').join(',') + ')',
      validSceneIds
    );
    await database.execute(
      'DELETE FROM scenes WHERE id NOT IN (' + validSceneIds.map(() => '?').join(',') + ')',
      validSceneIds
    );
  }
  if (validItemIds.length > 0) {
    await database.execute(
      'DELETE FROM launch_items WHERE id NOT IN (' + validItemIds.map(() => '?').join(',') + ')',
      validItemIds
    );
  }
  
  // 第四步：如果是空列表（清空所有），直接删
  if (scenes.length === 0) {
    await database.execute('DELETE FROM launch_items');
    await database.execute('DELETE FROM scenes');
  }
}

// ==================== 授权操作 ====================

// 保存授权状态
export async function saveLicenseToDb(license: any): Promise<void> {
  const database = await getDb();
  
  // 先删除旧数据
  await database.execute('DELETE FROM license');
  
  // 插入新数据
  await database.execute(
    `INSERT INTO license (is_activated, license_type, expires_at, machine_code, is_professional, license_key)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      license.is_activated ? 1 : 0,
      license.license_type,
      license.expires_at,
      license.machine_code,
      license.is_professional ? 1 : 0,
      license.license_key || null,
    ]
  );
}

// 加载授权状态
export async function loadLicenseFromDb(): Promise<any | null> {
  const database = await getDb();
  
  const results = await database.select<any[]>(
    'SELECT * FROM license LIMIT 1'
  );
  
  if (results.length === 0) {
    return null;
  }
  
  const row = results[0];
  return {
    is_activated: row.is_activated === 1,
    license_type: row.license_type,
    expires_at: row.expires_at,
    machine_code: row.machine_code,
    is_professional: row.is_professional === 1,
  };
}

// ==================== 设置操作 ====================

// 保存设置
export async function saveSetting(key: string, value: string): Promise<void> {
  const database = await getDb();
  
  await database.execute(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

// 加载设置
export async function loadSetting(key: string): Promise<string | null> {
  const database = await getDb();
  
  const results = await database.select<any[]>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  
  if (results.length === 0) {
    return null;
  }
  
  return results[0].value;
}

// 删除设置
export async function deleteSetting(key: string): Promise<void> {
  const database = await getDb();
  
  await database.execute(
    'DELETE FROM settings WHERE key = ?',
    [key]
  );
}
