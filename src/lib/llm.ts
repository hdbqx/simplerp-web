import OpenAI from 'openai';
import type { Character, Settings, Message } from './db';
import { replaceVariables } from './variables'; // 确保你创建了 variables.ts

export class LLMClient {
  private client: OpenAI;
  private model: string;

  constructor(settings: Settings) {
    this.client = new OpenAI({
      baseURL: settings.api_base,
      apiKey: settings.api_key,
      dangerouslyAllowBrowser: true 
    });
    // 初始化时可能为空，但在 chatStream 中会再次检查
    this.model = settings.model || "";
  }

  private buildSystemPrompt(char: Character, settings: Settings): string {
    let rawPrompt = `
<system_instruction>
You are roleplaying as <char_name>{{char}}</char_name>.
Current Model: {{model}}
Time: {{date}} {{time}}
</system_instruction>

<character_profile>
<description>${char.description}</description>
<personality>${char.personality}</personality>
<scenario>${char.scenario}</scenario>
</character_profile>

<dialogue_examples>
${char.mes_example}
</dialogue_examples>
`.trim();

    if (char.output_template) {
      // 强指令：必须输出 XML，禁止 Markdown 代码块
      rawPrompt += `\n\n<output_format_instruction>\nIMPORTANT: You must strictly follow the XML format below for every response.\nDo NOT use markdown code blocks.\nOutput raw XML directly.\n\nTemplate:\n${char.output_template}\n</output_format_instruction>`;
    }

    return replaceVariables(rawPrompt, settings, char);
  }

  async *chatStream(char: Character, history: Message[], userInputs: string, settings: Settings) {
    
    // === 终极模型回退逻辑 ===
    let currentModel = this.model;
    
    // 如果实例中的 model 为空，或者不在此次 settings 的列表中（防止脏数据）
    if (!currentModel || currentModel.trim() === "") {
        const availableModels = (settings.model_list || "").split(',').map(m => m.trim()).filter(m => m);
        if (availableModels.length > 0) {
            currentModel = availableModels[0];
            console.warn(`[LLM] No model selected. Auto-using first available: ${currentModel}`);
        }
    }
    
    if (!currentModel) {
      yield "\n[系统错误: 未找到可用模型]\n请在设置中配置模型列表 (Endpoint ID)。";
      return;
    }
    // ========================

    const processedInput = replaceVariables(userInputs, settings, char);
    
    const messages: any[] = [
      { role: 'system', content: this.buildSystemPrompt(char, settings) },
      ...history.slice(-15).map(m => ({ role: m.role, content: m.content })),
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
      yield `\n[连接错误: ${e.message}]\n当前尝试使用的模型: ${currentModel}\n请检查 API Key、Base URL 或 Endpoint ID 是否正确。`;
    }
  }
}