import { useState } from 'react';

interface HelpModalProps {
  onClose: () => void;
}

/* ── 复用样式常量 ─────────────────────────────────────────── */
const cardStyle: React.CSSProperties = {
  background: 'rgba(22, 33, 62, 0.6)',
  borderRadius: '14px',
  padding: '18px 20px',
  border: '1px solid rgba(255, 255, 255, 0.08)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 600,
  color: '#fff',
  marginBottom: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const listStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: '20px',
  color: '#9ca3af',
  lineHeight: '2',
};

const labelStyle: React.CSSProperties = { color: '#e2e8f0' };

function SectionCard({
  icon,
  title,
  children,
  style,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ ...cardStyle, ...style }}>
      <h3 style={titleStyle}>
        <span style={{ fontSize: '18px' }}>{icon}</span> {title}
      </h3>
      {children}
    </div>
  );
}

export default function HelpModal({ onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<'guide' | 'feature' | 'license'>('guide');

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
          maxWidth: '720px',
          maxHeight: '90vh',
          margin: '16px',
          border: '1px solid rgba(102, 126, 234, 0.3)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(102, 126, 234, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 头部 ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>📖</span>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>使用帮助</h2>
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

        {/* ── 标签切换 ── */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(102, 126, 234, 0.2)',
            background: 'rgba(15, 15, 26, 0.4)',
            flexShrink: 0,
          }}
        >
          {[
            { key: 'guide', label: '📝 操作指南' },
            { key: 'feature', label: '✨ 功能介绍' },
            { key: 'license', label: '🔐 授权说明' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: activeTab === tab.key ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #667eea' : '2px solid transparent',
                color: activeTab === tab.key ? '#a5b4fc' : '#9ca3af',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── 内容区（可滚动，flex:1 撑满剩余空间） ── */}
        <div
          style={{
            flex: 1,
            padding: '20px 24px',
            overflowY: 'auto',
            minHeight: 0,
          }}
        >
          {/* ======================== 操作指南 ======================== */}
          {activeTab === 'guide' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* 快速上手 */}
              <SectionCard icon="🎯" title="快速上手">
                <ol style={{ ...listStyle, paddingLeft: '20px' }}>
                  <li>点击顶部工具栏的 <strong style={labelStyle}>「+ 新建场景」</strong>，创建你的第一个场景（比如"上班"）</li>
                  <li>点击场景卡片上的 <strong style={labelStyle}>「✏️ 编辑」</strong> 按钮，进入场景详情页</li>
                  <li>点击 <strong style={labelStyle}>「添加启动项」</strong>，选择程序、文件或网址</li>
                  <li>需要启动时，点击场景卡片上的 <strong style={labelStyle}>「🚀 启动」</strong> 按钮，一键全部打开</li>
                </ol>
              </SectionCard>

              {/* 场景管理 */}
              <SectionCard icon="📁" title="场景管理">
                <ul style={listStyle}>
                  <li><strong style={labelStyle}>新建场景</strong>：点顶部工具栏「+ 新建场景」按钮，输入名称后创建</li>
                  <li><strong style={labelStyle}>重命名场景</strong>：右键场景选「编辑名称」或点卡片上的 ✏️，修改后按 Enter 确认、Esc 取消</li>
                  <li><strong style={labelStyle}>删除场景</strong>：点场景卡片上的 🗑️；或右键选「删除场景」</li>
                  <li><strong style={labelStyle}>进入场景详情</strong>：点场景卡片上的「✏️ 编辑」按钮</li>
                  <li><strong style={labelStyle}>切换视图</strong>：点顶部工具栏的视图切换按钮，可在网格和列表两种显示方式间切换</li>
                  <li><strong style={labelStyle}>场景数量限制</strong>：免费版最多 1 个场景，激活版不限</li>
                </ul>
              </SectionCard>

              {/* 启动项管理 */}
              <SectionCard icon="🚀" title="启动项管理">
                <ul style={listStyle}>
                  <li><strong style={labelStyle}>添加启动项</strong>：进入场景详情，点「添加启动项」，选择类型（程序/文件/文件夹/网址/图片），填写名称和路径</li>
                  <li><strong style={labelStyle}>批量添加</strong>：点「批量添加」，可一次选择多个程序、文件等快速导入（激活版专属）</li>
                  <li><strong style={labelStyle}>设置启动延迟</strong>：每个启动项可设置延迟秒数，错开启动时间避免卡顿（即将支持）</li>
                  <li><strong style={labelStyle}>拖拽排序</strong>：按住每个启动项最左侧的「⋮⋮」手柄上下拖动，调整启动顺序</li>
                  <li><strong style={labelStyle}>启用/禁用</strong>：点启动项左侧的滑块开关，关闭后启动场景时不会运行该启动项</li>
                  <li><strong style={labelStyle}>删除</strong>：点「🗑️ 删除」按钮移除启动项</li>
                  <li><strong style={labelStyle}>单项启动</strong>：点启动项右侧的「🚀 启动」按钮可单独运行它</li>
                  <li><strong style={labelStyle}>启动项数量限制</strong>：免费版每场景最多 3 个，激活版不限</li>
                </ul>
              </SectionCard>

              {/* 快捷键 */}
              <SectionCard icon="⌨️" title="快捷键">
                <ul style={listStyle}>
                  <li><strong style={labelStyle}>Ctrl + K</strong>：打开全局搜索，快速找到场景或启动项</li>
                  <li><strong style={labelStyle}>场景快捷键</strong>：右键场景 →「设置快捷键」→ 按下你想要的组合键，绑定后随时按快捷键启动该场景</li>
                  <li><strong style={labelStyle}>修改快捷键</strong>：再次右键场景 →「设置快捷键」重新录制即可</li>
                </ul>
              </SectionCard>

              {/* 右键菜单 */}
              <SectionCard icon="🖱️" title="右键菜单">
                <p style={{ margin: '0 0 8px', color: '#9ca3af', fontSize: '13px' }}>在场景卡片上右键点击，可执行以下操作：</p>
                <ul style={listStyle}>
                  <li><strong style={labelStyle}>编辑名称</strong>：进入编辑模式，修改后按 <kbd style={{ background: 'rgba(102,126,234,0.2)', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>Enter</kbd> 确认，按 <kbd style={{ background: 'rgba(102,126,234,0.2)', padding: '1px 6px', borderRadius: '4px', fontSize: '12px' }}>Esc</kbd> 取消</li>
                  <li><strong style={labelStyle}>设置快捷键</strong>：为场景绑定快捷键</li>
                  <li><strong style={labelStyle}>删除场景</strong>：删除该场景及其中所有启动项</li>
                </ul>
              </SectionCard>

              {/* 数据管理 */}
              <SectionCard icon="💾" title="数据管理">
                <ul style={listStyle}>
                  <li><strong style={labelStyle}>自动保存</strong>：所有操作自动保存，关闭软件不丢失数据</li>
                  <li><strong style={labelStyle}>导出场景</strong>：点顶部工具栏的「📤 导出」按钮，将所有场景保存为 JSON 文件</li>
                  <li><strong style={labelStyle}>导入场景</strong>：点「📥 导入」按钮，从 JSON 文件恢复场景数据（重复场景会自动跳过）</li>
                </ul>
              </SectionCard>

              {/* 窗口操作 */}
              <SectionCard icon="🪟" title="窗口操作">
                <ul style={listStyle}>
                  <li><strong style={labelStyle}>最小化</strong>：点软件窗口右上角的「─」按钮，最小化到任务栏</li>
                  <li><strong style={labelStyle}>最大化</strong>：点软件窗口右上角的「□」按钮，最大化/还原窗口</li>
                  <li><strong style={labelStyle}>关闭</strong>：点软件窗口右上角的「✕」按钮，弹出选择「最小化到托盘」或「退出程序」</li>
                  <li><strong style={labelStyle}>最小化到托盘</strong>：关闭后软件缩到右下角系统托盘，双击托盘图标重新打开</li>
                </ul>
              </SectionCard>

              {/* 搜索功能 */}
              <SectionCard icon="🔍" title="全局搜索">
                <ul style={listStyle}>
                  <li>点标题栏的「🔍 搜索」按钮，或按 <strong style={labelStyle}>Ctrl + K</strong></li>
                  <li>输入关键词可搜索场景名称或启动项名称</li>
                  <li>点击搜索结果直接跳转到对应场景或高亮对应启动项</li>
                </ul>
              </SectionCard>
            </div>
          )}

          {/* ======================== 功能介绍 ======================== */}
          {activeTab === 'feature' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* 支持的启动项类型 */}
              <SectionCard icon="🎯" title="支持的启动项类型">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {[
                    { icon: '🖥️', name: '应用程序', desc: '启动本地 exe 程序', color: '#3b82f6' },
                    { icon: '📄', name: '文件', desc: '打开任意类型的文件', color: '#10b981' },
                    { icon: '📁', name: '文件夹', desc: '打开指定文件夹', color: '#f59e0b' },
                    { icon: '🔗', name: '网址', desc: '在浏览器中打开网页', color: '#8b5cf6' },
                    { icon: '🖼️', name: '图片', desc: '查看图片文件', color: '#ec4899' },
                  ].map((item) => (
                    <div
                      key={item.name}
                      style={{
                        background: `${item.color}15`,
                        borderRadius: '10px',
                        padding: '14px',
                        border: `1px solid ${item.color}30`,
                      }}
                    >
                      <div style={{ fontSize: '18px', marginBottom: '6px' }}>{item.icon}</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{item.name}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>{item.desc}</div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* 核心功能 */}
              <SectionCard icon="⚡" title="核心功能">
                <ul style={listStyle}>
                  <li><strong style={{ color: '#10b981' }}>场景分组</strong> — 将启动项按场景分类管理，比如"上班"、"摸鱼"、"下班"不同场景</li>
                  <li><strong style={{ color: '#10b981' }}>一键批量启动</strong> — 点一下按钮，按顺序启动场景下所有已启用的启动项</li>
                  <li><strong style={{ color: '#10b981' }}>启动延迟</strong> — 每个启动项可单独设置延迟秒数，避免同时启动太多程序导致卡顿</li>
                  <li><strong style={{ color: '#10b981' }}>拖拽排序</strong> — 自由调整启动顺序，打造个性化工作流</li>
                  <li><strong style={{ color: '#10b981' }}>启用控制</strong> — 临时关掉某些启动项，下次启动时自动跳过</li>
                  <li><strong style={{ color: '#10b981' }}>场景快捷键</strong> — 为每个场景绑定全局快捷键，按一下就能启动</li>
                  <li><strong style={{ color: '#10b981' }}>全局搜索</strong> — Ctrl+K 快速查找场景和启动项</li>
                  <li><strong style={{ color: '#10b981' }}>数据导入导出</strong> — 一键备份/恢复所有场景配置</li>
                  <li><strong style={{ color: '#10b981' }}>系统托盘</strong> — 关闭后最小化到托盘，随时唤起</li>
                  <li><strong style={{ color: '#10b981' }}>数据持久化</strong> — 所有配置自动保存，重启软件不丢失</li>
                </ul>
              </SectionCard>

              {/* 适用场景 */}
              <SectionCard icon="💼" title="适用场景">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {[
                    { icon: '🏢', title: '上班族', desc: '一键打开办公软件、邮箱、协作工具' },
                    { icon: '👨‍💻', title: '程序员', desc: '快速启动 IDE、终端、数据库、文档' },
                    { icon: '🎨', title: '设计师', desc: '一键打开 PS、AI、Figma 等设计工具' },
                    { icon: '🎮', title: '游戏玩家', desc: '启动游戏平台、加速器、语音工具' },
                    { icon: '📊', title: '自媒体', desc: '快速打开剪辑软件、素材文件夹、发布平台' },
                    { icon: '🏠', title: '日常使用', desc: '启动常用软件、打开常访问的网页' },
                  ].map((item) => (
                    <div
                      key={item.title}
                      style={{
                        background: 'rgba(102, 126, 234, 0.08)',
                        borderRadius: '10px',
                        padding: '14px',
                        border: '1px solid rgba(102, 126, 234, 0.15)',
                      }}
                    >
                      <div style={{ fontSize: '18px', marginBottom: '6px' }}>{item.icon}</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{item.title}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>{item.desc}</div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}

          {/* ======================== 授权说明 ======================== */}
          {activeTab === 'license' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <SectionCard
                icon="💡"
                title="免费使用"
                style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)' }}
              >
                <p style={{ margin: 0, color: '#93c5fd', lineHeight: '1.8' }}>
                  启程典可以<strong>永久免费使用</strong>！未授权状态下可以创建{' '}
                  <strong>1 个场景</strong>，每个场景可添加 <strong>3 个启动项</strong>。
                  购买授权后可解锁全部功能。
                </p>
              </SectionCard>

              <SectionCard
                icon="⚠️"
                title="未授权限制"
                style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
              >
                <ul style={{ ...listStyle, color: '#fca5a5' }}>
                  <li>最多只能创建 <strong>1 个场景</strong></li>
                  <li>每个场景最多 <strong>3 个启动项</strong></li>
                  <li>无法使用<strong>批量添加</strong>功能</li>
                  <li>无法使用<strong>拖拽排序</strong>功能</li>
                </ul>
              </SectionCard>

              <SectionCard
                icon="✅"
                title="授权后权益"
                style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)' }}
              >
                <ul style={{ ...listStyle, color: '#6ee7b7' }}>
                  <li>无限制创建场景数量</li>
                  <li>每个场景无限制添加启动项</li>
                  <li>支持批量添加功能</li>
                  <li>支持拖拽自定义排序</li>
                  <li>享受后续所有功能更新</li>
                </ul>
              </SectionCard>

              <SectionCard
                icon="🔑"
                title="如何获取授权"
                style={{ background: 'rgba(102, 126, 234, 0.15)', border: '1px solid rgba(102, 126, 234, 0.3)' }}
              >
                <div style={{ color: '#c7d2fe', lineHeight: '2' }}>
                  <p style={{ marginBottom: '10px' }}><strong>步骤 1：</strong>点击顶部工具栏的「🔑」授权按钮</p>
                  <p style={{ marginBottom: '10px' }}><strong>步骤 2：</strong>复制您的机器码（点击即复制）</p>
                  <p style={{ marginBottom: '10px' }}><strong>步骤 3：</strong>联系客服，发送机器码获取授权码</p>
                  <p style={{ marginBottom: '14px' }}><strong>步骤 4：</strong>将授权码粘贴到输入框，点击「激活」</p>
                </div>
              </SectionCard>

              <SectionCard
                icon="💰"
                title="授权类型"
                style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { name: '月卡', price: '¥9.9', desc: '30 天使用期' },
                    { name: '白银版', price: '¥19.9', desc: '90 天使用期' },
                    { name: '黄金版', price: '¥39.9', desc: '365 天使用期' },
                    { name: '永久版', price: '¥99', desc: '一次购买，终身使用' },
                  ].map((item) => (
                    <div
                      key={item.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(245, 158, 11, 0.1)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{item.name}</span>
                        <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '12px' }}>{item.desc}</span>
                      </div>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#fbbf24' }}>{item.price}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}
        </div>

        {/* ── 底部按钮（始终固定在底部，不会被截断） ── */}
        <div
          style={{
            padding: '14px 24px',
            background: 'rgba(15, 15, 26, 0.4)',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            justifyContent: 'center',
            flexShrink: 0,
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
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
}
