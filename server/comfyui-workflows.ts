import type {
  ComfyWorkflowApi,
  ComfyWorkflowLoraSelection,
  ComfyWorkflowTemplate,
} from '../src/lib/db';

type PreparedComfyWorkflow = {
  workflow: ComfyWorkflowApi;
  outputNodeId: string;
};

type PrepareOptions = {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  sourceImageName?: string;
  denoise?: number;
  loraSelection?: Record<string, ComfyWorkflowLoraSelection>;
};

function cloneWorkflow(workflowApi: ComfyWorkflowApi): ComfyWorkflowApi {
  return JSON.parse(JSON.stringify(workflowApi)) as ComfyWorkflowApi;
}

function writeNodeInput(
  workflow: ComfyWorkflowApi,
  nodeId: string | undefined,
  inputName: string | undefined,
  value: unknown,
) {
  if (!nodeId || !inputName) return;
  const node = workflow[nodeId];
  if (!node?.inputs) return;
  node.inputs[inputName] = value;
}

export function prepareComfyWorkflow(
  template: ComfyWorkflowTemplate | undefined,
  options: PrepareOptions,
): PreparedComfyWorkflow | null {
  if (!template?.workflow_api || !template.output_node_id) return null;

  const workflow = cloneWorkflow(template.workflow_api);

  writeNodeInput(workflow, template.prompt_node_id, template.prompt_input_name, options.prompt);
  writeNodeInput(
    workflow,
    template.negative_prompt_node_id,
    template.negative_prompt_input_name,
    options.negativePrompt || '',
  );
  writeNodeInput(
    workflow,
    template.source_image_node_id,
    template.source_image_input_name,
    options.sourceImageName,
  );
  if (typeof options.width === 'number') {
    writeNodeInput(workflow, template.width_node_id, template.width_input_name, options.width);
  }
  if (typeof options.height === 'number') {
    writeNodeInput(workflow, template.height_node_id, template.height_input_name, options.height);
  }
  if (typeof options.denoise === 'number') {
    writeNodeInput(workflow, template.denoise_node_id, template.denoise_input_name, options.denoise);
  }

  for (const slot of template.lora_slots || []) {
    const selection = options.loraSelection?.[slot.id];
    if (!selection) continue;

    if (selection.lora_name) {
      writeNodeInput(workflow, slot.node_id, slot.lora_name_input, selection.lora_name);
    }

    const enabled = selection.enabled ?? true;
    if (slot.strength_model_input) {
      writeNodeInput(
        workflow,
        slot.node_id,
        slot.strength_model_input,
        enabled ? selection.strength_model ?? slot.default_strength_model ?? 1 : 0,
      );
    }
    if (slot.strength_clip_input) {
      writeNodeInput(
        workflow,
        slot.node_id,
        slot.strength_clip_input,
        enabled ? selection.strength_clip ?? slot.default_strength_clip ?? 1 : 0,
      );
    }
  }

  return {
    workflow,
    outputNodeId: template.output_node_id,
  };
}

export function parseSize(size: unknown): { width?: number; height?: number } {
  if (typeof size !== 'string') return {};
  const match = size.trim().match(/^(\d+)\s*x\s*(\d+)$/i);
  if (!match) return {};
  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

