import { useState, useEffect, useRef, useMemo } from 'react';
import { api, type Message, type Character, type Settings, type Group, type LorebookEntry, type ApiPreset, type ApiMode, type Room, type RoomMember, type RoomMessage, type Dispatch, type RoomAgentConfig, type RoomDirectorConfig, type WorldState, type RoomStateSnapshot, type WorldStateSnapshot } from './lib/db';
import { LLMClient } from './lib/llm';
import { ImageStudio } from './components/ImageStudio';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { 
  Send, Image as ImageIcon, Settings as SettingsIcon, Menu, Pencil, Plus, Trash2, X, 
  BookOpen, Book, Users, RefreshCw, Square, Save, Eraser, Sparkles, Copy, Inbox
} from 'lucide-react';

function App() {
  // --- 核心状态 ---
  const [viewMode, setViewMode] = useState<'char' | 'group' | 'image'>('char');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [presets, setPresets] = useState<ApiPreset[]>([]);
  
  // --- API 全局状态 ---
  const [activePresetId, setActivePresetId] = useState<number | undefined>();
  const [activeModel, setActiveModel] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<string[]>([]); // 仅存储自动获取的
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [presetModelsMap, setPresetModelsMap] = useState<Record<number, string[]>>({});
  const [presetModelsLoading, setPresetModelsLoading] = useState<Record<number, boolean>>({});

  // --- 基础数据状态 ---
  const [selectedCharId, setSelectedCharId] = useState<number>();
  const [selectedGroupId, setSelectedGroupId] = useState<number>();
  const [selectedRoomId, setSelectedRoomId] = useState<number>();
  const [groupMemberIds, setGroupMemberIds] = useState<number[]>([]);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  const [roomMessages, setRoomMessages] = useState<RoomMessage[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<Settings>();
  const [lorebookEntries, setLorebookEntries] = useState<LorebookEntry[]>([]);
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // --- 弹窗控制状态 ---
  const [showSettings, setShowSettings] = useState(false);
  const [showCharEdit, setShowCharEdit] = useState(false);
  const [showGroupEdit, setShowGroupEdit] = useState(false);
  const [showLorebook, setShowLorebook] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [useSdPromptConversion, setUseSdPromptConversion] = useState(true);
  const [showInbox, setShowInbox] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  // --- Room 配置状态（Phase B/C/D） ---
  const [roomAgentConfigs, setRoomAgentConfigs] = useState<RoomAgentConfig[]>([]);
  const [roomDirectorConfig, setRoomDirectorConfig] = useState<RoomDirectorConfig | null>(null);
  const [pendingDispatches, setPendingDispatches] = useState<Dispatch[]>([]);
  const [roomDispatches, setRoomDispatches] = useState<Dispatch[]>([]);
  const [roomSummaries, setRoomSummaries] = useState<Array<{ id: number; summary: string; source: string; updated_at: number }>>([]);
  const [worldState, setWorldState] = useState<WorldState | null>(null);
  const [draftWorldStateJson, setDraftWorldStateJson] = useState<string>('');
  const [roomSnapshots, setRoomSnapshots] = useState<RoomStateSnapshot[]>([]);
  const [worldSnapshots, setWorldSnapshots] = useState<WorldStateSnapshot[]>([]);
  const [roomMembersDraft, setRoomMembersDraft] = useState<RoomMember[]>([]);

  // --- 计算属性：手动配置的模型列表 ---
  const manualModels = useMemo(() => {
    if (!settings?.model_list) return [];
    return settings.model_list.split(/[,，\n]/).map(m => m.trim()).filter(m => m);
  }, [settings?.model_list]);

  const pendingCount = useMemo(
    () => (pendingDispatches || []).filter(d => (d as any)?.status === 'pending' || !(d as any)?.status).length,
    [pendingDispatches]
  );

  const characterNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of characters) {
      if (c.id) m.set(c.id, c.name);
    }
    return m;
  }, [characters]);

  const isLogRoom = useMemo(() => {
    if (viewMode !== 'group' || !selectedRoomId) return false;
    const mode = rooms.find(r => r.id === selectedRoomId)?.mode;
    return mode === 'log';
  }, [viewMode, selectedRoomId, rooms]);

  const getPresetMode = (preset?: ApiPreset): ApiMode =>
    preset?.api_mode === 'responses' ? 'responses' : 'chat_completions';

  const fetchPresetModels = async (presetId?: number, force = false) => {
    if (!presetId) return;
    if (presetModelsLoading[presetId]) return;
    if (!force && presetModelsMap[presetId]?.length) return;

    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    setPresetModelsLoading(prev => ({ ...prev, [presetId]: true }));
    try {
      const llm = new LLMClient(preset.api_base, preset.api_key, getPresetMode(preset));
      const models = await llm.fetchModels();
      setPresetModelsMap(prev => ({ ...prev, [presetId]: models }));
    } finally {
      setPresetModelsLoading(prev => ({ ...prev, [presetId]: false }));
    }
  };

  // --- 初始化数据 ---
  const loadData = async () => {
    try {
        const [c, g, r, s, p, d] = await Promise.all([
            api.characters.list(),
            api.groups.list(),
            api.rooms.list(),
            api.settings.get(),
            api.presets.list(),
            api.dispatches.listPending().catch(() => []),
        ]);
        setCharacters(c); setGroups(g); setRooms(r); setSettings(s); setPresets(p); setPendingDispatches(d as any);
        
        // 恢复上次选择的 Preset 和 Model
        if (s.active_preset_id && p.some(pre => pre.id === s.active_preset_id)) {
            setActivePresetId(s.active_preset_id);
            // 尝试加载模型列表
            const currentPreset = p.find(pre => pre.id === s.active_preset_id);
            if(currentPreset) {
                // 这里传入 s.model_list 以便 refreshModels 知道有手动模型作为兜底
                await refreshModels(currentPreset.api_base, currentPreset.api_key, s.active_model_id, s.model_list, getPresetMode(currentPreset));
            }
        }
    } catch(e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!showSettings) return;
    fetchPresetModels(activePresetId);
    fetchPresetModels(settings?.image_preset_id);
    fetchPresetModels(settings?.summary_preset_id);
    fetchPresetModels(settings?.sd_prompt_preset_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSettings]);

  useEffect(() => {
    if (!showGroupEdit) return;
    if (!selectedRoomId) return;

    (async () => {
      try {
        const [members, agentCfgs, directorCfg, summaries, dispatches, ws, snaps, wsSnaps] = await Promise.all([
          api.rooms.getMembers(selectedRoomId),
          api.roomAgentConfig.list(selectedRoomId).catch(() => []),
          api.roomDirectorConfig.get(selectedRoomId).catch(() => null),
          api.roomSummaries.list(selectedRoomId).catch(() => []),
          api.dispatches.listByRoom(selectedRoomId).catch(() => []),
          api.worldState.get().catch(() => null as any),
          api.roomStateSnapshots.list(selectedRoomId).catch(() => []),
          api.worldStateSnapshots.list().catch(() => []),
        ]);

        setRoomMembersDraft(members as any);
        setRoomAgentConfigs(agentCfgs as any);
        setRoomDirectorConfig(directorCfg as any);
        setRoomSummaries(summaries as any);
        setRoomDispatches(dispatches as any);
        setWorldState(ws as any);
        setDraftWorldStateJson((ws as any)?.state_json || '{}');
        setRoomSnapshots(snaps as any);
        setWorldSnapshots(wsSnaps as any);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [showGroupEdit, selectedRoomId]);

  // --- API 状态管理逻辑 ---
  const refreshModels = async (base: string, key: string, keepModelId?: string, manualListStr?: string, mode: ApiMode = 'chat_completions') => {
      setIsFetchingModels(true);
      const llm = new LLMClient(base, key, mode);
      const fetchedModels = await llm.fetchModels();
      setAvailableModels(fetchedModels);
      setIsFetchingModels(false);
      
      // 解析手动模型列表 (参数传入或使用当前状态)
      const currentManualList = manualListStr !== undefined ? manualListStr : (settings?.model_list || "");
      const manualArr = currentManualList.split(/[,，\n]/).map(m => m.trim()).filter(m => m);
      
      // 决定选中哪个模型
      // 1. 如果之前选中的模型在 自动列表 或 手动列表 中，保持选中
      if (keepModelId && (fetchedModels.includes(keepModelId) || manualArr.includes(keepModelId))) {
          setActiveModel(keepModelId);
      } 
      // 2. 否则优先选自动列表的第一个
      else if (fetchedModels.length > 0) {
          const first = fetchedModels[0];
          setActiveModel(first);
          if(settings) api.settings.update({ ...settings, active_model_id: first });
      } 
      // 3. 都没有，选手动列表第一个作为兜底
      else if (manualArr.length > 0) {
          const first = manualArr[0];
          setActiveModel(first);
          if(settings) api.settings.update({ ...settings, active_model_id: first });
      }
      // 4. 如果都为空，UI 会显示 placeholder
  };

  const handlePresetChange = async (presetIdStr: string) => {
      const pid = parseInt(presetIdStr);
      setActivePresetId(pid);
      if(settings) await api.settings.update({ ...settings, active_preset_id: pid });
      
      const p = presets.find(pre => pre.id === pid);
      if (p) await refreshModels(p.api_base, p.api_key, undefined, undefined, getPresetMode(p));
  };

  const handleModelChange = async (modelId: string) => {
      setActiveModel(modelId);
      if(settings) await api.settings.update({ ...settings, active_model_id: modelId });
  };

  // --- 切换角色/剧场时的监听 ---
  useEffect(() => {
    setMessages([]);
    setRoomMessages([]);
    if (viewMode === 'char' && selectedCharId) {
      api.messages.list(selectedCharId).then(setMessages);
      api.lorebook.list(selectedCharId).then(setLorebookEntries);
    } else if (viewMode === 'group' && selectedRoomId) {
      api.rooms.getMembers(selectedRoomId).then((m) => {
        setRoomMembers(m);
        const activeIds = (m || []).filter(x => (x as any).is_active !== 0).map(x => x.char_id);
        setGroupMemberIds(activeIds);
      });
      api.roomMessages.list(selectedRoomId).then(setRoomMessages);
    }
  }, [selectedCharId, selectedRoomId, viewMode]);

  const messageCount = viewMode === 'group' ? roomMessages.length : messages.length;
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messageCount, isTyping]);

  // --- 逻辑函数 ---
  const stopGeneration = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsTyping(false);
    }
  };

  const sendRoomChat = async (userText: string, speakerCharId?: number) => {
    if (!settings) return;
    if (!selectedRoomId) return alert("请先选择房间");
    if (!activePresetId || !activeModel) return alert("请先在顶部选择 API 预设和模型！");

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsTyping(true);
    try {
      const roomMode = rooms.find(r => r.id === selectedRoomId)?.mode || 'agents';
      await api.roomChat.send({
        room_id: selectedRoomId,
        user_input: userText,
        speaker_char_id: speakerCharId,
        fallback_preset_id: activePresetId,
        fallback_model_id: activeModel,
        max_speakers: roomMode === 'sandbox' ? 2 : 1,
      }, controller.signal);
      const latest = await api.roomMessages.list(selectedRoomId);
      setRoomMessages(latest);
      const pending = await api.dispatches.listPending().catch(() => []);
      setPendingDispatches(pending as any);
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      alert(e.message || String(e));
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const handleDispatchAction = async (dispatchId: number, action: 'approve' | 'reject' | 'rewrite') => {
    try {
      await api.dispatches.resolve(dispatchId, action);
      const pending = await api.dispatches.listPending().catch(() => []);
      setPendingDispatches(pending as any);
      if (selectedRoomId) {
        const [dispatches, latestMessages, snaps, ws, wsSnaps] = await Promise.all([
          api.dispatches.listByRoom(selectedRoomId).catch(() => []),
          api.roomMessages.list(selectedRoomId).catch(() => []),
          api.roomStateSnapshots.list(selectedRoomId).catch(() => []),
          api.worldState.get().catch(() => null as any),
          api.worldStateSnapshots.list().catch(() => []),
        ]);
        setRoomDispatches(dispatches as any);
        setRoomMessages(latestMessages as any);
        setRoomSnapshots(snaps as any);
        setWorldState(ws as any);
        setDraftWorldStateJson((ws as any)?.state_json || '{}');
        setWorldSnapshots(wsSnaps as any);
      }
    } catch (e: any) {
      alert(e.message || String(e));
    }
  };

  const saveRoomConfigs = async () => {
    if (!selectedRoomId) return;
    const room = rooms.find(x => x.id === selectedRoomId);
    if (!room) return;

    try { JSON.parse(room.state_json || '{}'); } catch { return alert('房间状态 JSON 格式错误'); }
    if (room.mode === 'sandbox') {
      try { JSON.parse(draftWorldStateJson || '{}'); } catch { return alert('全局世界状态 JSON 格式错误'); }
    }

    await api.rooms.update(selectedRoomId, {
      name: room.name,
      description: room.description,
      mode: room.mode || 'agents',
      rules: room.rules || '',
      category: room.category || '',
      state_json: room.state_json || '{}',
    });

    await api.rooms.updateMembers(selectedRoomId, roomMembersDraft.map((m, idx) => ({
      char_id: m.char_id,
      role: m.role || 'agent',
      order_index: m.order_index ?? idx,
      is_active: m.is_active === 0 ? 0 : 1,
    })).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)).map((m, idx) => ({ ...m, order_index: idx })));

    if (room.mode === 'sandbox') {
      await api.worldState.update(draftWorldStateJson || '{}');
    }

    if (roomDirectorConfig) {
      await api.roomDirectorConfig.upsert({ ...roomDirectorConfig, room_id: selectedRoomId });
    }

    for (const cfg of roomAgentConfigs) {
      await api.roomAgentConfig.upsert({ ...cfg, room_id: selectedRoomId });
    }

    setShowGroupEdit(false);
    await loadData();
    const members = await api.rooms.getMembers(selectedRoomId).catch(() => []);
    setRoomMembers(members as any);
    const activeIds = (members as any[]).filter(x => (x as any).is_active !== 0).map(x => Number((x as any).char_id)).filter(Boolean);
    setGroupMemberIds(activeIds);
    alert('房间配置已保存');
  };

  const triggerAI = async (char: Character, textOverride?: string, historyOverride?: Message[]) => {
    if (isTyping || !settings) return;
    if (!activePresetId || !activeModel) { return alert("请先在顶部导航栏选择 API 预设和模型！"); }
    
    const currentPreset = presets.find(p => p.id === activePresetId);
    if (!currentPreset) { return alert("无效的 API 预设"); }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setIsTyping(true);
    const tempTs = Date.now() + 1;
    const currentHistory = (historyOverride || messages).filter(m => m.content || m.role === 'user');
    
    setMessages(prev => [...prev, { role: 'assistant', content: '', char_id: char.id, timestamp: tempTs }]);
    
    const llm = new LLMClient(currentPreset.api_base, currentPreset.api_key, getPresetMode(currentPreset));
    let fullContent = "";

    try {
      const stream = llm.chatStream(
        char, currentHistory, textOverride || "", 
        settings, activeModel, 
        lorebookEntries, 
        undefined,
        controller
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
                group_id: undefined, 
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
    const imageBackend = (settings?.image_backend || 'sdwebui') as 'sdwebui' | 'openai';
    if (imageBackend === 'sdwebui' && !settings?.sd_url) return alert("请在设置中配置 SD URL");
    if (!activePresetId || !activeModel) return alert("请先选择 API 模型用于生成 Prompt");

    const rawPrompt =
      genPrompt ||
      (viewMode === 'group'
        ? (roomMessages.length > 0 ? roomMessages[roomMessages.length - 1].content : "")
        : (messages.length > 0 ? messages[messages.length - 1].content : ""));
    if (!rawPrompt) return;

    setShowGenModal(false);
    setIsTyping(true);
    try {
      const currentPreset = presets.find(p => p.id === activePresetId)!;

      const sdPromptPreset =
        presets.find(p => p.id === settings?.sd_prompt_preset_id) || currentPreset;
      const sdPromptModel = settings?.sd_prompt_model_id || activeModel;

      let finalPrompt = rawPrompt;
      if (useSdPromptConversion) {
        const llm = new LLMClient(sdPromptPreset.api_base, sdPromptPreset.api_key, getPresetMode(sdPromptPreset));
        const tags = await llm.generateImageTags(rawPrompt, sdPromptModel);
        finalPrompt = `1girl, (photorealistic:1.3), best quality, ultra high res, soft lighting, ${tags}`;
      }

      const payload =
        imageBackend === 'openai'
          ? { prompt: finalPrompt, size: '1024x1024', n: 1, response_format: 'b64_json' }
          : {
              prompt: finalPrompt,
              negative_prompt: "(worst quality:2), (low quality:2), (normal quality:2), lowres, watermark",
              steps: 20,
              cfg_scale: 7,
              sampler_name: "Euler a",
              width: 512,
              height: 768,
              restore_faces: false,
              enable_hr: false,
            };

      const imagePreset =
        presets.find(p => p.id === settings?.image_preset_id) || currentPreset;
      const imageModel = settings?.image_model_id || activeModel;

      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          imageBackend === 'sdwebui'
            ? { sd_url: settings!.sd_url, payload }
            : {
                backend: 'openai',
                apiBase: imagePreset.api_base,
                apiKey: imagePreset.api_key,
                model: imageModel,
                payload,
              }
        ),
      });
      if (!res.ok) throw new Error(imageBackend === 'sdwebui' ? "SD 后端未响应" : "OpenAI 生图后端未响应");
      const data = await res.json();
      const imgSrc =
        (Array.isArray(data?.images) && data.images[0] ? `data:image/png;base64,${data.images[0]}` : '') ||
        (Array.isArray(data?.urls) && data.urls[0] ? data.urls[0] : '');

      if (!imgSrc) throw new Error("后端未返回图片");

      const ephemeralMsg: Message = { 
          role: 'assistant', content: '', image: imgSrc, timestamp: Date.now(), 
          group_id: undefined, char_id: selectedCharId 
      };
      setMessages(prev => [...prev, ephemeralMsg]);

    } catch (e: any) { alert("生图失败: " + e.message); } finally { setIsTyping(false); }
  };

  const handleSend = async () => {
    if (!input.trim() || !settings || isTyping) return;
    const text = input; setInput('');
    const tx = inputRef.current; if (tx) tx.style.height = 'auto';

    if (viewMode === 'group') {
      if (isLogRoom) { alert('世界日志为只读房间'); return; }
      await sendRoomChat(text);
      return;
    }

    const timestamp = Date.now();
    const userMsg: Message = { 
      role: 'user', content: text, timestamp,
      char_id: viewMode === 'char' ? selectedCharId : undefined,
      group_id: undefined
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
        <button className={`tab flex-1 transition-all ${viewMode === 'image' ? 'tab-active font-bold' : ''}`} onClick={() => setViewMode('image')}>生图</button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1 text-base-content">
        {viewMode === 'char' ? characters.map(c => (
          <div key={c.id} onClick={() => { setSelectedCharId(c.id); setMobileMenuOpen(false); }} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group ${selectedCharId === c.id ? 'bg-primary text-primary-content shadow-lg' : 'hover:bg-base-300'}`}>
            <span className="font-bold truncate max-w-[140px]">{c.name}</span>
            <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity items-center">
                <button className="hover:text-info p-1" title="创建副本" onClick={async (e) => {
                    e.stopPropagation();
                    const newName = prompt("新角色名称:", `${c.name} (Copy)`);
                    if(newName) { await api.characters.duplicate(c.id!, newName); loadData(); }
                }}><Copy size={14}/></button>
                <button className="hover:text-error p-1" title="删除" onClick={(e) => { 
                    e.stopPropagation(); 
                    if(confirm(`删除角色 ${c.name}？`)) api.characters.delete(c.id!).then(() => loadData()); 
                }}><Trash2 size={14} /></button>
            </div>
          </div>
        )) : viewMode === 'group' ? rooms.map(r => (
          <div key={r.id} onClick={() => { setSelectedRoomId(r.id); setMobileMenuOpen(false); }} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group ${selectedRoomId === r.id ? 'bg-secondary text-secondary-content shadow-lg' : 'hover:bg-base-300'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold truncate">{r.name}</span>
              <span className={`badge badge-xs ${r.mode === 'sandbox' ? 'badge-primary' : r.mode === 'agents' ? 'badge-secondary' : r.mode === 'log' ? 'badge-neutral' : 'badge-ghost'}`}>
                {r.mode || 'agents'}
              </span>
            </div>
            {r.mode !== 'log' && (
              <Trash2 size={14} className="opacity-0 group-hover:opacity-100 hover:text-error transition-opacity" onClick={(e) => { e.stopPropagation(); if(confirm(`删除房间 ${r.name}？`)) api.rooms.delete(r.id!).then(() => loadData()); }} />
            )}
          </div>
        )) : (
          <div className="p-3 rounded-xl border border-base-300 bg-base-100/40 text-xs leading-relaxed">
            <div className="font-black mb-2 flex items-center gap-2"><ImageIcon size={16}/> 生图工作台</div>
            <div>支持文生图、图生图；参数可通过“高级 JSON”适配不同 OpenAI 兼容 API 或 SD WebUI。</div>
          </div>
        )}
        {(viewMode === 'char' || viewMode === 'group') && (
          <button className="btn btn-outline btn-sm btn-block mt-4 border-dashed" onClick={async () => {
            const n = prompt("名称?");
            if (!n) return;
            if (viewMode === 'char') await api.characters.add({ name: n, description: "", first_message: "你好", summary: "" });
            else await api.rooms.add({ name: n, mode: 'agents', description: "" });
            await loadData();
          }}><Plus size={16} /> 新建</button>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-base-content/10"><button className="btn btn-ghost btn-sm btn-block justify-start" onClick={() => {setShowSettings(true); setMobileMenuOpen(false);}}><SettingsIcon size={16} /> 系统设置</button></div>
    </div>
  );

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-base-100"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

  return (
    <div className="drawer md:drawer-open h-[100dvh] w-full bg-base-100 overflow-hidden text-base-content">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" checked={mobileMenuOpen} onChange={e=>setMobileMenuOpen(e.target.checked)} />
      <div className="drawer-content flex flex-col h-full overflow-hidden relative">
        {/* Navbar */}
        <div className="navbar bg-base-100 border-b border-base-300 px-4 sticky top-0 z-20 min-h-[3.5rem]">
          <div className="flex-none md:hidden"><button className="btn btn-square btn-ghost" onClick={()=>setMobileMenuOpen(true)}><Menu/></button></div>
          <div className="flex-1 font-bold truncate px-2 hidden md:block">
            {viewMode === 'image'
              ? '生图工作台'
              : (viewMode === 'char'
                  ? characters.find(c=>c.id===selectedCharId)?.name
                  : rooms.find(r=>r.id===selectedRoomId)?.name) || "SimpleRP"}
          </div>
          
          {/* API Selector (Top Bar) - 已优化，支持分组显示 */}
          <div className="flex-none flex items-center gap-2 mr-2 max-w-[72vw] md:max-w-none overflow-x-auto no-scrollbar">
            <select className="select select-bordered select-sm max-w-[8rem] text-xs" value={activePresetId || ""} onChange={(e) => handlePresetChange(e.target.value)}>
                <option value="" disabled>选择源...</option>
                {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="join">
                <select className="select select-bordered select-sm join-item max-w-[10rem] text-xs" value={activeModel} onChange={(e) => handleModelChange(e.target.value)} disabled={!activePresetId}>
                    {/* 分组显示：区分手动配置与自动获取 */}
                    {manualModels.length === 0 && availableModels.length === 0 && <option value="">无可用模型</option>}
                    
                    {manualModels.length > 0 && (
                        <optgroup label="手动配置 (Settings)">
                            {manualModels.map(m => <option key={`man-${m}`} value={m}>{m}</option>)}
                        </optgroup>
                    )}
                    
                    {availableModels.length > 0 && (
                        <optgroup label="自动获取 (API)">
                             {availableModels.map(m => <option key={`auto-${m}`} value={m}>{m}</option>)}
                        </optgroup>
                    )}
                </select>
                <button className={`btn btn-sm join-item btn-ghost ${isFetchingModels ? 'loading' : ''}`} title="刷新模型列表" onClick={() => { const p = presets.find(pre => pre.id === activePresetId); if(p) refreshModels(p.api_base, p.api_key, activeModel, undefined, getPresetMode(p)); }} disabled={!activePresetId}><RefreshCw size={14}/></button>
            </div>
          </div>

          <div className="hidden md:flex flex-none gap-2">
            {viewMode !== 'image' && (
              <button className="btn btn-sm btn-ghost text-error" title="清空对话" onClick={() => {
                if (!confirm("确定清空会话？")) return;
                if (viewMode === 'group' && selectedRoomId) {
                  api.roomMessages.clear(selectedRoomId).then(() => { setRoomMessages([]); alert("已清空"); });
                } else {
                  api.messages.clear(viewMode==='char'?selectedCharId:undefined, undefined).then(()=>{setMessages([]); alert("已清空");});
                }
              }}><Eraser size={18}/></button>
            )}
            {viewMode === 'char' && selectedCharId && (
              <>
                <button className="btn btn-sm btn-ghost text-info" title="总结新进展" onClick={async ()=>{ 
                    if (!activePresetId || !activeModel) return alert("请先选择模型");
                    try {
                        setIsTyping(true);
                        const char = characters.find(c => c.id === selectedCharId);
                        const currentPreset = presets.find(p => p.id === activePresetId)!;
                        const summaryPreset = presets.find(p => p.id === settings?.summary_preset_id) || currentPreset;
                        const summaryModel = settings?.summary_model_id || activeModel;
                        const llm = new LLMClient(summaryPreset.api_base, summaryPreset.api_key, getPresetMode(summaryPreset));
                        const fragment = await llm.summarizeRecent(messages, summaryModel);
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
            <button className="btn btn-sm btn-ghost relative" title="公文箱 / Inbox" onClick={() => setShowInbox(true)}>
              <Inbox size={18} />
              {pendingCount > 0 && (
                <span className="badge badge-error badge-xs absolute -top-1 -right-1">{pendingCount}</span>
              )}
            </button>
            {viewMode === 'group' && selectedRoomId && <button className="btn btn-sm btn-secondary" title="房间设置" onClick={()=>setShowGroupEdit(true)}><Users size={18}/></button>}
          </div>
        </div>

        <div className="md:hidden px-2 py-2 border-b border-base-300 bg-base-100">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {viewMode !== 'image' && (
              <button className="btn btn-xs btn-ghost text-error whitespace-nowrap" onClick={() => {
                if (!confirm("确定清空会话？")) return;
                if (viewMode === 'group' && selectedRoomId) {
                  api.roomMessages.clear(selectedRoomId).then(() => { setRoomMessages([]); alert("已清空"); });
                } else {
                  api.messages.clear(viewMode==='char'?selectedCharId:undefined, undefined).then(()=>{setMessages([]); alert("已清空");});
                }
              }}><Eraser size={14}/> 清空</button>
            )}
            {viewMode === 'char' && selectedCharId && (
              <>
                <button
                  className="btn btn-xs btn-ghost text-info whitespace-nowrap"
                  onClick={async ()=>{ 
                    if (!activePresetId || !activeModel) return alert("请先选择模型");
                    try {
                        setIsTyping(true);
                        const char = characters.find(c => c.id === selectedCharId);
                        const currentPreset = presets.find(p => p.id === activePresetId)!;
                        const summaryPreset = presets.find(p => p.id === settings?.summary_preset_id) || currentPreset;
                        const summaryModel = settings?.summary_model_id || activeModel;
                        const llm = new LLMClient(summaryPreset.api_base, summaryPreset.api_key, getPresetMode(summaryPreset));
                        const fragment = await llm.summarizeRecent(messages, summaryModel);
                        if(!fragment) return alert("没有检测到新剧情。");
                        const date = new Date().toLocaleString('zh-CN', {month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'});
                        const updatedSummary = (char?.summary ? char.summary + "\n\n" : "") + `#### [剧情更新 ${date}]\n${fragment}`;
                        await api.characters.update(selectedCharId, { summary: updatedSummary });
                        await loadData(); alert("新进展已追加。");
                    } catch (e: any) { alert(e.message); } finally { setIsTyping(false); }
                }}
                ><BookOpen size={14}/> 总结</button>
                <button className="btn btn-xs btn-ghost text-warning whitespace-nowrap" onClick={()=>setShowLorebook(true)}><Book size={14}/> 世界书</button>
                <button className="btn btn-xs btn-primary whitespace-nowrap" onClick={()=>setShowCharEdit(true)}><Pencil size={14}/> 人设</button>
              </>
            )}
            <button className="btn btn-xs btn-ghost relative whitespace-nowrap" onClick={() => setShowInbox(true)}>
              <Inbox size={14} /> 公文
              {pendingCount > 0 && (
                <span className="badge badge-error badge-xs absolute -top-1 -right-1">{pendingCount}</span>
              )}
            </button>
            {viewMode === 'group' && selectedRoomId && <button className="btn btn-xs btn-secondary whitespace-nowrap" onClick={()=>setShowGroupEdit(true)}><Users size={14}/> 房间</button>}
          </div>
        </div>

        {viewMode === 'image' ? (
          <ImageStudio
            settings={settings}
            presets={presets}
            activePresetId={activePresetId}
            activeModel={activeModel}
            manualModels={manualModels}
            getPresetMode={getPresetMode}
            fetchPresetModels={fetchPresetModels}
            presetModelsMap={presetModelsMap}
            presetModelsLoading={presetModelsLoading}
          />
        ) : (
          <>
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              {(viewMode === 'group' ? (roomMessages as any) : (messages as any)).map((m: any, idx: number) => {
                const isUser = m.role === 'user' || m.sender_type === 'user';
                const isSystemLike = viewMode === 'group' && (m.sender_type === 'tool' || m.sender_type === 'director' || m.role === 'system');
                const headerName =
                  isUser
                    ? '我'
                    : viewMode === 'group'
                      ? (m.sender_type === 'director' ? 'Director' : m.sender_type === 'tool' ? 'Tool' : (characterNameById.get(m.char_id) || 'AI'))
                      : (characterNameById.get(m.char_id) || 'AI');

                return (
                <div key={`${m.id || m.timestamp}-${idx}`} className={`chat ${isUser ? 'chat-end' : 'chat-start'} group animate-message`}>
                  <div className="chat-header opacity-50 text-[10px] mb-1 flex items-center gap-2">
                    {headerName}
                    {viewMode === 'char' && (
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                          {!m.image && <button className="hover:text-primary" onClick={()=>{setEditingMsgId(m.id!); setEditContent(m.content)}}><Pencil size={10}/></button>}
                          {m.role !== 'user' && idx === messages.length - 1 && <button className="hover:text-primary" onClick={handleRegenerate}><RefreshCw size={10}/></button>}
                          <button className="hover:text-error" onClick={async () => { if (confirm("删除该条记录？")) { if (m.id) { await api.messages.delete(m.id); setMessages(prev => prev.filter(msg => msg.id !== m.id)); } else { setMessages(prev => prev.filter(msg => msg.timestamp !== m.timestamp)); } } }}><Trash2 size={10}/></button>
                      </div>
                    )}
                  </div>
                  {m.image ? (
                    <div className="chat-bubble p-1 bg-base-200 border-base-300 shadow-xl overflow-hidden relative group/img">
                      <img src={m.image} className="max-w-xs md:max-w-md rounded-lg"/>
                      {!m.id && (<div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity"><button className="btn btn-circle btn-xs btn-primary shadow-lg" title="保存" onClick={async () => { try { const res = await api.messages.add(m); setMessages(prev => prev.map(msg => msg.timestamp === m.timestamp ? { ...msg, id: res.id } : msg)); alert("已保存"); } catch (err) { alert("保存失败"); } }}><Save size={12}/></button></div>)}
                    </div>
                  ) : (
                    <div className={`chat-bubble shadow-lg border ${isUser ? 'chat-bubble-primary border-primary' : isSystemLike ? 'bg-base-300 text-base-content border-base-300 text-xs' : 'bg-base-200 text-base-content border-base-300'}`}>
                      {viewMode === 'char' && editingMsgId === m.id ? (
                          <div className="flex flex-col gap-2 min-w-[200px]"><textarea className="textarea textarea-bordered textarea-sm w-full bg-base-100" value={editContent} onChange={e=>setEditContent(e.target.value)}/><div className="flex justify-end gap-1"><button className="btn btn-xs" onClick={()=>setEditingMsgId(null)}>取消</button><button className="btn btn-xs btn-primary" onClick={async ()=>{await api.messages.update(m.id!, editContent); setMessages(prev => prev.map(msg=>msg.id===m.id?{...msg, content:editContent}:msg)); setEditingMsgId(null)}}>保存</button></div></div>
                      ) : <div className={`prose prose-sm break-words ${isSystemLike ? 'prose-p:my-1' : ''}`}><ReactMarkdown rehypePlugins={[rehypeRaw]}>{m.content}</ReactMarkdown></div>}
                    </div>
                  )}
                </div>
              );
              })}
              {isTyping && <div className="chat chat-start opacity-50 animate-pulse"><div className="chat-bubble">思考中...</div></div>}
              <div ref={bottomRef} className="h-20" />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-base-100 border-t border-base-300">
              <div className="max-w-4xl mx-auto flex flex-col gap-2">
                {viewMode === 'group' && selectedRoomId && !isLogRoom && (
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {characters.filter(c => groupMemberIds.includes(c.id!)).map(m => (
                      <button key={m.id} onClick={() => sendRoomChat(input || '', m.id)} disabled={isTyping || !input.trim()} className="btn btn-xs btn-outline btn-secondary whitespace-nowrap rounded-full">
                        @{m.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-end bg-base-200 p-2 rounded-2xl shadow-inner border border-base-300">
                    <button className="btn btn-circle btn-ghost btn-sm text-accent" disabled={isLogRoom} onClick={()=>{const src = viewMode === 'group' ? (roomMessages as any[]) : (messages as any[]); setGenPrompt(src[src.length-1]?.content || ""); setUseSdPromptConversion(true); setShowGenModal(true)}}><ImageIcon size={20}/></button>
                  <textarea ref={inputRef} disabled={isLogRoom} className="textarea textarea-ghost flex-1 min-h-[2.5rem] max-h-48 resize-none py-2 px-2 focus:outline-none" rows={1} value={input} onChange={e=>{setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=e.target.scrollHeight+'px'}} placeholder={isLogRoom ? "世界日志只读（不能发言）" : "输入消息..."} onKeyDown={e=>{if(e.key==='Enter' && !e.shiftKey){e.preventDefault(); handleSend();}}} />
                  {isTyping ? (<button className="btn btn-circle btn-error btn-sm shadow-lg" onClick={stopGeneration}><Square size={16} fill="currentColor"/></button>) : (<button className="btn btn-circle btn-primary btn-sm shadow-lg" onClick={handleSend} disabled={isLogRoom || !input.trim()}><Send size={18}/></button>)}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="drawer-side z-50"><label htmlFor="my-drawer" className="drawer-overlay"></label><Sidebar /></div>

      {/* 1. 设置面板 (恢复手动模型列表输入) */}
      {showSettings && settings && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b bg-base-200 font-bold flex justify-between items-center">系统配置<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowSettings(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                      <section>
                          <h4 className="text-sm font-black mb-3 text-primary uppercase">基础与沉浸</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control"><label className="label text-xs font-bold">玩家姓名</label><input className="input input-bordered" placeholder="如：陈墨" value={settings.user_name || ''} onChange={e=>setSettings({...settings, user_name:e.target.value})} /></div>
                            <div className="form-control">
                              <label className="label text-xs font-bold">生图后端</label>
                              <select className="select select-bordered" value={settings.image_backend || 'sdwebui'} onChange={e=>setSettings({...settings, image_backend: e.target.value as any})}>
                                <option value="sdwebui">SD WebUI (txt2img)</option>
                                <option value="openai">OpenAI 兼容 (/images/generations)</option>
                              </select>
                            </div>
                            { (settings.image_backend || 'sdwebui') === 'sdwebui' ? (
                              <div className="form-control"><label className="label text-xs font-bold">SD 地址 (API)</label><input className="input input-bordered" placeholder="http://127.0.0.1:7860" value={settings.sd_url || ''} onChange={e=>setSettings({...settings, sd_url:e.target.value})} /></div>
                            ) : (
                              <div className="form-control"><label className="label text-xs font-bold">OpenAI 生图模型 (可选)</label><input className="input input-bordered" placeholder="留空则使用顶部已选模型；如：gpt-image-1 / sdxl / flux-dev" value={settings.image_model_id || ''} onChange={e=>setSettings({...settings, image_model_id:e.target.value})} /></div>
                            )}
                          </div>
                      </section>
                      <section>
                          <h4 className="text-sm font-black mb-3 text-primary uppercase">模型绑定 (可选)</h4>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="p-4 border border-base-300 rounded-xl">
                              <div className="text-xs font-black mb-3">生图模型（OpenAI 兼容后端用）</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                  <label className="label text-xs font-bold">预设</label>
                                  <select
                                    className="select select-bordered"
                                    value={settings.image_preset_id ? String(settings.image_preset_id) : ''}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      if (!v) {
                                        setSettings({ ...settings, image_preset_id: undefined, image_model_id: '' });
                                        return;
                                      }
                                      const pid = parseInt(v, 10);
                                      setSettings({ ...settings, image_preset_id: pid });
                                      fetchPresetModels(pid);
                                    }}
                                  >
                                    <option value="">跟随顶部预设</option>
                                    {presets.map(p => <option key={`img-preset-${p.id}`} value={String(p.id)}>{p.name}</option>)}
                                  </select>
                                </div>
                                <div className="form-control">
                                  <label className="label text-xs font-bold">模型</label>
                                  <div className="join">
                                    <select
                                      className="select select-bordered join-item w-full"
                                      disabled={!settings.image_preset_id}
                                      value={settings.image_model_id || ''}
                                      onChange={(e) => setSettings({ ...settings, image_model_id: e.target.value })}
                                    >
                                      <option value="">跟随顶部模型</option>
                                      {settings.image_preset_id && (presetModelsMap[settings.image_preset_id] || []).map(m => (
                                        <option key={`img-model-${m}`} value={m}>{m}</option>
                                      ))}
                                      {settings.image_preset_id && (presetModelsMap[settings.image_preset_id]?.length || 0) === 0 && manualModels.map(m => (
                                        <option key={`img-manual-${m}`} value={m}>{m}</option>
                                      ))}
                                    </select>
                                    <button
                                      className={`btn btn-sm join-item btn-ghost ${settings.image_preset_id && presetModelsLoading[settings.image_preset_id] ? 'loading' : ''}`}
                                      title="刷新模型列表"
                                      onClick={() => fetchPresetModels(settings.image_preset_id, true)}
                                      disabled={!settings.image_preset_id}
                                    >
                                      <RefreshCw size={14}/>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="p-4 border border-base-300 rounded-xl">
                              <div className="text-xs font-black mb-3">记忆总结模型</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                  <label className="label text-xs font-bold">预设</label>
                                  <select
                                    className="select select-bordered"
                                    value={settings.summary_preset_id ? String(settings.summary_preset_id) : ''}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      if (!v) {
                                        setSettings({ ...settings, summary_preset_id: undefined, summary_model_id: '' });
                                        return;
                                      }
                                      const pid = parseInt(v, 10);
                                      setSettings({ ...settings, summary_preset_id: pid });
                                      fetchPresetModels(pid);
                                    }}
                                  >
                                    <option value="">跟随顶部预设</option>
                                    {presets.map(p => <option key={`sum-preset-${p.id}`} value={String(p.id)}>{p.name}</option>)}
                                  </select>
                                </div>
                                <div className="form-control">
                                  <label className="label text-xs font-bold">模型</label>
                                  <div className="join">
                                    <select
                                      className="select select-bordered join-item w-full"
                                      disabled={!settings.summary_preset_id}
                                      value={settings.summary_model_id || ''}
                                      onChange={(e) => setSettings({ ...settings, summary_model_id: e.target.value })}
                                    >
                                      <option value="">跟随顶部模型</option>
                                      {settings.summary_preset_id && (presetModelsMap[settings.summary_preset_id] || []).map(m => (
                                        <option key={`sum-model-${m}`} value={m}>{m}</option>
                                      ))}
                                      {settings.summary_preset_id && (presetModelsMap[settings.summary_preset_id]?.length || 0) === 0 && manualModels.map(m => (
                                        <option key={`sum-manual-${m}`} value={m}>{m}</option>
                                      ))}
                                    </select>
                                    <button
                                      className={`btn btn-sm join-item btn-ghost ${settings.summary_preset_id && presetModelsLoading[settings.summary_preset_id] ? 'loading' : ''}`}
                                      title="刷新模型列表"
                                      onClick={() => fetchPresetModels(settings.summary_preset_id, true)}
                                      disabled={!settings.summary_preset_id}
                                    >
                                      <RefreshCw size={14}/>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="p-4 border border-base-300 rounded-xl">
                              <div className="text-xs font-black mb-3">SD 转换模型（描述 → tags）</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                  <label className="label text-xs font-bold">预设</label>
                                  <select
                                    className="select select-bordered"
                                    value={settings.sd_prompt_preset_id ? String(settings.sd_prompt_preset_id) : ''}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      if (!v) {
                                        setSettings({ ...settings, sd_prompt_preset_id: undefined, sd_prompt_model_id: '' });
                                        return;
                                      }
                                      const pid = parseInt(v, 10);
                                      setSettings({ ...settings, sd_prompt_preset_id: pid });
                                      fetchPresetModels(pid);
                                    }}
                                  >
                                    <option value="">跟随顶部预设</option>
                                    {presets.map(p => <option key={`sd-preset-${p.id}`} value={String(p.id)}>{p.name}</option>)}
                                  </select>
                                </div>
                                <div className="form-control">
                                  <label className="label text-xs font-bold">模型</label>
                                  <div className="join">
                                    <select
                                      className="select select-bordered join-item w-full"
                                      disabled={!settings.sd_prompt_preset_id}
                                      value={settings.sd_prompt_model_id || ''}
                                      onChange={(e) => setSettings({ ...settings, sd_prompt_model_id: e.target.value })}
                                    >
                                      <option value="">跟随顶部模型</option>
                                      {settings.sd_prompt_preset_id && (presetModelsMap[settings.sd_prompt_preset_id] || []).map(m => (
                                        <option key={`sd-model-${m}`} value={m}>{m}</option>
                                      ))}
                                      {settings.sd_prompt_preset_id && (presetModelsMap[settings.sd_prompt_preset_id]?.length || 0) === 0 && manualModels.map(m => (
                                        <option key={`sd-manual-${m}`} value={m}>{m}</option>
                                      ))}
                                    </select>
                                    <button
                                      className={`btn btn-sm join-item btn-ghost ${settings.sd_prompt_preset_id && presetModelsLoading[settings.sd_prompt_preset_id] ? 'loading' : ''}`}
                                      title="刷新模型列表"
                                      onClick={() => fetchPresetModels(settings.sd_prompt_preset_id, true)}
                                      disabled={!settings.sd_prompt_preset_id}
                                    >
                                      <RefreshCw size={14}/>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                      </section>
                      <section>
                          <div className="flex justify-between items-end mb-3">
                              <h4 className="text-sm font-black text-primary uppercase">API 预设库 (用于顶部导航栏切换)</h4>
                              <button className="btn btn-xs btn-primary" onClick={() => api.presets.add({name: "New Preset", api_base: "", api_key: "", api_mode: 'chat_completions'}).then(() => loadData())}>+ 新增</button>
                          </div>
                          <div className="overflow-x-auto border border-base-300 rounded-xl mb-4">
                              <table className="table table-compact w-full text-xs">
                                  <thead><tr className="bg-base-200"><th>名称</th><th>Base URL</th><th>Key</th><th>Mode</th><th className="w-20">操作</th></tr></thead>
                                  <tbody>
                                      {presets.map((p, idx) => (
                                          <tr key={p.id}>
                                              <td><input className="input input-ghost input-xs w-full font-bold" value={p.name} onChange={e=>{const n=[...presets]; n[idx].name=e.target.value; setPresets(n);}} /></td>
                                              <td><input className="input input-ghost input-xs w-full" value={p.api_base} onChange={e=>{const n=[...presets]; n[idx].api_base=e.target.value; setPresets(n);}} /></td>
                                              <td><input className="input input-ghost input-xs w-full" type="password" value={p.api_key} onChange={e=>{const n=[...presets]; n[idx].api_key=e.target.value; setPresets(n);}} /></td>
                                              <td><select className="select select-bordered select-xs w-full" value={p.api_mode || 'chat_completions'} onChange={e=>{const n=[...presets]; n[idx].api_mode=e.target.value as ApiMode; setPresets(n);}}><option value="chat_completions">chat.completions</option><option value="responses">responses</option></select></td>
                                              <td className="flex gap-1">
                                                  <button className="btn btn-ghost btn-xs text-success" onClick={() => api.presets.update(p.id!, { ...p, api_mode: p.api_mode || 'chat_completions' }).then(() => alert("已更新"))}><Save size={14}/></button>
                                                  <button className="btn btn-ghost btn-xs text-error" onClick={() => {if(confirm("删除？")) api.presets.delete(p.id!).then(() => loadData());}}><Trash2 size={14}/></button>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                          {/* 【恢复】手动模型列表输入框 */}
                          <div className="form-control">
                                <label className="label font-bold text-xs">备用模型列表 (手动输入，逗号分隔)</label>
                                <textarea className="textarea textarea-bordered w-full text-xs h-20" placeholder="当 API 不支持自动获取模型列表时使用，例如：gpt-4o, claude-3-5-sonnet, deepseek-chat" value={settings.model_list || ""} onChange={e=>setSettings({...settings, model_list:e.target.value})} />
                          </div>
                      </section>
                      <section>
                          <h4 className="text-sm font-black mb-3 text-error uppercase">数据管理</h4>
                          <div className="p-4 border border-error/20 rounded-xl bg-error/5 flex justify-between items-center gap-4">
                              <div className="flex-1"><p className="text-xs font-bold text-error">清理数据库图片</p><p className="text-[10px] opacity-60 mt-1">永久删除 D1 数据库中存储的所有图片消息。</p></div>
                              <button className="btn btn-error btn-sm shadow-md" onClick={async () => { if(confirm("确定清理图片？")) { await api.messages.clearAllImages(); alert("清理成功"); } }}><Eraser size={14} className="mr-1"/> 清理图片</button>
                          </div>
                      </section>
                  </div>
                  <div className="p-4 border-t bg-base-200"><button className="btn btn-primary btn-block" onClick={async ()=>{await api.settings.update(settings!); setShowSettings(false); loadData();}}>保存配置</button></div>
              </div>
          </div>
      )}

      {/* 2. 角色编辑器 (已移除 API 覆盖) */}
      {showCharEdit && selectedCharId && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-2xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b flex justify-between bg-base-200 font-bold items-center">角色档案<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowCharEdit(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="form-control"><label className="label font-bold text-xs">角色姓名</label><input className="input input-bordered" value={characters.find(c=>c.id===selectedCharId)?.name} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, name:e.target.value}:c))} /></div>
                      <div className="form-control"><label className="label font-bold text-xs">人设/世界观描述</label><textarea className="textarea textarea-bordered h-48 font-mono text-sm" value={characters.find(c=>c.id===selectedCharId)?.description} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, description:e.target.value}:c))} /></div>
                      <div className="form-control"><label className="label font-bold text-xs text-primary">长期记忆 (Summary)</label><textarea className="textarea textarea-bordered h-32 font-mono text-xs" value={characters.find(c=>c.id===selectedCharId)?.summary} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, summary:e.target.value}:c))} /></div>
                  </div>
                  <div className="p-4 border-t bg-base-200 flex justify-end"><button className="btn btn-primary" onClick={async ()=>{await api.characters.update(selectedCharId, characters.find(c=>c.id===selectedCharId)!); setShowCharEdit(false); loadData();}}>确认保存</button></div>
              </div>
          </div>
      )}

      {/* 3. 房间编辑器 (Phase A-D) */}
      {showGroupEdit && selectedRoomId && (() => {
        const room = rooms.find(r => r.id === selectedRoomId);
        if (!room) return null;
        const roomPendingDispatches = roomDispatches.filter(d => d.status === 'pending');
        return (
          <div className="modal modal-open text-base-content">
            <div className="modal-box max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden">
              <div className="p-6 border-b flex justify-between bg-base-200 font-bold items-center">
                <h3>房间配置 / Sandbox & Agent</h3>
                <button className="btn btn-sm btn-circle btn-ghost" onClick={() => setShowGroupEdit(false)}><X /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="form-control">
                    <label className="label font-bold">房间名</label>
                    <input className="input input-bordered" value={room.name || ''} onChange={e => setRooms(rooms.map(r => r.id === selectedRoomId ? { ...r, name: e.target.value } : r))} />
                  </div>
                  <div className="form-control">
                    <label className="label font-bold">模式</label>
                    <select className="select select-bordered" value={room.mode || 'agents'} onChange={e => setRooms(rooms.map(r => r.id === selectedRoomId ? { ...r, mode: e.target.value as any } : r))}>
                      <option value="agents">Agent 模式</option>
                      <option value="sandbox">Sandbox 模式</option>
                      <option value="chat">Chat 模式</option>
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label font-bold">分类</label>
                    <input className="input input-bordered" placeholder="例如：主线 / 支线 / 系统" value={room.category || ''} onChange={e => setRooms(rooms.map(r => r.id === selectedRoomId ? { ...r, category: e.target.value } : r))} />
                  </div>
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label font-bold text-xs text-primary">场景描述</label>
                    <textarea className="textarea textarea-bordered h-40" value={room.description || ''} onChange={e => setRooms(rooms.map(r => r.id === selectedRoomId ? { ...r, description: e.target.value } : r))} />
                  </div>
                  <div className="form-control">
                    <label className="label font-bold text-xs text-secondary">规则 / 调度说明</label>
                    <textarea className="textarea textarea-bordered h-40 font-mono text-xs" placeholder="例如：严格回合制；导演每回合最多选择 2 名角色；状态修改须走 HITL..." value={room.rules || ''} onChange={e => setRooms(rooms.map(r => r.id === selectedRoomId ? { ...r, rules: e.target.value } : r))} />
                  </div>
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label font-bold text-xs">房间状态 JSON</label>
                    <textarea className="textarea textarea-bordered h-52 font-mono text-[11px]" value={room.state_json || '{}'} onChange={e => setRooms(rooms.map(r => r.id === selectedRoomId ? { ...r, state_json: e.target.value } : r))} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="label font-bold text-xs m-0">全局世界状态 JSON</label>
                      {room.mode === 'sandbox' && <span className="badge badge-primary badge-sm">保存房间时同步</span>}
                    </div>
                    <textarea className="textarea textarea-bordered h-52 font-mono text-[11px]" value={draftWorldStateJson} onChange={e => setDraftWorldStateJson(e.target.value)} />
                  </div>
                </section>

                <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-base-300 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-black text-sm">成员 / 顺序 / 角色</div>
                      <div className="text-[11px] opacity-60">可在聊天输入区通过 @角色 指定发言</div>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {characters.map(c => {
                        const existing = roomMembersDraft.find(m => m.char_id === c.id);
                        const active = !!existing;
                        return (
                          <div key={c.id} className={`p-3 rounded-xl border ${active ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-100'}`}>
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-primary checkbox-sm"
                                checked={active}
                                onChange={e => {
                                  if (!c.id) return;
                                  if (e.target.checked) {
                                    setRoomMembersDraft(prev => [...prev, { char_id: c.id!, role: 'agent', order_index: prev.length, is_active: 1 }]);
                                  } else {
                                    setRoomMembersDraft(prev => prev.filter(m => m.char_id !== c.id).map((m, idx) => ({ ...m, order_index: idx })));
                                  }
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-bold truncate">{c.name}</div>
                                <div className="text-[11px] opacity-60 truncate">{c.description || '未填写描述'}</div>
                              </div>
                              {active && (
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="number"
                                    min={0}
                                    className="input input-bordered input-xs w-16"
                                    value={existing?.order_index ?? 0}
                                    onChange={e => setRoomMembersDraft(prev => prev.map(m => m.char_id === c.id ? { ...m, order_index: parseInt(e.target.value || '0', 10) || 0 } : m))}
                                  />
                                  <select
                                    className="select select-bordered select-xs"
                                    value={existing?.role || 'agent'}
                                    onChange={e => setRoomMembersDraft(prev => prev.map(m => m.char_id === c.id ? { ...m, role: e.target.value } : m))}
                                  >
                                    <option value="agent">agent</option>
                                    <option value="npc">npc</option>
                                    <option value="narrator">narrator</option>
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-base-300 space-y-3">
                    <div className="font-black text-sm">导演配置</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="form-control">
                        <label className="label text-xs font-bold">预设</label>
                        <select className="select select-bordered" value={roomDirectorConfig?.api_preset_id ? String(roomDirectorConfig.api_preset_id) : ''} onChange={e => {
                          const v = e.target.value ? parseInt(e.target.value, 10) : null;
                          if (v) fetchPresetModels(v);
                          setRoomDirectorConfig(prev => ({ ...(prev || { room_id: selectedRoomId }), api_preset_id: v, model_id: prev?.model_id || null, temperature: prev?.temperature ?? 0.7, max_output_tokens: prev?.max_output_tokens ?? 600 }));
                        }}>
                          <option value="">跟随顶部预设</option>
                          {presets.map(p => <option key={`dir-preset-${p.id}`} value={String(p.id)}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="form-control">
                        <label className="label text-xs font-bold">模型</label>
                        <select className="select select-bordered" value={roomDirectorConfig?.model_id || ''} onChange={e => setRoomDirectorConfig(prev => ({ ...(prev || { room_id: selectedRoomId }), model_id: e.target.value || null, api_preset_id: prev?.api_preset_id ?? null, temperature: prev?.temperature ?? 0.7, max_output_tokens: prev?.max_output_tokens ?? 600 }))}>
                          <option value="">跟随顶部模型</option>
                          {(roomDirectorConfig?.api_preset_id ? (presetModelsMap[roomDirectorConfig.api_preset_id] || []) : []).map(m => <option key={`dir-model-${m}`} value={m}>{m}</option>)}
                          {manualModels.map(m => <option key={`dir-manual-${m}`} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div className="form-control">
                        <label className="label text-xs font-bold">温度</label>
                        <input type="number" step="0.1" className="input input-bordered" value={roomDirectorConfig?.temperature ?? 0.7} onChange={e => setRoomDirectorConfig(prev => ({ ...(prev || { room_id: selectedRoomId }), api_preset_id: prev?.api_preset_id ?? null, model_id: prev?.model_id ?? null, temperature: parseFloat(e.target.value || '0.7'), max_output_tokens: prev?.max_output_tokens ?? 600 }))} />
                      </div>
                      <div className="form-control">
                        <label className="label text-xs font-bold">输出上限</label>
                        <input type="number" className="input input-bordered" value={roomDirectorConfig?.max_output_tokens ?? 600} onChange={e => setRoomDirectorConfig(prev => ({ ...(prev || { room_id: selectedRoomId }), api_preset_id: prev?.api_preset_id ?? null, model_id: prev?.model_id ?? null, temperature: prev?.temperature ?? 0.7, max_output_tokens: parseInt(e.target.value || '600', 10) || 600 }))} />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="p-4 rounded-xl border border-base-300 space-y-3">
                  <div className="font-black text-sm">Agent 配置（按成员）</div>
                  <div className="space-y-3">
                    {roomMembersDraft.slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)).map(member => {
                      const cfg = roomAgentConfigs.find(x => x.char_id === member.char_id) || { room_id: selectedRoomId, char_id: member.char_id, temperature: 0.8, max_output_tokens: 800, tool_policy_json: '{"update_state":"dispatch","request_image":"dispatch"}' };
                      const selectedPresetId = cfg.api_preset_id || undefined;
                      return (
                        <div key={`agent-cfg-${member.char_id}`} className="p-3 rounded-xl border border-base-300 bg-base-100">
                          <div className="font-bold mb-3">{characterNameById.get(member.char_id) || `#${member.char_id}`}</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                            <select className="select select-bordered" value={selectedPresetId ? String(selectedPresetId) : ''} onChange={e => {
                              const pid = e.target.value ? parseInt(e.target.value, 10) : null;
                              if (pid) fetchPresetModels(pid);
                              setRoomAgentConfigs(prev => {
                                const next = prev.filter(x => x.char_id !== member.char_id);
                                return [...next, { ...cfg, api_preset_id: pid }];
                              });
                            }}>
                              <option value="">跟随顶部预设</option>
                              {presets.map(p => <option key={`agent-preset-${member.char_id}-${p.id}`} value={String(p.id)}>{p.name}</option>)}
                            </select>
                            <select className="select select-bordered" value={cfg.model_id || ''} onChange={e => setRoomAgentConfigs(prev => {
                              const next = prev.filter(x => x.char_id !== member.char_id);
                              return [...next, { ...cfg, model_id: e.target.value || null }];
                            })}>
                              <option value="">跟随顶部模型</option>
                              {(selectedPresetId ? (presetModelsMap[selectedPresetId] || []) : []).map(m => <option key={`agent-model-${member.char_id}-${m}`} value={m}>{m}</option>)}
                              {manualModels.map(m => <option key={`agent-manual-${member.char_id}-${m}`} value={m}>{m}</option>)}
                            </select>
                            <input type="number" step="0.1" className="input input-bordered" value={cfg.temperature ?? 0.8} onChange={e => setRoomAgentConfigs(prev => {
                              const next = prev.filter(x => x.char_id !== member.char_id);
                              return [...next, { ...cfg, temperature: parseFloat(e.target.value || '0.8') }];
                            })} />
                            <input type="number" className="input input-bordered" value={cfg.max_output_tokens ?? 800} onChange={e => setRoomAgentConfigs(prev => {
                              const next = prev.filter(x => x.char_id !== member.char_id);
                              return [...next, { ...cfg, max_output_tokens: parseInt(e.target.value || '800', 10) || 800 }];
                            })} />
                            <input className="input input-bordered font-mono text-xs" value={cfg.tool_policy_json || ''} onChange={e => setRoomAgentConfigs(prev => {
                              const next = prev.filter(x => x.char_id !== member.char_id);
                              return [...next, { ...cfg, tool_policy_json: e.target.value }];
                            })} placeholder='{"update_state":"dispatch"}' />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-base-300 space-y-3">
                    <div className="font-black text-sm">长期记忆</div>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {roomSummaries.length === 0 ? <div className="text-sm opacity-60">暂无记忆摘要。</div> : roomSummaries.map(s => (
                        <div key={s.id} className="p-3 rounded-lg bg-base-200 border border-base-content/5">
                          <div className="text-[11px] opacity-60 mb-1">{s.source} · {new Date(s.updated_at).toLocaleString()}</div>
                          <div className="text-sm whitespace-pre-wrap">{s.summary}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-base-300 space-y-3">
                    <div className="font-black text-sm">房间状态快照</div>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {roomSnapshots.length === 0 ? <div className="text-sm opacity-60">暂无快照。</div> : roomSnapshots.map(s => (
                        <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-base-200">
                          <span className="text-xs">#{s.id} · {new Date(s.created_at).toLocaleString()}</span>
                          <button className="btn btn-xs" onClick={async () => {
                            await api.roomStateSnapshots.restore(s.id);
                            const [snaps, latestMessages] = await Promise.all([
                              api.roomStateSnapshots.list(selectedRoomId),
                              api.roomMessages.list(selectedRoomId),
                            ]);
                            setRoomSnapshots(snaps as any);
                            setRoomMessages(latestMessages as any);
                            const refreshedRooms = await api.rooms.list();
                            setRooms(refreshedRooms);
                          }}>回滚</button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-base-300 space-y-3">
                    <div className="font-black text-sm">全局状态快照</div>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {worldSnapshots.length === 0 ? <div className="text-sm opacity-60">暂无快照。</div> : worldSnapshots.map(s => (
                        <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-base-200">
                          <span className="text-xs">#{s.id} · {new Date(s.created_at).toLocaleString()}</span>
                          <button className="btn btn-xs" onClick={async () => {
                            await api.worldStateSnapshots.restore(s.id);
                            const [ws, wsSnaps] = await Promise.all([api.worldState.get(), api.worldStateSnapshots.list()]);
                            setWorldState(ws);
                            setDraftWorldStateJson(ws.state_json || '{}');
                            setWorldSnapshots(wsSnaps);
                          }}>回滚</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="p-4 rounded-xl border border-base-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-black text-sm">房间公文流</div>
                    <div className="badge badge-secondary badge-sm">pending {roomPendingDispatches.length}</div>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {roomDispatches.length === 0 ? <div className="text-sm opacity-60">暂无公文。</div> : roomDispatches.map(d => (
                      <div key={d.id} className="p-3 rounded-lg bg-base-200 border border-base-content/5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-sm">{d.abstract}</div>
                          <span className={`badge badge-sm ${d.status === 'approved' ? 'badge-success' : d.status === 'rejected' ? 'badge-error' : d.status === 'rewrite_requested' ? 'badge-warning' : 'badge-secondary'}`}>{d.status || 'pending'}</span>
                        </div>
                        <div className="text-[11px] opacity-60 mt-1">#{d.id} · from {d.from_room_id ?? '-'} → {d.to_room_id} · {d.created_at ? new Date(d.created_at).toLocaleString() : ''}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <div className="p-6 border-t bg-base-200 flex justify-between items-center gap-3">
                <div className="text-xs opacity-70">Global updated: {worldState?.updated_at ? new Date(worldState.updated_at).toLocaleString() : '未加载'}</div>
                <div className="flex gap-2">
                  <button className="btn" onClick={() => setShowGroupEdit(false)}>取消</button>
                  <button className="btn btn-primary" onClick={saveRoomConfigs}>保存房间</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3b. 公文箱 / Inbox (Phase D) */}
      {showInbox && (
        <div className="modal modal-open text-base-content">
          <div className="modal-box max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
            <div className="p-6 border-b flex justify-between bg-base-200 font-bold items-center">
              <h3 className="flex items-center gap-2"><Inbox size={18}/> 公文箱 / Inbox</h3>
              <button className="btn btn-sm btn-circle btn-ghost" onClick={() => setShowInbox(false)}><X /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs opacity-70">待处理：{pendingCount}</div>
                <button className="btn btn-sm" onClick={async () => {
                  const pending = await api.dispatches.listPending().catch(() => []);
                  setPendingDispatches(pending as any);
                }}><RefreshCw size={16}/> 刷新</button>
              </div>

              {(pendingDispatches || []).filter(d => (d as any)?.status === 'pending' || !(d as any)?.status).length === 0 ? (
                <div className="p-4 rounded-xl border border-base-300 text-sm opacity-70">暂无待处理公文。</div>
              ) : (
                <div className="space-y-3">
                  {(pendingDispatches || []).filter(d => (d as any)?.status === 'pending' || !(d as any)?.status).map(d => {
                    const payloadObj = (() => {
                      try { return d.payload_json ? JSON.parse(d.payload_json) : null; } catch { return null; }
                    })();
                    return (
                      <div key={d.id} className="p-4 rounded-xl border border-base-300 bg-base-100 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-bold truncate">{d.abstract}</div>
                            <div className="text-[11px] opacity-70 mt-1">
                              from: {d.from_room_id ?? '-'} → to: {d.to_room_id} · #{d.id}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button className="btn btn-sm btn-success" onClick={() => handleDispatchAction(d.id!, 'approve')}>批准</button>
                            <button className="btn btn-sm btn-error" onClick={() => handleDispatchAction(d.id!, 'reject')}>驳回</button>
                          </div>
                        </div>
                        {payloadObj && (
                          <details className="collapse collapse-arrow bg-base-200 border border-base-content/5">
                            <summary className="collapse-title text-xs font-bold">Payload</summary>
                            <div className="collapse-content">
                              <pre className="text-[11px] whitespace-pre-wrap break-words font-mono">{JSON.stringify(payloadObj, null, 2)}</pre>
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. 世界书编辑器 (保持不变) */}
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
                                    <div className="flex items-center gap-2 bg-base-300 px-3 py-1 rounded-full"><span className="text-[10px] font-bold">启用</span><input type="checkbox" className="toggle toggle-success toggle-xs" checked={e.isActive} onChange={(evt) => {const val = evt.target.checked; api.lorebook.update(e.id!, { isActive: val }).then(() => {setLorebookEntries(prev => prev.map(item => item.id === e.id ? {...item, isActive: val} : item));});}} /></div>
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
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-primary"><Sparkles/> 极速生图</h3>
                <textarea className="textarea textarea-bordered w-full h-32" value={genPrompt} onChange={e=>setGenPrompt(e.target.value)} placeholder="描述你想生成的画面细节，支持自然语言..." />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold">
                    <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={useSdPromptConversion} onChange={(e)=>setUseSdPromptConversion(e.target.checked)} />
                    使用 SD 转换模型（描述 → tags）
                  </label>
                </div>
                <div className="modal-action flex gap-2">
                    <button className="btn btn-primary flex-1 shadow-lg" onClick={handleGenImageAction}>开始生成</button>
                    <button className="btn flex-1" onClick={()=>setShowGenModal(false)}>取消</button>
                </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default App;
