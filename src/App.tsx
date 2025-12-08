import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initDB } from './lib/db';
import { LLMClient } from './lib/llm';
import { translateToEnglish } from './lib/translate';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Send, Image as ImageIcon, Settings as SettingsIcon, Menu, User, Bot, Pencil, Plus, Trash2, Code, X, Sparkles, AlertCircle, Activity, MapPin, Brain, Eye } from 'lucide-react';

// ==========================================
// 🎨 愚者酒馆风格 - 扩展组件库 (Extensions)
// ==========================================
const XMLComponents = {
  // 1. NPC 识别卡 (类似酒馆的 Character Card)
  "npc_card": ({children, ...props}: any) => (
    <div className="card bg-base-100 shadow-xl border-l-4 border-warning my-4 w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="card-body p-4 gap-2">
        <h2 className="card-title text-sm opacity-50 uppercase tracking-widest flex items-center gap-2">
          <User size={14}/> NPC Detected
        </h2>
        {children}
      </div>
    </div>
  ),
  // 子标签映射
  "name": ({children}: any) => <div className="text-xl font-black text-primary">{children}</div>,
  "identity": ({children}: any) => <div className="text-sm font-bold opacity-80">{children}</div>,
  "tags": ({children}: any) => <div className="flex flex-wrap gap-1 my-1">{children}</div>,
  "tag": ({children, color="neutral"}: any) => <span className={`badge badge-sm badge-outline`}>{children}</span>,
  // 稀有度特殊处理
  "rarity": ({children}: any) => {
    const text = String(children).toLowerCase();
    let colorClass = "text-base-content";
    if(text.includes("gold") || text.includes("legend")) colorClass = "text-yellow-400 drop-shadow-md font-bold";
    else if(text.includes("purple") || text.includes("epic")) colorClass = "text-purple-400 font-bold";
    else if(text.includes("blue") || text.includes("rare")) colorClass = "text-blue-400 font-bold";
    return <div className={`text-xs uppercase tracking-wide border px-2 py-0.5 rounded ${colorClass} border-current opacity-80 inline-block`}>{children}</div>;
  },
  "stats": ({children}: any) => <div className="bg-base-300 rounded p-2 text-xs font-mono grid grid-cols-3 gap-2 text-center mt-2">{children}</div>,
  "stat": ({children, label}: any) => <div className="flex flex-col"><span className="opacity-50 text-[10px]">{label}</span><span className="font-bold text-accent">{children}</span></div>,
  "xp": ({children}: any) => <div className="text-xs text-error mt-1 flex items-center gap-1"><Brain size={12}/> <span className="italic">{children}</span></div>,
  "action": ({children}: any) => <div className="text-sm mt-2 italic border-l-2 border-base-content/20 pl-2">{children}</div>,


  // 2. 底部状态栏 (类似 RPG 游戏的 HUD)
  "status_panel": ({children}: any) => (
    <div className="stats stats-vertical md:stats-horizontal shadow bg-black/40 backdrop-blur-md border border-white/10 w-full my-4 text-xs md:text-sm">
      {children}
    </div>
  ),
  // HUD 的子组件
  "hud_item": ({children, icon, label, color="text-primary"}: any) => (
    <div className="stat p-2 place-items-center">
      <div className={`stat-title text-[10px] uppercase flex items-center gap-1 ${color}`}>
        {icon === 'eye' && <Eye size={10}/>}
        {icon === 'map' && <MapPin size={10}/>}
        {icon === 'activity' && <Activity size={10}/>}
        {label}
      </div>
      <div className="stat-value text-sm md:text-base">{children}</div>
    </div>
  ),
  "suggestion": ({children}: any) => (
    <div className="alert alert-info py-1 px-3 text-xs rounded-none bg-info/10 border-0 flex gap-2">
      <Sparkles size={14} className="shrink-0"/>
      <span>{children}</span>
    </div>
  ),

  // 3. 通用容器
  "div": ({node, className, ...props}: any) => <div className={className} {...props}/>,
  "span": ({node, className, ...props}: any) => <span className={className} {...props}/>,
  // 必须加上这个，否则根级 response 会破坏布局
  "response": ({children}: any) => <div className="w-full space-y-2">{children}</div>
};

