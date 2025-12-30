// src/lib/llm.ts 完整覆盖

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
    controller?: AbortController 
  ) {
    const preset = presets.find(p => p.id === char.api_preset_id);
    const apiBase = char.api_base_override || preset?.api_base || settings.api_base;
    const apiKey = char.api_key_override || preset?.api_key || settings.api_key;
    const currentModel = char.model_id || settings.model || (settings.model_list?.split(',')[0].trim());

    if (!currentModel) { yield "\n[系统提示]: 未配置模型。"; return; }

    const dynamicClient = new OpenAI({ baseURL: apiBase, apiKey: apiKey, dangerouslyAllowBrowser: true, maxRetries: 0 });

    const isGroupMode = !!groupCtx;
    let stopRegex: RegExp | null = null;

    if (isGroupMode) {
      // 多人模式黑名单：用户、作者、系统，以及除了AI自己之外的所有人
      const forbiddenNames: string[] = ["User", "用户", "作者", "旁白", "系统", "System"]; 
      const otherMembers = groupCtx.members.filter((m: any) => m.name !== char.name).map((m: any) => m.name);
      forbiddenNames.push(...otherMembers);

      const escapedNames = forbiddenNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      // 优化正则：匹配 (换行/空格/句末标点) + (修饰符) + 名字 + (标识符)
      // 这样即便 AI 不换行直接写 "我不是AI。陈墨:" 也能被拦住
      stopRegex = new RegExp(`(\\n|\\s|[。！？])+(\\[|【|#|\\*|\\s)*(${escapedNames})(\\]|】|\\*|:|：|\\s)`, 'i');
    }

    let systemPrompt = char.description + (char.summary ? `\n\n[记忆摘要]: ${char.summary}` : "");
    systemPrompt += this.scanLorebook(userInputs, lorebookEntries);

    if (isGroupMode) {
      systemPrompt = `【群聊剧场强制指令】
1. 你当前的角色：[${char.name}]
2. 禁止代写角色：${groupCtx.members.filter((m:any)=>m.name!==char.name).map((m:any)=>m.name).join(', ')}
3. 你的输出必须严格限制在 [${char.name}] 的言行内。
4. 严禁使用其他角色的名字作为段落开头或结尾。
5. 每一段描述完成后，必须立即停止。禁止输出 "Next:" 或开启下一位角色的回合。

【设定】
${systemPrompt}`;
    }

    const messages = history.slice(-15).map(m => {
      let content = m.content;
      if (isGroupMode) {
        const sender = groupCtx.members.find((c:any) => c.id === m.char_id);
        const name = m.role === 'user' ? "User" : (sender?.name || 'AI');
        content = `${name}: ${m.content}`;
      }
      return { role: m.role, content };
    });

    if (userInputs) messages.push({ role: 'user', content: replaceVariables(userInputs, settings, char) });

    try {
      const stream = await dynamicClient.chat.completions.create({
        model: currentModel, 
        messages: [{ role: 'system', content: replaceVariables(systemPrompt, settings, char) }, ...messages],
        stream: true, 
        temperature: settings.temperature || 0.8,
        // 火山引擎 4 字符停止词：这里保留结构化停止词
        stop: isGroupMode ? ["\n[", "\n【", "User:"] : ["\nUser:"] 
      }, { signal: controller?.signal });

      let accumulated = ""; 

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) {
          const newAccumulated = accumulated + text;
          
          if (isGroupMode && stopRegex && stopRegex.test(newAccumulated)) {
            const match = newAccumulated.match(stopRegex);
            if (match && match.index !== undefined) {
              const matchPosInCurrent = match.index - accumulated.length;
              const safePart = text.substring(0, matchPosInCurrent);
              if (safePart) yield safePart;
            }
            console.warn(`[剧场截断] 检测到 AI 试图越权回复: ${match ? match[3] : '未知'}`);
            if (controller) controller.abort(); 
            return; 
          }

          accumulated = newAccumulated;
          yield text;
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      yield `\n[模型调用失败]: ${e.message}`;
    }
  }

  async summarize(history: Message[], settings: Settings): Promise<string> {
    const summaryModel = settings.model || (settings.model_list?.split(',')[0].trim());
    if (!summaryModel) throw new Error("未选择总结模型");
    const res = await this.client.chat.completions.create({
      model: summaryModel,
      messages: [{ role: 'system', content: "请精简总结上述对话事实。" }, { role: 'user', content: history.map(m=>m.content).slice(-30).join('\n') }]
    });
    return res.choices[0]?.message?.content || "";
  }
}