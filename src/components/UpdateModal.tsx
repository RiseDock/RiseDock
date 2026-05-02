import { useState, useEffect, useCallback } from 'react';
import { open as shellOpen, Command } from '@tauri-apps/plugin-shell';
import { writeFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { downloadDir } from '@tauri-apps/api/path';
import { getVersion } from '@tauri-apps/api/app';

const LATEST_JSON_URL = 'https://risedock-releases.oss-cn-beijing.aliyuncs.com/latest/latest.json';

interface LatestInfo {
  version: string;
  date?: string;
  body?: string;
  url: string;
  filename: string;
}

interface UpdateModalProps {
  onClose: () => void;
}

function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

const formatDate = (isoDate: string): string => {
  try {
    const d = new Date(isoDate);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return isoDate;
  }
};

type Stage = 'checking' | 'no-update' | 'has-update' | 'downloading' | 'done' | 'error';

export default function UpdateModal({ onClose }: UpdateModalProps) {
  const [stage, setStage] = useState<Stage>('checking');
  const [latestInfo, setLatestInfo] = useState<LatestInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [downloadedMB, setDownloadedMB] = useState(0);
  const [totalMB, setTotalMB] = useState(0);
  const [savedFilename, setSavedFilename] = useState('');
  const [currentVersion, setCurrentVersion] = useState('');

  const checkForUpdate = useCallback(async () => {
    setStage('checking');
    setErrorMsg('');
    try {
      // 动态获取当前版本号（从 tauri.conf.json 读取）
      const ver = await getVersion();
      setCurrentVersion(ver);

      const resp = await tauriFetch(`${LATEST_JSON_URL}?t=${Date.now()}`, { connectTimeout: 15000 });
      if (!resp.ok) throw new Error(`服务器返回 HTTP ${resp.status}`);
      const data = await resp.json();
      const latestVersion: string = data.version ?? '0.0.0';
      const url: string = data.platforms?.['windows-x86_64']?.url ?? '';
      if (!url) throw new Error('更新地址缺失');
      const filename = url.split('/').pop() ?? `RiseDock_${latestVersion}_x64-setup.exe`;

      if (compareVersion(latestVersion, ver) > 0) {
        setLatestInfo({
          version: latestVersion,
          date: data.date ?? '',
          body: data.body ?? data.notes ?? '',
          url,
          filename,
        });
        setStage('has-update');
      } else {
        setStage('no-update');
      }
    } catch (e) {
      setErrorMsg(String(e));
      setStage('error');
    }
  }, []);

  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  const handleDownload = async () => {
    if (!latestInfo) return;
    setStage('downloading');
    setProgress(0);
    setDownloadedMB(0);
    setTotalMB(0);

    try {
      const resp = await tauriFetch(latestInfo.url, { connectTimeout: 60000 });
      if (!resp.ok) throw new Error(`下载失败 HTTP ${resp.status}`);

      const contentLength = Number(resp.headers.get('content-length') ?? 0);
      const total = contentLength / 1024 / 1024;
      setTotalMB(total);

      const reader = resp.body!.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        const mb = received / 1024 / 1024;
        setDownloadedMB(mb);
        if (contentLength > 0) {
          setProgress(Math.min(99, Math.round((received / contentLength) * 100)));
        }
      }

      // 合并为单个 Uint8Array
      const totalLen = chunks.reduce((s, c) => s + c.length, 0);
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      // 写入下载目录
      await writeFile(latestInfo.filename, merged, { baseDir: BaseDirectory.Download });
      setProgress(100);
      setSavedFilename(latestInfo.filename);
      setStage('done');
    } catch (e) {
      setErrorMsg(String(e));
      setStage('error');
    }
  };

  // 1. 先尝试直接运行安装包（cmd /c start，比 shellOpen 更可靠）
  // 2. 失败了才打开下载目录，高亮选中安装包文件
  const handleInstall = async () => {
    try {
      const dir = await downloadDir();
      const exePath = `${dir}\\${savedFilename}`;
      await Command.create('cmd', ['/c', 'start', '', exePath]).execute();
    } catch {
      // 降级：打开下载目录并选中安装包文件
      try {
        const dir = await downloadDir();
        await Command.create('explorer', ['/select,', dir]).execute();
      } catch {
        setErrorMsg('安装失败，请手动打开下载目录双击：' + savedFilename);
        setStage('error');
      }
    }
  };

  // ───── 渲染 ─────
  const cardStyle: React.CSSProperties = {
    background: '#1a1a2e',
    borderRadius: '16px',
    padding: '28px 32px',
    width: '440px',
    maxWidth: '90vw',
    boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.08)',
    textAlign: 'center',
    position: 'relative',
  };

  const btnBase: React.CSSProperties = {
    flex: 1, padding: '10px 16px',
    borderRadius: '8px', fontSize: '13px',
    cursor: 'pointer', fontWeight: 500,
  };

  const btnGhost: React.CSSProperties = {
    ...btnBase,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    color: '#c9d1d9',
  };

  const btnPrimary: React.CSSProperties = {
    ...btnBase,
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
  };

  return (
    <div
      onClick={stage === 'downloading' ? undefined : onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 99999,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={cardStyle}>

        {/* 关闭按钮（下载中禁用） */}
        {stage !== 'downloading' && (
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
          >✕</button>
        )}

        <div style={{ fontSize: '36px', marginBottom: '16px' }}>🚀</div>

        {/* 检查中 */}
        {stage === 'checking' && (
          <>
            <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, margin: '0 0 16px' }}>正在检查更新...</h3>
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: '40%', height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '2px', animation: 'pulse 1.5s infinite' }} />
            </div>
          </>
        )}

        {/* 无更新 */}
        {stage === 'no-update' && (
          <>
            <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>已是最新版本</h3>
            <p style={{ color: '#8b949e', fontSize: '13px', margin: '0 0 20px' }}>当前 v{currentVersion} 已是最新，无需更新</p>
            <button style={btnGhost}
              onClick={onClose}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >确定</button>
          </>
        )}

        {/* 有更新 */}
        {stage === 'has-update' && latestInfo && (
          <>
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 6px' }}>
              发现新版本 <span style={{ color: '#818cf8' }}>v{latestInfo.version}</span>
            </h3>
            {latestInfo.date && (
              <p style={{ color: '#6b7280', fontSize: '12px', margin: '0 0 14px' }}>
                发布于 {formatDate(latestInfo.date)}
              </p>
            )}

            {/* 更新说明 */}
            {latestInfo.body && latestInfo.body !== 'See the assets to download this version and install.' ? (
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '20px',
                textAlign: 'left',
                maxHeight: '140px',
                overflowY: 'auto',
              }}>
                <p style={{ color: '#a0aec0', fontSize: '12px', margin: '0 0 6px', fontWeight: 600 }}>更新内容</p>
                <p style={{ color: '#8b949e', fontSize: '12px', margin: 0, lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                  {latestInfo.body}
                </p>
              </div>
            ) : (
              <p style={{ color: '#8b949e', fontSize: '13px', margin: '0 0 20px' }}>优化体验，修复已知问题</p>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={btnGhost} onClick={onClose}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              >忽略</button>
              <button style={btnPrimary} onClick={handleDownload}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >立即更新</button>
            </div>
          </>
        )}

        {/* 下载中 */}
        {stage === 'downloading' && (
          <>
            <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 600, margin: '0 0 20px' }}>正在下载更新...</h3>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
              <div style={{
                width: `${progress}%`, height: '100%',
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                borderRadius: '4px', transition: 'width 0.2s ease',
              }} />
            </div>
            <p style={{ color: '#8b949e', fontSize: '13px', margin: 0 }}>
              {progress}%
              {totalMB > 0
                ? `  ${downloadedMB.toFixed(1)} / ${totalMB.toFixed(1)} MB`
                : `  ${downloadedMB.toFixed(1)} MB`}
            </p>
            <p style={{ color: '#6b7280', fontSize: '12px', margin: '8px 0 0' }}>下载完成后将提示安装，请勿关闭</p>
          </>
        )}

        {/* 下载完成 */}
        {stage === 'done' && (
          <>
            <h3 style={{ color: '#34d399', fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>下载完成 ✓</h3>
            <p style={{ color: '#8b949e', fontSize: '13px', margin: '0 0 6px' }}>
              安装包已保存到下载目录
            </p>
            <p style={{ color: '#6b7280', fontSize: '12px', margin: '0 0 20px', wordBreak: 'break-all' }}>
              {savedFilename}
            </p>
            <p style={{ color: '#8b949e', fontSize: '12px', margin: '0 0 20px', lineHeight: '1.6' }}>
              点击「立即安装」打开下载目录，手动双击安装包完成升级
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={btnGhost} onClick={onClose}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              >稍后安装</button>
              <button style={btnPrimary} onClick={handleInstall}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >立即安装</button>
            </div>
          </>
        )}

        {/* 错误 */}
        {stage === 'error' && (
          <>
            <h3 style={{ color: '#f87171', fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>操作失败</h3>
            <p style={{ color: '#8b949e', fontSize: '12px', margin: '0 0 20px', wordBreak: 'break-all' }}>{errorMsg}</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={btnGhost} onClick={onClose}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              >关闭</button>
              <button style={{ ...btnBase, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#c9d1d9' }}
                onClick={checkForUpdate}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >重试</button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
