import OpenAI from 'openai';
import type { Character, Settings, Message, LorebookEntry, ApiPreset } from './db';
import { replaceVariables } from './variables'; 

export class LLMClient {
  private client: OpenAI;
  private model: string;

  constructor(settings: Settings) {
    this.client = new OpenAI({ baseURL: settings.api_base, apiKey: settings.api_key, dangerouslyAllowBrowser: true });
    // 默认模型逻辑：当前选择 > 列表第一个
    this.model = settings.model || settings.model_list?.split(',')[0].trim() || "";
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
    // 严格模型选择：角色专用 > 全局选择 > 全局列表首位
    const currentModel = char.model_id || settings.model || settings.model_list?.split(',')[0].trim();

    if (!currentModel) { yield "\n[系统错误]: 未检测到模型设置，请在全局设置中配置模型列表。"; return; }

    const dynamicClient = new OpenAI({ baseURL: apiBase, apiKey: apiKey, dangerouslyAllowBrowser: true });

    let prompt = char.description + (char.summary ? `\n\n[记忆摘要]: ${char.summary}` : "");
    prompt += this.scanLorebook(userInputs, lorebookEntries);

    if (groupCtx) {
      const membersText = groupCtx.members.map((m: any) => `[${m.name}]: ${m.summary || '...'}`).join('\n');
      prompt = `【剧场背景】\n${groupCtx.description}\n\n【成员列表】\n${membersText}\n\n` +
               `【任务】你现在只能扮演[${char.name}]进行回复。严禁输出其他成员的名字标签或替其发言。\n` +
               `如果你认为发言已结束，请直接停止输出。\n\n【你的当前身份设定】\n${prompt}`;
    }

    // 物理阻断停止词，防止 AI 伪造对话
    const finalStopWords = ["\nUser", "\n用户", "\n[", "\n#"];

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
        stop: finalStopWords
      }, { signal });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) yield text;
      }
    } catch (e: any) {
      if (e.name === 'AbortError') yield "\n[回复已中断]";
      else yield `\n[模型调用错误]: ${e.message}`;
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