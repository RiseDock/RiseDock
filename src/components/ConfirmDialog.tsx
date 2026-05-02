import { useState, useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  type = 'danger'
}: ConfirmDialogProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
    }
  }, [open]);

  if (!open && !visible) return null;

  const handleClose = () => {
    setVisible(false);
    onCancel();
  };

  const handleConfirm = () => {
    setVisible(false);
    onConfirm();
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: '⚠️',
          iconBg: 'rgba(239, 68, 68, 0.15)',
          iconColor: '#ef4444',
          buttonBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        };
      case 'warning':
        return {
          icon: '💡',
          iconBg: 'rgba(245, 158, 11, 0.15)',
          iconColor: '#fbbf24',
          buttonBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        };
      default:
        return {
          icon: '💬',
          iconBg: 'rgba(102, 126, 234, 0.15)',
          iconColor: '#667eea',
          buttonBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999999,
        opacity: open ? 1 : 0,
        transition: 'opacity 0.2s',
        pointerEvents: open ? 'auto' : 'none',
      }}
      onClick={handleClose}
    >
      <div 
        style={{
          background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '16px',
          padding: '28px',
          width: '100%',
          maxWidth: '400px',
          margin: '16px',
          border: '1px solid rgba(102, 126, 234, 0.3)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
          transform: open ? 'scale(1)' : 'scale(0.9)',
          transition: 'transform 0.2s',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 图标和标题 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: styles.iconBg,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
          }}>
            {styles.icon}
          </div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#fff',
            margin: 0,
          }}>
            {title}
          </h3>
        </div>

        {/* 消息 */}
        <p style={{
          color: '#9ca3af',
          fontSize: '14px',
          lineHeight: '1.6',
          marginBottom: '24px',
          paddingLeft: '64px',
        }}>
          {message}
        </p>

        {/* 按钮 */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleClose}
            style={{
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              color: '#a0aec0',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = '#a0aec0';
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '10px 24px',
              background: styles.buttonBg,
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
