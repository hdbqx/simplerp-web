import { useEffect, useMemo } from 'react';
import type { ComfyWorkflowLoraSelection, ComfyWorkflowMode, Settings } from '../../lib/db';
import {
  buildInitialLoraSelections,
  findComfyWorkflow,
  getComfyLoraCatalog,
  getComfyWorkflows,
} from '../../lib/comfyui-workflows';

type Props = {
  settings?: Settings;
  mode: ComfyWorkflowMode;
  workflowId: string;
  loraSelections: Record<string, ComfyWorkflowLoraSelection>;
  disabled?: boolean;
  compact?: boolean;
  onWorkflowChange: (workflowId: string, loraSelections: Record<string, ComfyWorkflowLoraSelection>) => void;
  onLoraSelectionsChange: (next: Record<string, ComfyWorkflowLoraSelection>) => void;
};

export function ComfyWorkflowSelector({
  settings,
  mode,
  workflowId,
  loraSelections,
  disabled,
  compact = false,
  onWorkflowChange,
  onLoraSelectionsChange,
}: Props) {
  const workflows = useMemo(() => getComfyWorkflows(settings, mode), [settings, mode]);
  const selectedWorkflow = useMemo(
    () => workflows.find((item) => item.id === workflowId) || findComfyWorkflow(settings, workflowId),
    [settings, workflowId, workflows],
  );
  const loraCatalog = useMemo(
    () => getComfyLoraCatalog(settings, selectedWorkflow),
    [settings, selectedWorkflow],
  );

  useEffect(() => {
    if (!selectedWorkflow || Object.keys(loraSelections).length > 0) return;
    onLoraSelectionsChange(buildInitialLoraSelections(selectedWorkflow));
  }, [selectedWorkflow, loraSelections, onLoraSelectionsChange]);

  if (!settings || (settings.image_backend || 'huggingface') !== 'huggingface') {
    return null;
  }

  return (
    <div className={`space-y-3 ${compact ? '' : 'rounded-xl border border-base-300 bg-base-100/50 p-3'}`}>
      <div className="form-control">
        <label className="label py-1 text-xs font-bold">ComfyUI 工作流</label>
        <select
          className="select select-bordered select-sm"
          value={workflowId}
          onChange={(event) => {
            const nextWorkflow = workflows.find((item) => item.id === event.target.value);
            onWorkflowChange(event.target.value, buildInitialLoraSelections(nextWorkflow));
          }}
          disabled={disabled}
        >
          <option value="">使用内置默认工作流</option>
          {workflows.map((workflow) => (
            <option key={workflow.id} value={workflow.id}>
              {workflow.name}
            </option>
          ))}
        </select>
        <div className="mt-1 text-[11px] opacity-60">
          已保存 {workflows.length} 个 {mode === 'img2img' ? '图生图' : '文生图'} 工作流。留空会继续使用旧的硬编码兼容工作流。
        </div>
      </div>

      {selectedWorkflow && (selectedWorkflow.lora_slots?.length || 0) > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-black text-accent">LoRA 选择</div>
          {selectedWorkflow.lora_slots!.map((slot) => {
            const selection = loraSelections[slot.id] || {};
            const optionListId = `lora-catalog-${slot.id}`;
            return (
              <div key={slot.id} className="rounded-lg border border-base-300 bg-base-100 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-xs font-bold">{slot.label}</div>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="toggle toggle-primary toggle-xs"
                      checked={selection.enabled ?? true}
                      disabled={disabled}
                      onChange={(event) =>
                        onLoraSelectionsChange({
                          ...loraSelections,
                          [slot.id]: {
                            ...selection,
                            enabled: event.target.checked,
                          },
                        })
                      }
                    />
                    启用
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div className="form-control md:col-span-3">
                    <label className="label py-1 text-[11px] font-bold">LoRA 名称</label>
                    <input
                      className="input input-bordered input-sm"
                      list={optionListId}
                      value={selection.lora_name ?? slot.default_lora_name ?? ''}
                      disabled={disabled}
                      onChange={(event) =>
                        onLoraSelectionsChange({
                          ...loraSelections,
                          [slot.id]: {
                            ...selection,
                            lora_name: event.target.value,
                          },
                        })
                      }
                    />
                    <datalist id={optionListId}>
                      {loraCatalog.map((item) => (
                        <option key={`${slot.id}-${item}`} value={item} />
                      ))}
                    </datalist>
                  </div>

                  {slot.strength_model_input && (
                    <div className="form-control">
                      <label className="label py-1 text-[11px] font-bold">模型权重</label>
                      <input
                        type="number"
                        step="0.05"
                        className="input input-bordered input-sm"
                        value={selection.strength_model ?? slot.default_strength_model ?? 1}
                        disabled={disabled}
                        onChange={(event) =>
                          onLoraSelectionsChange({
                            ...loraSelections,
                            [slot.id]: {
                              ...selection,
                              strength_model: Number(event.target.value),
                            },
                          })
                        }
                      />
                    </div>
                  )}

                  {slot.strength_clip_input && (
                    <div className="form-control">
                      <label className="label py-1 text-[11px] font-bold">CLIP 权重</label>
                      <input
                        type="number"
                        step="0.05"
                        className="input input-bordered input-sm"
                        value={selection.strength_clip ?? slot.default_strength_clip ?? 1}
                        disabled={disabled}
                        onChange={(event) =>
                          onLoraSelectionsChange({
                            ...loraSelections,
                            [slot.id]: {
                              ...selection,
                              strength_clip: Number(event.target.value),
                            },
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

