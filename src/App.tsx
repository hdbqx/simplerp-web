import { useState, useEffect, useRef } from 'react';
import { api, type Message, type Character, type Settings, type Group, type LorebookEntry, type ApiPreset } from './lib/db';
import { LLMClient } from './lib/llm';
import { translateToEnglish } from './lib/translate';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { 
  Send, Image as ImageIcon, Settings as SettingsIcon, Menu, Pencil, Plus, Trash2, X, 
  BookOpen, Book, HardDrive, Users, RefreshCw, Square, Save, Eraser, Sparkles 
} from 'lucide-react';

function App() {
  // --- 核心状态 ---
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

  // --- 弹窗控制状态 ---
  const [showSettings, setShowSettings] = useState(false);
  const [showCharEdit, setShowCharEdit] = useState(false);
  const [showGroupEdit, setShowGroupEdit] = useState(false);
  const [showLorebook, setShowLorebook] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  // --- 初始化数据 ---
  const loadData = async () => {
    try {
        const [c, g, s, p] = await Promise.all([
            api.characters.list(), 
            api.groups.list(), 
            api.settings.get(), 
            api.presets.list()
        ]);
        setCharacters(c); setGroups(g); setSettings(s); setPresets(p);
    } catch(e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  // --- 切换角色/剧场时的监听 ---
  useEffect(() => {
    setMessages([]);
    if (viewMode === 'char' && selectedCharId) {
      api.messages.list(selectedCharId).then(setMessages);
      api.lorebook.list(selectedCharId).then(setLorebookEntries);
    } else if (viewMode === 'group' && selectedGroupId) {
      api.groups.getMembers(selectedGroupId).then(ids => {
          setGroupMemberIds(ids);
          api.messages.list(undefined, selectedGroupId).then(setMessages);
          // 剧场模式默认加载第一个成员的世界书
          if(ids.length > 0) api.lorebook.list(ids[0]).then(setLorebookEntries);
      });
    }
  }, [selectedCharId, selectedGroupId, viewMode]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, isTyping]);

  // --- 逻辑函数 ---
  const stopGeneration = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsTyping(false);
    }
  };

  const triggerAI = async (char: Character, textOverride?: string, historyOverride?: Message[]) => {
    if (isTyping || !settings) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setIsTyping(true);
    const tempTs = Date.now() + 1;
    const currentHistory = historyOverride || messages;
    
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
        presets, controller
      );

      for await (const chunk of stream) {
        fullContent += chunk;
        setMessages(prev => prev.map(m => m.timestamp === tempTs ? { ...m, content: fullContent } : m));
      }
    } catch (e: any) {
        if (e.name !== 'AbortError') console.error("生成失败:", e);
    } finally {
      if (fullContent.trim().length > 0) {
          try {
            const res = await api.messages.add({ 
                role: 'assistant', content: fullContent, char_id: char.id, 
                group_id: viewMode === 'group' ? selectedGroupId : undefined, 
                timestamp: tempTs 
            });
            setMessages(prev => prev.map(m => m.timestamp === tempTs ? { ...m, id: res.id } : m));
          } catch (dbErr) { console.error("持久化失败", dbErr); }
      } else {
          setMessages(prev => prev.filter(m => m.timestamp !== tempTs));
      }
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const handleGenImageAction = async () => {
    if (!settings?.sd_url) return alert("请在设置中配置 SD URL");
    const rawPrompt = genPrompt || (messages.length > 0 ? messages[messages.length - 1].content : "");
    if (!rawPrompt) return;

    setShowGenModal(false);
    setIsTyping(true);
    try {
      const llm = new LLMClient(settings!);
      const tags = await llm.generateImageTags(rawPrompt, settings!);
      const finalTags = settings!.baidu_appid ? await translateToEnglish(tags, settings!.baidu_appid, settings!.baidu_secret!) : tags;
      
      const payload = {
        prompt: `1girl, (photorealistic:1.3), best quality, ultra high res, soft lighting, ${finalTags}`,
        negative_prompt: "(worst quality:2), (low quality:2), (normal quality:2), lowres, watermark",
        steps: 30, cfg_scale: 7, sampler_name: "Euler a", width: 512, height: 768, restore_faces: false,
        enable_hr: true, hr_scale: 2, hr_upscaler: "4x_NMKD-Superscale-SP_178000_G", hr_second_pass_steps: 15, denoising_strength: 0.35,
        override_settings: { 
            "sd_model_checkpoint": "majicmixRealistic_v7.safetensors", 
            "sd_vae": "vae-ft-mse-840000-ema-pruned.safetensors" 
        }
      };

      const res = await fetch(`${settings!.sd_url.replace(/\/$/, '')}/sdapi/v1/txt2img`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("SD 后端未响应");
      const data = await res.json();
      const dbRes = await api.messages.add({ 
          role: 'assistant', content: '', 
          image: `data:image/png;base64,${data.images[0]}`, 
          timestamp: Date.now(), group_id: selectedGroupId, char_id: selectedCharId 
      });
      setMessages(prev => [...prev, { role: 'assistant', content: '', image: `data:image/png;base64,${data.images[0]}`, timestamp: Date.now(), id: dbRes.id }]);
    } catch (e: any) { alert("生图失败: " + e.message); } finally { setIsTyping(false); }
  };

  const handleSend = async () => {
    if (!input.trim() || !settings || isTyping) return;
    const text = input; setInput('');
    const tx = document.querySelector('textarea'); if (tx) tx.style.height = 'auto';

    const timestamp = Date.now();
    const userMsg: Message = { 
      role: 'user', content: text, timestamp,
      char_id: viewMode === 'char' ? selectedCharId : undefined,
      group_id: viewMode === 'group' ? selectedGroupId : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    try {
      const res = await api.messages.add(userMsg);
      const msgWithId = { ...userMsg, id: res.id };
      setMessages(prev => prev.map(m => m.timestamp === timestamp ? msgWithId : m));
      if (viewMode === 'char' && selectedCharId) {
        triggerAI(characters.find(c=>c.id===selectedCharId)!, text, [...messages, msgWithId]);
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

  // --- UI 组件 ---
  const Sidebar = () => (
    <div className="flex flex-col h-full bg-base-200 w-80 p-4 border-r border-base-content/10 shadow-xl overflow-hidden">
      <div className="flex justify-between items-center mb-6 pl-2">
        <h2 className="font-black text-primary text-xl tracking-tight">SimpleRP Cloud</h2>
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
            <Trash2 size={14} className="opacity-0 group-hover:opacity-100 hover:text-error transition-opacity" onClick={(e) => { e.stopPropagation(); if(confirm(`删除角色 ${c.name}？`)) api.characters.delete(c.id!).then(() => loadData()); }} />
          </div>
        )) : groups.map(g => (
          <div key={g.id} onClick={() => { setSelectedGroupId(g.id); setMobileMenuOpen(false); }} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group ${selectedGroupId === g.id ? 'bg-secondary text-secondary-content shadow-lg' : 'hover:bg-base-300'}`}>
            <span className="font-bold truncate">{g.name}</span>
            <Trash2 size={14} className="opacity-0 group-hover:opacity-100 hover:text-error transition-opacity" onClick={(e) => { e.stopPropagation(); if(confirm(`删除剧场 ${g.name}？`)) api.groups.delete(g.id!).then(() => loadData()); }} />
          </div>
        ))}
        <button className="btn btn-outline btn-sm btn-block mt-4 border-dashed" onClick={async () => { const n = prompt("名称?"); if(n) { if(viewMode==='char') await api.characters.add({name:n, description:"", first_message:"你好", summary:""}); else await api.groups.add({name:n, description:""}); await loadData(); } }}><Plus size={16} /> 新建</button>
      </div>
      <div className="mt-4 pt-4 border-t border-base-content/10"><button className="btn btn-ghost btn-sm btn-block justify-start" onClick={() => {setShowSettings(true); setMobileMenuOpen(false);}}><SettingsIcon size={16} /> 系统设置</button></div>
    </div>
  );

  const modelOptions = settings?.model_list?.split(',').map(m => m.trim()).filter(m => m) || [];

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-base-100"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

  return (
    <div className="drawer md:drawer-open h-[100dvh] w-full bg-base-100 overflow-hidden text-base-content">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" checked={mobileMenuOpen} onChange={e=>setMobileMenuOpen(e.target.checked)} />
      <div className="drawer-content flex flex-col h-full overflow-hidden relative">
        {/* Navbar */}
        <div className="navbar bg-base-100 border-b border-base-300 px-4 sticky top-0 z-20">
          <div className="flex-none md:hidden"><button className="btn btn-square btn-ghost" onClick={()=>setMobileMenuOpen(true)}><Menu/></button></div>
          <div className="flex-1 font-bold truncate px-2">{viewMode==='char'?characters.find(c=>c.id===selectedCharId)?.name:groups.find(g=>g.id===selectedGroupId)?.name || "请选择"}</div>
          <div className="flex-none gap-2">
            {settings && (
              <select className="select select-bordered select-sm max-w-[6rem] md:max-w-[10rem] text-xs" value={settings.model || ''} onChange={async (e) => { const newM = e.target.value; setSettings({...settings, model: newM}); await api.settings.update({...settings, model: newM}); }}>
                <option value="">未选模型</option>
                {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
            <button className="btn btn-sm btn-ghost text-error" title="清空对话" onClick={() => {
                if(confirm("确定清空当前对话？这将不可逆。")) {
                    const cid = viewMode === 'char' ? selectedCharId : undefined;
                    const gid = viewMode === 'group' ? selectedGroupId : undefined;
                    api.messages.clear(cid, gid).then(() => { setMessages([]); alert("已清空"); });
                }
            }}><Eraser size={18}/></button>
            {viewMode === 'char' && selectedCharId && (
              <>
                <button className="btn btn-sm btn-ghost text-info" title="总结新进展" onClick={async ()=>{ 
                    try {
                        setIsTyping(true);
                        const char = characters.find(c => c.id === selectedCharId);
                        const llm = new LLMClient(settings!);
                        const fragment = await llm.summarizeRecent(messages, settings!);
                        if(!fragment) return alert("没有检测到新剧情。");
                        const date = new Date().toLocaleString('zh-CN', {month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'});
                        const updatedSummary = (char?.summary ? char.summary + "\n\n" : "") + `#### [剧情更新 ${date}]\n${fragment}`;
                        await api.characters.update(selectedCharId, { summary: updatedSummary });
                        await loadData(); alert("新进展已追加。");
                    } catch (e: any) { alert(e.message); } finally { setIsTyping(false); }
                }}><BookOpen size={18}/></button>
                <button className="btn btn-sm btn-ghost text-warning" title="世界书" onClick={()=>setShowLorebook(true)}><Book size={18}/></button>
                <button className="btn btn-sm btn-primary" onClick={()=>setShowCharEdit(true)}><Pencil size={18}/></button>
              </>
            )}
            {viewMode === 'group' && selectedGroupId && <button className="btn btn-sm btn-secondary" onClick={()=>setShowGroupEdit(true)}><Users size={18}/></button>}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {messages.map((m, idx) => (
            <div key={`${m.id}-${idx}`} className={`chat ${m.role === 'user' ? 'chat-end' : 'chat-start'} group animate-message`}>
              <div className="chat-header opacity-50 text-[10px] mb-1 flex items-center gap-2">
                {m.role === 'user' ? '我' : (characters.find(c=>c.id===m.char_id)?.name || 'AI')}
                <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    {!m.image && <button className="hover:text-primary" onClick={()=>{setEditingMsgId(m.id!); setEditContent(m.content)}}><Pencil size={10}/></button>}
                    {m.role !== 'user' && idx === messages.length - 1 && <button className="hover:text-primary" onClick={handleRegenerate}><RefreshCw size={10}/></button>}
                    <button className="hover:text-error" onClick={async ()=>{if(confirm("彻底删除该记录？")) { if(m.id) { await api.messages.delete(m.id); setMessages(prev => prev.filter(msg=>msg.id!==m.id)); }}}}><Trash2 size={10}/></button>
                </div>
              </div>
              {m.image ? <div className="chat-bubble p-1 bg-base-200 border-base-300 shadow-xl overflow-hidden"><img src={m.image} className="max-w-xs md:max-w-md rounded-lg"/></div> : (
                <div className={`chat-bubble shadow-lg border ${m.role === 'user' ? 'chat-bubble-primary border-primary' : 'bg-base-200 text-base-content border-base-300'}`}>
                  {editingMsgId === m.id ? (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                          <textarea className="textarea textarea-bordered textarea-sm w-full bg-base-100" value={editContent} onChange={e=>setEditContent(e.target.value)}/>
                          <div className="flex justify-end gap-1"><button className="btn btn-xs" onClick={()=>setEditingMsgId(null)}>取消</button><button className="btn btn-xs btn-primary" onClick={async ()=>{await api.messages.update(m.id!, editContent); setMessages(prev => prev.map(msg=>msg.id===m.id?{...msg, content:editContent}:msg)); setEditingMsgId(null)}}>保存</button></div>
                      </div>
                  ) : <div className="prose prose-sm break-words"><ReactMarkdown rehypePlugins={[rehypeRaw]}>{m.content}</ReactMarkdown></div>}
                </div>
              )}
            </div>
          ))}
          {isTyping && <div className="chat chat-start opacity-50 animate-pulse"><div className="chat-bubble">思考中...</div></div>}
          <div ref={bottomRef} className="h-20" />
        </div>

        {/* Input Area */}
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
              <textarea className="textarea textarea-ghost flex-1 min-h-[2.5rem] max-h-48 resize-none py-2 px-2 focus:outline-none" rows={1} value={input} onChange={e=>{setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=e.target.scrollHeight+'px'}} placeholder="输入消息..." onKeyDown={e=>{if(e.key==='Enter' && !e.shiftKey){e.preventDefault(); handleSend();}}} />
              {isTyping ? (
                  <button className="btn btn-circle btn-error btn-sm shadow-lg" onClick={stopGeneration}><Square size={16} fill="currentColor"/></button>
              ) : (
                  <button className="btn btn-circle btn-primary btn-sm shadow-lg" onClick={handleSend} disabled={!input.trim()}><Send size={18}/></button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="drawer-side z-50"><label htmlFor="my-drawer" className="drawer-overlay"></label><Sidebar /></div>

      {/* --- 全量弹窗模块 --- */}

      {/* 1. 设置面板 */}
      {showSettings && settings && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b bg-base-200 font-bold flex justify-between items-center">系统配置<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowSettings(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                      <section>
                          <h4 className="text-sm font-black mb-3 text-primary uppercase">基础与沉浸</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control"><label className="label text-xs font-bold">玩家姓名</label><input className="input input-bordered" placeholder="如：陈墨" value={settings.user_name || ''} onChange={e=>setSettings({...settings, user_name:e.target.value})} /></div>
                            <div className="form-control"><label className="label text-xs font-bold">SD 地址 (API)</label><input className="input input-bordered" placeholder="http://127.0.0.1:7860" value={settings.sd_url || ''} onChange={e=>setSettings({...settings, sd_url:e.target.value})} /></div>
                          </div>
                      </section>
                      <section>
                          <h4 className="text-sm font-black mb-3 text-primary uppercase">全局 API</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input className="input input-bordered" placeholder="API BASE" value={settings.api_base} onChange={e=>setSettings({...settings, api_base:e.target.value})} />
                            <input className="input input-bordered" placeholder="API KEY" type="password" value={settings.api_key} onChange={e=>setSettings({...settings, api_key:e.target.value})} />
                          </div>
                          <textarea className="textarea textarea-bordered w-full text-xs h-20 mt-4" placeholder="模型列表 (用逗号隔开)" value={settings.model_list} onChange={e=>setSettings({...settings, model_list:e.target.value})} />
                      </section>
                      <section>
                          <div className="flex justify-between items-end mb-3">
                              <h4 className="text-sm font-black text-primary uppercase">API 预设库</h4>
                              <button className="btn btn-xs btn-primary" onClick={() => api.presets.add({name: "新预设", api_base: "", api_key: ""}).then(() => loadData())}>+ 新增</button>
                          </div>
                          <div className="overflow-x-auto border border-base-300 rounded-xl">
                              <table className="table table-compact w-full text-xs">
                                  <thead><tr className="bg-base-200"><th>名称</th><th>Base URL</th><th>Key</th><th className="w-20">操作</th></tr></thead>
                                  <tbody>
                                      {presets.map((p, idx) => (
                                          <tr key={p.id}>
                                              <td><input className="input input-ghost input-xs w-full font-bold" value={p.name} onChange={e=>{const n=[...presets]; n[idx].name=e.target.value; setPresets(n);}} /></td>
                                              <td><input className="input input-ghost input-xs w-full" value={p.api_base} onChange={e=>{const n=[...presets]; n[idx].api_base=e.target.value; setPresets(n);}} /></td>
                                              <td><input className="input input-ghost input-xs w-full" type="password" value={p.api_key} onChange={e=>{const n=[...presets]; n[idx].api_key=e.target.value; setPresets(n);}} /></td>
                                              <td className="flex gap-1">
                                                  <button className="btn btn-ghost btn-xs text-success" onClick={() => api.presets.update(p.id!, p).then(() => alert("已更新"))}><Save size={14}/></button>
                                                  <button className="btn btn-ghost btn-xs text-error" onClick={() => {if(confirm("删除？")) api.presets.delete(p.id!).then(() => loadData());}}><Trash2 size={14}/></button>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </section>
                  </div>
                  <div className="p-4 border-t bg-base-200"><button className="btn btn-primary btn-block" onClick={async ()=>{await api.settings.update(settings!); setShowSettings(false); loadData();}}>保存配置</button></div>
              </div>
          </div>
      )}

      {/* 2. 角色编辑器 */}
      {showCharEdit && selectedCharId && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-2xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b flex justify-between bg-base-200 font-bold items-center">角色档案<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowCharEdit(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="form-control"><label className="label font-bold text-xs">专用模型</label>
                            <select className="select select-bordered select-sm" value={characters.find(c=>c.id===selectedCharId)?.model_id || ""} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, model_id:e.target.value}:c))}>
                                <option value="">全局默认</option>{modelOptions.map(m=><option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="form-control"><label className="label font-bold text-xs">API 预设</label>
                            <select className="select select-bordered select-sm" value={characters.find(c=>c.id===selectedCharId)?.api_preset_id || ""} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, api_preset_id:parseInt(e.target.value)}:c))}>
                                <option value="">全局设置</option>{presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                      </div>
                      <div className="form-control"><label className="label font-bold text-xs">角色姓名</label><input className="input input-bordered" value={characters.find(c=>c.id===selectedCharId)?.name} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, name:e.target.value}:c))} /></div>
                      <div className="form-control"><label className="label font-bold text-xs">人设/世界观描述</label><textarea className="textarea textarea-bordered h-48 font-mono text-sm" value={characters.find(c=>c.id===selectedCharId)?.description} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, description:e.target.value}:c))} /></div>
                      <div className="form-control"><label className="label font-bold text-xs text-primary">长期记忆 (Summary)</label><textarea className="textarea textarea-bordered h-32 font-mono text-xs" value={characters.find(c=>c.id===selectedCharId)?.summary} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, summary:e.target.value}:c))} /></div>
                  </div>
                  <div className="p-4 border-t bg-base-200 flex justify-end"><button className="btn btn-primary" onClick={async ()=>{await api.characters.update(selectedCharId, characters.find(c=>c.id===selectedCharId)!); setShowCharEdit(false); loadData();}}>确认保存</button></div>
              </div>
          </div>
      )}

      {/* 3. 剧场编辑器 */}
      {showGroupEdit && selectedGroupId && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b flex justify-between bg-base-200 font-bold items-center"><h3>剧场/群聊配置</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowGroupEdit(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="form-control"><label className="label font-bold">剧场名</label><input className="input input-bordered" value={groups.find(g=>g.id===selectedGroupId)?.name} onChange={e=>setGroups(groups.map(g=>g.id===selectedGroupId?{...g, name:e.target.value}:g))} /></div>
                      <div className="form-control"><label className="label font-bold text-xs text-primary">当前场景描述</label><textarea className="textarea textarea-bordered h-40" value={groups.find(g=>g.id===selectedGroupId)?.description} onChange={e=>setGroups(groups.map(g=>g.id===selectedGroupId?{...g, description:e.target.value}:g))} /></div>
                      <div className="space-y-4">
                          <label className="label font-bold text-xs">选择成员</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {characters.map(c => (
                                  <label key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${groupMemberIds.includes(c.id!) ? 'border-primary bg-primary/10' : 'border-base-300'}`}>
                                      <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={groupMemberIds.includes(c.id!)} onChange={e => {
                                          const next = e.target.checked ? [...groupMemberIds, c.id!] : groupMemberIds.filter(id => id !== c.id);
                                          setGroupMemberIds(next);
                                      }} />
                                      <span className="text-sm truncate font-bold">{c.name}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="p-6 border-t bg-base-200 flex justify-end"><button className="btn btn-primary" onClick={async ()=>{const g=groups.find(grp=>grp.id===selectedGroupId); if(g){await api.groups.update(selectedGroupId, {...g, memberIds: groupMemberIds}); setShowGroupEdit(false); alert("已更新剧场成员")}}}>保存剧场</button></div>
              </div>
          </div>
      )}

      {/* 4. 世界书编辑器 (含 isActive 修复) */}
      {showLorebook && selectedCharId && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-2xl h-[75vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-4 border-b bg-base-200 font-bold flex justify-between items-center">世界书 (Worldbook)<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowLorebook(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {lorebookEntries.map(e => (
                        <div key={e.id} className="collapse collapse-arrow bg-base-200 border border-base-content/5">
                            <input type="checkbox"/>
                            <div className="collapse-title text-sm font-bold flex justify-between items-center pr-12">
                                <span>{e.keywords}</span>
                                <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${e.isActive ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>{e.isActive ? 'Active' : 'Inactive'}</span>
                            </div>
                            <div className="collapse-content space-y-2">
                                <textarea className="textarea textarea-bordered w-full h-32 text-xs font-mono" defaultValue={e.content} onBlur={(evt)=>api.lorebook.update(e.id!, {content: evt.target.value})} />
                                <div className="flex gap-2 items-center">
                                    <input className="input input-bordered input-sm flex-1 text-xs" defaultValue={e.keywords} onBlur={(evt)=>api.lorebook.update(e.id!, {keywords: evt.target.value})} />
                                    <div className="flex items-center gap-2 bg-base-300 px-3 py-1 rounded-full">
                                        <span className="text-[10px] font-bold">启用</span>
                                        <input type="checkbox" className="toggle toggle-success toggle-xs" checked={e.isActive} onChange={(evt) => {
                                            const val = evt.target.checked;
                                            api.lorebook.update(e.id!, { isActive: val }).then(() => {
                                                setLorebookEntries(prev => prev.map(item => item.id === e.id ? {...item, isActive: val} : item));
                                            });
                                        }} />
                                    </div>
                                    <button className="btn btn-sm btn-error" onClick={()=>api.lorebook.delete(e.id!).then(()=>api.lorebook.list(selectedCharId).then(setLorebookEntries))}><Trash2 size={14}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button className="btn btn-block btn-outline border-dashed btn-sm mt-4" onClick={()=>api.lorebook.add({char_id:selectedCharId, keywords:"新词条", content:"", isActive:true}).then(()=>api.lorebook.list(selectedCharId).then(setLorebookEntries))}>+ 添加新设定</button>
                  </div>
              </div>
          </div>
      )}

      {/* 5. 生图提示词弹窗 */}
      {showGenModal && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-primary"><Sparkles/> 高清生图 (MajicMix v7)</h3>
                <textarea className="textarea textarea-bordered w-full h-32" value={genPrompt} onChange={e=>setGenPrompt(e.target.value)} placeholder="描述你想生成的画面细节，支持自然语言..." />
                <div className="modal-action flex gap-2">
                    <button className="btn btn-primary flex-1 shadow-lg" onClick={handleGenImageAction}>开始生成 (Hires. fix)</button>
                    <button className="btn flex-1" onClick={()=>setShowGenModal(false)}>取消</button>
                </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default App;