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

    // --- 逻辑分水岭：单人 vs 多人 ---
    const isGroupMode = !!groupCtx;
    let stopRegex: RegExp | null = null;

    if (isGroupMode) {
      // 仅在多人模式构建黑名单：包含“用户”和“除了AI自己以外的成员”
      const forbiddenNames: string[] = ["User", "用户", "作者", "旁白"]; 
      const otherMembers = groupCtx.members
        .filter((m: any) => m.name !== char.name) // 排除掉正在说话的 AI 自己
        .map((m: any) => m.name);
      
      forbiddenNames.push(...otherMembers);

      // 构建正则：匹配换行后出现的 [名字]、名字:、名字：、*名字* 或 名字+换行
      const escapedNames = forbiddenNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      stopRegex = new RegExp(`\\n(\\[|【|#|\\*|\\s)*(${escapedNames})(\\]|】|\\*|:|：|\\s|\\n)`, 'i');
    }

    let systemPrompt = char.description + (char.summary ? `\n\n[记忆摘要]: ${char.summary}` : "");
    systemPrompt += this.scanLorebook(userInputs, lorebookEntries);

    if (isGroupMode) {
      // 多人模式：强调身份唯一性
      systemPrompt = `【群聊剧场：${groupCtx.name}】\n${groupCtx.description}\n\n` +
               `【你的唯一角色】[${char.name}]\n` +
               `【规则】你现在只能以[${char.name}]的视角进行描写。严禁越权替其他成员发言。当[${char.name}]的行为结束，请立即停止。` +
               `\n\n【你的设定】\n${systemPrompt}`;
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
        // API 层停止词：仅保留最基础的结构化停止词，防止干扰单人创作
        stop: isGroupMode ? ["\n\n", "\n[", "\n【"] : ["\nUser:", "\n用户:"] 
      }, { signal: controller?.signal });

      let accumulated = ""; 

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) {
          const newAccumulated = accumulated + text;
          
          // --- 多人模式下的动态名单拦截 ---
          if (isGroupMode && stopRegex && stopRegex.test(newAccumulated)) {
            const match = newAccumulated.match(stopRegex);
            if (match && match.index !== undefined) {
              // 计算当前 chunk 中安全的部分
              const matchPosInCurrent = match.index - accumulated.length;
              const safePart = text.substring(0, matchPosInCurrent);
              if (safePart) yield safePart;
            }

            console.warn(`[剧场拦截] AI 试图串人设: ${match ? match[2] : '未知'}`);
            if (controller) controller.abort(); // 物理停机，节省火山 Token
            return; 
          }

          // 单人模式直接输出，不进行正则拦截
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