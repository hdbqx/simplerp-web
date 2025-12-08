import { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initDB } from './lib/db';
import { LLMClient } from './lib/llm'; // 假设 fetchModels 已被移除或未使用，这里只导入 LLMClient
import { translateToEnglish } from './lib/translate';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
// 确保导入的图标都在代码里用到了
import { Send, Image as ImageIcon, Settings as SettingsIcon, Menu, User, Bot, Pencil, Plus, Trash2, Code, X } from 'lucide-react';

function App() {
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
      for await (const chunk of llm.chatStream(char, history, text, settings)) {
        fullText += chunk;
        await db.messages.update(aiMsgId, { content: fullText });
      }
    }
    setIsTyping(false);
  };

  const handleGenImage = async () => {
    if (!settings?.sd_url) return alert("请配置 SD URL");
    const lastMsg = messages?.[messages.length - 1]?.content;
    if (!lastMsg) return;
    if (!confirm("基于此消息生图？")) return;

    setIsGenImage(true);
    try {
      let prompt = lastMsg.replace(/<[^>]*>?/gm, ''); 
      if (settings.baidu_appid) prompt = await translateToEnglish(prompt, settings.baidu_appid, settings.baidu_secret);
      
      const res = await fetch(`${settings.sd_url}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `masterpiece, ${prompt}`, steps: 20, width: 512, height: 768, cfg_scale: 7 })
      });
      if (!res.ok) throw new Error("SD Error");
      const data = await res.json();
      await db.messages.add({ char_id: selectedCharId!, role: 'assistant', content: '', image: `data:image/png;base64,${data.images[0]}`, timestamp: Date.now() });
    } catch (e: any) { alert(e.message); } finally { setIsGenImage(false); }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-base-200 text-base-content w-80 p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-primary">SimpleRP</h2>
        <button className="btn btn-sm btn-circle btn-outline" onClick={() => {
           const name = prompt("角色名:"); 
           if(name) db.characters.add({ name, description:"", personality:"", scenario:"", first_message:"", mes_example:"" });
        }}><Plus size={16}/></button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {characters?.map(c => (
          <div key={c.id} className="flex group bg-base-100 rounded-lg p-1">
            <button onClick={() => { setSelectedCharId(c.id); setMobileMenuOpen(false); }} className={`btn btn-sm flex-1 justify-start no-animation ${selectedCharId===c.id ? 'btn-primary' : 'btn-ghost'}`}>{c.name}</button>
            {selectedCharId === c.id && <button className="btn btn-sm btn-square btn-ghost text-error" onClick={(e)=>{e.stopPropagation();if(confirm("删?")) db.characters.delete(c.id!)}}><Trash2 size={14}/></button>}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-base-content/10">
        <button className="btn btn-outline btn-block gap-2" onClick={() => { setShowSettings(true); setMobileMenuOpen(false); }}><SettingsIcon size={16}/> 设置</button>
      </div>
    </div>
  );

  return (
    <div className="drawer md:drawer-open h-full">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" checked={mobileMenuOpen} onChange={e => setMobileMenuOpen(e.target.checked)} />
      
      <div className="drawer-content flex flex-col h-full overflow-hidden bg-base-100">
        {/* Topbar */}
        <div className="navbar bg-base-100 border-b border-base-content/10 min-h-[3.5rem] z-10 shadow-sm">
          <div className="flex-none md:hidden"><label htmlFor="my-drawer" className="btn btn-square btn-ghost"><Menu/></label></div>
          <div className="flex-1 px-2 mx-2 flex items-center gap-2 overflow-hidden">
            <span className="font-bold text-lg truncate">{currentChar?.name}</span>
            <button className="btn btn-xs btn-ghost btn-circle" onClick={() => setShowCharEdit(true)}><Pencil size={14}/></button>
          </div>
          <div className="flex-none">
            <select className="select select-bordered select-sm max-w-[8rem] md:max-w-xs" value={settings?.model || ''} onChange={(e) => db.settings.update(settings!.id!, { model: e.target.value })}>
              {modelOptions.length===0 && <option value="">无模型</option>}
              {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-4 bg-base-200/50">
          {currentChar?.custom_css && <style>{currentChar.custom_css}</style>}

          {messages?.map(m => {
            const isUser = m.role === 'user';
            const isImage = !!m.image;
            return (
              <div key={m.id} className={`chat ${isUser ? 'chat-end' : 'chat-start'}`}>
                <div className="chat-header opacity-50 text-xs mb-1 flex items-center gap-1">
                  {/* 使用 User 和 Bot 图标，解决 TS6133 报错 */}
                  {isUser ? <User size={12}/> : <Bot size={12}/>} 
                  {isUser ? 'You' : currentChar?.name}
                </div>
                {isImage ? (
                  <div className="chat-bubble p-0 bg-transparent border-2 border-primary/20 rounded-xl overflow-hidden"><img src={m.image} className="max-w-xs md:max-w-md"/></div>
                ) : (
                  <div className={`${isUser ? 'chat-bubble chat-bubble-primary shadow-lg' : 'w-full max-w-none bg-transparent text-base-content p-0'}`}>
                    <div className={`prose prose-invert max-w-none ${isUser ? 'text-sm' : ''}`}>
                      <ReactMarkdown 
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          // 修复点：添加 :any 类型，解决 TS7031 报错
                          "response": ({node, ...props}: any) => <div className="xml-response" {...props} />,
                          "scene": ({node, ...props}: any) => <div className="xml-scene" {...props} />,
                          "current_task": ({node, ...props}: any) => <div className="xml-current-task" {...props} />,
                          "participants": ({node, ...props}: any) => <div className="xml-participants" {...props} />,
                          "environment": ({node, ...props}: any) => <div className="xml-environment" {...props} />,
                          "dialogue": ({node, ...props}: any) => <div className="xml-dialogue" {...props} />
                        }}
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

        {/* Input */}
        <div className="p-2 md:p-4 bg-base-100 border-t border-base-content/10">
          <div className="flex gap-2 max-w-4xl mx-auto items-end">
            <button className="btn btn-circle btn-ghost text-accent shrink-0" onClick={handleGenImage} disabled={isGenImage}>
               {isGenImage ? <span className="loading loading-spinner loading-xs"/> : <ImageIcon size={20}/>}
            </button>
            <textarea className="textarea textarea-bordered flex-1 min-h-[2.5rem] max-h-32 leading-tight resize-none py-2" value={input} rows={1} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSend(); } }} placeholder="发送消息..."/>
            <button className="btn btn-circle btn-primary shrink-0" onClick={handleSend} disabled={isTyping}><Send size={18}/></button>
          </div>
        </div>
      </div>

      <div className="drawer-side z-50"><label htmlFor="my-drawer" className="drawer-overlay"></label><SidebarContent /></div>

      {/* Settings Modal */}
      {showSettings && settings && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-base-100 w-full max-w-lg max-h-[80vh] rounded-xl flex flex-col shadow-2xl">
            <div className="p-4 border-b border-base-content/10 flex justify-between items-center"><h3 className="font-bold text-lg">设置</h3><button onClick={()=>setShowSettings(false)}><X/></button></div>
            <form onSubmit={(e:any)=>{ e.preventDefault(); const fd=new FormData(e.target); db.settings.update(settings.id!, Object.fromEntries(fd) as any).then(()=>{ setShowSettings(false); window.location.reload(); }); }} className="p-4 overflow-y-auto space-y-4">
               <div><label className="label-text">API Base</label><input name="api_base" defaultValue={settings.api_base} className="input input-bordered w-full"/></div>
               <div><label className="label-text">API Key</label><input name="api_key" type="password" defaultValue={settings.api_key} className="input input-bordered w-full"/></div>
               <div><label className="label-text">模型列表 (Endpoint ID, 逗号分隔)</label><textarea name="model_list" defaultValue={settings.model_list} className="textarea textarea-bordered w-full"/></div>
               <div className="divider">生图</div>
               <div><label className="label-text">SD URL (HTTPS)</label><input name="sd_url" defaultValue={settings.sd_url} className="input input-bordered w-full"/></div>
               <div className="grid grid-cols-2 gap-2"><input name="baidu_appid" placeholder="AppID" defaultValue={settings.baidu_appid} className="input input-bordered"/><input name="baidu_secret" placeholder="Secret" type="password" defaultValue={settings.baidu_secret} className="input input-bordered"/></div>
               <button className="btn btn-primary btn-block mt-4">保存并刷新</button>
            </form>
          </div>
        </div>
      )}

      {/* Character Edit Modal */}
      {showCharEdit && currentChar && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-base-100 w-full max-w-lg max-h-[90vh] rounded-xl flex flex-col shadow-2xl">
            <div className="p-4 border-b border-base-content/10 flex justify-between items-center"><h3 className="font-bold text-lg">编辑: {currentChar.name}</h3><button onClick={()=>setShowCharEdit(false)}><X/></button></div>
            <form onSubmit={(e:any)=>{ e.preventDefault(); const fd=new FormData(e.target); db.characters.update(selectedCharId!, Object.fromEntries(fd) as any).then(()=>setShowCharEdit(false)); }} className="p-4 overflow-y-auto space-y-4 flex-1">
               <input name="name" defaultValue={currentChar.name} className="input input-bordered w-full" placeholder="姓名"/>
               <textarea name="description" defaultValue={currentChar.description} className="textarea textarea-bordered w-full h-20" placeholder="简介"/>
               
               {/* XML & CSS 编辑器 - 使用了 Code 图标，解决 TS6133 报错 */}
               <div className="collapse collapse-arrow bg-base-200">
                 <input type="checkbox"/>
                 <div className="collapse-title font-medium text-sm flex items-center gap-2">
                   <Code size={14}/> XML 模板 & CSS
                 </div>
                 <div className="collapse-content space-y-2">
                   <textarea name="output_template" defaultValue={currentChar.output_template} className="textarea textarea-bordered w-full h-32 font-mono text-xs" placeholder="<response>..."/>
                   <textarea name="custom_css" defaultValue={currentChar.custom_css} className="textarea textarea-bordered w-full h-20 font-mono text-xs" placeholder="custom css..."/>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-2"><input name="personality" defaultValue={currentChar.personality} className="input input-bordered" placeholder="性格"/><input name="scenario" defaultValue={currentChar.scenario} className="input input-bordered" placeholder="场景"/></div>
               <textarea name="first_message" defaultValue={currentChar.first_message} className="textarea textarea-bordered w-full" placeholder="开场白"/>
               <button className="btn btn-primary btn-block">保存</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;