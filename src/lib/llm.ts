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
    
    const modelFromList = settings.model_list ? settings.model_list.split(',')[0].trim() : "";
    const currentModel = char.model_id || settings.model || modelFromList;

    if (!currentModel || currentModel === "") {
        yield "\n[系统提示]: 未检测到有效的模型名称。请在页面顶部选择模型，或在系统设置中配置模型列表。";
        return;
    }

    const dynamicClient = new OpenAI({ baseURL: apiBase, apiKey: apiKey, dangerouslyAllowBrowser: true, maxRetries: 0 });

    let prompt = char.description + (char.summary ? `\n\n[记忆摘要]: ${char.summary}` : "");
    prompt += this.scanLorebook(userInputs, lorebookEntries);

    if (groupCtx) {
      const membersText = groupCtx.members.map((m: any) => `[${m.name}]: ${m.summary || '...'}`).join('\n');
      prompt = `【剧场背景】\n${groupCtx.description}\n\n【成员列表】\n${membersText}\n\n` +
               `【任务】你现在只能扮演[${char.name}]进行回复。严禁替其他成员发言。\n\n【你的当前身份设定】\n${prompt}`;
    }

    const messages = history.slice(-15).map(m => {
      let content = m.content;
      if (groupCtx) {
        const sender = groupCtx.members.find((c:any) => c.id === m.char_id);
        const name = m.role === 'user' ? 'User' : (sender?.name || 'AI');
        content = `${name}: ${m.content}`;
      }
      return { role: m.role, content };
    });

    if (userInputs) messages.push({ role: 'user', content: replaceVariables(userInputs, settings, char) });

    try {
      const stream = await dynamicClient.chat.completions.create({
        model: currentModel, 
        messages: [{ role: 'system', content: replaceVariables(prompt, settings, char) }, ...messages],
        stream: true, 
        temperature: settings.temperature || 0.8,
        stop: ["\nUser:", "\n用户:", "\n[", "\n#"]
      }, { signal });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) yield text;
      }
    } catch (e: any) {
      if (e.name === 'AbortError') yield "\n[回复中断]";
      else yield `\n[模型调用失败]: ${e.message}\n(请求模型: ${currentModel})`;
    }
  }

  async summarize(history: Message[], settings: Settings): Promise<string> {
    const summaryModel = settings.model || settings.model_list?.split(',')[0].trim();
    if (!summaryModel) throw new Error("未选择总结模型");
    const res = await this.client.chat.completions.create({
      model: summaryModel,
      messages: [{ role: 'system', content: "请精简总结上述对话事实。" }, { role: 'user', content: history.map(m=>m.content).slice(-30).join('\n') }]
    });
    return res.choices[0]?.message?.content || "";
  }
}