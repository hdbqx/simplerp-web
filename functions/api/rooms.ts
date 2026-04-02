interface Env { DB: D1Database; }

function toInt(v: any, fallback?: number) {
  const n = typeof v === 'number' ? v : parseInt(String(v || ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function safeJsonParse(input: string, fallback: any = null) {
  try { return JSON.parse(input); } catch { return fallback; }
}

async function ensureLogRoom(db: D1Database) {
  const logRoom: any = await db.prepare("SELECT id FROM rooms WHERE mode = 'log' LIMIT 1").first();
  if (logRoom?.id) return Number(logRoom.id);
  const now = Date.now();
  const { meta } = await db.prepare(
    "INSERT INTO rooms (name, mode, category, description, rules, state_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind('世界日志', 'log', 'system', '全局事件日志', '', '', now, now).run();
  return meta.last_row_id as number;
}

async function findOrCreateCharacter(db: D1Database, name: string, description: string, firstMessage: string) {
  const row: any = await db.prepare("SELECT id FROM characters WHERE name = ? LIMIT 1").bind(name).first();
  if (row?.id) return Number(row.id);
  const now = Date.now();
  const { meta } = await db.prepare(
    "INSERT INTO characters (name, description, first_message, summary, created_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(name, description, firstMessage, '', now).run();
  return meta.last_row_id as number;
}

async function insertRoomMessage(db: D1Database, roomId: number, content: string, meta?: any) {
  const metaJson = meta ? JSON.stringify(meta) : '';
  await db.prepare(
    "INSERT INTO room_messages (room_id, char_id, sender_type, role, content, image, meta_json, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(roomId, null, 'tool', 'system', content || '', '', metaJson, Date.now()).run();
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type');
  const roomId = url.searchParams.get('room_id');
  if (type === 'members' && roomId) {
    const { results } = await context.env.DB.prepare(
      "SELECT char_id, role, order_index, is_active FROM room_members WHERE room_id = ? ORDER BY order_index ASC, id ASC"
    ).bind(roomId).all();
    return Response.json(results);
  }

  await ensureLogRoom(context.env.DB);
  const { results } = await context.env.DB.prepare("SELECT * FROM rooms ORDER BY id DESC").all();
  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const action = url.searchParams.get('action') || '';
  const body: any = await context.request.json().catch(() => ({}));

  if (action === 'seed_emperor_sim') {
    const existing: any = await context.env.DB.prepare(
      "SELECT id FROM rooms WHERE category = 'emperor_sim' ORDER BY id DESC LIMIT 1"
    ).first();
    if (existing?.id) {
      return Response.json({ ok: true, message: 'Template already exists', room_id: Number(existing.id) });
    }

    const logRoomId = await ensureLogRoom(context.env.DB);

    // Characters
    const emperorId = await findOrCreateCharacter(
      context.env.DB,
      '皇帝',
      '你是帝国的最高统治者。你要在大局、权术、人心与制度之间做决断。你不轻易暴露全部意图，会用试探、封赏、责罚来驱动官僚体系。',
      '众卿平身。今日何事？'
    );
    const zhongshuId = await findOrCreateCharacter(
      context.env.DB,
      '中书令',
      '你掌中书省机务，负责拟制诏令、汇总政务、承接圣意并协调六部。你说话谨慎、条理清晰，擅长把混乱诉求变成可执行的政令。',
      '臣在。请陛下示下要点，臣即拟旨。'
    );
    const libuId = await findOrCreateCharacter(context.env.DB, '吏部尚书', '你主管选官、考课、任免。你既讲制度，也懂人情与派系平衡。', '臣吏部在此。');
    const hubuId = await findOrCreateCharacter(context.env.DB, '户部尚书', '你主管财政、田赋、仓储。你对数字敏感，常以“银子与粮”衡量政策可行性。', '臣户部在此。');
    const libu2Id = await findOrCreateCharacter(context.env.DB, '礼部尚书', '你主管礼制、科举、邦交礼仪。你最在意“名分与秩序”。', '臣礼部在此。');
    const bingbuId = await findOrCreateCharacter(context.env.DB, '兵部尚书', '你主管军政、调兵、边防。你重视情报、兵员、粮草与将领忠诚。', '臣兵部在此。');
    const xingbuId = await findOrCreateCharacter(context.env.DB, '刑部尚书', '你主管刑名、律令、审狱。你强调证据与法度，也懂得用法驭人。', '臣刑部在此。');
    const gongbuId = await findOrCreateCharacter(context.env.DB, '工部尚书', '你主管工程、水利、营造与工匠。你关注工期、材料与事故风险。', '臣工部在此。');
    const empressId = await findOrCreateCharacter(context.env.DB, '皇后', '你代表后宫秩序与宗庙名分。你温和端方，但对权力与家族利益敏感。', '臣妾在。');
    const consortId = await findOrCreateCharacter(context.env.DB, '贵妃', '你深谙人心与情绪，擅长影响陛下判断与宫廷风向。你有自己的算盘。', '妾身参见陛下。');
    const envoyId = await findOrCreateCharacter(context.env.DB, '外邦使臣', '你代表外邦利益，善用礼仪、威胁与交易争取筹码。你会试探帝国底线。', '使臣奉命来朝。');

    // Rooms
    const now = Date.now();
    const roomDefs = [
      { name: '御前议政', mode: 'sandbox', category: 'emperor_sim', description: '皇帝御前议政厅：裁决、拍板、定方向。', rules: '' },
      { name: '中书省', mode: 'agents', category: 'emperor_sim', description: '中书省：承旨、拟诏、分派政务。', rules: '' },
      { name: '六部', mode: 'agents', category: 'emperor_sim', description: '六部：吏、户、礼、兵、刑、工分别落实政令。', rules: '' },
      { name: '后宫', mode: 'agents', category: 'emperor_sim', description: '后宫：人情、名分、家族与风向。', rules: '' },
      { name: '外邦', mode: 'agents', category: 'emperor_sim', description: '外邦：朝贡、议和、贸易与边境摩擦。', rules: '' },
    ] as const;

    const createdRooms: Array<{ id: number; name: string; mode: string }> = [];
    for (const rd of roomDefs) {
      const { meta } = await context.env.DB.prepare(
        "INSERT INTO rooms (name, mode, category, description, rules, state_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(rd.name, rd.mode, rd.category, rd.description, rd.rules, '{}', now, now).run();
      createdRooms.push({ id: meta.last_row_id as number, name: rd.name, mode: rd.mode });
    }

    const roomIdByName = new Map(createdRooms.map(r => [r.name, r.id]));
    const mainRoomId = roomIdByName.get('御前议政')!;
    const zhongshuRoomId = roomIdByName.get('中书省')!;
    const liubuRoomId = roomIdByName.get('六部')!;
    const haremRoomId = roomIdByName.get('后宫')!;
    const foreignRoomId = roomIdByName.get('外邦')!;

    const mappingText = [
      `【房间映射】`,
      `- 御前议政=${mainRoomId}`,
      `- 中书省=${zhongshuRoomId}`,
      `- 六部=${liubuRoomId}`,
      `- 后宫=${haremRoomId}`,
      `- 外邦=${foreignRoomId}`,
      `- 世界日志=${logRoomId}`,
    ].join('\n');

    const setRules = async (roomId: number, rules: string) => {
      await context.env.DB.prepare("UPDATE rooms SET rules = ?, updated_at = ? WHERE id = ?").bind(rules, Date.now(), roomId).run();
    };

    await setRules(mainRoomId, [
      '你是“皇帝模拟器”的房间系统。',
      '回合制：玩家发言后，由 Director 选择 1~2 位角色发言。',
      '状态修改默认走公文(HITL)：update_state 会生成待审批公文。',
      '跨部门流转：请用 send_dispatch，把“圣旨/任务/指令”发到对应房间。',
      mappingText,
    ].join('\n\n'));
    await setRules(zhongshuRoomId, [
      '你是中书省：承旨、拟诏、分派。',
      '收到御前意图后：拟定可执行的诏令条目，并 send_dispatch 给“六部/外邦/后宫”。',
      mappingText,
    ].join('\n\n'));
    await setRules(liubuRoomId, [
      '你是六部：负责把诏令落地为执行方案、风险与资源需求。',
      '请用 commit_memory 记录关键条款，用 send_dispatch 把落实情况回报“御前议政/中书省”。',
      mappingText,
    ].join('\n\n'));
    await setRules(haremRoomId, [
      '你是后宫：名分、人情、家族、舆论与内廷资源。',
      '请用 send_dispatch 告知御前风险、建议或人事操作。',
      mappingText,
    ].join('\n\n'));
    await setRules(foreignRoomId, [
      '你是外邦：议和、贸易、边境摩擦与情报试探。',
      '请用 send_dispatch 把诉求与筹码发回御前或中书省。',
      mappingText,
    ].join('\n\n'));

    // Members
    const membersByRoom: Array<{ roomId: number; members: Array<{ charId: number; role: string }> }> = [
      {
        roomId: mainRoomId,
        members: [
          { charId: emperorId, role: 'agent' },
          { charId: zhongshuId, role: 'agent' },
          { charId: libuId, role: 'agent' },
          { charId: hubuId, role: 'agent' },
          { charId: libu2Id, role: 'agent' },
          { charId: bingbuId, role: 'agent' },
          { charId: xingbuId, role: 'agent' },
          { charId: gongbuId, role: 'agent' },
          { charId: empressId, role: 'agent' },
          { charId: consortId, role: 'agent' },
          { charId: envoyId, role: 'agent' },
        ],
      },
      {
        roomId: zhongshuRoomId,
        members: [
          { charId: zhongshuId, role: 'agent' },
          { charId: emperorId, role: 'agent' },
        ],
      },
      {
        roomId: liubuRoomId,
        members: [
          { charId: libuId, role: 'agent' },
          { charId: hubuId, role: 'agent' },
          { charId: libu2Id, role: 'agent' },
          { charId: bingbuId, role: 'agent' },
          { charId: xingbuId, role: 'agent' },
          { charId: gongbuId, role: 'agent' },
          { charId: zhongshuId, role: 'agent' },
        ],
      },
      {
        roomId: haremRoomId,
        members: [
          { charId: empressId, role: 'agent' },
          { charId: consortId, role: 'agent' },
          { charId: emperorId, role: 'agent' },
        ],
      },
      {
        roomId: foreignRoomId,
        members: [
          { charId: envoyId, role: 'agent' },
          { charId: emperorId, role: 'agent' },
          { charId: zhongshuId, role: 'agent' },
          { charId: libu2Id, role: 'agent' },
        ],
      },
    ];

    for (const { roomId, members } of membersByRoom) {
      let idx = 0;
      for (const m of members) {
        await context.env.DB.prepare(
          "INSERT INTO room_members (room_id, char_id, role, order_index, is_active) VALUES (?, ?, ?, ?, ?)"
        ).bind(roomId, m.charId, m.role, idx, 1).run();
        idx++;
      }
    }

    // Seed world_state mapping
    const worldRow: any = await context.env.DB.prepare("SELECT state_json FROM world_state WHERE id = 1").first();
    const world = safeJsonParse(String(worldRow?.state_json || '{}'), {});
    world.emperor_sim = {
      version: 1,
      rooms: { main: mainRoomId, zhongshu: zhongshuRoomId, liubu: liubuRoomId, harem: haremRoomId, foreign: foreignRoomId, log: logRoomId },
      characters: { emperor: emperorId, zhongshu: zhongshuId, libu: libuId, hubu: hubuId, libu2: libu2Id, bingbu: bingbuId, xingbu: xingbuId, gongbu: gongbuId, empress: empressId, consort: consortId, envoy: envoyId },
    };
    await context.env.DB.prepare("UPDATE world_state SET state_json = ?, updated_at = ? WHERE id = 1")
      .bind(JSON.stringify(world), Date.now()).run();

    await insertRoomMessage(context.env.DB, mainRoomId, `【皇帝模拟器已创建】\n- 建议从本房间开始发言。\n- 跨房间流转请使用 send_dispatch。\n\n${mappingText}`, { template: 'emperor_sim' });
    await insertRoomMessage(context.env.DB, logRoomId, `【系统】已创建“皇帝模拟器”模板（御前议政/中书省/六部/后宫/外邦）。`, { template: 'emperor_sim' });

    return Response.json({ ok: true, room_ids: Object.fromEntries([...roomIdByName.entries()]) });
  }

  // default: create room
  const name = String(body?.name || 'New Room');
  const mode = String(body?.mode || 'agents');
  const category = String(body?.category || '');
  const description = String(body?.description || '');
  const rules = String(body?.rules || '');
  const stateJson = typeof body?.state_json === 'string' ? body.state_json : '';
  const now = Date.now();
  const { meta } = await context.env.DB.prepare(
    "INSERT INTO rooms (name, mode, category, description, rules, state_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(name, mode, category, description, rules, stateJson, now, now).run();
  return Response.json({ id: meta.last_row_id });
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type');
  const body: any = await context.request.json();
  const now = Date.now();

  if (type === 'members') {
    const roomId = toInt(body?.room_id);
    const members = Array.isArray(body?.members) ? body.members : [];
    if (!roomId) return new Response('Missing room_id', { status: 400 });

    await context.env.DB.prepare("DELETE FROM room_members WHERE room_id = ?").bind(roomId).run();

    let idx = 0;
    for (const m of members) {
      const charId = toInt(m?.char_id);
      if (!charId) continue;
      const role = String(m?.role || 'agent');
      const orderIndex = toInt(m?.order_index, idx) ?? idx;
      const isActive = m?.is_active === 0 || m?.is_active === false ? 0 : 1;
      await context.env.DB.prepare(
        "INSERT INTO room_members (room_id, char_id, role, order_index, is_active) VALUES (?, ?, ?, ?, ?)"
      ).bind(roomId, charId, role, orderIndex, isActive).run();
      idx++;
    }
    return new Response('Updated');
  }

  const id = toInt(body?.id);
  if (!id) return new Response('Missing id', { status: 400 });

  const name = body?.name !== undefined ? String(body.name) : undefined;
  const mode = body?.mode !== undefined ? String(body.mode) : undefined;
  const category = body?.category !== undefined ? String(body.category) : undefined;
  const description = body?.description !== undefined ? String(body.description) : undefined;
  const rules = body?.rules !== undefined ? String(body.rules) : undefined;
  const stateJson = body?.state_json !== undefined ? String(body.state_json) : undefined;

  await context.env.DB.prepare(
    "UPDATE rooms SET name = COALESCE(?, name), mode = COALESCE(?, mode), category = COALESCE(?, category), description = COALESCE(?, description), rules = COALESCE(?, rules), state_json = COALESCE(?, state_json), updated_at = ? WHERE id = ?"
  ).bind(name ?? null, mode ?? null, category ?? null, description ?? null, rules ?? null, stateJson ?? null, now, id).run();

  return new Response('Updated');
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const id = new URL(context.request.url).searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400 });

  await context.env.DB.prepare("DELETE FROM room_members WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM room_agent_config WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM room_turns WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM room_messages WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM room_summaries WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM room_state_snapshots WHERE room_id = ?").bind(id).run();
  await context.env.DB.prepare("DELETE FROM rooms WHERE id = ?").bind(id).run();

  return new Response('Deleted');
};

