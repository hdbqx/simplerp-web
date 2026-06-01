type ThoughtRequestBody = {
  char_id?: number;
  room_id?: number;
  history?: Array<{ role?: string; content?: string }>;
  user_input?: string;
  preset_id?: number;
  model?: string;
  thought_prompt?: string;
};

interface VariableThoughtEnv {
  DB: D1Database;
}

const PROVIDER_TIMEOUT_MS = 45_000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_CHARS = 5000;
const MAX_VALUE_CHARS = 420;
const MAX_DESCRIPTION_CHARS = 160;
const MAX_VARIABLES_CHARS = 12_000;

const DEFAULT_THOUGHT_PROMPT = `你是“角色扮演沙箱变量推演核心”。你的职责是根据最近对话，审计并更新当前沙箱中的变量状态。

【当前变量资产清单】
{VARIABLES}

【最近对话历史】
{HISTORY}

【本轮触发输入】
{{USER_INPUT}}

更新原则：
1. 只允许更新上面已存在的变量 key，绝对禁止发明新 key。
2. 只在确实发生变化时输出更新；没有变化的变量不要写入 updates。
3. string 类型输出完整新值。
4. number 或 range 类型输出更新后的绝对数值，不要输出 +1、-5 这种相对变化。
5. boolean 类型输出 true 或 false。
6. dict 与 list 类型必须输出合法 JSON 结构。
7. reason 要用一句中文精确说明你为何这样改。
8. 你面对的是后端数据，不需要文学修辞，只要准确。

你必须只返回一个 JSON 对象，不要输出 Markdown，不要输出解释：
{
  "updates": [
    {
      "key": "变量 key",
      "value": "更新后的值",
      "reason": "更新原因"
    }
  ]
}`;

