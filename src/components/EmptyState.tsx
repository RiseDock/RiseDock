import { useState, useEffect, useRef } from 'react';
import { useSceneStore, useLicenseStore, LICENSE_LIMITS } from '../stores';
import { showToast } from './Toast';
import { invoke } from '@tauri-apps/api/core';
import ConfirmDialog from './ConfirmDialog';
import { Scene } from '../types';

interface EmptyStateProps {
  onSetHotkey?: (scene: Scene) => void;
}

export default function EmptyState({ onSetHotkey }: EmptyStateProps) {
  const { scenes, addScene, selectScene, deleteScene, updateScene } = useSceneStore();
  const { isLicensed } = useLicenseStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, sceneId: '', sceneName: '' });
  const [sceneContextMenu, setSceneContextMenu] = useState<{ x: number; y: number; scene: Scene } | null>(null);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingIndex, setEditingIndex] = useState(-1);
  const editInputRef = useRef<HTMLInputElement>(null);

  // 编辑名称自动聚焦
  useEffect(() => {
    if (editingSceneId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSceneId]);

  const handleSaveEdit = () => {
    if (editingSceneId && editingName.trim()) {
      updateScene(editingSceneId, editingName.trim());
      showToast(`场景已重命名为「${editingName.trim()}」`, 'success');
    }
    setEditingSceneId(null);
    setEditingName('');
    setEditingIndex(-1);
  };

  const handleStartEdit = (scene: Scene, index: number) => {
    setEditingSceneId(scene.id);
    setEditingName(scene.name);
    setEditingIndex(index);
  };
  
  // 菜单关闭逻辑：用矩形区域检测而非 element.contains
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

  // ESC 键关闭
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSceneContextMenu(null);
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, []);

  const handleCreate = () => {
    if (!isLicensed() && scenes.length >= LICENSE_LIMITS.UNLICENSED_MAX_SCENES) {
      showToast(`未授权版本最多创建 ${LICENSE_LIMITS.UNLICENSED_MAX_SCENES} 个场景，请先购买授权解锁全部功能`, 'warning');
      return;
    }
    if (newName.trim()) {
      const scene = addScene(newName.trim());
      setNewName('');
      setShowCreate(false);
      selectScene(scene.id);
      showToast(`场景「${scene.name}」创建成功`, 'success');
    }
  };

  const handleLaunchAll = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;
    for (const item of scene.items) {
      if (item.enabled) {
        try {
          await invoke('launch_item', { itemPath: item.path, itemType: item.type, itemName: item.name });
        } catch (e) {
          console.error('Launch failed:', e);
        }
      }
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '48px 40px', background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)', overflowY: 'auto' }}>
      {/* 顶部品牌区域 */}
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100px', height: '100px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '24px', marginBottom: '24px', boxShadow: '0 20px 60px rgba(102, 126, 234, 0.4)', fontSize: '48px' }}>
          🚀
        </div>
        <h1 style={{ fontSize: '42px', fontWeight: 700, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '12px', letterSpacing: '4px' }}>
          启程典
        </h1>
        <p style={{ color: '#718096', fontSize: '16px', letterSpacing: '2px' }}>SCENE LAUNCHER</p>
      </div>

      {/* 创建场景表单 */}
      {showCreate && (
        <div style={{ marginBottom: '48px', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <input
              type="text" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="输入场景名称..."
              style={{ padding: '16px 24px', background: 'transparent', border: 'none', borderRadius: '12px', fontSize: '16px', color: '#fff', outline: 'none', width: '300px' }}
              autoFocus
            />
            <button onClick={handleCreate} disabled={!newName.trim()} style={{ padding: '16px 32px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 600, cursor: newName.trim() ? 'pointer' : 'default', opacity: newName.trim() ? 1 : 0.5 }}>
              创建场景
            </button>
            <button onClick={() => { setShowCreate(false); setNewName(''); }} style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.1)', color: '#a0aec0', border: 'none', borderRadius: '12px', fontSize: '15px', cursor: 'pointer' }}>
              取消
            </button>
          </div>
        </div>
      )}

      {/* 快速创建场景 */}
      {!showCreate && scenes.length === 0 && (
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => { if (!isLicensed() && scenes.length >= LICENSE_LIMITS.UNLICENSED_MAX_SCENES) { showToast(`未授权版本最多创建 ${LICENSE_LIMITS.UNLICENSED_MAX_SCENES} 个场景，请先购买授权解锁全部功能`, 'warning'); return; } setShowCreate(true); }}
            style={{ padding: '18px 48px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 10px 40px rgba(102, 126, 234, 0.4)', letterSpacing: '2px' }}
          >
            创建第一个场景
          </button>
          <p style={{ color: '#4a5568', marginTop: '16px', fontSize: '14px' }}>开始构建您的工作环境</p>
        </div>
      )}

      {/* 场景列表 */}
      {scenes.length > 0 && (
        <div style={{ width: '100%', maxWidth: '800px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#fff' }}>
              我的场景
              <span style={{ marginLeft: '12px', padding: '4px 12px', background: 'rgba(102, 126, 234, 0.2)', borderRadius: '20px', fontSize: '13px', color: '#667eea' }}>{scenes.length}</span>
            </h3>
            <button
              onClick={() => { if (!isLicensed() && scenes.length >= LICENSE_LIMITS.UNLICENSED_MAX_SCENES) { showToast(`未授权版本最多创建 ${LICENSE_LIMITS.UNLICENSED_MAX_SCENES} 个场景，请先购买授权解锁全部功能`, 'warning'); return; } setShowCreate(true); }}
              style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)' }}
            >
              + 新建场景
            </button>
          </div>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {scenes.map((scene, index) => (
              <div
                key={scene.id}
                data-scene-row={scene.id}
                onContextMenu={(e) => { e.preventDefault(); setSceneContextMenu({ x: e.clientX, y: e.clientY, scene }); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px', background: 'linear-gradient(135deg, rgba(22, 33, 62, 0.8) 0%, rgba(26, 26, 46, 0.8) 100%)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.1)', transition: 'all 0.3s ease', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)'; e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'; }}
                onClick={() => selectScene(scene.id)}
              >
                {/* 背景装饰 */}
                <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '100%', background: `linear-gradient(90deg, transparent, rgba(102, 126, 234, ${0.05 + index * 0.02}))`, pointerEvents: 'none' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative' }}>
                  {/* 序号 */}
                  <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: 'white' }}>{index + 1}</div>

                  <div>
                    {editingSceneId === scene.id ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') { setEditingSceneId(null); setEditingName(''); setEditingIndex(-1); } }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: '18px', fontWeight: 600, color: '#fff', background: 'rgba(102, 126, 234, 0.15)', border: '1px solid rgba(102, 126, 234, 0.4)', borderRadius: '6px', padding: '2px 8px', outline: 'none', width: '200px' }}
                      />
                    ) : (
                      <div style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{scene.name}</div>
                    )}
                    <div style={{ fontSize: '13px', color: '#718096', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ padding: '2px 8px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '4px', color: '#10b981', fontSize: '12px' }}>{scene.items.length} 项</span>
                      {scene.items.filter(i => i.enabled).length > 0 && (
                        <span style={{ padding: '2px 8px', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '4px', color: '#3b82f6', fontSize: '12px' }}>{scene.items.filter(i => i.enabled).length} 启用</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', position: 'relative' }}>
                  {/* 快捷键标签 */}
                  {scene.hotkey && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onSetHotkey?.(scene); }}
                      style={{ padding: '6px 12px', background: 'rgba(102, 126, 234, 0.12)', border: '1px solid rgba(102, 126, 234, 0.35)', borderRadius: '6px', cursor: 'pointer', color: '#818cf8', fontSize: '12px', fontWeight: 500, transition: 'all 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)'; e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(102, 126, 234, 0.12)'; e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.35)'; }}
                      title="点击修改快捷键"
                    >
                      ⌨️ {scene.hotkey}
                    </button>
                  )}

                  {scene.items.length > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLaunchAll(scene.id); }}
                      style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                      🚀 启动
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, sceneId: scene.id, sceneName: scene.name }); }}
                    style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="确认删除"
        message={`确定要删除场景「${deleteConfirm.sceneName}」吗？删除后无法恢复。`}
        confirmText="删除"
        cancelText="取消"
        type="danger"
        onConfirm={() => { deleteScene(deleteConfirm.sceneId); showToast(`已删除场景「${deleteConfirm.sceneName}」`, 'success'); setDeleteConfirm({ open: false, sceneId: '', sceneName: '' }); }}
        onCancel={() => setDeleteConfirm({ open: false, sceneId: '', sceneName: '' })}
      />

      {/* 场景卡片右键菜单 */}
      {sceneContextMenu && (() => {
        const MENU_HEIGHT = 160;
        const MENU_WIDTH = 160;
        const finalX = Math.max(10, Math.min(sceneContextMenu.x, window.innerWidth - MENU_WIDTH - 10));
        const finalY = Math.max(10, Math.min(sceneContextMenu.y, window.innerHeight - MENU_HEIGHT - 10));
        return (
        <>
          <div
            data-scene-context-menu="true"
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'fixed', left: finalX, top: finalY, background: 'linear-gradient(145deg, #1e293b, #0f172a)', border: '1px solid rgba(102, 126, 234, 0.25)', borderRadius: '10px', padding: '4px', zIndex: 9999, minWidth: '160px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
          >
            <div
              onClick={() => { const idx = scenes.findIndex(s => s.id === sceneContextMenu.scene.id); handleStartEdit(sceneContextMenu.scene, idx); setSceneContextMenu(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '6px', cursor: 'pointer', color: '#e2e8f0' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{ fontSize: '16px' }}>✏️</span>
              <span style={{ fontSize: '13px' }}>编辑名称</span>
            </div>
            <div
              onClick={() => { onSetHotkey?.(sceneContextMenu.scene); setSceneContextMenu(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '6px', cursor: 'pointer', color: '#e2e8f0' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{ fontSize: '16px' }}>⌨️</span>
              <span style={{ fontSize: '13px' }}>{sceneContextMenu.scene.hotkey ? '修改快捷键' : '设置快捷键'}</span>
            </div>
            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 12px' }} />
            <div
              onClick={() => { setDeleteConfirm({ open: true, sceneId: sceneContextMenu.scene.id, sceneName: sceneContextMenu.scene.name }); setSceneContextMenu(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '6px', cursor: 'pointer', color: '#ef4444' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{ fontSize: '16px' }}>🗑️</span>
              <span style={{ fontSize: '13px' }}>删除场景</span>
            </div>
          </div>
        </>
        );
      })()}
    </div>
  );
}
