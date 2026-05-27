import { useState } from 'react';
import type { ApiMode, ApiPreset } from '../lib/db';
import { LLMClient } from '../lib/llm';

type UsePresetModelsParams = {
  presets: ApiPreset[];
  getPresetMode: (preset?: ApiPreset) => ApiMode;
};

export function usePresetModels({ presets, getPresetMode }: UsePresetModelsParams) {
  const [presetModelsMap, setPresetModelsMap] = useState<Record<number, string[]>>({});
  const [presetModelsLoading, setPresetModelsLoading] = useState<Record<number, boolean>>({});

  const fetchPresetModels = async (presetId?: number, force = false) => {
    if (!presetId) return;
    if (presetModelsLoading[presetId]) return;
    if (!force && presetModelsMap[presetId]?.length) return;

    const preset = presets.find((item) => item.id === presetId);
    if (!preset) return;

    setPresetModelsLoading((current) => ({ ...current, [presetId]: true }));
    try {
      const llm = new LLMClient(preset.api_base, preset.api_key, getPresetMode(preset));
      const models = await llm.fetchModels();
      setPresetModelsMap((current) => ({ ...current, [presetId]: models }));
    } finally {
      setPresetModelsLoading((current) => ({ ...current, [presetId]: false }));
    }
  };

  return {
    presetModelsMap,
    presetModelsLoading,
    fetchPresetModels,
  };
}
