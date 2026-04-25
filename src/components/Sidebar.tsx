import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSceneStore, useLicenseStore, LICENSE_LIMITS } from '../stores';
import { showToast } from './Toast';
import { Scene } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { save, open } from '@tauri-apps/plugin-dialog';

interface SceneContextMenuProps {
  x: number;
  y: number;
  scene: Scene;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetHotkey: () => void;
}

function SceneContextMenu({ x, y, scene: _scene, onClose, onEdit, onDelete, onSetHotkey }: SceneContextMenuProps) {
  // 菜单有 3 项 + 1 分隔线，高度约 160px
  const MENU_HEIGHT = 160;
  const MENU_WIDTH = 160;
  
  // 计算可视区域边界
  const maxX = window.innerWidth - MENU_WIDTH - 10;
  const maxY = window.innerHeight - MENU_HEIGHT - 10;
  
  // 水平方向：确保不超出左右边界
  const finalX = Math.max(10, Math.min(x, maxX));
  
  // 垂直方向：智能判断向上还是向下
  // 如果点击位置靠近底部，菜单往上弹出
  const finalY = y > maxY ? (y - MENU_HEIGHT) : y;
  // 确保不超出顶部
  const safeY = Math.max(10, finalY);

  return (
    <div
      style={{
        position: 'fixed',
        left: finalX,
        top: safeY,
        background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(102, 126, 234, 0.2)',
        padding: '8px 0',
        minWidth: '160px',
        zIndex: 9999999,
        backdropFilter: 'blur(12px)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        onClick={() => { onEdit(); onClose(); }}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '10px 16px', cursor: 'pointer', fontSize: '14px', color: '#e2e8f0',
          borderRadius: '8px', margin: '0 6px', transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <span style={{ fontSize: '16px' }}>✏️</span>
        <span>编辑名称</span>
      </div>
      <div
        onClick={() => { onSetHotkey(); onClose(); }}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '10px 16px', cursor: 'pointer', fontSize: '14px', color: '#e2e8f0',
          borderRadius: '8px', margin: '0 6px', transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.2)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <span style={{ fontSize: '16px' }}>⌨️</span>
        <span>设置快捷键</span>
      </div>
      <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 12px' }} />
      <div
        onClick={() => { onDelete(); onClose(); }}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '10px 16px', cursor: 'pointer', fontSize: '14px', color: '#ef4444',
          borderRadius: '8px', margin: '0 6px', transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <span style={{ fontSize: '16px' }}>🗑️</span>
        <span>删除场景</span>
      </div>
    </div>
  );
}

interface SidebarProps {
  onOpenLicense: () => void;
  onOpenHelp: () => void;
  onSetHotkey?: (scene: Scene) => void;
  onSceneContextMenu?: (scene: Scene, x: number, y: number, callbacks: {
    onEdit: () => void;
    onDelete: () => void;
    onSetHotkey: () => void;
  }) => void;
  onCloseSceneContextMenu?: () => void;
}

export default function Sidebar({ onOpenLicense, onOpenHelp, onSetHotkey, onSceneContextMenu, onCloseSceneContextMenu }: SidebarProps) {
  const { scenes, selectedSceneId, selectScene, updateScene, deleteScene, addScene } = useSceneStore();
  const { isLicensed } = useLicenseStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showLimitWarning, setShowLimitWarning] = useState(false);

  // 删除确认对话框
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; sceneId: string; sceneName: string }>({
    open: false,
    sceneId: '',
    sceneName: '',
  });

  // 全局点击关闭右键菜单
  useEffect(() => {
    const handleClick = () => onCloseSceneContextMenu?.();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onCloseSceneContextMenu]);

  const handleAddScene = () => {
    // 检查授权限制
    if (!isLicensed() && scenes.length >= LICENSE_LIMITS.UNLICENSED_MAX_SCENES) {
      showToast(`未授权版本最多创建 ${LICENSE_LIMITS.UNLICENSED_MAX_SCENES} 个场景，请先购买授权解锁全部功能`, 'warning');
      return;
    }
    // 创建新场景并自动选中
    addScene('新场景');
  };

  const handleUpdateScene = (scene: Scene) => {
    if (editingName.trim()) {
      updateScene(scene.id, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const startEditing = (scene: Scene, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(scene.id);
    setEditingName(scene.name);
  };

  const handleDelete = (scene: Scene, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ open: true, sceneId: scene.id, sceneName: scene.name });
  };

  const handleExport = async () => {
    if (scenes.length === 0) {
      showToast('没有可导出的场景数据', 'warning');
      return;
    }
    
    try {
      const filePath = await save({
        title: '导出场景',
        defaultPath: 'risedock-scenes.json',
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      
      if (filePath) {
        const store = useSceneStore.getState();
        await store.exportToFile(filePath);
        showToast('导出成功', 'success');
      }
    } catch (err) {
      console.error('导出失败:', err);
      showToast('导出失败: ' + (err as Error).message, 'error');
    }
  };

  const handleImport = async () => {
    try {
      const filePath = await open({
        title: '导入场景',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        multiple: false,
      });
      
      if (filePath) {
        const store = useSceneStore.getState();
        const result = await store.importFromFile(filePath as string);
        
        let message = `导入完成`;
        if (result.imported > 0) {
          message += `，成功导入 ${result.imported} 个场景`;
        }
        if (result.skipped > 0) {
          message += `，跳过 ${result.skipped} 个重复场景`;
        }
        if (result.errors.length > 0) {
          message += `，${result.errors.join(', ')}`;
        }
        
        showToast(message, result.imported > 0 ? 'success' : 'warning');
      }
    } catch (err) {
      console.error('导入失败:', err);
      showToast('导入失败: ' + (err as Error).message, 'error');
    }
  };

  // 场景右键菜单
  const handleSceneContextMenu = (scene: Scene, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSceneContextMenu?.(scene, e.clientX, e.clientY, {
      onEdit: () => {
        setEditingId(scene.id);
        setEditingName(scene.name);
      },
      onDelete: () => {
        setDeleteConfirm({ open: true, sceneId: scene.id, sceneName: scene.name });
      },
      onSetHotkey: () => {
        onSetHotkey?.(scene);
      },
    });
  };

  return (
    <aside style={{
      width: '280px',
      background: 'linear-gradient(180deg, #16213e 0%, #0f0f1a 100%)',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      paddingTop: '36px', // 躲开标题栏
    }}>
      {/* Logo */}
      <div style={{
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        <span style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#6b7280',
          letterSpacing: '0.5px',
        }}>
          v1.0.2
        </span>
      </div>

      {/* 场景列表 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
      }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          marginBottom: '12px',
          paddingLeft: '8px',
        }}>
          场景列表
        </div>

        {scenes.map((scene) => (
          <div
            key={scene.id}
            data-scene-row={scene.id}
            onClick={() => selectScene(scene.id)}
            onContextMenu={(e) => handleSceneContextMenu(scene, e)}
            onMouseEnter={() => setHoveredId(scene.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              marginBottom: '8px',
              borderRadius: '12px',
              cursor: 'pointer',
              background: selectedSceneId === scene.id 
                ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)' 
                : hoveredId === scene.id
                ? 'rgba(255, 255, 255, 0.05)'
                : 'transparent',
              border: selectedSceneId === scene.id 
                ? '1px solid rgba(102, 126, 234, 0.4)' 
                : '1px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            {editingId === scene.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleUpdateScene(scene)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateScene(scene);
                  if (e.key === 'Escape') {
                    setEditingId(null);
                    setEditingName('');
                  }
                }}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid #667eea',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                  flex: 1,
                  minWidth: 0,
                }}>
                  {/* 第一行：图标 + 名称 + 数量 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>📂</span>
                    <span style={{
                      fontSize: '14px',
                      color: selectedSceneId === scene.id ? '#fff' : '#a0aec0',
                      fontWeight: selectedSceneId === scene.id ? 600 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      minWidth: 0,
                    }}>
                      {scene.name}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      color: '#4a5568',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      flexShrink: 0,
                    }}>
                      {scene.items.length}
                    </span>
                  </div>
                  {/* 第二行：快捷键标签（仅在有快捷键时显示） */}
                  {scene.hotkey && (
                    <div style={{ paddingLeft: '24px' }}>
                      <span style={{
                        fontSize: '10px',
                        color: '#667eea',
                        background: 'rgba(102, 126, 234, 0.12)',
                        border: '1px solid rgba(102, 126, 234, 0.25)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                      }}>
                        ⌨️ {scene.hotkey}
                      </span>
                    </div>
                  )}
                </div>
                {/* 悬停显示修改/删除按钮 */}
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  opacity: (hoveredId === scene.id || selectedSceneId === scene.id) ? 1 : 0,
                  transition: 'opacity 0.2s',
                }}>
                  <button
                    onClick={(e) => startEditing(scene, e)}
                    style={{
                      padding: '4px 8px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#718096',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#667eea';
                      e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#718096';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => handleDelete(scene, e)}
                    style={{
                      padding: '4px 8px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#718096',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ef4444';
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#718096';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* 新建场景 */}
        {showLimitWarning && (
          <div style={{
            marginTop: '8px',
            padding: '12px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '10px',
            color: '#f59e0b',
            fontSize: '13px',
            textAlign: 'center',
          }}>
            <div style={{ marginBottom: '8px' }}>⚠️ 未授权版本限制</div>
            <div>最多创建 1 个场景</div>
            <button
              onClick={() => { setShowLimitWarning(false); onOpenLicense(); }}
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '6px',
                color: '#f59e0b',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              购买授权
            </button>
          </div>
        )}
        <button
          onClick={() => { setShowLimitWarning(false); handleAddScene(); }}
          style={{
            marginTop: '16px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            background: 'rgba(102, 126, 234, 0.08)',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            borderRadius: '10px',
            cursor: 'pointer',
            color: '#667eea',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(102, 126, 234, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(102, 126, 234, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
          }}
        >
          <span>+</span>
          <span>新建场景</span>
        </button>
      </div>

      {/* 底部按钮 */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      }}>
        {/* 导入导出按钮 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button
            onClick={handleExport}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '10px',
              cursor: 'pointer',
              color: '#22c55e',
              fontSize: '13px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.3)';
            }}
          >
            <span>📤</span>
            <span>导出</span>
          </button>
          <button
            onClick={handleImport}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '10px',
              cursor: 'pointer',
              color: '#3b82f6',
              fontSize: '13px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
            }}
          >
            <span>📥</span>
            <span>导入</span>
          </button>
        </div>
        <button
          onClick={onOpenHelp}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            cursor: 'pointer',
            color: '#718096',
            fontSize: '14px',
            marginBottom: '8px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#a0aec0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#718096';
          }}
        >
          <span>❓</span>
          <span>使用帮助</span>
        </button>
        <button
          onClick={onOpenLicense}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            cursor: 'pointer',
            color: '#718096',
            fontSize: '14px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#a0aec0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#718096';
          }}
        >
          <span>🔑</span>
          <span>授权管理</span>
        </button>
      </div>
      
      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="确认删除"
        message={`确定要删除场景「${deleteConfirm.sceneName}」吗？删除后无法恢复。`}
        confirmText="删除"
        cancelText="取消"
        type="danger"
        onConfirm={() => {
          deleteScene(deleteConfirm.sceneId);
          showToast(`已删除场景「${deleteConfirm.sceneName}」`, 'success');
          setDeleteConfirm({ open: false, sceneId: '', sceneName: '' });
        }}
        onCancel={() => setDeleteConfirm({ open: false, sceneId: '', sceneName: '' })}
      />
    </aside>
  );
}
