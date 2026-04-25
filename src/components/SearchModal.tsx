import { useState, useEffect, useRef, useCallback } from 'react';
import { useSceneStore } from '../stores';

// 类型图标映射
const typeIcons: Record<string, string> = {
  app: '🖥️',
  file: '📄',
  folder: '📁',
  url: '🔗',
  image: '🖼️',
  command: '⚡',
};

// 搜索结果项
interface SearchResult {
  type: 'scene' | 'item';
  sceneId: string;
  sceneName: string;
  itemId?: string;
  itemName: string;
  itemPath?: string;
  itemType?: string;
}

// 高亮关键词
function HighlightText({ text, keyword }: { text: string; keyword: string }) {
  if (!keyword.trim()) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${escapeRegex(keyword)})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === keyword.toLowerCase() 
          ? <mark key={i} style={{ background: 'rgba(102, 126, 234, 0.3)', color: '#fff', borderRadius: '2px', padding: '0 2px' }}>{part}</mark>
          : part
      )}
    </>
  );
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface SearchModalProps {
  onClose: () => void;
  onSelectScene: (sceneId: string) => void;
  onSelectItem: (sceneId: string, itemId: string) => void;
}

export default function SearchModal({ onClose, onSelectScene, onSelectItem }: SearchModalProps) {
  const { scenes } = useSceneStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // 搜索逻辑
  const search = useCallback((q: string): SearchResult[] => {
    if (!q.trim()) return [];
    
    const keywords = q.trim().toLowerCase().split(/\s+/);
    const results: SearchResult[] = [];

    // 搜索场景
    scenes.forEach((scene) => {
      const sceneNameLower = scene.name.toLowerCase();
      const allMatch = keywords.every(kw => sceneNameLower.includes(kw));
      if (allMatch) {
        results.push({
          type: 'scene',
          sceneId: scene.id,
          sceneName: scene.name,
          itemName: scene.name,
        });
      }
    });

    // 搜索启动项
    scenes.forEach((scene) => {
      scene.items.forEach((item) => {
        const nameLower = item.name.toLowerCase();
        const pathLower = (item.path || '').toLowerCase();
        const allMatch = keywords.every(kw => nameLower.includes(kw) || pathLower.includes(kw));
        if (allMatch) {
          results.push({
            type: 'item',
            sceneId: scene.id,
            sceneName: scene.name,
            itemId: item.id,
            itemName: item.name,
            itemPath: item.path,
            itemType: item.type,
          });
        }
      });
    });

    return results;
  }, [scenes]);

  const results = search(query);

  // 自动滚动到选中项
  useEffect(() => {
    if (resultsRef.current && results.length > 0) {
      const selected = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, results.length]);

  // 键盘处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex, onClose]);

  // 选中结果
  const handleSelect = (result: SearchResult) => {
    if (result.type === 'scene') {
      onSelectScene(result.sceneId);
    } else {
      onSelectItem(result.sceneId, result.itemId!);
    }
    onClose();
  };

  // 自动聚焦输入框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 按场景分组显示结果
  const groupedResults = results.reduce((acc, result) => {
    const sceneId = result.sceneId;
    if (!acc[sceneId]) {
      acc[sceneId] = {
        sceneName: result.sceneName,
        items: [],
      };
    }
    acc[sceneId].items.push(result);
    return acc;
  }, {} as Record<string, { sceneName: string; items: SearchResult[] }>);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '80px',
        zIndex: 99999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '560px',
          maxHeight: '480px',
          background: '#1a1a2e',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 搜索输入框 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <span style={{ fontSize: '18px', marginRight: '12px', opacity: 0.6 }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="搜索场景或启动项..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: '15px',
              caretColor: '#667eea',
            }}
          />
          <span style={{
            fontSize: '11px',
            color: '#6b7280',
            background: 'rgba(255, 255, 255, 0.06)',
            padding: '4px 8px',
            borderRadius: '4px',
          }}>
            Esc 关闭
          </span>
        </div>

        {/* 搜索结果 */}
        <div
          ref={resultsRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px',
          }}
        >
          {query.trim() === '' ? (
            <div style={{
              padding: '32px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '14px',
            }}>
              输入关键词搜索场景或启动项
            </div>
          ) : results.length === 0 ? (
            <div style={{
              padding: '32px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '14px',
            }}>
              未找到匹配的结果
            </div>
          ) : (
            Object.entries(groupedResults).map(([sceneId, group]) => (
              <div key={sceneId} style={{ marginBottom: '8px' }}>
                {/* 场景标题 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#6b7280',
                  fontWeight: 500,
                }}>
                  <span>📂</span>
                  <span>{group.sceneName}</span>
                  <span style={{
                    fontSize: '10px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}>
                    {group.items.length}
                  </span>
                </div>

                {/* 该场景下的结果 */}
                {group.items.map((result) => {
                  const globalIndex = results.findIndex(r => 
                    r.sceneId === result.sceneId && 
                    (result.type === 'scene' ? r.type === 'scene' : r.itemId === result.itemId)
                  );
                  const isSelected = globalIndex === selectedIndex;

                  return (
                    <div
                      key={`${result.type}-${result.sceneId}-${result.itemId || 'scene'}`}
                      data-index={globalIndex}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        marginLeft: '28px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
                        border: isSelected ? '1px solid rgba(102, 126, 234, 0.3)' : '1px solid transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      {/* 图标 */}
                      <span style={{ fontSize: '16px', opacity: 0.8 }}>
                        {result.type === 'scene' ? '📂' : typeIcons[result.itemType || 'file']}
                      </span>
                      
                      {/* 名称和路径 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px',
                          color: '#e2e8f0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {result.type === 'scene' ? (
                            <HighlightText text={result.itemName} keyword={query} />
                          ) : (
                            <span>
                              <HighlightText text={result.itemName} keyword={query} />
                              <span style={{ color: '#4a5568', marginLeft: '8px', fontSize: '12px' }}>
                                {result.itemPath && result.itemPath.length > 40 
                                  ? '...' + result.itemPath.slice(-37) 
                                  : result.itemPath}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 选中提示 */}
                      {isSelected && (
                        <span style={{
                          fontSize: '11px',
                          color: '#667eea',
                          background: 'rgba(102, 126, 234, 0.15)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}>
                          Enter 选择
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* 底部提示 */}
        {results.length > 0 && (
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            gap: '16px',
            fontSize: '12px',
            color: '#4a5568',
          }}>
            <span>↑↓ 导航</span>
            <span>Enter 选择</span>
            <span>Esc 关闭</span>
          </div>
        )}
      </div>
    </div>
  );
}