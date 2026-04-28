import { useState, useEffect, useCallback } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface UpdateInfo {
  version: string;
  date?: string;
  body?: string;
}

interface UpdateModalProps {
  onClose: () => void;
}

export default function UpdateModal({ onClose }: UpdateModalProps) {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [noUpdate, setNoUpdate] = useState(false);

  const checkForUpdate = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      const update = await check();
      if (update) {
        setUpdateInfo({
          version: update.version,
          date: update.date,
          body: update.body,
        });
      } else {
        setNoUpdate(true);
      }
    } catch (e) {
      console.error('检查更新失败:', e);
      setError(String(e));
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  const handleDownloadAndInstall = async () => {
    if (!updateInfo) return;
    setDownloading(true);
    setError(null);
    try {
      const update = await check();
      if (!update) {
        setError('更新信息已过期，请重新检查');
        setDownloading(false);
        return;
      }
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            setProgress(0);
            break;
          case 'Progress':
            if (event.data.contentLength) {
              setProgress(Math.round((event.data.chunkLength / event.data.contentLength) * 100));
            }
            break;
          case 'Finished':
            setProgress(100);
            break;
        }
      });
      await relaunch();
    } catch (e) {
      console.error('下载更新失败:', e);
      setError(String(e));
      setDownloading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 99999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1a1a2e',
          borderRadius: '16px',
          padding: '28px 32px',
          width: '420px',
          maxWidth: '90vw',
          boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.08)',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '12px', right: '12px',
            width: '28px', height: '28px',
            background: 'transparent', border: 'none',
            cursor: 'pointer', color: '#666', fontSize: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '6px',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          ✕
        </button>

        {/* 图标 */}
        <div style={{ fontSize: '36px', marginBottom: '16px' }}>🚀</div>

        {/* 检查中 */}
        {checking && (
          <>
            <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, margin: '0 0 12px' }}>
              正在检查更新...
            </h3>
            <div style={{
              width: '100%', height: '4px',
              background: 'rgba(255,255,255,0.06)', borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: '40%', height: '100%',
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                borderRadius: '2px',
                animation: 'pulse 1.5s infinite',
              }} />
            </div>
          </>
        )}

        {/* 无更新 */}
        {noUpdate && (
          <>
            <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>
              已是最新版本
            </h3>
            <p style={{ color: '#8b949e', fontSize: '13px', margin: '0 0 20px' }}>
              当前版本已是最新的，无需更新
            </p>
            <button
              onClick={onClose}
              style={{
                padding: '10px 28px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)',
                color: '#c9d1d9', fontSize: '13px',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >
              确定
            </button>
          </>
        )}

        {/* 有更新 */}
        {updateInfo && !downloading && (
          <>
            <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>
              发现新版本 v{updateInfo.version}
            </h3>
            <p style={{ color: '#8b949e', fontSize: '13px', margin: '0 0 16px' }}>
              {updateInfo.body || '优化体验，修复已知问题'}
            </p>
            {updateInfo.date && (
              <p style={{ color: '#6b7280', fontSize: '12px', margin: '0 0 20px' }}>
                发布日期：{updateInfo.date}
              </p>
            )}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#c9d1d9', fontSize: '13px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              >
                稍后再说
              </button>
              <button
                onClick={handleDownloadAndInstall}
                style={{
                  flex: 1, padding: '10px 16px',
                  borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#fff', fontSize: '13px', fontWeight: 500,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                立即更新
              </button>
            </div>
          </>
        )}

        {/* 下载中 */}
        {downloading && (
          <>
            <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, margin: '0 0 12px' }}>
              正在下载更新...
            </h3>
            <div style={{
              width: '100%', height: '6px',
              background: 'rgba(255,255,255,0.06)', borderRadius: '3px',
              overflow: 'hidden', marginBottom: '8px',
            }}>
              <div style={{
                width: `${progress}%`, height: '100%',
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <p style={{ color: '#8b949e', fontSize: '12px', margin: '0' }}>
              {progress}% - 下载完成后将自动安装并重启
            </p>
          </>
        )}

        {/* 错误 */}
        {error && !checking && !downloading && (
          <>
            <h3 style={{ color: '#f87171', fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>
              检查更新失败
            </h3>
            <p style={{ color: '#8b949e', fontSize: '12px', margin: '0 0 20px', wordBreak: 'break-all' }}>
              {error}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#c9d1d9', fontSize: '13px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              >
                关闭
              </button>
              <button
                onClick={checkForUpdate}
                style={{
                  flex: 1, padding: '10px 16px',
                  borderRadius: '8px', border: 'none',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#c9d1d9', fontSize: '13px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                重试
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
