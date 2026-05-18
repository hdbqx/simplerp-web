interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { char_id, room_id, history, user_input } = body;

    let config: any = null;
    if (char_id) {
      config = await context.env.DB.prepare('SELECT * FROM variable_thought_config WHERE char_id = ?').bind(Number(char_id)).first();
    }
    if (!config && room_id) {
      config = await context.env.DB.prepare('SELECT * FROM variable_thought_config WHERE room_id = ?').bind(Number(room_id)).first();
    }

    if (!config) return new Response('No thought config found', { status: 400 });

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

    let thoughtPrompt = config.thought_prompt || `你是一个剧情分析师。请分析最近的对话，根据角色的反应和对话内容，更新相关的变量值。

变量定义：
{VARIABLES}

最近对话：
{HISTORY}

请只返回一个JSON，格式为：
{
  "updates": [
    { "key": "变量key", "value": 新值, "reason": "原因" }
  ]
}`;

    const varsStr = variables.map(v => `- ${v.name} (${v.key}): ${v.description || '无描述'}`).join('\n');
    const historyStr = (history || []).slice(-20).map((m: any) => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`).join('\n');

    thoughtPrompt = thoughtPrompt.replace('{VARIABLES}', varsStr).replace('{HISTORY}', historyStr);
    if (user_input) {
      thoughtPrompt += `\n\n用户最新输入：${user_input}`;
    }

    if (!preset) {
      return new Response('No API preset configured', { status: 400 });
    }

    const model = config.model;
    if (!model) return new Response('No model configured', { status: 400 });

    const normalizedBase = (preset.api_base || '').trim().replace(/\/+$/, '');
    const trimmedKey = (preset.api_key || '').trim();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (trimmedKey) { headers['Authorization'] = `Bearer ${trimmedKey}`; }

    const mode = preset.api_mode === 'responses' ? 'responses' : 'chat_completions';

    let resultContent = '';
    if (mode === 'responses') {
      const res = await fetch(`${normalizedBase}/responses`, {
        method: 'POST', headers, body: JSON.stringify({
          model,
          input: [{ role: 'user', content: thoughtPrompt }],
          temperature: 0.7
        })
      });
      const data = await res.json();
      resultContent = data.output_text || data.output?.[0]?.content?.[0]?.text || '';
    } else {
      const res = await fetch(`${normalizedBase}/chat/completions`, {
        method: 'POST', headers, body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: thoughtPrompt }],
          temperature: 0.7
        })
      });
      const data = await res.json();
      resultContent = data.choices?.[0]?.message?.content || '';
    }

    let updates: any[] = [];
    try {
      const jsonMatch = resultContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        updates = parsed.updates || [];
      }
    } catch (e) {
      console.warn('Failed to parse thought response');
    }

    for (const update of updates) {
      const variable = variables.find(v => v.key === update.key);
      if (variable) {
        await context.env.DB.prepare('UPDATE variables SET value = ?, updated_at = ? WHERE id = ?')
          .bind(JSON.stringify(update.value), Date.now(), variable.id).run();
      }
    }

    return Response.json({ updates });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
