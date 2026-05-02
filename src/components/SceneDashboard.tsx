import { useState, useEffect, useRef } from 'react';
import { useSceneStore, useLicenseStore, LICENSE_LIMITS } from '../stores';
import { showToast } from './Toast';
import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import ConfirmDialog from './ConfirmDialog';
import { Scene } from '../types';
import TopMenuBar from './TopMenuBar';

type ViewMode = 'grid' | 'list';

const STORAGE_KEY_VIEW_MODE = 'risedock-view-mode';

function getStoredViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_VIEW_MODE);
    if (stored === 'grid' || stored === 'list') return stored;
  } catch {}
  return 'grid';
}

function storeViewMode(mode: ViewMode) {
  try {
    localStorage.setItem(STORAGE_KEY_VIEW_MODE, mode);
  } catch {}
}

// ── 公共样式 ──

// ── 场景卡片 ──
function SceneCard({
  scene, index, viewMode, editingSceneId, editingName, editInputRef,
  onLaunch, onEdit, onDelete, onSetHotkey, onSelect,
}: {
  scene: Scene; index: number; viewMode: ViewMode;
  editingSceneId: string | null; editingName: string;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  onLaunch: () => void; onEdit: () => void; onDelete: () => void;
  onSetHotkey: () => void; onSelect: () => void;
}) {
  const enabledCount = scene.items.filter(i => i.enabled).length;
  const isGrid = viewMode === 'grid';

  const card: React.CSSProperties = isGrid ? {
    display: 'flex',
    flexDirection: 'column',
    padding: '28px 24px',
    background: 'linear-gradient(135deg, rgba(22, 33, 62, 0.8) 0%, rgba(26, 26, 46, 0.8) 100%)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  } : {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 20px',
    background: 'linear-gradient(135deg, rgba(22, 33, 62, 0.8) 0%, rgba(26, 26, 46, 0.8) 100%)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    gap: '16px',
  };

  const hoverOn = (e: React.MouseEvent) => {
    const el = e.currentTarget;
    el.style.transform = isGrid ? 'translateY(-4px)' : 'translateY(-1px)';
    el.style.boxShadow = isGrid ? '0 20px 40px rgba(0, 0, 0, 0.3)' : '0 8px 20px rgba(0, 0, 0, 0.2)';
    el.style.borderColor = 'rgba(102, 126, 234, 0.5)';
  };
  const hoverOff = (e: React.MouseEvent) => {
    const el = e.currentTarget;
    el.style.transform = 'translateY(0)';
    el.style.boxShadow = 'none';
    el.style.borderColor = isGrid ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.06)';
  };

  return (
    <div
      key={scene.id}
      data-scene-row={scene.id}
      onClick={onSelect}
      onContextMenu={(e) => e.preventDefault()}
      style={card}
      onMouseEnter={hoverOn}
      onMouseLeave={hoverOff}
    >
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: isGrid ? '100%' : '150px', height: '100%',
        background: `linear-gradient(${isGrid ? '135deg' : '90deg'}, transparent, rgba(102, 126, 234, ${0.03 + index * 0.015}))`,
        pointerEvents: 'none',
      }} />

      {/* 网格：序号 + 名称区域 */}
      <div style={{ display: 'flex', alignItems: isGrid ? 'flex-start' : 'center', gap: isGrid ? '14px' : '14px', position: 'relative', minWidth: 0, ...(isGrid ? { marginBottom: '20px' } : { flex: 1 }) }}>
        {/* 序号 */}
        <div style={{
          width: isGrid ? '44px' : '36px', height: isGrid ? '44px' : '36px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: isGrid ? '12px' : '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: isGrid ? '18px' : '14px', fontWeight: 700, color: 'white', flexShrink: 0,
        }}>
          {index + 1}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          {editingSceneId === scene.id ? (
            <input
              ref={editInputRef}
              type="text" value={editingName}
              onChange={(e) => {}} // controlled by parent
              onBlur={() => {}}
              onKeyDown={() => {}}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: isGrid ? '17px' : '14px', fontWeight: 600, color: '#fff',
                background: 'rgba(102, 126, 234, 0.15)', border: '1px solid rgba(102, 126, 234, 0.4)',
                borderRadius: '6px', padding: '2px 8px', outline: 'none', width: '200px',
              }}
            />
          ) : (
            <div style={{ fontSize: isGrid ? '17px' : '14px', fontWeight: 600, color: '#fff', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {scene.name}
            </div>
          )}
          <div style={{ fontSize: '12px', color: '#718096', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ padding: '1px 7px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '4px', color: '#10b981', fontSize: '11px' }}>
              {scene.items.length} 项
            </span>
            {enabledCount > 0 && (
              <span style={{ padding: '1px 7px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '4px', color: '#3b82f6', fontSize: '11px' }}>
                {enabledCount} 启用
              </span>
            )}
            {scene.hotkey && (
              <button
                onClick={(e) => { e.stopPropagation(); onSetHotkey(); }}
                style={{
                  padding: '1px 7px', background: 'rgba(102, 126, 234, 0.1)',
                  border: '1px solid rgba(102, 126, 234, 0.3)', borderRadius: '4px',
                  cursor: 'pointer', color: '#818cf8', fontSize: '11px', fontWeight: 500,
                }}
                title="点击修改快捷键"
              >
                ⌨️ {scene.hotkey}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div style={{
        display: 'flex', gap: isGrid ? '8px' : '8px', alignItems: isGrid ? 'stretch' : 'center',
        position: 'relative', flexShrink: 0,
        ...(isGrid ? { marginTop: 'auto' } : {}),
      }}>
        {scene.items.length > 0 && enabledCount > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onLaunch(); }}
            style={{
              ...(isGrid ? { flex: 1, padding: '12px 0' } : { padding: '8px 18px' }),
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white', border: 'none', borderRadius: '10px',
              cursor: 'pointer', fontSize: isGrid ? '14px' : '13px', fontWeight: 600,
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.03)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            🚀 启动
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          style={{
            ...(isGrid ? { flex: 1, padding: '12px 0' } : { padding: '8px 14px' }),
            background: 'rgba(102, 126, 234, 0.1)',
            color: '#667eea', border: '1px solid rgba(102, 126, 234, 0.25)',
            borderRadius: '10px', cursor: 'pointer', fontSize: isGrid ? '14px' : '13px',
            transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)'; }}
        >
          ⚙️ 设置
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{
            ...(isGrid ? { padding: '12px 14px' } : { padding: '8px 10px' }),
            background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            borderRadius: '10px', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

// ── 主组件 ──
interface SceneDashboardProps {
  onOpenLicense: () => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  onOpenUpdate: () => void;
  onOpenAbout: () => void;
  onSetHotkey?: (scene: Scene) => void;
  onOpenSearch: () => void;
}

export default function SceneDashboard({ onOpenLicense, onOpenHelp, onOpenSettings, onOpenUpdate, onOpenAbout, onSetHotkey, onOpenSearch }: SceneDashboardProps) {
  const { scenes, addScene, selectScene, deleteScene, updateScene } = useSceneStore();
  const { isLicensed } = useLicenseStore();
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, sceneId: '', sceneName: '' });
  const [importConfirm, setImportConfirm] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; scene: Scene } | null>(null);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    storeViewMode(mode);
  };

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
  };

  const handleStartEdit = (scene: Scene) => {
    setEditingSceneId(scene.id);
    setEditingName(scene.name);
  };

  // 右键菜单关闭
  useEffect(() => {
    if (!contextMenu) return;
    const handleMouseMove = (e: MouseEvent) => {
      const menu = document.querySelector('[data-dashboard-menu="true"]');
      const row = document.querySelector(`[data-scene-row="${contextMenu.scene.id}"]`);
      if (menu) { const r = menu.getBoundingClientRect(); if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return; }
      if (row) { const r = row.getBoundingClientRect(); if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return; }
      setContextMenu(null);
    };
    const handleMouseDown = (e: MouseEvent) => {
      const menu = document.querySelector('[data-dashboard-menu="true"]');
      if (menu) { const r = menu.getBoundingClientRect(); if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return; }
      setContextMenu(null);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mousedown', handleMouseDown); };
  }, [contextMenu]);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setContextMenu(null); if (showCreate) { setShowCreate(false); setNewName(''); } }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [showCreate]);

  const handleCreate = () => {
    if (!isLicensed() && scenes.length >= LICENSE_LIMITS.UNLICENSED_MAX_SCENES) {
      showToast(`未授权版本最多创建 ${LICENSE_LIMITS.UNLICENSED_MAX_SCENES} 个场景，请先购买授权解锁全部功能`, 'warning');
      return;
    }
    if (newName.trim()) {
      const scene = addScene(newName.trim());
      setNewName(''); setShowCreate(false);
      selectScene(scene.id);
      showToast(`场景「${scene.name}」创建成功`, 'success');
    }
  };

  const handleLaunchAll = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;
    const enabledItems = scene.items.filter(i => i.enabled);
    if (enabledItems.length === 0) { showToast('该场景没有启用的启动项', 'warning'); return; }
    try {
      await invoke('launch_items', { items: enabledItems.map(item => ({ id: item.id, path: item.path, type: item.type, name: item.name, delay: item.delay || 0 })) });
      showToast(`场景「${scene.name}」已启动`, 'success');
    } catch (e) { console.error('启动失败:', e); showToast('启动失败', 'error'); }
  };

  const handleExport = async () => {
    if (scenes.length === 0) { showToast('没有可导出的场景数据', 'warning'); return; }
    try {
      const filePath = await save({ title: '导出场景', defaultPath: 'risedock-scenes.json', filters: [{ name: 'JSON', extensions: ['json'] }] });
      if (filePath) { await useSceneStore.getState().exportToFile(filePath); showToast('导出成功', 'success'); }
    } catch (err) { console.error('导出失败:', err); showToast('导出失败: ' + (err as Error).message, 'error'); }
  };

  const doImport = async () => {
    try {
      const filePath = await open({ title: '导入场景', filters: [{ name: 'JSON', extensions: ['json'] }], multiple: false });
      if (filePath) {
        const result = await useSceneStore.getState().importFromFile(filePath as string);
        let message = '导入完成';
        if (result.imported > 0) message += `，成功导入 ${result.imported} 个场景`;
        if (result.skipped > 0) message += `，跳过 ${result.skipped} 个重复场景`;
        if (result.errors.length > 0) message += `，${result.errors.join(', ')}`;
        showToast(message, result.imported > 0 ? 'success' : 'warning');
      }
    } catch (err) { console.error('导入失败:', err); showToast('导入失败: ' + (err as Error).message, 'error'); }
    setImportConfirm(false);
  };

  const handleImport = () => {
    if (scenes.length > 0) {
      setImportConfirm(true);
    } else {
      doImport();
    }
  };

  const canCreate = () => {
    if (!isLicensed() && scenes.length >= LICENSE_LIMITS.UNLICENSED_MAX_SCENES) {
      showToast(`未授权版本最多创建 ${LICENSE_LIMITS.UNLICENSED_MAX_SCENES} 个场景，请先购买授权解锁全部功能`, 'warning');
      return false;
    }
    return true;
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)' }}>
      {/* 顶部菜单栏 */}
      <TopMenuBar
        onOpenSettings={onOpenSettings}
        onOpenHelp={onOpenHelp}
        onOpenUpdate={onOpenUpdate}
        onOpenAbout={onOpenAbout}
        onImport={handleImport}
        onExport={handleExport}
        onViewModeChange={handleViewModeChange}
        viewMode={viewMode}
        onOpenSearch={onOpenSearch}
        onNewScene={() => { if (canCreate()) setShowCreate(true); }}
      />

      {/* 创建场景表单 */}
      {showCreate && (
        <div style={{ padding: '20px 32px', flexShrink: 0 }}>
          <div style={{
            display: 'flex', gap: '12px', background: 'rgba(255, 255, 255, 0.05)',
            padding: '8px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <input
              type="text" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="输入场景名称..."
              autoFocus
              style={{
                flex: 1, padding: '14px 20px', background: 'transparent', border: 'none',
                borderRadius: '10px', fontSize: '15px', color: '#fff', outline: 'none',
              }}
            />
            <button
              onClick={handleCreate} disabled={!newName.trim()}
              style={{
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white', border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: 600,
                cursor: newName.trim() ? 'pointer' : 'default',
                opacity: newName.trim() ? 1 : 0.5,
              }}
            >
              创建
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewName(''); }}
              style={{
                padding: '14px 18px', background: 'rgba(255, 255, 255, 0.1)',
                color: '#a0aec0', border: 'none', borderRadius: '10px',
                fontSize: '14px', cursor: 'pointer',
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 场景列表区域 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 32px 32px' }}>
        {scenes.length === 0 && !showCreate ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', height: '100%',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '100px', height: '100px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '24px', marginBottom: '24px',
              boxShadow: '0 20px 60px rgba(102, 126, 234, 0.4)', fontSize: '48px',
            }}>
              🚀
            </div>
            <h1 style={{
              fontSize: '36px', fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: '12px', letterSpacing: '4px',
            }}>
              启程典
            </h1>
            <p style={{ color: '#4a5568', marginTop: '8px', fontSize: '14px', marginBottom: '32px' }}>
              开始构建您的工作环境
            </p>
            <button
              onClick={() => { if (canCreate()) setShowCreate(true); }}
              style={{
                padding: '16px 44px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white', border: 'none', borderRadius: '16px',
                fontSize: '16px', fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 10px 40px rgba(102, 126, 234, 0.4)', letterSpacing: '1px',
              }}
            >
              创建第一个场景
            </button>
          </div>
        ) : (
          <div style={viewMode === 'grid' ? {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
            alignContent: 'start',
          } : {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            {scenes.map((scene, index) => (
              <div
                key={scene.id}
                data-scene-row={scene.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, scene });
                }}
              >
                <SceneCard
                  scene={scene}
                  index={index}
                  viewMode={viewMode}
                  editingSceneId={editingSceneId}
                  editingName={editingName}
                  editInputRef={editInputRef}
                  onLaunch={() => handleLaunchAll(scene.id)}
                  onEdit={() => handleStartEdit(scene)}
                  onDelete={() => setDeleteConfirm({ open: true, sceneId: scene.id, sceneName: scene.name })}
                  onSetHotkey={() => onSetHotkey?.(scene)}
                  onSelect={() => selectScene(scene.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 编辑名称弹框 */}
      {editingSceneId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.5)',
        }} onClick={() => { setEditingSceneId(null); setEditingName(''); }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: '#1a1a2e', borderRadius: '16px', padding: '28px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            minWidth: '320px',
          }}>
            <div style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>编辑场景名称</div>
            <input
              ref={editInputRef}
              type="text" value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') { setEditingSceneId(null); setEditingName(''); }
              }}
              autoFocus
              style={{
                padding: '12px 16px', background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(102, 126, 234, 0.4)', borderRadius: '10px',
                color: '#fff', fontSize: '15px', outline: 'none', width: '100%',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                onClick={() => { setEditingSceneId(null); setEditingName(''); }}
                style={{
                  padding: '10px 20px', background: 'rgba(255, 255, 255, 0.08)',
                  color: '#a0aec0', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px',
                  fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editingName.trim()}
                style={{
                  padding: '10px 24px',
                  background: editingName.trim() ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(102, 126, 234, 0.3)',
                  color: '#fff', border: 'none', borderRadius: '10px',
                  fontSize: '14px', fontWeight: 600,
                  cursor: editingName.trim() ? 'pointer' : 'default',
                  opacity: editingName.trim() ? 1 : 0.5,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { if (editingName.trim()) e.currentTarget.style.transform = 'scale(1.03)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                保存
              </button>
            </div>
            <div style={{ color: '#4a5568', fontSize: '11px', textAlign: 'center', marginTop: '10px' }}>
              按 Enter 保存 · 按 Esc 取消
            </div>
          </div>
        </div>
      )}

      {/* 删除确认 */}
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

      {/* 导入确认 */}
      <ConfirmDialog
        open={importConfirm}
        title="导入场景"
        message={`当前已有 ${scenes.length} 个场景，导入将覆盖现有数据。确定要继续吗？`}
        confirmText="继续导入"
        cancelText="取消"
        type="warning"
        onConfirm={doImport}
        onCancel={() => setImportConfirm(false)}
      />

      {/* 右键菜单 */}
      {contextMenu && (() => {
        const MENU_H = 160; const MENU_W = 160;
        const fx = Math.max(10, Math.min(contextMenu.x, window.innerWidth - MENU_W - 10));
        const fy = Math.max(10, Math.min(contextMenu.y, window.innerHeight - MENU_H - 10));
        return (
          <div
            data-dashboard-menu="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed', left: fx, top: fy,
              background: 'linear-gradient(145deg, #1e293b, #0f172a)',
              border: '1px solid rgba(102, 126, 234, 0.25)', borderRadius: '10px',
              padding: '4px', zIndex: 9999, minWidth: '160px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <div onClick={() => { handleStartEdit(contextMenu.scene); setContextMenu(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '6px', cursor: 'pointer', color: '#e2e8f0' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{ fontSize: '16px' }}>✏️</span>
              <span style={{ fontSize: '13px' }}>编辑名称</span>
            </div>
            <div onClick={() => { onSetHotkey?.(contextMenu.scene); setContextMenu(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '6px', cursor: 'pointer', color: '#e2e8f0' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{ fontSize: '16px' }}>⌨️</span>
              <span style={{ fontSize: '13px' }}>{contextMenu.scene.hotkey ? '修改快捷键' : '设置快捷键'}</span>
            </div>
            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 12px' }} />
            <div onClick={() => { setDeleteConfirm({ open: true, sceneId: contextMenu.scene.id, sceneName: contextMenu.scene.name }); setContextMenu(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '6px', cursor: 'pointer', color: '#ef4444' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{ fontSize: '16px' }}>🗑️</span>
              <span style={{ fontSize: '13px' }}>删除场景</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
