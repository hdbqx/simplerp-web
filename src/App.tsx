import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initDB } from './lib/db';
import { LLMClient } from './lib/llm';
import { translateToEnglish } from './lib/translate';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Send, Image as ImageIcon, Settings as SettingsIcon, Menu, Pencil, Plus, Trash2, Code, X, Sparkles, BookOpen, Eraser, Save, Copy } from 'lucide-react';

function App() {
  const [selectedCharId, setSelectedCharId] = useState<number>();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  // === 新增状态：生图弹窗控制 ===
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  // ==========================

  const [showSettings, setShowSettings] = useState(false);
  const [showCharEdit, setShowCharEdit] = useState(false);
  const [isGenImage, setIsGenImage] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const characters = useLiveQuery(() => db.characters.toArray());
  const messages = useLiveQuery(
    () => selectedCharId ? db.messages.where('char_id').equals(selectedCharId).toArray() : [], 
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
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const currentChar = characters?.find(c => c.id === selectedCharId);
  const modelOptions = (settings?.model_list || "").split(',').map(m => m.trim()).filter(m => m);

  useEffect(() => {
    if (settings && modelOptions.length > 0) {
      const isValid = settings.model && modelOptions.includes(settings.model);
      if (!isValid) db.settings.update(settings.id!, { model: modelOptions[0] });
    }
  }, [settings?.model_list, settings?.model, settings?.id]);

  const handleDuplicate = async (e: React.MouseEvent, charId: number) => {
    e.stopPropagation();
    const char = await db.characters.get(charId);
    if (char) {
        if(!confirm(`确定要复制「${char.name}」吗？\n这将创建一个新的存档，设定相同，但聊天记录为空。`)) return;
        const { id, ...rest } = char;
        const newId = await db.characters.add({ ...rest, name: `${char.name} (副本)`, summary: "" });
        setSelectedCharId(newId as number);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedCharId || !settings || isTyping) return;
    const text = input; setInput(''); setIsTyping(true);
    await db.messages.add({ char_id: selectedCharId, role: 'user', content: text, timestamp: Date.now() });
    
    const aiMsgId = await db.messages.add({ char_id: selectedCharId, role: 'assistant', content: '...', timestamp: Date.now()+1 });
    const char = await db.characters.get(selectedCharId);

    if(char) {
      const llm = new LLMClient(settings);
      const history = await db.messages.where('char_id').equals(selectedCharId).and(m => m.id !== aiMsgId).toArray();
      let fullText = "";
      try {
        for await (const chunk of llm.chatStream(char, history, text, settings)) {
          fullText += chunk;
          await db.messages.update(aiMsgId, { content: fullText });
        }
      } catch (e: any) {
        await db.messages.update(aiMsgId, { content: fullText + `\n\n[Error: ${e.message}]` });
      }
    }
    setIsTyping(false);
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
    if (!confirm("清空当前聊天记录？(角色设定和记忆将保留)")) return;
    await db.messages.where('char_id').equals(selectedCharId).delete();
    window.location.reload();
  };

  // === 逻辑修改 1: 点击按钮只负责打开弹窗 ===
  const openGenImageModal = () => {
    if (!settings?.sd_url) return alert("请在设置中配置 Stable Diffusion URL");
    const lastMsg = messages?.[messages.length - 1]?.content;
    if (!lastMsg) return alert("当前没有可用于生图的消息");

    // 简单清洗一下 Prompt (去除 Markdown 符号，保留文本)
    const cleanText = lastMsg.replace(/[#*`>]/g, '').slice(0, 500);
    setGenPrompt(cleanText);
    setShowGenModal(true);
  };

  // === 逻辑修改 2: 真正的生图逻辑 (在弹窗点击确定后触发) ===
  const executeGenImage = async () => {
    if (!settings?.sd_url) return;
    
    // 修复 URL 空格问题
    const cleanUrl = settings.sd_url.trim().replace(/\/$/, '');
    
    setIsGenImage(true);
    // 关闭弹窗
    setShowGenModal(false); 

    try {
      let finalPrompt = genPrompt; 
      
      // 自动翻译
      if (settings.baidu_appid) {
          try {
             finalPrompt = await translateToEnglish(finalPrompt, settings.baidu_appid, settings.baidu_secret);
          } catch (e) {
             console.error("翻译失败，将使用原文", e);
          }
      }
      
      const res = await fetch(`${cleanUrl}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            prompt: `(masterpiece:1.2), best quality, anime style, ${finalPrompt}`, 
            negative_prompt: "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, nsfw", // 加上 nsfw 视情况而定
            steps: 20, 
            width: 512, 
            height: 768, 
            cfg_scale: 7, 
            sampler_name: "DPM++ 2M Karras" 
        })
      });
      if (!res.ok) throw new Error(`SD Error: ${res.status}`);
      const data = await res.json();
      await db.messages.add({ char_id: selectedCharId!, role: 'assistant', content: '', image: `data:image/png;base64,${data.images[0]}`, timestamp: Date.now() });
    } catch (e: any) { 
        alert(e.message); 
    } finally { 
        setIsGenImage(false); 
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-base-100/80 backdrop-blur-xl text-base-content w-80 p-4 border-r border-white/5 shadow-2xl">
      <div className="flex justify-between items-center mb-6 pl-2">
        <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary flex items-center gap-2">
            <Sparkles size={20} className="text-primary"/> SimpleRP
        </h2>
        <button className="btn btn-sm btn-ghost btn-square hover:bg-white/10" onClick={() => {
           const name = prompt("新建角色名:"); 
           if(name) db.characters.add({ name, description:"", first_message:"你好！", summary:"" });
        }}><Plus size={20}/></button>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {characters?.map(c => (
          <div key={c.id} className={`group relative flex items-center rounded-xl p-3 transition-all duration-200 border border-transparent ${selectedCharId===c.id ? 'bg-gradient-to-r from-primary/20 to-transparent border-primary/30 shadow-lg translate-x-1' : 'hover:bg-white/5 hover:translate-x-1'}`}>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setSelectedCharId(c.id); setMobileMenuOpen(false); }}>
                <div className={`font-bold truncate ${selectedCharId===c.id ? 'text-primary' : 'text-base-content/80'}`}>{c.name}</div>
                <div className="text-[10px] opacity-40 truncate">#{c.id}</div>
            </div>
            {selectedCharId === c.id && (
                <div className="flex items-center gap-1 opacity-100 transition-opacity">
                    <button className="btn btn-xs btn-ghost btn-square text-base-content/60 hover:text-info" title="复制/新周目" onClick={(e)=>handleDuplicate(e, c.id!)}><Copy size={14}/></button>
                    <button className="btn btn-xs btn-ghost btn-square text-base-content/60 hover:text-error" title="删除" onClick={(e)=>{e.stopPropagation();if(confirm("删除?")) db.characters.delete(c.id!)}}><Trash2 size={14}/></button>
                </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-white/5">
        <button className="btn btn-outline btn-sm btn-block gap-2 font-normal border-white/20 hover:bg-white/10 hover:border-white/30" onClick={() => { setShowSettings(true); setMobileMenuOpen(false); }}>
            <SettingsIcon size={16}/> 系统设置
        </button>
      </div>
    </div>
  );

  return (
    <div className="drawer md:drawer-open h-full font-sans text-base-content">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" checked={mobileMenuOpen} onChange={e => setMobileMenuOpen(e.target.checked)} />
      
      <div className="drawer-content flex flex-col h-full overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/50 via-transparent to-transparent z-0"></div>

        <div className="absolute top-0 left-0 right-0 z-20 p-2 md:p-4 pointer-events-none">
            <div className="navbar min-h-[3rem] glass-panel rounded-2xl pointer-events-auto px-4">
                <div className="flex-none md:hidden mr-2"><label htmlFor="my-drawer" className="btn btn-square btn-ghost btn-sm"><Menu/></label></div>
                
                <div className="flex-1 flex flex-col items-start overflow-hidden">
                    <span className="font-bold text-base md:text-lg truncate flex items-center gap-2">
                        {currentChar?.name}
                        <button className="btn btn-xs btn-ghost btn-circle opacity-50 hover:opacity-100" onClick={() => setShowCharEdit(true)}><Pencil size={12}/></button>
                    </span>
                    <span className="text-[10px] opacity-50 uppercase tracking-wider hidden md:block">Interactive Roleplay System</span>
                </div>
                
                <div className="flex-none flex items-center gap-2">
                    <div className="join bg-base-300/50 rounded-lg p-0.5 border border-white/5">
                        <button className="btn btn-sm btn-ghost join-item text-info" onClick={handleSummarize} disabled={isSummarizing} title="总结记忆">
                            {isSummarizing ? <span className="loading loading-spinner loading-xs"/> : <BookOpen size={16}/>}
                        </button>
                        <button className="btn btn-sm btn-ghost join-item text-error" onClick={handleClearChat} title="清空当前对话">
                            <Eraser size={16}/>
                        </button>
                    </div>
                    
                    <select 
                    className={`select select-bordered select-sm max-w-[8rem] bg-base-100/50 border-white/10 text-xs ${(!settings?.model) ? 'select-error' : ''}`}
                    value={settings?.model || ''} 
                    onChange={(e) => db.settings.update(settings!.id!, { model: e.target.value })}
                    >
                    {modelOptions.length === 0 && <option value="" disabled>无模型</option>}
                    {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-20 pb-24 space-y-6 z-10 scroll-smooth">
          {messages?.map((m, index) => {
            const isUser = m.role === 'user';
            const isImage = !!m.image;
            return (
              <div key={m.id || index} className={`chat animate-message ${isUser ? 'chat-end' : 'chat-start'}`}>
                <div className="chat-header opacity-40 text-[10px] mb-1 flex items-center gap-1 font-mono uppercase tracking-wide">
                  {isUser ? 'Commander' : currentChar?.name}
                </div>
                
                {isImage ? (
                  <div className="chat-bubble p-1 bg-base-200/50 backdrop-blur rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                    <img src={m.image} className="max-w-xs md:max-w-md object-cover rounded-xl"/>
                  </div>
                ) : (
                  <div className={`chat-bubble shadow-xl backdrop-blur-md border ${isUser ? 'chat-bubble-primary bg-gradient-to-br from-primary to-accent text-primary-content border-white/10' : 'bg-base-200/80 text-base-content border-white/5'} max-w-3xl`}>
                    <div className={`prose ${isUser ? 'text-sm' : ''}`}>
                      <ReactMarkdown rehypePlugins={[rehypeRaw]}>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {isTyping && <div className="chat chat-start"><div className="chat-bubble bg-transparent text-xs opacity-50 animate-pulse">Thinking...</div></div>}
          <div ref={bottomRef} />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 z-20 bg-gradient-to-t from-base-100 via-base-100/80 to-transparent pointer-events-none">
          <div className="max-w-4xl mx-auto flex gap-2 items-end glass-panel p-2 rounded-3xl pointer-events-auto ring-1 ring-white/10 focus-within:ring-primary/50 transition-all">
            {/* 修改：点击按钮现在调用 openGenImageModal */}
            <button className="btn btn-circle btn-ghost btn-sm text-accent shrink-0 mb-1 hover:bg-white/10" onClick={openGenImageModal} disabled={isGenImage}>
               {isGenImage ? <span className="loading loading-spinner loading-xs"/> : <ImageIcon size={20}/>}
            </button>
            <textarea 
              className="textarea textarea-ghost flex-1 min-h-[2.5rem] max-h-32 leading-relaxed resize-none py-2 px-2 focus:outline-none bg-transparent placeholder:text-white/20" 
              value={input} rows={1} 
              onChange={e=>{ setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} 
              onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSend(); } }} 
              placeholder="发送指令..."
            />
            <button className="btn btn-circle btn-primary btn-sm shrink-0 mb-1 shadow-lg shadow-primary/40 border-0 bg-gradient-to-r from-primary to-accent text-white" onClick={handleSend} disabled={isTyping}><Send size={18}/></button>
          </div>
        </div>
      </div>
      
      <div className="drawer-side z-50"><label htmlFor="my-drawer" className="drawer-overlay backdrop-blur-sm"></label><SidebarContent /></div>
      
      {/* Settings Modal */}
      {showSettings && settings && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-base-100/90 backdrop-blur w-full max-w-lg rounded-3xl flex flex-col shadow-2xl border border-white/10">
            <div className="p-5 border-b border-white/10 flex justify-between items-center"><h3 className="font-bold text-xl">系统设置</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowSettings(false)}><X size={20}/></button></div>
            <form onSubmit={(e:any)=>{ e.preventDefault(); const fd=new FormData(e.target); db.settings.update(settings.id!, Object.fromEntries(fd) as any).then(()=>{ setShowSettings(false); window.location.reload(); }); }} className="p-6 space-y-4">
               <div><label className="label text-xs uppercase opacity-50 font-bold pb-1">API Base</label><input name="api_base" defaultValue={settings.api_base} className="input input-bordered w-full bg-base-200/50"/></div>
               <div><label className="label text-xs uppercase opacity-50 font-bold pb-1">API Key</label><input name="api_key" type="password" defaultValue={settings.api_key} className="input input-bordered w-full bg-base-200/50"/></div>
               <div><label className="label text-xs uppercase opacity-50 font-bold pb-1">Model List</label><textarea name="model_list" defaultValue={settings.model_list} className="textarea textarea-bordered w-full h-20 bg-base-200/50 font-mono text-xs"/></div>
               <div><label className="label text-xs uppercase opacity-50 font-bold pb-1">SD URL</label><input name="sd_url" defaultValue={settings.sd_url} className="input input-bordered w-full bg-base-200/50"/></div>
               <div className="grid grid-cols-2 gap-4">
                   <div><label className="label text-xs uppercase opacity-50 font-bold pb-1">Baidu AppID</label><input name="baidu_appid" defaultValue={settings.baidu_appid} className="input input-bordered w-full bg-base-200/50"/></div>
                   <div><label className="label text-xs uppercase opacity-50 font-bold pb-1">Baidu Secret</label><input name="baidu_secret" type="password" defaultValue={settings.baidu_secret} className="input input-bordered w-full bg-base-200/50"/></div>
               </div>
               <button className="btn btn-primary btn-block mt-4 rounded-xl">保存设定</button>
            </form>
          </div>
        </div>
      )}

      {/* Char Edit Modal */}
      {showCharEdit && currentChar && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-base-100/95 backdrop-blur w-full max-w-3xl max-h-[90vh] rounded-3xl flex flex-col shadow-2xl border border-white/10">
            <div className="p-5 border-b border-white/10 flex justify-between items-center"><h3 className="font-bold text-xl">角色档案</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowCharEdit(false)}><X size={20}/></button></div>
            <form onSubmit={(e:any)=>{ e.preventDefault(); const fd=new FormData(e.target); db.characters.update(selectedCharId!, Object.fromEntries(fd) as any).then(()=>setShowCharEdit(false)); }} className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
               <div><label className="label font-bold text-sm">代号 / Name</label><input name="name" defaultValue={currentChar.name} className="input input-bordered w-full bg-base-200/50 font-bold text-lg"/></div>
               <div className="flex-1 flex flex-col"><label className="label font-bold text-sm flex justify-between"><span>底层指令 / System Prompt</span><Code size={14} className="opacity-50"/></label><textarea name="description" defaultValue={currentChar.description} className="textarea textarea-bordered h-48 font-mono text-xs leading-relaxed bg-base-200/50" placeholder="在此定义世界观、性格、输出格式..."/></div>
               <div><label className="label font-bold text-sm flex justify-between"><span>长期记忆 / Memory</span><BookOpen size={14} className="opacity-50"/></label><textarea name="summary" defaultValue={currentChar.summary} className="textarea textarea-bordered h-24 font-mono text-xs bg-base-300/50" placeholder="由 AI 总结的历史摘要..."/></div>
               <div><label className="label font-bold text-sm">开场白 / First Message</label><textarea name="first_message" defaultValue={currentChar.first_message} className="textarea textarea-bordered h-20 bg-base-200/50"/></div>
               <button className="btn btn-primary btn-block rounded-xl shadow-lg shadow-primary/20"><Save size={18}/> 保存档案</button>
            </form>
          </div>
        </div>
      )}

      {/* === 新增：生图 Prompt 确认弹窗 === */}
      {showGenModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-base-100/95 backdrop-blur w-full max-w-lg rounded-3xl flex flex-col shadow-2xl border border-white/10">
            <div className="p-5 border-b border-white/10 flex justify-between items-center">
                <h3 className="font-bold text-xl flex items-center gap-2"><ImageIcon size={20}/> 图像生成设定</h3>
                <button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowGenModal(false)}><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
                <p className="text-sm opacity-60">
                    以下是从对话提取的画面描述。您可以修改它以获得更精确的结果。
                    <br/>(系统会自动翻译为英文后发送给 SD)
                </p>
                
                <div className="form-control">
                    <label className="label text-xs uppercase opacity-50 font-bold pb-1">画面描述 (Prompt)</label>
                    <textarea 
                        className="textarea textarea-bordered h-32 w-full bg-base-200/50 text-sm leading-relaxed" 
                        value={genPrompt}
                        onChange={(e) => setGenPrompt(e.target.value)}
                        placeholder="描述想要生成的画面..."
                    />
                </div>

                <div className="flex gap-3 mt-4">
                    <button className="btn flex-1 rounded-xl" onClick={()=>setShowGenModal(false)}>取消</button>
                    <button className="btn btn-primary flex-1 rounded-xl" onClick={executeGenImage}>
                        <Sparkles size={16}/> 开始生成
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;