import { useState, useEffect, useRef, useMemo } from 'react';
import { api, type Message, type Character, type Settings, type Group, type LorebookEntry, type ApiPreset, type ApiMode } from './lib/db';
import { LLMClient } from './lib/llm';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { 
  Send, Image as ImageIcon, Settings as SettingsIcon, Menu, Pencil, Plus, Trash2, X, 
  BookOpen, Book, Users, RefreshCw, Square, Save, Eraser, Sparkles, Copy 
} from 'lucide-react';

function App() {
  // --- 核心状态 ---
  const [viewMode, setViewMode] = useState<'char' | 'group' | 'image'>('char');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
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

  // --- 弹窗控制状态 ---
  const [showSettings, setShowSettings] = useState(false);
  const [showCharEdit, setShowCharEdit] = useState(false);
  const [showGroupEdit, setShowGroupEdit] = useState(false);
  const [showLorebook, setShowLorebook] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [useSdPromptConversion, setUseSdPromptConversion] = useState(true);

  // --- 生图工作台状态 ---
  const [studioMode, setStudioMode] = useState<'txt2img' | 'img2img'>('txt2img');
  const [studioPrompt, setStudioPrompt] = useState('');
  const [studioNegative, setStudioNegative] = useState("(worst quality:2), (low quality:2), (normal quality:2), lowres, watermark");
  const [studioUseConversion, setStudioUseConversion] = useState(true);
  const [studioImagePresetId, setStudioImagePresetId] = useState<string>(''); // empty => follow settings/top
  const [studioImageModelId, setStudioImageModelId] = useState<string>(''); // empty => follow settings/top
  const [studioOpenAiSize, setStudioOpenAiSize] = useState<string>('1024x1024');
  const [studioOpenAiN, setStudioOpenAiN] = useState<number>(1);
  const [studioOpenAiQuality, setStudioOpenAiQuality] = useState<string>('');
  const [studioOpenAiStyle, setStudioOpenAiStyle] = useState<string>('');
  const [studioOpenAiResponseFormat, setStudioOpenAiResponseFormat] = useState<string>('b64_json');
  const [studioOpenAiPath, setStudioOpenAiPath] = useState<string>(''); // optional override
  const [studioOpenAiMultipart, setStudioOpenAiMultipart] = useState<boolean>(true);
  const [studioExtraJson, setStudioExtraJson] = useState<string>('');

  const [studioSdWidth, setStudioSdWidth] = useState<number>(512);
  const [studioSdHeight, setStudioSdHeight] = useState<number>(768);
  const [studioSdSteps, setStudioSdSteps] = useState<number>(20);
  const [studioSdCfg, setStudioSdCfg] = useState<number>(7);
  const [studioSdSampler, setStudioSdSampler] = useState<string>('Euler a');
  const [studioSdDenoise, setStudioSdDenoise] = useState<number>(0.6);
  const [studioInitImage, setStudioInitImage] = useState<string>(''); // dataURL

  const [studioResults, setStudioResults] = useState<string[]>([]);
  const [studioError, setStudioError] = useState<string>('');
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  // --- 计算属性：手动配置的模型列表 ---
  const manualModels = useMemo(() => {
    if (!settings?.model_list) return [];
    return settings.model_list.split(/[,，\n]/).map(m => m.trim()).filter(m => m);
  }, [settings?.model_list]);

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
        const [c, g, s, p] = await Promise.all([
            api.characters.list(), 
            api.groups.list(), 
            api.settings.get(), 
            api.presets.list()
        ]);
        setCharacters(c); setGroups(g); setSettings(s); setPresets(p);
        
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

  const parseExtraJson = (raw: string): Record<string, unknown> => {
    const trimmed = (raw || '').trim();
    if (!trimmed) return {};
    const obj = JSON.parse(trimmed);
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
    return obj as Record<string, unknown>;
  };

  const dataUrlToBase64 = (dataUrl: string): string => {
    const idx = dataUrl.indexOf(',');
    if (idx >= 0) return dataUrl.slice(idx + 1);
    return dataUrl;
  };

  const resolvePresetById = (id?: number) => presets.find(p => p.id === id);

  const resolveImagePresetAndModel = () => {
    const currentPreset = presets.find(p => p.id === activePresetId);
    const chosenPreset =
      (studioImagePresetId ? resolvePresetById(parseInt(studioImagePresetId, 10)) : undefined) ||
      resolvePresetById(settings?.image_preset_id) ||
      currentPreset;

    const chosenModel =
      (studioImageModelId || '').trim() ||
      (settings?.image_model_id || '').trim() ||
      (activeModel || '').trim();

    return { preset: chosenPreset, model: chosenModel };
  };

  const resolveSdPromptPresetAndModel = () => {
    const currentPreset = presets.find(p => p.id === activePresetId);
    const chosenPreset = resolvePresetById(settings?.sd_prompt_preset_id) || currentPreset;
    const chosenModel = (settings?.sd_prompt_model_id || '').trim() || (activeModel || '').trim();
    return { preset: chosenPreset, model: chosenModel };
  };

  const runStudioGenerate = async () => {
    if (!settings) return;
    setStudioError('');

    const imageBackend = (settings.image_backend || 'sdwebui') as 'sdwebui' | 'openai';
    if (imageBackend === 'sdwebui' && !settings.sd_url) {
      setStudioError('请在系统设置中配置 SD URL');
      return;
    }
    if (!activePresetId || !activeModel) {
      setStudioError('请先在顶部选择 API 预设与模型');
      return;
    }

    const { preset: imagePreset, model: imageModel } = resolveImagePresetAndModel();
    if (imageBackend === 'openai' && (!imagePreset || !imageModel)) {
      setStudioError('请配置生图预设/模型（或在顶部选择）');
      return;
    }

    const raw = (studioPrompt || '').trim();
    if (!raw) {
      setStudioError('请输入提示词');
      return;
    }

    if (studioMode === 'img2img' && !studioInitImage) {
      setStudioError('请先上传一张初始图片');
      return;
    }

    let promptToUse = raw;
    if (studioUseConversion) {
      const { preset: sdPreset, model: sdModel } = resolveSdPromptPresetAndModel();
      if (!sdPreset || !sdModel) {
        setStudioError('请配置 SD 转换模型（或在顶部选择）');
        return;
      }
      const llm = new LLMClient(sdPreset.api_base, sdPreset.api_key, getPresetMode(sdPreset));
      const tags = await llm.generateImageTags(raw, sdModel);
      promptToUse = `1girl, (photorealistic:1.3), best quality, ultra high res, soft lighting, ${tags}`;
    }

    let extra: Record<string, unknown> = {};
    try {
      extra = parseExtraJson(studioExtraJson);
    } catch (e: any) {
      setStudioError(`高级参数 JSON 无效：${e.message || e}`);
      return;
    }

    setIsTyping(true);
    try {
      if (imageBackend === 'sdwebui') {
        const payload: any =
          studioMode === 'txt2img'
            ? {
                prompt: promptToUse,
                negative_prompt: studioNegative,
                steps: studioSdSteps,
                cfg_scale: studioSdCfg,
                sampler_name: studioSdSampler,
                width: studioSdWidth,
                height: studioSdHeight,
                restore_faces: false,
                enable_hr: false,
                ...extra,
              }
            : {
                prompt: promptToUse,
                negative_prompt: studioNegative,
                steps: studioSdSteps,
                cfg_scale: studioSdCfg,
                sampler_name: studioSdSampler,
                width: studioSdWidth,
                height: studioSdHeight,
                denoising_strength: studioSdDenoise,
                init_images: [dataUrlToBase64(studioInitImage)],
                ...extra,
              };

        const res = await fetch('/api/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: studioMode,
            sd_url: settings.sd_url,
            payload,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data: any = await res.json();
        const imgs = Array.isArray(data?.images) ? data.images : [];
        const out = imgs.map((b64: string) => `data:image/png;base64,${b64}`);
        setStudioResults(out);
        return;
      }

      const payload: any = {
        prompt: promptToUse,
        size: studioOpenAiSize || '1024x1024',
        n: studioOpenAiN || 1,
        response_format: studioOpenAiResponseFormat || 'b64_json',
        ...extra,
      };
      if (studioOpenAiQuality) payload.quality = studioOpenAiQuality;
      if (studioOpenAiStyle) payload.style = studioOpenAiStyle;
      if (studioMode === 'img2img') {
        payload.image = studioInitImage;
      }

      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backend: 'openai',
          action: studioMode,
          multipart: studioMode === 'img2img' ? studioOpenAiMultipart : undefined,
          apiBase: imagePreset!.api_base,
          apiKey: imagePreset!.api_key,
          model: imageModel,
          path: studioOpenAiPath || undefined,
          payload,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: any = await res.json();
      const out: string[] = [];
      if (Array.isArray(data?.images) && data.images[0]) {
        out.push(...data.images.map((b64: string) => `data:image/png;base64,${b64}`));
      }
      if (Array.isArray(data?.urls) && data.urls[0]) {
        out.push(...data.urls);
      }
      if (out.length === 0) throw new Error('后端未返回图片');
      setStudioResults(out);
    } catch (e: any) {
      setStudioError(e?.message || String(e));
    } finally {
      setIsTyping(false);
    }
  };

  // --- 切换角色/剧场时的监听 ---
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

  // --- 逻辑函数 ---
  const stopGeneration = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsTyping(false);
    }
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
        if (e.name !== 'AbortError') console.error("生成失败:", e);
    } finally {
      if (fullContent.trim().length > 0) {
          try {
            const res = await api.messages.add({ 
                role: 'assistant', content: fullContent, char_id: char.id, 
                group_id: viewMode === 'group' ? selectedGroupId : undefined, 
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

    const rawPrompt = genPrompt || (messages.length > 0 ? messages[messages.length - 1].content : "");
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
          group_id: selectedGroupId, char_id: selectedCharId 
      };
      setMessages(prev => [...prev, ephemeralMsg]);

    } catch (e: any) { alert("生图失败: " + e.message); } finally { setIsTyping(false); }
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
        )) : viewMode === 'group' ? groups.map(g => (
          <div key={g.id} onClick={() => { setSelectedGroupId(g.id); setMobileMenuOpen(false); }} className={`p-3 rounded-xl cursor-pointer flex justify-between items-center group ${selectedGroupId === g.id ? 'bg-secondary text-secondary-content shadow-lg' : 'hover:bg-base-300'}`}>
            <span className="font-bold truncate">{g.name}</span>
            <Trash2 size={14} className="opacity-0 group-hover:opacity-100 hover:text-error transition-opacity" onClick={(e) => { e.stopPropagation(); if(confirm(`删除剧场 ${g.name}？`)) api.groups.delete(g.id!).then(() => loadData()); }} />
          </div>
        )) : (
          <div className="p-3 rounded-xl border border-base-300 bg-base-100/40 text-xs leading-relaxed">
            <div className="font-black mb-2 flex items-center gap-2"><ImageIcon size={16}/> 生图工作台</div>
            <div>支持文生图、图生图；参数可通过“高级 JSON”适配不同 OpenAI 兼容 API 或 SD WebUI。</div>
          </div>
        )}
        {(viewMode === 'char' || viewMode === 'group') && (
          <button className="btn btn-outline btn-sm btn-block mt-4 border-dashed" onClick={async () => { const n = prompt("名称?"); if(n) { if(viewMode==='char') await api.characters.add({name:n, description:"", first_message:"你好", summary:""}); else await api.groups.add({name:n, description:""}); await loadData(); } }}><Plus size={16} /> 新建</button>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-base-content/10"><button className="btn btn-ghost btn-sm btn-block justify-start" onClick={() => {setShowSettings(true); setMobileMenuOpen(false);}}><SettingsIcon size={16} /> 系统设置</button></div>
    </div>
  );

  const ImageStudio = () => {
    const backend = (settings?.image_backend || 'sdwebui') as 'sdwebui' | 'openai';
    const { preset: resolvedPreset } = resolveImagePresetAndModel();
    const resolvedPresetId = resolvedPreset?.id;
    const resolvedPresetModels = resolvedPresetId ? (presetModelsMap[resolvedPresetId] || []) : [];
    const commonSizes = ['1024x1024', '1024x1792', '1792x1024', '1280x720', '720x1280'];

    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="text-lg font-black text-primary flex items-center gap-2"><ImageIcon size={18}/> 生图工作台</div>
              <div className="badge badge-outline">{backend === 'sdwebui' ? 'SD WebUI' : 'OpenAI 兼容'}</div>
            </div>
            <div className="join">
              <button className={`btn btn-sm join-item ${studioMode === 'txt2img' ? 'btn-primary' : ''}`} onClick={() => setStudioMode('txt2img')}>文生图</button>
              <button className={`btn btn-sm join-item ${studioMode === 'img2img' ? 'btn-primary' : ''}`} onClick={() => setStudioMode('img2img')}>图生图</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card bg-base-200 border border-base-300 shadow-sm">
              <div className="card-body space-y-3">
                <div className="text-sm font-black">输入</div>
                <textarea className="textarea textarea-bordered w-full h-32" value={studioPrompt} onChange={e => setStudioPrompt(e.target.value)} placeholder="输入提示词（自然语言或 tags 都可）" />

                <label className="flex items-center gap-2 text-xs font-bold">
                  <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={studioUseConversion} onChange={(e)=>setStudioUseConversion(e.target.checked)} />
                  使用 SD 转换模型（描述 → tags）
                </label>

                {studioMode === 'img2img' && (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="file-input file-input-bordered w-full"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setStudioInitImage(String(reader.result || ''));
                        reader.readAsDataURL(file);
                      }}
                    />
                    {studioInitImage && (
                      <div className="rounded-xl overflow-hidden border border-base-300 bg-base-100/60">
                        <img src={studioInitImage} className="max-h-48 w-full object-contain" />
                      </div>
                    )}
                  </div>
                )}

                {backend === 'sdwebui' && (
                  <>
                    <textarea className="textarea textarea-bordered w-full h-20" value={studioNegative} onChange={e => setStudioNegative(e.target.value)} placeholder="Negative prompt（可选）" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="form-control">
                        <label className="label text-xs font-bold">宽</label>
                        <input className="input input-bordered input-sm" type="number" value={studioSdWidth} onChange={e => setStudioSdWidth(parseInt(e.target.value || '0', 10) || 0)} />
                      </div>
                      <div className="form-control">
                        <label className="label text-xs font-bold">高</label>
                        <input className="input input-bordered input-sm" type="number" value={studioSdHeight} onChange={e => setStudioSdHeight(parseInt(e.target.value || '0', 10) || 0)} />
                      </div>
                      <div className="form-control">
                        <label className="label text-xs font-bold">Steps</label>
                        <input className="input input-bordered input-sm" type="number" value={studioSdSteps} onChange={e => setStudioSdSteps(parseInt(e.target.value || '0', 10) || 0)} />
                      </div>
                      <div className="form-control">
                        <label className="label text-xs font-bold">CFG</label>
                        <input className="input input-bordered input-sm" type="number" step="0.5" value={studioSdCfg} onChange={e => setStudioSdCfg(parseFloat(e.target.value || '0') || 0)} />
                      </div>
                    </div>
                    <div className="form-control">
                      <label className="label text-xs font-bold">Sampler</label>
                      <input className="input input-bordered input-sm" value={studioSdSampler} onChange={e => setStudioSdSampler(e.target.value)} />
                    </div>
                    {studioMode === 'img2img' && (
                      <div className="form-control">
                        <label className="label text-xs font-bold">Denoise</label>
                        <input className="range range-primary" type="range" min="0" max="1" step="0.05" value={studioSdDenoise} onChange={e => setStudioSdDenoise(parseFloat(e.target.value || '0'))} />
                        <div className="text-[10px] opacity-70 mt-1">{studioSdDenoise.toFixed(2)}</div>
                      </div>
                    )}
                  </>
                )}

                {backend === 'openai' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="form-control">
                        <label className="label text-xs font-bold">Size</label>
                        <select className="select select-bordered select-sm" value={studioOpenAiSize} onChange={e => setStudioOpenAiSize(e.target.value)}>
                          {commonSizes.map(s => <option key={`sz-${s}`} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="form-control">
                        <label className="label text-xs font-bold">n</label>
                        <input className="input input-bordered input-sm" type="number" min="1" max="8" value={studioOpenAiN} onChange={e => setStudioOpenAiN(parseInt(e.target.value || '1', 10) || 1)} />
                      </div>
                      <div className="form-control">
                        <label className="label text-xs font-bold">quality（可选）</label>
                        <input className="input input-bordered input-sm" value={studioOpenAiQuality} onChange={e => setStudioOpenAiQuality(e.target.value)} placeholder="如：standard / hd" />
                      </div>
                      <div className="form-control">
                        <label className="label text-xs font-bold">style（可选）</label>
                        <input className="input input-bordered input-sm" value={studioOpenAiStyle} onChange={e => setStudioOpenAiStyle(e.target.value)} placeholder="如：vivid / natural" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="form-control">
                        <label className="label text-xs font-bold">response_format</label>
                        <select className="select select-bordered select-sm" value={studioOpenAiResponseFormat} onChange={e => setStudioOpenAiResponseFormat(e.target.value)}>
                          <option value="b64_json">b64_json</option>
                          <option value="url">url</option>
                        </select>
                      </div>
                      <div className="form-control">
                        <label className="label text-xs font-bold">path 覆盖（可选）</label>
                        <input className="input input-bordered input-sm" value={studioOpenAiPath} onChange={e => setStudioOpenAiPath(e.target.value)} placeholder="如：/v1/images/generations" />
                      </div>
                    </div>
                    {studioMode === 'img2img' && (
                      <label className="flex items-center gap-2 text-xs font-bold">
                        <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={studioOpenAiMultipart} onChange={(e)=>setStudioOpenAiMultipart(e.target.checked)} />
                        使用 multipart（常见 OpenAI `/images/edits`）
                      </label>
                    )}
                  </>
                )}

                <div className="form-control">
                  <label className="label text-xs font-bold">高级参数 JSON（可选，合并到请求 payload）</label>
                  <textarea className="textarea textarea-bordered w-full h-24 font-mono text-xs" value={studioExtraJson} onChange={e => setStudioExtraJson(e.target.value)} placeholder='例如：{"seed":123,"user":"demo"}' />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="form-control">
                    <label className="label text-xs font-bold">生图预设（可选）</label>
                    <select
                      className="select select-bordered select-sm"
                      value={studioImagePresetId}
                      onChange={(e) => {
                        setStudioImagePresetId(e.target.value);
                        setStudioImageModelId('');
                        const v = e.target.value;
                        if (v) fetchPresetModels(parseInt(v, 10));
                      }}
                    >
                      <option value="">跟随系统绑定/顶栏</option>
                      {presets.map(p => <option key={`studio-p-${p.id}`} value={String(p.id)}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label text-xs font-bold">生图模型（可选）</label>
                    <div className="join">
                      <select className="select select-bordered select-sm join-item w-full" value={studioImageModelId} onChange={(e) => setStudioImageModelId(e.target.value)}>
                        <option value="">跟随系统绑定/顶栏</option>
                        {resolvedPresetModels.map(m => <option key={`studio-m-${m}`} value={m}>{m}</option>)}
                        {resolvedPresetModels.length === 0 && manualModels.map(m => <option key={`studio-man-${m}`} value={m}>{m}</option>)}
                      </select>
                      <button
                        className={`btn btn-sm join-item btn-ghost ${resolvedPresetId && presetModelsLoading[resolvedPresetId] ? 'loading' : ''}`}
                        title="刷新模型列表"
                        onClick={() => resolvedPresetId && fetchPresetModels(resolvedPresetId, true)}
                        disabled={!resolvedPresetId}
                      >
                        <RefreshCw size={14}/>
                      </button>
                    </div>
                  </div>
                </div>

                {studioError && (
                  <div className="alert alert-error py-2 text-xs">
                    <span className="break-words">{studioError}</span>
                  </div>
                )}

                <button className={`btn btn-primary ${isTyping ? 'loading' : ''}`} onClick={runStudioGenerate} disabled={isTyping}>
                  {studioMode === 'txt2img' ? '生成图片' : '开始图生图'}
                </button>
              </div>
            </div>

            <div className="card bg-base-200 border border-base-300 shadow-sm">
              <div className="card-body space-y-3">
                <div className="text-sm font-black">结果</div>
                {studioResults.length === 0 ? (
                  <div className="text-xs opacity-70">暂无结果，点击左侧按钮开始生成。</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {studioResults.map((src, i) => (
                      <div key={`r-${i}`} className="rounded-xl overflow-hidden border border-base-300 bg-base-100/60">
                        <img src={src} className="w-full h-48 object-contain" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
              : (viewMode === 'char' ? characters.find(c=>c.id===selectedCharId)?.name : groups.find(g=>g.id===selectedGroupId)?.name) || "SimpleRP"}
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
              <button className="btn btn-sm btn-ghost text-error" title="清空对话" onClick={() => { if(confirm("确定清空会话？")) api.messages.clear(viewMode==='char'?selectedCharId:undefined, viewMode==='group'?selectedGroupId:undefined).then(()=>{setMessages([]); alert("已清空");}); }}><Eraser size={18}/></button>
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
            {viewMode === 'group' && selectedGroupId && <button className="btn btn-sm btn-secondary" onClick={()=>setShowGroupEdit(true)}><Users size={18}/></button>}
          </div>
        </div>

        <div className="md:hidden px-2 py-2 border-b border-base-300 bg-base-100">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {viewMode !== 'image' && (
              <button className="btn btn-xs btn-ghost text-error whitespace-nowrap" onClick={() => { if(confirm("确定清空会话？")) api.messages.clear(viewMode==='char'?selectedCharId:undefined, viewMode==='group'?selectedGroupId:undefined).then(()=>{setMessages([]); alert("已清空");}); }}><Eraser size={14}/> 清空</button>
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
            {viewMode === 'group' && selectedGroupId && <button className="btn btn-xs btn-secondary whitespace-nowrap" onClick={()=>setShowGroupEdit(true)}><Users size={14}/> 剧场</button>}
          </div>
        </div>

        {viewMode === 'image' ? (
          <ImageStudio />
        ) : (
          <>
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              {messages.map((m, idx) => (
                <div key={`${m.id || m.timestamp}-${idx}`} className={`chat ${m.role === 'user' ? 'chat-end' : 'chat-start'} group animate-message`}>
                  <div className="chat-header opacity-50 text-[10px] mb-1 flex items-center gap-2">
                    {m.role === 'user' ? '我' : (characters.find(c=>c.id===m.char_id)?.name || 'AI')}
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                        {!m.image && <button className="hover:text-primary" onClick={()=>{setEditingMsgId(m.id!); setEditContent(m.content)}}><Pencil size={10}/></button>}
                        {m.role !== 'user' && idx === messages.length - 1 && <button className="hover:text-primary" onClick={handleRegenerate}><RefreshCw size={10}/></button>}
                        <button className="hover:text-error" onClick={async () => { if (confirm("删除该条记录？")) { if (m.id) { await api.messages.delete(m.id); setMessages(prev => prev.filter(msg => msg.id !== m.id)); } else { setMessages(prev => prev.filter(msg => msg.timestamp !== m.timestamp)); } } }}><Trash2 size={10}/></button>
                    </div>
                  </div>
                  {m.image ? (
                    <div className="chat-bubble p-1 bg-base-200 border-base-300 shadow-xl overflow-hidden relative group/img">
                      <img src={m.image} className="max-w-xs md:max-w-md rounded-lg"/>
                      {!m.id && (<div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity"><button className="btn btn-circle btn-xs btn-primary shadow-lg" title="保存" onClick={async () => { try { const res = await api.messages.add(m); setMessages(prev => prev.map(msg => msg.timestamp === m.timestamp ? { ...msg, id: res.id } : msg)); alert("已保存"); } catch (err) { alert("保存失败"); } }}><Save size={12}/></button></div>)}
                    </div>
                  ) : (
                    <div className={`chat-bubble shadow-lg border ${m.role === 'user' ? 'chat-bubble-primary border-primary' : 'bg-base-200 text-base-content border-base-300'}`}>
                      {editingMsgId === m.id ? (
                          <div className="flex flex-col gap-2 min-w-[200px]"><textarea className="textarea textarea-bordered textarea-sm w-full bg-base-100" value={editContent} onChange={e=>setEditContent(e.target.value)}/><div className="flex justify-end gap-1"><button className="btn btn-xs" onClick={()=>setEditingMsgId(null)}>取消</button><button className="btn btn-xs btn-primary" onClick={async ()=>{await api.messages.update(m.id!, editContent); setMessages(prev => prev.map(msg=>msg.id===m.id?{...msg, content:editContent}:msg)); setEditingMsgId(null)}}>保存</button></div></div>
                      ) : <div className="prose prose-sm break-words"><ReactMarkdown rehypePlugins={[rehypeRaw]}>{m.content}</ReactMarkdown></div>}
                    </div>
                  )}
                </div>
              ))}
              {isTyping && <div className="chat chat-start opacity-50 animate-pulse"><div className="chat-bubble">思考中...</div></div>}
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
                    <button className="btn btn-circle btn-ghost btn-sm text-accent" onClick={()=>{setGenPrompt(messages[messages.length-1]?.content || ""); setUseSdPromptConversion(true); setShowGenModal(true)}}><ImageIcon size={20}/></button>
                  <textarea className="textarea textarea-ghost flex-1 min-h-[2.5rem] max-h-48 resize-none py-2 px-2 focus:outline-none" rows={1} value={input} onChange={e=>{setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=e.target.scrollHeight+'px'}} placeholder="输入消息..." onKeyDown={e=>{if(e.key==='Enter' && !e.shiftKey){e.preventDefault(); handleSend();}}} />
                  {isTyping ? (<button className="btn btn-circle btn-error btn-sm shadow-lg" onClick={stopGeneration}><Square size={16} fill="currentColor"/></button>) : (<button className="btn btn-circle btn-primary btn-sm shadow-lg" onClick={handleSend} disabled={!input.trim()}><Send size={18}/></button>)}
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

      {/* 3. 剧场编辑器 (保持不变) */}
      {showGroupEdit && selectedGroupId && (
          <div className="modal modal-open text-base-content">
              <div className="modal-box max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden">
                  <div className="p-6 border-b flex justify-between bg-base-200 font-bold items-center"><h3>剧场/群聊配置</h3><button className="btn btn-sm btn-circle btn-ghost" onClick={()=>setShowGroupEdit(false)}><X/></button></div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div className="form-control"><label className="label font-bold">剧场名</label><input className="input input-bordered" value={groups.find(g=>g.id===selectedGroupId)?.name} onChange={e=>setGroups(groups.map(g=>g.id===selectedGroupId?{...g, name:e.target.value}:g))} /></div>
                      <div className="form-control"><label className="label font-bold text-xs text-primary">当前场景描述</label><textarea className="textarea textarea-bordered h-40" value={groups.find(g=>g.id===selectedGroupId)?.description} onChange={e=>setGroups(groups.map(g=>g.id===selectedGroupId?{...g, description:e.target.value}:g))} /></div>
                      <div className="space-y-4">
                          <label className="label font-bold text-xs">选择成员</label>
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
                  <div className="p-6 border-t bg-base-200 flex justify-end"><button className="btn btn-primary" onClick={async ()=>{const g=groups.find(grp=>grp.id===selectedGroupId); if(g){await api.groups.update(selectedGroupId, {...g, memberIds: groupMemberIds}); setShowGroupEdit(false); alert("已更新剧场成员")}}}>保存剧场</button></div>
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
