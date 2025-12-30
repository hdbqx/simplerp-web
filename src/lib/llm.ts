// src/lib/llm.ts

import OpenAI from 'openai';
import type { Character, Settings, Message, LorebookEntry, ApiPreset } from './db';
import { replaceVariables } from './variables'; 

export class LLMClient {
  private client: OpenAI;

  constructor(settings: Settings) {
    this.client = new OpenAI({ baseURL: settings.api_base, apiKey: settings.api_key, dangerouslyAllowBrowser: true });
  }

  private scanLorebook(text: string, entries: LorebookEntry[]): string {
    const hits = entries.filter((e: LorebookEntry) => e.isActive && e.keywords.split(/[,，]/).some((k: string) => text.includes(k.trim())));
    return hits.length ? `\n\n=== [世界书注入] ===\n${hits.map((h: LorebookEntry) => h.content).join('\n')}` : "";
  }

  async *chatStream(
    char: Character, history: Message[], userInputs: string, settings: Settings, 
    lorebookEntries: LorebookEntry[] = [], groupCtx?: any, presets: ApiPreset[] = [],
    controller?: AbortController 
  ) {
    const preset = presets.find((p: ApiPreset) => p.id === char.api_preset_id);
    const apiBase = char.api_base_override || preset?.api_base || settings.api_base;
    const apiKey = char.api_key_override || preset?.api_key || settings.api_key;
    const currentModel = char.model_id || settings.model || (settings.model_list?.split(',')[0].trim());

    if (!currentModel) { yield "\n[系统提示]: 未配置模型。"; return; }

    const dynamicClient = new OpenAI({ baseURL: apiBase, apiKey: apiKey, dangerouslyAllowBrowser: true, maxRetries: 0 });

    const isGroupMode = !!groupCtx;
    const STOP_MARKER = "Ω"; 
    const playerDisplayName = isGroupMode ? (settings.user_name || "User") : "User";

    // --- 1. System Prompt ---
    let systemPromptRaw = char.description + (char.summary ? `\n\n[记忆摘要]: ${char.summary}` : "");
    systemPromptRaw += this.scanLorebook(userInputs, lorebookEntries);

    if (isGroupMode) {
      const others = groupCtx.members.filter((m: any) => m.name !== char.name).map((m: any) => m.name);
      systemPromptRaw = `【剧场协议】身份：[${char.name}]，玩家：[${playerDisplayName}]，严禁替他人发言。必须以 "${STOP_MARKER}" 结束回复。\n${systemPromptRaw}`;
    }

    const systemPrompt = replaceVariables(systemPromptRaw, settings, char);

    // --- 2. 构造消息流 ---
    // 明确类型以符合 OpenAI 要求
    const chatMessages: Message[] = [];

    // 添加历史记录
    history.slice(-15).forEach((m: Message) => {
      if (isGroupMode) {
        const sender = groupCtx.members.find((c: any) => c.id === m.char_id);
        const name = m.role === 'user' ? playerDisplayName : (sender?.name || 'AI');
        chatMessages.push({ ...m, content: `(Log: ${name}) -> ${m.content}` });
      } else {
        chatMessages.push(m);
      }
    });

    // 添加当前输入
    if (userInputs) {
        const pInput = replaceVariables(userInputs, settings, char);
        chatMessages.push({ 
            role: 'user', 
            content: isGroupMode ? `(Input: ${playerDisplayName}) -> ${pInput}` : pInput,
            timestamp: Date.now()
        });
    }

    // 添加群聊引导（System 角色）
    if (isGroupMode) {
      chatMessages.push({ 
        role: 'system', 
        content: `请直接开始描述 [${char.name}] 的言行，严禁带标签前缀。`,
        timestamp: Date.now()
      });
    }

    // --- 3. 动态拦截正则 ---
    let stopRegex: RegExp | null = null;
    if (isGroupMode) {
      const fNames = [playerDisplayName, "User", "用户", "作者", "系统", ...groupCtx.members.filter((m:any)=>m.name!==char.name).map((m:any)=>m.name)];
      const escaped = fNames.map((n: string) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      stopRegex = new RegExp(`(\\n|\\s|[。！？])+(\\(Log:|\\(Input:|\\[|【|#|\\*|\\s)*(${escaped})(\\)|\\]|】|\\*|:|：|\\s|\\n)`, 'i');
    }

    try {
      const stream = await dynamicClient.chat.completions.create({
        model: currentModel, 
        messages: [{ role: 'system', content: systemPrompt }, ...chatMessages.map(m => ({ role: m.role, content: m.content }))] as any,
        stream: true, 
        temperature: settings.temperature || 0.8,
        stop: isGroupMode ? [STOP_MARKER, playerDisplayName + ":"] : ["User:", "\nUser:"] 
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
      messages: [{ role: 'system', content: "请精简总结上述对话事实。" }, { role: 'user', content: history.map((m: Message) => m.content).slice(-30).join('\n') }]
    });
    return res.choices[0]?.message?.content || "";
  }
}