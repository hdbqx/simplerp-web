import OpenAI from 'openai';
import type { Character, Settings, Message, LorebookEntry } from './db';
import { replaceVariables } from './variables'; 

export class LLMClient {
  private client: OpenAI;
  private model: string;

  constructor(settings: Settings) {
    this.client = new OpenAI({
      baseURL: settings.api_base,
      apiKey: settings.api_key,
      dangerouslyAllowBrowser: true 
    });
    this.model = settings.model || "";
  }

  // === 辅助：世界书扫描 ===
  private scanLorebook(text: string, entries: LorebookEntry[]): string {
    const hits = entries.filter(entry => {
        if (!entry.isActive) return false;
        const keys = entry.keywords.split(/[,，]/).map(k => k.trim()).filter(k=>k);
        // 只要匹配到一个关键词
        return keys.some(k => text.includes(k));
    });

    if (hits.length === 0) return "";
    
    return `\n\n=== [World Info / Lorebook Triggered] ===\n${hits.map(h => h.content).join('\n')}\n================================`;
  }

  private buildSystemPrompt(char: Character, settings: Settings, lorebookEntries: LorebookEntry[] = [], userContext: string = ""): string {
    let prompt = char.description || "";

    // 1. 注入历史记忆
    if (char.summary && char.summary.trim() !== "") {
      prompt += `\n\n=== [Long-term Memory] ===\n${char.summary}`;
    }

    // 2. 注入世界书 (扫描 用户输入 + 设定)
    // 这里的 userContext 通常是用户最新的一句话，或者最近几句
    const loreText = this.scanLorebook(userContext, lorebookEntries);
    if (loreText) {
        prompt += loreText;
    }

    prompt += `\n\n[Current Time: ${new Date().toLocaleString()}]`;

    return replaceVariables(prompt, settings, char);
  }

  // ... summarize 函数保持不变 ...
  async summarize(history: Message[], settings: Settings): Promise<string> {
    if (history.length === 0) return "";
    let currentModel = this.model;
    if (!currentModel) {
       const list = (settings.model_list || "").split(',');
       if(list.length > 0) currentModel = list[0].trim();
    }
    if(!currentModel) throw new Error("未选择模型");
    const historyText = history.map(m => `${m.role}: ${m.content}`).join("\n");
    const systemPrompt = "请简要总结以下对话的内容。保留关键事实、人物关系变化、重要事件结果。";
    try {
      const res = await this.client.chat.completions.create({
        model: currentModel,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: historyText }],
        temperature: 0.5,
      });
      return res.choices[0]?.message?.content || "";
    } catch (e) { console.error(e); throw e; }
  }

  // === Chat Stream ===
  async *chatStream(char: Character, history: Message[], userInputs: string, settings: Settings, lorebookEntries: LorebookEntry[] = []) {
    let currentModel = this.model;
    if (!currentModel || currentModel.trim() === "") {
        const availableModels = (settings.model_list || "").split(',').map(m => m.trim()).filter(m => m);
        if (availableModels.length > 0) currentModel = availableModels[0];
    }
    if (!currentModel) { yield "\n[系统错误: 未找到可用模型]"; return; }

    const processedInput = replaceVariables(userInputs, settings, char);
    
    // 构建 Prompt 时传入 lorebook
    const systemPromptContent = this.buildSystemPrompt(char, settings, lorebookEntries, processedInput);
    
    const messages: any[] = [
      { role: 'system', content: systemPromptContent },
      ...history.slice(-20).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: processedInput }
    ];

    try {
      const stream = await this.client.chat.completions.create({
        model: currentModel,
        messages: messages,
        stream: true,
        temperature: settings.temperature,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) yield content;
      }
    } catch (e: any) {
      console.error("LLM Error:", e);
      yield `\n[连接错误: ${e.message}]`;
    }
  }
}