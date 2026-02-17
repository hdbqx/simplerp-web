import OpenAI from 'openai';
import type { Character, Settings, Message, LorebookEntry } from './db';
import { replaceVariables } from './variables'; 

export class LLMClient {
  private client: OpenAI;

  // 1. 构造函数改为直接接收 Base 和 Key
  constructor(apiBase: string, apiKey: string) {
    this.client = new OpenAI({ 
      baseURL: apiBase, 
      apiKey: apiKey, 
      dangerouslyAllowBrowser: true 
    });
  }

  // 2. 新增：获取模型列表
  async fetchModels(): Promise<string[]> {
    try {
      const list = await this.client.models.list();
      return list.data.map((m: any) => m.id).sort();
    } catch (e: any) {
      console.error("Fetch Models Error:", e);
      return [];
    }
  }

  /**
   * 将场景转化为 SD 标签
   */
  async generateImageTags(description: string, modelName: string): Promise<string> {
    if (!modelName) return description;
    const systemInstruction = `You are a specialized Stable Diffusion Prompt Engineer. Convert descriptions into concise comma-separated English keywords. Output ONLY keywords.`;
    try {
      const res = await this.client.chat.completions.create({
        model: modelName,
        messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: `Convert this to tags: ${description}` }],
        temperature: 0.3,
      });
      return res.choices[0]?.message?.content || description;
    } catch (e) { return description; }
  }

  /**
   * 世界书注入逻辑
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

  // 3. 对话流：逻辑简化，移除配置查找，直接使用 activeModel
  async *chatStream(
    char: Character, 
    history: Message[], 
    userInputs: string, 
    settings: Settings, // 仅用于获取 user_name
    modelName: string,  // 明确传入的模型
    lorebookEntries: LorebookEntry[] = [], 
    groupCtx?: any, 
    controller?: AbortController 
  ) {
    if (!modelName) { yield "\n[错误]: 未选择模型，请在顶部导航栏选择。"; return; }

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
      const stream = await this.client.chat.completions.create({
        model: modelName, 
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

  async summarizeRecent(history: Message[], modelName: string): Promise<string> {
    if (!modelName) throw new Error("未配置总结模型");
    const facts = history
        .filter(m => m.content && m.content.trim() && !m.image)
        .map(m => `${m.role === 'user' ? '玩家' : '角色'}: ${m.content}`)
        .slice(-40) 
        .join('\n');
    if (!facts) return "";
    
    const prompt = `你是一个严谨的剧情记录员。请从以下【最近对话】中提取并概括出“新发生的关键剧情进展”。
    要求：
    1. 重点提取。
    2. 使用简短的条目格式。
    3. 只输出新发生的进展，不要输出任何已有的历史背景。
    
    【最近对话】：
    ${facts}
    
    新进展总结：`;

    const res = await this.client.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });
    return res.choices[0]?.message?.content || "";
  }
}