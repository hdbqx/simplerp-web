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
你面对的是结构化状态，不是文学创作。请优先追踪真正重要的变化，而不是机械地随便改几个无关紧要的值。

【当前变量资产清单】{VARIABLES}

【最近对话历史】{HISTORY}

【本轮触发输入】{{USER_INPUT}}

更新原则：
1. 只能更新上面已经存在的变量 key，严禁编造新 key。
2. 如果最近对话里出现了明确的状态变化、关系变化、资源变化、地点变化、身份暴露、任务推进、能力解锁、伤势/情绪/欲望变化，就应该更新对应变量；不要因为变量多就返回空 updates。
3. 只更新“确实发生变化”的变量，但要优先挑选关键变化；微小噪音、口头寒暄、没有落地的假设不要更新。
4. 当存在多个变化时，优先保留最影响后续剧情推演的 1 到 8 项。
5. string 类型输出完整新值。
6. number 或 range 类型输出更新后的绝对数值，不要输出 +1、-2 这种相对变化。
7. boolean 类型只输出 true 或 false。
8. dict 与 list 类型必须输出合法 JSON 结构；如果只改动其中一部分，也要输出修改后的完整结构，保留未变化字段。
9. 如果某个复杂对象已经发生实质变化，不要偷懒写空对象、空数组或只改无关字段。
10. reason 用一句简洁中文说明“为什么这个变量现在应该变成这个值”。
11. 如果确实没有任何值得记录的变化，再返回空数组。

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

function parseStoredValue(value: any) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
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
        `当前值: ${compactValue(parseStoredValue(variable.value))}`,
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

function normalizeUpdateValue(variable: any, rawValue: any) {
  if (variable.type === 'string') {
    return typeof rawValue === 'object' ? JSON.stringify(rawValue) : String(rawValue ?? '');
  }

  if (variable.type === 'number' || variable.type === 'range') {
    return String(Number(rawValue) || 0);
  }

  if (variable.type === 'boolean') {
    return rawValue === true || rawValue === 'true' || rawValue === 1 ? '1' : '0';
  }

  return typeof rawValue === 'object' ? JSON.stringify(rawValue) : String(rawValue ?? '');
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
  } catch (error) {
    console.warn('Failed to parse thought response:', resultContent, error);
  }

  const now = Date.now();
  const appliedUpdates: Array<{
    id: number;
    key: string;
    name: string;
    type: string;
    previous_value: any;
    value: any;
    reason: string;
  }> = [];

  for (const update of updates) {
    const variable = variables.find((item) => item.key === update.key);
    if (!variable?.id) continue;

    const previousValue = parseStoredValue(variable.value);
    const serializedNextValue = normalizeUpdateValue(variable, update.value);
    const nextValue = parseStoredValue(serializedNextValue);
    if (safeStringify(previousValue) === safeStringify(nextValue)) {
      continue;
    }

    await env.DB.prepare('UPDATE variables SET value = ?, updated_at = ? WHERE id = ?')
      .bind(serializedNextValue, now, variable.id)
      .run();

    appliedUpdates.push({
      id: Number(variable.id),
      key: variable.key,
      name: variable.name,
      type: variable.type,
      previous_value: previousValue,
      value: nextValue,
      reason: typeof update.reason === 'string' ? update.reason : '',
    });
  }

  return {
    updates: appliedUpdates.map((item) => ({
      key: item.key,
      value: item.value,
      reason: item.reason,
    })),
    applied_updates: appliedUpdates,
    skipped: appliedUpdates.length === 0 ? 'no_changes' : undefined,
  };
}

export type { ThoughtRequestBody };
