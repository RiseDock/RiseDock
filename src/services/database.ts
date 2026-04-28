import { invoke } from '@tauri-apps/api/core';
import type { Scene, LaunchItem } from '../types';

// ==================== 数据库初始化 ====================

/**
 * 初始化数据库（建表 + 迁移）
 * 现在由 Rust 端自动在 setup 中调用，前端可选择性调用
 */
export async function initDb(): Promise<void> {
  await invoke('init_database');
}

// ==================== 场景操作 ====================

/**
 * 加载所有场景（含启动项）
 * Rust 端用 rusqlite 查询，返回的 Scene 结构直接匹配前端类型
 */
export async function loadScenesFromDb(): Promise<Scene[]> {
  const scenes = await invoke<Scene[]>('load_scenes');

  // Rust 端 LaunchItem 有 serde rename：
  //   item_type → type, order → order
  // Scene 没有 rename，所以 created_at/updated_at 仍是 snake_case
  // 前端需要转换的只有 Scene 级别的字段
  return scenes.map((scene: any) => ({
    id: scene.id,
    name: scene.name,
    order: scene.order,
    createdAt: scene.created_at,
    updatedAt: scene.updated_at,
    hotkey: scene.hotkey || undefined,
    items: (scene.items || []).map((item: any) => ({
      id: item.id,
      sceneId: item.scene_id,
      type: item.type as LaunchItem['type'],    // serde rename: item_type → type
      name: item.name,
      path: item.path,
      delay: item.delay ?? 0,
      order: item.order ?? 0,
      enabled: item.enabled !== undefined ? item.enabled : true,
      pinned: item.pinned ?? false,
    })),
  }));
}

/**
 * 保存所有场景（全量替换，Rust 端带事务保护）
 * 接收前端 Scene[] 格式，转换为 Rust 端的 snake_case 格式
 */
export async function saveScenesToDb(scenes: Scene[]): Promise<void> {
  // Rust 端 serde rename 规则：
  //   LaunchItem: item_type ← type, order ← order
  //   Scene: created_at ← created_at, updated_at ← updated_at
  // 前端发 camelCase 的 type/order，Rust serde rename 自动映射
  const rustScenes = scenes.map((scene) => ({
    id: scene.id,
    name: scene.name,
    order: scene.order,
    created_at: scene.createdAt,
    updated_at: scene.updatedAt,
    hotkey: scene.hotkey || null,
    items: (scene.items || []).map((item) => ({
      id: item.id,
      scene_id: item.sceneId,
      type: item.type,               // serde rename: type → item_type
      name: item.name,
      path: item.path,
      delay: item.delay ?? 0,
      order: item.order ?? 0,        // serde rename: order → order（不变）
      enabled: item.enabled,
      pinned: item.pinned ?? false,
    })),
  }));

  await invoke('save_scenes', { scenes: rustScenes });
}

// ==================== 授权操作 ====================

// 注意：授权操作已迁移到 license.rs（使用 license.dat 文件），
// 这里的 saveLicenseToDb / loadLicenseFromDb 已废弃，保留空实现以防报错

export async function saveLicenseToDb(_license: any): Promise<void> {
  // 已废弃：授权现在走 license.dat 文件
  console.warn('saveLicenseToDb 已废弃，授权数据走 license.dat');
}

export async function loadLicenseFromDb(): Promise<any | null> {
  // 已废弃：授权现在走 license.dat 文件
  console.warn('loadLicenseFromDb 已废弃，授权数据走 license.dat');
  return null;
}

// ==================== 设置操作 ====================

export async function saveSetting(key: string, value: string): Promise<void> {
  await invoke('save_setting', { key, value });
}

export async function loadSetting(key: string): Promise<string | null> {
  return await invoke<string | null>('load_setting', { key });
}

export async function deleteSetting(key: string): Promise<void> {
  await invoke('delete_setting', { key });
}
