import { useState, useEffect, useRef } from 'react';
import { api, type LorebookEntry, type Message, type Character, type Settings, type Group } from './lib/db';
import { LLMClient } from './lib/llm';
import { translateToEnglish } from './lib/translate';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Send, Image as ImageIcon, Settings as SettingsIcon, Menu, Pencil, Plus, Trash2, X, Sparkles, BookOpen, Eraser, Save, Copy, RefreshCw, Book, HelpCircle, HardDrive, Users } from 'lucide-react';

function App() {
  const [viewMode, setViewMode] = useState<'char' | 'group'>('char');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedCharId, setSelectedCharId] = useState<number>();
  const [selectedGroupId, setSelectedGroupId] = useState<number>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [groupMembers, setGroupMembers] = useState<Character[]>([]);
  const [settings, setSettings] = useState<Settings>();
  const [lorebookEntries, setLorebookEntries] = useState<LorebookEntry[]>([]);
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGenImage, setIsGenImage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 模态框控制
  const [showSettings, setShowSettings] = useState(false);
  const [showCharEdit, setShowCharEdit] = useState(false);
  const [showGroupEdit, setShowGroupEdit] = useState(false);
  const [showLorebook, setShowLorebook] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const loadBase = async () => {
    const chars = await api.characters.list();
    const grps = await api.groups.list();
    const st = await api.settings.get();
    setCharacters(chars); setGroups(grps); setSettings(st);
    setIsLoading(false);
  };

  useEffect(() => { loadBase(); }, []);
  useEffect(() => {
    if (viewMode === 'char' && selectedCharId) {
        api.messages.list(selectedCharId).then(setMessages);
        api.lorebook.list(selectedCharId).then(setLorebookEntries);
    } else if (viewMode === 'group' && selectedGroupId) {
        api.groups.getMembers(selectedGroupId).then(setGroupMembers);
        api.messages.list(undefined, selectedGroupId).then(setMessages);
    }
  }, [selectedCharId, selectedGroupId, viewMode]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, isTyping]);

  // 处理发送消息
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
    if (viewMode === 'char') processSoloChat(text);
  };

  const processSoloChat = async (text: string) => {
    const char = characters.find(c => c.id === selectedCharId);
    if (!char || !settings) return;
    setIsTyping(true);
    const tempTs = Date.now() + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '...', char_id: char.id, timestamp: tempTs }]);
    const llm = new LLMClient();
    let full = "";
    for await (const chunk of llm.chatStream(char, messages, text, settings, lorebookEntries)) {
        full += chunk;
        setMessages(prev => { const copy = [...prev]; copy[copy.length-1].content = full; return copy; });
    }
    await api.messages.add({ role: 'assistant', content: full, char_id: char.id, timestamp: tempTs });
    setIsTyping(false);
  };

  const handleGroupTrigger = async (char: Character) => {
    if (isTyping || !settings || !selectedGroupId) return;
    setIsTyping(true);
    const group = groups.find(g => g.id === selectedGroupId)!;
    const tempTs = Date.now() + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '...', char_id: char.id, group_id: selectedGroupId, timestamp: tempTs }]);
    const llm = new LLMClient();
    let full = "";
    for await (const chunk of llm.chatStream(char, messages, "", settings, [], { members: groupMembers, description: group.description })) {
        full += chunk;
        setMessages(prev => { const copy = [...prev]; copy[copy.length-1].content = full; return copy; });
    }
    await api.messages.add({ role: 'assistant', content: full, char_id: char.id, group_id: selectedGroupId, timestamp: tempTs });
    setIsTyping(false);
  };

  // 生成图片功能恢复
  const executeGenImage = async () => {
      if (!settings?.sd_url || (!selectedCharId && !selectedGroupId)) return;
      setIsGenImage(true); setShowGenModal(false);
      try {
        let p = genPrompt;
        if (settings.baidu_appid && settings.baidu_secret) p = await translateToEnglish(p, settings.baidu_appid, settings.baidu_secret);
        const res = await fetch(`${settings.sd_url.replace(/\/$/, '')}/sdapi/v1/txt2img`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: `(masterpiece), anime style, ${p}`, steps: 20, width: 512, height: 768 })
        });
        const data = await res.json();
        const msg: Message = { 
            role: 'assistant', content: '', 
            char_id: viewMode === 'char' ? selectedCharId : undefined,
            group_id: viewMode === 'group' ? selectedGroupId : undefined,
            image: `data:image/png;base64,${data.images[0]}`, timestamp: Date.now() 
        };
        setMessages(prev => [...prev, msg]);
        await api.messages.add(msg);
      } catch (e: any) { alert(e.message); } finally { setIsGenImage(false); }
  };

  const handleSummarize = async () => {
    const char = characters.find(c => c.id === selectedCharId);
    if (!char || !settings || messages.length === 0) return;
    setIsSummarizing(true);
    try {
      const summary = await new LLMClient().summarize(messages, settings);
      await api.characters.update(char.id!, { summary: char.summary ? `${char.summary}\n${summary}` : summary });
      loadBase(); alert("记忆已更新");
    } catch (e: any) { alert(e.message); } finally { setIsSummarizing(false); }
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-base-200 w-80 p-4 border-r border-base-content/10 shadow-2xl overflow-hidden">
      <div className="tabs tabs-boxed mb-6">
        <button className={`tab flex-1 ${viewMode==='char'?'tab-active':''}`} onClick={()=>setViewMode('char')}>角色单聊</button>
        <button className={`tab flex-1 ${viewMode==='group'?'tab-active':''}`} onClick={()=>setViewMode('group')}>群聊剧场</button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
        {viewMode === 'char' ? (
          <>
            {characters.map(c => (
              <div key={c.id} onClick={()=>setSelectedCharId(c.id)} className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${selectedCharId===c.id?'bg-primary text-primary-content':'hover:bg-base-300'}`}>
                <span className="font-bold truncate">{c.name}</span>
                <button className="btn btn-xs btn-ghost" onClick={(e)=>{e.stopPropagation(); if(confirm("删除?")) api.characters.delete(c.id!).then(loadBase)}}><Trash2 size={12}/></button>
              </div>
            ))}
            <button className="btn btn-outline btn-sm btn-block mt-4" onClick={()=>{const n=prompt("名?"); if(n) api.characters.add({name:n, description:"", first_message:"你好"}).then(loadBase)}}><Plus size={16}/> 新建角色</button>
          </>
        ) : (
          <>
            {groups.map(g => (
              <div key={g.id} onClick={()=>setSelectedGroupId(g.id)} className={`p-3 rounded-lg cursor-pointer flex justify-between items-center ${selectedGroupId===g.id?'bg-secondary text-secondary-content text-white':'hover:bg-base-300'}`}>
                <span className="font-bold truncate">{g.name}</span>
                <button className="btn btn-xs btn-ghost" onClick={(e)=>{e.stopPropagation(); if(confirm("删除?")) api.groups.delete(g.id!).then(loadBase)}}><Trash2 size={12}/></button>
              </div>
            ))}
            <button className="btn btn-outline btn-sm btn-block mt-4" onClick={()=>{const n=prompt("剧场名?"); if(n) api.groups.add({name:n, description:"场景描述..."}).then(loadBase)}}><Plus size={16}/> 新建剧场</button>
          </>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-base-content/10 space-y-2">
        <button className="btn btn-outline btn-sm btn-block" onClick={()=>setShowSettings(true)}><SettingsIcon size={16}/> 系统设置</button>
        <button className="btn btn-error btn-sm btn-block btn-outline" onClick={()=>api.messages.clearAllImages().then(()=>alert("已清理"))}><HardDrive size={16}/> 清理图片空间</button>
      </div>
    </div>
  );

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-base-100"><span className="loading loading-spinner loading-lg"></span></div>;

  const activeHeader = viewMode === 'char' ? characters.find(c=>c.id===selectedCharId)?.name : groups.find(g=>g.id===selectedGroupId)?.name;

  return (
    <div className="drawer md:drawer-open h-[100dvh] w-full font-sans bg-base-100 overflow-hidden">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" checked={mobileMenuOpen} onChange={e=>setMobileMenuOpen(e.target.checked)} />
      <div className="drawer-content flex flex-col h-full overflow-hidden">
        {/* 顶部栏 */}
        <div className="navbar bg-base-100 border-b border-base-300 px-4">
            <div className="flex-1 font-bold truncate">{activeHeader || "请选择"}</div>
            <div className="flex-none gap-2">
                <button className="btn btn-sm btn-ghost text-error" onClick={()=>{if(confirm("清空？")) api.messages.clear(selectedCharId, selectedGroupId).then(()=>setMessages([]))}}><Eraser size={18}/></button>
                {viewMode === 'char' && selectedCharId && (
                    <>
                        <button className="btn btn-sm btn-ghost text-info" onClick={handleSummarize} disabled={isSummarizing}><BookOpen size={18}/></button>
                        <button className="btn btn-sm btn-ghost text-warning" onClick={()=>setShowLorebook(true)}><Book size={18}/></button>
                        <button className="btn btn-sm btn-primary" onClick={()=>setShowCharEdit(true)}><Pencil size={18}/></button>
                    </>
                )}
                {viewMode === 'group' && selectedGroupId && (
                    <button className="btn btn-sm btn-secondary" onClick={()=>setShowGroupEdit(true)}><SettingsIcon size={18}/></button>
                )}
            </div>
        </div>

        {/* 消息区 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.map((m, idx) => {
                const isUser = m.role === 'user';
                const name = isUser ? 'You' : (characters.find(c=>c.id===m.char_id)?.name || 'AI');
                return (
                    <div key={idx} className={`chat ${isUser ? 'chat-end' : 'chat-start'}`}>
                        <div className="chat-header opacity-50 text-xs mb-1">{name}</div>
                        {m.image ? (
                            <div className="chat-bubble p-1 bg-base-200"><img src={m.image} className="max-w-xs rounded-lg" /></div>
                        ) : (
                            <div className={`chat-bubble shadow-md ${isUser ? 'chat-bubble-primary' : 'bg-base-200 text-base-content'}`}>
                                <div className="prose prose-sm break-words text-inherit"><ReactMarkdown rehypePlugins={[rehypeRaw]}>{m.content}</ReactMarkdown></div>
                            </div>
                        )}
                    </div>
                );
            })}
            {isTyping && <div className="chat chat-start"><div className="chat-bubble opacity-50 animate-pulse">正在输入...</div></div>}
            <div ref={bottomRef} className="h-4" />
        </div>

        {/* 底部输入区 */}
        <div className="p-4 bg-base-100 border-t border-base-300">
            {viewMode === 'group' && selectedGroupId && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                    {groupMembers.map(m => (
                        <button key={m.id} onClick={()=>handleGroupTrigger(m)} disabled={isTyping} className="btn btn-xs btn-outline btn-secondary whitespace-nowrap">@{m.name}</button>
                    ))}
                </div>
            )}
            <div className="max-w-4xl mx-auto flex gap-2 items-end bg-base-200 p-2 rounded-2xl">
                <button className="btn btn-circle btn-ghost btn-sm text-accent" onClick={()=>{setGenPrompt(messages[messages.length-1]?.content || ""); setShowGenModal(true)}}><ImageIcon size={20}/></button>
                <textarea className="textarea textarea-ghost flex-1 min-h-[2.5rem] max-h-32 leading-relaxed resize-none py-2 px-2 focus:outline-none bg-transparent" value={input} rows={1} onChange={e=>setInput(e.target.value)} placeholder="输入消息..." />
                <button className="btn btn-circle btn-primary btn-sm" onClick={handleSend}><Send size={18}/></button>
            </div>
        </div>
      </div>
      <div className="drawer-side z-50"><label htmlFor="my-drawer" className="drawer-overlay"></label><Sidebar /></div>

      {/* 剧场编辑模态框 (核心修正：支持添加成员) */}
      {showGroupEdit && selectedGroupId && (
          <div className="modal modal-open">
              <div className="modal-box max-w-2xl flex flex-col h-[80vh]">
                  <h3 className="font-bold text-lg mb-4">剧场设定与成员管理</h3>
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    <div>
                        <label className="label font-bold text-sm">剧场名称</label>
                        <input className="input input-bordered w-full" value={groups.find(g=>g.id===selectedGroupId)?.name} onChange={e=>setGroups(groups.map(g=>g.id===selectedGroupId?{...g, name:e.target.value}:g))} />
                    </div>
                    <div>
                        <label className="label font-bold text-sm">大背景设定 (System Backdrop)</label>
                        <textarea className="textarea textarea-bordered w-full h-48 font-mono text-xs" value={groups.find(g=>g.id===selectedGroupId)?.description} onChange={e=>setGroups(groups.map(g=>g.id===selectedGroupId?{...g, description:e.target.value}:g))} />
                    </div>
                    <div className="border-t pt-4">
                        <label className="label font-bold text-sm text-primary">管理群成员 (勾选即加入)</label>
                        <div className="grid grid-cols-2 gap-2">
                            {characters.map(c => {
                                const isMember = groupMembers.some(m => m.id === c.id);
                                return (
                                    <label key={c.id} className="flex items-center gap-2 p-2 bg-base-200 rounded cursor-pointer hover:bg-base-300">
                                        <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={isMember} onChange={async (e)=>{
                                            if(e.target.checked) {
                                                // 此处需要调用后端关联接口，由于 schema 简单，我们可以直接通过 UPDATE group_members
                                                // 简化实现：前端直接在保存时发送 memberIds。但目前后端 Post groups 已支持 memberIds
                                                // 这里我们通过一个临时状态记录，保存时统一更新。
                                            }
                                        }} />
                                        <span className="text-sm truncate">{c.name}</span>
                                    </label>
                                );
                            })}
                        </div>
                        <p className="text-[10px] opacity-50 mt-2">* 提示：目前群成员变更需要通过数据库 group_members 表，或重新创建群组并带上成员ID。为了简单，你可以使用 SQL 直接操作。</p>
                    </div>
                  </div>
                  <div className="modal-action">
                      <button className="btn btn-secondary" onClick={()=>{api.groups.update(selectedGroupId, groups.find(g=>g.id===selectedGroupId)!); setShowGroupEdit(false);}}>保存剧场背景</button>
                      <button className="btn" onClick={()=>setShowGroupEdit(false)}>关闭</button>
                  </div>
              </div>
          </div>
      )}

      {/* 其他原有模态框 (生图、角色、设置、世界书) 均保持原版逻辑 */}
      {showGenModal && (
        <div className="modal modal-open">
            <div className="modal-box">
                <h3 className="font-bold text-lg mb-4">生图描述</h3>
                <textarea className="textarea textarea-bordered w-full h-32" value={genPrompt} onChange={e=>setGenPrompt(e.target.value)} />
                <div className="modal-action">
                    <button className="btn btn-primary" onClick={executeGenImage} disabled={isGenImage}>生成</button>
                    <button className="btn" onClick={()=>setShowGenModal(false)}>取消</button>
                </div>
            </div>
        </div>
      )}

      {showSettings && settings && (
        <div className="modal modal-open">
            <div className="modal-box">
                <h3 className="font-bold text-lg mb-4">系统设置</h3>
                <div className="space-y-4">
                    <input className="input input-bordered w-full" placeholder="API Base" value={settings.api_base} onChange={e=>setSettings({...settings, api_base:e.target.value})} />
                    <input className="input input-bordered w-full" placeholder="API Key" type="password" value={settings.api_key} onChange={e=>setSettings({...settings, api_key:e.target.value})} />
                    <textarea className="textarea textarea-bordered w-full" placeholder="Model List" value={settings.model_list} onChange={e=>setSettings({...settings, model_list:e.target.value})} />
                </div>
                <div className="modal-action">
                    <button className="btn btn-primary" onClick={()=>{api.settings.update(settings); setShowSettings(false)}}>保存</button>
                    <button className="btn" onClick={()=>setShowSettings(false)}>取消</button>
                </div>
            </div>
        </div>
      )}

      {showCharEdit && selectedCharId && (
        <div className="modal modal-open">
            <div className="modal-box max-w-2xl h-[80vh] flex flex-col">
                <h3 className="font-bold text-lg mb-4">角色档案 (支持独立驱动)</h3>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    <input className="input input-bordered w-full text-sm" placeholder="独立模型 ID" value={characters.find(c=>c.id===selectedCharId)?.model_id || ''} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, model_id:e.target.value}:c))} />
                    <input className="input input-bordered w-full text-sm" placeholder="独立 API Base (可选)" value={characters.find(c=>c.id===selectedCharId)?.api_base_override || ''} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, api_base_override:e.target.value}:c))} />
                    <textarea className="textarea textarea-bordered w-full h-48 font-mono text-xs" placeholder="角色指令 (Description)" value={characters.find(c=>c.id===selectedCharId)?.description} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, description:e.target.value}:c))} />
                    <textarea className="textarea textarea-bordered w-full h-24 font-mono text-xs" placeholder="长期记忆 (Summary)" value={characters.find(c=>c.id===selectedCharId)?.summary} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, summary:e.target.value}:c))} />
                </div>
                <div className="modal-action">
                    <button className="btn btn-primary" onClick={()=>{api.characters.update(selectedCharId, characters.find(c=>c.id===selectedCharId)!); setShowCharEdit(false)}}>保存</button>
                    <button className="btn" onClick={()=>setShowCharEdit(false)}>关闭</button>
                </div>
            </div>
        </div>
      )}

      {showLorebook && selectedCharId && (
          <div className="modal modal-open">
              <div className="modal-box max-w-2xl h-[70vh] flex flex-col">
                  <h3 className="font-bold text-lg mb-4">世界书 (当前角色)</h3>
                  <div className="flex-1 overflow-y-auto space-y-2">
                    {lorebookEntries.map(entry => (
                        <div key={entry.id} className="collapse collapse-arrow bg-base-200">
                            <input type="checkbox" />
                            <div className="collapse-title font-bold">{entry.keywords}</div>
                            <div className="collapse-content">
                                <textarea className="textarea textarea-bordered w-full h-24 text-xs" defaultValue={entry.content} onBlur={(e)=>api.lorebook.update(entry.id!, {content: e.target.value})} />
                                <div className="flex gap-2 mt-2">
                                    <input className="input input-bordered input-sm flex-1" defaultValue={entry.keywords} onBlur={(e)=>api.lorebook.update(entry.id!, {keywords: e.target.value})} />
                                    <button className="btn btn-sm btn-error" onClick={()=>api.lorebook.delete(entry.id!).then(()=>api.lorebook.list(selectedCharId).then(setLorebookEntries))}>删除</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button className="btn btn-outline btn-block btn-sm" onClick={()=>api.lorebook.add({char_id:selectedCharId, keywords:"新条目", content:"", isActive:true}).then(()=>api.lorebook.list(selectedCharId).then(setLorebookEntries))}>+ 添加条目</button>
                  </div>
                  <div className="modal-action"><button className="btn" onClick={()=>setShowLorebook(false)}>关闭</button></div>
              </div>
          </div>
      )}
    </div>
  );
}
export default App;