import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LaunchItem } from '../types';
import { useSceneStore } from '../stores';
import { invoke } from '@tauri-apps/api/core';
import ContextMenu from './ContextMenu';

interface SortableItemProps {
  item: LaunchItem;
  sceneId: string;
  onEdit: (item: LaunchItem) => void;
  highlightedId?: string | null;
}

// 类型图标配置
const typeConfig: Record<string, { icon: string; color: string }> = {
  app: { icon: '🖥️', color: '#60a5fa' },
  file: { icon: '📄', color: '#34d399' },
  folder: { icon: '📁', color: '#fbbf24' },
  url: { icon: '🔗', color: '#a78bfa' },
  image: { icon: '🖼️', color: '#f472b6' },
};

export function DragOverlayItem({ item }: { item: LaunchItem }) {
  const config = typeConfig[item.type] || typeConfig.file;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '12px 16px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '10px',
      boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
    }}>
      <span style={{ fontSize: '20px' }}>{config.icon}</span>
      <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{item.name}</span>
    </div>
  );
}

export default function SortableItem({ item, sceneId, onEdit, highlightedId }: SortableItemProps) {
  const { deleteLaunchItem, toggleItem, togglePin } = useSceneStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging, isOver
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const config = typeConfig[item.type] || typeConfig.file;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleItem(sceneId, item.id);
  };

  const handleDelete = () => deleteLaunchItem(sceneId, item.id);

  const handleLaunch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item.enabled) return;
    try {
      await invoke('launch_item', { itemPath: item.path, itemType: item.type, itemName: item.name });
    } catch (e) { console.error('Launch failed:', e); }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(item.path);
    setContextMenu(null);
  };

  const handleContextLaunch = () => {
    if (!item.enabled) return;
    invoke('launch_item', { itemPath: item.path, itemType: item.type, itemName: item.name }).catch(console.error);
    setContextMenu(null);
  };

  return (
    <div
      ref={setNodeRef}
      onContextMenu={handleContextMenu}
      style={{
        ...style,
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px',
        background: isOver ? 'rgba(102, 126, 234, 0.2)' : isDragging ? 'rgba(102, 126, 234, 0.1)' : highlightedId === item.id ? 'rgba(102, 126, 234, 0.2)' : 'rgba(22, 33, 62, 0.6)',
        borderRadius: '10px',
        border: isOver ? '1px dashed #667eea' : highlightedId === item.id ? '1px solid #667eea' : '1px solid rgba(255,255,255,0.06)',
        opacity: isDragging ? 0.5 : 1,
        boxShadow: highlightedId === item.id ? '0 0 16px rgba(102, 126, 234, 0.4)' : 'none',
        transition: 'all 0.3s',
      }}
    >
      {/* 拖拽手柄 */}
      <div
        {...attributes} {...listeners}
        style={{ cursor: 'grab', color: '#4a5568', padding: '4px 8px', userSelect: 'none', fontSize: '12px' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#667eea')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#4a5568')}
      >
        ⋮⋮
      </div>

      {/* 开关 */}
      <button
        onClick={handleToggle}
        style={{
          width: '36px', height: '20px',
          background: item.enabled ? '#667eea' : 'rgba(255,255,255,0.1)',
          borderRadius: '10px', border: 'none', cursor: 'pointer', position: 'relative',
        }}
      >
        <div style={{
          width: '16px', height: '16px', background: '#fff', borderRadius: '50%',
          position: 'absolute', top: '2px', left: item.enabled ? '18px' : '2px',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>

      {/* 图标 */}
      <span style={{ fontSize: '20px', filter: item.enabled ? 'none' : 'grayscale(0.5)' }}>{config.icon}</span>

      {/* 信息 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '13px', fontWeight: 500, color: item.enabled ? '#e2e8f0' : '#64748b',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{item.name}</div>
        <div style={{ fontSize: '11px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.path}
        </div>
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={handleLaunch}
          disabled={!item.enabled}
          style={{
            padding: '6px 12px',
            background: item.enabled ? '#10b981' : 'rgba(255,255,255,0.05)',
            border: 'none', borderRadius: '6px', cursor: item.enabled ? 'pointer' : 'not-allowed',
            color: item.enabled ? '#fff' : '#475569', fontSize: '12px', fontWeight: 500,
          }}
        >
          启动
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(item); }}
          style={{
            padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#64748b', fontSize: '14px', borderRadius: '4px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="编辑"
        >
          ✏️
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
          style={{
            padding: '6px', background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#64748b', fontSize: '14px', borderRadius: '4px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="删除"
        >
          🗑️
        </button>
      </div>

      {/* 删除确认 */}
      {showConfirm && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1a1a2e', padding: '20px 24px', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.08)', width: '260px', textAlign: 'center',
            }}
          >
            <p style={{ color: '#e2e8f0', fontSize: '13px', margin: '0 0 16px' }}>
              删除「{item.name}」？
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#94a3b8', fontSize: '12px' }}
              >
                取消
              </button>
              <button
                onClick={() => { handleDelete(); setShowConfirm(false); }}
                style={{ padding: '8px 16px', background: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#fff', fontSize: '12px', fontWeight: 500 }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x} y={contextMenu.y} item={item} sceneId={sceneId} enabled={item.enabled}
          onClose={() => setContextMenu(null)} onLaunch={handleContextLaunch}
          onEdit={() => { onEdit(item); setContextMenu(null); }}
          onToggle={() => { toggleItem(sceneId, item.id); setContextMenu(null); }}
          onDelete={() => { deleteLaunchItem(sceneId, item.id); setContextMenu(null); }}
          onCopyPath={handleCopyPath}
          onTogglePin={() => { togglePin(sceneId, item.id); setContextMenu(null); }}
        />
      )}
    </div>
  );
}
