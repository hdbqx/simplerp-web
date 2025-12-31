import OpenAI from 'openai';
import type { Character, Settings, Message, LorebookEntry, ApiPreset } from './db';
import { replaceVariables } from './variables'; 

export class LLMClient {
  private client: OpenAI;

  constructor(settings: Settings) {
    this.client = new OpenAI({ 
      baseURL: settings.api_base, 
      apiKey: settings.api_key, 
      dangerouslyAllowBrowser: true 
    });
  }

  /**
   * MajicMix v7 专用：提示词预处理器
   * 将感性的聊天内容转化为 SD 能够识别的硬核 Tags
   */
  async generateImageTags(description: string, settings: Settings): Promise<string> {
    const model = settings.model || (settings.model_list?.split(',')[0].trim());
    if (!model) return description;

    // 针对写实模型 v7 的 Prompt 指令
    const systemInstruction = `You are a specialized Stable Diffusion Prompt Engineer. 
    Convert descriptions into a comma-separated list of English keywords. 
    Focus on: facial features, hair style, specific clothing texture, body pose, lighting (cinematic, rim lighting), and environment.
    IMPORTANT: Output ONLY keywords, no sentences, no explanations.`;

    try {
      const res = await this.client.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `Convert this scene to SD tags: ${description}` }
        ],
        temperature: 0.3, // 低随机性确保标签精准
      });
      return res.choices[0]?.message?.content || description;
    } catch (e) {
      console.error("LLM Tag Conversion Error:", e);
      return description; // 失败则降级使用原文
    }
  }

  /**
   * 世界书扫描逻辑
   */
  private scanLorebook(currentInput: string, history: Message[], entries: LorebookEntry[]): string {
    if (!entries || entries.length === 0) return "";

    const contextText = (currentInput + " " + history.slice(-3).map(m => m.content).join(" ")).toLowerCase();
    
    const hits = entries.filter((e: LorebookEntry) => {
        if (!e.isActive || !e.keywords) return false;
        const kwList = e.keywords.split(/[,，]/);
        return kwList.some((k: string) => {
            const trimmedK = k.trim().toLowerCase();
            return trimmedK.length > 0 && contextText.includes(trimmedK);
        });
    });

    if (hits.length === 0) return "";

    return `\n\n### [世界书设定注入]\n${hits.map((h: LorebookEntry) => `内容: ${h.content}`).join('\n---\n')}\n`;
  }

  /**
   * 聊天流处理（支持单人/剧场）
   */
  async *chatStream(
    char: Character, history: Message[], userInputs: string, settings: Settings, 
    lorebookEntries: LorebookEntry[] = [], groupCtx?: any, presets: ApiPreset[] = [],
    controller?: AbortController 
  ) {
    const preset = presets.find((p: ApiPreset) => p.id === char.api_preset_id);
    const apiBase = char.api_base_override || preset?.api_base || settings.api_base;
    const apiKey = char.api_key_override || preset?.api_key || settings.api_key;
    const currentModel = char.model_id || settings.model || (settings.model_list?.split(',')[0].trim());

    if (!currentModel) { yield "\n[系统提示]: 未配置模型。"; return; }

    const dynamicClient = new OpenAI({ baseURL: apiBase, apiKey: apiKey, dangerouslyAllowBrowser: true, maxRetries: 0 });

    const isGroupMode = !!groupCtx;
    const STOP_MARKER = "Ω"; 
    const playerDisplayName = isGroupMode ? (settings.user_name || "User") : "User";

    // 1. 构造 System Prompt
    let systemPromptRaw = char.description + (char.summary ? `\n\n[记忆摘要]: ${char.summary}` : "");
    systemPromptRaw += this.scanLorebook(userInputs, history, lorebookEntries);

    if (isGroupMode) {
      systemPromptRaw = `【剧场模式】身份：[${char.name}]，玩家：[${playerDisplayName}]，严禁替他人发言。必须以 "${STOP_MARKER}" 结束回复。\n${systemPromptRaw}`;
    }

    const systemPrompt = replaceVariables(systemPromptRaw, settings, char);

    // 2. 构造消息列表
    const chatMessages: any[] = [];
    history.slice(-15).forEach((m: Message) => {
      if (isGroupMode) {
        const senderName = m.role === 'user' ? playerDisplayName : (presets.find(p=>false)?.name || 'AI'); // 简化逻辑
        chatMessages.push({ role: m.role, content: `(Log: ${senderName}) -> ${m.content}` });
      } else {
        chatMessages.push({ role: m.role, content: m.content });
      }
    });

    if (userInputs) {
        const pInput = replaceVariables(userInputs, settings, char);
        chatMessages.push({ 
            role: 'user', 
            content: isGroupMode ? `(Input: ${playerDisplayName}) -> ${pInput}` : pInput
        });
    }

    // 3. 动态拦截
    let stopRegex: RegExp | null = null;
    if (isGroupMode) {
      const escaped = [playerDisplayName, "User"].map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      stopRegex = new RegExp(`(\\n|\\s|[。！？])+(\\(Log:|\\(Input:|\\[|#)*(${escaped})(:|：|\\s|\\n)`, 'i');
    }

    try {
      const stream = await dynamicClient.chat.completions.create({
        model: currentModel, 
        messages: [{ role: 'system', content: systemPrompt }, ...chatMessages],
        stream: true, 
        temperature: settings.temperature || 0.8,
        stop: isGroupMode ? [STOP_MARKER] : ["User:", "\nUser:"] 
      }, { signal: controller?.signal });

      let accumulated = ""; 
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) {
          const newAccumulated = accumulated + text;
          if (isGroupMode && stopRegex && stopRegex.test(newAccumulated)) {
            if (controller) controller.abort(); 
            return; 
          }
          accumulated = newAccumulated;
          yield text.replace(STOP_MARKER, "");
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      yield `\n[模型调用失败]: ${e.message}`;
    }
  }

  async summarize(history: Message[], settings: Settings): Promise<string> {
    const summaryModel = settings.model || (settings.model_list?.split(',')[0].trim());
    if (!summaryModel) throw new Error("未选择总结模型");
    const res = await this.client.chat.completions.create({
      model: summaryModel,
      messages: [{ role: 'system', content: "请精简总结上述对话事实。" }, { role: 'user', content: history.map((m: Message) => m.content).slice(-30).join('\n') }]
    });
    return res.choices[0]?.message?.content || "";
  }
}