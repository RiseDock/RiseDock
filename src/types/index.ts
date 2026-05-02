// 启动项类型
export type LaunchItemType = 'app' | 'file' | 'folder' | 'url' | 'image';

// 启动项
export interface LaunchItem {
  id: string;
  sceneId: string;
  type: LaunchItemType;
  path: string;
  name: string;
  delay: number; // 延迟秒数
  order: number;
  enabled: boolean;
  pinned: boolean; // 是否置顶
  icon?: string; // Base64 编码的图标 PNG
}

// 场景
export interface Scene {
  id: string;
  name: string;
  items: LaunchItem[];
  order: number;
  hotkey?: string; // 全局快捷键，如 "Ctrl+Alt+1"
  createdAt: number;
  updatedAt: number;
}

// 启动结果
export interface LaunchResult {
  itemId: string;
  name: string;
  success: boolean;
  message: string;
}

// 授权状态（与后端匹配）
export interface LicenseStatus {
  is_activated: boolean;
  license_type: string | null;
  expires_at: number | null;
  machine_code: string;
  is_professional: boolean;
}
