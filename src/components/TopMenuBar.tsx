import { useState, useRef, useEffect } from 'react';
import { exit } from '@tauri-apps/plugin-process';

interface MenuItem {
  label: string;
  onClick?: () => void;
  divider?: boolean;
}

interface MenuProps {
  label: string;
  items: MenuItem[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

function Menu({ label, items, isOpen, onOpen, onClose }: MenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => isOpen ? onClose() : onOpen()}
        onMouseEnter={() => onOpen()}
        style={{
          padding: '6px 14px',
          background: isOpen ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          color: '#a0aec0',
          fontSize: '13px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.15s',
        }}
        onMouseOver={(e) => {
          if (!isOpen) e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
        }}
        onMouseOut={(e) => {
          if (!isOpen) e.currentTarget.style.background = 'transparent';
        }}
      >
        {label}
        <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
      </button>
      
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            background: 'linear-gradient(145deg, #1e293b, #0f172a)',
            border: '1px solid rgba(102, 126, 234, 0.25)',
            borderRadius: '10px',
            padding: '4px',
            minWidth: '160px',
            zIndex: 10000,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
          onMouseLeave={() => onClose()}
        >
          {items.map((item, index) => (
            item.divider ? (
              <div
                key={index}
                style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 12px' }}
              />
            ) : (
              <div
                key={index}
                onClick={() => {
                  item.onClick?.();
                  onClose();
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#e2e8f0',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {item.label}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

interface TopMenuBarProps {
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenUpdate: () => void;
  onOpenAbout: () => void;
  onImport: () => void;
  onExport: () => void;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  viewMode: 'grid' | 'list';
  onOpenSearch: () => void;
  onNewScene: () => void;
}

export default function TopMenuBar({
  onOpenSettings,
  onOpenHelp,
  onOpenUpdate,
  onOpenAbout,
  onImport,
  onExport,
  onViewModeChange,
  viewMode,
  onOpenSearch,
  onNewScene,
}: TopMenuBarProps) {
  // 管理菜单打开状态
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const handleOpen = (menu: string) => setOpenMenu(menu);
  const handleClose = () => setOpenMenu(null);

  const handleExit = async () => {
    try {
      await exit(0);
    } catch {
      // fallback: 尝试 window.close
      window.close();
    }
  };

  const fileMenu = {
    label: '文件',
    items: [
      { label: '导入场景', onClick: onImport },
      { label: '导出场景', onClick: onExport },
      { divider: true, label: '' },
      { label: '退出', onClick: handleExit },
    ],
  };

  const viewMenu = {
    label: '视图',
    items: [
      { 
        label: viewMode === 'grid' ? '✓ 网格视图' : '网格视图', 
        onClick: () => onViewModeChange('grid') 
      },
      { 
        label: viewMode === 'list' ? '✓ 列表视图' : '列表视图', 
        onClick: () => onViewModeChange('list') 
      },
    ],
  };

  const helpMenu = {
    label: '帮助',
    items: [
      { label: '使用帮助', onClick: onOpenHelp },
      { label: '检查更新', onClick: onOpenUpdate },
      { divider: true, label: '' },
      { label: '关于启程典', onClick: onOpenAbout },
    ],
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        flexShrink: 0,
        background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)',
      }}
    >
      {/* 左侧：菜单 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Menu {...fileMenu} isOpen={openMenu === '文件'} onOpen={() => handleOpen('文件')} onClose={handleClose} />
        <Menu {...viewMenu} isOpen={openMenu === '视图'} onOpen={() => handleOpen('视图')} onClose={handleClose} />
        <Menu {...helpMenu} isOpen={openMenu === '帮助'} onOpen={() => handleOpen('帮助')} onClose={handleClose} />
      </div>

      {/* 右侧：搜索 + 新建 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* 搜索 */}
        <button
          onClick={onOpenSearch}
          style={{
            height: '32px',
            padding: '0 14px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            cursor: 'pointer',
            color: '#6b7280',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = '#a0aec0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.color = '#6b7280';
          }}
          title="搜索 (Ctrl+K)"
        >
          🔍 <span style={{ opacity: 0.6 }}>Ctrl+K</span>
        </button>

        {/* 设置 */}
        <button
          onClick={onOpenSettings}
          style={{
            height: '32px',
            padding: '0 12px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            cursor: 'pointer',
            color: '#6b7280',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.color = '#a0aec0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#6b7280';
          }}
          title="设置"
        >
          ⚙️
        </button>

        {/* 新建场景 */}
        <button
          onClick={onNewScene}
          style={{
            padding: '8px 18px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
          }}
        >
          + 新建场景
        </button>
      </div>
    </div>
  );
}
