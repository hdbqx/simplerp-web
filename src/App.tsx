import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
// 修复 1: 使用 'type' 关键字导入接口，解决 TS1484 报错
import { db, initDB, type LorebookEntry, type Message } from './lib/db';
import { LLMClient } from './lib/llm';
import { translateToEnglish } from './lib/translate';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { 
  Send, Image as ImageIcon, Settings as SettingsIcon, Menu, 
  Pencil, Plus, Trash2, Code, X, Sparkles, BookOpen, Eraser, 
  Save, Copy, RefreshCw, Book, HelpCircle 
} from 'lucide-react';

const HELP_DOC = `
# 📘 SimpleRP 操作指南

### 1. 基础功能
- **新建角色**: 点击侧边栏顶部的 \`+\` 号。
- **角色设定**: 点击顶部的铅笔图标。可在 Description 中填入自然语言设定。
- **复制角色**: 侧边栏角色右侧的复制图标，开启“平行宇宙”剧情。

### 2. 记忆与总结
- **长时记忆**: 点击顶部的 **📖 总结按钮**，AI 会压缩历史并存入记忆。
- **清空对话**: 点击 **橡皮擦**。只清屏，不删记忆。

### 3. 世界书 (Lorebook)
- 点击侧边栏底部的 **📚 世界书**。
- 设置关键词和内容，对话触发关键词时自动注入设定。

### 4. 图像生成
- 点击输入框左侧图片图标。
- 系统会自动清理 URL 空格并翻译提示词。

### 5. 高级操作
- **重新生成**: 悬停在 AI 消息上点击 🔄。
- **编辑消息**: 悬停在消息上点击 ✏️。
`.trim();

