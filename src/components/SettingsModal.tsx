import { useState, useEffect } from 'react';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import { showToast } from './Toast';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [autostart, setAutostart] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    isEnabled().then(setAutostart).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggleAutostart = async () => {
    try {
      if (autostart) {
        await disable();
        setAutostart(false);
        showToast('已关闭开机自启', 'success');
      } else {
        await enable();
        setAutostart(true);
        showToast('已开启开机自启', 'success');
      }
    } catch (err) {
      console.error('设置开机自启失败:', err);
      showToast('设置失败: ' + (err as Error).message, 'error');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '420px',
          margin: '16px',
          border: '1px solid rgba(102, 126, 234, 0.3)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(102, 126, 234, 0.15)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚙️</span>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>设置</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              color: '#fff',
              fontSize: '16px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
          >
            ✕
          </button>
        </div>

        {/* 内容区 */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 开机自启 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'rgba(22, 33, 62, 0.6)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                🚀 开机自动启动
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                系统启动时自动运行启程典
              </div>
            </div>
            {loading ? (
              <div style={{ width: '44px', height: '24px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)' }} />
            ) : (
              <button
                onClick={toggleAutostart}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.3s',
                  background: autostart
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'rgba(255, 255, 255, 0.15)',
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '2px',
                  left: autostart ? '22px' : '2px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'all 0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }} />
              </button>
            )}
          </div>
        </div>

        {/* 底部 */}
        <div
          style={{
            padding: '14px 24px',
            background: 'rgba(15, 15, 26, 0.4)',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 40px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
