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
   * 将场景转化为 SD 标签
   */
  async generateImageTags(description: string, settings: Settings): Promise<string> {
    const model = settings.model || (settings.model_list?.split(',')[0].trim());
    if (!model) return description;
    const systemInstruction = `You are a specialized Stable Diffusion Prompt Engineer. Convert descriptions into concise comma-separated English keywords. Output ONLY keywords.`;
    try {
      const res = await this.client.chat.completions.create({
        model: model,
        messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: `Convert this to tags: ${description}` }],
        temperature: 0.3,
      });
      return res.choices[0]?.message?.content || description;
    } catch (e) { return description; }
  }

  /**
   * 世界书注入逻辑：确保在末尾以增强执行性
   */
  private scanLorebook(currentInput: string, history: Message[], entries: LorebookEntry[]): string {
    if (!entries || entries.length === 0) return "";
    const contextText = (currentInput + " " + history.slice(-10).map(m => m.content).join(" ")).toLowerCase();
    const hits = entries.filter((e: LorebookEntry) => {
        if (!e.isActive || !e.keywords) return false;
        if (e.keywords.trim() === "*") return true; 
        return e.keywords.split(/[,，]/).some((k: string) => {
            const trimmedK = k.trim().toLowerCase();
            return trimmedK.length > 0 && contextText.includes(trimmedK);
        });
    });
    if (hits.length === 0) return "";
    return `\n\n### [WORLD SETTING / CRITICAL RULES]\n${hits.map((h: LorebookEntry) => h.content).join('\n---\n')}\n`;
  }

  async *chatStream(
    char: Character, history: Message[], userInputs: string, settings: Settings, 
    lorebookEntries: LorebookEntry[] = [], groupCtx?: any, presets: ApiPreset[] = [],
    controller?: AbortController 
  ) {
    const preset = presets.find((p: ApiPreset) => p.id === char.api_preset_id);
    const apiBase = char.api_base_override || preset?.api_base || settings.api_base;
    const apiKey = char.api_key_override || preset?.api_key || settings.api_key;
    const currentModel = char.model_id || settings.model || (settings.model_list?.split(',')[0].trim());
    if (!currentModel) { yield "\n[错误]: 未配置模型。"; return; }

    const dynamicClient = new OpenAI({ baseURL: apiBase, apiKey: apiKey, dangerouslyAllowBrowser: true });
    const isGroupMode = !!groupCtx;
    const STOP_MARKER = "Ω"; 
    const playerDisplayName = settings.user_name || "User";

    let basePrompt = char.description + (char.summary ? `\n\n[Long-term Memory Archive]:\n${char.summary}` : "");
    const lorebookInjection = this.scanLorebook(userInputs, history, lorebookEntries);

    if (isGroupMode) {
      basePrompt = `【剧场模式】身份：[${char.name}]，玩家：[${playerDisplayName}]。必须以 "${STOP_MARKER}" 结束回复。\n${basePrompt}`;
    }

    const fullSystemContent = replaceVariables(basePrompt + lorebookInjection, settings, char);

    const chatMessages: any[] = [];
    history.slice(-15).forEach((m: Message) => {
      if (isGroupMode) {
        const name = m.role === 'user' ? playerDisplayName : (char.name || 'AI');
        chatMessages.push({ role: m.role, content: `(Log: ${name}) -> ${m.content}` });
      } else {
        chatMessages.push({ role: m.role, content: m.content });
      }
    });

    if (userInputs) {
        chatMessages.push({ 
            role: 'user', 
            content: isGroupMode ? `(Input: ${playerDisplayName}) -> ${replaceVariables(userInputs, settings, char)}` : replaceVariables(userInputs, settings, char)
        });
    }

    try {
      const stream = await dynamicClient.chat.completions.create({
        model: currentModel, 
        messages: [{ role: 'system', content: fullSystemContent }, ...chatMessages],
        stream: true, 
        temperature: settings.temperature || 0.8,
        stop: isGroupMode ? [STOP_MARKER] : ["User:", "\nUser:"] 
      }, { signal: controller?.signal });
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) yield text.replace(STOP_MARKER, "");
      }
    } catch (e: any) { if (e.name !== 'AbortError') yield `\n[API Error]: ${e.message}`; }
  }

  /**
   * 修复后的增量总结方法：仅提取新事实，不重写旧内容
   */
  async summarizeRecent(history: Message[], settings: Settings): Promise<string> {
    const summaryModel = settings.model || (settings.model_list?.split(',')[0].trim());
    if (!summaryModel) throw new Error("未配置总结模型");
    const facts = history
        .filter(m => m.content && m.content.trim() && !m.image)
        .map(m => `${m.role === 'user' ? '玩家' : '角色'}: ${m.content}`)
        .slice(-40) 
        .join('\n');
    if (!facts) return "";
    
    const prompt = `你是一个严谨的剧情记录员。请从以下【最近对话】中提取并概括出“新发生的关键剧情进展”。
    要求：
    1. 重点提取：新增的女性仆从/魂师（姓名、外貌特征、服饰、身份）、魂力等级变化、获得的新资源/物品、新的XP开发及调教进度。
    2. 使用简短的条目格式。
    3. 只输出新发生的进展，不要输出任何已有的历史背景。
    
    【最近对话】：
    ${facts}
    
    新进展总结：`;

    const res = await this.client.chat.completions.create({
      model: summaryModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });
    return res.choices[0]?.message?.content || "";
  }
}