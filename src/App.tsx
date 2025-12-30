import { useState, useEffect, useRef } from 'react';
import { api, type Message, type Character, type Settings, type Group, type LorebookEntry, type ApiPreset } from './lib/db';
import { LLMClient } from './lib/llm';
import { translateToEnglish } from './lib/translate';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Send, Image as ImageIcon, Settings as SettingsIcon, Menu, Pencil, Plus, Trash2, X, Sparkles, BookOpen, Eraser, Save, Book, HardDrive, Users, RefreshCw, Square } from 'lucide-react';

function App() {
  const [viewMode, setViewMode] = useState<'char' | 'group'>('char');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [presets, setPresets] = useState<ApiPreset[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<number>();
  const [selectedGroupId, setSelectedGroupId] = useState<number>();
  const [groupMemberIds, setGroupMemberIds] = useState<number[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<Settings>();
  const [lorebookEntries, setLorebookEntries] = useState<LorebookEntry[]>([]);
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showCharEdit, setShowCharEdit] = useState(false);
  const [showGroupEdit, setShowGroupEdit] = useState(false);
  const [showLorebook, setShowLorebook] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  const loadData = async () => {
    try {
        const [c, g, s, p] = await Promise.all([api.characters.list(), api.groups.list(), api.settings.get(), api.presets.list()]);
        setCharacters(c); setGroups(g); setSettings(s); setPresets(p);
    } catch(e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

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

  const stopGeneration = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsTyping(false);
    }
  };

  // 仅展示关键函数 triggerAI 的修改部分

  const triggerAI = async (char: Character, textOverride?: string, historyOverride?: Message[]) => {
    if (isTyping || !settings) return;
    
    // 创建控制器并存入 ref，供手动停止按钮使用
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setIsTyping(true);
    const tempTs = Date.now() + 1;
    const currentHistory = historyOverride || messages;
    
    // UI 占位
    setMessages(prev => [...prev, { role: 'assistant', content: '', char_id: char.id, timestamp: tempTs }]);
    
    const llm = new LLMClient(settings);
    let fullContent = "";

    try {
      const stream = llm.chatStream(
        char, currentHistory, textOverride || "", 
        settings, lorebookEntries, 
        viewMode === 'group' ? {
          name: groups.find(g => g.id === selectedGroupId)?.name || "",
          description: groups.find(g => g.id === selectedGroupId)?.description || "",
          members: characters.filter(c => groupMemberIds.includes(c.id!))
        } : undefined,
        presets, 
        controller // 【修改】：传入控制器
      );

      for await (const chunk of stream) {
        fullContent += chunk;
        setMessages(prev => { 
            const copy = [...prev]; 
            if(copy.length > 0) copy[copy.length-1].content = fullContent;
            return copy; 
        });
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log("生成已停止（用户手动或系统截断）");
      } else {
        console.error("生成出错:", e);
      }
    } finally {
      // 【关键修复】：无论是因为正常结束、用户点击停止、还是正则截断，只要有内容生成，就保存
      if (fullContent.trim().length > 0) {
          const res = await api.messages.add({ 
            role: 'assistant', 
            content: fullContent, 
            char_id: char.id, 
            group_id: viewMode === 'group' ? selectedGroupId : undefined, 
            timestamp: tempTs 
          });
          // 同步数据库分配的 ID 到 state，确保删除按钮有效
          setMessages(prev => prev.map(m => m.timestamp === tempTs ? { ...m, id: res.id } : m));
      } else {
          // 如果真的没出货，就把那个空的占位删掉
          setMessages(prev => prev.filter(m => m.timestamp !== tempTs));
      }
      
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !settings || isTyping) return;
    const text = input; setInput('');
    const tx = document.querySelector('textarea');
    if (tx) tx.style.height = 'auto';

    const timestamp = Date.now();
    const userMsg: Message = { 
      role: 'user', content: text, timestamp,
      char_id: viewMode === 'char' ? selectedCharId : undefined,
      group_id: viewMode === 'group' ? selectedGroupId : undefined
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await api.messages.add(userMsg);
      setMessages(prev => prev.map(m => m.timestamp === timestamp ? { ...m, id: res.id } : m));
      if (viewMode === 'char' && selectedCharId) {
        triggerAI(characters.find(c=>c.id===selectedCharId)!, text, [...messages, { ...userMsg, id: res.id }]);
      }
    } catch (e) { console.error(e); }
  };

  const handleRegenerate = async () => {
    if (messages.length === 0 || isTyping) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'assistant') return;
    const newHistory = messages.slice(0, -1);
    setMessages(newHistory);
    if (lastMsg.id) await api.messages.delete(lastMsg.id);
    const char = characters.find(c => c.id === lastMsg.char_id);
    const lastUserMsg = [...newHistory].reverse().find(m => m.role === 'user');
    if (char) triggerAI(char, lastUserMsg?.content || "", newHistory);
  };

  const handleGenImageAction = async () => {
    if (!settings?.sd_url) return alert("请设置 SD URL");
    const p = genPrompt; setShowGenModal(false);
    try {
        const finalP = settings.baidu_appid ? await translateToEnglish(p, settings.baidu_appid, settings.baidu_secret!) : p;
        const res = await fetch(`${settings.sd_url.replace(/\/$/, '')}/sdapi/v1/txt2img`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: `(masterpiece), anime style, ${finalP}`, steps: 20, width: 512, height: 768 })
        });
        const data = await res.json();
        const msgData = { role: 'assistant' as const, content: '', image: `data:image/png;base64,${data.images[0]}`, timestamp: Date.now(), group_id: selectedGroupId, char_id: selectedCharId };
        const dbRes = await api.messages.add(msgData);
        setMessages(prev => [...prev, { ...msgData, id: dbRes.id }]);
    } catch (e: any) { alert(e.message); }
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-base-200 w-80 p-4 border-r border-base-content/10 shadow-xl overflow-hidden">
      <div className="flex justify-between items-center mb-6 pl-2">
        <h2 className="font-black text-primary text-xl">SimpleRP Cloud</h2>
        <button className="md:hidden btn btn-ghost btn-xs" onClick={() => setMobileMenuOpen(false)}><X/></button>
      </div>
      <div className="tabs tabs-boxed mb-6">
        <button className={`tab flex-1 transition-all ${viewMode === 'char' ? 'tab-active font-bold' : ''}`} onClick={() => setViewMode('char')}>单人</button>
        <button className={`tab flex-1 transition-all ${viewMode === 'group' ? 'tab-active font-bold' : ''}`} onClick={() => setViewMode('group')}>剧场</button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1 text-base-content">
        {viewMode === 'char' ? characters.map(c => (
          <div key={c.id} onClick={() => { setSelectedCharId(c.id); setMobileMenuOpen(false); }} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group ${selectedCharId === c.id ? 'bg-primary text-primary-content shadow-lg' : 'hover:bg-base-300'}`}>
            <span className="font-bold truncate">{c.name}</span>
            <Trash2 size={14} className="opacity-0 group-hover:opacity-100 hover:text-error" onClick={(e) => { e.stopPropagation(); if(confirm("删除角色?")) api.characters.delete(c.id!).then(() => loadData()); }} />
          </div>
        )) : groups.map(g => (
          <div key={g.id} onClick={() => { setSelectedGroupId(g.id); setMobileMenuOpen(false); }} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group ${selectedGroupId === g.id ? 'bg-secondary text-secondary-content shadow-lg' : 'hover:bg-base-300'}`}>
            <span className="font-bold truncate">{g.name}</span>
            <Trash2 size={14} className="opacity-0 group-hover:opacity-100 hover:text-error" onClick={(e) => { e.stopPropagation(); if(confirm("删除剧场?")) api.groups.delete(g.id!).then(() => loadData()); }} />
          </div>
        ))}
        <button className="btn btn-outline btn-sm btn-block mt-4 border-dashed" onClick={async () => { const n = prompt("名称?"); if(n) { if(viewMode==='char') await api.characters.add({name:n, description:"", first_message:"你好", summary:""}); else await api.groups.add({name:n, description:""}); await loadData(); } }}><Plus size={16} /> 新建</button>
      </div>
      <div className="mt-4 pt-4 border-t border-base-content/10"><button className="btn btn-ghost btn-sm btn-block justify-start" onClick={() => {setShowSettings(true); setMobileMenuOpen(false);}}><SettingsIcon size={16} /> 设置</button></div>
    </div>
  );

  const modelOptions = settings?.model_list?.split(',').map(m => m.trim()).filter(m => m) || [];

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-base-100 text-base-content"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

  return (
    <div className="drawer md:drawer-open h-[100dvh] w-full bg-base-100 overflow-hidden text-base-content">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" checked={mobileMenuOpen} onChange={e=>setMobileMenuOpen(e.target.checked)} />
      <div className="drawer-content flex flex-col h-full overflow-hidden relative">
        <div className="navbar bg-base-100 border-b border-base-300 px-4 sticky top-0 z-20">
          <div className="flex-none md:hidden"><button className="btn btn-square btn-ghost" onClick={()=>setMobileMenuOpen(true)}><Menu/></button></div>
          <div className="flex-1 font-bold truncate px-2">{viewMode==='char'?characters.find(c=>c.id===selectedCharId)?.name:groups.find(g=>g.id===selectedGroupId)?.name || "请选择"}</div>
          <div className="flex-none gap-2">
            {settings && (
              <select className="select select-bordered select-sm max-w-[6rem] md:max-w-[10rem] text-xs" value={settings.model || ''} onChange={async (e) => { const newM = e.target.value; setSettings({...settings, model: newM}); await api.settings.update({...settings, model: newM}); }}>
                <option value="">未选择模型</option>
                {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
            <button className="btn btn-sm btn-ghost text-error" onClick={() => {if(confirm("清空对话？")) api.messages.clear(selectedCharId, selectedGroupId).then(()=>setMessages([]))}}><Eraser size={18}/></button>
            {viewMode === 'char' && selectedCharId && (
              <>
                <button className="btn btn-sm btn-ghost text-info" title="总结对话" onClick={async ()=>{const s=await new LLMClient(settings!).summarize(messages, settings!); await api.characters.update(selectedCharId, {summary:s}); loadData(); alert("已更新总结");}}><BookOpen size={18}/></button>
                <button className="btn btn-sm btn-ghost text-warning" title="世界书" onClick={()=>setShowLorebook(true)}><Book size={18}/></button>
                <button className="btn btn-sm btn-primary" onClick={()=>setShowCharEdit(true)}><Pencil size={18}/></button>
              </>
            )}
            {viewMode === 'group' && selectedGroupId && <button className="btn btn-sm btn-secondary" onClick={()=>setShowGroupEdit(true)}><Users size={18}/></button>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            const name = isUser ? 'User' : (characters.find(c=>c.id===m.char_id)?.name || 'AI');
            const isLast = idx === messages.length - 1;
            return (
              <div key={`${m.id}-${idx}`} className={`chat ${isUser ? 'chat-end' : 'chat-start'} group animate-message`}>
                <div className="chat-header opacity-50 text-[10px] mb-1 flex items-center gap-2">
                    {name}
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                        {!m.image && <button className="hover:text-primary" onClick={()=>{setEditingMsgId(m.id!); setEditContent(m.content)}}><Pencil size={10}/></button>}
                        {!isUser && isLast && <button className="hover:text-primary" onClick={handleRegenerate}><RefreshCw size={10}/></button>}
                        <button className="hover:text-error" onClick={async () => { if(confirm("彻底删除？")) { if(m.id) { await api.messages.delete(m.id); setMessages(prev => prev.filter(msg => msg.id !== m.id)); } } }}><Trash2 size={10}/></button>
                    </div>
                </div>
                {m.image ? <div className="chat-bubble p-1 bg-base-200 border-base-300 shadow-xl overflow-hidden"><img src={m.image} className="max-w-xs md:max-w-md rounded-lg"/></div> : (
                  <div className={`chat-bubble shadow-lg border ${isUser ? 'chat-bubble-primary border-primary' : 'bg-base-200 text-base-content border-base-300'}`}>
                    {editingMsgId === m.id ? (
                        <div className="flex flex-col gap-2 min-w-[200px] text-base-content">
                            <textarea className="textarea textarea-bordered textarea-sm w-full bg-base-100" value={editContent} onChange={e=>setEditContent(e.target.value)}/>
                            <div className="flex justify-end gap-1">
                                <button className="btn btn-xs" onClick={()=>setEditingMsgId(null)}>取消</button>
                                <button className="btn btn-xs btn-primary" onClick={async ()=>{await api.messages.update(m.id!, editContent); setMessages(prev => prev.map(msg=>msg.id===m.id?{...msg, content:editContent}:msg)); setEditingMsgId(null)}}>保存</button>
                            </div>
                        </div>
                    ) : <div className="prose prose-sm break-words text-inherit"><ReactMarkdown rehypePlugins={[rehypeRaw]}>{m.content}</ReactMarkdown></div>}
                  </div>
                )}
              </div>
            );
          })}
          {isTyping && <div className="chat chat-start opacity-50 animate-pulse"><div className="chat-bubble">思考中...</div></div>}
          <div ref={bottomRef} className="h-20" />
        </div>

        <div className="p-4 bg-base-100 border-t border-base-300">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
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
              {isTyping ? <button className="btn btn-circle btn-error btn-sm shadow-lg" onClick={stopGeneration}><Square size={16} fill="currentColor"/></button> : <button className="btn btn-circle btn-primary btn-sm shadow-lg" onClick={handleSend} disabled={!input.trim()}><Send size={18}/></button>}
            </div>
          </div>
        </div>
      </div>
      <div className="drawer-side z-50"><label htmlFor="my-drawer" className="drawer-overlay"></label><Sidebar /></div>

      {showGroupEdit && selectedGroupId && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b flex justify-between bg-base-200 font-bold items-center"><h3>剧场设定</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowGroupEdit(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="form-control"><label className="label">剧场名</label><input className="input input-bordered" value={groups.find(g=>g.id===selectedGroupId)?.name} onChange={e=>setGroups(groups.map(g=>g.id===selectedGroupId?{...g, name:e.target.value}:g))} /></div>
                      <div className="form-control"><label className="label">场景设定</label><textarea className="textarea textarea-bordered h-48" value={groups.find(g=>g.id===selectedGroupId)?.description} onChange={e=>setGroups(groups.map(g=>g.id===selectedGroupId?{...g, description:e.target.value}:g))} /></div>
                      <div className="space-y-4"><label className="label">勾选成员</label><div className="grid grid-cols-2 md:grid-cols-3 gap-3">{characters.map(c => (<label key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${groupMemberIds.includes(c.id!) ? 'border-primary' : ''}`}><input type="checkbox" className="checkbox checkbox-primary" checked={groupMemberIds.includes(c.id!)} onChange={e => { const next = e.target.checked ? [...groupMemberIds, c.id!] : groupMemberIds.filter(id => id !== c.id); setGroupMemberIds(next); }} /><span>{c.name}</span></label>))}</div></div>
                  </div>
                  <div className="p-6 border-t bg-base-200 flex justify-end gap-2"><button className="btn btn-primary" onClick={async ()=>{const g=groups.find(grp=>grp.id===selectedGroupId); if(g){await api.groups.update(selectedGroupId, {...g, memberIds: groupMemberIds}); setShowGroupEdit(false); alert("保存成功")}}}>保存设定</button></div>
              </div>
          </div>
      )}

      {showCharEdit && selectedCharId && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-2xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b flex justify-between bg-base-200 font-bold">角色驱动档案<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowCharEdit(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="form-control"><label className="label">专用模型</label><select className="select select-bordered" value={characters.find(c=>c.id===selectedCharId)?.model_id || ""} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, model_id:e.target.value}:c))}><option value="">跟随全局</option>{modelOptions.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
                        <div className="form-control"><label className="label">API预设</label><select className="select select-bordered" value={characters.find(c=>c.id===selectedCharId)?.api_preset_id || ""} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, api_preset_id:parseInt(e.target.value)}:c))}><option value="">跟随全局设置</option>{presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                      </div>
                      <div className="form-control"><label className="label">角色名</label><input className="input input-bordered" value={characters.find(c=>c.id===selectedCharId)?.name} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, name:e.target.value}:c))} /></div>
                      <div className="form-control"><label className="label">角色设定</label><textarea className="textarea textarea-bordered h-48" value={characters.find(c=>c.id===selectedCharId)?.description} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, description:e.target.value}:c))} /></div>
                      <div className="form-control"><label className="label">长期记忆</label><textarea className="textarea textarea-bordered h-24" value={characters.find(c=>c.id===selectedCharId)?.summary} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, summary:e.target.value}:c))} /></div>
                  </div>
                  <div className="p-4 border-t bg-base-200 flex justify-end"><button className="btn btn-primary" onClick={async ()=>{await api.characters.update(selectedCharId, characters.find(c=>c.id===selectedCharId)!); setShowCharEdit(false); loadData();}}>保存</button></div>
              </div>
          </div>
      )}

      {showSettings && settings && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b bg-base-200 font-bold flex justify-between items-center">系统配置<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowSettings(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <section><h4 className="text-sm font-black text-primary">全局 API</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><input className="input input-bordered" placeholder="API BASE" value={settings.api_base} onChange={e=>setSettings({...settings, api_base:e.target.value})} /><input className="input input-bordered" placeholder="API KEY" type="password" value={settings.api_key} onChange={e=>setSettings({...settings, api_key:e.target.value})} /></div><textarea className="textarea textarea-bordered w-full h-20 mt-4" placeholder="模型列表 (用逗号隔开)" value={settings.model_list} onChange={e=>setSettings({...settings, model_list:e.target.value})} /></section>
                      <section><div className="flex justify-between items-end mb-3"><h4 className="text-sm font-black text-primary">API 预设管理</h4><button className="btn btn-xs btn-primary" onClick={() => api.presets.add({name: "新预设", api_base: "", api_key: ""}).then(() => loadData())}>+ 新增</button></div><div className="overflow-x-auto border rounded-xl"><table className="table w-full"><thead><tr className="bg-base-200"><th>名称</th><th>Base URL</th><th>Key</th><th className="w-20">操作</th></tr></thead><tbody>{presets.map((p, idx) => (<tr key={p.id}><td><input className="input input-ghost input-xs w-full" value={p.name} onChange={e=>{const n=[...presets]; n[idx].name=e.target.value; setPresets(n);}} /></td><td><input className="input input-ghost input-xs w-full" value={p.api_base} onChange={e=>{const n=[...presets]; n[idx].api_base=e.target.value; setPresets(n);}} /></td><td><input className="input input-ghost input-xs w-full" type="password" value={p.api_key} onChange={e=>{const n=[...presets]; n[idx].api_key=e.target.value; setPresets(n);}} /></td><td className="flex gap-1"><button className="btn btn-ghost btn-xs text-success" onClick={() => api.presets.update(p.id!, p).then(() => alert("已存"))}><Save size={14}/></button><button className="btn btn-ghost btn-xs text-error" onClick={() => api.presets.delete(p.id!).then(() => loadData())}><Trash2 size={14}/></button></td></tr>))}</tbody></table></div></section>
                  </div>
                  <div className="p-4 border-t bg-base-200 flex gap-2"><button className="btn btn-primary btn-block" onClick={async ()=>{await api.settings.update(settings!); setShowSettings(false); loadData();}}>保存并关闭</button></div>
              </div>
          </div>
      )}

      {showGenModal && (<div className="modal modal-open"><div className="modal-box"><h3>生成画面</h3><textarea className="textarea textarea-bordered w-full h-32" value={genPrompt} onChange={e=>setGenPrompt(e.target.value)} /><div className="modal-action"><button className="btn btn-primary flex-1" onClick={handleGenImageAction}>生成</button><button className="btn flex-1" onClick={()=>setShowGenModal(false)}>取消</button></div></div></div>)}

      {showLorebook && selectedCharId && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-2xl h-[70vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-4 border-b bg-base-200 font-bold flex justify-between">世界书设定<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowLorebook(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">{lorebookEntries.map(e => (<div key={e.id} className="collapse collapse-arrow bg-base-200"><input type="checkbox"/><div className="collapse-title">{e.keywords}</div><div className="collapse-content space-y-2"><textarea className="textarea textarea-bordered w-full h-24" defaultValue={e.content} onBlur={(evt)=>api.lorebook.update(e.id!, {content: evt.target.value})} /><div className="flex gap-2"><input className="input input-bordered input-sm flex-1" defaultValue={e.keywords} onBlur={(evt)=>api.lorebook.update(e.id!, {keywords: evt.target.value})} /><button className="btn btn-sm btn-error" onClick={()=>api.lorebook.delete(e.id!).then(()=>api.lorebook.list(selectedCharId).then(setLorebookEntries))}>删除</button></div></div></div>))}<button className="btn btn-block btn-outline border-dashed" onClick={()=>api.lorebook.add({char_id:selectedCharId, keywords:"新条目", content:"", isActive:true}).then(()=>api.lorebook.list(selectedCharId).then(setLorebookEntries))}>+ 添加词条</button></div>
              </div>
          </div>
      )}
    </div>
  );
}

export default App;