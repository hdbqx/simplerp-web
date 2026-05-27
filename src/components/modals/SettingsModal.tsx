import { Eraser, Save, Trash2, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { api, type ApiMode, type Settings } from '../../lib/db';
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

  const updateSettings = (patch: Partial<Settings>) => {
    setSettings((current) => (current ? { ...current, ...patch } : current));
  };

  return (
    <div className="modal modal-open text-base-content">
      <div className="modal-box flex h-[88vh] max-w-6xl flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between border-b bg-base-200 p-6 font-bold">
          系统设置
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
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
                  <option value="huggingface">ComfyUI 本地穿透（通过 HF 通道）</option>
                  <option value="openai">OpenAI 兼容端点</option>
                  <option value="modelscope">魔搭社区 ModelScope</option>
                </select>
              </div>
            </div>
          </section>

          <section>
            <h4 className="mb-3 text-sm font-black uppercase text-primary">生图核心配置</h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-xl border border-base-300 bg-base-100 p-4">
                <div className="mb-3 text-xs font-black text-accent">ComfyUI 本地穿透参数</div>
                <div className="grid grid-cols-1 gap-4">
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
              </div>

              <div className="rounded-xl border border-base-300 p-4">
                <div className="mb-3 text-xs font-black">OpenAI 生图参数（备用）</div>
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
                    <div className="join">
                      <select
                        className="select select-bordered select-sm join-item w-full"
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
              </div>

              <div className="rounded-xl border border-base-300 bg-gradient-to-r from-orange-500/10 to-red-500/10 p-4">
                <div className="mb-3 text-xs font-black text-orange-500">魔搭社区 ModelScope 生图参数</div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="form-control">
                    <label className="label text-xs font-bold">API Key</label>
                    <input
                      type="password"
                      className="input input-bordered input-sm"
                      placeholder="输入魔搭社区 API Key"
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
                  默认模型：Tongyi-MAI/Z-Image-Turbo（通义万相极速版）
                </div>
              </div>
            </div>
          </section>

          <section>
            <h4 className="mb-3 text-sm font-black uppercase text-primary">其他辅助模型绑定</h4>
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
                    <div className="join">
                      <select
                        className="select select-bordered select-sm join-item w-full"
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
              </div>

              <div className="rounded-xl border border-base-300 p-4">
                <div className="mb-3 text-xs font-black">SD 转换模型（用于生图提示词翻译与扩写）</div>
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
                    <div className="join">
                      <select
                        className="select select-bordered select-sm join-item w-full"
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
              </div>
            </div>
          </section>

          <section>
            <h4 className="mb-3 text-sm font-black uppercase text-primary">后台变量推演模型</h4>
            <div className="space-y-3 rounded-xl border border-base-300 p-4">
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
                    <option value="">留空跟随顶部模型</option>
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
          </section>

          <section>
            <h4 className="mb-3 text-sm font-black uppercase text-primary">自动化快照控制策略</h4>
            <div className="space-y-4 rounded-xl border border-base-300 bg-base-200/50 p-4">
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
                  <label className="label text-xs font-bold">单会话最大快照保留数量（个）</label>
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
                    <th>Base URL</th>
                    <th>Key</th>
                    <th>Mode</th>
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
                              .then(() => alert('已更新'))
                          }
                        >
                          <Save size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => {
                            if (!confirm('确认删除该预设？')) return;
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
              <label className="label text-xs font-bold">备用模型列表（手动输入，逗号分隔）</label>
              <textarea
                className="textarea textarea-bordered h-20 w-full text-xs"
                placeholder="当 API 不支持自动获取模型列表时使用"
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
                <p className="mt-1 text-[10px] opacity-60">永久删除 D1 数据库中存储的所有图片消息。</p>
              </div>
              <button
                className="btn btn-error btn-sm shadow-md"
                onClick={async () => {
                  if (!confirm('确定清理图片？')) return;
                  await api.messages.clearAllImages();
                  alert('清理成功');
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
