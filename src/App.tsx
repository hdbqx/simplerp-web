import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initDB } from './lib/db';
import { LLMClient } from './lib/llm';
import { translateToEnglish } from './lib/translate';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Send, Image as ImageIcon, Settings as SettingsIcon, Menu, User, Bot, Pencil, Plus, Trash2, Code, X, Sparkles, BookOpen, Eraser, Save } from 'lucide-react';

function App() {
  const [selectedCharId, setSelectedCharId] = useState<number>();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false); // 总结状态
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

  const handleSend = async () => {
    if (!input.trim() || !selectedCharId || !settings || isTyping) return;
    const text = input; setInput(''); setIsTyping(true);
    await db.messages.add({ char_id: selectedCharId, role: 'user', content: text, timestamp: Date.now() });
    
    const aiMsgId = await db.messages.add({ char_id: selectedCharId, role: 'assistant', content: '...', timestamp: Date.now()+1 });
    const char = await db.characters.get(selectedCharId);

    if(char) {
      const llm = new LLMClient(settings);
      // 这里的 history 依然传给 llm，但 llm 内部只会取最近的 N 条，之前的依赖 memory
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

  // === 核心功能：总结历史 ===
  const handleSummarize = async () => {
    if (!selectedCharId || !settings || !messages || messages.length === 0) return;
    if (!confirm("确定要总结当前对话吗？\nAI 将阅读所有历史记录并生成摘要存入「历史记忆」。\n这需要消耗一些 Token。")) return;

    setIsSummarizing(true);
    try {
      const llm = new LLMClient(settings);
      // 1. 生成摘要
      const summaryText = await llm.summarize(messages, settings);
      
      // 2. 获取旧的记忆 (如果有)
      const oldSummary = currentChar?.summary || "";
      const newSummary = oldSummary ? `${oldSummary}\n\n[新摘要]: ${summaryText}` : summaryText;

      // 3. 写入数据库
      await db.characters.update(selectedCharId, { summary: newSummary });
      
      alert("✅ 总结完成！摘要已存入角色记忆。\n\n你可以点击右上角的「清空对话」来开始新的一轮，AI 会记得之前发生的事。");
      // 可以在这里自动打开编辑框让用户看一眼，或者不打开
      // setShowCharEdit(true); 
    } catch (e: any) {
      alert("总结失败: " + e.message);
    } finally {
      setIsSummarizing(false);
    }
  };

  // === 辅助功能：清空当前对话（不删角色） ===
  const handleClearChat = async () => {
    if (!selectedCharId) return;
    if (!confirm("⚠️ 确定清空聊天记录？\n\n建议先点击「总结」按钮保存记忆，否则 AI 会忘记刚才发生的事。\n\n清空后将保留角色和设定，仅删除屏幕上的消息。")) return;
    
    // 删除该角色的所有消息
    await db.messages.where('char_id').equals(selectedCharId).delete();
    window.location.reload(); // 简单粗暴刷新以更新界面
  };

  const handleGenImage = async () => {
    if (!settings?.sd_url) return alert("请在设置中配置 Stable Diffusion URL");
    const lastMsg = messages?.[messages.length - 1]?.content;
    if (!lastMsg) return;
    if (!confirm("调用 SD 生图？")) return;

    setIsGenImage(true);
    try {
      let prompt = lastMsg.slice(0, 300); 
      if (settings.baidu_appid) prompt = await translateToEnglish(prompt, settings.baidu_appid, settings.baidu_secret);
      
      const res = await fetch(`${settings.sd_url}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: `(masterpiece:1.2), best quality, anime style, ${prompt}`, 
          negative_prompt: "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry",
          steps: 20, width: 512, height: 768, cfg_scale: 7, sampler_name: "DPM++ 2M Karras"
        })
      });
      if (!res.ok) throw new Error(`SD API Error: ${res.status}`);
      const data = await res.json();
      await db.messages.add({ char_id: selectedCharId!, role: 'assistant', content: '', image: `data:image/png;base64,${data.images[0]}`, timestamp: Date.now() });
    } catch (e: any) { alert("生图失败: " + e.message); } finally { setIsGenImage(false); }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-base-300 text-base-content w-80 p-4 border-r border-base-content/5">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-primary flex items-center gap-2"><Sparkles size={20}/> SimpleRP</h2>
        <button className="btn btn-sm btn-ghost btn-square" onClick={() => {
           const name = prompt("新建角色名:"); 
           if(name) db.characters.add({ name, description:"在这里填入设定...", first_message:"你好！", summary:"" });
        }}><Plus size={18}/></button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {characters?.map(c => (
          <div key={c.id} className={`flex group rounded-xl p-2 transition-all ${selectedCharId===c.id ? 'bg-primary text-primary-content shadow-lg' : 'hover:bg-base-200'}`}>
            <button onClick={() => { setSelectedCharId(c.id); setMobileMenuOpen(false); }} className="flex-1 text-left font-medium truncate pl-2">{c.name}</button>
            {selectedCharId === c.id && <button className="btn btn-xs btn-circle btn-ghost text-primary-content/70 hover:text-white" onClick={(e)=>{e.stopPropagation();if(confirm("彻底删除角色?")) db.characters.delete(c.id!)}}><Trash2 size={12}/></button>}
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
          
          <div className="flex-none flex items-center gap-1">
             {/* 总结按钮 */}
            <button className="btn btn-sm btn-ghost text-info tooltip tooltip-bottom" data-tip="总结历史 (保存记忆)" onClick={handleSummarize} disabled={isSummarizing}>
               {isSummarizing ? <span className="loading loading-spinner loading-xs"/> : <BookOpen size={18}/>}
            </button>
             {/* 清空对话按钮 */}
            <button className="btn btn-sm btn-ghost text-error tooltip tooltip-bottom" data-tip="清空对话 (开始新一轮)" onClick={handleClearChat}>
               <Eraser size={18}/>
            </button>
            <div className="w-px h-6 bg-base-content/10 mx-1"></div>
            
            <select 
              key={settings?.model}
              className={`select select-bordered select-sm max-w-[8rem] md:max-w-xs bg-base-200/50 ${(!settings?.model) ? 'select-error' : ''}`}
              value={settings?.model || ''} 
              onChange={(e) => db.settings.update(settings!.id!, { model: e.target.value })}
            >
              {modelOptions.length === 0 && <option value="" disabled>无模型</option>}
              {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
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
                    <div className={`prose max-w-none ${isUser ? 'text-sm' : ''}`}>
                      <ReactMarkdown rehypePlugins={[rehypeRaw]}>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 md:p-5 bg-base-100 border-t border-base-content/10">
          <div className="flex gap-2 max-w-4xl mx-auto items-end bg-base-200/50 p-2 rounded-2xl border border-base-content/5 focus-within:border-primary/50 transition-colors">
            <button className="btn btn-circle btn-ghost btn-sm text-accent shrink-0 mb-1" onClick={handleGenImage} disabled={isGenImage}>
               {isGenImage ? <span className="loading loading-spinner loading-xs"/> : <ImageIcon size={18}/>}
            </button>
            <textarea 
              className="textarea textarea-ghost flex-1 min-h-[2.5rem] max-h-48 leading-relaxed resize-none py-2 px-1 focus:outline-none bg-transparent" 
              value={input} rows={1} 
              onChange={e=>{ setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} 
              onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSend(); } }} 
              placeholder="发送消息..."
            />
            <button className="btn btn-circle btn-primary btn-sm shrink-0 mb-1 shadow-lg shadow-primary/30" onClick={handleSend} disabled={isTyping}><Send size={16}/></button>
          </div>
        </div>
      </div>
      
      <div className="drawer-side z-50"><label htmlFor="my-drawer" className="drawer-overlay"></label><SidebarContent /></div>
      
      {/* Settings Modal (保持不变，省略) */}
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

      {/* Char Edit Modal (极简版) */}
      {showCharEdit && currentChar && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-base-100 w-full max-w-3xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl border border-white/10">
            <div className="p-4 border-b border-base-content/10 flex justify-between items-center"><h3 className="font-bold text-lg">编辑角色</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowCharEdit(false)}><X size={18}/></button></div>
            <form onSubmit={(e:any)=>{ e.preventDefault(); const fd=new FormData(e.target); db.characters.update(selectedCharId!, Object.fromEntries(fd) as any).then(()=>setShowCharEdit(false)); }} className="p-6 overflow-y-auto space-y-4 flex-1">
               
               {/* 1. 名称 */}
               <div className="form-control">
                 <label className="label font-bold"><span className="label-text">角色名称</span></label>
                 <input name="name" defaultValue={currentChar.name} className="input input-bordered w-full"/>
               </div>

               {/* 2. 完整设定 (Prompt) */}
               <div className="form-control flex-1">
                 <label className="label font-bold flex justify-between">
                   <span className="label-text flex items-center gap-2"><Code size={14}/> 完整设定 / System Prompt</span>
                   <span className="label-text-alt opacity-50">在此填入身份、世界观、输出格式等所有内容</span>
                 </label>
                 <textarea name="description" defaultValue={currentChar.description} className="textarea textarea-bordered h-48 font-mono text-xs leading-relaxed" placeholder="你是一个..."/>
               </div>

               {/* 3. 历史记忆 (Summary) */}
               <div className="form-control">
                 <label className="label font-bold flex justify-between">
                   <span className="label-text flex items-center gap-2"><BookOpen size={14}/> 历史记忆 / Memory</span>
                   <span className="label-text-alt opacity-50">点击聊天栏的“总结”按钮会自动填充这里，也可手动修改</span>
                 </label>
                 <textarea name="summary" defaultValue={currentChar.summary} className="textarea textarea-bordered h-24 font-mono text-xs bg-base-200" placeholder="暂无记忆..."/>
               </div>

               {/* 4. 开场白 */}
               <div className="form-control">
                 <label className="label font-bold"><span className="label-text">开场白</span></label>
                 <textarea name="first_message" defaultValue={currentChar.first_message} className="textarea textarea-bordered h-16"/>
               </div>

               <button className="btn btn-primary btn-block mt-2"><Save size={18}/> 保存设定</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;