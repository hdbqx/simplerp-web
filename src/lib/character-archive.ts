import { api, type Character, type CharacterExportPayload, type LorebookV2Entry } from './db';

type ExportCharacterArchiveParams = {
  selectedCharId?: number;
  characters: Character[];
};

type ImportCharacterArchiveParams = {
  selectedCharId?: number;
  text: string;
  characters: Character[];
  loadData: () => Promise<void>;
  onArchiveLoaded: () => Promise<void>;
};

export async function exportCharacterArchive({
  selectedCharId,
  characters,
}: ExportCharacterArchiveParams) {
  if (!selectedCharId) return;
  const character = characters.find((item) => item.id === selectedCharId);
  if (!character) return;

  const [variables, lorebookV2] = await Promise.all([
    api.variables.list(selectedCharId, undefined),
    api.lorebookV2.list(selectedCharId, undefined),
  ]);

  const lorebookById = new Map<number, string>();
  for (const entry of lorebookV2) {
    if (entry.id) lorebookById.set(entry.id, `lore_${entry.id}`);
  }

  const variablesWithStages = await Promise.all(
    variables.map(async (variable, index) => ({
      ref: `var_${variable.id ?? index + 1}`,
      name: variable.name,
      key: variable.key,
      type: variable.type,
      value: variable.value,
      default_value: variable.default_value,
      min_value: variable.min_value,
      max_value: variable.max_value,
      step: variable.step,
      is_persistent: variable.is_persistent,
      is_visible: variable.is_visible,
      description: variable.description,
      tags: variable.tags,
      stages: variable.id
        ? (await api.variableStages.list(variable.id)).map((stage, stageIndex) => ({
            ref: `stage_${stage.id ?? `${index + 1}_${stageIndex + 1}`}`,
            name: stage.name,
            condition: stage.condition,
            priority: stage.priority,
            stage_prompt: stage.stage_prompt,
            effects: stage.effects,
            is_active: stage.is_active,
          }))
        : [],
    })),
  );

  const payload: CharacterExportPayload = {
    version: 1,
    meta: {
      format: 'simplerp-character-archive',
      exported_at: new Date().toISOString(),
    },
    character: {
      name: character.name,
      description: character.description || '',
      first_message: character.first_message || '',
      summary: character.summary || '',
    },
    variables: variablesWithStages,
    lorebook_v2: (lorebookV2 as LorebookV2Entry[]).map((entry, index) => ({
      ref: `lore_${entry.id ?? index + 1}`,
      name: entry.name,
      trigger_mode: entry.trigger_mode,
      keywords: entry.keywords,
      regex_pattern: entry.regex_pattern,
      match_logic: entry.match_logic,
      match_expression: entry.match_expression,
      content: entry.content,
      trigger_condition: entry.trigger_condition,
      priority: entry.priority,
      group_name: entry.group_name,
      category: entry.category,
      position: entry.position,
      insertion_depth: entry.insertion_depth,
      probability: entry.probability,
      use_once: entry.use_once,
      cooldown_messages: entry.cooldown_messages,
      trigger_count: entry.trigger_count,
      scan_depth: entry.scan_depth,
      is_active: entry.is_active,
      is_constant: entry.is_constant,
      sort_order: entry.sort_order,
      parent_ref: entry.parent_id ? lorebookById.get(entry.parent_id) : undefined,
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${character.name || 'character'}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importCharacterArchive({
  selectedCharId,
  text,
  characters,
  loadData,
  onArchiveLoaded,
}: ImportCharacterArchiveParams) {
  if (!selectedCharId) return;

  const trimmedText = text.trim();
  if (!trimmedText) {
    alert('请选择一个 JSON 文件。');
    return;
  }

  let payload: CharacterExportPayload;
  try {
    payload = JSON.parse(trimmedText);
  } catch {
    alert('JSON 解析失败。');
    return;
  }

  if (payload.version !== 1 || !payload.character) {
    alert('角色档案格式不正确。');
    return;
  }

  const targetChar = characters.find((item) => item.id === selectedCharId);
  if (!targetChar) return;

  await api.characters.update(selectedCharId, {
    name: payload.character.name || targetChar.name,
    description: payload.character.description || '',
    first_message: payload.character.first_message || '',
    summary: payload.character.summary || '',
  });

  const existingVars = await api.variables.list(selectedCharId, undefined);
  for (const variable of existingVars) {
    if (variable.id) await api.variables.delete(variable.id);
  }

  const variableIdMap = new Map<string, number>();
  for (const [index, variable] of (payload.variables || []).entries()) {
    const { stages = [], ref, ...variableData } = variable as any;
    void stages;
    const created = await api.variables.add({
      ...variableData,
      id: undefined,
      char_id: selectedCharId,
      room_id: undefined,
    });
    variableIdMap.set(ref || `var_${index + 1}`, created.id);
  }

  for (const [index, variable] of (payload.variables || []).entries()) {
    const variableId = variableIdMap.get(variable.ref || `var_${index + 1}`);
    if (!variableId) continue;
    for (const stage of variable.stages || []) {
      await api.variableStages.add({
        ...stage,
        id: undefined,
        variable_id: variableId,
      });
    }
  }

  const existingLore = await api.lorebookV2.list(selectedCharId, undefined);
  for (const entry of existingLore) {
    if (entry.id) await api.lorebookV2.delete(entry.id);
  }

  const loreIdMap = new Map<string, number>();
  for (const [index, entry] of (payload.lorebook_v2 || []).entries()) {
    const { ref, parent_ref, ...entryData } = entry as any;
    void parent_ref;
    const created = await api.lorebookV2.add({
      ...entryData,
      id: undefined,
      char_id: selectedCharId,
      room_id: undefined,
      parent_id: undefined,
    } as LorebookV2Entry);
    loreIdMap.set(ref || `lore_${index + 1}`, created.id);
  }

  for (const [index, entry] of (payload.lorebook_v2 || []).entries()) {
    const createdId = loreIdMap.get(entry.ref || `lore_${index + 1}`);
    if (!createdId) continue;
    const parentId = entry.parent_ref ? loreIdMap.get(entry.parent_ref) : undefined;
    if (parentId) {
      await api.lorebookV2.update(createdId, { parent_id: parentId });
    }
  }

  await loadData();
  await onArchiveLoaded();
  alert('导入完成。');
}
