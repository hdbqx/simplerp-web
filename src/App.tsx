import { useState, useEffect, useRef, useMemo } from 'react';
import { api, type Message, type Character, type Settings, type Group, type LorebookEntry, type ApiPreset } from './lib/db';
import { LLMClient } from './lib/llm';
import { translateToEnglish } from './lib/translate';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { 
  Send, Image as ImageIcon, Settings as SettingsIcon, Menu, Pencil, Plus, Trash2, X, 
  BookOpen, Book, Users, RefreshCw, Square, Save, Eraser, Sparkles, Copy 
} from 'lucide-react';

function App() {
  // --- 鏍稿績鐘舵€?---
  const [viewMode, setViewMode] = useState<'char' | 'group'>('char');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [presets, setPresets] = useState<ApiPreset[]>([]);
  
  // --- API 鍏ㄥ眬鐘舵€?---
  const [activePresetId, setActivePresetId] = useState<number | undefined>();
  const [activeModel, setActiveModel] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<string[]>([]); // 浠呭瓨鍌ㄨ嚜鍔ㄨ幏鍙栫殑
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  // --- 鍩虹鏁版嵁鐘舵€?---
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

  // --- 寮圭獥鎺у埗鐘舵€?---
  const [showSettings, setShowSettings] = useState(false);
  const [showCharEdit, setShowCharEdit] = useState(false);
  const [showGroupEdit, setShowGroupEdit] = useState(false);
  const [showLorebook, setShowLorebook] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  // --- 璁＄畻灞炴€э細鎵嬪姩閰嶇疆鐨勬ā鍨嬪垪琛?---
  const manualModels = useMemo(() => {
    if (!settings?.model_list) return [];
    return settings.model_list.split(/[,锛孿n]/).map(m => m.trim()).filter(m => m);
  }, [settings?.model_list]);

  // --- 鍒濆鍖栨暟鎹?---
  const loadData = async () => {
    try {
        const [c, g, s, p] = await Promise.all([
            api.characters.list(), 
            api.groups.list(), 
            api.settings.get(), 
            api.presets.list()
        ]);
        setCharacters(c); setGroups(g); setSettings(s); setPresets(p);
        
        // 鎭㈠涓婃閫夋嫨鐨?Preset 鍜?Model
        if (s.active_preset_id && p.some(pre => pre.id === s.active_preset_id)) {
            setActivePresetId(s.active_preset_id);
            // 灏濊瘯鍔犺浇妯″瀷鍒楄〃
            const currentPreset = p.find(pre => pre.id === s.active_preset_id);
            if(currentPreset) {
                // 杩欓噷浼犲叆 s.model_list 浠ヤ究 refreshModels 鐭ラ亾鏈夋墜鍔ㄦā鍨嬩綔涓哄厹搴?
                await refreshModels(currentPreset.api_base, currentPreset.api_key, s.active_model_id, s.model_list);
            }
        }
    } catch(e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  // --- API 鐘舵€佺鐞嗛€昏緫 ---
  const refreshModels = async (base: string, key: string, keepModelId?: string, manualListStr?: string) => {
      setIsFetchingModels(true);
      const llm = new LLMClient(base, key);
      const fetchedModels = await llm.fetchModels();
      setAvailableModels(fetchedModels);
      setIsFetchingModels(false);
      
      // 瑙ｆ瀽鎵嬪姩妯″瀷鍒楄〃 (鍙傛暟浼犲叆鎴栦娇鐢ㄥ綋鍓嶇姸鎬?
      const currentManualList = manualListStr !== undefined ? manualListStr : (settings?.model_list || "");
      const manualArr = currentManualList.split(/[,锛孿n]/).map(m => m.trim()).filter(m => m);
      
      // 鍐冲畾閫変腑鍝釜妯″瀷
      // 1. 濡傛灉涔嬪墠閫変腑鐨勬ā鍨嬪湪 鑷姩鍒楄〃 鎴?鎵嬪姩鍒楄〃 涓紝淇濇寔閫変腑
      if (keepModelId && (fetchedModels.includes(keepModelId) || manualArr.includes(keepModelId))) {
          setActiveModel(keepModelId);
      } 
      // 2. 鍚﹀垯浼樺厛閫夎嚜鍔ㄥ垪琛ㄧ殑绗竴涓?
      else if (fetchedModels.length > 0) {
          const first = fetchedModels[0];
          setActiveModel(first);
          if(settings) api.settings.update({ ...settings, active_model_id: first });
      } 
      // 3. 閮芥病鏈夛紝閫夋墜鍔ㄥ垪琛ㄧ涓€涓綔涓哄厹搴?
      else if (manualArr.length > 0) {
          const first = manualArr[0];
          setActiveModel(first);
          if(settings) api.settings.update({ ...settings, active_model_id: first });
      }
      // 4. 濡傛灉閮戒负绌猴紝UI 浼氭樉绀?placeholder
  };

  const handlePresetChange = async (presetIdStr: string) => {
      const pid = parseInt(presetIdStr);
      setActivePresetId(pid);
      if(settings) await api.settings.update({ ...settings, active_preset_id: pid });
      
      const p = presets.find(pre => pre.id === pid);
      if (p) await refreshModels(p.api_base, p.api_key);
  };

  const handleModelChange = async (modelId: string) => {
      setActiveModel(modelId);
      if(settings) await api.settings.update({ ...settings, active_model_id: modelId });
  };

  // --- 鍒囨崲瑙掕壊/鍓у満鏃剁殑鐩戝惉 ---
  useEffect(() => {
    setMessages([]);
    if (viewMode === 'char' && selectedCharId) {
      api.messages.list(selectedCharId).then(setMessages);
      api.lorebook.list(selectedCharId).then(setLorebookEntries);
    } else if (viewMode === 'group' && selectedGroupId) {
      api.groups.getMembers(selectedGroupId).then(ids => {
          setGroupMemberIds(ids);
          api.messages.list(undefined, selectedGroupId).then(setMessages);
          if(ids.length > 0) api.lorebook.list(ids[0]).then(setLorebookEntries);
      });
    }
  }, [selectedCharId, selectedGroupId, viewMode]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, isTyping]);

  // --- 閫昏緫鍑芥暟 ---
  const stopGeneration = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsTyping(false);
    }
  };

  const triggerAI = async (char: Character, textOverride?: string, historyOverride?: Message[]) => {
    if (isTyping || !settings) return;
    if (!activePresetId || !activeModel) { return alert("璇峰厛鍦ㄩ《閮ㄥ鑸爮閫夋嫨 API 棰勮鍜屾ā鍨嬶紒"); }
    
    const currentPreset = presets.find(p => p.id === activePresetId);
    if (!currentPreset) { return alert("鏃犳晥鐨?API 棰勮"); }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setIsTyping(true);
    const tempTs = Date.now() + 1;
    const currentHistory = (historyOverride || messages).filter(m => m.content || m.role === 'user');
    
    setMessages(prev => [...prev, { role: 'assistant', content: '', char_id: char.id, timestamp: tempTs }]);
    
    const llm = new LLMClient(currentPreset.api_base, currentPreset.api_key);
    let fullContent = "";

    try {
      const stream = llm.chatStream(
        char, currentHistory, textOverride || "", 
        settings, activeModel, 
        lorebookEntries, 
        viewMode === 'group' ? {
          name: groups.find(g => g.id === selectedGroupId)?.name || "",
          description: groups.find(g => g.id === selectedGroupId)?.description || "",
          members: characters.filter(c => groupMemberIds.includes(c.id!))
        } : undefined,
        controller
      );

      for await (const chunk of stream) {
        fullContent += chunk;
        setMessages(prev => prev.map(m => m.timestamp === tempTs ? { ...m, content: fullContent } : m));
      }
    } catch (e: any) {
        if (e.name !== 'AbortError') console.error("鐢熸垚澶辫触:", e);
    } finally {
      if (fullContent.trim().length > 0) {
          try {
            const res = await api.messages.add({ 
                role: 'assistant', content: fullContent, char_id: char.id, 
                group_id: viewMode === 'group' ? selectedGroupId : undefined, 
                timestamp: tempTs 
            });
            setMessages(prev => prev.map(m => m.timestamp === tempTs ? { ...m, id: res.id } : m));
          } catch (dbErr) { console.error("鎸佷箙鍖栧け璐?, dbErr); }
      } else {
          setMessages(prev => prev.filter(m => m.timestamp !== tempTs));
      }
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const handleGenImageAction = async () => {
    if (!settings?.sd_url) return alert("璇峰湪璁剧疆涓厤缃?SD URL");
    if (!activePresetId || !activeModel) return alert("璇峰厛閫夋嫨 API 妯″瀷鐢ㄤ簬鐢熸垚 Prompt");

    const rawPrompt = genPrompt || (messages.length > 0 ? messages[messages.length - 1].content : "");
    if (!rawPrompt) return;

    setShowGenModal(false);
    setIsTyping(true);
    try {
      const currentPreset = presets.find(p => p.id === activePresetId)!;
      const llm = new LLMClient(currentPreset.api_base, currentPreset.api_key);
      const tags = await llm.generateImageTags(rawPrompt, activeModel);
      const finalTags = settings!.baidu_appid ? await translateToEnglish(tags, settings!.baidu_appid, settings!.baidu_secret!) : tags;
      
      const payload = {
        prompt: `1girl, (photorealistic:1.3), best quality, ultra high res, soft lighting, ${finalTags}`,
        negative_prompt: "(worst quality:2), (low quality:2), (normal quality:2), lowres, watermark",
        steps: 20, cfg_scale: 7, sampler_name: "Euler a", width: 512, height: 768, restore_faces: false, enable_hr: false,
      };

      const res = await fetch(`${settings!.sd_url.replace(/\/$/, '')}/sdapi/v1/txt2img`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("SD 鍚庣鏈搷搴?);
      const data = await res.json();
      const base64Img = `data:image/png;base64,${data.images[0]}`;

      const ephemeralMsg: Message = { 
          role: 'assistant', content: '', image: base64Img, timestamp: Date.now(), 
          group_id: selectedGroupId, char_id: selectedCharId 
      };
      setMessages(prev => [...prev, ephemeralMsg]);

    } catch (e: any) { alert("鐢熷浘澶辫触: " + e.message); } finally { setIsTyping(false); }
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

  // --- UI 缁勪欢 ---
  const Sidebar = () => (
    <div className="flex flex-col h-full bg-base-200 w-80 p-4 border-r border-base-content/10 shadow-xl overflow-hidden">
      <div className="flex justify-between items-center mb-6 pl-2">
        <h2 className="font-black text-primary text-xl tracking-tight">SimpleRP Cloud</h2>
        <button className="md:hidden btn btn-ghost btn-xs" onClick={() => setMobileMenuOpen(false)}><X/></button>
      </div>
      <div className="tabs tabs-boxed mb-6">
        <button className={`tab flex-1 transition-all ${viewMode === 'char' ? 'tab-active font-bold' : ''}`} onClick={() => setViewMode('char')}>鍗曚汉</button>
        <button className={`tab flex-1 transition-all ${viewMode === 'group' ? 'tab-active font-bold' : ''}`} onClick={() => setViewMode('group')}>鍓у満</button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1 text-base-content">
        {viewMode === 'char' ? characters.map(c => (
          <div key={c.id} onClick={() => { setSelectedCharId(c.id); setMobileMenuOpen(false); }} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group ${selectedCharId === c.id ? 'bg-primary text-primary-content shadow-lg' : 'hover:bg-base-300'}`}>
            <span className="font-bold truncate max-w-[140px]">{c.name}</span>
            <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity items-center">
                <button className="hover:text-info p-1" title="鍒涘缓鍓湰" onClick={async (e) => {
                    e.stopPropagation();
                    const newName = prompt("鏂拌鑹插悕绉?", `${c.name} (Copy)`);
                    if(newName) { await api.characters.duplicate(c.id!, newName); loadData(); }
                }}><Copy size={14}/></button>
                <button className="hover:text-error p-1" title="鍒犻櫎" onClick={(e) => { 
                    e.stopPropagation(); 
                    if(confirm(`鍒犻櫎瑙掕壊 ${c.name}锛焋)) api.characters.delete(c.id!).then(() => loadData()); 
                }}><Trash2 size={14} /></button>
            </div>
          </div>
        )) : groups.map(g => (
          <div key={g.id} onClick={() => { setSelectedGroupId(g.id); setMobileMenuOpen(false); }} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group ${selectedGroupId === g.id ? 'bg-secondary text-secondary-content shadow-lg' : 'hover:bg-base-300'}`}>
            <span className="font-bold truncate">{g.name}</span>
            <Trash2 size={14} className="opacity-0 group-hover:opacity-100 hover:text-error transition-opacity" onClick={(e) => { e.stopPropagation(); if(confirm(`鍒犻櫎鍓у満 ${g.name}锛焋)) api.groups.delete(g.id!).then(() => loadData()); }} />
          </div>
        ))}
        <button className="btn btn-outline btn-sm btn-block mt-4 border-dashed" onClick={async () => { const n = prompt("鍚嶇О?"); if(n) { if(viewMode==='char') await api.characters.add({name:n, description:"", first_message:"浣犲ソ", summary:""}); else await api.groups.add({name:n, description:""}); await loadData(); } }}><Plus size={16} /> 鏂板缓</button>
      </div>
      <div className="mt-4 pt-4 border-t border-base-content/10"><button className="btn btn-ghost btn-sm btn-block justify-start" onClick={() => {setShowSettings(true); setMobileMenuOpen(false);}}><SettingsIcon size={16} /> 绯荤粺璁剧疆</button></div>
    </div>
  );

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-base-100"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

  return (
    <div className="drawer md:drawer-open h-[100dvh] w-full bg-base-100 overflow-hidden text-base-content">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" checked={mobileMenuOpen} onChange={e=>setMobileMenuOpen(e.target.checked)} />
      <div className="drawer-content flex flex-col h-full overflow-hidden relative">
        {/* Navbar */}
        <div className="navbar bg-base-100 border-b border-base-300 px-2 md:px-4 sticky top-0 z-20 min-h-[3.5rem]">
          <div className="w-full flex items-center gap-2 overflow-x-auto">
          <div className="flex-none md:hidden"><button className="btn btn-square btn-ghost btn-sm" onClick={()=>setMobileMenuOpen(true)}><Menu/></button></div>
          <div className="flex-none font-bold truncate px-1 md:px-2 text-sm md:text-base max-w-[8rem] md:max-w-none">{viewMode==='char'?characters.find(c=>c.id===selectedCharId)?.name:groups.find(g=>g.id===selectedGroupId)?.name || "SimpleRP"}</div>
          
          {/* API Selector (Top Bar) - 宸蹭紭鍖栵紝鏀寔鍒嗙粍鏄剧ず */}
          <div className="flex-none flex items-center gap-1 md:gap-2 ml-auto min-w-max">
            <select className="select select-bordered select-xs md:select-sm w-24 md:max-w-[8rem] text-xs" value={activePresetId || ""} onChange={(e) => handlePresetChange(e.target.value)}>
                <option value="" disabled>閫夋嫨婧?..</option>
                {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="join">
                <select className="select select-bordered select-xs md:select-sm join-item w-28 md:max-w-[10rem] text-xs" value={activeModel} onChange={(e) => handleModelChange(e.target.value)} disabled={!activePresetId}>
                    {/* 鍒嗙粍鏄剧ず锛氬尯鍒嗘墜鍔ㄩ厤缃笌鑷姩鑾峰彇 */}
                    {manualModels.length === 0 && availableModels.length === 0 && <option value="">鏃犲彲鐢ㄦā鍨?/option>}
                    
                    {manualModels.length > 0 && (
                        <optgroup label="鎵嬪姩閰嶇疆 (Settings)">
                            {manualModels.map(m => <option key={`man-${m}`} value={m}>{m}</option>)}
                        </optgroup>
                    )}
                    
                    {availableModels.length > 0 && (
                        <optgroup label="鑷姩鑾峰彇 (API)">
                             {availableModels.map(m => <option key={`auto-${m}`} value={m}>{m}</option>)}
                        </optgroup>
                    )}
                </select>
                <button className={`btn btn-xs md:btn-sm join-item btn-ghost ${isFetchingModels ? 'loading' : ''}`} title="鍒锋柊妯″瀷鍒楄〃" onClick={() => { const p = presets.find(pre => pre.id === activePresetId); if(p) refreshModels(p.api_base, p.api_key, activeModel); }} disabled={!activePresetId}><RefreshCw size={14}/></button>
            </div>
          </div>

          <div className="flex-none gap-1 md:gap-2 min-w-max">
            <button className="btn btn-xs md:btn-sm btn-ghost text-error" title="娓呯┖瀵硅瘽" onClick={() => { if(confirm("纭畾娓呯┖浼氳瘽锛?)) api.messages.clear(viewMode==='char'?selectedCharId:undefined, viewMode==='group'?selectedGroupId:undefined).then(()=>{setMessages([]); alert("宸叉竻绌?);}); }}><Eraser size={18}/></button>
            {viewMode === 'char' && selectedCharId && (
              <>
                <button className="btn btn-xs md:btn-sm btn-ghost text-info" title="鎬荤粨鏂拌繘灞? onClick={async ()=>{ 
                    if (!activePresetId || !activeModel) return alert("璇峰厛閫夋嫨妯″瀷");
                    try {
                        setIsTyping(true);
                        const char = characters.find(c => c.id === selectedCharId);
                        const currentPreset = presets.find(p => p.id === activePresetId)!;
                        const llm = new LLMClient(currentPreset.api_base, currentPreset.api_key);
                        const fragment = await llm.summarizeRecent(messages, activeModel);
                        if(!fragment) return alert("娌℃湁妫€娴嬪埌鏂板墽鎯呫€?);
                        const date = new Date().toLocaleString('zh-CN', {month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'});
                        const updatedSummary = (char?.summary ? char.summary + "\n\n" : "") + `#### [鍓ф儏鏇存柊 ${date}]\n${fragment}`;
                        await api.characters.update(selectedCharId, { summary: updatedSummary });
                        await loadData(); alert("鏂拌繘灞曞凡杩藉姞銆?);
                    } catch (e: any) { alert(e.message); } finally { setIsTyping(false); }
                }}><BookOpen size={18}/></button>
                <button className="btn btn-xs md:btn-sm btn-ghost text-warning" title="涓栫晫涔? onClick={()=>setShowLorebook(true)}><Book size={18}/></button>
                <button className="btn btn-xs md:btn-sm btn-primary" onClick={()=>setShowCharEdit(true)}><Pencil size={18}/></button>
              </>
            )}
            {viewMode === 'group' && selectedGroupId && <button className="btn btn-xs md:btn-sm btn-secondary" onClick={()=>setShowGroupEdit(true)}><Users size={18}/></button>}
          </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {messages.map((m, idx) => (
            <div key={`${m.id || m.timestamp}-${idx}`} className={`chat ${m.role === 'user' ? 'chat-end' : 'chat-start'} group animate-message`}>
              <div className="chat-header opacity-50 text-[10px] mb-1 flex items-center gap-2">
                {m.role === 'user' ? '鎴? : (characters.find(c=>c.id===m.char_id)?.name || 'AI')}
                <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    {!m.image && <button className="hover:text-primary" onClick={()=>{setEditingMsgId(m.id!); setEditContent(m.content)}}><Pencil size={10}/></button>}
                    {m.role !== 'user' && idx === messages.length - 1 && <button className="hover:text-primary" onClick={handleRegenerate}><RefreshCw size={10}/></button>}
                    <button className="hover:text-error" onClick={async () => { if (confirm("鍒犻櫎璇ユ潯璁板綍锛?)) { if (m.id) { await api.messages.delete(m.id); setMessages(prev => prev.filter(msg => msg.id !== m.id)); } else { setMessages(prev => prev.filter(msg => msg.timestamp !== m.timestamp)); } } }}><Trash2 size={10}/></button>
                </div>
              </div>
              {m.image ? (
                <div className="chat-bubble p-1 bg-base-200 border-base-300 shadow-xl overflow-hidden relative group/img">
                  <img src={m.image} className="max-w-xs md:max-w-md rounded-lg"/>
                  {!m.id && (<div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity"><button className="btn btn-circle btn-xs btn-primary shadow-lg" title="淇濆瓨" onClick={async () => { try { const res = await api.messages.add(m); setMessages(prev => prev.map(msg => msg.timestamp === m.timestamp ? { ...msg, id: res.id } : msg)); alert("宸蹭繚瀛?); } catch (err) { alert("淇濆瓨澶辫触"); } }}><Save size={12}/></button></div>)}
                </div>
              ) : (
                <div className={`chat-bubble shadow-lg border ${m.role === 'user' ? 'chat-bubble-primary border-primary' : 'bg-base-200 text-base-content border-base-300'}`}>
                  {editingMsgId === m.id ? (
                      <div className="flex flex-col gap-2 min-w-[200px]"><textarea className="textarea textarea-bordered textarea-sm w-full bg-base-100" value={editContent} onChange={e=>setEditContent(e.target.value)}/><div className="flex justify-end gap-1"><button className="btn btn-xs" onClick={()=>setEditingMsgId(null)}>鍙栨秷</button><button className="btn btn-xs btn-primary" onClick={async ()=>{await api.messages.update(m.id!, editContent); setMessages(prev => prev.map(msg=>msg.id===m.id?{...msg, content:editContent}:msg)); setEditingMsgId(null)}}>淇濆瓨</button></div></div>
                  ) : <div className="prose prose-sm break-words"><ReactMarkdown rehypePlugins={[rehypeRaw]}>{m.content}</ReactMarkdown></div>}
                </div>
              )}
            </div>
          ))}
          {isTyping && <div className="chat chat-start opacity-50 animate-pulse"><div className="chat-bubble">鎬濊€冧腑...</div></div>}
          <div ref={bottomRef} className="h-20" />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-base-100 border-t border-base-300">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
            {viewMode === 'group' && selectedGroupId && (
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {characters.filter(c => groupMemberIds.includes(c.id!)).map(m => (<button key={m.id} onClick={() => triggerAI(m)} disabled={isTyping} className="btn btn-xs btn-outline btn-secondary whitespace-nowrap rounded-full">@{m.name}</button>))}
              </div>
            )}
            <div className="flex gap-2 items-end bg-base-200 p-2 rounded-2xl shadow-inner border border-base-300">
              <button className="btn btn-circle btn-ghost btn-sm text-accent" onClick={()=>{setGenPrompt(messages[messages.length-1]?.content || ""); setShowGenModal(true)}}><ImageIcon size={20}/></button>
              <textarea className="textarea textarea-ghost flex-1 min-h-[2.5rem] max-h-48 resize-none py-2 px-2 focus:outline-none" rows={1} value={input} onChange={e=>{setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=e.target.scrollHeight+'px'}} placeholder="杈撳叆娑堟伅..." onKeyDown={e=>{if(e.key==='Enter' && !e.shiftKey){e.preventDefault(); handleSend();}}} />
              {isTyping ? (<button className="btn btn-circle btn-error btn-sm shadow-lg" onClick={stopGeneration}><Square size={16} fill="currentColor"/></button>) : (<button className="btn btn-circle btn-primary btn-sm shadow-lg" onClick={handleSend} disabled={!input.trim()}><Send size={18}/></button>)}
            </div>
          </div>
        </div>
      </div>
      
      <div className="drawer-side z-50"><label htmlFor="my-drawer" className="drawer-overlay"></label><Sidebar /></div>

      {/* 1. 璁剧疆闈㈡澘 (鎭㈠鎵嬪姩妯″瀷鍒楄〃杈撳叆) */}
      {showSettings && settings && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b bg-base-200 font-bold flex justify-between items-center">绯荤粺閰嶇疆<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowSettings(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                      <section>
                          <h4 className="text-sm font-black mb-3 text-primary uppercase">鍩虹涓庢矇娴?/h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control"><label className="label text-xs font-bold">鐜╁濮撳悕</label><input className="input input-bordered" placeholder="濡傦細闄堝ⅷ" value={settings.user_name || ''} onChange={e=>setSettings({...settings, user_name:e.target.value})} /></div>
                            <div className="form-control"><label className="label text-xs font-bold">SD 鍦板潃 (API)</label><input className="input input-bordered" placeholder="http://127.0.0.1:7860" value={settings.sd_url || ''} onChange={e=>setSettings({...settings, sd_url:e.target.value})} /></div>
                          </div>
                      </section>
                      <section>
                          <div className="flex justify-between items-end mb-3">
                              <h4 className="text-sm font-black text-primary uppercase">API 棰勮搴?(鐢ㄤ簬椤堕儴瀵艰埅鏍忓垏鎹?</h4>
                              <button className="btn btn-xs btn-primary" onClick={() => api.presets.add({name: "鏂伴璁?, api_base: "", api_key: ""}).then(() => loadData())}>+ 鏂板</button>
                          </div>
                          <div className="overflow-x-auto border border-base-300 rounded-xl mb-4">
                              <table className="table table-compact w-full text-xs">
                                  <thead><tr className="bg-base-200"><th>鍚嶇О</th><th>Base URL</th><th>Key</th><th className="w-20">鎿嶄綔</th></tr></thead>
                                  <tbody>
                                      {presets.map((p, idx) => (
                                          <tr key={p.id}>
                                              <td><input className="input input-ghost input-xs w-full font-bold" value={p.name} onChange={e=>{const n=[...presets]; n[idx].name=e.target.value; setPresets(n);}} /></td>
                                              <td><input className="input input-ghost input-xs w-full" value={p.api_base} onChange={e=>{const n=[...presets]; n[idx].api_base=e.target.value; setPresets(n);}} /></td>
                                              <td><input className="input input-ghost input-xs w-full" type="password" value={p.api_key} onChange={e=>{const n=[...presets]; n[idx].api_key=e.target.value; setPresets(n);}} /></td>
                                              <td className="flex gap-1">
                                                  <button className="btn btn-ghost btn-xs text-success" onClick={() => api.presets.update(p.id!, p).then(() => alert("宸叉洿鏂?))}><Save size={14}/></button>
                                                  <button className="btn btn-ghost btn-xs text-error" onClick={() => {if(confirm("鍒犻櫎锛?)) api.presets.delete(p.id!).then(() => loadData());}}><Trash2 size={14}/></button>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                          {/* 銆愭仮澶嶃€戞墜鍔ㄦā鍨嬪垪琛ㄨ緭鍏ユ */}
                          <div className="form-control">
                                <label className="label font-bold text-xs">澶囩敤妯″瀷鍒楄〃 (鎵嬪姩杈撳叆锛岄€楀彿鍒嗛殧)</label>
                                <textarea className="textarea textarea-bordered w-full text-xs h-20" placeholder="褰?API 涓嶆敮鎸佽嚜鍔ㄨ幏鍙栨ā鍨嬪垪琛ㄦ椂浣跨敤锛屼緥濡傦細gpt-4o, claude-3-5-sonnet, deepseek-chat" value={settings.model_list || ""} onChange={e=>setSettings({...settings, model_list:e.target.value})} />
                          </div>
                      </section>
                      <section>
                          <h4 className="text-sm font-black mb-3 text-error uppercase">鏁版嵁绠＄悊</h4>
                          <div className="p-4 border border-error/20 rounded-xl bg-error/5 flex justify-between items-center gap-4">
                              <div className="flex-1"><p className="text-xs font-bold text-error">娓呯悊鏁版嵁搴撳浘鐗?/p><p className="text-[10px] opacity-60 mt-1">姘镐箙鍒犻櫎 D1 鏁版嵁搴撲腑瀛樺偍鐨勬墍鏈夊浘鐗囨秷鎭€?/p></div>
                              <button className="btn btn-error btn-sm shadow-md" onClick={async () => { if(confirm("纭畾娓呯悊鍥剧墖锛?)) { await api.messages.clearAllImages(); alert("娓呯悊鎴愬姛"); } }}><Eraser size={14} className="mr-1"/> 娓呯悊鍥剧墖</button>
                          </div>
                      </section>
                  </div>
                  <div className="p-4 border-t bg-base-200"><button className="btn btn-primary btn-block" onClick={async ()=>{await api.settings.update(settings!); setShowSettings(false); loadData();}}>淇濆瓨閰嶇疆</button></div>
              </div>
          </div>
      )}

      {/* 2. 瑙掕壊缂栬緫鍣?(宸茬Щ闄?API 瑕嗙洊) */}
      {showCharEdit && selectedCharId && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-2xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b flex justify-between bg-base-200 font-bold items-center">瑙掕壊妗ｆ<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowCharEdit(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="form-control"><label className="label font-bold text-xs">瑙掕壊濮撳悕</label><input className="input input-bordered" value={characters.find(c=>c.id===selectedCharId)?.name} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, name:e.target.value}:c))} /></div>
                      <div className="form-control"><label className="label font-bold text-xs">浜鸿/涓栫晫瑙傛弿杩?/label><textarea className="textarea textarea-bordered h-48 font-mono text-sm" value={characters.find(c=>c.id===selectedCharId)?.description} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, description:e.target.value}:c))} /></div>
                      <div className="form-control"><label className="label font-bold text-xs text-primary">闀挎湡璁板繂 (Summary)</label><textarea className="textarea textarea-bordered h-32 font-mono text-xs" value={characters.find(c=>c.id===selectedCharId)?.summary} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, summary:e.target.value}:c))} /></div>
                  </div>
                  <div className="p-4 border-t bg-base-200 flex justify-end"><button className="btn btn-primary" onClick={async ()=>{await api.characters.update(selectedCharId, characters.find(c=>c.id===selectedCharId)!); setShowCharEdit(false); loadData();}}>纭淇濆瓨</button></div>
              </div>
          </div>
      )}

      {/* 3. 鍓у満缂栬緫鍣?(淇濇寔涓嶅彉) */}
      {showGroupEdit && selectedGroupId && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b flex justify-between bg-base-200 font-bold items-center"><h3>鍓у満/缇よ亰閰嶇疆</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowGroupEdit(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="form-control"><label className="label font-bold">鍓у満鍚?/label><input className="input input-bordered" value={groups.find(g=>g.id===selectedGroupId)?.name} onChange={e=>setGroups(groups.map(g=>g.id===selectedGroupId?{...g, name:e.target.value}:g))} /></div>
                      <div className="form-control"><label className="label font-bold text-xs text-primary">褰撳墠鍦烘櫙鎻忚堪</label><textarea className="textarea textarea-bordered h-40" value={groups.find(g=>g.id===selectedGroupId)?.description} onChange={e=>setGroups(groups.map(g=>g.id===selectedGroupId?{...g, description:e.target.value}:g))} /></div>
                      <div className="space-y-4">
                          <label className="label font-bold text-xs">閫夋嫨鎴愬憳</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {characters.map(c => (
                                  <label key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${groupMemberIds.includes(c.id!) ? 'border-primary bg-primary/10' : 'border-base-300'}`}>
                                      <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={groupMemberIds.includes(c.id!)} onChange={e => { const next = e.target.checked ? [...groupMemberIds, c.id!] : groupMemberIds.filter(id => id !== c.id); setGroupMemberIds(next); }} />
                                      <span className="text-sm truncate font-bold">{c.name}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="p-6 border-t bg-base-200 flex justify-end"><button className="btn btn-primary" onClick={async ()=>{const g=groups.find(grp=>grp.id===selectedGroupId); if(g){await api.groups.update(selectedGroupId, {...g, memberIds: groupMemberIds}); setShowGroupEdit(false); alert("宸叉洿鏂板墽鍦烘垚鍛?)}}}>淇濆瓨鍓у満</button></div>
              </div>
          </div>
      )}

      {/* 4. 涓栫晫涔︾紪杈戝櫒 (淇濇寔涓嶅彉) */}
      {showLorebook && selectedCharId && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-2xl h-[75vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-4 border-b bg-base-200 font-bold flex justify-between items-center">涓栫晫涔?(Worldbook)<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowLorebook(false)}><X/></button></div>
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
                                    <div className="flex items-center gap-2 bg-base-300 px-3 py-1 rounded-full"><span className="text-[10px] font-bold">鍚敤</span><input type="checkbox" className="toggle toggle-success toggle-xs" checked={e.isActive} onChange={(evt) => {const val = evt.target.checked; api.lorebook.update(e.id!, { isActive: val }).then(() => {setLorebookEntries(prev => prev.map(item => item.id === e.id ? {...item, isActive: val} : item));});}} /></div>
                                    <button className="btn btn-sm btn-error" onClick={()=>api.lorebook.delete(e.id!).then(()=>api.lorebook.list(selectedCharId).then(setLorebookEntries))}><Trash2 size={14}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button className="btn btn-block btn-outline border-dashed btn-sm mt-4" onClick={()=>api.lorebook.add({char_id:selectedCharId, keywords:"鏂拌瘝鏉?, content:"", isActive:true}).then(()=>api.lorebook.list(selectedCharId).then(setLorebookEntries))}>+ 娣诲姞鏂拌瀹?/button>
                  </div>
              </div>
          </div>
      )}

      {/* 5. 鐢熷浘鎻愮ず璇嶅脊绐?*/}
      {showGenModal && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-primary"><Sparkles/> 鏋侀€熺敓鍥?/h3>
                <textarea className="textarea textarea-bordered w-full h-32" value={genPrompt} onChange={e=>setGenPrompt(e.target.value)} placeholder="鎻忚堪浣犳兂鐢熸垚鐨勭敾闈㈢粏鑺傦紝鏀寔鑷劧璇█..." />
                <div className="modal-action flex gap-2">
                    <button className="btn btn-primary flex-1 shadow-lg" onClick={handleGenImageAction}>寮€濮嬬敓鎴?/button>
                    <button className="btn flex-1" onClick={()=>setShowGenModal(false)}>鍙栨秷</button>
                </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default App;

