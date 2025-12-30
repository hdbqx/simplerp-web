import { useState, useEffect, useRef } from 'react';
import { api, type Message, type Character, type Settings, type Group, type LorebookEntry } from './lib/db';
import { LLMClient } from './lib/llm';
import { translateToEnglish } from './lib/translate';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Send, Image as ImageIcon, Settings as SettingsIcon, Menu, Pencil, Plus, Trash2, X, Sparkles, BookOpen, Eraser, Save, Book, HardDrive, Users, RefreshCw } from 'lucide-react';

function App() {
  // --- 数据状态 ---
  const [viewMode, setViewMode] = useState<'char' | 'group'>('char');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<number>();
  const [selectedGroupId, setSelectedGroupId] = useState<number>();
  const [groupMemberIds, setGroupMemberIds] = useState<number[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<Settings>();
  const [lorebookEntries, setLorebookEntries] = useState<LorebookEntry[]>([]);
  
  // --- UI 状态 ---
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- 模态框状态 ---
  const [showSettings, setShowSettings] = useState(false);
  const [showCharEdit, setShowCharEdit] = useState(false);
  const [showGroupEdit, setShowGroupEdit] = useState(false);
  const [showLorebook, setShowLorebook] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);

  // --- 初始化加载 ---
  const loadData = async () => {
    try {
      const [c, g, s] = await Promise.all([
        api.characters.list(),
        api.groups.list(),
        api.settings.get()
      ]);
      setCharacters(c);
      setGroups(g);
      setSettings(s);
    } catch (e) {
      console.error("加载失败:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // --- 场景切换加载历史 ---
  useEffect(() => {
    setMessages([]);
    if (viewMode === 'char' && selectedCharId) {
      api.messages.list(selectedCharId).then(setMessages);
      api.lorebook.list(selectedCharId).then(setLorebookEntries);
    } else if (viewMode === 'group' && selectedGroupId) {
      api.groups.getMembers(selectedGroupId).then(setGroupMemberIds);
      api.messages.list(undefined, selectedGroupId).then(setMessages);
    }
  }, [selectedCharId, selectedGroupId, viewMode]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, isTyping]);

  // --- 核心对话逻辑 ---
  const triggerAI = async (char: Character, textOverride?: string, historyOverride?: Message[]) => {
    if (isTyping || !settings) return;
    setIsTyping(true);
    const tempTs = Date.now() + 1;
    const currentHistory = historyOverride || messages;
    
    // 预渲染占位符
    setMessages(prev => [...prev, { role: 'assistant', content: '...', char_id: char.id, timestamp: tempTs }]);
    
    const llm = new LLMClient(settings);
    let fullText = "";
    
    // 构造剧场上下文
    const groupCtx = viewMode === 'group' ? {
      name: groups.find(g => g.id === selectedGroupId)?.name || "剧场",
      description: groups.find(g => g.id === selectedGroupId)?.description || "",
      members: characters.filter(c => groupMemberIds.includes(c.id!))
    } : undefined;

    try {
      for await (const chunk of llm.chatStream(char, currentHistory, textOverride || "", settings, lorebookEntries, groupCtx)) {
        fullText += chunk;
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], content: fullText };
          return next;
        });
      }
      // 持久化到数据库
      await api.messages.add({ 
        role: 'assistant', 
        content: fullText, 
        char_id: char.id, 
        group_id: viewMode === 'group' ? selectedGroupId : undefined,
        timestamp: tempTs 
      });
    } catch (e) {
      console.error(e);
    }
    setIsTyping(false);
  };

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
    
    if (viewMode === 'char' && selectedCharId) {
      triggerAI(characters.find(c => c.id === selectedCharId)!, text);
    }
  };

  // --- 重新生成逻辑 ---
  const handleRegenerate = async () => {
    if (messages.length === 0 || isTyping) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'assistant') return;
    
    const newHistory = messages.slice(0, -1);
    setMessages(newHistory);
    if (lastMsg.id) await api.messages.delete(lastMsg.id);
    
    const lastUserMsg = [...newHistory].reverse().find(m => m.role === 'user');
    const char = characters.find(c => c.id === lastMsg.char_id);
    if (char) triggerAI(char, lastUserMsg?.content || "", newHistory);
  };

  // --- 新建角色/剧场逻辑 (彻底修复) ---
  const handleCreateNew = async () => {
    const name = prompt(`请输入新${viewMode === 'char' ? '角色' : '剧场'}名称:`);
    if (!name || name.trim() === "") return;

    try {
      if (viewMode === 'char') {
        const res = await api.characters.add({ 
          name: name.trim(), 
          description: "你是一个新角色。", 
          first_message: "你好！", 
          summary: "" 
        });
        await loadData();
        if (res?.id) setSelectedCharId(res.id);
      } else {
        const res = await api.groups.add({ 
          name: name.trim(), 
          description: "在此设定剧场背景..." 
        });
        await loadData();
        if (res?.id) setSelectedGroupId(res.id);
      }
    } catch (e: any) {
      alert("创建失败: " + e.message);
    }
  };

  // --- 生图逻辑 ---
  const handleGenImageAction = async () => {
    if (!settings?.sd_url) return alert("请配置 SD 地址");
    const p = genPrompt; setShowGenModal(false);
    try {
      const finalP = settings.baidu_appid ? await translateToEnglish(p, settings.baidu_appid, settings.baidu_secret!) : p;
      const res = await fetch(`${settings.sd_url.replace(/\/$/, '')}/sdapi/v1/txt2img`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `(masterpiece), anime style, ${finalP}`, steps: 20, width: 512, height: 768 })
      });
      const data = await res.json();
      const msg: Message = { 
        role: 'assistant', content: '', 
        image: `data:image/png;base64,${data.images[0]}`, 
        timestamp: Date.now(), 
        group_id: selectedGroupId, char_id: selectedCharId 
      };
      setMessages(prev => [...prev, msg]);
      await api.messages.add(msg);
    } catch (e: any) { alert(e.message); }
  };

  // --- 侧边栏组件 ---
  const Sidebar = () => (
    <div className="flex flex-col h-full bg-base-200 w-80 p-4 border-r border-base-content/10 shadow-xl overflow-hidden">
      <div className="flex justify-between items-center mb-6 pl-2">
        <h2 className="font-black text-primary text-xl tracking-tighter">SimpleRP Cloud</h2>
        <button className="md:hidden btn btn-ghost btn-xs" onClick={() => setMobileMenuOpen(false)}><X/></button>
      </div>
      <div className="tabs tabs-boxed mb-6">
        <button className={`tab flex-1 ${viewMode === 'char' ? 'tab-active font-bold' : ''}`} onClick={() => setViewMode('char')}>角色</button>
        <button className={`tab flex-1 ${viewMode === 'group' ? 'tab-active font-bold' : ''}`} onClick={() => setViewMode('group')}>剧场</button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
        {viewMode === 'char' ? characters.map(c => (
          <div key={c.id} onClick={() => { setSelectedCharId(c.id); setMobileMenuOpen(false); }} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group ${selectedCharId === c.id ? 'bg-primary text-primary-content shadow-lg' : 'hover:bg-base-300'}`}>
            <span className="font-bold truncate">{c.name}</span>
            <Trash2 size={14} className="opacity-0 group-hover:opacity-100 hover:text-error transition-all" onClick={(e) => { e.stopPropagation(); if(confirm("彻底删除角色及其私聊历史？")) api.characters.delete(c.id!).then(loadData); }} />
          </div>
        )) : groups.map(g => (
          <div key={g.id} onClick={() => { setSelectedGroupId(g.id); setMobileMenuOpen(false); }} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group ${selectedGroupId === g.id ? 'bg-secondary text-secondary-content shadow-lg' : 'hover:bg-base-300'}`}>
            <span className="font-bold truncate">{g.name}</span>
            <Trash2 size={14} className="opacity-0 group-hover:opacity-100 hover:text-error transition-all" onClick={(e) => { e.stopPropagation(); if(confirm("删除剧场？历史消息将同步删除。")) api.groups.delete(g.id!).then(loadData); }} />
          </div>
        ))}
        <button className="btn btn-outline btn-sm btn-block mt-4 border-dashed" onClick={handleCreateNew}><Plus size={16} /> 新建{viewMode==='char'?'角色':'剧场'}</button>
      </div>
      <div className="mt-4 pt-4 border-t border-base-content/10 space-y-2">
        <button className="btn btn-ghost btn-sm btn-block justify-start" onClick={() => {setShowSettings(true); setMobileMenuOpen(false);}}><SettingsIcon size={16} /> 系统设置</button>
      </div>
    </div>
  );

  const modelOptions = settings?.model_list?.split(',').map(m => m.trim()).filter(m => m) || [];

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-base-100"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

  return (
    <div className="drawer md:drawer-open h-[100dvh] w-full bg-base-100 overflow-hidden text-base-content">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" checked={mobileMenuOpen} onChange={e=>setMobileMenuOpen(e.target.checked)} />
      <div className="drawer-content flex flex-col h-full overflow-hidden relative">
        {/* 顶部 Navbar */}
        <div className="navbar bg-base-100 border-b border-base-300 px-4 sticky top-0 z-20">
          <div className="flex-none md:hidden"><button className="btn btn-square btn-ghost" onClick={()=>setMobileMenuOpen(true)}><Menu/></button></div>
          <div className="flex-1 font-bold truncate px-2">{viewMode==='char'?characters.find(c=>c.id===selectedCharId)?.name:groups.find(g=>g.id===selectedGroupId)?.name || "请选择"}</div>
          <div className="flex-none gap-2">
            {settings && (
              <select className="select select-bordered select-sm max-w-[6rem] md:max-w-[10rem] text-xs" value={settings.model || ''} onChange={async (e) => { const newM = e.target.value; setSettings({...settings, model: newM}); await api.settings.update({...settings, model: newM}); }}>
                {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
            <button className="btn btn-sm btn-ghost text-error" onClick={() => {if(confirm("清空对话？")) api.messages.clear(selectedCharId, selectedGroupId).then(()=>setMessages([]))}}><Eraser size={18}/></button>
            {viewMode === 'char' && selectedCharId && (
              <>
                <button className="btn btn-sm btn-ghost text-info" onClick={async ()=>{setIsSummarizing(true); const s=await new LLMClient(settings!).summarize(messages, settings!); api.characters.update(selectedCharId, {summary:s}).then(loadData); setIsSummarizing(false);}} disabled={isSummarizing}><BookOpen size={18}/></button>
                <button className="btn btn-sm btn-ghost text-warning" onClick={()=>setShowLorebook(true)}><Book size={18}/></button>
                <button className="btn btn-sm btn-primary btn-square" onClick={()=>setShowCharEdit(true)}><Pencil size={18}/></button>
              </>
            )}
            {viewMode === 'group' && selectedGroupId && <button className="btn btn-sm btn-secondary btn-square" onClick={()=>setShowGroupEdit(true)}><Users size={18}/></button>}
          </div>
        </div>

        {/* 消息展示区 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            const name = isUser ? 'User' : (characters.find(c=>c.id===m.char_id)?.name || 'AI');
            const isLast = idx === messages.length - 1;
            return (
              <div key={idx} className={`chat ${isUser ? 'chat-end' : 'chat-start'} group`}>
                <div className="chat-header opacity-50 text-[10px] mb-1 flex items-center gap-2">
                    {name}
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                        {!m.image && <button className="hover:text-primary" onClick={()=>{setEditingMsgId(m.id!); setEditContent(m.content)}}><Pencil size={10}/></button>}
                        {!isUser && isLast && <button className="hover:text-primary" onClick={handleRegenerate}><RefreshCw size={10}/></button>}
                        <button className="hover:text-error" onClick={async ()=>{if(confirm("删除该条?")) {await api.messages.delete(m.id!); setMessages(messages.filter(msg=>msg.id!==m.id))}}}><Trash2 size={10}/></button>
                    </div>
                </div>
                {m.image ? <div className="chat-bubble p-1 bg-base-200 border border-base-300 shadow-xl overflow-hidden"><img src={m.image} className="max-w-xs md:max-w-md rounded-lg"/></div> : (
                  <div className={`chat-bubble shadow-lg border ${isUser ? 'chat-bubble-primary border-primary' : 'bg-base-200 text-base-content border-base-300'}`}>
                    {editingMsgId === m.id ? (
                        <div className="flex flex-col gap-2 min-w-[200px]"><textarea className="textarea textarea-bordered textarea-sm w-full bg-base-100" value={editContent} onChange={e=>setEditContent(e.target.value)}/><div className="flex justify-end gap-1"><button className="btn btn-xs" onClick={()=>setEditingMsgId(null)}>取消</button><button className="btn btn-xs btn-primary" onClick={async ()=>{await api.messages.update(m.id!, editContent); setMessages(messages.map(msg=>msg.id===m.id?{...msg, content:editContent}:msg)); setEditingMsgId(null)}}>保存</button></div></div>
                    ) : <div className="prose prose-sm break-words text-inherit"><ReactMarkdown rehypePlugins={[rehypeRaw]}>{m.content}</ReactMarkdown></div>}
                  </div>
                )}
              </div>
            );
          })}
          {isTyping && <div className="chat chat-start opacity-50 animate-pulse"><div className="chat-bubble">Thinking...</div></div>}
          <div ref={bottomRef} className="h-20" />
        </div>

        {/* 底部输入区 */}
        <div className="p-4 bg-base-100 border-t border-base-300">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
            {/* 剧场角色点名条 */}
            {viewMode === 'group' && selectedGroupId && (
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {characters.filter(c => groupMemberIds.includes(c.id!)).map(m => (
                  <button key={m.id} onClick={() => triggerAI(m)} disabled={isTyping} className="btn btn-xs btn-outline btn-secondary whitespace-nowrap rounded-full">@{m.name}</button>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-end bg-base-200 p-2 rounded-2xl shadow-inner border border-base-300">
              <button className="btn btn-circle btn-ghost btn-sm text-accent" onClick={()=>{setGenPrompt(messages[messages.length-1]?.content || ""); setShowGenModal(true)}}><ImageIcon size={20}/></button>
              <textarea className="textarea textarea-ghost flex-1 min-h-[2.5rem] max-h-48 resize-none py-2 px-2 focus:outline-none" rows={1} value={input} onChange={e=>{setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=e.target.scrollHeight+'px'}} placeholder="发送消息..." onKeyDown={e=>{if(e.key==='Enter' && !e.shiftKey){e.preventDefault(); handleSend();}}} />
              <button className="btn btn-circle btn-primary btn-sm shadow-lg" onClick={handleSend} disabled={!input.trim() || isTyping}><Send size={18}/></button>
            </div>
          </div>
        </div>
      </div>

      <div className="drawer-side z-50"><label htmlFor="my-drawer" className="drawer-overlay"></label><Sidebar /></div>

      {/* 剧场管理模态框 */}
      {showGroupEdit && selectedGroupId && (
          <div className="modal modal-open">
              <div className="modal-box max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b flex justify-between bg-base-200"><h3 className="font-bold text-xl flex items-center gap-2"><Users/> 剧场成员与背景</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowGroupEdit(false)}><X /></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="form-control"><label className="label font-bold">剧场名</label><input className="input input-bordered" value={groups.find(g => g.id === selectedGroupId)?.name} onChange={e => setGroups(groups.map(g => g.id === selectedGroupId ? { ...g, name: e.target.value } : g))} /></div>
                      <div className="form-control"><label className="label font-bold">剧场场景设定</label><textarea className="textarea textarea-bordered h-48 font-mono text-sm" value={groups.find(g => g.id === selectedGroupId)?.description} onChange={e => setGroups(groups.map(g => g.id === selectedGroupId ? { ...g, description: e.target.value } : g))} /></div>
                      <div className="space-y-4">
                          <label className="label font-bold text-primary text-sm">勾选剧员 (勾选即代表加入)</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {characters.map(c => (
                                  <label key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${groupMemberIds.includes(c.id!) ? 'border-primary bg-primary/10' : 'border-base-300 hover:border-base-content/20'}`}>
                                      <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={groupMemberIds.includes(c.id!)} onChange={e => {
                                          const nextIds = e.target.checked ? [...groupMemberIds, c.id!] : groupMemberIds.filter(id => id !== c.id);
                                          setGroupMemberIds(nextIds);
                                      }} />
                                      <span className="text-sm font-medium truncate">{c.name}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="p-6 border-t bg-base-200 flex justify-end gap-2"><button className="btn btn-primary btn-block md:w-auto" onClick={async ()=>{const g=groups.find(grp=>grp.id===selectedGroupId); if(g){await api.groups.update(selectedGroupId, {...g, memberIds: groupMemberIds}); setShowGroupEdit(false); alert("保存成功")}}}>保存设定</button></div>
              </div>
          </div>
      )}

      {/* 角色编辑模态框 */}
      {showCharEdit && selectedCharId && (
          <div className="modal modal-open">
              <div className="modal-box max-w-2xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b flex justify-between bg-base-200"><h3 className="font-bold text-lg">角色档案</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowCharEdit(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-control"><label className="label font-bold text-xs">独立模型 ID</label><input className="input input-bordered" placeholder="例如 deepseek-chat" value={characters.find(c => c.id === selectedCharId)?.model_id || ''} onChange={e => setCharacters(characters.map(c => c.id === selectedCharId ? { ...c, model_id: e.target.value } : c))} /></div>
                        <div className="form-control"><label className="label font-bold text-xs">独立 API 地址</label><input className="input input-bordered" placeholder="默认全局" value={characters.find(c => c.id === selectedCharId)?.api_base_override || ''} onChange={e => setCharacters(characters.map(c => c.id === selectedCharId ? { ...c, api_base_override: e.target.value } : c))} /></div>
                      </div>
                      <div className="form-control"><label className="label font-bold text-sm">角色名</label><input className="input input-bordered" value={characters.find(c => c.id === selectedCharId)?.name} onChange={e => setCharacters(characters.map(c => c.id === selectedCharId ? { ...c, name: e.target.value } : c))} /></div>
                      <div className="form-control"><label className="label font-bold text-sm">角色设定</label><textarea className="textarea textarea-bordered h-48 font-mono text-xs" value={characters.find(c => c.id === selectedCharId)?.description} onChange={e => setCharacters(characters.map(c => c.id === selectedCharId ? { ...c, description: e.target.value } : c))} /></div>
                      <div className="form-control"><label className="label font-bold text-sm">记忆摘要</label><textarea className="textarea textarea-bordered h-24 font-mono text-xs" value={characters.find(c => c.id === selectedCharId)?.summary} onChange={e => setCharacters(characters.map(c => c.id === selectedCharId ? { ...c, summary: e.target.value } : c))} /></div>
                  </div>
                  <div className="p-4 border-t bg-base-200 flex justify-end"><button className="btn btn-primary btn-block" onClick={async ()=>{await api.characters.update(selectedCharId, characters.find(c=>c.id===selectedCharId)!); setShowCharEdit(false); loadData();}}>保存修改</button></div>
              </div>
          </div>
      )}

      {/* 设置模态框 */}
      {showSettings && settings && (
          <div className="modal modal-open">
              <div className="modal-box max-w-lg">
                  <div className="flex justify-between items-center mb-6 font-bold text-lg">系统配置<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowSettings(false)}><X/></button></div>
                  <div className="space-y-4">
                      <div className="form-control"><label className="label text-xs font-bold uppercase">API Config</label><input className="input input-bordered w-full mb-2" placeholder="API Base" value={settings.api_base} onChange={e=>setSettings({...settings, api_base:e.target.value})} /><input className="input input-bordered w-full" placeholder="API Key" type="password" value={settings.api_key} onChange={e=>setSettings({...settings, api_key:e.target.value})} /></div>
                      <div className="form-control"><label className="label text-xs font-bold uppercase">模型列表 (逗号隔开)</label><textarea className="textarea textarea-bordered w-full text-xs h-24" value={settings.model_list} onChange={e=>setSettings({...settings, model_list:e.target.value})} /></div>
                      <div className="form-control"><label className="label text-xs font-bold uppercase">SD URL</label><input className="input input-bordered w-full" value={settings.sd_url} onChange={e=>setSettings({...settings, sd_url:e.target.value})} /></div>
                      <div className="divider">Danger Zone</div>
                      <button className="btn btn-error btn-outline btn-block btn-sm" onClick={()=>{if(confirm("确定清理所有生成图片？")) api.messages.clearAllImages().then(()=>alert("清理完成"))}}><HardDrive size={16}/> 清理所有生成图片</button>
                  </div>
                  <div className="modal-action"><button className="btn btn-primary btn-block" onClick={async ()=>{await api.settings.update(settings); setShowSettings(false); loadData();}}>保存并应用</button></div>
              </div>
          </div>
      )}

      {/* 生图模态框 */}
      {showGenModal && (
          <div className="modal modal-open">
              <div className="modal-box"><h3 className="font-bold text-lg mb-4 flex items-center gap-2"><ImageIcon/> 描述画面</h3><textarea className="textarea textarea-bordered w-full h-32" value={genPrompt} onChange={e=>setGenPrompt(e.target.value)} /><div className="modal-action"><button className="btn btn-primary flex-1" onClick={handleGenImageAction}>开始生成</button><button className="btn flex-1" onClick={()=>setShowGenModal(false)}>取消</button></div></div>
          </div>
      )}

      {/* 世界书模态框 */}
      {showLorebook && selectedCharId && (
          <div className="modal modal-open">
              <div className="modal-box max-w-2xl h-[70vh] flex flex-col p-0">
                  <div className="p-4 border-b flex justify-between bg-base-200 font-bold">世界书设定<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowLorebook(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {lorebookEntries.map(e => (
                        <div key={e.id} className="collapse collapse-arrow bg-base-200"><input type="checkbox"/><div className="collapse-title text-sm font-bold">{e.keywords}</div><div className="collapse-content space-y-2"><textarea className="textarea textarea-bordered w-full h-24 text-xs font-mono" defaultValue={e.content} onBlur={(evt)=>api.lorebook.update(e.id!, {content: evt.target.value})} /><div className="flex gap-2"><input className="input input-bordered input-sm flex-1 text-xs" defaultValue={e.keywords} onBlur={(evt)=>api.lorebook.update(e.id!, {keywords: evt.target.value})} /><button className="btn btn-sm btn-error" onClick={()=>api.lorebook.delete(e.id!).then(()=>api.lorebook.list(selectedCharId).then(setLorebookEntries))}>删除</button></div></div></div>
                    ))}
                    <button className="btn btn-block btn-outline border-dashed btn-sm" onClick={()=>api.lorebook.add({char_id:selectedCharId, keywords:"新条目", content:"", isActive:true}).then(()=>api.lorebook.list(selectedCharId).then(setLorebookEntries))}>+ 添加词条</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default App;