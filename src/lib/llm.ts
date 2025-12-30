import OpenAI from 'openai';
import type { Character, Settings, Message, LorebookEntry } from './db';
import { replaceVariables } from './variables'; 

export class LLMClient {
  private defaultClient: OpenAI;

  constructor(settings: Settings) {
    this.defaultClient = new OpenAI({ baseURL: settings.api_base, apiKey: settings.api_key, dangerouslyAllowBrowser: true });
  }

  private scanLorebook(text: string, entries: LorebookEntry[]): string {
    const hits = entries.filter(e => e.isActive && e.keywords.split(/[,，]/).some(k => text.includes(k.trim())));
    return hits.length ? `\n\n=== [Lorebook Triggered] ===\n${hits.map(h => h.content).join('\n')}` : "";
  }

  async *chatStream(
    char: Character, history: Message[], userInputs: string, settings: Settings, 
    lorebookEntries: LorebookEntry[] = [], groupCtx?: { name: string, description: string, members: Character[] }
  ) {
    const apiBase = char.api_base_override || settings.api_base;
    const apiKey = char.api_key_override || settings.api_key;
    const currentModel = char.model_id || settings.model || settings.model_list?.split(',')[0].trim();

    if (!currentModel) { yield "\n[系统错误: 未找到可用模型]"; return; }

    const client = new OpenAI({ baseURL: apiBase, apiKey: apiKey, dangerouslyAllowBrowser: true });

    let prompt = char.description + (char.summary ? `\n\n[长期记忆]: ${char.summary}` : "");
    prompt += this.scanLorebook(userInputs, lorebookEntries);

    if (groupCtx) {
      const membersText = groupCtx.members.map(m => `[${m.name}]: ${m.summary || '...'}`).join('\n');
      prompt = `【剧场背景】\n${groupCtx.description}\n\n【成员列表】\n${membersText}\n\n【当前身份】\n${prompt}`;
    }

    const messages = history.slice(-20).map(m => {
      let content = m.content;
      if (groupCtx) {
        const name = m.role === 'user' ? 'User' : (groupCtx.members.find(c => c.id === m.char_id)?.name || 'AI');
        content = `${name}: ${m.content}`;
      }
      return { role: m.role, content };
    });

    if (userInputs) messages.push({ role: 'user', content: replaceVariables(userInputs, settings, char) });

    try {
      const stream = await client.chat.completions.create({
        model: currentModel!, messages: [{ role: 'system', content: replaceVariables(prompt, settings, char) }, ...messages],
        stream: true, temperature: settings.temperature || 0.8
      });
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) yield text;
      }
    } catch (e: any) { yield `\n[模型错误]: ${e.message}`; }
  }

  async summarize(history: Message[], settings: Settings): Promise<string> {
    const model = settings.model || settings.model_list?.split(',')[0].trim() || 'gpt-4o-mini';
    const res = await this.defaultClient.chat.completions.create({
      model: model,
      messages: [{ role: 'system', content: "请精简总结上述对话事实。" }, { role: 'user', content: history.map(m=>m.content).slice(-30).join('\n') }]
    });
    return res.choices[0]?.message?.content || "";
  }
}