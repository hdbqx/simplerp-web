interface Env {
  DB: D1Database;
}

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

async function callProvider(
  base: string,
  key: string,
  mode: 'chat_completions' | 'responses',
  model: string,
  prompt: string,
) {
  const normalizedBase = (base || '').trim().replace(/\/+$/, '');
  const trimmedKey = (key || '').trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (trimmedKey) headers.Authorization = `Bearer ${trimmedKey}`;

  if (mode === 'responses') {
    const res = await fetch(`${normalizedBase}/responses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        input: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });
    return await res.json();
  }

  const res = await fetch(`${normalizedBase}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    }),
  });
  return await res.json();
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

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
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
        (await context.env.DB.prepare('SELECT * FROM variable_thought_config WHERE char_id = ?').bind(Number(char_id)).first()) ||
        {};
    } else if (room_id) {
      config =
        (await context.env.DB.prepare('SELECT * FROM variable_thought_config WHERE room_id = ?').bind(Number(room_id)).first()) ||
        {};
    }

    if (bodyPresetId) config = { ...config, preset_id: bodyPresetId };
    if (bodyModel) config = { ...config, model: bodyModel };
    if (bodyThoughtPrompt) config = { ...config, thought_prompt: bodyThoughtPrompt };

    const variables: any[] = [];
    if (char_id) {
      const { results } = await context.env.DB.prepare('SELECT * FROM variables WHERE char_id = ?').bind(Number(char_id)).all();
      variables.push(...(results || []));
    }
    if (room_id) {
      const { results } = await context.env.DB.prepare('SELECT * FROM variables WHERE room_id = ?').bind(Number(room_id)).all();
      variables.push(...(results || []));
    }

    if (variables.length === 0) return Response.json({ updates: [] });

    let preset: any = null;
    if (config.preset_id) {
      preset = await context.env.DB.prepare('SELECT * FROM api_presets WHERE id = ?').bind(config.preset_id).first();
    }

    if (!preset) {
      return new Response('未为变量推演配置 API 预设。', { status: 400 });
    }

    const model = config.model;
    if (!model) return new Response('未为变量推演配置模型。', { status: 400 });

    const varsStr = variables
      .map(
        (v) =>
          `- 名称: ${v.name} | key: ${v.key} | 类型: ${v.type} | 当前值: ${safeStringify(v.value)} | 描述: ${v.description || '无'}`,
      )
      .join('\n');
    const historyStr = (history || [])
      .slice(-20)
      .map((m: any) => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
      .join('\n');

    const thoughtPrompt = normalizeThoughtPrompt(
      config.thought_prompt || DEFAULT_THOUGHT_PROMPT,
      varsStr,
      historyStr,
      user_input || '无',
    );

    const mode = preset.api_mode === 'responses' ? 'responses' : 'chat_completions';
    const result = await callProvider(preset.api_base, preset.api_key, mode, model, thoughtPrompt);
    const resultContent = extractContent(mode, result);

    let updates: any[] = [];
    try {
      updates = parseUpdates(resultContent);
    } catch (e) {
      console.warn('Failed to parse thought response:', resultContent, e);
    }

    const now = Date.now();
    for (const update of updates) {
      const variable = variables.find((v) => v.key === update.key);
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

      await context.env.DB.prepare('UPDATE variables SET value = ?, updated_at = ? WHERE id = ?')
        .bind(finalValue, now, variable.id)
        .run();
    }

    return Response.json({ updates });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
