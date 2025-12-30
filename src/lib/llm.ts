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
    const STOP_MARKER = "Ω"; 
    const playerDisplayName = isGroupMode ? (settings.user_name || "User") : "User";

    // --- 1. 视角锁定 (System Prompt) ---
    let systemPrompt = char.description + (char.summary ? `\n\n[记忆摘要]: ${char.summary}` : "");
    systemPrompt += this.scanLorebook(userInputs, lorebookEntries);

    if (isGroupMode) {
      const others = groupCtx.members.filter((m: any) => m.name !== char.name).map((m: any) => m.name);
      systemPrompt = `【剧场模式协议】
1. 当前场景：${groupCtx.description}
2. 你的唯一身份：[${char.name}]
3. 玩家(User)身份：[${playerDisplayName}]
4. 禁令：严禁代写 [${playerDisplayName}] 或 ${others.join(', ')} 的任何对白或内心活动。

【输出规范】
- 仅描述 [${char.name}] 的言行。
- 必须以 "${STOP_MARKER}" 符号严格结束回复。
- 严禁在 "${STOP_MARKER}" 后输出任何字符。

【设定】
${systemPrompt}`;
    }

    // --- 2. 逻辑隔离 (History Serialization) ---
    const messages = history.slice(-15).map(m => {
      let content = m.content;
      if (isGroupMode) {
        const sender = groupCtx.members.find((c:any) => c.id === m.char_id);
        const name = m.role === 'user' ? playerDisplayName : (sender?.name || 'AI');
        content = `(Log: ${name}) -> ${m.content}`;
      }
      return { role: m.role, content };
    });

    if (userInputs) {
        const pInput = replaceVariables(userInputs, settings, char);
        messages.push({ 
            role: 'user', 
            content: isGroupMode ? `(Input: ${playerDisplayName}) -> ${pInput}` : pInput 
        });
    }

    // --- 3. 动态黑名单 (仅群聊模式) ---
    let stopRegex: RegExp | null = null;
    if (isGroupMode) {
      const fNames = [playerDisplayName, "User", "用户", "作者", "系统", ...groupCtx.members.filter((m:any)=>m.name!==char.name).map((m:any)=>m.name)];
      const escaped = fNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      stopRegex = new RegExp(`(\\n|\\s|[。！？])+(\\[|【|#|\\*|\\s)*(${escaped})(\\]|】|\\*|:|：|\\s|\\n)`, 'i');
    }

    try {
      const stream = await dynamicClient.chat.completions.create({
        model: currentModel, 
        messages: [{ role: 'system', content: replaceVariables(systemPrompt, settings, char) }, ...messages],
        stream: true, 
        temperature: settings.temperature || 0.8,
        // 火山停止词优化
        stop: isGroupMode ? [STOP_MARKER, "(Log:"] : ["User:", "\nUser:"] 
      }, { signal: controller?.signal });

      let accumulated = ""; 

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) {
          const newAccumulated = accumulated + text;
          
          if (isGroupMode && stopRegex && stopRegex.test(newAccumulated)) {
            const match = newAccumulated.match(stopRegex);
            if (match && match.index !== undefined) {
              const pos = match.index - accumulated.length;
              const safe = text.substring(0, pos);
              if (safe) yield safe;
            }
            console.warn(`[剧场拦截] 捕获越权扮演行为。`);
            if (controller) controller.abort(); 
            return; 
          }

          accumulated = newAccumulated;
          yield text.replace(STOP_MARKER, "");
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