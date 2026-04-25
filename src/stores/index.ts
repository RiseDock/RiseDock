import { create } from 'zustand';
import { Scene, LaunchItem, LicenseStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { initDb, loadScenesFromDb, saveScenesToDb, loadLicenseFromDb, saveLicenseToDb } from '../services/database';

interface SceneStore {
  scenes: Scene[];
  selectedSceneId: string | null;
  isLoading: boolean;
  
  // 场景操作
  addScene: (name: string) => Scene;
  updateScene: (id: string, name: string) => void;
  updateSceneName: (id: string, name: string) => void;
  deleteScene: (id: string) => void;
  selectScene: (id: string | null) => void;
  updateSceneHotkey: (id: string, hotkey: string | undefined) => void;
  
  // 启动项操作
  addLaunchItem: (sceneId: string, item: Omit<LaunchItem, 'id' | 'sceneId' | 'order'>) => void;
  updateLaunchItem: (sceneId: string, itemId: string, updates: Partial<LaunchItem>) => void;
  updateSceneItemOrder: (sceneId: string, itemId: string, newOrder: number) => void;
  deleteLaunchItem: (sceneId: string, itemId: string) => void;
  deleteItem: (sceneId: string, itemId: string) => void;
  toggleItem: (sceneId: string, itemId: string) => void;
  togglePin: (sceneId: string, itemId: string) => void;
  reorderItems: (sceneId: string, items: LaunchItem[]) => void;
  
  // 持久化
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
  
  // 导入导出
  exportToFile: (filePath: string) => Promise<void>;
  importFromFile: (filePath: string) => Promise<{imported: number, skipped: number, errors: string[]}>;
}

export const useSceneStore = create<SceneStore>((set, get) => ({
  scenes: [],
  selectedSceneId: null,
  isLoading: true,

  addScene: (name: string) => {
    const now = Date.now();
    const newScene: Scene = {
      id: uuidv4(),
      name,
      items: [],
      order: get().scenes.length,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      scenes: [...state.scenes, newScene],
      selectedSceneId: newScene.id,
    }));
    get().saveToStorage();
    return newScene;
  },

  updateScene: (id: string, name: string) => {
    set((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === id ? { ...s, name, updatedAt: Date.now() } : s
      ),
    }));
    get().saveToStorage();
  },

  updateSceneName: (id: string, name: string) => {
    set((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === id ? { ...s, name, updatedAt: Date.now() } : s
      ),
    }));
    get().saveToStorage();
  },

  deleteScene: (id: string) => {
    set((state) => ({
      scenes: state.scenes.filter((s) => s.id !== id),
      selectedSceneId: state.selectedSceneId === id ? null : state.selectedSceneId,
    }));
    get().saveToStorage();
  },

  selectScene: (id: string | null) => {
    set({ selectedSceneId: id });
  },

  updateSceneHotkey: (id: string, hotkey: string | undefined) => {
    // 检测冲突
    if (hotkey) {
      const conflict = get().scenes.find(s => s.id !== id && s.hotkey === hotkey);
      if (conflict) {
        console.warn(`快捷键冲突：${hotkey} 已被「${conflict.name}」占用`);
        return; // 阻止覆盖
      }
    }
    set((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === id ? { ...s, hotkey, updatedAt: Date.now() } : s
      ),
    }));
    get().saveToStorage();
  },

  addLaunchItem: (sceneId, item) => {
    const scene = get().scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    const newItem: LaunchItem = {
      ...item,
      id: uuidv4(),
      sceneId,
      order: scene.items.length,
    };

    set((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === sceneId
          ? { ...s, items: [...s.items, newItem], updatedAt: Date.now() }
          : s
      ),
    }));
    get().saveToStorage();
  },

  updateLaunchItem: (sceneId, itemId, updates) => {
    set((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === sceneId
          ? {
              ...s,
              items: s.items.map((i) =>
                i.id === itemId ? { ...i, ...updates } : i
              ),
              updatedAt: Date.now(),
            }
          : s
      ),
    }));
    get().saveToStorage();
  },

  updateSceneItemOrder: (sceneId, itemId, newOrder) => {
    set((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === sceneId
          ? {
              ...s,
              items: s.items.map((i) =>
                i.id === itemId ? { ...i, order: newOrder } : i
              ),
              updatedAt: Date.now(),
            }
          : s
      ),
    }));
    get().saveToStorage();
  },

  deleteLaunchItem: (sceneId, itemId) => {
    set((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === sceneId
          ? {
              ...s,
              items: s.items.filter((i) => i.id !== itemId),
              updatedAt: Date.now(),
            }
          : s
      ),
    }));
    get().saveToStorage();
  },

  deleteItem: (sceneId, itemId) => {
    get().deleteLaunchItem(sceneId, itemId);
  },

  toggleItem: (sceneId, itemId) => {
    const scene = get().scenes.find((s) => s.id === sceneId);
    const item = scene?.items.find((i) => i.id === itemId);
    if (item) {
      get().updateLaunchItem(sceneId, itemId, { enabled: !item.enabled });
    }
  },

  togglePin: (sceneId, itemId) => {
    const scene = get().scenes.find((s) => s.id === sceneId);
    const item = scene?.items.find((i) => i.id === itemId);
    if (item) {
      get().updateLaunchItem(sceneId, itemId, { pinned: !item.pinned });
    }
  },

  reorderItems: (sceneId, items) => {
    set((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === sceneId
          ? { ...s, items: items.map((item, index) => ({ ...item, order: index })), updatedAt: Date.now() }
          : s
      ),
    }));
    get().saveToStorage();
  },

  // 使用 SQLite 数据库加载数据
  loadFromStorage: async () => {
    set({ isLoading: true });
    try {
      // 初始化数据库
      await initDb();
      
      // 从数据库加载场景
      const scenes = await loadScenesFromDb();
      
      // 确保所有启动项都有 enabled 和 pinned 字段
      const processedScenes = scenes.map((scene: Scene) => ({
        ...scene,
        items: (scene.items || []).map((item: LaunchItem) => ({
          ...item,
          enabled: item.enabled !== undefined ? item.enabled : true,
          pinned: item.pinned || false,
        })),
      }));
      
      // 默认显示空页面，不自动选中第一个场景
      set({ scenes: processedScenes, selectedSceneId: null, isLoading: false });
    } catch (err) {
      console.error('加载数据失败:', err);
      
      // 如果数据库加载失败，尝试从 localStorage 加载
      const saved = localStorage.getItem('qicheng-dian-scenes');
      if (saved) {
        try {
          const scenes = JSON.parse(saved);
          const processedScenes = scenes.map((scene: Scene) => ({
            ...scene,
            items: (scene.items || []).map((item: LaunchItem) => ({
              ...item,
              enabled: item.enabled !== undefined ? item.enabled : true,
            })),
          }));
          set({ scenes: processedScenes, selectedSceneId: null, isLoading: false });
        } catch {
          console.error('从 localStorage 加载也失败');
          set({ scenes: [], selectedSceneId: null, isLoading: false });
        }
      } else {
        set({ scenes: [], selectedSceneId: null, isLoading: false });
      }
    }
  },

  // 使用 SQLite 数据库保存数据
  saveToStorage: async () => {
    try {
      const { scenes } = get();
      await saveScenesToDb(scenes);
    } catch (err) {
      console.error('保存数据失败:', err);
      // 备用：保存到 localStorage
      const { scenes } = get();
      localStorage.setItem('qicheng-dian-scenes', JSON.stringify(scenes));
    }
  },

  // 导出场景到文件
  exportToFile: async (filePath: string) => {
    try {
      const { scenes } = get();
      // 直接导出 store 中的数据为 JSON
      const json = JSON.stringify(scenes, null, 2);
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      await writeTextFile(filePath, json);
    } catch (err) {
      console.error('导出失败:', err);
      throw err;
    }
  },

  // 从文件导入场景
  importFromFile: async (filePath: string) => {
    try {
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      const content = await readTextFile(filePath);
      const importedScenes: Scene[] = JSON.parse(content);
      
      if (!Array.isArray(importedScenes) || importedScenes.length === 0) {
        return { imported: 0, skipped: 0, errors: ['导入文件中没有场景数据'] };
      }
      
      const currentScenes = get().scenes;
      let imported = 0;
      let skipped = 0;
      
      const newScenes = [...currentScenes];
      for (const scene of importedScenes) {
        // 检查是否已存在同名场景
        const exists = newScenes.some(s => s.name === scene.name);
        if (exists) {
          skipped++;
          continue;
        }
        
        // 生成新ID
        const newScene: Scene = {
          ...scene,
          id: crypto.randomUUID(),
          items: scene.items.map((item: LaunchItem) => ({
            ...item,
            id: crypto.randomUUID(),
          })),
        };
        newScenes.push(newScene);
        imported++;
      }
      
      // 更新 store 并保存
      set({ scenes: newScenes });
      await get().saveToStorage();
      
      return { imported, skipped, errors: [] };
    } catch (err) {
      console.error('导入失败:', err);
      throw err;
    }
  },
}));