// ... (App 组件的其他部分代码保持不变，除了下面提到的 XMLComponents 引用)

function App() {
  // ... (状态定义保持不变)
  const [selectedCharId, setSelectedCharId] = useState<number>();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
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

  // 自动纠正模型逻辑
  useEffect(() => {
    if (settings && modelOptions.length > 0) {
      const isValid = settings.model && modelOptions.includes(settings.model);
      if (!isValid) db.settings.update(settings.id!, { model: modelOptions[0] });
    }
  }, [settings?.model_list, settings?.model, settings?.id]);

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
    // ... (生图 handleGenImage 逻辑保持不变)
    const handleGenImage = async () => {
        if (!settings?.sd_url) return alert("请在设置中配置 Stable Diffusion URL");
        const lastMsg = messages?.[messages.length - 1]?.content;
        if (!lastMsg) return;
        if (!confirm("即将调用 SD 生成当前场景插图，确定吗？")) return;
    
        setIsGenImage(true);
        try {
          // 提取纯文本 Prompt，移除 XML 标签
          let prompt = lastMsg.replace(/<[^>]*>?/gm, ' ').slice(0, 300); 
          if (settings.baidu_appid) prompt = await translateToEnglish(prompt, settings.baidu_appid, settings.baidu_secret);
          
          const res = await fetch(`${settings.sd_url}/sdapi/v1/txt2img`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              prompt: `(masterpiece:1.2), best quality, anime style, ${prompt}`, 
              negative_prompt: "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry",
              steps: 20, 
              width: 512, 
              height: 768, 
              cfg_scale: 7,
              sampler_name: "DPM++ 2M Karras"
            })
          });
          
          if (!res.ok) throw new Error(`SD API Error: ${res.status}`);
          const data = await res.json();
          if (!data.images || data.images.length === 0) throw new Error("No image generated");
          
          await db.messages.add({ char_id: selectedCharId!, role: 'assistant', content: '', image: `data:image/png;base64,${data.images[0]}`, timestamp: Date.now() });
        } catch (e: any) { alert("生图失败: " + e.message); } finally { setIsGenImage(false); }
    };

    // SidebarContent 保持不变
    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-base-300 text-base-content w-80 p-4 border-r border-base-content/5">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-primary flex items-center gap-2"><Sparkles size={20}/> SimpleRP</h2>
            <button className="btn btn-sm btn-ghost btn-square" onClick={() => {
            const name = prompt("新建角色名:"); 
            if(name) db.characters.add({ name, description:"", personality:"", scenario:"", first_message:"", mes_example:"" });
            }}><Plus size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {characters?.map(c => (
            <div key={c.id} className={`flex group rounded-xl p-2 transition-all ${selectedCharId===c.id ? 'bg-primary text-primary-content shadow-lg' : 'hover:bg-base-200'}`}>
                <button onClick={() => { setSelectedCharId(c.id); setMobileMenuOpen(false); }} className="flex-1 text-left font-medium truncate pl-2">{c.name}</button>
                {selectedCharId === c.id && <button className="btn btn-xs btn-circle btn-ghost text-primary-content/70 hover:text-white" onClick={(e)=>{e.stopPropagation();if(confirm("删除此角色?")) db.characters.delete(c.id!)}}><Trash2 size={12}/></button>}
            </div>
            ))}
        </div>
        <div className="mt-4 pt-4 border-t border-base-content/10">
            <button className="btn btn-outline btn-block gap-2" onClick={() => { setShowSettings(true); setMobileMenuOpen(false); }}><SettingsIcon size={16}/> 设置</button>
        </div>
        </div>
    );

  return (
    <div className="drawer md:drawer-open h-full font-sans">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" checked={mobileMenuOpen} onChange={e => setMobileMenuOpen(e.target.checked)} />
      
      <div className="drawer-content flex flex-col h-full overflow-hidden bg-base-100">
        {/* Navbar */}
        <div className="navbar bg-base-100/95 backdrop-blur border-b border-base-content/10 min-h-[3.5rem] z-10 sticky top-0">
          <div className="flex-none md:hidden"><label htmlFor="my-drawer" className="btn btn-square btn-ghost"><Menu/></label></div>
          <div className="flex-1 px-2 mx-2 flex items-center gap-2 overflow-hidden">
            <span className="font-bold text-lg truncate">{currentChar?.name}</span>
            <button className="btn btn-xs btn-ghost btn-circle opacity-50 hover:opacity-100" onClick={() => setShowCharEdit(true)}><Pencil size={14}/></button>
          </div>
          <div className="flex-none flex items-center gap-2">
            <select 
              key={settings?.model}
              className={`select select-bordered select-sm max-w-[10rem] md:max-w-xs bg-base-200/50 ${(!settings?.model) ? 'select-error' : ''}`}
              value={settings?.model || ''} 
              onChange={(e) => db.settings.update(settings!.id!, { model: e.target.value })}
            >
              {modelOptions.length === 0 && <option value="" disabled>无模型配置</option>}
              {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {!settings?.model && <div className="tooltip tooltip-left text-error" data-tip="未选择模型"><AlertCircle size={18}/></div>}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-base-200/30">
          {currentChar?.custom_css && <style>{currentChar.custom_css}</style>}

          {messages?.map(m => {
            const isUser = m.role === 'user';
            const isImage = !!m.image;
            return (
              <div key={m.id} className={`chat ${isUser ? 'chat-end' : 'chat-start'}`}>
                <div className="chat-header opacity-50 text-xs mb-1 flex items-center gap-1">
                  {isUser ? <User size={12}/> : <Bot size={12}/>} 
                  {isUser ? 'You' : currentChar?.name}
                </div>
                
                {isImage ? (
                  <div className="chat-bubble p-0 bg-transparent rounded-xl overflow-hidden shadow-xl border-2 border-base-content/10">
                    <img src={m.image} className="max-w-xs md:max-w-md object-cover"/>
                  </div>
                ) : (
                  <div className={`${isUser ? 'chat-bubble chat-bubble-primary shadow-lg' : 'w-full max-w-3xl bg-transparent text-base-content p-0'}`}>
                    {/* 移除 prose 的 padding，让卡片撑满 */}
                    <div className={`prose max-w-none ${isUser ? 'text-sm' : ''}`}>
                      <ReactMarkdown 
                        rehypePlugins={[rehypeRaw]}
                        components={XMLComponents as any} 
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input Area (保持不变) */}
        <div className="p-3 md:p-5 bg-base-100 border-t border-base-content/10">
          <div className="flex gap-2 max-w-4xl mx-auto items-end bg-base-200/50 p-2 rounded-2xl border border-base-content/5 focus-within:border-primary/50 transition-colors">
            <button className="btn btn-circle btn-ghost btn-sm text-accent shrink-0 mb-1" onClick={handleGenImage} disabled={isGenImage} title="SD 生图">
               {isGenImage ? <span className="loading loading-spinner loading-xs"/> : <ImageIcon size={18}/>}
            </button>
            <textarea 
              className="textarea textarea-ghost flex-1 min-h-[2.5rem] max-h-48 leading-relaxed resize-none py-2 px-1 focus:outline-none bg-transparent" 
              value={input} 
              rows={1} 
              onChange={e=>{
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }} 
              onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSend(); } }} 
              placeholder="输入行动... (支持 {{char}} 等)"
            />
            <button className="btn btn-circle btn-primary btn-sm shrink-0 mb-1 shadow-lg shadow-primary/30" onClick={handleSend} disabled={isTyping}><Send size={16}/></button>
          </div>
        </div>
      </div>
      
      {/* 侧边栏和 Modal 保持不变 */}
      <div className="drawer-side z-50"><label htmlFor="my-drawer" className="drawer-overlay"></label><SidebarContent /></div>
      
      {/* Settings Modal (保持不变，省略以节省空间，直接用上文的即可) */}
      {showSettings && settings && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-base-100 w-full max-w-lg max-h-[85vh] rounded-2xl flex flex-col shadow-2xl border border-white/10">
            <div className="p-4 border-b border-base-content/10 flex justify-between items-center"><h3 className="font-bold text-lg">系统设置</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowSettings(false)}><X size={18}/></button></div>
            <form onSubmit={(e:any)=>{ e.preventDefault(); const fd=new FormData(e.target); db.settings.update(settings.id!, Object.fromEntries(fd) as any).then(()=>{ setShowSettings(false); window.location.reload(); }); }} className="p-6 overflow-y-auto space-y-4">
               <div className="form-control"><label className="label"><span className="label-text">API Base</span></label><input name="api_base" defaultValue={settings.api_base} className="input input-bordered text-xs"/></div>
               <div className="form-control"><label className="label"><span className="label-text">API Key</span></label><input name="api_key" type="password" defaultValue={settings.api_key} className="input input-bordered text-xs"/></div>
               <div className="form-control"><label className="label"><span className="label-text">模型列表</span></label><textarea name="model_list" defaultValue={settings.model_list} className="textarea textarea-bordered text-xs h-20"/></div>
               <div className="form-control"><label className="label"><span className="label-text">SD URL</span></label><input name="sd_url" defaultValue={settings.sd_url} className="input input-bordered text-xs"/></div>
               <div className="grid grid-cols-2 gap-4"><input name="baidu_appid" defaultValue={settings.baidu_appid} className="input input-bordered" placeholder="AppID"/><input name="baidu_secret" type="password" defaultValue={settings.baidu_secret} className="input input-bordered" placeholder="Secret"/></div>
               <button className="btn btn-primary btn-block mt-4">保存</button>
            </form>
          </div>
        </div>
      )}

      {/* Char Edit Modal (保持不变，省略) */}
      {showCharEdit && currentChar && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-base-100 w-full max-w-3xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl border border-white/10">
            <div className="p-4 border-b border-base-content/10 flex justify-between items-center"><h3 className="font-bold text-lg">编辑角色</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowCharEdit(false)}><X size={18}/></button></div>
            <form onSubmit={(e:any)=>{ e.preventDefault(); const fd=new FormData(e.target); db.characters.update(selectedCharId!, Object.fromEntries(fd) as any).then(()=>setShowCharEdit(false)); }} className="p-6 overflow-y-auto space-y-4 flex-1">
               <div className="grid grid-cols-2 gap-4"><input name="name" defaultValue={currentChar.name} className="input input-bordered"/><input name="personality" defaultValue={currentChar.personality} className="input input-bordered"/></div>
               <textarea name="description" defaultValue={currentChar.description} className="textarea textarea-bordered h-24 text-xs"/>
               <textarea name="scenario" defaultValue={currentChar.scenario} className="textarea textarea-bordered h-24 text-xs"/>
               <div className="collapse collapse-arrow bg-base-200"><input type="checkbox"/><div className="collapse-title text-sm"><Code size={14}/> XML 模板</div><div className="collapse-content"><textarea name="output_template" defaultValue={currentChar.output_template} className="textarea textarea-bordered w-full h-40 font-mono text-xs"/></div></div>
               <textarea name="first_message" defaultValue={currentChar.first_message} className="textarea textarea-bordered"/>
               <button className="btn btn-primary btn-block">保存</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;