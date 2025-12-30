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
    const STOP_MARKER = "Ω"; // 选一个生僻且短的符号作为物理停止锚点

    // --- 1. 视角锁定 & 物理锚定 (Prompt) ---
    let systemPrompt = char.description + (char.summary ? `\n\n[记忆摘要]: ${char.summary}` : "");
    systemPrompt += this.scanLorebook(userInputs, lorebookEntries);

    if (isGroupMode) {
      const others = groupCtx.members.filter((m: any) => m.name !== char.name).map((m: any) => m.name);
      
      systemPrompt = `【群聊/剧场模式指令】
1. 当前场景：${groupCtx.description}
2. 你的唯一身份：[${char.name}]
3. 严格禁令：严禁代写、模拟或提及以下角色的对话：${others.join(', ')} 以及 User。

【输出协议】
- 回复必须且仅包含 [${char.name}] 的言行描述。
- 回复结束时，必须立即输出一个 "${STOP_MARKER}" 符号作为终止符。
- 严禁在 "${STOP_MARKER}" 之后输出任何内容。

【设定】
${systemPrompt}`;
    }

    // --- 2. 逻辑隔离 (History Formatting) ---
    const messages = history.slice(-15).map(m => {
      let content = m.content;
      if (isGroupMode) {
        const sender = groupCtx.members.find((c:any) => c.id === m.char_id);
        const name = m.role === 'user' ? "User" : (sender?.name || 'AI');
        // 将剧本格式 "A: ..." 改为日志格式 "(Record: A) -> ..."
        // 这能打破 AI “写续集”的思维惯性
        content = `(Past_Log: ${name}) -> ${m.content}`;
      }
      return { role: m.role, content };
    });

    if (userInputs) {
        const processedInput = replaceVariables(userInputs, settings, char);
        messages.push({ 
            role: 'user', 
            content: isGroupMode ? `(Current_Input: User) -> ${processedInput}` : processedInput 
        });
    }

    // --- 3. 动态黑名单构建 (仅群聊有效) ---
    let stopRegex: RegExp | null = null;
    if (isGroupMode) {
      const forbiddenNames = ["User", "用户", "作者", "系统", ...groupCtx.members.filter((m:any)=>m.name!==char.name).map((m:any)=>m.name)];
      const escapedNames = forbiddenNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      stopRegex = new RegExp(`(\\n|\\s|[。！？])+(\\[|【|#|\\*|\\s)*(${escapedNames})(\\]|】|\\*|:|：|\\s)`, 'i');
    }

    try {
      const stream = await dynamicClient.chat.completions.create({
        model: currentModel, 
        messages: [{ role: 'system', content: replaceVariables(systemPrompt, settings, char) }, ...messages],
        stream: true, 
        temperature: settings.temperature || 0.8,
        // --- 4. 物理停止词 (API-side) ---
        // 只有群聊才会开启 Ω 停止词
        stop: isGroupMode ? [STOP_MARKER, "User:", "(Past_Log"] : ["User:", "\nUser:"] 
      }, { signal: controller?.signal });

      let accumulated = ""; 

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) {
          const newAccumulated = accumulated + text;
          
          // --- 5. 动态巡逻 (Frontend Safe-Guard) ---
          if (isGroupMode && stopRegex && stopRegex.test(newAccumulated)) {
            const match = newAccumulated.match(stopRegex);
            if (match && match.index !== undefined) {
              const matchPosInCurrent = match.index - accumulated.length;
              const safePart = text.substring(0, matchPosInCurrent);
              if (safePart) yield safePart;
            }
            console.warn(`[防串流巡逻] 发现违规角色扮演，已执行物理切断。`);
            if (controller) controller.abort(); 
            return; 
          }

          accumulated = newAccumulated;
          // 过滤掉输出中可能出现的停止符 Ω
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