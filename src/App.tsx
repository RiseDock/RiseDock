import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSceneStore, useLicenseStore } from './stores';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { register, unregister, unregisterAll } from '@tauri-apps/plugin-global-shortcut';
import Sidebar from './components/Sidebar';
import SceneEditor from './components/SceneEditor';
import EmptyState from './components/EmptyState';
import LicenseModal from './components/LicenseModal';
import HelpModal from './components/HelpModal';
import HotkeyModal from './components/HotkeyModal';
import ToastContainer from './components/Toast';
import SearchModal from './components/SearchModal';
import { Scene } from './types';

function App() {
  const { scenes, selectedSceneId, loadFromStorage, selectScene } = useSceneStore();
  const { loadFromStorage: loadLicense, setStatus } = useLicenseStore();
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [hotkeyScene, setHotkeyScene] = useState<Scene | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const selectedScene = scenes.find((s) => s.id === selectedSceneId);
  // 防止并发重注册
  const isRegisteringRef = useRef(false);
  const pendingRegisterRef = useRef(false);
  // 标记是否正在打开快捷键设置弹窗（此时不应触发场景启动）
  const hotkeyModalOpenRef = useRef(false);

  // 场景右键菜单（通过 Portal 渲染到 body）
  const [sceneContextMenu, setSceneContextMenu] = useState<{
    x: number;
    y: number;
    scene: Scene;
    onEdit: () => void;
    onDelete: () => void;
    onSetHotkey: () => void;
  } | null>(null);

  // 场景右键菜单回调
  const handleSceneContextMenu = (
    scene: Scene,
    x: number,
    y: number,
    callbacks: { onEdit: () => void; onDelete: () => void; onSetHotkey: () => void }
  ) => {
    setSceneContextMenu({ x, y, scene, ...callbacks });
  };

  // 场景右键菜单自动关闭：用矩形区域检测而非 element.contains
  useEffect(() => {
    if (!sceneContextMenu) return;

    const handleMouseMove = (e: MouseEvent) => {
      const menu = document.querySelector('[data-scene-context-menu="true"]');
      const currentSceneRow = document.querySelector(`[data-scene-row="${sceneContextMenu.scene.id}"]`);
      
      // 获取鼠标位置
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      // 检查鼠标是否在菜单矩形内
      if (menu) {
        const menuRect = menu.getBoundingClientRect();
        if (mouseX >= menuRect.left && mouseX <= menuRect.right && mouseY >= menuRect.top && mouseY <= menuRect.bottom) {
          return; // 鼠标在菜单内，保持打开
        }
      }
      
      // 检查鼠标是否在当前场景行矩形内
      if (currentSceneRow) {
        const rowRect = currentSceneRow.getBoundingClientRect();
        if (mouseX >= rowRect.left && mouseX <= rowRect.right && mouseY >= rowRect.top && mouseY <= rowRect.bottom) {
          return; // 鼠标在当前场景行内，保持打开
        }
      }
      
      // 鼠标在其他区域，关闭菜单
      setSceneContextMenu(null);
    };

    const handleMouseDown = (e: MouseEvent) => {
      const menu = document.querySelector('[data-scene-context-menu="true"]');
      if (menu) {
        const rect = menu.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          return; // 点击在菜单内
        }
      }
      setSceneContextMenu(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [sceneContextMenu]);

  useEffect(() => {
    const init = async () => {
      try {
        // 先从后端获取授权状态（最权威）
        try {
          const status = await invoke<any>('get_license_status');
          setStatus(status);
        } catch (e) {
          console.error('加载授权状态失败:', e);
          // 备用：从数据库加载
          try {
            await loadLicense();
          } catch (e2) {
            console.error('从数据库加载授权也失败:', e2);
          }
        }
        
        // 再加载场景数据
        await loadFromStorage();
      } catch (err) {
        console.error('初始化失败:', err);
      }
    };
    init();
  }, []);

  // 阻止右键默认行为
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // 全局快捷键：场景启动（用 ref 存 scenes，避免回调闭包拿到旧数据）
  const scenesRef = useRef(scenes);
  useEffect(() => {
    scenesRef.current = scenes;
  }, [scenes]);

  // 快捷键设置弹窗控制：打开时注销所有全局快捷键，关闭时重新注册
  useEffect(() => {
    if (hotkeyScene) {
      // 弹窗打开，注销所有全局快捷键，让按键能被捕获
      unregisterAll().catch(() => {});
    } else {
      // 弹窗关闭，重新触发全局快捷键注册
      // 通过改变 scenes 来触发重新注册
      const currentScenes = useSceneStore.getState().scenes;
      scenesRef.current = currentScenes;
    }
  }, [hotkeyScene]);

  // 防抖护盾：每个场景记录上一次触发时间，避免重复启动
  const lastInvokeRef = useRef<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    const setupHotkeys = async () => {
      if (isRegisteringRef.current) {
        pendingRegisterRef.current = true;
        return;
      }
      isRegisteringRef.current = true;
      pendingRegisterRef.current = false;

      try {
        // 先逐个注销所有已注册快捷键（比 unregisterAll 更可靠）
        for (const scene of scenesRef.current) {
          if (!scene.hotkey) continue;
          const tauriHotkey = scene.hotkey.replace('Ctrl', 'CommandOrControl');
          try {
            await unregister(tauriHotkey);
          } catch {
            // 忽略未注册的报错
          }
        }
        if (cancelled) return;

        // 清空旧的防抖记录
        lastInvokeRef.current = {};

        // 注册所有有快捷键的场景
        for (const scene of scenes) {
          if (!scene.hotkey || cancelled) continue;
          const tauriHotkey = scene.hotkey.replace('Ctrl', 'CommandOrControl');
          const sceneId = scene.id;
          try {
            await register(tauriHotkey, () => {
              // 正在设置快捷键时不触发
              if (hotkeyModalOpenRef.current) return;
              // 防抖：500ms 内同一场景只执行一次
              const now = Date.now();
              const last = lastInvokeRef.current[sceneId] || 0;
              if (now - last < 500) return;
              lastInvokeRef.current[sceneId] = now;

              const latestScene = scenesRef.current.find(s => s.id === sceneId);
              if (!latestScene) return;
              const enabledItems = latestScene.items.filter(i => i.enabled);
              if (enabledItems.length === 0) return;
              invoke('launch_items', {
                items: enabledItems.map(item => ({
                  id: item.id,
                  path: item.path,
                  type: item.type,
                  name: item.name,
                  delay: item.delay || 0,
                }))
              }).catch(console.error);
            });
          } catch (e) {
            console.error(`注册快捷键 ${scene.hotkey} 失败:`, e);
          }
        }
      } finally {
        isRegisteringRef.current = false;
        if (pendingRegisterRef.current && !cancelled) {
          setupHotkeys();
        }
      }
    };

    setupHotkeys();

    return () => {
      cancelled = true;
      // 逐个注销
      (async () => {
        for (const scene of scenesRef.current) {
          if (!scene.hotkey) continue;
          const tauriHotkey = scene.hotkey.replace('Ctrl', 'CommandOrControl');
          try { await unregister(tauriHotkey); } catch { /* ignore */ }
        }
      })().catch(console.error);
    };
  }, [scenes]);

  // 快捷键 Ctrl+K 打开搜索
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 窗口已配置自定义控制按钮，这里不需要拦截关闭事件

  // 最小化到任务栏
  const handleMinimize = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.minimize();
  };

  // 最大化/还原
  const handleToggleMaximize = async () => {
    const appWindow = getCurrentWindow();
    const isMaximized = await appWindow.isMaximized();
    if (isMaximized) {
      await appWindow.unmaximize();
    } else {
      await appWindow.maximize();
    }
  };

  // 确认弹窗中的最小化到托盘
  const handleMinimizeToTray = async () => {
    setShowCloseDialog(false);
    const appWindow = getCurrentWindow();
    await appWindow.hide();
  };

  // 退出程序
  const handleExit = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.close();
  };

  const handleCloseDialog = () => {
    setShowCloseDialog(false);
  };

  const handleBackToHome = () => {
    selectScene(null);
  };

  // 搜索相关
  const handleSearchSelectScene = (sceneId: string) => {
    selectScene(sceneId);
  };

  const handleSearchSelectItem = (sceneId: string, itemId: string) => {
    selectScene(sceneId);
    setHighlightedItemId(itemId);
    // 3秒后取消高亮
    setTimeout(() => setHighlightedItemId(null), 3000);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f9fafb' }}>
      {/* 自定义标题栏 */}
      <div
        data-tauri-drag-region
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '36px',
          background: 'linear-gradient(135deg, #1e1e2e, #2a2a3e)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 99999,
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: '#a0aec0' }}>🚀 启程典</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* 搜索按钮 */}
          <button
            onClick={() => setShowSearch(true)}
            style={{
              height: '28px',
              padding: '0 12px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#a0aec0',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginRight: '8px',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            title="搜索 (Ctrl+K)"
          >
            🔍 <span style={{ opacity: 0.6 }}>Ctrl+K</span>
          </button>
          <button
            onClick={handleMinimize}
            style={{
              width: '46px',
              height: '36px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#a0aec0',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            title="最小化"
          >
            ─
          </button>
          <button
            onClick={handleToggleMaximize}
            style={{
              width: '46px',
              height: '36px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#a0aec0',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            title="最大化"
          >
            □
          </button>
          <button
            onClick={() => setShowCloseDialog(true)}
            style={{
              width: '46px',
              height: '36px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#a0aec0',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#ef4444'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            title="关闭"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 侧边栏 */}
      <Sidebar
        onOpenLicense={() => setShowLicenseModal(true)}
        onOpenHelp={() => setShowHelpModal(true)}
        onSetHotkey={(scene) => setHotkeyScene(scene)}
        onSceneContextMenu={handleSceneContextMenu}
        onCloseSceneContextMenu={() => setSceneContextMenu(null)}
      />

      {/* 场景右键菜单（直接渲染，不用 Portal） */}
      {sceneContextMenu && (() => {
        const MENU_HEIGHT = 160;
        const MENU_WIDTH = 160;
        // 与 ContextMenu.tsx 完全一致的定位逻辑：确保菜单不超出底部和右侧边界
        const finalX = Math.max(10, Math.min(sceneContextMenu.x, window.innerWidth - MENU_WIDTH - 10));
        const finalY = Math.max(10, Math.min(sceneContextMenu.y, window.innerHeight - MENU_HEIGHT - 10));
        return (
          <div
            data-scene-context-menu="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: finalX,
              top: finalY,
              background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(102, 126, 234, 0.2)',
              padding: '8px 0',
              minWidth: '160px',
              zIndex: 99999999,
              backdropFilter: 'blur(12px)',
            }}
          >
            <div
              onClick={() => { sceneContextMenu.onEdit(); setSceneContextMenu(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', cursor: 'pointer', fontSize: '14px', color: '#e2e8f0', borderRadius: '8px', margin: '0 6px', transition: 'all 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{ fontSize: '16px' }}>✏️</span>
              <span>编辑名称</span>
            </div>
            <div
              onClick={() => { sceneContextMenu.onSetHotkey(); setSceneContextMenu(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', cursor: 'pointer', fontSize: '14px', color: '#e2e8f0', borderRadius: '8px', margin: '0 6px', transition: 'all 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{ fontSize: '16px' }}>⌨️</span>
              <span>设置快捷键</span>
            </div>
            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 12px' }} />
            <div
              onClick={() => { sceneContextMenu.onDelete(); setSceneContextMenu(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', cursor: 'pointer', fontSize: '14px', color: '#ef4444', borderRadius: '8px', margin: '0 6px', transition: 'all 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{ fontSize: '16px' }}>🗑️</span>
              <span>删除场景</span>
            </div>
          </div>
        );
      })()}

      {/* 主内容区 */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)', paddingTop: '36px' }}>
        {selectedScene ? (
          <SceneEditor 
            scene={selectedScene} 
            onBack={handleBackToHome}
            highlightedItemId={highlightedItemId}
            onSetHotkey={(scene) => setHotkeyScene(scene)}
          />
        ) : (
          <EmptyState onSetHotkey={(scene) => setHotkeyScene(scene)} />
        )}
      </main>

      {/* 授权弹窗 */}
      {showLicenseModal && (
        <LicenseModal onClose={() => setShowLicenseModal(false)} />
      )}

      {/* 帮助弹窗 */}
      {showHelpModal && (
        <HelpModal onClose={() => setShowHelpModal(false)} />
      )}

      {/* 快捷键设置弹窗 */}
      {hotkeyScene && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99998 }} onClick={() => {
            hotkeyModalOpenRef.current = false;
            setHotkeyScene(null);
          }} />
          <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
            <HotkeyModal
              scene={hotkeyScene}
              onClose={() => {
                hotkeyModalOpenRef.current = false;
                setHotkeyScene(null);
              }}
              onOpen={() => { hotkeyModalOpenRef.current = true; }}
            />
          </div>
        </>
      )}

      {/* 关闭确认弹窗 */}
      {showCloseDialog && (
        <div
          onClick={handleCloseDialog}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1a1a2e',
              borderRadius: '12px',
              padding: '20px 24px',
              width: '280px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.08)',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            {/* 弹窗右上角关闭按钮 */}
            <button
              onClick={handleCloseDialog}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '24px',
                height: '24px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#666',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              title="关闭"
            >
              ✕
            </button>
            <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>
              确认关闭
            </h3>
            <p style={{ color: '#8b949e', fontSize: '13px', margin: '0 0 20px', lineHeight: '1.5' }}>
              最小化到托盘，或直接退出程序？
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleMinimizeToTray}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#c9d1d9',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                }}
              >
                最小化到托盘
              </button>
              <button
                onClick={handleExit}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#da3633',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#b62324'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#da3633'}
              >
                退出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast提示 */}
      <ToastContainer />

      {/* 搜索弹窗 */}
      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          onSelectScene={handleSearchSelectScene}
          onSelectItem={handleSearchSelectItem}
        />
      )}
    </div>
  );
}

export default App;
