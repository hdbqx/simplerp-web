import { Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { ComfyWorkflowTemplate, Settings } from '../../lib/db';
import { api } from '../../lib/db';
import { getComfyWorkflowNodeOptions, importComfyWorkflowJson } from '../../lib/comfyui-workflows';

type Props = {
  settings: Settings;
  onSettingsChange: (patch: Partial<Settings>) => void;
};

type WorkflowKey =
  | 'comfyui_quick_txt2img_workflow_id'
  | 'comfyui_quick_img2img_workflow_id'
  | 'comfyui_studio_txt2img_workflow_id'
  | 'comfyui_studio_img2img_workflow_id';

const DEFAULT_WORKFLOWS: Array<{ key: WorkflowKey; label: string; mode: 'txt2img' | 'img2img' }> = [
  { key: 'comfyui_quick_txt2img_workflow_id', label: '快捷生图 · 文生图默认工作流', mode: 'txt2img' },
  { key: 'comfyui_quick_img2img_workflow_id', label: '快捷生图 · 图生图默认工作流', mode: 'img2img' },
  { key: 'comfyui_studio_txt2img_workflow_id', label: '工作台 · 文生图默认工作流', mode: 'txt2img' },
  { key: 'comfyui_studio_img2img_workflow_id', label: '工作台 · 图生图默认工作流', mode: 'img2img' },
];

export function ComfyWorkflowManager({ settings, onSettingsChange }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [loadingLoras, setLoadingLoras] = useState(false);
  const workflows = Array.isArray(settings.comfyui_workflows) ? settings.comfyui_workflows : [];

  const parsedLoraCatalog = useMemo(
    () =>
      (settings.comfyui_lora_catalog || '')
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    [settings.comfyui_lora_catalog],
  );

  const updateWorkflows = (nextWorkflows: ComfyWorkflowTemplate[]) => {
    onSettingsChange({ comfyui_workflows: nextWorkflows });
  };

  const updateWorkflow = (workflowId: string, patch: Partial<ComfyWorkflowTemplate>) => {
    updateWorkflows(
      workflows.map((workflow) => (workflow.id === workflowId ? { ...workflow, ...patch } : workflow)),
    );
  };

  const deleteWorkflow = (workflowId: string) => {
    const nextWorkflows = workflows.filter((workflow) => workflow.id !== workflowId);
    const patch: Partial<Settings> = { comfyui_workflows: nextWorkflows };
    for (const item of DEFAULT_WORKFLOWS) {
      if (settings[item.key] === workflowId) patch[item.key] = '';
    }
    onSettingsChange(patch);
  };

  const importWorkflowFile = async (file: File) => {
    try {
      const text = await file.text();
      const { workflow } = importComfyWorkflowJson(file.name, text);
      updateWorkflows([...workflows, workflow]);
    } catch (error: any) {
      alert(error?.message || '导入工作流失败。');
    }
  };

  const fetchOnlineLoras = async () => {
    if (!settings.hf_keys?.trim()) {
      alert('请先填写 ComfyUI 穿透地址。');
      return;
    }

    setLoadingLoras(true);
    try {
      const fetched = await api.comfyui.listLoras(settings.hf_keys.trim());
      const merged = Array.from(new Set([...parsedLoraCatalog, ...fetched])).sort((a, b) =>
        a.localeCompare(b, 'zh-CN'),
      );
      onSettingsChange({ comfyui_lora_catalog: merged.join('\n') });
      alert(`已拉取 ${fetched.length} 个 LoRA 名称。`);
    } catch (error: any) {
      alert(error?.message || 'LoRA 列表拉取失败。');
    } finally {
      setLoadingLoras(false);
    }
  };

  const renderNodeSelect = (
    workflow: ComfyWorkflowTemplate,
    value: string | undefined,
    onChange: (value: string) => void,
    label: string,
    allowEmpty = false,
  ) => {
    const nodeOptions = getComfyWorkflowNodeOptions(workflow.workflow_api);
    return (
      <label className="form-control">
        <span className="label py-1 text-[11px] font-bold">{label}</span>
        <select
          className="select select-bordered select-sm"
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
        >
          {allowEmpty && <option value="">不使用</option>}
          {nodeOptions.map((option) => (
            <option key={`${workflow.id}-${option.id}`} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  };

  return (
    <div className="space-y-4 rounded-xl border border-base-300 bg-base-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-primary">ComfyUI 工作流库</div>
          <div className="mt-1 text-[11px] opacity-70">
            目前支持导入 ComfyUI 的 API 格式工作流 JSON。导入后可以为快捷生图和工作台分别指定默认工作流，并暴露 LoRA 槽位到前端选择。
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-sm btn-outline"
            onClick={() => void fetchOnlineLoras()}
            disabled={loadingLoras || !settings.hf_keys?.trim()}
          >
            <span className={loadingLoras ? 'loading loading-spinner loading-xs' : ''} />
            在线拉取 LoRA
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => fileRef.current?.click()}>
            <Upload size={14} />
            导入 API 工作流
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void importWorkflowFile(file);
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {DEFAULT_WORKFLOWS.map((item) => {
          const options = workflows.filter((workflow) => workflow.mode === item.mode);
          return (
            <label key={item.key} className="form-control rounded-lg border border-base-300 bg-base-200/40 p-3">
              <span className="label py-1 text-xs font-bold">{item.label}</span>
              <select
                className="select select-bordered select-sm"
                value={settings[item.key] || ''}
                onChange={(event) => onSettingsChange({ [item.key]: event.target.value } as Partial<Settings>)}
              >
                <option value="">使用内置兼容工作流</option>
                {options.map((workflow) => (
                  <option key={`${item.key}-${workflow.id}`} value={workflow.id}>
                    {workflow.name}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>

      <label className="form-control">
        <span className="label py-1 text-xs font-bold">LoRA 候选列表（手动维护，逗号或换行分隔）</span>
        <textarea
          className="textarea textarea-bordered h-24 text-xs"
          value={settings.comfyui_lora_catalog || ''}
          onChange={(event) => onSettingsChange({ comfyui_lora_catalog: event.target.value })}
          placeholder="把常用 LoRA 名称贴在这里，快捷生图和工作台会直接给出可选项。"
        />
      </label>

      <div className="space-y-3">
        {workflows.length === 0 && (
          <div className="rounded-lg border border-dashed border-base-300 px-4 py-8 text-center text-xs opacity-60">
            还没有导入任何 ComfyUI API 工作流
          </div>
        )}

        {workflows.map((workflow) => {
          const nodeOptions = getComfyWorkflowNodeOptions(workflow.workflow_api);
          return (
            <div key={workflow.id} className="rounded-xl border border-base-300 bg-base-200/40 p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      className="input input-bordered input-sm font-bold"
                      value={workflow.name}
                      onChange={(event) => updateWorkflow(workflow.id, { name: event.target.value })}
                    />
                    <select
                      className="select select-bordered select-sm"
                      value={workflow.mode}
                      onChange={(event) =>
                        updateWorkflow(workflow.id, {
                          mode: event.target.value as ComfyWorkflowTemplate['mode'],
                        })
                      }
                    >
                      <option value="txt2img">文生图</option>
                      <option value="img2img">图生图</option>
                    </select>
                  </div>
                  <div className="text-[11px] opacity-60">
                    节点数 {nodeOptions.length}，LoRA 槽位 {(workflow.lora_slots || []).length}，导入时间{' '}
                    {workflow.imported_at ? new Date(workflow.imported_at).toLocaleString('zh-CN') : '未知'}
                  </div>
                </div>
                <button className="btn btn-sm btn-error btn-outline" onClick={() => deleteWorkflow(workflow.id)}>
                  <Trash2 size={14} />
                  删除
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {renderNodeSelect(
                  workflow,
                  workflow.prompt_node_id,
                  (value) => updateWorkflow(workflow.id, { prompt_node_id: value }),
                  '正向提示词节点',
                )}

                {renderNodeSelect(
                  workflow,
                  workflow.output_node_id,
                  (value) => updateWorkflow(workflow.id, { output_node_id: value }),
                  '输出保存节点',
                )}

                {renderNodeSelect(
                  workflow,
                  workflow.negative_prompt_node_id,
                  (value) => updateWorkflow(workflow.id, { negative_prompt_node_id: value || undefined }),
                  '负向提示词节点',
                  true,
                )}

                {renderNodeSelect(
                  workflow,
                  workflow.source_image_node_id,
                  (value) => updateWorkflow(workflow.id, { source_image_node_id: value || undefined }),
                  '原图载入节点',
                  true,
                )}

                {renderNodeSelect(
                  workflow,
                  workflow.width_node_id,
                  (value) => updateWorkflow(workflow.id, { width_node_id: value || undefined }),
                  '宽度写入节点',
                  true,
                )}

                {renderNodeSelect(
                  workflow,
                  workflow.height_node_id,
                  (value) => updateWorkflow(workflow.id, { height_node_id: value || undefined }),
                  '高度写入节点',
                  true,
                )}

                {renderNodeSelect(
                  workflow,
                  workflow.denoise_node_id,
                  (value) => updateWorkflow(workflow.id, { denoise_node_id: value || undefined }),
                  'Denoise 节点',
                  true,
                )}

                <label className="form-control">
                  <span className="label py-1 text-[11px] font-bold">说明</span>
                  <textarea
                    className="textarea textarea-bordered h-24 text-xs"
                    value={workflow.notes || ''}
                    onChange={(event) => updateWorkflow(workflow.id, { notes: event.target.value })}
                    placeholder="可写这个工作流适合什么场景、依赖哪些模型。"
                  />
                </label>
              </div>

              {(workflow.lora_slots || []).length > 0 && (
                <div className="mt-3 rounded-lg border border-base-300 bg-base-100/60 p-3">
                  <div className="mb-2 text-xs font-black text-accent">检测到的 LoRA 槽位</div>
                  <div className="space-y-2">
                    {workflow.lora_slots!.map((slot) => (
                      <div key={slot.id} className="rounded-md border border-base-300 px-3 py-2 text-xs">
                        <div className="font-bold">{slot.label}</div>
                        <div className="mt-1 opacity-70">
                          节点 {slot.node_id}，默认 LoRA：{slot.default_lora_name || '未填写'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
