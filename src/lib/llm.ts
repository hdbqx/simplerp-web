// src/lib/llm.ts 完整修复版

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

  async generateImageTags(description: string, settings: Settings): Promise<string> {
    const model = settings.model || (settings.model_list?.split(',')[0].trim());
    if (!model) return description;
    const systemInstruction = `You are a specialized Stable Diffusion Prompt Engineer. Convert descriptions into comma-separated English keywords. Focus on: facial features, hair style, clothing texture, body pose, lighting. Output ONLY keywords.`;
    try {
      const res = await this.client.chat.completions.create({
        model: model,
        messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: `Convert to tags: ${description}` }],
        temperature: 0.3,
      });
      return res.choices[0]?.message?.content || description;
    } catch (e) { return description; }
  }

  private scanLorebook(currentInput: string, history: Message[], entries: LorebookEntry[]): string {
    if (!entries || entries.length === 0) return "";
    const contextText = (currentInput + " " + history.slice(-3).map(m => m.content).join(" ")).toLowerCase();
    const hits = entries.filter((e: LorebookEntry) => {
        if (!e.isActive || !e.keywords) return false;
        return e.keywords.split(/[,，]/).some((k: string) => {
            const trimmedK = k.trim().toLowerCase();
            return trimmedK.length > 0 && contextText.includes(trimmedK);
        });
    });
    if (hits.length === 0) return "";
    return `\n\n### [世界书设定注入]\n${hits.map((h: LorebookEntry) => `内容: ${h.content}`).join('\n---\n')}\n`;
  }

  async *chatStream(char: Character, history: Message[], userInputs: string, settings: Settings, lorebookEntries: LorebookEntry[] = [], groupCtx?: any, presets: ApiPreset[] = [], controller?: AbortController) {
    const preset = presets.find((p: ApiPreset) => p.id === char.api_preset_id);
    const apiBase = char.api_base_override || preset?.api_base || settings.api_base;
    const apiKey = char.api_key_override || preset?.api_key || settings.api_key;
    const currentModel = char.model_id || settings.model || (settings.model_list?.split(',')[0].trim());
    if (!currentModel) { yield "\n[系统提示]: 未配置模型。"; return; }
    const dynamicClient = new OpenAI({ baseURL: apiBase, apiKey: apiKey, dangerouslyAllowBrowser: true, maxRetries: 0 });
    const isGroupMode = !!groupCtx;
    const STOP_MARKER = "Ω"; 
    const playerDisplayName = isGroupMode ? (settings.user_name || "User") : "User";
    let systemPromptRaw = char.description + (char.summary ? `\n\n[记忆摘要]: ${char.summary}` : "");
    systemPromptRaw += this.scanLorebook(userInputs, history, lorebookEntries);
    if (isGroupMode) systemPromptRaw = `【剧场模式】身份：[${char.name}]，玩家：[${playerDisplayName}]，严禁替他人发言。必须以 "${STOP_MARKER}" 结束回复。\n${systemPromptRaw}`;
    const systemPrompt = replaceVariables(systemPromptRaw, settings, char);
    const chatMessages: any[] = [];
    history.slice(-15).forEach((m: Message) => {
      if (isGroupMode) {
        const name = m.role === 'user' ? playerDisplayName : (char.name || 'AI');
        chatMessages.push({ role: m.role, content: `(Log: ${name}) -> ${m.content}` });
      } else {
        chatMessages.push({ role: m.role, content: m.content });
      }
    });
    if (userInputs) chatMessages.push({ role: 'user', content: isGroupMode ? `(Input: ${playerDisplayName}) -> ${replaceVariables(userInputs, settings, char)}` : replaceVariables(userInputs, settings, char)});
    try {
      const stream = await dynamicClient.chat.completions.create({
        model: currentModel, 
        messages: [{ role: 'system', content: systemPrompt }, ...chatMessages],
        stream: true, 
        temperature: settings.temperature || 0.8,
        stop: isGroupMode ? [STOP_MARKER] : ["User:", "\nUser:"] 
      }, { signal: controller?.signal });
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) yield text.replace(STOP_MARKER, "");
      }
    } catch (e: any) { if (e.name !== 'AbortError') yield `\n[模型调用失败]: ${e.message}`; }
  }

  /**
   * 修复后的记忆总结逻辑
   * @param history 消息历史
   * @param settings 设置
   * @param oldSummary 现有的摘要（用于整合）
   */
  async summarize(history: Message[], settings: Settings, oldSummary: string = ""): Promise<string> {
    const summaryModel = settings.model || (settings.model_list?.split(',')[0].trim());
    if (!summaryModel) throw new Error("未选择总结模型");
    
    // 过滤掉图片消息和空消息，只保留文本事实
    const facts = history
        .filter(m => m.content && m.content.trim().length > 0)
        .map(m => `${m.role === 'user' ? '玩家' : '角色'}: ${m.content}`)
        .slice(-40) // 增加到 40 条上下文
        .join('\n');

    if (!facts) return oldSummary;

    const prompt = `你是一个记忆管家。请根据【新增对话】更新【已有摘要】。
    要求：
    1. 保持摘要精简，保留关键剧情、角色关系变化、已发生的重要事实。
    2. 不要遗漏【已有摘要】中的重要信息，将其与新事实进行整合。
    3. 仅输出更新后的摘要文本。

    【已有摘要】：${oldSummary || "暂无"}
    【新增对话】：
    ${facts}

    更新后的摘要：`;

    const res = await this.client.chat.completions.create({
      model: summaryModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });
    return res.choices[0]?.message?.content || oldSummary;
  }
}