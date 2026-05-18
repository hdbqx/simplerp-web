import type { Character, Settings, Message, ApiMode } from './db';

export class LLMClient {
  private apiBase: string;
  private apiKey: string;
  private mode: ApiMode;

  constructor(apiBase: string, apiKey: string, mode: ApiMode = 'chat_completions') {
    this.apiBase = apiBase;
    this.apiKey = apiKey;
    this.mode = mode;
  }

  async fetchModels(): Promise<string[]> {
    try {
      const res = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'models',
          apiBase: this.apiBase,
          apiKey: this.apiKey,
        }),
      });
      if (!res.ok) return [];
      const data: any = await res.json();
      return Array.isArray(data?.models) ? data.models : [];
    } catch (e: any) {
      console.error('Fetch Models Error:', e);
      return [];
    }
  }

  private async createTextCompletion(model: string, systemPrompt: string, userPrompt: string, temperature: number): Promise<string> {
    const res = await fetch('/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'complete',
        apiBase: this.apiBase,
        apiKey: this.apiKey,
        mode: this.mode,
        model,
        systemPrompt,
        userPrompt,
        temperature,
      }),
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    const data: any = await res.json();
    return data?.content || userPrompt;
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

  private extractStreamText(payload: any): string {
    if (!payload) return '';

    const delta = payload?.choices?.[0]?.delta?.content;
    if (typeof delta === 'string') return delta;

    const message = payload?.choices?.[0]?.message?.content;
    if (typeof message === 'string') return message;

    if (payload?.type === 'response.output_text.delta' && typeof payload?.delta === 'string') {
      return payload.delta;
    }

    if (payload?.delta && typeof payload.delta?.text === 'string') {
      return payload.delta.text;
    }

    return '';
  }

  private async *readSseStream(res: Response): AsyncGenerator<string> {
    const reader = res.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/g);
      buffer = events.pop() || '';

      for (const event of events) {
        const dataLines = event
          .split(/\r?\n/g)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim());

        if (dataLines.length === 0) continue;

        const rawData = dataLines.join('\n');
        if (rawData === '[DONE]') return;

        try {
          const payload = JSON.parse(rawData);
          const text = this.extractStreamText(payload);
          if (text) yield text;
        } catch {
          // Ignore non-JSON heartbeat lines.
        }
      }
    }
  }

  async *chatStream(
    char: Character,
    history: Message[],
    userInputs: string,
    settings: Settings,
    modelName: string,
    systemContent: string, // [修改] 直接接收外部组装好的完整 System Prompt
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

    const chatMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    history.forEach((m: Message) => {
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
          ? `(Input: ${playerDisplayName}) -> ${userInputs}`
          : userInputs,
      });
    }

    try {
      const res = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller?.signal,
        body: JSON.stringify({
          action: 'chat',
          apiBase: this.apiBase,
          apiKey: this.apiKey,
          mode: this.mode,
          model: modelName,
          systemContent: systemContent, // 使用传入的完整 Prompt
          chatMessages,
          temperature: settings.temperature || 0.8,
          stop: isGroupMode ? [stopMarker] : ['User:', '\nUser:'],
          stream: true,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') && res.body) {
        for await (const chunk of this.readSseStream(res)) {
          if (chunk) yield chunk.replaceAll(stopMarker, '');
        }
        return;
      }

      const data: any = await res.json();
      const content = (data?.content || '').replaceAll(stopMarker, '');
      if (content) yield content;
    } catch (e: any) {
      if (e.name !== 'AbortError') yield `\n[API Error]: ${e.message}`;
    }
  }

  async summarizeRecent(history: Message[], modelName: string): Promise<string> {
    if (!modelName) throw new Error('未配置总结模型');

    const facts = history
      .filter(m => m.content && m.content.trim() && !m.image)
      .map(m => `${m.role === 'user' ? '玩家' : '角色'}: ${m.content}`)
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