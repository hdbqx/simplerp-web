import { useState, useEffect, useRef } from 'react';
import { api, type LorebookEntry, type Message, type Character, type Settings } from './lib/db';
import { LLMClient } from './lib/llm';
import { translateToEnglish } from './lib/translate';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Send, Image as ImageIcon, Settings as SettingsIcon, Menu, Pencil, Plus, Trash2, X, Sparkles, BookOpen, Eraser, Save, Copy, RefreshCw, Book, HelpCircle } from 'lucide-react';

const HELP_DOC = `# 📘 SimpleRP Cloud\n数据已迁移至 Cloudflare D1 云数据库，不再丢失。`.trim();

function App() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<number>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [lorebookEntries, setLorebookEntries] = useState<LorebookEntry[]>([]);
  const [settings, setSettings] = useState<Settings>();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showCharEdit, setShowCharEdit] = useState(false);
  const [showLorebook, setShowLorebook] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isGenImage, setIsGenImage] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadCharacters = async () => {
    try {
        const data = await api.characters.list();
        setCharacters(data);
        // 如果有数据且未选中，默认选中第一个（即星海学园）
        if(data.length > 0 && !selectedCharId) setSelectedCharId(data[0].id);
    } catch(e) { console.error(e); } finally { setIsLoading(false); }
  };
  const loadMessages = async () => { if(selectedCharId) setMessages(await api.messages.list(selectedCharId)); };
  const loadLorebook = async () => { if(selectedCharId) setLorebookEntries(await api.lorebook.list(selectedCharId)); };
  const loadSettings = async () => { setSettings(await api.settings.get()); };

  useEffect(() => { loadSettings(); loadCharacters(); }, []);
  useEffect(() => { if(selectedCharId) { setMessages([]); loadMessages(); loadLorebook(); } }, [selectedCharId]);
  useEffect(() => { if(!editingMsgId) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, isTyping, editingMsgId]);

  const currentChar = characters.find(c => c.id === selectedCharId);
  const modelOptions = (settings?.model_list || "").split(',').map(m => m.trim()).filter(m => m);

  const processChat = async (text: string, historyOverride?: Message[]) => {
    if (!selectedCharId || !settings) return;
    setIsTyping(true);
    let history = historyOverride || messages;
    const tempTimestamp = Date.now() + 1;
    // 乐观更新 UI
    setMessages(prev => [...prev, { char_id: selectedCharId, role: 'assistant', content: '...', timestamp: tempTimestamp }]);
    
    const llm = new LLMClient(settings);
    let fullText = "";
    try {
        for await (const chunk of llm.chatStream(currentChar!, history, text, settings, lorebookEntries)) {
          fullText += chunk;
          setMessages(prev => {
             const copy = [...prev];
             copy[copy.length - 1] = { ...copy[copy.length - 1], content: fullText };
             return copy;
          });
        }
        await api.messages.add({ char_id: selectedCharId, role: 'assistant', content: fullText, timestamp: tempTimestamp });
        loadMessages(); // 重新加载以获取真实ID
    } catch (e: any) {
        setMessages(prev => { const copy = [...prev]; copy[copy.length - 1].content += `\n[Error: ${e.message}]`; return copy; });
    }
    setIsTyping(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping || !selectedCharId) return;
    const text = input; setInput(''); 
    const userMsg: Message = { char_id: selectedCharId, role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    await api.messages.add(userMsg);
    await processChat(text, [...messages, userMsg]); 
  };

  const handleRegenerate = async () => {
    if (messages.length === 0 || isTyping) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'assistant') return;
    const newHistory = messages.slice(0, -1); 
    setMessages(newHistory);
    if (lastMsg.id) await api.messages.delete(lastMsg.id);
    const lastUserMsg = newHistory[newHistory.length - 1];
    if (lastUserMsg?.role === 'user') await processChat(lastUserMsg.content, newHistory.slice(0, -1));
  };

  const saveEdit = async () => { 
      if (editingMsgId) { 
          setMessages(prev => prev.map(m => m.id === editingMsgId ? { ...m, content: editContent } : m));
          await api.messages.update(editingMsgId, editContent); 
          setEditingMsgId(null); 
      } 
  };

  const handleDuplicate = async (e: React.MouseEvent, charId: number) => {
    e.stopPropagation();
    const char = characters.find(c => c.id === charId);
    if (char && confirm(`复制「${char.name}」？`)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = char;
        await api.characters.add({ ...rest, name: `${char.name} (副本)` });
        loadCharacters();
        setMobileMenuOpen(false);
    }
  };

  const handleSummarize = async () => {
    if (!selectedCharId || !settings || messages.length === 0 || !confirm("消耗 Token 总结？")) return;
    setIsSummarizing(true);
    try {
      const summaryText = await new LLMClient(settings).summarize(messages, settings);
      const newSummary = currentChar?.summary ? `${currentChar.summary}\n\n[新摘要]: ${summaryText}` : summaryText;
      await api.characters.update(selectedCharId, { summary: newSummary });
      loadCharacters();
      alert("✅ 记忆已更新");
    } catch (e: any) { alert("失败: " + e.message); } finally { setIsSummarizing(false); }
  };
  
  const handleClearChat = async () => {
    if (!selectedCharId || !confirm("清空当前对话？(保留记忆)")) return;
    await api.messages.clear(selectedCharId);
    setMessages([]);
  };
  
  const executeGenImage = async () => {
      if (!settings?.sd_url || !selectedCharId) return;
      setIsGenImage(true); setShowGenModal(false); 
      try {
        let finalPrompt = genPrompt; 
        if (settings.baidu_appid && settings.baidu_secret) finalPrompt = await translateToEnglish(finalPrompt, settings.baidu_appid, settings.baidu_secret);
        const res = await fetch(`${settings.sd_url.replace(/\/$/, '')}/sdapi/v1/txt2img`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: `(masterpiece), anime style, ${finalPrompt}`, steps: 20, width: 512, height: 768 })
        });
        if (!res.ok) throw new Error(`SD Error: ${res.status}`);
        const data = await res.json();
        const msg = { char_id: selectedCharId, role: 'assistant' as const, content: '', image: `data:image/png;base64,${data.images[0]}`, timestamp: Date.now() };
        setMessages(prev => [...prev, msg]);
        await api.messages.add(msg);
      } catch (e: any) { alert(e.message); } finally { setIsGenImage(false); }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-base-200 text-base-content w-80 p-4 border-r border-base-content/10 shadow-2xl">
      <div className="flex justify-between items-center mb-6 pl-2">
        <h2 className="text-xl font-black flex items-center gap-2 text-primary"><Sparkles size={20}/> SimpleRP <span className="text-[10px] bg-primary text-primary-content px-1 rounded">Cloud</span></h2>
        <div className="flex gap-1">
             <button className="btn btn-sm btn-ghost btn-square" onClick={() => { setShowHelp(true); setMobileMenuOpen(false); }}><HelpCircle size={18}/></button>
             <button className="btn btn-sm btn-ghost btn-square" onClick={async () => {
                const name = prompt("角色名:"); if(name) { await api.characters.add({ name, description:"", first_message:"你好！", summary:"" }); loadCharacters(); }
             }}><Plus size={20}/></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {characters.map(c => (
          <div key={c.id} className={`group relative flex items-center rounded-lg p-3 transition-all ${selectedCharId===c.id ? 'bg-primary text-primary-content shadow-md' : 'hover:bg-base-300'}`}>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setSelectedCharId(c.id); setMobileMenuOpen(false); }}>
                <div className="font-bold truncate">{c.name}</div>
            </div>
            {selectedCharId === c.id && (
                <div className="flex items-center gap-1">
                    <button className="btn btn-xs btn-ghost btn-square text-primary-content/70 hover:text-white" title="复制" onClick={(e)=>handleDuplicate(e, c.id!)}><Copy size={14}/></button>
                    <button className="btn btn-xs btn-ghost btn-square text-primary-content/70 hover:text-white" title="删除" onClick={async (e)=>{ e.stopPropagation(); if(confirm("删除?")) { await api.characters.delete(c.id!); loadCharacters(); if(selectedCharId === c.id) setSelectedCharId(undefined); } }}><Trash2 size={14}/></button>
                </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-base-content/10 space-y-2">
        <button className="btn btn-outline btn-sm btn-block gap-2 justify-start font-normal" onClick={() => { setShowLorebook(true); setMobileMenuOpen(false); }}><Book size={16}/> 世界书</button>
        <button className="btn btn-outline btn-sm btn-block gap-2 justify-start font-normal" onClick={() => { setShowSettings(true); setMobileMenuOpen(false); }}><SettingsIcon size={16}/> 设置</button>
      </div>
    </div>
  );

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-base-100 text-primary"><span className="loading loading-dots loading-lg"></span></div>;

  return (
    <div className="drawer md:drawer-open h-[100dvh] w-full font-sans text-base-content overflow-hidden">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" checked={mobileMenuOpen} onChange={e => setMobileMenuOpen(e.target.checked)} />
      <div className="drawer-content flex flex-col h-full overflow-hidden relative bg-base-100">
        <div className="flex-none p-2 z-30 bg-base-100 border-b border-base-300 shadow-sm">
            <div className="navbar min-h-[3rem] px-2">
                <div className="flex-none md:hidden mr-2"><label htmlFor="my-drawer" className="btn btn-square btn-ghost btn-sm"><Menu/></label></div>
                <div className="flex-1 overflow-hidden"><span className="font-bold text-base md:text-lg truncate flex items-center gap-2">{currentChar?.name || "选择角色"}{currentChar && <button className="btn btn-xs btn-ghost btn-circle" onClick={() => setShowCharEdit(true)}><Pencil size={12}/></button>}</span></div>
                <div className="flex-none flex items-center gap-2">
                    <button className="btn btn-sm btn-ghost btn-square text-info" onClick={handleSummarize} disabled={isSummarizing || !selectedCharId}><BookOpen size={18}/></button>
                    <button className="btn btn-sm btn-ghost btn-square text-error" onClick={handleClearChat} disabled={!selectedCharId}><Eraser size={18}/></button>
                    <select className="select select-bordered select-sm max-w-[5rem] md:max-w-[8rem] text-xs" value={settings?.model || ''} onChange={async (e) => { const newModel = e.target.value; setSettings(prev => prev ? ({...prev, model: newModel}) : undefined); await api.settings.update({...settings, model: newModel}); }}>{modelOptions.map(m => <option key={m} value={m}>{m}</option>)}</select>
                </div>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6 z-10 scroll-smooth w-full max-w-5xl mx-auto bg-base-100">
          {messages.map((m, index) => {
            const isUser = m.role === 'user';
            const isLastMsg = index === (messages.length - 1);
            return (
              <div key={m.id || index} className={`chat animate-message group ${isUser ? 'chat-end' : 'chat-start'}`}>
                <div className="chat-header opacity-40 text-[10px] mb-1 flex items-center gap-1 font-mono uppercase tracking-wide">{isUser ? 'Commander' : currentChar?.name}<div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-2">{!m.image && m.id && <button onClick={() => { setEditingMsgId(m.id!); setEditContent(m.content); }} className="hover:text-primary"><Pencil size={10}/></button>}{!isUser && isLastMsg && <button onClick={handleRegenerate} className="hover:text-primary"><RefreshCw size={10}/></button>}{m.id && <button onClick={async () => { if(confirm("Del?")) { await api.messages.delete(m.id!); loadMessages(); } }} className="hover:text-error"><Trash2 size={10}/></button>}</div></div>
                {m.image ? (<div className="chat-bubble p-1 bg-base-200 rounded-2xl overflow-hidden shadow-md border border-base-300"><img src={m.image} className="max-w-full md:max-w-md object-cover rounded-xl"/></div>) : (<div className={`chat-bubble shadow-md border ${isUser ? 'chat-bubble-primary' : 'bg-base-200 text-base-content border-base-300'} max-w-full`}>{editingMsgId === m.id ? (<div className="flex flex-col gap-2 min-w-[200px]"><textarea className="textarea textarea-bordered textarea-sm w-full text-base-content bg-base-100" value={editContent} onChange={e => setEditContent(e.target.value)} rows={3}/><div className="flex justify-end gap-2"><button className="btn btn-xs btn-ghost" onClick={()=>setEditingMsgId(null)}>Cancel</button><button className="btn btn-xs btn-primary" onClick={saveEdit}>Save</button></div></div>) : (<div className={`prose ${isUser ? 'text-sm' : ''} break-words`}><ReactMarkdown rehypePlugins={[rehypeRaw]}>{m.content}</ReactMarkdown></div>)}</div>)}
              </div>
            );
          })}
          {isTyping && <div className="chat chat-start"><div className="chat-bubble bg-base-200 text-xs opacity-50 animate-pulse">Thinking...</div></div>}
          <div ref={bottomRef} className="h-4"/>
        </div>
        <div className="flex-none p-2 md:p-4 z-20 bg-base-100 border-t border-base-300">
          <div className="max-w-4xl mx-auto flex gap-2 items-end solid-panel p-2 rounded-3xl bg-base-200">
            <button className="btn btn-circle btn-ghost btn-sm text-accent shrink-0 mb-1" onClick={openGenImageModal} disabled={isGenImage}>{isGenImage ? <span className="loading loading-spinner loading-xs"/> : <ImageIcon size={20}/>}</button>
            <textarea className="textarea textarea-ghost flex-1 min-h-[2.5rem] max-h-32 leading-relaxed resize-none py-2 px-2 focus:outline-none bg-transparent text-base" value={input} rows={1} onChange={e=>{ setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSend(); } }} placeholder="发送指令..."/>
            <button className="btn btn-circle btn-primary btn-sm shrink-0 mb-1 shadow-md" onClick={handleSend} disabled={isTyping || !selectedCharId}><Send size={18}/></button>
          </div>
        </div>
      </div>
      <div className="drawer-side z-[50]"><label htmlFor="my-drawer" className="drawer-overlay bg-black/60"></label><SidebarContent /></div>
      
      {showSettings && settings && (<div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-in fade-in"><div className="bg-base-100 w-full max-w-lg rounded-xl flex flex-col shadow-2xl border border-base-300 max-h-[90vh] overflow-y-auto"><div className="p-5 border-b border-base-300 flex justify-between items-center"><h3 className="font-bold text-xl">系统设置</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowSettings(false)}><X size={20}/></button></div><form onSubmit={async (e:any)=>{ e.preventDefault(); const fd=new FormData(e.target); const newS = Object.fromEntries(fd) as any; await api.settings.update(newS); setSettings({...newS, id: settings.id}); setShowSettings(false); }} className="p-6 space-y-4"><div><label className="label text-xs uppercase opacity-50 font-bold pb-1">API Config</label><input name="api_base" defaultValue={settings.api_base} className="input input-bordered w-full mb-2"/><input name="api_key" type="password" defaultValue={settings.api_key} className="input input-bordered w-full"/></div><div><label className="label text-xs uppercase opacity-50 font-bold pb-1">Model List</label><textarea name="model_list" defaultValue={settings.model_list} className="textarea textarea-bordered w-full h-16 text-xs"/></div><div><label className="label text-xs uppercase opacity-50 font-bold pb-1">SD URL</label><input name="sd_url" defaultValue={settings.sd_url} className="input input-bordered w-full"/></div><div className="grid grid-cols-2 gap-4"><div><label className="label text-xs uppercase opacity-50 font-bold pb-1">AppID</label><input name="baidu_appid" defaultValue={settings.baidu_appid} className="input input-bordered w-full"/></div><div><label className="label text-xs uppercase opacity-50 font-bold pb-1">Secret</label><input name="baidu_secret" type="password" defaultValue={settings.baidu_secret} className="input input-bordered w-full"/></div></div><button className="btn btn-primary btn-block mt-4 rounded-xl">保存</button></form></div></div>)}
      {showCharEdit && currentChar && (<div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-in fade-in"><div className="bg-base-100 w-full max-w-3xl max-h-[90vh] rounded-xl flex flex-col shadow-2xl border border-base-300"><div className="p-5 border-b border-base-300 flex justify-between items-center"><h3 className="font-bold text-xl">角色档案</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowCharEdit(false)}><X size={20}/></button></div><form onSubmit={async (e:any)=>{ e.preventDefault(); const fd=new FormData(e.target); const updates = Object.fromEntries(fd) as any; await api.characters.update(selectedCharId!, updates); loadCharacters(); setShowCharEdit(false); }} className="p-6 overflow-y-auto space-y-5 flex-1"><div><label className="label font-bold text-sm">代号</label><input name="name" defaultValue={currentChar.name} className="input input-bordered w-full font-bold text-lg"/></div><div className="flex-1 flex flex-col"><label className="label font-bold text-sm">底层指令</label><textarea name="description" defaultValue={currentChar.description} className="textarea textarea-bordered h-48 font-mono text-xs leading-relaxed"/></div><div><label className="label font-bold text-sm">长期记忆</label><textarea name="summary" defaultValue={currentChar.summary} className="textarea textarea-bordered h-24 font-mono text-xs"/></div><div><label className="label font-bold text-sm">开场白</label><textarea name="first_message" defaultValue={currentChar.first_message} className="textarea textarea-bordered h-20"/></div><button className="btn btn-primary btn-block rounded-xl"><Save size={18}/> 保存</button></form></div></div>)}
      {showLorebook && selectedCharId && (<div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-in fade-in"><div className="bg-base-100 w-full max-w-2xl max-h-[85vh] rounded-xl flex flex-col shadow-2xl border border-base-300"><div className="p-5 border-b border-base-300 flex justify-between items-center"><h3 className="font-bold text-xl flex items-center gap-2"><Book size={20}/> 世界书</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowLorebook(false)}><X size={20}/></button></div><div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-3">{lorebookEntries.map(entry => (<div key={entry.id} className="collapse collapse-arrow bg-base-200 border border-base-300"><input type="checkbox" /> <div className="collapse-title font-bold text-sm flex items-center gap-2"><span className={entry.isActive ? 'text-success' : 'text-base-content/30'}>●</span>{entry.keywords}</div><div className="collapse-content space-y-2"><textarea className="textarea textarea-bordered w-full text-xs font-mono h-24" defaultValue={entry.content} onBlur={(e) => api.lorebook.update(entry.id!, { content: e.target.value })} placeholder="内容..."/><div className="flex gap-2"><input className="input input-bordered input-sm flex-1 text-xs" defaultValue={entry.keywords} onBlur={(e) => api.lorebook.update(entry.id!, { keywords: e.target.value })} placeholder="触发词"/><button className={`btn btn-sm ${entry.isActive ? 'btn-success' : 'btn-ghost'}`} onClick={async ()=>{ await api.lorebook.update(entry.id!, { isActive: !entry.isActive }); loadLorebook(); }}>{entry.isActive ? 'On' : 'Off'}</button><button className="btn btn-sm btn-error btn-outline" onClick={async ()=>{ await api.lorebook.delete(entry.id!); loadLorebook(); }}><Trash2 size={14}/></button></div></div></div>))}<button className="btn btn-ghost btn-block border-dashed border-2 border-base-content/20" onClick={async ()=>{ await api.lorebook.add({ char_id: selectedCharId!, keywords: "新词条", content: "", isActive: true }); loadLorebook(); }}><Plus size={16}/> 添加</button></div></div></div>)}
      {showGenModal && (<div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-in fade-in"><div className="bg-base-100 w-full max-w-lg rounded-xl flex flex-col shadow-2xl border border-base-300"><div className="p-5 border-b border-base-300 flex justify-between items-center"><h3 className="font-bold text-xl flex items-center gap-2"><ImageIcon size={20}/> 生图</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowGenModal(false)}><X size={20}/></button></div><div className="p-6 space-y-4"><textarea className="textarea textarea-bordered h-32 w-full text-sm leading-relaxed" value={genPrompt} onChange={(e) => setGenPrompt(e.target.value)} placeholder="描述..."/><div className="flex gap-3 mt-4"><button className="btn flex-1 rounded-xl" onClick={()=>setShowGenModal(false)}>取消</button><button className="btn btn-primary flex-1 rounded-xl" onClick={executeGenImage}><Sparkles size={16}/> 生成</button></div></div></div></div>)}
      {showHelp && (<div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-in fade-in"><div className="bg-base-100 w-full max-w-2xl max-h-[85vh] rounded-xl flex flex-col shadow-2xl border border-base-300"><div className="p-5 border-b border-base-300 flex justify-between items-center"><h3 className="font-bold text-xl flex items-center gap-2"><BookOpen size={20}/> 帮助手册</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowHelp(false)}><X size={20}/></button></div><div className="p-6 overflow-y-auto custom-scrollbar"><div className="prose prose-sm max-w-none"><ReactMarkdown>{HELP_DOC}</ReactMarkdown></div></div></div></div>)}
    </div>
  );
}
export default App;