import OpenAI from 'openai';
import type { Character, Settings, Message, LorebookEntry, ApiMode } from './db';
import { replaceVariables } from './variables';

export class LLMClient {
  private client: OpenAI;
  private mode: ApiMode;

  constructor(apiBase: string, apiKey: string, mode: ApiMode = 'chat_completions') {
    this.client = new OpenAI({
      baseURL: apiBase,
      apiKey,
      dangerouslyAllowBrowser: true,
    });
    this.mode = mode;
  }

  async fetchModels(): Promise<string[]> {
    try {
      const list = await this.client.models.list();
      return list.data.map((m: any) => m.id).sort();
    } catch (e: any) {
      console.error('Fetch Models Error:', e);
      return [];
    }
  }

  private extractResponsesText(res: any): string {
    if (!res) return '';
    if (typeof res.output_text === 'string' && res.output_text.trim()) return res.output_text;

    const output = Array.isArray(res.output) ? res.output : [];
    const texts: string[] = [];
    for (const item of output) {
      const content = Array.isArray(item?.content) ? item.content : [];
      for (const c of content) {
        if (typeof c?.text === 'string') texts.push(c.text);
        else if (typeof c?.output_text === 'string') texts.push(c.output_text);
      }
    }
    return texts.join('');
  }

  private extractResponsesDelta(event: any): string {
    if (!event) return '';

    if (typeof event.delta === 'string') return event.delta;
    if (typeof event.output_text === 'string') return event.output_text;
    if (typeof event.text === 'string') return event.text;

    const delta = event.delta;
    if (delta && typeof delta === 'object') {
      if (typeof delta.text === 'string') return delta.text;
      if (typeof delta.output_text === 'string') return delta.output_text;
      if (Array.isArray(delta.content)) {
        const parts = delta.content
          .map((c: any) => (typeof c?.text === 'string' ? c.text : typeof c?.output_text === 'string' ? c.output_text : ''))
          .filter(Boolean);
        if (parts.length) return parts.join('');
      }
    }

    return '';
  }

  private async createTextCompletion(model: string, systemPrompt: string, userPrompt: string, temperature: number): Promise<string> {
    if (this.mode === 'responses') {
      const res: any = await (this.client as any).responses.create({
        model,
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
      });
      return this.extractResponsesText(res) || userPrompt;
    }

    const res = await this.client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
    });
    return res.choices[0]?.message?.content || userPrompt;
  }

  async generateImageTags(description: string, modelName: string): Promise<string> {
    if (!modelName) return description;
    const systemInstruction = 'You are a specialized Stable Diffusion Prompt Engineer. Convert descriptions into concise comma-separated English keywords. Output ONLY keywords.';
    try {
      return await this.createTextCompletion(modelName, systemInstruction, `Convert this to tags: ${description}`, 0.3);
    } catch {
      return description;
    }
  }

  private scanLorebook(currentInput: string, history: Message[], entries: LorebookEntry[]): string {
    if (!entries || entries.length === 0) return '';
    const contextText = (currentInput + ' ' + history.slice(-10).map(m => m.content).join(' ')).toLowerCase();
    const hits = entries.filter((e: LorebookEntry) => {
      if (!e.isActive || !e.keywords) return false;
      if (e.keywords.trim() === '*') return true;
      return e.keywords.split(/[,，\n]/).some((k: string) => {
        const trimmedK = k.trim().toLowerCase();
        return trimmedK.length > 0 && contextText.includes(trimmedK);
      });
    });
    if (hits.length === 0) return '';
    return `\n\n### [WORLD SETTING / CRITICAL RULES]\n${hits.map((h: LorebookEntry) => h.content).join('\n---\n')}\n`;
  }

  async *chatStream(
    char: Character,
    history: Message[],
    userInputs: string,
    settings: Settings,
    modelName: string,
    lorebookEntries: LorebookEntry[] = [],
    groupCtx?: any,
    controller?: AbortController,
  ) {
    if (!modelName) {
      yield '\n[Error]: Model is not selected.';
      return;
    }

    const isGroupMode = !!groupCtx;
    const stopMarker = '惟';
    const playerDisplayName = settings.user_name || 'User';

    let basePrompt = char.description + (char.summary ? `\n\n[Long-term Memory Archive]:\n${char.summary}` : '');
    const lorebookInjection = this.scanLorebook(userInputs, history, lorebookEntries);

    if (isGroupMode) {
      basePrompt = `【剧场模式】身份：[${char.name}]，玩家：[${playerDisplayName}]。必须以 "${stopMarker}" 结束回复。\n${basePrompt}`;
    }

    const fullSystemContent = replaceVariables(basePrompt + lorebookInjection, settings, char);

    const chatMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    history.slice(-15).forEach((m: Message) => {
      if (isGroupMode) {
        const name = m.role === 'user' ? playerDisplayName : (char.name || 'AI');
        chatMessages.push({ role: m.role, content: `(Log: ${name}) -> ${m.content}` });
      } else {
        chatMessages.push({ role: m.role, content: m.content });
      }
    });

    if (userInputs) {
      chatMessages.push({
        role: 'user',
        content: isGroupMode
          ? `(Input: ${playerDisplayName}) -> ${replaceVariables(userInputs, settings, char)}`
          : replaceVariables(userInputs, settings, char),
      });
    }

    try {
      if (this.mode === 'responses') {
        const input = [
          { role: 'system', content: fullSystemContent },
          ...chatMessages,
        ];

        const stream: any = await (this.client as any).responses.create({
          model: modelName,
          input,
          temperature: settings.temperature || 0.8,
          stop: isGroupMode ? [stopMarker] : ['User:', '\nUser:'],
          stream: true,
        }, { signal: controller?.signal });

        let yieldedDelta = false;
        for await (const event of stream) {
          const delta = this.extractResponsesDelta(event).replaceAll(stopMarker, '');
          if (delta) {
            yieldedDelta = true;
            yield delta;
            continue;
          }

          if (!yieldedDelta && event?.type === 'response.completed') {
            const full = this.extractResponsesText(event.response).replaceAll(stopMarker, '');
            if (full) yield full;
          }
        }
        return;
      }

      const stream = await this.client.chat.completions.create({
        model: modelName,
        messages: [{ role: 'system', content: fullSystemContent }, ...chatMessages],
        stream: true,
        temperature: settings.temperature || 0.8,
        stop: isGroupMode ? [stopMarker] : ['User:', '\nUser:'],
      }, { signal: controller?.signal });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) yield text.replace(stopMarker, '');
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') yield `\n[API Error]: ${e.message}`;
    }
  }

  async summarizeRecent(history: Message[], modelName: string): Promise<string> {
    if (!modelName) throw new Error('未配置总结模型');

    const facts = history
      .filter(m => m.content && m.content.trim() && !m.image)
      .map(m => `${m.role === 'user' ? '玩家' : '角色'}: ${m.content}`)
      .slice(-40)
      .join('\n');

    if (!facts) return '';

    const prompt = `你是一个严谨的剧情记录员。请从以下【最近对话】中提取并概括出“新发生的关键剧情进展”。
要求：
1. 重点提取。
2. 使用简短的条目格式。
3. 只输出新发生的进展，不要输出任何已有的历史背景。

【最近对话】：
${facts}

新进展总结：`;

    return await this.createTextCompletion(modelName, '你是精简且客观的剧情总结助手。', prompt, 0.3);
  }
}
