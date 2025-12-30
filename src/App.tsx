import { useState, useEffect, useRef } from 'react';
import { api, type LorebookEntry, type Message, type Character, type Settings, type Group } from './lib/db';
import { LLMClient } from './lib/llm';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Send, Image as ImageIcon, Settings as SettingsIcon, Menu, Pencil, Plus, Trash2, X, Sparkles, BookOpen, Eraser, Save, Copy, RefreshCw, Book, HelpCircle, HardDrive, Users } from 'lucide-react';

function App() {
  const [viewMode, setViewMode] = useState<'char' | 'group'>('char');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<number>();
  const [selectedGroupId, setSelectedGroupId] = useState<number>();
  const [groupMembers, setGroupMembers] = useState<Character[]>([]);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<Settings>();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showCharEdit, setShowCharEdit] = useState(false);
  const [showGroupEdit, setShowGroupEdit] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
        const chars = await api.characters.list();
        const grps = await api.groups.list();
        setCharacters(chars);
        setGroups(grps);
        const st = await api.settings.get();
        setSettings(st);
    } catch(e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { 
    if (viewMode === 'char' && selectedCharId) {
        api.messages.list(selectedCharId).then(setMessages);
    } else if (viewMode === 'group' && selectedGroupId) {
        api.groups.getMembers(selectedGroupId).then(setGroupMembers);
        api.messages.list(undefined, selectedGroupId).then(setMessages);
    }
  }, [selectedCharId, selectedGroupId, viewMode]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || !settings) return;
    const text = input; setInput('');
    const userMsg: Message = { 
        role: 'user', content: text, timestamp: Date.now(), 
        char_id: viewMode === 'char' ? selectedCharId : undefined,
        group_id: viewMode === 'group' ? selectedGroupId : undefined
    };
    setMessages(prev => [...prev, userMsg]);
    await api.messages.add(userMsg);
  };

  const handleTriggerAI = async (char: Character) => {
    if (isTyping || !settings) return;
    setIsTyping(true);
    const tempTimestamp = Date.now();
    setMessages(prev => [...prev, { role: 'assistant', char_id: char.id, content: '...', timestamp: tempTimestamp }]);
    
    const llm = new LLMClient();
    let fullText = "";
    const groupCtx = viewMode === 'group' ? { 
        name: groups.find(g => g.id === selectedGroupId)!.name,
        description: groups.find(g => g.id === selectedGroupId)!.description,
        members: groupMembers
    } : undefined;

    try {
        for await (const chunk of llm.chatStream(char, messages, "", settings, [], groupCtx)) {
            fullText += chunk;
            setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1].content = fullText;
                return copy;
            });
        }
        await api.messages.add({ 
            role: 'assistant', char_id: char.id, content: fullText, 
            timestamp: tempTimestamp, 
            group_id: viewMode === 'group' ? selectedGroupId : undefined 
        });
    } catch (e) {}
    setIsTyping(false);
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-base-200 w-80 p-4 border-r border-base-content/10 shadow-2xl">
      <div className="tabs tabs-boxed mb-6">
        <button className={`tab flex-1 ${viewMode==='char'?'tab-active':''}`} onClick={()=>setViewMode('char')}>单人</button>
        <button className={`tab flex-1 ${viewMode==='group'?'tab-active':''}`} onClick={()=>setViewMode('group')}>剧场</button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {viewMode === 'char' ? characters.map(c => (
          <div key={c.id} onClick={()=>setSelectedCharId(c.id)} className={`p-3 rounded-lg cursor-pointer transition-all ${selectedCharId===c.id?'bg-primary text-primary-content shadow-md':'hover:bg-base-300'}`}>
            <div className="font-bold truncate">{c.name}</div>
          </div>
        )) : groups.map(g => (
          <div key={g.id} onClick={()=>setSelectedGroupId(g.id)} className={`p-3 rounded-lg cursor-pointer transition-all ${selectedGroupId===g.id?'bg-secondary text-secondary-content shadow-md':'hover:bg-base-300'}`}>
            <div className="font-bold truncate">{g.name}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-base-content/10">
        <button className="btn btn-outline btn-sm btn-block" onClick={()=>setShowSettings(true)}><SettingsIcon size={16}/> 系统设置</button>
      </div>
    </div>
  );

  if (isLoading) return <div className="h-screen flex items-center justify-center"><span className="loading loading-dots loading-lg"></span></div>;

  const currentHeaderName = viewMode === 'char' ? characters.find(c => c.id === selectedCharId)?.name : groups.find(g => g.id === selectedGroupId)?.name;

  return (
    <div className="drawer md:drawer-open h-[100dvh] w-full bg-base-100">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" checked={mobileMenuOpen} onChange={e=>setMobileMenuOpen(e.target.checked)} />
      <div className="drawer-content flex flex-col h-full relative">
        {/* 顶部导航 */}
        <div className="navbar bg-base-100 border-b border-base-300 px-4">
            <div className="flex-1 font-bold text-lg">{currentHeaderName || "SimpleRP Theater"}</div>
            <div className="flex-none gap-2">
                <button className="btn btn-sm btn-ghost" onClick={() => { if(confirm("清空对话？")) { api.messages.clear(selectedCharId, selectedGroupId).then(()=>setMessages([])); } }}><Eraser size={18}/></button>
                {viewMode === 'char' && selectedCharId && <button className="btn btn-sm btn-primary" onClick={()=>setShowCharEdit(true)}><Pencil size={16}/></button>}
                {viewMode === 'group' && selectedGroupId && <button className="btn btn-sm btn-secondary" onClick={()=>setShowGroupEdit(true)}><Book size={16}/></button>}
            </div>
        </div>

        {/* 消息区 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.map((m, idx) => {
                const sender = m.role === 'user' ? '用户' : (characters.find(c => c.id === m.char_id)?.name || 'AI');
                return (
                    <div key={idx} className={`chat ${m.role==='user'?'chat-end':'chat-start'}`}>
                        <div className="chat-header opacity-50 text-xs mb-1">{sender}</div>
                        <div className={`chat-bubble shadow-md ${m.role==='user'?'chat-bubble-primary':'bg-base-200 text-base-content'}`}>
                            <div className="prose prose-sm"><ReactMarkdown rehypePlugins={[rehypeRaw]}>{m.content}</ReactMarkdown></div>
                        </div>
                    </div>
                );
            })}
            {isTyping && <div className="chat chat-start"><div className="chat-bubble animate-pulse opacity-50">正在思考...</div></div>}
            <div ref={bottomRef} />
        </div>

        {/* 底部输入区 */}
        <div className="p-4 bg-base-100 border-t border-base-300">
            {/* AI点名条 (斗兽场核心) */}
            {viewMode === 'group' && selectedGroupId && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                    {groupMembers.map(m => (
                        <button key={m.id} onClick={()=>handleTriggerAI(m)} disabled={isTyping} className="btn btn-xs btn-outline btn-secondary whitespace-nowrap">@{m.name}</button>
                    ))}
                    <button className="btn btn-xs btn-ghost" onClick={async () => {
                        const cid = prompt("请输入要加入剧场的角色ID:");
                        if(cid) { /* 此处需后端支持追加成员，逻辑略 */ }
                    }}><Plus size={12}/></button>
                </div>
            )}
            {viewMode === 'char' && selectedCharId && (
                <div className="flex gap-2 mb-3">
                    <button onClick={()=>handleTriggerAI(characters.find(c=>c.id===selectedCharId)!)} disabled={isTyping} className="btn btn-xs btn-primary">请求回复</button>
                </div>
            )}
            <div className="flex gap-2 items-end bg-base-200 p-2 rounded-2xl">
                <textarea className="textarea textarea-ghost flex-1 min-h-[2.5rem] resize-none" rows={1} value={input} onChange={e=>setInput(e.target.value)} placeholder="输入指令..." />
                <button className="btn btn-circle btn-primary btn-sm" onClick={handleSend}><Send size={18}/></button>
            </div>
        </div>
      </div>
      <div className="drawer-side"><label htmlFor="my-drawer" className="drawer-overlay"></label><Sidebar /></div>

      {/* 设置模态框 */}
      {showSettings && (
          <div className="modal modal-open">
              <div className="modal-box max-w-lg">
                  <h3 className="font-bold text-lg mb-4">系统设置</h3>
                  <div className="space-y-4">
                      <div><label className="label text-xs font-bold">API Base</label><input className="input input-bordered w-full" value={settings?.api_base} onChange={e=>setSettings({...settings!, api_base: e.target.value})} /></div>
                      <div><label className="label text-xs font-bold">API Key</label><input type="password" className="input input-bordered w-full" value={settings?.api_key} onChange={e=>setSettings({...settings!, api_key: e.target.value})} /></div>
                      <div><label className="label text-xs font-bold">模型列表 (逗号隔开)</label><textarea className="textarea textarea-bordered w-full" value={settings?.model_list} onChange={e=>setSettings({...settings!, model_list: e.target.value})} /></div>
                  </div>
                  <div className="modal-action">
                      <button className="btn btn-primary" onClick={()=>{api.settings.update(settings!); setShowSettings(false);}}>保存</button>
                      <button className="btn" onClick={()=>setShowSettings(false)}>取消</button>
                  </div>
              </div>
          </div>
      )}

      {/* 角色编辑 (支持一员一模) */}
      {showCharEdit && selectedCharId && (
          <div className="modal modal-open">
              <div className="modal-box max-w-2xl h-[80vh] flex flex-col">
                  <h3 className="font-bold text-lg mb-4">角色档案 (多模型驱动)</h3>
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                      <div><label className="label text-xs font-bold">独立模型ID (如 ep-xxx)</label><input className="input input-bordered w-full text-sm" value={characters.find(c=>c.id===selectedCharId)?.model_id || ''} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, model_id: e.target.value}:c))} /></div>
                      <div><label className="label text-xs font-bold">独立API地址 (可选)</label><input className="input input-bordered w-full text-sm" value={characters.find(c=>c.id===selectedCharId)?.api_base_override || ''} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, api_base_override: e.target.value}:c))} /></div>
                      <div><label className="label text-xs font-bold">设定 (Prompt)</label><textarea className="textarea textarea-bordered w-full h-48 text-xs font-mono" value={characters.find(c=>c.id===selectedCharId)?.description} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, description: e.target.value}:c))} /></div>
                  </div>
                  <div className="modal-action">
                      <button className="btn btn-primary" onClick={()=>{api.characters.update(selectedCharId, characters.find(c=>c.id===selectedCharId)!); setShowCharEdit(false);}}>保存配置</button>
                      <button className="btn" onClick={()=>setShowCharEdit(false)}>关闭</button>
                  </div>
              </div>
          </div>
      )}

      {/* 剧场编辑 */}
      {showGroupEdit && selectedGroupId && (
          <div className="modal modal-open">
              <div className="modal-box max-w-2xl">
                  <h3 className="font-bold text-lg mb-4">剧场/群聊大背景</h3>
                  <textarea className="textarea textarea-bordered w-full h-64 font-mono text-sm" value={groups.find(g=>g.id===selectedGroupId)?.description} onChange={e=>setGroups(groups.map(g=>g.id===selectedGroupId?{...g, description: e.target.value}:g))} />
                  <div className="modal-action">
                      <button className="btn btn-secondary" onClick={()=>{api.groups.update(selectedGroupId, groups.find(g=>g.id===selectedGroupId)!); setShowGroupEdit(false);}}>保存背景</button>
                      <button className="btn" onClick={()=>setShowGroupEdit(false)}>取消</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
export default App;