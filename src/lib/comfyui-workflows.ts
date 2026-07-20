import type {
  ComfyWorkflowApi,
  ComfyWorkflowApiNode,
  ComfyWorkflowLoraSelection,
  ComfyWorkflowLoraSlot,
  ComfyWorkflowMode,
  ComfyWorkflowTemplate,
  Settings,
} from './db';

type NodeOption = {
  id: string;
  label: string;
  classType: string;
  inputKeys: string[];
};

type WorkflowImportResult = {
  workflow: ComfyWorkflowTemplate;
  nodeOptions: NodeOption[];
};

function isApiNode(value: unknown): value is ComfyWorkflowApiNode {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const maybeNode = value as Record<string, unknown>;
  return typeof maybeNode.class_type === 'string' && !!maybeNode.inputs && typeof maybeNode.inputs === 'object';
}

export function isComfyWorkflowApi(value: unknown): value is ComfyWorkflowApi {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(isApiNode);
}

export function extractComfyWorkflowApi(value: unknown): ComfyWorkflowApi {
  if (isComfyWorkflowApi(value)) return value;

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (isComfyWorkflowApi(record.prompt)) return record.prompt;
    if (isComfyWorkflowApi(record.workflow_api)) return record.workflow_api;
    if (isComfyWorkflowApi(record.api)) return record.api;
  }

  throw new Error('暂只支持导入 ComfyUI 的 API 格式工作流 JSON。请在 ComfyUI 中使用 Save (API Format) 导出。');
}

export function getComfyWorkflowNodeOptions(workflowApi: ComfyWorkflowApi): NodeOption[] {
  return Object.entries(workflowApi)
    .map(([id, node]) => ({
      id,
      label: `${id} · ${node.class_type}`,
      classType: node.class_type,
      inputKeys: Object.keys(node.inputs || {}),
    }))
    .sort((a, b) => Number(a.id) - Number(b.id));
}

function findFirstNodeId(
  workflowApi: ComfyWorkflowApi,
  predicate: (nodeId: string, node: ComfyWorkflowApiNode) => boolean,
): string {
  return Object.entries(workflowApi).find(([nodeId, node]) => predicate(nodeId, node))?.[0] || '';
}

function findTextNodeIds(workflowApi: ComfyWorkflowApi): string[] {
  return Object.entries(workflowApi)
    .filter(([, node]) => typeof node.inputs?.text === 'string')
    .map(([id]) => id);
}

function detectPromptNodeId(workflowApi: ComfyWorkflowApi): string {
  const textNodeIds = findTextNodeIds(workflowApi);
  return textNodeIds[0] || '';
}

function detectNegativePromptNodeId(workflowApi: ComfyWorkflowApi, promptNodeId: string): string {
  const textNodeIds = findTextNodeIds(workflowApi).filter((id) => id !== promptNodeId);
  return textNodeIds.find((id) => {
    const text = String(workflowApi[id]?.inputs?.text || '').trim().toLowerCase();
    return text.includes('negative') || text.includes('worst quality') || text.includes('bad');
  }) || '';
}

function detectOutputNodeId(workflowApi: ComfyWorkflowApi): string {
  return findFirstNodeId(workflowApi, (_nodeId, node) => /saveimage/i.test(node.class_type));
}

function detectSourceImageNodeId(workflowApi: ComfyWorkflowApi): string {
  return findFirstNodeId(
    workflowApi,
    (_nodeId, node) => /loadimage/i.test(node.class_type) || typeof node.inputs?.image === 'string',
  );
}

function detectDenoiseNodeId(workflowApi: ComfyWorkflowApi): string {
  return findFirstNodeId(workflowApi, (_nodeId, node) => typeof node.inputs?.denoise === 'number');
}

function detectWidthNodeId(workflowApi: ComfyWorkflowApi): string {
  return findFirstNodeId(workflowApi, (_nodeId, node) => typeof node.inputs?.width === 'number');
}

function detectHeightNodeId(workflowApi: ComfyWorkflowApi): string {
  return findFirstNodeId(workflowApi, (_nodeId, node) => typeof node.inputs?.height === 'number');
}

function detectLoraSlots(workflowApi: ComfyWorkflowApi): ComfyWorkflowLoraSlot[] {
  return Object.entries(workflowApi)
    .filter(([, node]) => typeof node.inputs?.lora_name === 'string')
    .map(([nodeId, node], index) => ({
      id: `lora-slot-${nodeId}`,
      node_id: nodeId,
      label: `LoRA 槽位 ${index + 1} · ${node.class_type}`,
      lora_name_input: 'lora_name',
      strength_model_input: typeof node.inputs?.strength_model === 'number' ? 'strength_model' : undefined,
      strength_clip_input: typeof node.inputs?.strength_clip === 'number' ? 'strength_clip' : undefined,
      default_lora_name: typeof node.inputs?.lora_name === 'string' ? node.inputs.lora_name : undefined,
      default_strength_model:
        typeof node.inputs?.strength_model === 'number' ? node.inputs.strength_model : undefined,
      default_strength_clip:
        typeof node.inputs?.strength_clip === 'number' ? node.inputs.strength_clip : undefined,
    }));
}

