import { useState, useEffect } from 'react';
import { Scene, LaunchItem, LaunchItemType } from '../types';
import { useSceneStore, useLicenseStore, LICENSE_LIMITS } from '../stores';
import { showToast } from './Toast';
import SortableItem, { DragOverlayItem } from './SortableItem';
import { DndContext, closestCenter, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

interface SceneEditorProps {
  scene: Scene;
  onBack: () => void;
  highlightedItemId?: string | null;
  onSetHotkey?: (scene: Scene) => void;
}

// 类型选项
const typeOptions = [
  { value: 'app', label: '应用', icon: '🖥️' },
  { value: 'file', label: '文件', icon: '📄' },
  { value: 'folder', label: '文件夹', icon: '📁' },
  { value: 'url', label: '网址', icon: '🔗' },
  { value: 'image', label: '图片', icon: '🖼️' },
];

export default function SceneEditor({ scene, onBack, highlightedItemId, onSetHotkey }: SceneEditorProps) {
  const { addLaunchItem, reorderItems, updateLaunchItem, scenes } = useSceneStore();
  const { isLicensed } = useLicenseStore();

  // 获取最新的 scene 数据
  const currentScene = scenes.find(s => s.id === scene.id) || scene;
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemType, setNewItemType] = useState<LaunchItemType>('app');
  const [newItemName, setNewItemName] = useState('');
  const [newItemPath, setNewItemPath] = useState('');
  const [newItemIcon, setNewItemIcon] = useState<string | undefined>();

  // 编辑相关
  const [editingItem, setEditingItem] = useState<LaunchItem | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemPath, setEditItemPath] = useState('');
  const [editItemType, setEditItemType] = useState<LaunchItemType>('app');
  const [editItemIcon, setEditItemIcon] = useState<string | undefined>();

  // 拖拽相关
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeItem = activeId ? currentScene.items.find(item => item.id === activeId) : null;

  // 置顶区域折叠状态
  const [pinnedCollapsed, setPinnedCollapsed] = useState(false);

  // 普通启动项折叠状态
  const [unpinnedCollapsed, setUnpinnedCollapsed] = useState(false);

  // 批量添加选择弹窗
  const [showBatchMenu, setShowBatchMenu] = useState(false);

  // 点击其他地方关闭批量添加菜单
  useEffect(() => {
    if (!showBatchMenu) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // 检查点击目标是否在批量添加菜单区域内
      if (!target.closest('[data-batch-menu]')) {
        setShowBatchMenu(false);
      }
    };
    
    // 延迟添加监听，避免当前点击触发关闭
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showBatchMenu]);

  // 获取类型过滤器
  const getTypeFilters = (type: LaunchItemType) => {
    switch (type) {
      case 'app':
        return { filters: [{ name: '可执行文件', extensions: ['exe', 'bat', 'cmd', 'lnk'] }], title: '选择程序', directory: false };
      case 'image':
        return { filters: [{ name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'] }], title: '选择图片', directory: false };
      case 'folder':
        return { filters: [], title: '选择文件夹', directory: true };
      case 'url':
        return { filters: [], title: '网址', directory: false };
      default:
        return { filters: [{ name: '所有文件', extensions: ['*'] }], title: '选择文件', directory: false };
    }
  };

  // 浏览文件
  const handleBrowse = async () => {
    // 网址类型不需要浏览
    if (newItemType === 'url') return;

    // 未授权用户检查数量限制
    if (!useLicenseStore.getState().isLicensed() && currentScene.items.length >= LICENSE_LIMITS.UNLICENSED_MAX_ITEMS_PER_SCENE) {
      showToast(`未授权版本每个场景最多添加 ${LICENSE_LIMITS.UNLICENSED_MAX_ITEMS_PER_SCENE} 个启动项，请先购买授权解锁全部功能`, 'warning');
      return;
    }

    try {
      const { filters, title, directory } = getTypeFilters(newItemType);
      const selected = await open({
        multiple: false,
        filters: directory ? [] : filters,
        title,
        directory
      });

      if (selected && typeof selected === 'string') {
        setNewItemPath(selected);
        setNewItemIcon(undefined); // 先清除旧图标
        if (!newItemName.trim()) {
          const name = selected.split(/[/\\]/).pop() || '';
          setNewItemName(name);
        }
        // 自动提取图标（仅对 exe 文件）
        const ext = selected.split('.').pop()?.toLowerCase();
        if (ext === 'exe' || ext === 'lnk') {
          try {
            const iconBase64 = await invoke<string>('extract_icon', { exePath: selected });
            if (iconBase64) {
              setNewItemIcon(iconBase64);
            }
          } catch (e) {
            console.log('提取图标失败:', e);
          }
        }
      }
    } catch (e) {
      console.error('Browse failed:', e);
    }
  };

  // 浏览编辑项的文件
  const handleEditBrowse = async () => {
    // 网址类型不需要浏览
    if (editItemType === 'url') return;

    try {
      const { filters, title, directory } = getTypeFilters(editItemType);
      const selected = await open({
        multiple: false,
        filters: directory ? [] : filters,
        title,
        directory
      });

      if (selected && typeof selected === 'string') {
        setEditItemPath(selected);
        setEditItemIcon(undefined); // 先清除旧图标
        // 自动提取图标（仅对 exe 文件）
        const ext = selected.split('.').pop()?.toLowerCase();
        if (ext === 'exe' || ext === 'lnk') {
          try {
            const iconBase64 = await invoke<string>('extract_icon', { exePath: selected });
            if (iconBase64) {
              setEditItemIcon(iconBase64);
            }
          } catch (e) {
            console.log('提取图标失败:', e);
          }
        }
      }
    } catch (e) {
      console.error('Browse failed:', e);
    }
  };

  // 一键浏览多个文件（支持文件和文件夹）
  const handleBrowseMultiple = async (mode: 'file' | 'folder' = 'file') => {
    // 未授权用户不能使用批量添加功能（直接从 store 读取最新状态）
    if (!useLicenseStore.getState().isLicensed()) {
      showToast('请先激活授权以解锁批量添加功能', 'warning');
      return;
    }

    try {
      let selected: string[] = [];
      
      if (mode === 'folder') {
        // 批量选择多个文件夹
        const selectedFolders = await open({
          multiple: true,
          title: '选择文件夹（可多选）',
          directory: true
        });
        
        if (selectedFolders && Array.isArray(selectedFolders)) {
          selected = selectedFolders;
        } else if (selectedFolders && typeof selectedFolders === 'string') {
          // 单个文件夹
          selected = [selectedFolders];
        }
      } else {
        // 批量选择文件
        const filters = [{ name: '所有文件', extensions: ['*'] }];
        const result = await open({
          multiple: true,
          filters,
          title: '选择文件（可多选）'
        });
        
        if (result && Array.isArray(result)) {
          selected = result;
        }
      }

      if (selected.length > 0) {
        let addedCount = 0;
        for (const path of selected) {
          // 检查是否达到限制
          if (!useLicenseStore.getState().isLicensed() && currentScene.items.length + addedCount >= LICENSE_LIMITS.UNLICENSED_MAX_ITEMS_PER_SCENE) {
            showToast(`已达到未授权版本限制（每场景最多 ${LICENSE_LIMITS.UNLICENSED_MAX_ITEMS_PER_SCENE} 个启动项）`, 'warning');
            break;
          }

          const name = path.split(/[/\\]/).pop() || '';
          const ext = name.split('.').pop()?.toLowerCase() || '';
          let type: LaunchItemType = 'file';
          
          // 文件夹模式直接设置为 folder 类型
          if (mode === 'folder') {
            type = 'folder';
          }
          
          // 根据扩展名判断类型
          const appExts = ['exe', 'bat', 'cmd', 'lnk', 'msi', 'com', 'pif', 'scr', 'gadget', 'ws', 'wsf', 'vbs', 'vbe', 'js', 'jse'];
          const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico', 'icns', 'tiff', 'tif', 'psd', 'raw', 'heic', 'heif', 'avif', 'apng', 'jfif'];
          const videoExts = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg', '3gp', 'ogv', 'rm', 'rmvb', 'vob'];
          const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus', 'ape', 'alac', 'ac3', 'dts'];
          const docExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'txt', 'md', 'rtf', 'odt', 'ods', 'odp', 'csv', 'tsv', 'epub', 'mobi', 'azw', 'azw3'];
          const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'dmg', 'pkg', 'deb', 'rpm'];
          const codeExts = ['html', 'css', 'js', 'ts', 'jsx', 'tsx', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'sql', 'sh', 'ps1', 'bat', 'cmd', 'log'];
          
          if (appExts.includes(ext)) type = 'app';
          else if (imageExts.includes(ext)) type = 'image';
          else if (videoExts.includes(ext)) type = 'file';  // 视频保持file类型
          else if (audioExts.includes(ext)) type = 'file';  // 音频保持file类型
          else if (docExts.includes(ext)) type = 'file';    // 文档保持file类型
          else if (archiveExts.includes(ext)) type = 'file'; // 压缩包保持file类型
          else if (codeExts.includes(ext)) type = 'file';   // 代码文件保持file类型
          // 其他未知类型保持file

          // 自动提取图标（仅对 exe/lnk 文件）
          let icon: string | undefined;
          if (ext === 'exe' || ext === 'lnk') {
            try {
              const iconBase64 = await invoke<string>('extract_icon', { exePath: path });
              if (iconBase64) {
                icon = iconBase64;
              }
            } catch (e) {
              console.log('批量提取图标失败:', path, e);
            }
          }

          addLaunchItem(scene.id, {
            name,
            path,
            type,
            delay: 0,
            enabled: true,
            pinned: false,
            icon,
          });
          addedCount++;
        }
        
        if (addedCount > 0) {
          showToast(`已添加 ${addedCount} 个启动项`, 'success');
        }
      }
    } catch (e) {
      console.error('Browse failed:', e);
      showToast('批量添加失败', 'error');
    }
  };

  const handleAddItem = () => {
    // 检查授权限制
    if (!useLicenseStore.getState().isLicensed() && currentScene.items.length >= LICENSE_LIMITS.UNLICENSED_MAX_ITEMS_PER_SCENE) {
      showToast(`未授权版本每个场景最多添加 ${LICENSE_LIMITS.UNLICENSED_MAX_ITEMS_PER_SCENE} 个启动项，请先购买授权解锁全部功能`, 'warning');
      return;
    }

    if (newItemName.trim() && newItemPath.trim()) {
      addLaunchItem(scene.id, {
        name: newItemName.trim(),
        path: newItemPath.trim(),
        type: newItemType,
        delay: 0,
        enabled: true,
        pinned: false,
        icon: newItemIcon,
      });
      setNewItemName('');
      setNewItemPath('');
      setNewItemIcon(undefined);
      setShowAddForm(false);
      showToast(`启动项「${newItemName.trim()}」添加成功`, 'success');
    }
  };

  const handleEditItem = (item: LaunchItem) => {
    setEditingItem(item);
    setEditItemName(item.name);
    setEditItemPath(item.path);
    setEditItemType(item.type);
    setEditItemIcon(item.icon);
  };

  const handleSaveEdit = () => {
    if (editingItem && editItemName.trim() && editItemPath.trim()) {
      updateLaunchItem(scene.id, editingItem.id, {
        name: editItemName.trim(),
        path: editItemPath.trim(),
        type: editItemType,
        icon: editItemIcon,
      });
      setEditingItem(null);
    }
  };

  // 拖拽事件处理
  const handleDragStart = (event: DragStartEvent) => {
    // 详细调试授权状态
    const licenseStore = useLicenseStore.getState();
    const status = licenseStore.status;
    const isLic = licenseStore.isLicensed();
    
    console.log('[DEBUG] === 拖拽排序授权检查 ===');
    console.log('[DEBUG] status.is_activated:', status.is_activated);
    console.log('[DEBUG] status.license_type:', status.license_type);
    console.log('[DEBUG] status.expires_at:', status.expires_at);
    console.log('[DEBUG] isLicensed() 返回:', isLic);
    
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    // 详细调试授权状态
    const licenseStore = useLicenseStore.getState();
    const status = licenseStore.status;
    const isLic = licenseStore.isLicensed();
    
    console.log('[DEBUG] === 拖拽结束授权检查 ===');
    console.log('[DEBUG] status.is_activated:', status.is_activated);
    console.log('[DEBUG] status.license_type:', status.license_type);
    console.log('[DEBUG] status.expires_at:', status.expires_at);
    console.log('[DEBUG] isLicensed() 返回:', isLic);
    
    // 未授权用户不能拖拽排序
    if (!isLic) {
      setActiveId(null);
      showToast('请先激活授权以解锁拖拽排序功能', 'warning');
      return;
    }

    const { active, over } = event;

    if (over && active.id !== over.id) {
      const allItems = [...currentScene.items];
      const oldIndex = allItems.findIndex(item => item.id === active.id);
      const newIndex = allItems.findIndex(item => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newItems = arrayMove(allItems, oldIndex, newIndex);
        reorderItems(scene.id, newItems);
      }
    }

    setActiveId(null);
  };

  // 下拉选择器样式
  const selectStyle: React.CSSProperties = {
    padding: '12px 16px',
    background: '#1a1a2e',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    cursor: 'pointer',
    minWidth: '140px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)' }}>
      {/* 头部 - 固定在顶部 */}
      <header style={{
        height: '52px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(22, 33, 62, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            style={{
              padding: '6px 12px',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#94a3b8',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            ← 返回
          </button>
          <h1 style={{ fontSize: '15px', fontWeight: 600, color: '#e2e8f0', margin: 0 }}>{currentScene.name}</h1>
          {/* 快捷键设置按钮（始终可见） */}
          <button
            onClick={() => onSetHotkey?.(currentScene)}
            title={currentScene.hotkey ? `快捷键: ${currentScene.hotkey}，点击修改` : '点击设置快捷键'}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '3px 10px',
              background: currentScene.hotkey ? 'rgba(102, 126, 234, 0.12)' : 'rgba(255,255,255,0.04)',
              border: currentScene.hotkey ? '1px solid rgba(102, 126, 234, 0.35)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              cursor: 'pointer',
              color: currentScene.hotkey ? '#818cf8' : '#64748b',
              fontSize: '11px',
              fontWeight: currentScene.hotkey ? 500 : 400,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)';
              e.currentTarget.style.color = '#818cf8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = currentScene.hotkey ? 'rgba(102, 126, 234, 0.12)' : 'rgba(255,255,255,0.04)';
              e.currentTarget.style.borderColor = currentScene.hotkey ? 'rgba(102, 126, 234, 0.35)' : 'rgba(255,255,255,0.1)';
              e.currentTarget.style.color = currentScene.hotkey ? '#818cf8' : '#64748b';
            }}
          >
            <span>⌨️</span>
            <span>{currentScene.hotkey || '设置快捷键'}</span>
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
          <button
            onClick={() => setShowBatchMenu(!showBatchMenu)}
            style={{
              padding: '6px 12px',
              background: 'rgba(102, 126, 234, 0.1)',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#667eea',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
            }}
          >
            📦 批量添加
          </button>
          {/* 批量添加选择菜单 */}
          {showBatchMenu && (
            <div
              data-batch-menu
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
                borderRadius: '10px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(102, 126, 234, 0.2)',
                padding: '6px 0',
                minWidth: '160px',
                zIndex: 1000,
              }}
            >
              <div
                onClick={() => { setShowBatchMenu(false); handleBrowseMultiple('file'); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#e2e8f0',
                  borderRadius: '6px',
                  margin: '0 6px',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span>📄</span>
                <span>批量添加文件</span>
              </div>
              <div
                onClick={() => { setShowBatchMenu(false); handleBrowseMultiple('folder'); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#e2e8f0',
                  borderRadius: '6px',
                  margin: '0 6px',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(102, 126, 234, 0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span>📁</span>
                <span>批量添加文件夹</span>
              </div>
            </div>
          )}
          <button
            onClick={() => {
              // 未授权用户检查数量限制
              if (!useLicenseStore.getState().isLicensed() && currentScene.items.length >= LICENSE_LIMITS.UNLICENSED_MAX_ITEMS_PER_SCENE) {
                showToast(`未授权版本每个场景最多添加 ${LICENSE_LIMITS.UNLICENSED_MAX_ITEMS_PER_SCENE} 个启动项，请先购买授权解锁全部功能`, 'warning');
                return;
              }
              setShowAddForm(true);
            }}
            style={{
              padding: '6px 12px',
              background: '#667eea', border: 'none', borderRadius: '6px',
              cursor: 'pointer', fontSize: '12px', fontWeight: 500, color: '#fff',
            }}
          >
            + 添加
          </button>
        </div>
      </header>

      {/* 内容区 - 精简padding */}
      <div style={{ flex: 1, padding: '16px 20px', overflow: 'auto' }}>
        {/* 添加表单 - 精简版 */}
        {showAddForm && (
          <div style={{
            marginBottom: '16px', padding: '16px',
            background: 'rgba(22, 33, 62, 0.6)', borderRadius: '10px',
            border: '1px solid rgba(102, 126, 234, 0.2)',
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <select
                value={newItemType}
                onChange={(e) => setNewItemType(e.target.value as LaunchItemType)}
                style={{ ...selectStyle, minWidth: '90px', padding: '8px 12px', fontSize: '12px' }}
              >
                {typeOptions.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ background: '#1a1a2e', color: '#fff' }}>
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
              <input
                type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
                placeholder="名称"
                style={{ ...selectStyle, padding: '8px 12px', fontSize: '12px', flex: '1 1 120px' }}
              />
              <div style={{ display: 'flex', gap: '6px', flex: '2 1 200px' }}>
                <input
                  type="text" value={newItemPath} onChange={(e) => setNewItemPath(e.target.value)}
                  placeholder={newItemType === 'url' ? '网址' : '路径'}
                  style={{ ...selectStyle, padding: '8px 12px', fontSize: '12px', flex: 1 }}
                />
                {newItemType !== 'url' && (
                  <button onClick={handleBrowse} style={{ ...selectStyle, padding: '8px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    浏览
                  </button>
                )}
              </div>
              <button
                onClick={handleAddItem}
                disabled={!newItemName.trim() || !newItemPath.trim()}
                style={{
                  padding: '8px 16px', background: '#667eea', border: 'none', borderRadius: '6px',
                  cursor: newItemName.trim() && newItemPath.trim() ? 'pointer' : 'default',
                  color: '#fff', fontSize: '12px', fontWeight: 500, opacity: newItemName.trim() && newItemPath.trim() ? 1 : 0.5,
                }}
              >
                添加
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                style={{ padding: '8px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', color: '#94a3b8', fontSize: '12px' }}
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 编辑表单 - 精简版 */}
        {editingItem && (
          <div style={{
            marginBottom: '16px', padding: '16px',
            background: 'rgba(22, 33, 62, 0.6)', borderRadius: '10px',
            border: '1px solid rgba(102, 126, 234, 0.2)',
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              <select
                value={editItemType}
                onChange={(e) => setEditItemType(e.target.value as LaunchItemType)}
                style={{ ...selectStyle, padding: '8px 12px', fontSize: '12px' }}
              >
                {typeOptions.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ background: '#1a1a2e', color: '#fff' }}>
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
              <input
                type="text" value={editItemName} onChange={(e) => setEditItemName(e.target.value)}
                placeholder="名称"
                style={{ ...selectStyle, padding: '8px 12px', fontSize: '12px', flex: '1 1 120px' }}
              />
              <div style={{ display: 'flex', gap: '6px', flex: '2 1 200px' }}>
                <input
                  type="text" value={editItemPath} onChange={(e) => setEditItemPath(e.target.value)}
                  placeholder={editItemType === 'url' ? '网址' : '路径'}
                  style={{ ...selectStyle, padding: '8px 12px', fontSize: '12px', flex: 1 }}
                />
                {editItemType !== 'url' && (
                  <button onClick={handleEditBrowse} style={{ ...selectStyle, padding: '8px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    浏览
                  </button>
                )}
              </div>
              <button
                onClick={handleSaveEdit}
                style={{ padding: '8px 16px', background: '#667eea', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#fff', fontSize: '12px', fontWeight: 500 }}
              >
                保存
              </button>
              <button
                onClick={() => setEditingItem(null)}
                style={{ padding: '8px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', color: '#94a3b8', fontSize: '12px' }}
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 空状态 - 精简版 */}
        {currentScene.items.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '60px 40px', textAlign: 'center',
          }}>
            <div style={{
              width: '64px', height: '64px', background: 'rgba(102, 126, 234, 0.15)', borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '16px',
            }}>
              📋
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', margin: '0 0 6px' }}>
              还没有启动项
            </h3>
            <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 16px' }}>
              点击上方「添加」按钮添加启动项
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {currentScene.items.length} 个启动项，{currentScene.items.filter(i => i.enabled).length} 个启用
              </span>
            </div>

            {/* 置顶项区域 - 不支持排序 */}
            {(() => {
              const pinnedItems = currentScene.items.filter(i => i.pinned);
              if (pinnedItems.length === 0) return null;
              return (
                <div style={{ marginBottom: '16px', position: 'relative', zIndex: 10 }}>
                  <div
                    onClick={() => setPinnedCollapsed(!pinnedCollapsed)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      marginBottom: pinnedCollapsed ? 0 : '10px', padding: '8px 12px',
                      background: 'rgba(251, 191, 36, 0.1)', borderRadius: '8px',
                      border: '1px solid rgba(251, 191, 36, 0.2)', cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{pinnedCollapsed ? '▶' : '▼'}</span>
                    <span style={{ fontSize: '14px' }}>📌</span>
                    <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: 500 }}>置顶项目</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>({pinnedItems.length})</span>
                  </div>
                  {!pinnedCollapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {pinnedItems.map((item) => (
                        <SortableItem key={item.id} item={item} sceneId={scene.id} onEdit={handleEditItem} highlightedId={highlightedItemId} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 普通启动项 - 支持排序 */}
            {(() => {
              const unpinnedItems = currentScene.items.filter(i => !i.pinned);
              if (unpinnedItems.length === 0) return null;
              return (
                <DndContext
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={unpinnedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div
                        onClick={() => setUnpinnedCollapsed(!unpinnedCollapsed)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          marginBottom: unpinnedCollapsed ? 0 : '8px', padding: '8px 12px',
                          background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{unpinnedCollapsed ? '▶' : '▼'}</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>启动项 ({unpinnedItems.length})</span>
                      </div>
                      {!unpinnedCollapsed && unpinnedItems.map((item) => (
                        <SortableItem key={item.id} item={item} sceneId={scene.id} onEdit={handleEditItem} highlightedId={highlightedItemId} />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {activeItem && <DragOverlayItem item={activeItem} />}
                  </DragOverlay>
                </DndContext>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
