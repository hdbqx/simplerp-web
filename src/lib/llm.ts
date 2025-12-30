import OpenAI from 'openai';
import type { Character, Settings, Message, LorebookEntry } from './db';
import { replaceVariables } from './variables'; 

export class LLMClient {
  async *chatStream(
    char: Character, 
    history: Message[], 
    userInputs: string, 
    settings: Settings, 
    _lorebookEntries: LorebookEntry[] = [], // 前缀加下划线表示暂时未使用
    groupContext?: { name: string, description: string, members: Character[] }
  ) {
    const apiBase = char.api_base_override || settings.api_base;
    const apiKey = char.api_key_override || settings.api_key;
    const currentModel = char.model_id || settings.model || (settings.model_list?.split(',')[0].trim());

    if (!currentModel) { yield "\n[系统错误: 未找到可用模型]"; return; }

    const client = new OpenAI({ baseURL: apiBase, apiKey: apiKey, dangerouslyAllowBrowser: true });

    let systemPrompt = char.description || "";
    if (char.summary) systemPrompt += `\n\n=== [Long-term Memory] ===\n${char.summary}`;

    if (groupContext) {
        const membersList = groupContext.members.map(m => `[${m.name}]: ${m.summary || '未知'}`).join('\n');
        systemPrompt = `【剧场大背景】\n${groupContext.description}\n\n【参与者列表】\n${membersList}\n\n【你的当前身份】\n${systemPrompt}`;
    }

    const messages = history.slice(-20).map(m => {
        let content = m.content;
        if (groupContext) {
            const sender = groupContext.members.find(member => member.id === m.char_id);
            const name = m.role === 'user' ? 'User' : (sender?.name || '未知');
            content = `${name}: ${m.content}`;
        }
        return { role: m.role, content };
    });

    if (userInputs) messages.push({ role: 'user', content: replaceVariables(userInputs, settings, char) });

    try {
      const stream = await client.chat.completions.create({
        model: currentModel,
        messages: [{ role: 'system', content: replaceVariables(systemPrompt, settings, char) }, ...messages],
        stream: true,
        temperature: settings.temperature || 0.8,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) yield content;
      }
    } catch (e: any) {
      yield `\n[连接错误 (${currentModel}): ${e.message}]`;
    }
  }

  async summarize(history: Message[], settings: Settings): Promise<string> {
    const currentModel = settings.model || (settings.model_list?.split(',')[0].trim());
    if(!currentModel) return "Error: No Model";
    const client = new OpenAI({ baseURL: settings.api_base, apiKey: settings.api_key, dangerouslyAllowBrowser: true });
    const historyText = history.map(m => `${m.role}: ${m.content}`).join("\n");
    const res = await client.chat.completions.create({
        model: currentModel,
        messages: [{ role: 'system', content: "请简要总结对话。" }, { role: 'user', content: historyText }],
    });
    return res.choices[0]?.message?.content || "";
  }
}