function buildWorkflowName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '') || 'ComfyUI 工作流';
}

export function importComfyWorkflowJson(fileName: string, rawText: string): WorkflowImportResult {
  const parsed = JSON.parse(rawText);
  const workflowApi = extractComfyWorkflowApi(parsed);
  const promptNodeId = detectPromptNodeId(workflowApi);
  const sourceImageNodeId = detectSourceImageNodeId(workflowApi);

  if (!promptNodeId) {
    throw new Error('导入失败：未自动识别到可写入正向提示词的文本节点。');
  }

  const workflow: ComfyWorkflowTemplate = {
    id: `comfywf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: buildWorkflowName(fileName),
    mode: sourceImageNodeId ? 'img2img' : 'txt2img',
    workflow_api: workflowApi,
    prompt_node_id: promptNodeId,
    prompt_input_name: 'text',
    negative_prompt_node_id: detectNegativePromptNodeId(workflowApi, promptNodeId) || undefined,
    negative_prompt_input_name: detectNegativePromptNodeId(workflowApi, promptNodeId) ? 'text' : undefined,
    source_image_node_id: sourceImageNodeId || undefined,
    source_image_input_name: sourceImageNodeId ? 'image' : undefined,
    output_node_id: detectOutputNodeId(workflowApi),
    width_node_id: detectWidthNodeId(workflowApi) || undefined,
    width_input_name: detectWidthNodeId(workflowApi) ? 'width' : undefined,
    height_node_id: detectHeightNodeId(workflowApi) || undefined,
    height_input_name: detectHeightNodeId(workflowApi) ? 'height' : undefined,
    denoise_node_id: detectDenoiseNodeId(workflowApi) || undefined,
    denoise_input_name: detectDenoiseNodeId(workflowApi) ? 'denoise' : undefined,
    lora_slots: detectLoraSlots(workflowApi),
    imported_at: Date.now(),
  };

  if (!workflow.output_node_id) {
    throw new Error('导入失败：未自动识别到 SaveImage 输出节点，请换用包含保存节点的 API 工作流。');
  }

  return {
    workflow,
    nodeOptions: getComfyWorkflowNodeOptions(workflowApi),
  };
}

export function getComfyWorkflows(settings?: Settings, mode?: ComfyWorkflowMode): ComfyWorkflowTemplate[] {
  const items = Array.isArray(settings?.comfyui_workflows) ? settings!.comfyui_workflows : [];
  if (!mode) return items;
  return items.filter((item) => item.mode === mode);
}

export function findComfyWorkflow(settings: Settings | undefined, workflowId?: string): ComfyWorkflowTemplate | undefined {
  if (!workflowId) return undefined;
  return getComfyWorkflows(settings).find((item) => item.id === workflowId);
}

export function getDefaultComfyWorkflowId(
  settings: Settings | undefined,
  surface: 'quick' | 'studio',
  mode: ComfyWorkflowMode,
): string {
  if (!settings) return '';

  if (surface === 'quick') {
    return mode === 'img2img'
      ? settings.comfyui_quick_img2img_workflow_id || ''
      : settings.comfyui_quick_txt2img_workflow_id || '';
  }

  return mode === 'img2img'
    ? settings.comfyui_studio_img2img_workflow_id || ''
    : settings.comfyui_studio_txt2img_workflow_id || '';
}

export function getComfyLoraCatalog(settings?: Settings, workflow?: ComfyWorkflowTemplate): string[] {
  const manualList = (settings?.comfyui_lora_catalog || '')
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const workflowList = (workflow?.lora_slots || [])
    .map((slot) => slot.default_lora_name?.trim() || '')
    .filter(Boolean);
  return Array.from(new Set([...manualList, ...workflowList])).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

export function buildInitialLoraSelections(
  workflow?: ComfyWorkflowTemplate,
): Record<string, ComfyWorkflowLoraSelection> {
  const entries = (workflow?.lora_slots || []).map((slot) => [
    slot.id,
    {
      enabled: Boolean(slot.default_lora_name),
      lora_name: slot.default_lora_name || '',
      strength_model: slot.default_strength_model,
      strength_clip: slot.default_strength_clip,
    },
  ]);
  return Object.fromEntries(entries);
}

export function cloneLoraSelections(
  selections: Record<string, ComfyWorkflowLoraSelection> | undefined,
): Record<string, ComfyWorkflowLoraSelection> {
  if (!selections) return {};
  return JSON.parse(JSON.stringify(selections)) as Record<string, ComfyWorkflowLoraSelection>;
}

