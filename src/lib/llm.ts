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
    
    // 优先级：角色绑定 > 全局下拉选择 > 列表首位
    const modelFromList = settings.model_list ? settings.model_list.split(',')[0].trim() : "";
    const currentModel = char.model_id || settings.model || modelFromList;

    if (!currentModel || currentModel === "") {
        yield "\n[系统提示]: 请在设置中配置模型。";
        return;
    }

    const dynamicClient = new OpenAI({ baseURL: apiBase, apiKey: apiKey, dangerouslyAllowBrowser: true, maxRetries: 0 });

    const isGroupMode = !!groupCtx;
    const STOP_MARKER = "Ω"; 
    const playerDisplayName = isGroupMode ? (settings.user_name || "User") : "User";

    // --- 1. 视角锁定 & 协议注入 ---
    let systemPrompt = char.description + (char.summary ? `\n\n[记忆摘要]: ${char.summary}` : "");
    systemPrompt += this.scanLorebook(userInputs, lorebookEntries);

    if (isGroupMode) {
      const others = groupCtx.members.filter((m: any) => m.name !== char.name).map((m: any) => m.name);
      systemPrompt = `【群聊剧场模式协议】
- 当前房间：${groupCtx.name}
- 场景背景：${groupCtx.description}
- 你的唯一身份：[${char.name}]
- 玩家(User)身份：[${playerDisplayName}]
- 其他成员：${others.join(', ')}

【输出规范 - 必须严格遵守】
- 仅描述 [${char.name}] 的言行、动作与心理。
- 严禁替 [${playerDisplayName}] 或其他成员代写对白。
- 直接开始描述内容，严禁输出标签前缀（如不要写 "(Log:" 或 "[${char.name}]:"）。
- 必须以 "${STOP_MARKER}" 符号严格结束回复，严禁在符号后续写。

【角色设定】
${systemPrompt}`;
    }

    // --- 2. 逻辑隔离历史记录 (History Isolation) ---
    const messages = history.slice(-15).map(m => {
      let content = m.content;
      if (isGroupMode) {
        // 群聊采用隔离日志格式，打破 AI 的连贯剧本感
        const sender = groupCtx.members.find((c:any) => c.id === m.char_id);
        const name = m.role === 'user' ? playerDisplayName : (sender?.name || 'AI');
        content = `(Log: ${name}) -> ${m.content}`;
      }
      return { role: m.role, content };
    });

    if (userInputs) {
        const processedInput = replaceVariables(userInputs, settings, char);
        messages.push({ 
            role: 'user', 
            content: isGroupMode ? `(Input: ${playerDisplayName}) -> ${processedInput}` : processedInput 
        });
    }

    // 在消息序列末尾增加临门一脚指令，防止 AI 哑巴或输出标签
    if (isGroupMode) {
      messages.push({ role: 'system', content: `[指令] 请开始以 [${char.name}] 的身份回复，不要带任何标签前缀。` });
    }

    // --- 3. 动态拦截正则 (仅在群聊激活) ---
    let stopRegex: RegExp | null = null;
    if (isGroupMode) {
      const forbiddenNames = [playerDisplayName, "User", "用户", "作者", "系统", ...groupCtx.members.filter((m:any)=>m.name!==char.name).map((m:any)=>m.name)];
      const escapedNames = forbiddenNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      // 拦截特征：换行/符号后出现的 (Log: 名字) 或 直接的名字标签
      stopRegex = new RegExp(`(\\n|\\s|[。！？])+(\\(Log:|\\(Input:|\\[|【|#|\\*|\\s)*(${escapedNames})(\\)|\\]|】|\\*|:|：|\\s|\\n)`, 'i');
    }

    try {
      const stream = await dynamicClient.chat.completions.create({
        model: currentModel, 
        messages: [{ role: 'system', content: replaceVariables(systemPrompt, settings, char) }, ...messages],
        stream: true, 
        temperature: settings.temperature || 0.8,
        // API 层停止词：移除 (Log: 以防哑巴。保留物理停止符 Ω 和 User 名
        stop: isGroupMode ? [STOP_MARKER, playerDisplayName + ":"] : ["User:", "\nUser:"] 
      }, { signal: controller?.signal });

      let accumulated = ""; 

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) {
          const newAccumulated = accumulated + text;
          
          // --- 4. 动态巡逻 (前端物理截断) ---
          if (isGroupMode && stopRegex && stopRegex.test(newAccumulated)) {
            const match = newAccumulated.match(stopRegex);
            if (match && match.index !== undefined) {
              const matchPosInCurrent = match.index - accumulated.length;
              const safePart = text.substring(0, matchPosInCurrent);
              if (safePart) yield safePart;
            }
            console.warn(`[剧场防串流] 成功拦截幻觉回复并物理切断连接。`);
            if (controller) controller.abort(); // 立即停止后端生成，节省 Token
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