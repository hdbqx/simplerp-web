import { useState, useEffect, useRef, useMemo } from 'react';
import { api, type Message, type Character, type Settings, type ApiPreset, type ApiMode, type Room, type RoomMember, type RoomMessage, type Variable, type VariableStage, type VariableThoughtConfig } from './lib/db';
import { LLMClient } from './lib/llm';
import { VariableEngine } from './lib/variable-engine';
import { LorebookEngine } from './lib/lorebook-engine';
import { replaceVariables as replaceBuiltInVariables } from './lib/variables';
import { ImageStudio } from './components/ImageStudio';
import { VariableManager } from './components/variables/VariableManager';
import { SnapshotManager } from './components/snapshots/SnapshotManager';
import { LorebookManager } from './components/lorebook/LorebookManager';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { 
  Send, Image as ImageIcon, Settings as SettingsIcon, Menu, Pencil, Plus, Trash2, X, 
  BookOpen, Book, Users, RefreshCw, Square, Save, Eraser, Sparkles, Copy, Edit
} from 'lucide-react';

function App() {
  const [viewMode, setViewMode] = useState<'char' | 'group' | 'image'>('char');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [presets, setPresets] = useState<ApiPreset[]>([]);
  
  const [activePresetId, setActivePresetId] = useState<number | undefined>();
  const [activeModel, setActiveModel] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [presetModelsMap, setPresetModelsMap] = useState<Record<number, string[]>>({});
  const [presetModelsLoading, setPresetModelsLoading] = useState<Record<number, boolean>>({});

  const [selectedCharId, setSelectedCharId] = useState<number>();
  const [selectedRoomId, setSelectedRoomId] = useState<number>();
  const [groupMemberIds, setGroupMemberIds] = useState<number[]>([]);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  const [roomMessages, setRoomMessages] = useState<RoomMessage[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<Settings>();
  const [lorebookEntries, setLorebookEntries] = useState<any[]>([]);
  
  // 全局变量与思考引擎状态
  const [globalVariables, setGlobalVariables] = useState<Variable[]>([]);
  const [globalStages, setGlobalStages] = useState<VariableStage[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'info' | 'success' } | null>(null);

  const showToast = (text: string, type: 'info' | 'success' = 'info') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showCharEdit, setShowCharEdit] = useState(false);
  const [charEditTab, setCharEditTab] = useState<'basic' | 'variables' | 'snapshots'>('basic');
  const [charVariables, setCharVariables] = useState<any[]>([]);
  const [showGroupEdit, setShowGroupEdit] = useState(false);
  const [showLorebook, setShowLorebook] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [useSdPromptConversion, setUseSdPromptConversion] = useState(true);
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  const [roomMembersDraft, setRoomMembersDraft] = useState<RoomMember[]>([]);

  const manualModels = useMemo(() => {
    if (!settings?.model_list) return [];
    return settings.model_list.split(/[,，\n]/).map(m => m.trim()).filter(m => m);
  }, [settings?.model_list]);

  const characterNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of characters) {
      if (c.id) m.set(c.id, c.name);
    }
    return m;
  }, [characters]);

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

  const loadData = async () => {
    try {
        const [c, r, s, p] = await Promise.all([
            api.characters.list(),
            api.rooms.list(),
            api.settings.get(),
            api.presets.list()
        ]);
        setCharacters(c); setRooms(r); setSettings(s); setPresets(p); 
        
        if (s.active_preset_id && p.some(pre => pre.id === s.active_preset_id)) {
            setActivePresetId(s.active_preset_id);
            const currentPreset = p.find(pre => pre.id === s.active_preset_id);
            if(currentPreset) {
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
  }, [showSettings]);

  useEffect(() => {
    if (!showGroupEdit) return;
    if (!selectedRoomId) return;
    api.rooms.getMembers(selectedRoomId).then(m => setRoomMembersDraft(m as any));
  }, [showGroupEdit, selectedRoomId]);

  useEffect(() => {
    if (!showCharEdit || !selectedCharId) return;
    loadCharData();
  }, [showCharEdit, selectedCharId, charEditTab]);

  const loadCharData = async () => {
    try {
      const vars = await api.variables.list(selectedCharId, undefined);
      setCharVariables(vars);
      setGlobalVariables(vars);
      let allStages: VariableStage[] = [];
      for (const v of vars) {
        if (v.id) {
          const st = await api.variableStages.list(v.id);
          allStages = [...allStages, ...st];
        }
      }
      setGlobalStages(allStages);
    } catch (e) {
      console.error('Failed to load char data', e);
    }
  };

  const loadLorebookEntries = async () => {
    if (!selectedCharId) return;
    const entries = await api.lorebookV2.list(selectedCharId, undefined);
    setLorebookEntries(entries as any);
  };

  const refreshModels = async (base: string, key: string, keepModelId?: string, manualListStr?: string, mode: ApiMode = 'chat_completions') => {
      setIsFetchingModels(true);
      const llm = new LLMClient(base, key, mode);
      const fetchedModels = await llm.fetchModels();
      setAvailableModels(fetchedModels);
      setIsFetchingModels(false);
      
      const currentManualList = manualListStr !== undefined ? manualListStr : (settings?.model_list || "");
      const manualArr = currentManualList.split(/[,，\n]/).map(m => m.trim()).filter(m => m);
      
      if (keepModelId && (fetchedModels.includes(keepModelId) || manualArr.includes(keepModelId))) {
          setActiveModel(keepModelId);
      } else if (fetchedModels.length > 0) {
          const first = fetchedModels[0];
          setActiveModel(first);
          if(settings) api.settings.update({ ...settings, active_model_id: first });
      } else if (manualArr.length > 0) {
          const first = manualArr[0];
          setActiveModel(first);
          if(settings) api.settings.update({ ...settings, active_model_id: first });
      }
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

  // 【核心修改】在此处装载全量变量数据、引擎配置和世界书
  useEffect(() => {
    setMessages([]);
    setRoomMessages([]);
    if (viewMode === 'char' && selectedCharId) {
      api.messages.list(selectedCharId).then(setMessages);
      loadLorebookEntries();
      
      api.variables.list(selectedCharId).then(async vars => {
        setGlobalVariables(vars);
        let allStages: VariableStage[] = [];
        for (const v of vars) {
          if (v.id) {
            const st = await api.variableStages.list(v.id);
            allStages = [...allStages, ...st];
          }
        }
        setGlobalStages(allStages);
      });
      setTurnCount(0);

    } else if (viewMode === 'group' && selectedRoomId) {
      api.rooms.getMembers(selectedRoomId).then((m) => {
        setRoomMembers(m);
        setGroupMemberIds((m || []).map(x => x.char_id));
      });
      api.roomMessages.list(selectedRoomId).then(setRoomMessages);
    }
  }, [selectedCharId, selectedRoomId, viewMode]);

  const messageCount = viewMode === 'group' ? roomMessages.length : messages.length;
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messageCount, isTyping]);

  const stopGeneration = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsTyping(false);
    }
  };

  const sendRoomChat = async (userText: string, speakerCharId: number | null) => {
    if (!settings) return;
    if (!selectedRoomId) return alert("请先选择房间");
    
    setIsTyping(true);
    try {
      if (speakerCharId) {
        if (!activePresetId || !activeModel) return alert("请先在顶部选择 API 预设和模型！");
        await api.roomChat.send({
          room_id: selectedRoomId,
          user_input: userText || undefined,
          speaker_char_id: speakerCharId,
          fallback_preset_id: activePresetId,
          fallback_model_id: activeModel,
        });
      } else if (userText) {
        await api.roomMessages.add({ room_id: selectedRoomId, role: 'user', sender_type: 'user', content: userText, timestamp: Date.now() });
      }
      const latest = await api.roomMessages.list(selectedRoomId);
      setRoomMessages(latest);
      setInput(''); 
      if (inputRef.current) inputRef.current.style.height = 'auto';
    } catch (e: any) { alert(e.message || String(e)); } finally { setIsTyping(false); }
  };

  const saveRoomConfigs = async () => {
    if (!selectedRoomId) return;
    const room = rooms.find(x => x.id === selectedRoomId);
    if (!room) return;

    await api.rooms.update(selectedRoomId, {
      name: room.name,
      description: room.description,
      summary: room.summary || '',
    });
    await api.rooms.updateMembers(selectedRoomId, roomMembersDraft.map(m => ({ char_id: m.char_id })));

    setShowGroupEdit(false);
    await loadData();
    const members = await api.rooms.getMembers(selectedRoomId).catch(() => []);
    setRoomMembers(members as any);
    setGroupMemberIds((members as any[]).map(x => Number((x as any).char_id)).filter(Boolean));
    alert('房间配置已保存');
  };

  // 【核心修改】重写单人 AI 触发逻辑，集成引擎装配
  const triggerAI = async (char: Character, textOverride?: string, historyOverride?: Message[]) => {
    if (isTyping || !settings) return;
    if (!activePresetId || !activeModel) return alert("请先在顶部导航栏选择 API 预设和模型！");
    const currentPreset = presets.find(p => p.id === activePresetId);
    if (!currentPreset) return alert("无效的 API 预设");

    // 1. 初始化引擎
    const varEngine = new VariableEngine(globalVariables, globalStages);
    const loreEngine = new LorebookEngine(lorebookEntries);
    const currentHistory = (historyOverride || messages).filter(m => m.content || m.role === 'user');

    // 2. 世界书动态扫描与注入组装
    const triggeredLorebook = loreEngine.scan(textOverride || "", currentHistory, varEngine.getVariablesMap(), {});
    const lorebookInjections = loreEngine.buildInjection(triggeredLorebook);
    if (triggeredLorebook.length > 0) {
      showToast("已激活世界书：" + triggeredLorebook.map((l: any) => l.name || l.keywords).join(', '));
    }

    // 3. 获取变量阶段的心理/行为暗示
    const stagePrompts = varEngine.getActiveStagePrompts().join('\n');

    // 4. 构建防串戏与人设基础的 System Prompt
    let basePrompt = char.description;
    if (char.summary) basePrompt += `\n\n[个人长期记忆]:\n${char.summary}`;
    if (stagePrompts) basePrompt += `\n\n[当前状态与心理防线]:\n${stagePrompts}`;

    // 5. 宏替换：先替换自定义变量（来自 VariableEngine），再替换内置系统变量 (如 {{user}}, {{time}})
    const rawSystemContent = 
      (lorebookInjections.beforeSystem ? lorebookInjections.beforeSystem + '\n---\n' : '') +
      basePrompt +
      (lorebookInjections.afterSystem ? '\n---\n' + lorebookInjections.afterSystem : '');
      
    const fullSystemContent = replaceBuiltInVariables(
      varEngine.replaceVariables(rawSystemContent, settings, char),
      settings, char
    );

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsTyping(true);
    const tempTs = Date.now() + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '', char_id: char.id, timestamp: tempTs }]);
    
    const llm = new LLMClient(currentPreset.api_base, currentPreset.api_key, getPresetMode(currentPreset));
    let fullContent = "";

    try {
      // 传入组装好的完整 System Prompt
      const stream = llm.chatStream(char, currentHistory, textOverride || "", settings, activeModel, fullSystemContent, undefined, controller);
      for await (const chunk of stream) {
        fullContent += chunk;
        setMessages(prev => prev.map(m => m.timestamp === tempTs ? { ...m, content: fullContent } : m));
      }
    } catch (e: any) {
        if (e.name !== 'AbortError') console.error("生成失败:", e);
    } finally {
      if (fullContent.trim().length > 0) {
          try {
            const res = await api.messages.add({ role: 'assistant', content: fullContent, char_id: char.id, timestamp: tempTs });
            setMessages(prev => prev.map(m => m.timestamp === tempTs ? { ...m, id: res.id } : m));

            // 触发后台自动分析更新变量机制
            setTurnCount(prev => {
              const nextCount = prev + 1;
              const interval = settings?.thought_interval ?? 5;
              if (settings?.is_thought_auto_update && nextCount >= interval) {
                api.variableThoughtConfig.triggerThought({
                  char_id: char.id,
                  history: currentHistory.slice(-10),
                  user_input: textOverride,
                  preset_id: settings?.thought_preset_id,
                  model: settings?.thought_model_id || activeModel,
                }).then((result) => {
                  if (result?.updates?.length > 0) {
                    showToast("后台推演完成，变量已更新", 'success');
                  }
                  api.variables.list(char.id).then(setGlobalVariables);
                }).catch(console.error);
                return 0;
              }
              return nextCount;
            });

            const updatedVars = globalVariables.map(v => varEngine.applyStageEffects(v));
            const changedVars = updatedVars.filter((v, i) => v.value !== globalVariables[i].value && v.id != null);
            if (changedVars.length > 0) {
              setGlobalVariables(updatedVars);
              api.variables.bulkUpdate(changedVars.map(v => ({ id: v.id!, value: v.value }))).catch(console.error);
            }

            api.snapshots.autoCreate({
              char_id: char.id,
              user_message: textOverride || "",
              ai_response: fullContent,
            }).catch(console.error);

          } catch (dbErr) { }
      } else {
          setMessages(prev => prev.filter(m => m.timestamp !== tempTs));
      }
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const handleGenImageAction = async () => {
    if (!settings) return;
    const imageBackend = (settings.image_backend || 'huggingface');
    const rawPrompt = genPrompt || (viewMode === 'group' ? (roomMessages.length > 0 ? roomMessages[roomMessages.length - 1].content : "") : (messages.length > 0 ? messages[messages.length - 1].content : ""));
    if (!rawPrompt) return;

    setShowGenModal(false);
    setIsTyping(true);
    try {
      let finalPrompt = rawPrompt;

      if (useSdPromptConversion) {
        const sdPromptPreset = presets.find(p => p.id === settings.sd_prompt_preset_id) || presets.find(p => p.id === activePresetId);
        const sdPromptModel = settings.sd_prompt_model_id || activeModel;
        if (sdPromptPreset && sdPromptModel) {
            const llm = new LLMClient(sdPromptPreset.api_base, sdPromptPreset.api_key, getPresetMode(sdPromptPreset));
            const tags = await llm.generateImageTags(rawPrompt, sdPromptModel);
            finalPrompt = `1girl, (photorealistic:1.3), best quality, ultra high res, soft lighting, ${tags}`;
        }
      }

      let reqBody: any = {
        char_id: viewMode === 'char' ? selectedCharId : undefined,
        room_id: viewMode === 'group' ? selectedRoomId : undefined,
      };
      
      if (imageBackend === 'huggingface') {
        if (!settings.hf_keys) throw new Error("请在系统设置中配置 ComfyUI 内网穿透 URL");
        reqBody = {
          ...reqBody,
          backend: 'huggingface',
          model: 'comfyui-local',
          apiKey: settings.hf_keys,
          payload: { prompt: finalPrompt }
        };
      } else if (imageBackend === 'modelscope') {
        if (!settings.modelscope_api_key) throw new Error("请在系统设置中配置魔搭社区 API Key");
        reqBody = {
          ...reqBody,
          backend: 'modelscope',
          model: settings.modelscope_model || 'Tongyi-MAI/Z-Image-Turbo',
          apiKey: settings.modelscope_api_key,
          payload: { prompt: finalPrompt, size: '1024x1024', n: 1 }
        };
      } else {
        const imagePreset = presets.find(p => p.id === settings.image_preset_id) || presets.find(p => p.id === activePresetId);
        const imageModel = settings.image_model_id || activeModel;
        if (!imagePreset || !imageModel) throw new Error("请配置 OpenAI 生图预设和模型");
        reqBody = {
          ...reqBody,
          backend: 'openai',
          apiBase: imagePreset.api_base,
          apiKey: imagePreset.api_key,
          model: imageModel,
          payload: { prompt: finalPrompt, size: '1024x1024', n: 1, response_format: 'b64_json' }
        };
      }

      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });
      if (!res.ok) {
         const errData = await res.json().catch(()=>({error: "生图失败"}));
         throw new Error(errData.error || "后端未响应");
      }
      
      const data = await res.json();
      const imgSrc = (Array.isArray(data?.images) && data.images[0] ? `data:image/png;base64,${data.images[0]}` : '') || (Array.isArray(data?.urls) && data.urls[0] ? data.urls[0] : '');
      if (!imgSrc) throw new Error("后端未返回图片");

      const timestamp = Date.now();
      const imageMsg: Message = { role: 'assistant', content: '', image: imgSrc, timestamp, char_id: selectedCharId };
      setMessages(prev => [...prev, imageMsg]);
      
      try {
        const saveRes = await api.messages.add(imageMsg);
        setMessages(prev => prev.map(m => m.timestamp === timestamp ? { ...m, id: saveRes.id } : m));
      } catch (saveErr) {
        console.error("保存图片消息失败:", saveErr);
      }
    } catch (e: any) { alert("生图失败: " + e.message); } finally { setIsTyping(false); }
  };

  const handleSend = async () => {
    if (!input.trim() || !settings || isTyping) return;
    const text = input; setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';

    if (viewMode === 'group') {
      await sendRoomChat(text, null); 
      return;
    }

    const timestamp = Date.now();
    const userMsg: Message = { role: 'user', content: text, timestamp, char_id: selectedCharId };

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
                <button className="hover:text-info p-1" title="创建副本" onClick={async (e) => { e.stopPropagation(); const newName = prompt("新角色名称:", `${c.name} (Copy)`); if(newName) { await api.characters.duplicate(c.id!, newName); loadData(); } }}><Copy size={14}/></button>
                <button className="hover:text-error p-1" title="删除" onClick={(e) => { e.stopPropagation(); if(confirm(`删除角色 ${c.name}？`)) api.characters.delete(c.id!).then(() => loadData()); }}><Trash2 size={14} /></button>
            </div>
          </div>
        )) : viewMode === 'group' ? rooms.map(r => (
          <div key={r.id} onClick={() => { setSelectedRoomId(r.id); setMobileMenuOpen(false); }} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group ${selectedRoomId === r.id ? 'bg-secondary text-secondary-content shadow-lg' : 'hover:bg-base-300'}`}>
            <div className="flex items-center gap-2 min-w-0"><span className="font-bold truncate">{r.name}</span></div>
            <Trash2 size={14} className="opacity-0 group-hover:opacity-100 hover:text-error transition-opacity" onClick={(e) => { e.stopPropagation(); if(confirm(`删除房间 ${r.name}？`)) api.rooms.delete(r.id!).then(() => loadData()); }} />
          </div>
        )) : (
          <div className="p-3 rounded-xl border border-base-300 bg-base-100/40 text-xs leading-relaxed">
            <div className="font-black mb-2 flex items-center gap-2"><ImageIcon size={16}/> 生图工作台</div>
            <div>支持 本地 ComfyUI 异步穿透生图 与 OpenAI 兼容端点生图。</div>
          </div>
        )}
        {(viewMode === 'char' || viewMode === 'group') && (
          <button className="btn btn-outline btn-sm btn-block mt-4 border-dashed" onClick={async () => { const n = prompt("名称?"); if (!n) return; if (viewMode === 'char') await api.characters.add({ name: n, description: "", first_message: "你好", summary: "" }); else await api.rooms.add({ name: n, description: "" }); await loadData(); }}><Plus size={16} /> 新建</button>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-base-content/10"><button className="btn btn-ghost btn-sm btn-block justify-start" onClick={() => {setShowSettings(true); setMobileMenuOpen(false);}}><SettingsIcon size={16} /> 系统设置</button></div>
    </div>
  );

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-base-100"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

  return (
    <>
    <div className="drawer md:drawer-open fixed inset-0 w-full bg-base-100 overflow-hidden text-base-content">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" checked={mobileMenuOpen} onChange={e=>setMobileMenuOpen(e.target.checked)} />
      <div className="drawer-content flex flex-col h-full overflow-hidden relative">
        
        <div className="bg-base-100 border-b border-base-300 safe-pt z-20 shrink-0">
          <div className="navbar min-h-[3rem] px-2 md:px-4">
            <div className="flex-none md:hidden">
              <button className="btn btn-square btn-sm btn-ghost" onClick={()=>setMobileMenuOpen(true)}><Menu size={20}/></button>
            </div>
            <div className="flex-1 font-bold text-base md:text-lg truncate px-2">
              {viewMode === 'image' ? '生图工作台' : (viewMode === 'char' ? characters.find(c=>c.id===selectedCharId)?.name : rooms.find(r=>r.id===selectedRoomId)?.name) || "SimpleRP"}
            </div>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-3 pb-2 w-full">
            <select className="select select-bordered select-xs md:select-sm shrink-0" value={activePresetId || ""} onChange={(e) => handlePresetChange(e.target.value)}>
                <option value="" disabled>选择源...</option>
                {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="join shrink-0">
                <select className="select select-bordered select-xs md:select-sm join-item max-w-[8rem] md:max-w-[10rem]" value={activeModel} onChange={(e) => handleModelChange(e.target.value)} disabled={!activePresetId}>
                    {manualModels.length === 0 && availableModels.length === 0 && <option value="">无可用模型</option>}
                    {manualModels.length > 0 && <optgroup label="手动配置">{manualModels.map(m => <option key={`man-${m}`} value={m}>{m}</option>)}</optgroup>}
                    {availableModels.length > 0 && <optgroup label="自动获取">{availableModels.map(m => <option key={`auto-${m}`} value={m}>{m}</option>)}</optgroup>}
                </select>
                <button className={`btn btn-xs md:btn-sm join-item btn-ghost ${isFetchingModels ? 'loading' : ''}`} title="刷新模型" onClick={() => { const p = presets.find(pre => pre.id === activePresetId); if(p) refreshModels(p.api_base, p.api_key, activeModel, undefined, getPresetMode(p)); }} disabled={!activePresetId}><RefreshCw size={14}/></button>
            </div>

            <div className="flex shrink-0 gap-1 ml-auto border-l border-base-300 pl-2">
              {viewMode !== 'image' && (
                <button className="btn btn-xs md:btn-sm btn-ghost text-error" title="清空对话" onClick={() => { if (!confirm("确定清空会话？")) return; if (viewMode === 'group' && selectedRoomId) { api.roomMessages.clear(selectedRoomId).then(() => { setRoomMessages([]); alert("已清空"); }); } else { api.messages.clear(viewMode==='char'?selectedCharId:undefined).then(()=>{setMessages([]); alert("已清空");}); } }}><Eraser size={16}/></button>
              )}
              {(viewMode === 'char' || viewMode === 'group') && (selectedCharId || selectedRoomId) && (
                <button className="btn btn-xs md:btn-sm btn-ghost text-info" title="总结剧情进展" onClick={async ()=>{ 
                    if (!activePresetId || !activeModel) return alert("请先选择模型");
                    try {
                        setIsTyping(true);
                        const currentPreset = presets.find(p => p.id === activePresetId)!;
                        const summaryPreset = presets.find(p => p.id === settings?.summary_preset_id) || currentPreset;
                        const summaryModel = settings?.summary_model_id || activeModel;
                        const llm = new LLMClient(summaryPreset.api_base, summaryPreset.api_key, getPresetMode(summaryPreset));
                        
                        const sourceMessages = viewMode === 'group' ? roomMessages : messages;
                        const fragment = await llm.summarizeRecent(sourceMessages as any, summaryModel);
                        if(!fragment) return alert("没有检测到新剧情。");
                        
                        const date = new Date().toLocaleString('zh-CN', {month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'});
                        if (viewMode === 'char' && selectedCharId) {
                           const char = characters.find(c => c.id === selectedCharId);
                           const updatedSummary = (char?.summary ? char.summary + "\n\n" : "") + `#### [剧情更新 ${date}]\n${fragment}`;
                           await api.characters.update(selectedCharId, { summary: updatedSummary });
                        } else if (viewMode === 'group' && selectedRoomId) {
                           const room = rooms.find(r => r.id === selectedRoomId);
                           const updatedSummary = (room?.summary ? room.summary + "\n\n" : "") + `#### [群聊更新 ${date}]\n${fragment}`;
                           await api.rooms.update(selectedRoomId, { summary: updatedSummary });
                        }
                        await loadData(); alert("新进展已追加。");
                    } catch (e: any) { alert(e.message); } finally { setIsTyping(false); }
                }}><BookOpen size={16}/></button>
              )}
              {viewMode === 'char' && selectedCharId && (
                <><button className="btn btn-xs md:btn-sm btn-ghost text-warning" title="世界书" onClick={()=>setShowLorebook(true)}><Book size={16}/></button><button className="btn btn-xs md:btn-sm btn-primary" onClick={()=>setShowCharEdit(true)}><Pencil size={16}/></button></>
              )}
              {viewMode === 'group' && selectedRoomId && (
                <button className="btn btn-xs md:btn-sm btn-secondary" title="房间设置" onClick={()=>setShowGroupEdit(true)}><Users size={16}/></button>
              )}
            </div>
          </div>
        </div>

        {viewMode === 'image' && (
          <ImageStudio settings={settings} presets={presets} activePresetId={activePresetId} activeModel={activeModel} manualModels={manualModels} getPresetMode={getPresetMode} fetchPresetModels={fetchPresetModels} presetModelsMap={presetModelsMap} presetModelsLoading={presetModelsLoading} />
        )}
        {viewMode === 'char' && !selectedCharId && (
          <div className="flex-1 flex items-center justify-center opacity-60">
            <div className="text-center">
              <Pencil size={48} className="mx-auto mb-4 opacity-30" />
              <p>请在左侧选择一个角色开始对话</p>
            </div>
          </div>
        )}
        {viewMode === 'group' && !selectedRoomId && (
          <div className="flex-1 flex items-center justify-center opacity-60">
            <div className="text-center">
              <Users size={48} className="mx-auto mb-4 opacity-30" />
              <p>请在左侧选择一个房间开始群聊</p>
            </div>
          </div>
        )}
        {(selectedCharId && viewMode === 'char') || (selectedRoomId && viewMode === 'group') ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              {(viewMode === 'group' ? (roomMessages as any) : (messages as any)).map((m: any, idx: number) => {
                const isUser = m.role === 'user' || m.sender_type === 'user';
                const headerName = isUser ? (settings?.user_name || '我') : (characterNameById.get(m.char_id) || 'AI');
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
                      {!m.id && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                          <button className="btn btn-circle btn-xs btn-primary shadow-lg" title="保存" onClick={async () => { 
                            try { 
                              const res = await api.messages.add(m); 
                              setMessages(prev => prev.map(msg => msg.timestamp === m.timestamp ? { ...msg, id: res.id } : msg)); 
                              alert("已保存"); 
                            } catch (err) { 
                              alert("保存失败"); 
                            } 
                          }}>
                            <Save size={12}/>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`chat-bubble shadow-lg border ${isUser ? 'chat-bubble-primary border-primary' : 'bg-base-200 text-base-content border-base-300'}`}>
                      {viewMode === 'char' && editingMsgId === m.id ? (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <textarea className="textarea textarea-bordered textarea-sm w-full bg-base-100" value={editContent} onChange={e=>setEditContent(e.target.value)}/>
                          <div className="flex justify-end gap-1">
                            <button className="btn btn-xs" onClick={()=>setEditingMsgId(null)}>取消</button>
                            <button className="btn btn-xs btn-primary" onClick={async ()=>{
                              await api.messages.update(m.id!, editContent); 
                              setMessages(prev => prev.map(msg=>msg.id===m.id?{...msg, content:editContent}:msg)); 
                              setEditingMsgId(null);
                            }}>保存</button>
                          </div>
                        </div>
                      ) : (
                        <div className="prose prose-sm break-words">
                          <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                            {replaceBuiltInVariables(
                              m.content, 
                              settings || {}, 
                              viewMode === 'char' ? characters.find(c => c.id === selectedCharId) : undefined
                            )}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
              })}
              {isTyping && <div className="chat chat-start opacity-50 animate-pulse"><div className="chat-bubble">思考中...</div></div>}
              <div ref={bottomRef} className="h-20" />
            </div>

            <div className="p-2 md:p-4 bg-base-100 border-t border-base-300 safe-pb shrink-0">
              <div className="max-w-4xl mx-auto flex flex-col gap-2">
                {viewMode === 'group' && selectedRoomId && (
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <button onClick={() => sendRoomChat(input || '', null)} disabled={isTyping || !input.trim()} className="btn btn-sm btn-outline whitespace-nowrap rounded-full">发送 (玩家发言)</button>
                    {characters.filter(c => groupMemberIds.includes(c.id!)).map(m => (
                      <button key={m.id} onClick={() => sendRoomChat(input || '', m.id!)} disabled={isTyping} className="btn btn-sm btn-secondary whitespace-nowrap rounded-full">@{m.name} 回应</button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-end bg-base-200 p-1.5 md:p-2 rounded-2xl shadow-inner border border-base-300">
                  <button className="btn btn-circle btn-ghost btn-sm text-accent shrink-0 mb-1" onClick={()=>{setGenPrompt(""); setShowGenModal(true)}}><ImageIcon size={22}/></button>
                  <textarea 
                    ref={inputRef} 
                    className="textarea textarea-ghost flex-1 min-h-[2.5rem] max-h-32 md:max-h-48 resize-none py-2 px-1 focus:outline-none text-base leading-relaxed" 
                    rows={1} 
                    value={input} 
                    onChange={e=>{setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=e.target.scrollHeight+'px'}} 
                    placeholder={viewMode === 'group' ? "输入并点击上面的 @..." : "输入消息..."} 
                    onKeyDown={e=>{if(e.key==='Enter' && !e.shiftKey){e.preventDefault(); if(viewMode === 'char') handleSend();}}} 
                  />
                  {isTyping ? (
                    <button className="btn btn-circle btn-error btn-sm shadow-lg shrink-0 mb-1" onClick={stopGeneration}><Square size={18} fill="currentColor"/></button>
                  ) : (
                    viewMode === 'char' && <button className="btn btn-circle btn-primary btn-sm shadow-lg shrink-0 mb-1" onClick={handleSend} disabled={!input.trim()}><Send size={18}/></button>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
      
      <div className="drawer-side z-50"><label htmlFor="my-drawer" className="drawer-overlay"></label><Sidebar /></div>

      {showSettings && settings && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b bg-base-200 font-bold flex justify-between items-center">系统配置<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowSettings(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                      <section>
                          <h4 className="text-sm font-black mb-3 text-primary uppercase">基础与沉浸</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control"><label className="label text-xs font-bold">玩家姓名</label><input className="input input-bordered" placeholder="如：朕" value={settings.user_name || ''} onChange={e=>setSettings({...settings, user_name:e.target.value})} /></div>
                            <div className="form-control">
                              <label className="label text-xs font-bold">默认生图后端</label>
                              <select className="select select-bordered" value={settings.image_backend || 'huggingface'} onChange={e=>setSettings({...settings, image_backend: e.target.value as any})}>
                                <option value="huggingface">ComfyUI 本地穿透 (利用 HF 通道)</option>
                                <option value="openai">OpenAI 兼容端点</option>
                                <option value="modelscope">魔搭社区 ModelScope</option>
                              </select>
                            </div>
                          </div>
                      </section>
                      <section>
                          <h4 className="text-sm font-black mb-3 text-primary uppercase">生图核心配置</h4>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="p-4 border border-base-300 rounded-xl bg-base-100">
                              <div className="text-xs font-black mb-3 text-accent">ComfyUI 本地穿透参数</div>
                              <div className="grid grid-cols-1 gap-4">
                                <div className="form-control">
                                  <label className="label text-xs font-bold">Cloudflare Tunnel URL</label>
                                  <textarea className="textarea textarea-bordered h-12 text-xs font-mono" placeholder="如：https://xxx.trycloudflare.com (替代原来的 HF Key 填入)" value={settings.hf_keys || ''} onChange={e=>setSettings({...settings, hf_keys:e.target.value})} />
                                </div>
                              </div>
                            </div>
                            <div className="p-4 border border-base-300 rounded-xl">
                              <div className="text-xs font-black mb-3">OpenAI 生图参数（备用）</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                  <label className="label text-xs font-bold">预设</label>
                                  <select className="select select-bordered select-sm" value={settings.image_preset_id ? String(settings.image_preset_id) : ''} onChange={(e) => { const v = e.target.value; if (!v) { setSettings({ ...settings, image_preset_id: undefined, image_model_id: '' }); return; } const pid = parseInt(v, 10); setSettings({ ...settings, image_preset_id: pid }); fetchPresetModels(pid); }}>
                                    <option value="">跟随顶部预设</option>
                                    {presets.map(p => <option key={`img-preset-${p.id}`} value={String(p.id)}>{p.name}</option>)}
                                  </select>
                                </div>
                                <div className="form-control">
                                  <label className="label text-xs font-bold">模型</label>
                                  <div className="join">
                                    <select className="select select-bordered select-sm join-item w-full" disabled={!settings.image_preset_id} value={settings.image_model_id || ''} onChange={(e) => setSettings({ ...settings, image_model_id: e.target.value })}>
                                      <option value="">跟随顶部模型</option>
                                      {settings.image_preset_id && (presetModelsMap[settings.image_preset_id] || []).map(m => <option key={`img-model-${m}`} value={m}>{m}</option>)}
                                      {settings.image_preset_id && (presetModelsMap[settings.image_preset_id]?.length || 0) === 0 && manualModels.map(m => <option key={`img-manual-${m}`} value={m}>{m}</option>)}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="p-4 border border-base-300 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10">
                              <div className="text-xs font-black mb-3 text-orange-500">魔搭社区 ModelScope 生图参数</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                  <label className="label text-xs font-bold">API Key</label>
                                  <input type="password" className="input input-bordered input-sm" placeholder="输入魔搭社区 API Key" value={settings.modelscope_api_key || ''} onChange={e=>setSettings({...settings, modelscope_api_key: e.target.value})} />
                                </div>
                                <div className="form-control">
                                  <label className="label text-xs font-bold">模型 ID</label>
                                  <input className="input input-bordered input-sm" placeholder="默认: Tongyi-MAI/Z-Image-Turbo" value={settings.modelscope_model || ''} onChange={e=>setSettings({...settings, modelscope_model: e.target.value})} />
                                </div>
                              </div>
                              <div className="text-[10px] opacity-60 mt-2">默认模型: Tongyi-MAI/Z-Image-Turbo (通义万相极速版)</div>
                            </div>
                          </div>
                      </section>
                      <section>
                          <h4 className="text-sm font-black mb-3 text-primary uppercase">其他辅助模型绑定</h4>
                          <div className="grid grid-cols-1 gap-4">
                            <div className="p-4 border border-base-300 rounded-xl">
                              <div className="text-xs font-black mb-3">记忆总结模型</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                  <label className="label text-xs font-bold">预设</label>
                                  <select className="select select-bordered select-sm" value={settings.summary_preset_id ? String(settings.summary_preset_id) : ''} onChange={(e) => { const v = e.target.value; if (!v) { setSettings({ ...settings, summary_preset_id: undefined, summary_model_id: '' }); return; } const pid = parseInt(v, 10); setSettings({ ...settings, summary_preset_id: pid }); fetchPresetModels(pid); }}>
                                    <option value="">跟随顶部预设</option>
                                    {presets.map(p => <option key={`sum-preset-${p.id}`} value={String(p.id)}>{p.name}</option>)}
                                  </select>
                                </div>
                                <div className="form-control">
                                  <label className="label text-xs font-bold">模型</label>
                                  <div className="join">
                                    <select className="select select-bordered select-sm join-item w-full" disabled={!settings.summary_preset_id} value={settings.summary_model_id || ''} onChange={(e) => setSettings({ ...settings, summary_model_id: e.target.value })}>
                                      <option value="">跟随顶部模型</option>
                                      {settings.summary_preset_id && (presetModelsMap[settings.summary_preset_id] || []).map(m => <option key={`sum-model-${m}`} value={m}>{m}</option>)}
                                      {settings.summary_preset_id && (presetModelsMap[settings.summary_preset_id]?.length || 0) === 0 && manualModels.map(m => <option key={`sum-manual-${m}`} value={m}>{m}</option>)}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="p-4 border border-base-300 rounded-xl">
                              <div className="text-xs font-black mb-3">SD 转换模型（生图描述翻译与丰富）</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                  <label className="label text-xs font-bold">预设</label>
                                  <select className="select select-bordered select-sm" value={settings.sd_prompt_preset_id ? String(settings.sd_prompt_preset_id) : ''} onChange={(e) => { const v = e.target.value; if (!v) { setSettings({ ...settings, sd_prompt_preset_id: undefined, sd_prompt_model_id: '' }); return; } const pid = parseInt(v, 10); setSettings({ ...settings, sd_prompt_preset_id: pid }); fetchPresetModels(pid); }}>
                                    <option value="">跟随顶部预设</option>
                                    {presets.map(p => <option key={`sd-preset-${p.id}`} value={String(p.id)}>{p.name}</option>)}
                                  </select>
                                </div>
                                <div className="form-control">
                                  <label className="label text-xs font-bold">模型</label>
                                  <div className="join">
                                    <select className="select select-bordered select-sm join-item w-full" disabled={!settings.sd_prompt_preset_id} value={settings.sd_prompt_model_id || ''} onChange={(e) => setSettings({ ...settings, sd_prompt_model_id: e.target.value })}>
                                      <option value="">跟随顶部模型</option>
                                      {settings.sd_prompt_preset_id && (presetModelsMap[settings.sd_prompt_preset_id] || []).map(m => <option key={`sd-model-${m}`} value={m}>{m}</option>)}
                                      {settings.sd_prompt_preset_id && (presetModelsMap[settings.sd_prompt_preset_id]?.length || 0) === 0 && manualModels.map(m => <option key={`sd-manual-${m}`} value={m}>{m}</option>)}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                      </section>
                      <section>
                          <h4 className="text-sm font-black mb-3 text-primary uppercase">后台变量推演模型</h4>
                          <div className="p-4 border border-base-300 rounded-xl space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" className="toggle toggle-primary toggle-sm"
                                checked={settings.is_thought_auto_update ?? false}
                                onChange={e => setSettings({ ...settings, is_thought_auto_update: e.target.checked })} />
                              <span className="text-sm font-bold">启用自动推演</span>
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="form-control">
                                <label className="label text-xs font-bold">推演间隔（轮）</label>
                                <input type="number" min={1} className="input input-bordered input-sm"
                                  value={settings.thought_interval ?? 5}
                                  onChange={e => setSettings({ ...settings, thought_interval: Number(e.target.value) })} />
                              </div>
                              <div className="form-control">
                                <label className="label text-xs font-bold">预设</label>
                                <select className="select select-bordered select-sm"
                                  value={settings.thought_preset_id ? String(settings.thought_preset_id) : ''}
                                  onChange={e => { 
                                    const v = e.target.value; 
                                    if (!v) {
                                      setSettings({ ...settings, thought_preset_id: undefined, thought_model_id: '' });
                                      return;
                                    }
                                    const pid = parseInt(v, 10);
                                    setSettings({ ...settings, thought_preset_id: pid }); 
                                    fetchPresetModels(pid); // 【加入核心联动】选择预设时，自动在后台拉取对应的模型资产列表
                                  }}>
                                  <option value="">跟随顶部预设</option>
                                  {presets.map(p => <option key={`thought-preset-${p.id}`} value={String(p.id)}>{p.name}</option>)}
                                </select>
                              </div>
                              
                              {/* 【核心优化】将原本死板的 input 文本框升级为智能联动下拉列表 */}
                              <div className="form-control md:col-span-2">
                                <label className="label text-xs font-bold">模型</label>
                                <select 
                                  className="select select-bordered select-sm w-full" 
                                  value={settings.thought_model_id || ''} 
                                  onChange={(e) => setSettings({ ...settings, thought_model_id: e.target.value })}
                                >
                                  <option value="">留空跟随顶部模型</option>
                                  {/* 1. 如果该预设成功通过 API 自动获取到了模型列表，优先进行极速渲染 */}
                                  {settings.thought_preset_id && (presetModelsMap[settings.thought_preset_id] || []).map(m => (
                                    <option key={`thought-model-${m}`} value={m}>{m}</option>
                                  ))}
                                  {/* 2. 备用安全降级：如果 API 获取为空或受限，则优雅读取备用手动模型列表进行渲染 */}
                                  {settings.thought_preset_id && (presetModelsMap[settings.thought_preset_id]?.length || 0) === 0 && manualModels.map(m => (
                                    <option key={`thought-manual-${m}`} value={m}>{m}</option>
                                  ))}
            </select>
          </div>
        </div>
      </div>
                      </section>
                      <section>
                          <h4 className="text-sm font-black mb-3 text-primary uppercase">自动化快照控制策略</h4>
                          <div className="p-4 border border-base-300 rounded-xl bg-base-200/50 space-y-4">
                    
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="form-control">
                                <label className="label text-xs font-bold">自动快照触发周期（每X轮对话）</label>
                                <input 
                                  type="number" 
                                  min={1} 
                                  className="input input-bordered input-sm font-semibold"
                                  value={settings.snapshot_trigger_interval ?? 5}
                                  onChange={e => setSettings({ ...settings, snapshot_trigger_interval: Number(e.target.value) })} 
                                />
                              </div>
                              <div className="form-control">
                                <label className="label text-xs font-bold">单会话最大快照留存总数（个）</label>
                                <input 
                                  type="number" 
                                  min={1} 
                                  className="input input-bordered input-sm font-semibold"
                                  value={settings.snapshot_max_keep_count ?? 20}
                                  onChange={e => setSettings({ ...settings, snapshot_max_keep_count: Number(e.target.value) })} 
                                />
                              </div>
                            </div>
                          </div>
                      </section>
                      <section>
                          <div className="flex justify-between items-end mb-3">
                              <h4 className="text-sm font-black text-primary uppercase">API 预设库</h4>
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
                          <div className="form-control">
                                <label className="label font-bold text-xs">备用模型列表 (手动输入，逗号分隔)</label>
                                <textarea className="textarea textarea-bordered w-full text-xs h-20" placeholder="当 API 不支持自动获取模型列表时使用" value={settings.model_list || ""} onChange={e=>setSettings({...settings, model_list:e.target.value})} />
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

      {showCharEdit && selectedCharId && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b flex justify-between bg-base-200 font-bold items-center">
                    <div className="flex items-center gap-2">
                      <span>角色档案</span>
                      <button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowCharEdit(false)}><X/></button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <div className="tabs tabs-boxed">
                      <button className={`tab ${charEditTab === 'basic' ? 'tab-active' : ''}`} onClick={() => setCharEditTab('basic')}>基础设定</button>
                      <button className={`tab ${charEditTab === 'variables' ? 'tab-active' : ''}`} onClick={() => setCharEditTab('variables')}>变量管理</button>
                      <button className={`tab ${charEditTab === 'snapshots' ? 'tab-active' : ''}`} onClick={() => setCharEditTab('snapshots')}>历史快照</button>
                    </div>
                    <div className="p-6">
                      {charEditTab === 'basic' && (
                        <div className="space-y-6">
                          <div className="form-control"><label className="label font-bold text-xs">角色姓名</label><input className="input input-bordered" value={characters.find(c=>c.id===selectedCharId)?.name} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, name:e.target.value}:c))} /></div>
                          <div className="form-control"><label className="label font-bold text-xs">人设/世界观描述</label><textarea className="textarea textarea-bordered h-48 font-mono text-sm" value={characters.find(c=>c.id===selectedCharId)?.description} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, description:e.target.value}:c))} /></div>
                          <div className="form-control"><label className="label font-bold text-xs text-primary">个人长期记忆 (Summary)</label><textarea className="textarea textarea-bordered h-32 font-mono text-xs" value={characters.find(c=>c.id===selectedCharId)?.summary} onChange={e=>setCharacters(characters.map(c=>c.id===selectedCharId?{...c, summary:e.target.value}:c))} /></div>
                        </div>
                      )}
                      {charEditTab === 'variables' && (
                        <VariableManager
                          charId={selectedCharId}
                          onVariablesChange={(vars) => { setCharVariables(vars); setGlobalVariables(vars); }}
                        />
                      )}
                      {charEditTab === 'snapshots' && (
                        <SnapshotManager
                          charId={selectedCharId}
                          latestMessages={messages}
                          onSnapshotRestore={async (_snap) => {
                            await loadCharData();
                            setMessages([]);
                            const msgs = await api.messages.list(selectedCharId!);
                            setMessages(msgs);
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="p-4 border-t bg-base-200 flex justify-end"><button className="btn btn-primary" onClick={async ()=>{await api.characters.update(selectedCharId, characters.find(c=>c.id===selectedCharId)!); setShowCharEdit(false); loadData();}}>确认保存</button></div>
              </div>
          </div>
      )}

      {showGroupEdit && selectedRoomId && (() => {
        const room = rooms.find(r => r.id === selectedRoomId);
        if (!room) return null;
        return (
          <div className="modal modal-open text-base-content">
            <div className="modal-box max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden">
              <div className="p-6 border-b flex justify-between bg-base-200 font-bold items-center">
                <h3>房间配置</h3>
                <button className="btn btn-sm btn-circle btn-ghost" onClick={() => setShowGroupEdit(false)}><X /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <section className="grid grid-cols-1 gap-4">
                  <div className="form-control">
                    <label className="label font-bold">房间名</label>
                    <input className="input input-bordered" value={room.name || ''} onChange={e => setRooms(rooms.map(r => r.id === selectedRoomId ? { ...r, name: e.target.value } : r))} />
                  </div>
                  <div className="form-control">
                    <label className="label font-bold text-xs text-primary">场景设定</label>
                    <textarea className="textarea textarea-bordered h-32" value={room.description || ''} onChange={e => setRooms(rooms.map(r => r.id === selectedRoomId ? { ...r, description: e.target.value } : r))} placeholder="例如：这是御前会议，气氛严肃..." />
                  </div>
                  <div className="form-control">
                    <label className="label font-bold text-xs text-info">全局剧情记忆 (Summary)</label>
                    <textarea className="textarea textarea-bordered h-40 font-mono text-xs" value={room.summary || ''} onChange={e => setRooms(rooms.map(r => r.id === selectedRoomId ? { ...r, summary: e.target.value } : r))} placeholder="点击顶部界面的【书本】图标可以自动总结对话并追加到这里..." />
                  </div>
                </section>
                <section className="p-4 rounded-xl border border-base-300 space-y-3">
                  <div className="font-black text-sm">选择房间成员</div>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1 grid grid-cols-2 gap-2">
                    {characters.map(c => {
                      const active = !!roomMembersDraft.find(m => m.char_id === c.id);
                      return (
                        <div key={c.id} className={`p-3 rounded-xl border ${active ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-100'} flex items-center gap-3`}>
                          <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={active} onChange={e => {
                              if (!c.id) return;
                              if (e.target.checked) setRoomMembersDraft(prev => [...prev, { char_id: c.id! }]);
                              else setRoomMembersDraft(prev => prev.filter(m => m.char_id !== c.id));
                            }} />
                          <div className="font-bold truncate text-sm">{c.name}</div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
              <div className="p-6 border-t bg-base-200 flex justify-end gap-3">
                <button className="btn" onClick={() => setShowGroupEdit(false)}>取消</button>
                <button className="btn btn-primary" onClick={saveRoomConfigs}>保存房间</button>
              </div>
            </div>
          </div>
        );
      })()}

      {showLorebook && selectedCharId && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-2xl h-[75vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-4 border-b bg-base-200 font-bold flex justify-between items-center">世界书 (Worldbook)<button className="btn btn-sm btn-circle btn-ghost" onClick={()=>{ setShowLorebook(false); loadLorebookEntries(); }}><X/></button></div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <LorebookManager charId={selectedCharId} />
                  </div>
              </div>
          </div>
      )}

      {showGenModal && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-primary"><Sparkles/> 极速生图</h3>
                <textarea className="textarea textarea-bordered w-full h-32 text-base" value={genPrompt} onChange={e=>setGenPrompt(e.target.value)} placeholder="描述你想生成的画面细节，支持自然语言..." />
                <div className="mt-3 flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 font-bold cursor-pointer">
                    <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={useSdPromptConversion} onChange={(e)=>setUseSdPromptConversion(e.target.checked)} />
                    自动扩写词条
                  </label>
                  <span className="opacity-70">后端: <b>{settings?.image_backend === 'openai' ? 'OpenAI' : settings?.image_backend === 'modelscope' ? '魔搭社区' : 'ComfyUI 本地穿透'}</b></span>
                </div>
                <div className="modal-action flex gap-2">
                    <button className="btn btn-primary flex-1 shadow-lg" onClick={handleGenImageAction}>开始生成</button>
                    <button className="btn flex-1" onClick={()=>setShowGenModal(false)}>取消</button>
                </div>
              </div>
          </div>
      )}
    </div>

    {toastMsg && (
      <div className="toast toast-bottom toast-start z-50">
        <div className={`alert ${toastMsg.type === 'success' ? 'alert-success' : 'alert-info'} shadow-lg`}>
          <span className="text-sm">{toastMsg.text}</span>
        </div>
      </div>
    )}
    </>
  );
}

export default App;