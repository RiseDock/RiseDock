import { useEffect, useRef } from 'react';
import { LaunchItem } from '../types';

interface ContextMenuProps {
  x: number;
  y: number;
  item: LaunchItem;
  sceneId: string;
  enabled: boolean;
  onClose: () => void;
  onLaunch: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onCopyPath: () => void;
  onTogglePin: () => void;
}

export default function ContextMenu({
  x,
  y,
  item,
  enabled,
  onClose,
  onLaunch,
  onEdit,
  onToggle,
  onDelete,
  onCopyPath,
  onTogglePin,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // mousemove 监听：鼠标不在菜单内或不在同一个启动项行上时关闭
    const handleMouseMove = (e: MouseEvent) => {
      if (!menuRef.current) return;
      
      const menuRect = menuRef.current.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      // 检查鼠标是否在菜单矩形内
      if (mouseX >= menuRect.left && mouseX <= menuRect.right && mouseY >= menuRect.top && mouseY <= menuRect.bottom) {
        return; // 鼠标在菜单内，保持打开
      }
      
      // 检查鼠标是否在同一个启动项行上
      const currentItem = document.querySelector(`[data-launch-item="${item.id}"]`);
      if (currentItem) {
        const itemRect = currentItem.getBoundingClientRect();
        if (mouseX >= itemRect.left && mouseX <= itemRect.right && mouseY >= itemRect.top && mouseY <= itemRect.bottom) {
          return; // 鼠标在当前启动项行内，保持打开
        }
      }
      
      // 鼠标在其他区域，关闭菜单
      onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, item.id]);

  // 调整菜单位置，确保不超出屏幕
  // 菜单有 6 项 + 2 分隔线，高度约 320px
  const MENU_HEIGHT = 320;
  const adjustedX = Math.min(x, window.innerWidth - 180);
  const adjustedY = Math.min(y, window.innerHeight - MENU_HEIGHT);
  // 确保不超出左边界
  const finalX = Math.max(10, adjustedX);
  const finalY = Math.max(10, adjustedY);

  return (
    <div
      ref={menuRef}
      data-launch-context-menu="true"
      style={{
        position: 'fixed',
        left: finalX,
        top: finalY,
        background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(102, 126, 234, 0.2)',
        padding: '8px 0',
        minWidth: '160px',
        zIndex: 9999999,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        onClick={onLaunch}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 16px',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#e2e8f0',
          borderRadius: '8px',
          margin: '0 6px',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span style={{ fontSize: '16px' }}>▶️</span>
        <span>启动</span>
      </div>

      <div
        onClick={onEdit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 16px',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#e2e8f0',
          borderRadius: '8px',
          margin: '0 6px',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span style={{ fontSize: '16px' }}>✏️</span>
        <span>编辑</span>
      </div>

      <div
        onClick={onCopyPath}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 16px',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#e2e8f0',
          borderRadius: '8px',
          margin: '0 6px',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span style={{ fontSize: '16px' }}>📋</span>
        <span>复制路径</span>
      </div>

      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 16px',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#e2e8f0',
          borderRadius: '8px',
          margin: '0 6px',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span style={{ fontSize: '16px' }}>{enabled ? '⏸️' : '▶️'}</span>
        <span>{enabled ? '禁用' : '启用'}</span>
      </div>

      <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 12px' }} />

      <div
        onClick={onTogglePin}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 16px',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#e2e8f0',
          borderRadius: '8px',
          margin: '0 6px',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span style={{ fontSize: '16px' }}>{item.pinned ? '📍' : '📌'}</span>
        <span>{item.pinned ? '取消置顶' : '置顶'}</span>
      </div>

      <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 12px' }} />

      <div
        onClick={onDelete}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 16px',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#ef4444',
          borderRadius: '8px',
          margin: '0 6px',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span style={{ fontSize: '16px' }}>🗑️</span>
        <span>删除</span>
      </div>
    </div>
  );
}
