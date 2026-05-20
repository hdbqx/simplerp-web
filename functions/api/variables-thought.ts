interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { char_id, room_id, history, user_input, preset_id: bodyPresetId, model: bodyModel } = body;

    // 1. 获取推演引擎配置
    let config: any = {};
    if (char_id) {
      config = await context.env.DB.prepare('SELECT * FROM variable_thought_config WHERE char_id = ?').bind(Number(char_id)).first() || {};
    } else if (room_id) {
      config = await context.env.DB.prepare('SELECT * FROM variable_thought_config WHERE room_id = ?').bind(Number(room_id)).first() || {};
    }

    // 请求体参数覆盖存储的配置
    if (bodyPresetId) config = { ...config, preset_id: bodyPresetId };
    if (bodyModel) config = { ...config, model: bodyModel };

    // 2. 捞出当前上下文绑定的所有变量
    const variables: any[] = [];
    if (char_id) {
      const { results } = await context.env.DB.prepare('SELECT * FROM variables WHERE char_id = ?').bind(Number(char_id)).all();
      variables.push(...(results || []));
    }
    if (room_id) {
      const { results } = await context.env.DB.prepare('SELECT * FROM variables WHERE room_id = ?').bind(Number(room_id)).all();
      variables.push(...(results || []));
    }

    // 如果沙箱里一个变量都没定义，直接返回空更新，不再浪费 Token 跑大模型
    if (variables.length === 0) return Response.json({ updates: [] });

    // 3. 寻找 API 预设
    let preset: any = null;
    if (config.preset_id) {
      preset = await context.env.DB.prepare('SELECT * FROM api_presets WHERE id = ?').bind(config.preset_id).first();
    }

    if (!preset) {
      return new Response('No API preset configured for thought engine', { status: 400 });
    }

    const model = config.model;
    if (!model) return new Response('No model configured for thought engine', { status: 400 });

    // 4. 重写强指引型、高类型鲁棒性黄金级 Thought Prompt 模板
    let thoughtPrompt = config.thought_prompt || `你是一个顶级的“沙箱世界状态与剧情变量推演核心”。你的职责是精细化审计和更新当前角色扮演（RP）世界中的全场景变量状态。

【重要：当前沙箱变量资产清单】
{VARIABLES}

【最近历史对话上下文（按时间正序）】
{HISTORY}

【本次推演的触发动力】
- 用户最新实时输入：${user_input || '（无）'}

------------
【严格更新原则】
1. 连续性审计：仔细阅读最近的对话与用户最新的动力输入。如果对话引发了情感变化、剧情推进、或者玩家提出了明确的规则或设定变更指令（例如：要求不要面貌描写、获得了某物品、NPC列表或关系网变更），你必须立即在 updates 数组中更新对应变量。
2. 强类型对齐：
   - string 类型：直接赋予更新后的完整文本内容（通常用于记录指令、称号、最新提示词等）。
   - number / range 类型：赋予合理的全新绝对数值（例如 85，绝对不要输出 "+5" 或 "-10" 这种相对算式）。
   - boolean 类型：赋予 true 或 false。
   - list / dict 类型：必须输出符合标准 JSON 格式的嵌套结构（数组或对象）。
3. 容错与无动于衷：如果当前对话没有任何内容涉及到某个变量的变动，请不要把该变量写进 updates 列表中。但只要有哪怕一丝微调契机，都要敏锐地捕获并更新。
4. 杜绝幻觉：只允许更新【当前沙箱变量资产清单】中明确存在且提供 Key 的变量！绝对不允许自己发明新的 Key！

【返回格式】
你必须且只能返回一个纯正的 JSON 对象，不要包含任何 Markdown 语法标记（如 \`\`\`json 标记），不要包含任何前导或后置的解释性废话。格式如下：
{{
  "updates": [
    {{
      "key": "这里填写变量的英文Key",
      "value": "这里填写更新后的全新数值/字符串/对象/列表",
      "reason": "请用一句话极其精准地陈述你为什么这样更新它（结合剧情发展或用户的最新明确指令）"
    }}
  ]
}}`;

    // 格式化变量清单和历史纪录注入占位符
    const varsStr = variables.map(v => `- 名字: ${v.name} | 键名(key): ${v.key} | 数据类型: ${v.type} | 当前值: ${v.value || '无'} | 变量描述: ${v.description || '无描述'}`).join('\n');
    const historyStr = (history || []).slice(-20).map((m: any) => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`).join('\n');

    thoughtPrompt = thoughtPrompt.replace('{VARIABLES}', varsStr).replace('{HISTORY}', historyStr);

    const normalizedBase = (preset.api_base || '').trim().replace(/\/+$/, '');
    const trimmedKey = (preset.api_key || '').trim();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (trimmedKey) { headers['Authorization'] = `Bearer ${trimmedKey}`; }

    const mode = preset.api_mode === 'responses' ? 'responses' : 'chat_completions';

    // 5. 调用大模型
    let resultContent = '';
    if (mode === 'responses') {
      const res = await fetch(`${normalizedBase}/responses`, {
        method: 'POST', headers, body: JSON.stringify({
          model,
          input: [{ role: 'user', content: thoughtPrompt }],
          temperature: 0.1 // 压低温度，强迫模型进行高确定性逻辑和格式输出
        })
      });
      const data = await res.json();
      resultContent = data.output_text || data.output?.[0]?.content?.[0]?.text || '';
    } else {
      const res = await fetch(`${normalizedBase}/chat/completions`, {
        method: 'POST', headers, body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: thoughtPrompt }],
          temperature: 0.1
        })
      });
      const data: any = await res.json();
      resultContent = data?.choices?.[0]?.message?.content || '';
    }

    // 6. 强鲁棒性防格式穿透提取 JSON 层
    let updates: any[] = [];
    try {
      let cleanContent = resultContent.trim();
      
      // 剥离可能残存的 ```json ... ``` 标记
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "").trim();
      }

      // 如果依然解析失败，利用跨行正则强行抽取 { 和 } 之间的完整 JSON 体
      let parsed: any = null;
      try {
        parsed = JSON.parse(cleanContent);
      } catch {
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      }

      if (parsed && Array.isArray(parsed.updates)) {
        updates = parsed.updates;
      }
    } catch (e) {
      console.warn('Failed to parse thought response:', resultContent, e);
    }

    // 7. 强类型转化与物理回写数据库
    const now = Date.now();
    for (const update of updates) {
      const variable = variables.find(v => v.key === update.key);
      if (variable) {
        let finalValue = update.value;

        // 根据原变量定义的强类型进行动态对齐，防止类型降级或转义错误
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
          .bind(finalValue, now, variable.id).run();
      }
    }

    return Response.json({ updates });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};