function safeStringify(value: any) {
  if (value === null || value === undefined || value === '') return '空';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeThoughtPrompt(template: string, variablesText: string, historyText: string, userInput: string) {
  return template
    .replaceAll('{VARIABLES}', variablesText)
    .replaceAll('{HISTORY}', historyText)
    .replaceAll('{{USER_INPUT}}', userInput || '无');
}

function truncateText(value: string, maxChars: number) {
  if (!value) return '';
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 15))} ...[已截断]`;
}

function compactValue(value: any) {
  return truncateText(safeStringify(value), MAX_VALUE_CHARS);
}

function compactVariablesText(variables: any[]) {
  const fullText = variables
    .map((variable) =>
      [
        `- 名称: ${variable.name}`,
        `key: ${variable.key}`,
        `类型: ${variable.type}`,
        `当前值: ${compactValue(variable.value)}`,
        `描述: ${truncateText(variable.description || '无', MAX_DESCRIPTION_CHARS)}`,
      ].join(' | '),
    )
    .join('\n');

  return truncateText(fullText, MAX_VARIABLES_CHARS);
}

function compactHistoryText(history: Array<{ role?: string; content?: string }>) {
  const lines = (history || [])
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => `${message.role === 'user' ? '用户' : 'AI'}: ${truncateText(message.content || '', 700)}`);

  return truncateText(lines.join('\n'), MAX_HISTORY_CHARS);
}

async function callProvider(
  base: string,
  key: string,
  mode: 'chat_completions' | 'responses',
  model: string,
  prompt: string,
  timeoutMs = PROVIDER_TIMEOUT_MS,
) {
  const normalizedBase = (base || '').trim().replace(/\/+$/, '');
  const trimmedKey = (key || '').trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (trimmedKey) headers.Authorization = `Bearer ${trimmedKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('变量推演模型调用超时')), timeoutMs);

  try {
    if (mode === 'responses') {
      const res = await fetch(`${normalizedBase}/responses`, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model,
          input: [{ role: 'user', content: prompt }],
          temperature: 0.1,
        }),
      });

      if (!res.ok) {
        throw new Error(`变量推演模型请求失败：${res.status} ${await res.text()}`);
      }
      return await res.json();
    }

    const res = await fetch(`${normalizedBase}/chat/completions`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });
    if (!res.ok) {
      throw new Error(`变量推演模型请求失败：${res.status} ${await res.text()}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function extractContent(mode: 'chat_completions' | 'responses', data: any) {
  if (mode === 'responses') {
    return data?.output_text || data?.output?.[0]?.content?.[0]?.text || '';
  }
  return data?.choices?.[0]?.message?.content || '';
}

function parseUpdates(resultContent: string) {
  let cleanContent = resultContent.trim();
  if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
  }

  let parsed: any = null;
  try {
    parsed = JSON.parse(cleanContent);
  } catch {
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  }

  return parsed && Array.isArray(parsed.updates) ? parsed.updates : [];
}

export async function runVariableThought(env: VariableThoughtEnv, body: ThoughtRequestBody) {
  const {
    char_id,
    room_id,
    history,
    user_input,
    preset_id: bodyPresetId,
    model: bodyModel,
    thought_prompt: bodyThoughtPrompt,
  } = body;

  let config: any = {};
  if (char_id) {
    config =
      (await env.DB.prepare('SELECT * FROM variable_thought_config WHERE char_id = ?').bind(Number(char_id)).first()) ||
      {};
  } else if (room_id) {
    config =
      (await env.DB.prepare('SELECT * FROM variable_thought_config WHERE room_id = ?').bind(Number(room_id)).first()) ||
      {};
  }

  if (bodyPresetId) config = { ...config, preset_id: bodyPresetId };
  if (bodyModel) config = { ...config, model: bodyModel };
  if (bodyThoughtPrompt) config = { ...config, thought_prompt: bodyThoughtPrompt };

  const variables: any[] = [];
  if (char_id) {
    const { results } = await env.DB.prepare('SELECT * FROM variables WHERE char_id = ?').bind(Number(char_id)).all();
    variables.push(...(results || []));
  }
  if (room_id) {
    const { results } = await env.DB.prepare('SELECT * FROM variables WHERE room_id = ?').bind(Number(room_id)).all();
    variables.push(...(results || []));
  }

  if (variables.length === 0) return { updates: [], skipped: 'no_variables' };

  let preset: any = null;
  if (config.preset_id) {
    preset = await env.DB.prepare('SELECT * FROM api_presets WHERE id = ?').bind(config.preset_id).first();
  }

  if (!preset) {
    throw new Error('未为变量推演配置 API 预设。');
  }

  const model = config.model;
  if (!model) throw new Error('未为变量推演配置模型。');

  const varsStr = compactVariablesText(variables);
  const historyStr = compactHistoryText(history || []);
  const thoughtPrompt = normalizeThoughtPrompt(
    config.thought_prompt || DEFAULT_THOUGHT_PROMPT,
    varsStr,
    historyStr,
    user_input || '无',
  );

  const mode = preset.api_mode === 'responses' ? 'responses' : 'chat_completions';

  let result: any;
  try {
    result = await callProvider(preset.api_base, preset.api_key, mode, model, thoughtPrompt);
  } catch (error: any) {
    const message = String(error?.message || error);
    if (message.includes('超时') || error?.name === 'AbortError') {
      return { updates: [], skipped: 'timeout' };
    }
    throw error;
  }

  const resultContent = extractContent(mode, result);

  let updates: any[] = [];
  try {
    updates = parseUpdates(resultContent);
  } catch (e) {
    console.warn('Failed to parse thought response:', resultContent, e);
  }

  const now = Date.now();
  for (const update of updates) {
    const variable = variables.find((item) => item.key === update.key);
    if (!variable) continue;

    let finalValue = update.value;
    if (variable.type === 'string') {
      finalValue = typeof finalValue === 'object' ? JSON.stringify(finalValue) : String(finalValue ?? '');
    } else if (variable.type === 'number' || variable.type === 'range') {
      finalValue = String(Number(finalValue) || 0);
    } else if (variable.type === 'boolean') {
      finalValue = finalValue === true || finalValue === 'true' || finalValue === 1 ? '1' : '0';
    } else {
      finalValue = typeof finalValue === 'object' ? JSON.stringify(finalValue) : String(finalValue ?? '');
    }

    await env.DB.prepare('UPDATE variables SET value = ?, updated_at = ? WHERE id = ?')
      .bind(finalValue, now, variable.id)
      .run();
  }

  return { updates, skipped: updates.length === 0 ? 'no_changes' : undefined };
}

export type { ThoughtRequestBody };
