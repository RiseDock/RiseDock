import { useState } from 'react';
import { LaunchItem } from '../types';
import { useSceneStore } from '../stores';
import { invoke } from '@tauri-apps/api/core';
import ContextMenu from './ContextMenu';
import ConfirmDialog from './ConfirmDialog';

interface LaunchItemRowProps {
  item: LaunchItem;
  sceneId: string;
  isDragging?: boolean;
  isDragOver?: boolean;
  onEdit?: (item: LaunchItem) => void;
}

export default function LaunchItemRow({
  item,
  sceneId,
  isDragging = false,
  isDragOver = false,
  onEdit,
}: LaunchItemRowProps) {
  const { toggleItem, deleteItem, togglePin, scenes } = useSceneStore();
  
  const currentItem = scenes.find(s => s.id === sceneId)?.items.find(i => i.id === item.id);
  const enabled = currentItem?.enabled ?? item.enabled;
  
  const [error, setError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleRun = async () => {
    if (!enabled) return;
    
    setError(null);
    
    try {
      await invoke('launch_item', { 
        itemPath: item.path, 
        itemType: item.type, 
        itemName: item.name 
      });
    } catch (err) {
      setError(String(err));
    }
  };

  const handleToggle = () => {
    toggleItem(sceneId, item.id);
  };

  const handleDelete = () => {
    setError(null);
    setDeleteConfirm(true);
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(item);
    }
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

  const handleToggleContext = () => {
    toggleItem(sceneId, item.id);
    setContextMenu(null);
  };

  const handleTogglePin = () => {
    togglePin(sceneId, item.id);
    setContextMenu(null);
  };

  return (
    <>
      <div
        data-launch-item={item.id}
        onContextMenu={handleContextMenu}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          padding: '12px',
          backgroundColor: 'white',
          borderRadius: '8px',
          opacity: isDragging ? 0.5 : enabled ? 1 : 0.6,
          border: isDragOver ? '2px dashed #3b82f6' : '2px solid transparent',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            style={{
              cursor: 'grab',
              color: '#d1d5db',
              fontSize: '18px',
              padding: '0 4px',
            }}
            title="拖拽排序"
          >
            ⋮⋮
          </div>

          <span style={{ fontSize: '24px' }}>{item.type === 'app' ? '💻' : item.type === 'file' ? '📁' : item.type === 'url' ? '🌐' : item.type === 'image' ? '🖼️' : '📦'}</span>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, color: '#1f2937' }}>
              {item.name || item.path.split(/[/\\]/).pop()}
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: '#9ca3af', 
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'monospace'
            }}>
              {item.path}
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={!enabled}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              cursor: enabled ? 'pointer' : 'not-allowed',
              backgroundColor: enabled ? '#3b82f6' : '#e5e7eb',
              color: 'white',
              minWidth: '90px',
              transition: 'background-color 0.2s',
            }}
          >
            启动
          </button>

          <button
            onClick={handleEdit}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '16px',
              opacity: 0.6,
            }}
            title="编辑"
          >
            ✏️
          </button>

          <button
            onClick={handleToggle}
            style={{
              width: '48px',
              height: '24px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              backgroundColor: enabled ? '#3b82f6' : '#d1d5db',
            }}
            title={enabled ? '点击禁用' : '点击启用'}
          >
            <div 
              style={{
                position: 'absolute',
                top: '2px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                left: enabled ? '26px' : '2px',
                transition: 'left 0.2s',
              }}
            />
          </button>

          <button
            onClick={handleDelete}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '16px',
            }}
            title="删除"
          >
            ✕
          </button>
        </div>
        
        {error && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#fef2f2',
            borderRadius: '4px',
            color: '#dc2626',
            fontSize: '12px',
            wordBreak: 'break-all'
          }}>
            ❌ {error}
          </div>
        )}
      </div>
      
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={item}
          sceneId={sceneId}
          enabled={enabled}
          onClose={() => setContextMenu(null)}
          onLaunch={handleRun}
          onEdit={handleEdit}
          onToggle={handleToggleContext}
          onDelete={handleDelete}
          onCopyPath={handleCopyPath}
          onTogglePin={handleTogglePin}
        />
      )}

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={deleteConfirm}
        title="确认删除"
        message={`确定要删除启动项「${item.name || item.path.split(/[/\\]/).pop()}」吗？`}
        confirmText="删除"
        cancelText="取消"
        type="danger"
        onConfirm={() => {
          deleteItem(sceneId, item.id);
          setDeleteConfirm(false);
        }}
        onCancel={() => setDeleteConfirm(false)}
      />
    </>
  );
}
