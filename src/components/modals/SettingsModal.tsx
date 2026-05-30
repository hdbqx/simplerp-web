import { Copy, Eraser, Plus, Save, Trash2, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { api, type ApiMode, type PromptProfile, type Settings } from '../../lib/db';
import { clonePromptProfile, createDefaultPromptProfile, getActivePromptProfile, getPromptProfiles } from '../../lib/prompt-profiles';
import { useAppStore } from '../../lib/store';

type SettingsModalProps = {
  show: boolean;
  onClose: () => void;
  manualModels: string[];
  presetModelsMap: Record<number, string[]>;
  fetchPresetModels: (presetId?: number, force?: boolean) => Promise<void>;
};

export function SettingsModal({
  show,
  onClose,
  manualModels,
  presetModelsMap,
  fetchPresetModels,
}: SettingsModalProps) {
  const { settings, setSettings, presets, setPresets, loadData } = useAppStore(
    useShallow((state) => ({
      settings: state.settings,
      setSettings: state.setSettings,
      presets: state.presets,
      setPresets: state.setPresets,
      loadData: state.loadData,
    })),
  );

  if (!show || !settings) return null;

  const promptProfiles = getPromptProfiles(settings);
  const activePromptProfile = getActivePromptProfile(settings);

  const updateSettings = (patch: Partial<Settings>) => {
    setSettings((current) => (current ? { ...current, ...patch } : current));
  };

  const updatePromptProfile = (profileId: string, patch: Partial<PromptProfile>) => {
    updateSettings({
      prompt_profiles: promptProfiles.map((profile) =>
        profile.id === profileId ? { ...profile, ...patch } : profile,
      ),
    });
  };

  const createPromptProfile = () => {
    const next = clonePromptProfile(activePromptProfile, `方案 ${promptProfiles.length + 1}`);
    updateSettings({
      prompt_profiles: [...promptProfiles, next],
      active_prompt_profile_id: next.id,
    });
  };

  const duplicatePromptProfile = () => {
    const next = clonePromptProfile(activePromptProfile, `${activePromptProfile.name} 副本`);
    updateSettings({
      prompt_profiles: [...promptProfiles, next],
      active_prompt_profile_id: next.id,
    });
  };

  const resetActivePromptProfile = () => {
    updatePromptProfile(activePromptProfile.id, {
      ...createDefaultPromptProfile(activePromptProfile.name),
      id: activePromptProfile.id,
      name: activePromptProfile.name,
    });
  };

  const deleteActivePromptProfile = () => {
    if (promptProfiles.length <= 1) {
      alert('至少保留一个提示词方案。');
      return;
    }
    const nextProfiles = promptProfiles.filter((profile) => profile.id !== activePromptProfile.id);
    updateSettings({
      prompt_profiles: nextProfiles,
      active_prompt_profile_id: nextProfiles[0]?.id,
    });
  };

  return (
    <div className="modal modal-open text-base-content">
      <div className="modal-box flex h-[88vh] max-w-6xl flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between border-b bg-base-200 p-6 font-bold">
          系统设置
          <button className="btn btn-circle btn-ghost btn-sm" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
          <section>
            <h4 className="mb-3 text-sm font-black uppercase text-primary">基础信息</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="form-control">
                <label className="label text-xs font-bold">玩家名称</label>
                <input
                  className="input input-bordered"
                  placeholder="例如：林舟"
                  value={settings.user_name || ''}
                  onChange={(event) => updateSettings({ user_name: event.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label text-xs font-bold">默认生图后端</label>
                <select
                  className="select select-bordered"
                  value={settings.image_backend || 'huggingface'}
                  onChange={(event) => updateSettings({ image_backend: event.target.value as Settings['image_backend'] })}
                >
                  <option value="huggingface">ComfyUI 本地穿透</option>
                  <option value="openai">OpenAI 兼容接口</option>
                  <option value="modelscope">ModelScope</option>
                </select>
              </div>
            </div>
          </section>

          <section>
            <h4 className="mb-3 text-sm font-black uppercase text-primary">生图设置</h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-xl border border-base-300 bg-base-100 p-4">
                <div className="mb-3 text-xs font-black text-accent">ComfyUI 本地穿透</div>
                <div className="form-control">
                  <label className="label text-xs font-bold">Cloudflare Tunnel 地址</label>
                  <textarea
                    className="textarea textarea-bordered h-12 font-mono text-xs"
                    placeholder="例如：https://xxx.trycloudflare.com"
                    value={settings.hf_keys || ''}
                    onChange={(event) => updateSettings({ hf_keys: event.target.value })}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-base-300 p-4">
                <div className="mb-3 text-xs font-black">OpenAI 生图接口</div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="form-control">
                    <label className="label text-xs font-bold">预设</label>
                    <select
                      className="select select-bordered select-sm"
                      value={settings.image_preset_id ? String(settings.image_preset_id) : ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (!value) {
                          updateSettings({ image_preset_id: undefined, image_model_id: '' });
                          return;
                        }
                        const presetId = parseInt(value, 10);
                        updateSettings({ image_preset_id: presetId });
                        fetchPresetModels(presetId);
                      }}
                    >
                      <option value="">跟随顶部预设</option>
                      {presets.map((preset) => (
                        <option key={`img-preset-${preset.id}`} value={String(preset.id)}>
                          {preset.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label text-xs font-bold">模型</label>
                    <select
                      className="select select-bordered select-sm w-full"
                      disabled={!settings.image_preset_id}
                      value={settings.image_model_id || ''}
                      onChange={(event) => updateSettings({ image_model_id: event.target.value })}
                    >
                      <option value="">跟随顶部模型</option>
                      {settings.image_preset_id &&
                        (presetModelsMap[settings.image_preset_id] || []).map((model) => (
                          <option key={`img-model-${model}`} value={model}>
                            {model}
                          </option>
                        ))}
                      {settings.image_preset_id &&
                        (presetModelsMap[settings.image_preset_id]?.length || 0) === 0 &&
                        manualModels.map((model) => (
                          <option key={`img-manual-${model}`} value={model}>
                            {model}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-base-300 bg-gradient-to-r from-orange-500/10 to-red-500/10 p-4">
                <div className="mb-3 text-xs font-black text-orange-500">ModelScope 生图接口</div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="form-control">
                    <label className="label text-xs font-bold">接口密钥</label>
                    <input
                      type="password"
                      className="input input-bordered input-sm"
                      placeholder="填写 ModelScope 接口密钥"
                      value={settings.modelscope_api_key || ''}
                      onChange={(event) => updateSettings({ modelscope_api_key: event.target.value })}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label text-xs font-bold">模型 ID</label>
                    <input
                      className="input input-bordered input-sm"
                      placeholder="默认：Tongyi-MAI/Z-Image-Turbo"
                      value={settings.modelscope_model || ''}
                      onChange={(event) => updateSettings({ modelscope_model: event.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-2 text-[10px] opacity-60">
                  默认模型：Tongyi-MAI/Z-Image-Turbo
                </div>
              </div>
            </div>
          </section>

          <section>
            <h4 className="mb-3 text-sm font-black uppercase text-primary">辅助模型绑定</h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-xl border border-base-300 p-4">
                <div className="mb-3 text-xs font-black">记忆总结模型</div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="form-control">
                    <label className="label text-xs font-bold">预设</label>
                    <select
                      className="select select-bordered select-sm"
                      value={settings.summary_preset_id ? String(settings.summary_preset_id) : ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (!value) {
                          updateSettings({ summary_preset_id: undefined, summary_model_id: '' });
                          return;
                        }
                        const presetId = parseInt(value, 10);
                        updateSettings({ summary_preset_id: presetId });
                        fetchPresetModels(presetId);
                      }}
                    >
                      <option value="">跟随顶部预设</option>
                      {presets.map((preset) => (
                        <option key={`sum-preset-${preset.id}`} value={String(preset.id)}>
                          {preset.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label text-xs font-bold">模型</label>
                    <select
                      className="select select-bordered select-sm w-full"
                      disabled={!settings.summary_preset_id}
                      value={settings.summary_model_id || ''}
                      onChange={(event) => updateSettings({ summary_model_id: event.target.value })}
                    >
                      <option value="">跟随顶部模型</option>
                      {settings.summary_preset_id &&
                        (presetModelsMap[settings.summary_preset_id] || []).map((model) => (
                          <option key={`sum-model-${model}`} value={model}>
                            {model}
                          </option>
                        ))}
                      {settings.summary_preset_id &&
                        (presetModelsMap[settings.summary_preset_id]?.length || 0) === 0 &&
                        manualModels.map((model) => (
                          <option key={`sum-manual-${model}`} value={model}>
                            {model}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-base-300 p-4">
                <div className="mb-3 text-xs font-black">SD 提示词转换模型</div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="form-control">
                    <label className="label text-xs font-bold">预设</label>
                    <select
                      className="select select-bordered select-sm"
                      value={settings.sd_prompt_preset_id ? String(settings.sd_prompt_preset_id) : ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (!value) {
                          updateSettings({ sd_prompt_preset_id: undefined, sd_prompt_model_id: '' });
                          return;
                        }
                        const presetId = parseInt(value, 10);
                        updateSettings({ sd_prompt_preset_id: presetId });
                        fetchPresetModels(presetId);
                      }}
                    >
                      <option value="">跟随顶部预设</option>
                      {presets.map((preset) => (
                        <option key={`sd-preset-${preset.id}`} value={String(preset.id)}>
                          {preset.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label text-xs font-bold">模型</label>
                    <select
                      className="select select-bordered select-sm w-full"
                      disabled={!settings.sd_prompt_preset_id}
                      value={settings.sd_prompt_model_id || ''}
                      onChange={(event) => updateSettings({ sd_prompt_model_id: event.target.value })}
                    >
                      <option value="">跟随顶部模型</option>
                      {settings.sd_prompt_preset_id &&
                        (presetModelsMap[settings.sd_prompt_preset_id] || []).map((model) => (
                          <option key={`sd-model-${model}`} value={model}>
                            {model}
                          </option>
                        ))}
                      {settings.sd_prompt_preset_id &&
                        (presetModelsMap[settings.sd_prompt_preset_id]?.length || 0) === 0 &&
                        manualModels.map((model) => (
                          <option key={`sd-manual-${model}`} value={model}>
                            {model}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-base-300 p-4">
                <div className="mb-3 text-xs font-black">后台变量推演模型</div>
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      className="toggle toggle-primary toggle-sm"
                      checked={settings.is_thought_auto_update ?? false}
                      onChange={(event) => updateSettings({ is_thought_auto_update: event.target.checked })}
                    />
                    <span className="text-sm font-bold">启用自动推演</span>
                  </label>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="form-control">
                      <label className="label text-xs font-bold">推演间隔（轮）</label>
                      <input
                        type="number"
                        min={1}
                        className="input input-bordered input-sm"
                        value={settings.thought_interval ?? 5}
                        onChange={(event) => updateSettings({ thought_interval: Number(event.target.value) })}
                      />
                    </div>
                    <div className="form-control">
                      <label className="label text-xs font-bold">预设</label>
                      <select
                        className="select select-bordered select-sm"
                        value={settings.thought_preset_id ? String(settings.thought_preset_id) : ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (!value) {
                            updateSettings({ thought_preset_id: undefined, thought_model_id: '' });
                            return;
                          }
                          const presetId = parseInt(value, 10);
                          updateSettings({ thought_preset_id: presetId });
                          fetchPresetModels(presetId);
                        }}
                      >
                        <option value="">跟随顶部预设</option>
                        {presets.map((preset) => (
                          <option key={`thought-preset-${preset.id}`} value={String(preset.id)}>
                            {preset.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-control md:col-span-2">
                      <label className="label text-xs font-bold">模型</label>
                      <select
                        className="select select-bordered select-sm w-full"
                        value={settings.thought_model_id || ''}
                        onChange={(event) => updateSettings({ thought_model_id: event.target.value })}
                      >
                        <option value="">留空时跟随顶部模型</option>
                        {settings.thought_preset_id &&
                          (presetModelsMap[settings.thought_preset_id] || []).map((model) => (
                            <option key={`thought-model-${model}`} value={model}>
                              {model}
                            </option>
                          ))}
                        {settings.thought_preset_id &&
                          (presetModelsMap[settings.thought_preset_id]?.length || 0) === 0 &&
                          manualModels.map((model) => (
                            <option key={`thought-manual-${model}`} value={model}>
                              {model}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h4 className="text-sm font-black uppercase text-primary">提示词方案</h4>
                <p className="mt-1 text-xs opacity-70">
                  统一管理主对话规则、记忆总结、SD 转换和变量推演的提示词预设。切换方案后，这些能力会一并切换。
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-xs btn-outline" onClick={duplicatePromptProfile}>
                  <Copy size={12} /> 复制当前
                </button>
                <button className="btn btn-xs btn-primary" onClick={createPromptProfile}>
                  <Plus size={12} /> 新建方案
                </button>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-base-300 bg-base-100 p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
                <div className="form-control">
                  <label className="label text-xs font-bold">当前方案</label>
                  <select
                    className="select select-bordered select-sm"
                    value={activePromptProfile.id}
                    onChange={(event) => updateSettings({ active_prompt_profile_id: event.target.value })}
                  >
                    {promptProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="form-control flex-1 min-w-[220px]">
                    <label className="label text-xs font-bold">方案名称</label>
                    <input
                      className="input input-bordered input-sm"
                      value={activePromptProfile.name}
                      onChange={(event) => updatePromptProfile(activePromptProfile.id, { name: event.target.value })}
                    />
                  </div>
                  <button className="btn btn-sm btn-outline" onClick={resetActivePromptProfile}>
                    恢复官方预设
                  </button>
                  <button
                    className="btn btn-sm btn-outline btn-error"
                    disabled={promptProfiles.length <= 1}
                    onClick={deleteActivePromptProfile}
                  >
                    删除方案
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="rounded-xl border border-base-300 bg-base-200/50 p-4">
                  <div className="mb-3">
                    <div className="text-sm font-black text-primary">主对话全局规则</div>
                    <div className="mt-1 text-[11px] opacity-70">
                      这一组配置作用于主聊天模型，用来把“角色是谁”和“应该怎么写”彻底分离。
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="form-control">
                      <label className="label text-xs font-bold">全局系统指令</label>
                      <textarea
                        className="textarea textarea-bordered h-32 text-xs leading-6"
                        value={activePromptProfile.global_system_instruction}
                        onChange={(event) =>
                          updatePromptProfile(activePromptProfile.id, {
                            global_system_instruction: event.target.value,
                          })
                        }
                      />
                      <div className="mt-1 text-[11px] opacity-60">
                        会无条件插入到主 System Prompt 的最顶端，用来定义整个沙箱的文风、叙事视角和总基调。
                      </div>
                    </div>
                    <div className="form-control">
                      <label className="label text-xs font-bold">全局后置指令</label>
                      <textarea
                        className="textarea textarea-bordered h-32 font-mono text-xs leading-6"
                        value={activePromptProfile.global_post_history_instruction}
                        onChange={(event) =>
                          updatePromptProfile(activePromptProfile.id, {
                            global_post_history_instruction: event.target.value,
                          })
                        }
                      />
                      <div className="mt-1 text-[11px] opacity-60">
                        会作为历史末尾的最后一条系统消息注入，优先用于压格式、稳文风、减少拒答和跑偏。
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-base-300 bg-base-200/50 p-4">
                  <div className="mb-3">
                    <div className="text-sm font-black text-primary">记忆总结提示词</div>
                    <div className="mt-1 text-[11px] opacity-70">
                      <code>{'{{history}}'}</code> 会在调用时替换为未被截断的最近对话内容，<code>{'{{summary}}'}</code>{' '}
                      会替换为已有长期记忆。
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="form-control">
                      <label className="label text-xs font-bold">系统提示词</label>
                      <textarea
                        className="textarea textarea-bordered h-24 text-xs leading-6"
                        value={activePromptProfile.summary_system_prompt}
                        onChange={(event) =>
                          updatePromptProfile(activePromptProfile.id, {
                            summary_system_prompt: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-control">
                      <label className="label text-xs font-bold">用户提示词模板</label>
                      <textarea
                        className="textarea textarea-bordered h-40 font-mono text-xs leading-6"
                        value={activePromptProfile.summary_user_prompt}
                        onChange={(event) =>
                          updatePromptProfile(activePromptProfile.id, {
                            summary_user_prompt: event.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-base-300 bg-base-200/50 p-4">
                  <div className="mb-3">
                    <div className="text-sm font-black text-primary">SD 提示词转换</div>
                    <div className="mt-1 text-[11px] opacity-70">
                      <code>{'{{input}}'}</code> 会在调用时替换为用户输入的自然语言画面描述。
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="form-control">
                      <label className="label text-xs font-bold">系统提示词</label>
                      <textarea
                        className="textarea textarea-bordered h-24 text-xs leading-6"
                        value={activePromptProfile.sd_system_prompt}
                        onChange={(event) =>
                          updatePromptProfile(activePromptProfile.id, {
                            sd_system_prompt: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-control">
                      <label className="label text-xs font-bold">用户提示词模板</label>
                      <textarea
                        className="textarea textarea-bordered h-40 font-mono text-xs leading-6"
                        value={activePromptProfile.sd_user_prompt}
                        onChange={(event) =>
                          updatePromptProfile(activePromptProfile.id, {
                            sd_user_prompt: event.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-base-300 bg-base-200/50 p-4">
                  <div className="mb-3">
                    <div className="text-sm font-black text-primary">后台变量推演</div>
                    <div className="mt-1 text-[11px] opacity-70">
                      <code>{'{VARIABLES}'}</code>、<code>{'{HISTORY}'}</code> 和 <code>{'{{USER_INPUT}}'}</code>{' '}
                      会在推演时自动注入。
                    </div>
                  </div>
                  <div className="form-control">
                    <label className="label text-xs font-bold">提示词模板</label>
                    <textarea
                      className="textarea textarea-bordered h-72 font-mono text-xs leading-6"
                      value={activePromptProfile.thought_prompt}
                      onChange={(event) =>
                        updatePromptProfile(activePromptProfile.id, {
                          thought_prompt: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h4 className="mb-3 text-sm font-black uppercase text-primary">自动快照</h4>
            <div className="rounded-xl border border-base-300 bg-base-200/50 p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="form-control">
                  <label className="label text-xs font-bold">自动快照触发周期（每 X 轮对话）</label>
                  <input
                    type="number"
                    min={1}
                    className="input input-bordered input-sm font-semibold"
                    value={settings.snapshot_trigger_interval ?? 5}
                    onChange={(event) => updateSettings({ snapshot_trigger_interval: Number(event.target.value) })}
                  />
                </div>
                <div className="form-control">
                  <label className="label text-xs font-bold">单会话最大快照保留数</label>
                  <input
                    type="number"
                    min={1}
                    className="input input-bordered input-sm font-semibold"
                    value={settings.snapshot_max_keep_count ?? 20}
                    onChange={(event) => updateSettings({ snapshot_max_keep_count: Number(event.target.value) })}
                  />
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between">
              <h4 className="text-sm font-black uppercase text-primary">API 预设库</h4>
              <button
                className="btn btn-xs btn-primary"
                onClick={() =>
                  api.presets
                    .add({ name: '新预设', api_base: '', api_key: '', api_mode: 'chat_completions' })
                    .then(() => loadData())
                }
              >
                + 新增
              </button>
            </div>
            <div className="mb-4 overflow-x-auto rounded-xl border border-base-300">
              <table className="table table-xs w-full">
                <thead>
                  <tr className="bg-base-200">
                    <th>名称</th>
                    <th>接口地址</th>
                    <th>密钥</th>
                    <th>模式</th>
                    <th className="w-20">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {presets.map((preset, index) => (
                    <tr key={preset.id}>
                      <td>
                        <input
                          className="input input-ghost input-xs w-full font-bold"
                          value={preset.name}
                          onChange={(event) => {
                            const next = [...presets];
                            next[index].name = event.target.value;
                            setPresets(next);
                          }}
                        />
                      </td>
                      <td>
                        <input
                          className="input input-ghost input-xs w-full"
                          value={preset.api_base}
                          onChange={(event) => {
                            const next = [...presets];
                            next[index].api_base = event.target.value;
                            setPresets(next);
                          }}
                        />
                      </td>
                      <td>
                        <input
                          className="input input-ghost input-xs w-full"
                          type="password"
                          value={preset.api_key}
                          onChange={(event) => {
                            const next = [...presets];
                            next[index].api_key = event.target.value;
                            setPresets(next);
                          }}
                        />
                      </td>
                      <td>
                        <select
                          className="select select-bordered select-xs w-full"
                          value={preset.api_mode || 'chat_completions'}
                          onChange={(event) => {
                            const next = [...presets];
                            next[index].api_mode = event.target.value as ApiMode;
                            setPresets(next);
                          }}
                        >
                          <option value="chat_completions">chat.completions</option>
                          <option value="responses">responses</option>
                        </select>
                      </td>
                      <td className="flex gap-1">
                        <button
                          className="btn btn-ghost btn-xs text-success"
                          onClick={() =>
                            api.presets
                              .update(preset.id!, { ...preset, api_mode: preset.api_mode || 'chat_completions' })
                              .then(() => alert('预设已更新。'))
                          }
                        >
                          <Save size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => {
                            if (!confirm('确定删除这个预设吗？')) return;
                            api.presets.delete(preset.id!).then(() => loadData());
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="form-control">
              <label className="label text-xs font-bold">备用模型列表（手动输入，逗号或换行分隔）</label>
              <textarea
                className="textarea textarea-bordered h-20 w-full text-xs"
                placeholder="当接口不支持自动获取模型列表时使用"
                value={settings.model_list || ''}
                onChange={(event) => updateSettings({ model_list: event.target.value })}
              />
            </div>
          </section>

          <section>
            <h4 className="mb-3 text-sm font-black uppercase text-error">数据管理</h4>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-error/20 bg-error/5 p-4">
              <div className="flex-1">
                <p className="text-xs font-bold text-error">清理数据库图片</p>
                <p className="mt-1 text-[10px] opacity-60">永久删除 D1 数据库中存储的全部图片消息。</p>
              </div>
              <button
                className="btn btn-error btn-sm shadow-md"
                onClick={async () => {
                  if (!confirm('确定清理全部图片吗？')) return;
                  await api.messages.clearAllImages();
                  alert('图片已清理。');
                }}
              >
                <Eraser size={14} className="mr-1" /> 清理图片
              </button>
            </div>
          </section>
        </div>

        <div className="border-t bg-base-200 p-4">
          <button
            className="btn btn-primary btn-block"
            onClick={async () => {
              await api.settings.update(settings);
              onClose();
              await loadData();
            }}
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}
