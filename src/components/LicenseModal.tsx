import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useLicenseStore } from '../stores';

interface LicenseStatus {
  is_activated: boolean;
  license_type: string | null;
  expires_at: number | null;
  machine_code: string;
  is_professional: boolean;
}

interface LicenseModalProps {
  onClose: () => void;
}

export default function LicenseModal({ onClose }: LicenseModalProps) {
  const { setStatus } = useLicenseStore();
  const [machineCode, setMachineCode] = useState<string>('加载中...');
  const [machineCodeError, setMachineCodeError] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [status, setLocalStatus] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  const loadMachineCode = async () => {
    setMachineCode('加载中...');
    setMachineCodeError(false);
    try {
      const code = await invoke<string>('generate_machine_code_cmd');
      setMachineCode(code);
    } catch (e) {
      console.error('Failed to generate machine code:', e);
      setMachineCode('获取失败，点击重试');
      setMachineCodeError(true);
    }
  };

  const loadStatus = async () => {
    try {
      const s = await invoke<LicenseStatus>('get_license_status');
      setLocalStatus(s);
      setStatus(s);
    } catch (e) {
      console.error('Failed to load license status:', e);
    }
  };

  useEffect(() => {
    loadStatus();
    loadMachineCode();
  }, []);

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError('请输入授权码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await invoke('activate_license', { licenseKey: licenseKey.trim() });
      // 重新获取最新授权状态并同步到 store
      const newStatus = await invoke<LicenseStatus>('get_license_status');
      setStatus(newStatus);
      setLicenseKey('');
      if (isUpgrading) {
        setUpgradeSuccess(true);
        setTimeout(() => {
          setUpgradeSuccess(false);
          setIsUpgrading(false);
        }, 2000);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (machineCode && !machineCodeError) {
      navigator.clipboard.writeText(machineCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleUpgrade = () => {
    setIsUpgrading(true);
    setLicenseKey('');
    setError('');
  };

  const handleCancelUpgrade = () => {
    setIsUpgrading(false);
    setLicenseKey('');
    setError('');
  };

  const getDaysRemaining = () => {
    if (!status?.expires_at) return 0;
    const now = Math.floor(Date.now() / 1000);
    const remaining = status.expires_at - now;
    return Math.max(0, Math.floor(remaining / (24 * 60 * 60)));
  };

  const getLicenseTypeName = (type: string | null) => {
    const map: Record<string, string> = {
      monthly: '月卡',
      quarterly: '白银版',
      yearly: '黄金版',
      permanent: '永久版',
      trial: '试用版',
      free: '免费版'
    };
    return type ? (map[type] || type) : '未授权';
  };

  const canUpgrade = status?.is_activated && status.license_type !== 'permanent';

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
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
          maxWidth: '480px',
          maxHeight: '90vh',
          margin: '16px',
          overflow: 'hidden',
          border: '1px solid rgba(102, 126, 234, 0.3)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(102, 126, 234, 0.15)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🔐</span>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
              授权管理
            </h2>
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
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
          >
            ✕
          </button>
        </div>

        {/* 内容 */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {/* 当前状态卡片 */}
          <div style={{
            background: 'rgba(22, 33, 62, 0.6)',
            borderRadius: '14px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ color: '#9ca3af', fontSize: '15px' }}>授权状态</span>
              <span style={{
                padding: '8px 20px',
                borderRadius: '20px',
                fontSize: '15px',
                fontWeight: 700,
                background: status?.is_activated 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#fff',
                boxShadow: status?.is_activated 
                  ? '0 4px 12px rgba(16, 185, 129, 0.4)' 
                  : '0 4px 15px rgba(239, 68, 68, 0.5)',
              }}>
                {status?.is_activated ? '✓ 已授权' : '⚠ 未授权'}
              </span>
            </div>
            
            {status?.is_activated && (
              <div style={{ 
                display: 'flex', 
                gap: '24px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>授权类型</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>
                    {getLicenseTypeName(status.license_type)}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>剩余天数</div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>
                    {status.license_type === 'permanent' ? '∞ 永久' : `${getDaysRemaining()} 天`}
                  </div>
                </div>
              </div>
            )}
            
            {/* 升级按钮 */}
            {canUpgrade && !isUpgrading && (
              <div style={{ 
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <button
                  onClick={handleUpgrade}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  ⬆️ 升级授权
                </button>
              </div>
            )}
          </div>

          {/* 升级模式提示 */}
          {isUpgrading && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '10px',
              padding: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>⬆️</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#fbbf24' }}>升级授权模式</span>
              </div>
              <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0 }}>
                请将您的机器码发送给客服，获取更高级别的授权码后粘贴到下方。
              </p>
              <button
                onClick={handleCancelUpgrade}
                style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid rgba(245, 158, 11, 0.5)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#fbbf24',
                  cursor: 'pointer',
                }}
              >
                取消升级
              </button>
            </div>
          )}

          {/* 升级成功提示 */}
          {upgradeSuccess && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: '24px' }}>🎉</span>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#10b981', margin: '8px 0 0 0' }}>
                升级成功！
              </p>
            </div>
          )}

          {/* 机器码 */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '15px', 
              fontWeight: 600, 
              color: '#e2e8f0', 
              marginBottom: '10px' 
            }}>
              🖥️ 您的机器码
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={machineCode}
                readOnly
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  background: 'rgba(15, 15, 26, 0.6)',
                  border: '1px solid rgba(102, 126, 234, 0.3)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  color: '#667eea',
                  outline: 'none',
                }}
              />
              <button
                onClick={machineCodeError ? loadMachineCode : handleCopyCode}
                style={{
                  padding: '14px 28px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: copySuccess
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : machineCodeError
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  minWidth: '80px',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {copySuccess ? '✓ 已复制' : machineCodeError ? '重试' : '复制'}
              </button>
            </div>
            <p style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280' }}>
              {isUpgrading ? '将此机器码发送给我，获取升级授权码' : '将此机器码发送给我，获取授权码'}
            </p>
          </div>

          {/* 激活码输入 */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '15px', 
              fontWeight: 600, 
              color: '#e2e8f0', 
              marginBottom: '10px' 
            }}>
              {isUpgrading ? '🔑 输入升级授权码' : '🔑 输入授权码'}
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder={isUpgrading ? "请输入升级授权码" : "请输入授权码"}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  background: 'rgba(15, 15, 26, 0.6)',
                  border: '1px solid rgba(102, 126, 234, 0.3)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  color: '#fff',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)'}
              />
              <button
                onClick={handleActivate}
                disabled={loading}
                style={{
                  padding: '14px 28px',
                  background: loading 
                    ? 'rgba(102, 126, 234, 0.5)' 
                    : isUpgrading
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  minWidth: '80px',
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {loading ? '处理中...' : isUpgrading ? '升级' : '激活'}
              </button>
            </div>
            {error && (
              <p style={{ marginTop: '10px', fontSize: '13px', color: '#ef4444' }}>
                ⚠️ {error}
              </p>
            )}
          </div>
        </div>

        {/* 底部 */}
        <div style={{
          padding: '12px 24px',
          background: 'rgba(102, 126, 234, 0.1)',
          borderTop: '1px solid rgba(102, 126, 234, 0.3)',
          flexShrink: 0,
        }}>
          <p style={{ 
            fontSize: '12px', 
            fontWeight: 500, 
            color: '#a5b4fc', 
            textAlign: 'center', 
            margin: 0,
          }}>
            💡 授权码有效期：月卡30天 · 白银版90天 · 黄金版365天 · 永久版无限制
          </p>
        </div>
      </div>
    </div>
  );
}
