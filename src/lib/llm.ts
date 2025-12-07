import OpenAI from 'openai';
import type { Character, Settings, Message } from './db';

export class LLMClient {
  private client: OpenAI;
  private model: string;

  constructor(settings: Settings) {
    this.client = new OpenAI({
      baseURL: settings.api_base,
      apiKey: settings.api_key,
      dangerouslyAllowBrowser: true // 允许在浏览器端直接调用 API
    });
    // 确保 model 不为 undefined，防止 SDK 报错
    this.model = settings.model || "";
  }

  /**
   * 构建系统提示词 (System Prompt)
   * 包含角色设定 + XML 输出格式强指令
   */
  private buildSystemPrompt(char: Character): string {
    // 1. 基础角色设定
    let prompt = `
<system_instruction>
You are roleplaying as <char_name>${char.name}</char_name>.
Stay in character deeply. Never break the fourth wall.
Current Date: ${new Date().toLocaleDateString()}
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

    // 2. 注入 XML 输出模板 (如果存在)
    // 关键优化：明确禁止使用 markdown 代码块包裹
    if (char.output_template) {
      prompt += `\n\n<output_format_instruction>\nYOU MUST STRICTLY FOLLOW THE XML FORMAT BELOW FOR EVERY RESPONSE.\n\nIMPORTANT RULES:\n1. DO NOT wrap the output in Markdown code blocks (like \`\`\`xml ... \`\`\`).\n2. Output RAW XML text directly.\n3. Ensure all tags are properly closed.\n\nTemplate:\n${char.output_template}\n</output_format_instruction>`;
    }

    return prompt;
  }

  /**
   * 流式对话生成器
   */
  async *chatStream(char: Character, history: Message[], userInputs: string, settings: Settings) {
    // 1. 防御性检查
    if (!this.model || this.model.trim() === "") {
      yield "\n[系统错误: 未选择模型]\n请在页面顶部下拉菜单中选择一个模型，或在设置中配置 Endpoint ID。";
      return;
    }

    // 2. 构造消息链
    const messages: any[] = [
      { role: 'system', content: this.buildSystemPrompt(char) },
      // 取最近 15 条历史，避免上下文溢出。
      // 注意：这里只取 role 和 content，过滤掉 id 等数据库字段
      ...history.slice(-15).map(m => ({ 
        role: m.role, 
        content: m.content 
      })),
      { role: 'user', content: userInputs }
    ];

    try {
      // 3. 发起请求
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        stream: true, // 开启流式
        temperature: settings.temperature,
      });

      // 4. 逐块返回数据
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) yield content;
      }

    } catch (e: any) {
      console.error("LLM Request Error:", e);
      
      // 5. 错误处理与友好提示
      if (e.status === 400 && e.error?.code === 'model_not_found') {
        yield `\n[模型不存在]\n服务端无法识别模型 ID: "${this.model}"。\n请检查设置中的 Endpoint ID 是否正确 (火山引擎通常以 ep- 开头)。`;
      } else if (e.status === 401) {
        yield `\n[认证失败]\nAPI Key 无效或过期。请在设置中检查密钥。`;
      } else {
        yield `\n[连接中断: ${e.message || "网络异常"}]\n请检查 Base URL 是否正确或网络是否通畅。`;
      }
    }
  }
}

/**
 * 辅助函数：尝试获取模型列表
 * 注意：由于 CORS 限制，此函数在纯前端环境(浏览器)直接连接火山引擎/OpenAI时经常会失败。
 * 建议用户手动填写模型 ID。
 */
export async function fetchModels(baseUrl: string, apiKey: string): Promise<string[]> {
  // 移除 URL 末尾多余的斜杠
  let cleanBase = baseUrl.replace(/\/+$/, '');
  
  // 针对火山引擎 URL 的常见误填进行修正
  cleanBase = cleanBase.replace(/\/chat\/completions$/, '');

  const url = `${cleanBase}/models`;
  console.log("Fetching models from:", url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    
    // 兼容 OpenAI 标准格式 { data: [...] } 和部分非标格式
    const list = data.data || data;

    if (Array.isArray(list)) {
      return list.map((item: any) => item.id);
    } else {
      return [];
    }
  } catch (e) {
    // 这里抛出错误供 UI 层捕获并弹窗提示
    throw e;
  }
}