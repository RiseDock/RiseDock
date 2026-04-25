import { useState, useEffect, useRef } from 'react';
import { Scene } from '../types';
import { useSceneStore } from '../stores';
import { showToast } from './Toast';

interface HotkeyModalProps {
  scene: Scene;
  onClose: () => void;
  onOpen?: () => void;
}

export default function HotkeyModal({ scene, onClose, onOpen }: HotkeyModalProps) {
  const [recording, setRecording] = useState(false);
  const [hotkey, setHotkey] = useState(scene.hotkey || '');
  const [conflictScene, setConflictScene] = useState<string | null>(null);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    onOpen?.();
  }, []);

  // 点击进入录制模式
  const handleStartRecording = () => {
    setConflictScene(null);
    setRecording(true);
    isRecordingRef.current = true;
  };

  // 使用 document 事件监听确保捕获所有按键
  useEffect(() => {
    if (!recording) return;

    const handler = (e: KeyboardEvent) => {
      if (!isRecordingRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      // 构建快捷键字符串
      const modifiers: string[] = [];
      if (e.ctrlKey) modifiers.push('Ctrl');
      if (e.altKey) modifiers.push('Alt');
      if (e.shiftKey) modifiers.push('Shift');
      if (e.metaKey) modifiers.push('Meta');

      const ignoredKeys = ['Control', 'Alt', 'Shift', 'Meta'];
      if (ignoredKeys.includes(e.key) || modifiers.length === 0) return;

      let key = e.key === ' ' ? 'Space' : (e.key.length === 1 ? e.key.toUpperCase() : e.key);
      const result = [...modifiers, key].join('+');

      console.log('[HotkeyModal] 检测到按键:', result, 'key:', e.key);

      // 从 store 获取最新数据
      const currentScenes = useSceneStore.getState().scenes;
      console.log('[HotkeyModal] 所有场景快捷键:', JSON.stringify(currentScenes.map(s => ({ name: s.name, hotkey: s.hotkey }))));

      // 检查是否被其他场景占用
      const conflict = currentScenes.find(s => s.id !== scene.id && s.hotkey === result);

      if (conflict) {
        console.log('[HotkeyModal] 冲突！被:', conflict.name);
        setConflictScene(conflict.name);
        isRecordingRef.current = false;
        setRecording(false);
        return;
      }

      // 有效快捷键
      console.log('[HotkeyModal] 无冲突，设置成功');
      setConflictScene(null);
      setHotkey(result);
      isRecordingRef.current = false;
      setRecording(false);
      showToast(`✅ 已设置快捷键 ${result}`, 'success');
    };

    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [recording, scene.id]);

  const handleSave = () => {
    // 检查冲突（如果有快捷键）
    const currentScenes = useSceneStore.getState().scenes;
    if (hotkey) {
      const conflict = currentScenes.find(s => s.id !== scene.id && s.hotkey === hotkey);
      if (conflict) {
        setConflictScene(conflict.name);
        showToast(`⚠️ 快捷键已被「${conflict.name}」占用`, 'warning');
        return;
      }
    }
    useSceneStore.getState().updateSceneHotkey(scene.id, hotkey);
    showToast(hotkey ? `已绑定快捷键 ${hotkey}` : '已清除快捷键', 'success');
    onClose();
  };

  const handleClear = () => {
    setHotkey('');
    setConflictScene(null);
    // 真正清除 store 里的快捷键
    useSceneStore.getState().updateSceneHotkey(scene.id, '');
  };

  return (
    <div
      onClick={(e) => { if (e.currentTarget === e.target) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 99999,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '16px',
          padding: '28px',
          width: '360px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          border: conflictScene ? '2px solid rgba(239, 68, 68, 0.7)' : '1px solid rgba(102, 126, 234, 0.2)',
        }}
      >
        <h3 style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 600, margin: '0 0 6px' }}>
          ⌨️ 设置快捷键
        </h3>
        <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 24px' }}>
          场景：{scene.name}
        </p>

        {/* 快捷键录入区域 */}
        <div
          onClick={handleStartRecording}
          style={{
            padding: '18px',
            background: recording ? 'rgba(102, 126, 234, 0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${conflictScene ? 'rgba(239, 68, 68, 0.6)' : recording ? 'rgba(102, 126, 234, 0.6)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '10px',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: conflictScene ? '8px' : '20px',
            transition: 'all 0.2s',
          }}
        >
          {recording ? (
            <div>
              <div style={{ color: '#667eea', fontSize: '13px', marginBottom: '8px' }}>
                🎙 请按下快捷键组合...
              </div>
              <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                需要包含 Ctrl / Alt / Shift 等修饰键
              </div>
            </div>
          ) : hotkey ? (
            <div style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: 600, letterSpacing: '1px' }}>
              {hotkey.split('+').map((k, i) => (
                <span key={i}>
                  {i > 0 && <span style={{ color: '#64748b', margin: '0 4px' }}>+</span>}
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    background: 'rgba(102, 126, 234, 0.2)',
                    border: '1px solid rgba(102, 126, 234, 0.4)',
                    borderRadius: '6px',
                    fontSize: '13px',
                  }}>{k}</span>
                </span>
              ))}
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: '13px' }}>
              点击此处录入快捷键
            </div>
          )}
        </div>

        {/* 快捷键冲突提示 */}
        {conflictScene && (
          <div style={{
            color: '#ef4444',
            fontSize: '12px',
            marginBottom: '12px',
            padding: '10px 14px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            ⚠️ 快捷键已被「{conflictScene}」占用
          </div>
        )}

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={handleClear}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              color: '#94a3b8',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            清除
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              color: '#94a3b8',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 2,
              padding: '10px 16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}