import { useState, useEffect, useCallback } from 'react';

// Toast类型
interface Toast {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
}

// Toast上下文
let toastCallback: ((message: string, type?: Toast['type']) => void) | null = null;

export function showToast(message: string, type: Toast['type'] = 'info') {
  if (toastCallback) {
    toastCallback(message, type);
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastCallback = (message: string, type: Toast['type'] = 'info') => {
      const id = Date.now().toString();
      setToasts(prev => [...prev, { id, message, type }]);
      
      // 3秒后自动移除
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3000);
    };

    return () => {
      toastCallback = null;
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  const getToastStyle = (type: Toast['type']) => {
    const baseStyle = {
      padding: '14px 20px',
      borderRadius: '12px',
      color: '#fff',
      fontSize: '14px',
      fontWeight: 500,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      minWidth: '280px',
      maxWidth: '400px',
    };

    switch (type) {
      case 'warning':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        };
      case 'success':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        };
      case 'error':
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        };
      default:
        return {
          ...baseStyle,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        };
    }
  };

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '💡';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      alignItems: 'center',
    }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={getToastStyle(toast.type)}
          onClick={() => removeToast(toast.id)}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.opacity = '0.95';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.opacity = '1';
          }}
        >
          <span style={{ fontSize: '18px' }}>{getIcon(toast.type)}</span>
          <span style={{ flex: 1 }}>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
