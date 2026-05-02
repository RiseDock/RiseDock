import { getVersion } from '@tauri-apps/api/app';
import { useState, useEffect } from 'react';

interface AboutModalProps {
  onClose: () => void;
}

export default function AboutModal({ onClose }: AboutModalProps) {
  const [version, setVersion] = useState('1.0.0');

  useEffect(() => {
    getVersion().then(v => setVersion(v)).catch(() => {});
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          background: 'linear-gradient(145deg, #1e293b, #0f172a)',
          borderRadius: '16px',
          padding: '32px 40px',
          border: '1px solid rgba(102, 126, 234, 0.25)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          textAlign: 'center',
          minWidth: '320px',
        }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '28px',
            height: '28px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#666',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#666';
          }}
        >
          ✕
        </button>

        {/* Logo */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '72px',
          height: '72px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '18px',
          marginBottom: '20px',
          boxShadow: '0 10px 40px rgba(102, 126, 234, 0.4)',
          fontSize: '36px',
        }}>
          🚀
        </div>

        {/* 产品名称 */}
        <h2 style={{
          color: '#fff',
          fontSize: '24px',
          fontWeight: 700,
          margin: '0 0 8px',
          letterSpacing: '2px',
        }}>
          启程典
        </h2>

        {/* 英文名 */}
        <p style={{
          color: '#667eea',
          fontSize: '14px',
          margin: '0 0 16px',
          fontWeight: 500,
        }}>
          RiseDock
        </p>

        {/* 版本号 */}
        <div style={{
          display: 'inline-block',
          padding: '6px 16px',
          background: 'rgba(102, 126, 234, 0.15)',
          borderRadius: '20px',
          border: '1px solid rgba(102, 126, 234, 0.3)',
          marginBottom: '20px',
        }}>
          <span style={{ color: '#667eea', fontSize: '13px', fontWeight: 600 }}>
            版本 {version}
          </span>
        </div>

        {/* 描述 */}
        <p style={{
          color: '#8b949e',
          fontSize: '13px',
          margin: '0 0 8px',
          lineHeight: '1.6',
        }}>
          Scene-based workspace launcher
        </p>

        <p style={{
          color: '#6b7280',
          fontSize: '12px',
          margin: '16px 0 0',
        }}>
          Copyright © 2026
        </p>
      </div>
    </div>
  );
}
