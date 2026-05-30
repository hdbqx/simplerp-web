import type { ApiMode, Character, Message, Settings } from './db';

type PromptTemplateOptions = {
  systemPrompt?: string;
  userPromptTemplate?: string;
};

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

  private async createTextCompletion(
    model: string,
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
  ): Promise<string> {
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

  async generateImageTags(description: string, modelName: string, prompts?: PromptTemplateOptions): Promise<string> {
    if (!modelName) return description;

    const systemInstruction =
      prompts?.systemPrompt ||
      '你是图像提示词整理助手。请把用户描述转成适合文生图模型使用的英文标签，只输出英文标签本身，并用逗号分隔。';
    const userPrompt =
      prompts?.userPromptTemplate?.replace('{{input}}', description) || `请将这段描述转换为英文提示词标签：${description}`;

    try {
      return await this.createTextCompletion(modelName, systemInstruction, userPrompt, 0.3);
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
    systemContent: string,
    postHistoryInstruction?: string,
    groupCtx?: any,
    controller?: AbortController,
  ) {
    if (!modelName) {
      yield '\n[错误]：未选择模型。';
      return;
    }

    const isGroupMode = !!groupCtx;
    const stopMarker = '惟';
    const playerDisplayName = settings.user_name || '玩家';

    const chatMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
    history.forEach((m: Message) => {
      if (isGroupMode) {
        const name = m.role === 'user' ? playerDisplayName : char.name || '角色';
        chatMessages.push({ role: m.role, content: `(Log: ${name}) -> ${m.content}` });
      } else {
        chatMessages.push({ role: m.role, content: m.content });
      }
    });

    if (userInputs) {
      chatMessages.push({
        role: 'user',
        content: isGroupMode ? `(Input: ${playerDisplayName}) -> ${userInputs}` : userInputs,
      });
    }

    if (postHistoryInstruction?.trim()) {
      chatMessages.push({
        role: 'system',
        content: postHistoryInstruction.trim(),
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
          systemContent,
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
      if (e.name !== 'AbortError') yield `\n[接口错误]：${e.message}`;
    }
  }

  async summarizeRecent(history: Message[], modelName: string, prompts?: PromptTemplateOptions): Promise<string> {
    if (!modelName) throw new Error('未配置总结模型');

    const facts = history
      .filter((m) => m.content && m.content.trim() && !m.image)
      .map((m) => `${m.role === 'user' ? '玩家' : '角色'}: ${m.content}`)
      .join('\n');

    if (!facts) return '';

    const prompt =
      prompts?.userPromptTemplate?.replace('{{history}}', facts) ||
      `你是一个严谨的剧情记录员。请从以下【最近对话】中提取并概括出“新发生的关键剧情进展”。
要求：
1. 重点提取。
2. 使用简短的条目格式。
3. 只输出新发生的进展，不要输出任何已有的历史背景。

【最近对话】：
${facts}

新进展总结：`;

    return await this.createTextCompletion(
      modelName,
      prompts?.systemPrompt || '你是精简且客观的剧情总结助手。',
      prompt,
      0.3,
    );
  }
}
