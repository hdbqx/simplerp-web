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

  private buildSystemPrompt(char: Character, settings: Settings): string {
    // 纯净的 System Prompt 构建
    let rawPrompt = `
You are roleplaying as <char_name>{{char}}</char_name>.
Current Model: {{model}}
Time: {{date}} {{time}}

<character_profile>
<description>${char.description}</description>
<personality>${char.personality}</personality>
<scenario>${char.scenario}</scenario>
</character_profile>

<dialogue_examples>
${char.mes_example}
</dialogue_examples>
`.trim();

    // 如果用户定义了 output_template，直接作为普通文本追加，不再作为 XML 格式指令
    if (char.output_template) {
      rawPrompt += `\n\n<additional_instructions>\n${char.output_template}\n</additional_instructions>`;
    }

    return replaceVariables(rawPrompt, settings, char);
  }

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
      yield `\n[连接错误: ${e.message}]`;
    }
  }
}