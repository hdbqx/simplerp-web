import OpenAI from 'openai';
import type { Character, Settings, Message, LorebookEntry, ApiPreset } from './db';
import { replaceVariables } from './variables'; 

export class LLMClient {
  private client: OpenAI;

  constructor(settings: Settings) {
    this.client = new OpenAI({ baseURL: settings.api_base, apiKey: settings.api_key, dangerouslyAllowBrowser: true });
  }

  private scanLorebook(text: string, entries: LorebookEntry[]): string {
    const hits = entries.filter(e => e.isActive && e.keywords.split(/[,，]/).some(k => text.includes(k.trim())));
    return hits.length ? `\n\n=== [世界书注入] ===\n${hits.map(h => h.content).join('\n')}` : "";
  }

  async *chatStream(
    char: Character, history: Message[], userInputs: string, settings: Settings, 
    lorebookEntries: LorebookEntry[] = [], groupCtx?: any, presets: ApiPreset[] = [],
    signal?: AbortSignal
  ) {
    const preset = presets.find(p => p.id === char.api_preset_id);
    const apiBase = char.api_base_override || preset?.api_base || settings.api_base;
    const apiKey = char.api_key_override || preset?.api_key || settings.api_key;
    const currentModel = char.model_id || settings.model || settings.model_list?.split(',')[0].trim();

    if (!currentModel) { yield "\n[系统错误: 未找到可用模型]"; return; }

    const dynamicClient = new OpenAI({ baseURL: apiBase, apiKey: apiKey, dangerouslyAllowBrowser: true });

    // 1. 强化 Prompt 约束
    let prompt = char.description + (char.summary ? `\n\n[记忆摘要]: ${char.summary}` : "");
    prompt += this.scanLorebook(userInputs, lorebookEntries);

    if (groupCtx) {
      const membersText = groupCtx.members.map((m: any) => `[${m.name}]: ${m.summary || '...'}`).join('\n');
      prompt = `【剧场背景】\n${groupCtx.description}\n\n【成员列表】\n${membersText}\n\n` +
               `【任务】你只能扮演[${char.name}]进行回复。严禁输出其他成员的名字或替其发言。\n` +
               `如果你认为对话已结束，请直接停止输出。\n\n【你的当前身份设定】\n${prompt}`;
    }

    // 2. 优化停止词逻辑 (解决 400 错误)
    // 强制限制在 4 个以内，优先防止 User 串号
    let stopWords = ["User:", "用户:"];
    if (groupCtx) {
      // 动态加入其他成员的名字作为停止符，但受限于总数 4 个
      const otherMembers = groupCtx.members
        .filter((m: any) => m.id !== char.id)
        .slice(0, 2); // 只取前两个其他成员名字，确保总数不超标
      
      otherMembers.forEach((m: any) => {
        stopWords.push(`${m.name}:`);
      });
    }
    // 最终截取前4个，确保万无一失
    const finalStopWords = stopWords.slice(0, 4);

    const messages = history.slice(-20).map(m => {
      let content = m.content;
      if (groupCtx) {
        const name = m.role === 'user' ? 'User' : (groupCtx.members.find((c:any) => c.id === m.char_id)?.name || 'AI');
        content = `${name}: ${m.content}`;
      }
      return { role: m.role, content };
    });

    if (userInputs) messages.push({ role: 'user', content: replaceVariables(userInputs, settings, char) });

    try {
      const stream = await dynamicClient.chat.completions.create({
        model: currentModel!, 
        messages: [{ role: 'system', content: replaceVariables(prompt, settings, char) }, ...messages],
        stream: true, 
        temperature: settings.temperature || 0.8,
        stop: finalStopWords // 使用修正后的 4 个停止词
      }, { signal });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) yield text;
      }
    } catch (e: any) {
      if (e.name === 'AbortError') yield "\n[回复已中断]";
      else yield `\n[错误]: ${e.message}`;
    }
  }

  async summarize(history: Message[], settings: Settings): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: settings.model || 'gpt-4o-mini',
      messages: [{ role: 'system', content: "请精简总结上述对话事实。" }, { role: 'user', content: history.map(m=>m.content).slice(-30).join('\n') }]
    });
    return res.choices[0]?.message?.content || "";
  }
}