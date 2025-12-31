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
   * 将描述转化为 MajicMix v7 偏好的英文 Tags
   */
  async generateImageTags(description: string, settings: Settings): Promise<string> {
    const model = settings.model || (settings.model_list?.split(',')[0].trim());
    if (!model) return description;
    const systemInstruction = `You are a specialized Stable Diffusion Prompt Engineer. 
    Convert descriptions into concise comma-separated English keywords. 
    Focus on: facial features, clothing texture, pose, lighting, and environment. 
    Output ONLY keywords, no sentences.`;
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
   * 世界书扫描逻辑：深度 10 条消息，支持通配符 *
   */
  private scanLorebook(currentInput: string, history: Message[], entries: LorebookEntry[]): string {
    if (!entries || entries.length === 0) return "";
    const contextText = (currentInput + " " + history.slice(-10).map(m => m.content).join(" ")).toLowerCase();
    
    const hits = entries.filter((e: LorebookEntry) => {
        if (!e.isActive || !e.keywords) return false;
        if (e.keywords.trim() === "*") return true; // 全局强制触发
        return e.keywords.split(/[,，]/).some((k: string) => {
            const trimmedK = k.trim().toLowerCase();
            return trimmedK.length > 0 && contextText.includes(trimmedK);
        });
    });

    if (hits.length === 0) return "";
    return `\n\n### [WORLD SETTING / RULES]\n${hits.map((h: LorebookEntry) => h.content).join('\n---\n')}\n`;
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

    // 构造 System Prompt：核心人设 + 记忆摘要 + 世界书(末尾)
    let basePrompt = char.description + (char.summary ? `\n\n[Long-term Memory]: ${char.summary}` : "");
    const lorebookInjection = this.scanLorebook(userInputs, history, lorebookEntries);

    if (isGroupMode) {
      basePrompt = `【剧场模式】身份：[${char.name}]，玩家：[${playerDisplayName}]。严禁替他人发言。必须以 "${STOP_MARKER}" 结束。\n${basePrompt}`;
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
    } catch (e: any) {
      if (e.name !== 'AbortError') yield `\n[API Error]: ${e.message}`;
    }
  }

  async summarize(history: Message[], settings: Settings, oldSummary: string = ""): Promise<string> {
    const summaryModel = settings.model || (settings.model_list?.split(',')[0].trim());
    if (!summaryModel) throw new Error("No model");
    const facts = history.filter(m => m.content && m.content.trim()).map(m => `${m.role}: ${m.content}`).slice(-40).join('\n');
    if (!facts) return oldSummary;
    
    const prompt = `根据【新增对话】整合进【已有记忆】中。保持精简，重点记录关系变化、重要XP及关键剧情。
    现有摘要：${oldSummary || "无"}
    新增内容：\n${facts}\n请输出整合后的新摘要：`;

    const res = await this.client.chat.completions.create({
      model: summaryModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });
    return res.choices[0]?.message?.content || oldSummary;
  }
}