// License Store
interface LicenseStore {
  status: LicenseStatus;
  machineCode: string | null;
  licenseKey: string | null;
  setStatus: (status: LicenseStatus) => void;
  setMachineCode: (code: string) => void;
  setLicenseKey: (key: string) => void;
  loadFromStorage: () => Promise<void>;
  
  // 授权检查方法
  isLicensed: () => boolean;
  isExpired: () => boolean;
  getLicenseType: () => string | null;
  getExpiresAt: () => number | null;
}

export const useLicenseStore = create<LicenseStore>((set, get) => ({
  status: {
    is_activated: false,
    license_type: null,
    expires_at: null,
    machine_code: '',
    is_professional: false,
  },
  machineCode: null,
  licenseKey: null,

  setStatus: async (status) => {
    set({ status });
    // 同时保存到数据库
    try {
      await saveLicenseToDb(status);
    } catch (e) {
      console.error('保存授权状态失败:', e);
    }
    // 同时保存到 localStorage
    localStorage.setItem('qicheng-dian-license', JSON.stringify({
      status,
      machineCode: get().machineCode,
      licenseKey: get().licenseKey,
    }));
  },

  setMachineCode: (machineCode) => {
    set({ machineCode });
  },

  setLicenseKey: (licenseKey) => {
    set({ licenseKey });
    localStorage.setItem('qicheng-dian-license', JSON.stringify({
      status: get().status,
      machineCode: get().machineCode,
      licenseKey,
    }));
  },

  loadFromStorage: async () => {
    try {
      // 先尝试从数据库加载
      const dbLicense = await loadLicenseFromDb();
      if (dbLicense) {
        set({ status: dbLicense });
        return;
      }
    } catch (e) {
      console.error('从数据库加载授权失败:', e);
    }
    
    // 备用：从 localStorage 加载
    const saved = localStorage.getItem('qicheng-dian-license');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        set({
          status: data.status || {
            is_activated: false,
            license_type: null,
            expires_at: null,
            machine_code: '',
            is_professional: false,
          },
          machineCode: data.machineCode || null,
          licenseKey: data.licenseKey || null,
        });
      } catch {
        console.error('从 localStorage 加载授权失败');
      }
    }
  },

  isLicensed: () => {
    const { status } = get();
    if (!status.is_activated) return false;
    if (status.license_type === 'permanent') return true;
    if (!status.expires_at) return false;
    // expires_at 是秒级时间戳，Date.now() 是毫秒，需要转换
    return status.expires_at * 1000 > Date.now();
  },

  isExpired: () => {
    const { status } = get();
    if (!status.is_activated) return true;
    if (status.license_type === 'permanent') return false;
    if (!status.expires_at) return true;
    // expires_at 是秒级时间戳，Date.now() 是毫秒，需要转换
    return status.expires_at * 1000 <= Date.now();
  },

  getLicenseType: () => {
    return get().status.license_type;
  },

  getExpiresAt: () => {
    return get().status.expires_at;
  },
}));

// 授权限制常量
export const LICENSE_LIMITS = {
  UNLICENSED_MAX_SCENES: 1,
  UNLICENSED_MAX_ITEMS_PER_SCENE: 3,
};

export function isFullyLicensed(status: LicenseStatus): boolean {
  if (!status.is_activated) return false;
  if (status.license_type === 'permanent') return true;
  if (!status.expires_at) return false;
  // expires_at 是秒级时间戳，Date.now() 是毫秒，需要转换
  return status.expires_at * 1000 > Date.now();
}

export const LICENSE_DAYS = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
  permanent: -1,
};

export function calculateExpiresAt(licenseType: string, activatedAt: number): number | null {
  const days = LICENSE_DAYS[licenseType as keyof typeof LICENSE_DAYS];
  if (days === -1) return null;
  return activatedAt + (days * 24 * 60 * 60 * 1000);
}