function App() {
  const [selectedCharId, setSelectedCharId] = useState<number>();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  // Modals State
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showCharEdit, setShowCharEdit] = useState(false);
  const [showLorebook, setShowLorebook] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const [isGenImage, setIsGenImage] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Editing Message State
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  const characters = useLiveQuery(() => db.characters.toArray());
  const messages = useLiveQuery(
    () => selectedCharId ? db.messages.where('char_id').equals(selectedCharId).toArray() : [], 
    [selectedCharId]
  );
  // LorebookEntry 现在被视为类型使用，修复了 unused value 报错
  const lorebookEntries = useLiveQuery<LorebookEntry[]>(
    () => selectedCharId ? db.lorebook.where('char_id').equals(selectedCharId).toArray() : [],
    [selectedCharId]
  );
  const settings = useLiveQuery(() => db.settings.orderBy('id').first());

  useEffect(() => {
    initDB().then(() => {
      if (characters && characters.length > 0 && !selectedCharId) {
        setSelectedCharId(characters[0].id);
      }
    });
  }, [characters?.length]);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { 
    if(!editingMsgId) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages?.length, isTyping, editingMsgId]);

  const currentChar = characters?.find(c => c.id === selectedCharId);
  const modelOptions = (settings?.model_list || "").split(',').map(m => m.trim()).filter(m => m);

  useEffect(() => {
    if (settings && modelOptions.length > 0) {
      const isValid = settings.model && modelOptions.includes(settings.model);
      if (!isValid) db.settings.update(settings.id!, { model: modelOptions[0] });
    }
  }, [settings?.model_list, settings?.model, settings?.id]);

  // 修复：明确类型 Message[]
  const processChat = async (text: string, historyOverride?: Message[]) => {
    if (!selectedCharId || !settings) return;
    setIsTyping(true);
    
    const history = historyOverride || (await db.messages.where('char_id').equals(selectedCharId).toArray());
    const aiMsgId = await db.messages.add({ char_id: selectedCharId, role: 'assistant', content: '...', timestamp: Date.now()+1 });
    
    const char = await db.characters.get(selectedCharId);
    const lore = (await db.lorebook.where('char_id').equals(selectedCharId).toArray()) || [];

    if(char) {
      const llm = new LLMClient(settings);
      let fullText = "";
      try {
        for await (const chunk of llm.chatStream(char, history, text, settings, lore)) {
          fullText += chunk;
          await db.messages.update(aiMsgId, { content: fullText });
        }
      } catch (e: any) {
        await db.messages.update(aiMsgId, { content: fullText + `\n\n[Error: ${e.message}]` });
      }
    }
    setIsTyping(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const text = input; 
    setInput(''); 
    // 修复：使用 ! 断言 selectedCharId 存在
    await db.messages.add({ char_id: selectedCharId!, role: 'user', content: text, timestamp: Date.now() });
    await processChat(text); 
  };

  const handleRegenerate = async () => {
    if (!messages || messages.length === 0 || isTyping) return;
    const lastMsg = messages[messages.length - 1];
    let historyToUse = [...messages];
    let triggerText = "";

    if (lastMsg.role === 'assistant') {
        if(lastMsg.id) await db.messages.delete(lastMsg.id);
        historyToUse.pop();
        const lastUserMsg = historyToUse[historyToUse.length - 1];
        if (lastUserMsg && lastUserMsg.role === 'user') {
            triggerText = lastUserMsg.content;
            historyToUse.pop();
        }
    } else {
        return; 
    }
    await processChat(triggerText, historyToUse);
  };

  const startEditing = (id: number, content: string) => {
    setEditingMsgId(id);
    setEditContent(content);
  };
  
  const saveEdit = async () => {
    if (editingMsgId) {
        await db.messages.update(editingMsgId, { content: editContent });
        setEditingMsgId(null);
    }
  };

  const handleDeleteAllImages = async () => {
    if(!confirm("确定要删除所有图片吗？\n文本聊天记录将保留，仅清除图片以释放数据库空间。")) return;
    await db.messages.filter(m => !!m.image).modify({ image: '' });
    alert("✅ 图片已清理。");
    window.location.reload();
  };

  const handleDuplicate = async (e: React.MouseEvent, charId: number) => {
    e.stopPropagation();
    const char = await db.characters.get(charId);
    if (char) {
        if(!confirm(`复制「${char.name}」开启新剧情？`)) return;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = char;
        await db.characters.add({ ...rest, name: `${char.name} (副本)`, summary: "" });
        setMobileMenuOpen(false);
    }
  };

  const handleSummarize = async () => {
    if (!selectedCharId || !settings || !messages || messages.length === 0) return;
    if (!confirm("消耗 Token 进行历史总结？")) return;
    setIsSummarizing(true);
    try {
      const llm = new LLMClient(settings);
      const summaryText = await llm.summarize(messages, settings);
      const oldSummary = currentChar?.summary || "";
      const newSummary = oldSummary ? `${oldSummary}\n\n[新摘要]: ${summaryText}` : summaryText;
      await db.characters.update(selectedCharId, { summary: newSummary });
      alert("✅ 记忆已更新");
    } catch (e: any) { alert("失败: " + e.message); } finally { setIsSummarizing(false); }
  };
  
  const handleClearChat = async () => {
    if (!selectedCharId) return;
    if (!confirm("清空当前聊天记录？")) return;
    await db.messages.where('char_id').equals(selectedCharId).delete();
    window.location.reload();
  };
  
  const openGenImageModal = () => {
    if (!settings?.sd_url) return alert("请配置 SD URL");
    const lastMsg = messages?.[messages.length - 1]?.content;
    if (!lastMsg) return alert("无消息");
    setGenPrompt(lastMsg.replace(/[#*`>]/g, '').slice(0, 500));
    setShowGenModal(true);
  };
  
  const executeGenImage = async () => {
      if (!settings?.sd_url) return;
      const cleanUrl = settings.sd_url.trim().replace(/\/$/, '');
      setIsGenImage(true); setShowGenModal(false); 
      try {
        let finalPrompt = genPrompt; 
        if (settings.baidu_appid) finalPrompt = await translateToEnglish(finalPrompt, settings.baidu_appid, settings.baidu_secret);
        const res = await fetch(`${cleanUrl}/sdapi/v1/txt2img`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: `(masterpiece:1.2), best quality, anime style, ${finalPrompt}`, negative_prompt: "nsfw, lowres, bad anatomy", steps: 20, width: 512, height: 768, cfg_scale: 7, sampler_name: "DPM++ 2M Karras" })
        });
        if (!res.ok) throw new Error(`SD Error: ${res.status}`);
        const data = await res.json();
        // 修复：使用 ! 断言 selectedCharId
        await db.messages.add({ char_id: selectedCharId!, role: 'assistant', content: '', image: `data:image/png;base64,${data.images[0]}`, timestamp: Date.now() });
      } catch (e: any) { alert(e.message); } finally { setIsGenImage(false); }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-base-100/95 backdrop-blur-xl text-base-content w-80 p-4 border-r border-white/5 shadow-2xl">
      <div className="flex justify-between items-center mb-6 pl-2">
        <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary flex items-center gap-2">
            <Sparkles size={20} className="text-primary"/> SimpleRP
        </h2>
        <div className="flex gap-1">
             <button className="btn btn-sm btn-ghost btn-square hover:bg-white/10" onClick={() => { setShowHelp(true); setMobileMenuOpen(false); }} title="使用说明"><HelpCircle size={18}/></button>
             <button className="btn btn-sm btn-ghost btn-square hover:bg-white/10" onClick={() => {
                const name = prompt("角色名:"); if(name) db.characters.add({ name, description:"", first_message:"你好！", summary:"" });
             }}><Plus size={20}/></button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {characters?.map(c => (
          <div key={c.id} className={`group relative flex items-center rounded-xl p-3 transition-all duration-200 border border-transparent ${selectedCharId===c.id ? 'bg-gradient-to-r from-primary/20 to-transparent border-primary/30 shadow-lg translate-x-1' : 'hover:bg-white/5 hover:translate-x-1'}`}>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setSelectedCharId(c.id); setMobileMenuOpen(false); }}>
                <div className={`font-bold truncate ${selectedCharId===c.id ? 'text-primary' : 'text-base-content/80'}`}>{c.name}</div>
            </div>
            {selectedCharId === c.id && (
                <div className="flex items-center gap-1">
                    <button className="btn btn-xs btn-ghost btn-square opacity-60 hover:opacity-100" title="复制" onClick={(e)=>handleDuplicate(e, c.id!)}><Copy size={14}/></button>
                    <button className="btn btn-xs btn-ghost btn-square opacity-60 hover:opacity-100 text-error" title="删除" onClick={(e)=>{e.stopPropagation();if(confirm("删除?")) db.characters.delete(c.id!)}}><Trash2 size={14}/></button>
                </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
        <button className="btn btn-outline btn-sm btn-block gap-2 justify-start font-normal border-white/10" onClick={() => { setShowLorebook(true); setMobileMenuOpen(false); }}>
            <Book size={16}/> 世界书 / World Info
        </button>
        <button className="btn btn-outline btn-sm btn-block gap-2 justify-start font-normal border-white/10" onClick={() => { setShowSettings(true); setMobileMenuOpen(false); }}>
            <SettingsIcon size={16}/> 系统设置
        </button>
      </div>
    </div>
  );

  return (
    <div className="drawer md:drawer-open h-[100dvh] w-full font-sans text-base-content overflow-hidden">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" checked={mobileMenuOpen} onChange={e => setMobileMenuOpen(e.target.checked)} />
      
      <div className="drawer-content flex flex-col h-full overflow-hidden relative bg-base-100">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/50 via-transparent to-transparent z-0"></div>

        <div className="flex-none p-2 z-30 bg-gradient-to-b from-base-100 to-transparent">
            <div className="navbar min-h-[3rem] glass-panel rounded-2xl px-4">
                <div className="flex-none md:hidden mr-2"><label htmlFor="my-drawer" className="btn btn-square btn-ghost btn-sm"><Menu/></label></div>
                <div className="flex-1 overflow-hidden">
                    <span className="font-bold text-base md:text-lg truncate flex items-center gap-2">
                        {currentChar?.name}
                        <button className="btn btn-xs btn-ghost btn-circle opacity-50 hover:opacity-100" onClick={() => setShowCharEdit(true)}><Pencil size={12}/></button>
                    </span>
                </div>
                <div className="flex-none flex items-center gap-2">
                    <button className="btn btn-sm btn-ghost btn-square text-info" onClick={handleSummarize} disabled={isSummarizing} title="总结"><BookOpen size={18}/></button>
                    <button className="btn btn-sm btn-ghost btn-square text-error" onClick={handleClearChat} title="清空"><Eraser size={18}/></button>
                    <select className="select select-bordered select-sm max-w-[5rem] md:max-w-[8rem] bg-base-100/50 border-white/10 text-xs" value={settings?.model || ''} onChange={(e) => db.settings.update(settings!.id!, { model: e.target.value })}>
                        {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 z-10 scroll-smooth w-full max-w-5xl mx-auto">
          {messages?.map((m, index) => {
            const isUser = m.role === 'user';
            const isImage = !!m.image;
            const isEditing = editingMsgId === m.id;
            const isLastMsg = index === (messages.length - 1);

            return (
              <div key={m.id || index} className={`chat animate-message group ${isUser ? 'chat-end' : 'chat-start'}`}>
                <div className="chat-header opacity-40 text-[10px] mb-1 flex items-center gap-1 font-mono uppercase tracking-wide">
                  {isUser ? 'Commander' : currentChar?.name}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-2">
                     {!isImage && <button onClick={() => startEditing(m.id!, m.content)} className="hover:text-primary" title="编辑"><Pencil size={10}/></button>}
                     {!isUser && isLastMsg && <button onClick={handleRegenerate} className="hover:text-primary" title="重新生成"><RefreshCw size={10}/></button>}
                     <button onClick={() => { if(confirm("删除此条消息?")) db.messages.delete(m.id!) }} className="hover:text-error" title="删除"><Trash2 size={10}/></button>
                  </div>
                </div>
                
                {isImage ? (
                  <div className="chat-bubble p-1 bg-base-200/50 backdrop-blur rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                    <img src={m.image} className="max-w-full md:max-w-md object-cover rounded-xl"/>
                  </div>
                ) : (
                  <div className={`chat-bubble shadow-xl backdrop-blur-md border ${isUser ? 'chat-bubble-primary bg-gradient-to-br from-primary to-accent text-primary-content border-white/10' : 'bg-base-200/80 text-base-content border-white/5'} max-w-full`}>
                    {isEditing ? (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                            <textarea className="textarea textarea-bordered textarea-sm w-full text-base-content bg-base-100/50" value={editContent} onChange={e => setEditContent(e.target.value)} rows={3}/>
                            <div className="flex justify-end gap-2"><button className="btn btn-xs btn-ghost" onClick={()=>setEditingMsgId(null)}>取消</button><button className="btn btn-xs btn-primary" onClick={saveEdit}>保存</button></div>
                        </div>
                    ) : (
                        <div className={`prose ${isUser ? 'text-sm' : ''} break-words`}>
                           <ReactMarkdown rehypePlugins={[rehypeRaw]}>{m.content}</ReactMarkdown>
                        </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {isTyping && <div className="chat chat-start"><div className="chat-bubble bg-transparent text-xs opacity-50 animate-pulse">Thinking...</div></div>}
          <div ref={bottomRef} className="h-4"/>
        </div>

        <div className="flex-none p-2 md:p-4 z-20 bg-gradient-to-t from-base-100 via-base-100/90 to-transparent">
          <div className="max-w-4xl mx-auto flex gap-2 items-end glass-panel p-2 rounded-3xl ring-1 ring-white/10 focus-within:ring-primary/50 transition-all">
            <button className="btn btn-circle btn-ghost btn-sm text-accent shrink-0 mb-1" onClick={openGenImageModal} disabled={isGenImage}>
               {isGenImage ? <span className="loading loading-spinner loading-xs"/> : <ImageIcon size={20}/>}
            </button>
            <textarea 
              className="textarea textarea-ghost flex-1 min-h-[2.5rem] max-h-32 leading-relaxed resize-none py-2 px-2 focus:outline-none bg-transparent placeholder:text-white/20 text-base" 
              value={input} rows={1} 
              onChange={e=>{ setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} 
              onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSend(); } }} 
              placeholder="发送指令..."
            />
            <button className="btn btn-circle btn-primary btn-sm shrink-0 mb-1 shadow-lg shadow-primary/40 border-0 bg-gradient-to-r from-primary to-accent text-white" onClick={handleSend} disabled={isTyping}><Send size={18}/></button>
          </div>
        </div>
      </div>
      
      <div className="drawer-side z-50">
        <label htmlFor="my-drawer" className="drawer-overlay backdrop-blur-sm"></label>
        <SidebarContent />
      </div>
      
      {showSettings && settings && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-base-100 w-full max-w-lg rounded-3xl flex flex-col shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-white/10 flex justify-between items-center"><h3 className="font-bold text-xl">系统设置</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowSettings(false)}><X size={20}/></button></div>
            <form onSubmit={(e:any)=>{ e.preventDefault(); const fd=new FormData(e.target); db.settings.update(settings.id!, Object.fromEntries(fd) as any).then(()=>{ setShowSettings(false); window.location.reload(); }); }} className="p-6 space-y-4">
               <div><label className="label text-xs uppercase opacity-50 font-bold pb-1">API Config</label><input name="api_base" defaultValue={settings.api_base} className="input input-bordered w-full bg-base-200/50 mb-2"/><input name="api_key" type="password" defaultValue={settings.api_key} className="input input-bordered w-full bg-base-200/50"/></div>
               <div><label className="label text-xs uppercase opacity-50 font-bold pb-1">Model List</label><textarea name="model_list" defaultValue={settings.model_list} className="textarea textarea-bordered w-full h-16 bg-base-200/50 font-mono text-xs"/></div>
               <div><label className="label text-xs uppercase opacity-50 font-bold pb-1">SD URL</label><input name="sd_url" defaultValue={settings.sd_url} className="input input-bordered w-full bg-base-200/50"/></div>
               <div className="grid grid-cols-2 gap-4"><div><label className="label text-xs uppercase opacity-50 font-bold pb-1">AppID</label><input name="baidu_appid" defaultValue={settings.baidu_appid} className="input input-bordered w-full bg-base-200/50"/></div><div><label className="label text-xs uppercase opacity-50 font-bold pb-1">Secret</label><input name="baidu_secret" type="password" defaultValue={settings.baidu_secret} className="input input-bordered w-full bg-base-200/50"/></div></div>
               <button type="button" className="btn btn-error btn-outline btn-block btn-sm" onClick={handleDeleteAllImages}>删除所有图片</button>
               <button className="btn btn-primary btn-block mt-4 rounded-xl">保存</button>
            </form>
          </div>
        </div>
      )}

      {showCharEdit && currentChar && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-base-100 w-full max-w-3xl max-h-[90vh] rounded-3xl flex flex-col shadow-2xl border border-white/10">
            <div className="p-5 border-b border-white/10 flex justify-between items-center"><h3 className="font-bold text-xl">角色档案</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowCharEdit(false)}><X size={20}/></button></div>
            <form onSubmit={(e:any)=>{ e.preventDefault(); const fd=new FormData(e.target); db.characters.update(selectedCharId!, Object.fromEntries(fd) as any).then(()=>setShowCharEdit(false)); }} className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
               <div><label className="label font-bold text-sm">代号</label><input name="name" defaultValue={currentChar.name} className="input input-bordered w-full bg-base-200/50 font-bold text-lg"/></div>
               <div className="flex-1 flex flex-col"><label className="label font-bold text-sm flex justify-between"><span>底层指令</span><Code size={14} className="opacity-50"/></label><textarea name="description" defaultValue={currentChar.description} className="textarea textarea-bordered h-48 font-mono text-xs leading-relaxed bg-base-200/50"/></div>
               <div><label className="label font-bold text-sm">长期记忆</label><textarea name="summary" defaultValue={currentChar.summary} className="textarea textarea-bordered h-24 font-mono text-xs bg-base-300/50"/></div>
               <div><label className="label font-bold text-sm">开场白</label><textarea name="first_message" defaultValue={currentChar.first_message} className="textarea textarea-bordered h-20 bg-base-200/50"/></div>
               <button className="btn btn-primary btn-block rounded-xl"><Save size={18}/> 保存</button>
            </form>
          </div>
        </div>
      )}

      {showLorebook && selectedCharId && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-base-100 w-full max-w-2xl max-h-[85vh] rounded-3xl flex flex-col shadow-2xl border border-white/10">
                <div className="p-5 border-b border-white/10 flex justify-between items-center"><h3 className="font-bold text-xl flex items-center gap-2"><Book size={20}/> 世界书</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowLorebook(false)}><X size={20}/></button></div>
                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-3">
                    {lorebookEntries?.map(entry => (
                        <div key={entry.id} className="collapse collapse-arrow bg-base-200/50 border border-white/5">
                            <input type="checkbox" /> 
                            <div className="collapse-title font-bold text-sm flex items-center gap-2"><span className={entry.isActive ? 'text-success' : 'text-base-content/30'}>●</span>{entry.keywords}</div>
                            <div className="collapse-content space-y-2">
                                <textarea className="textarea textarea-bordered w-full text-xs font-mono h-24" defaultValue={entry.content} onBlur={(e) => db.lorebook.update(entry.id!, { content: e.target.value })} placeholder="内容..."/>
                                <div className="flex gap-2">
                                    <input className="input input-bordered input-sm flex-1 text-xs" defaultValue={entry.keywords} onBlur={(e) => db.lorebook.update(entry.id!, { keywords: e.target.value })} placeholder="触发词"/>
                                    <button className={`btn btn-sm ${entry.isActive ? 'btn-success' : 'btn-ghost'}`} onClick={()=>db.lorebook.update(entry.id!, { isActive: !entry.isActive })}>{entry.isActive ? 'On' : 'Off'}</button>
                                    <button className="btn btn-sm btn-error btn-outline" onClick={()=>db.lorebook.delete(entry.id!)}><Trash2 size={14}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {/* 修复 TS 错误：显式断言 selectedCharId! */}
                    <button className="btn btn-ghost btn-block border-dashed border-2 border-base-content/20" onClick={()=>db.lorebook.add({ char_id: selectedCharId!, keywords: "新词条", content: "", isActive: true })}><Plus size={16}/> 添加</button>
                </div>
            </div>
        </div>
      )}

      {showGenModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-base-100 w-full max-w-lg rounded-3xl flex flex-col shadow-2xl border border-white/10">
            <div className="p-5 border-b border-white/10 flex justify-between items-center"><h3 className="font-bold text-xl flex items-center gap-2"><ImageIcon size={20}/> 生图</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowGenModal(false)}><X size={20}/></button></div>
            <div className="p-6 space-y-4">
                <textarea className="textarea textarea-bordered h-32 w-full bg-base-200/50 text-sm leading-relaxed" value={genPrompt} onChange={(e) => setGenPrompt(e.target.value)} placeholder="描述..."/>
                <div className="flex gap-3 mt-4"><button className="btn flex-1 rounded-xl" onClick={()=>setShowGenModal(false)}>取消</button><button className="btn btn-primary flex-1 rounded-xl" onClick={executeGenImage}><Sparkles size={16}/> 生成</button></div>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-base-100 w-full max-w-2xl max-h-[85vh] rounded-3xl flex flex-col shadow-2xl border border-white/10">
            <div className="p-5 border-b border-white/10 flex justify-between items-center"><h3 className="font-bold text-xl flex items-center gap-2"><BookOpen size={20}/> 帮助手册</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowHelp(false)}><X size={20}/></button></div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="prose prose-sm max-w-none"><ReactMarkdown>{HELP_DOC}</ReactMarkdown></div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
export default App;