import OpenAI from 'openai';
import type { Character, Settings, Message } from './db';
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

  // === 1. 构建提示词 (设定 + 记忆) ===
  private buildSystemPrompt(char: Character, settings: Settings): string {
    // 基础设定 (用户填写的完整提示词)
    let prompt = char.description || "";

    // 注入历史记忆 (如果有)
    if (char.summary && char.summary.trim() !== "") {
      prompt += `\n\n=== [历史记忆 / Previous Memory] ===\n以下是之前的对话摘要，请将其作为长期记忆，确保持续性：\n${char.summary}`;
    }

    // 注入时间等变量
    prompt += `\n\n[Current Time: ${new Date().toLocaleString()}]`;

    return replaceVariables(prompt, settings, char);
  }

  // === 2. 总结功能 (新) ===
  async summarize(history: Message[], settings: Settings): Promise<string> {
    if (history.length === 0) return "";
    
    // 确保有模型可用
    let currentModel = this.model;
    if (!currentModel) {
       const list = (settings.model_list || "").split(',');
       if(list.length > 0) currentModel = list[0].trim();
    }
    if(!currentModel) throw new Error("未选择模型");

    // 构造总结请求
    const historyText = history.map(m => `${m.role}: ${m.content}`).join("\n");
    const systemPrompt = "你是一个助手。请简要总结以下对话的内容。保留关键事实、人物关系变化、重要事件结果和当前状态。不要过度冗长。";

    try {
      const res = await this.client.chat.completions.create({
        model: currentModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: historyText }
        ],
        temperature: 0.5, // 总结需要准确，温度低一点
      });
      return res.choices[0]?.message?.content || "";
    } catch (e) {
      console.error("Summarize Error:", e);
      throw e;
    }
  }

  // === 3. 对话流 ===
  async *chatStream(char: Character, history: Message[], userInputs: string, settings: Settings) {
    let currentModel = this.model;
    if (!currentModel || currentModel.trim() === "") {
        const availableModels = (settings.model_list || "").split(',').map(m => m.trim()).filter(m => m);
        if (availableModels.length > 0) currentModel = availableModels[0];
    }
    
    if (!currentModel) {
      yield "\n[系统错误: 未找到可用模型]";
      return;
    }

    const processedInput = replaceVariables(userInputs, settings, char);
    const systemPromptContent = this.buildSystemPrompt(char, settings);
    
    // 调试用：可以在控制台看到发给 AI 的最终 Prompt，包含记忆
    // console.log("Final System Prompt:", systemPromptContent);

    const messages: any[] = [
      { role: 'system', content: systemPromptContent },
      // 这里可以控制上下文长度，比如只发最近 20 条，因为前面的都已经 summarize 进 system prompt 了
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