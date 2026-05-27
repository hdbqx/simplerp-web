import { create } from 'zustand';
import type { SetStateAction } from 'react';
import { api, type ApiMode, type ApiPreset, type Character, type Room, type Settings } from './db';
import { LLMClient } from './llm';
import { normalizePromptProfiles } from './prompt-profiles';

export type ViewMode = 'char' | 'group' | 'image';

type Updater<T> = SetStateAction<T>;

function resolveState<T>(updater: Updater<T>, prev: T): T {
  return typeof updater === 'function' ? (updater as (value: T) => T)(prev) : updater;
}

function getPresetMode(preset?: ApiPreset): ApiMode {
  return preset?.api_mode === 'responses' ? 'responses' : 'chat_completions';
}

interface RefreshModelsOptions {
  keepModelId?: string;
  manualListStr?: string;
  mode?: ApiMode;
}

interface AppStore {
  viewMode: ViewMode;
  characters: Character[];
  rooms: Room[];
  settings: Settings | undefined;
  presets: ApiPreset[];
  selectedCharId: number | undefined;
  selectedRoomId: number | undefined;
  activePresetId: number | undefined;
  activeModel: string;
  availableModels: string[];
  isLoading: boolean;
  isFetchingModels: boolean;

  setViewMode: (viewMode: ViewMode) => void;
  setCharacters: (updater: Updater<Character[]>) => void;
  setRooms: (updater: Updater<Room[]>) => void;
  setSettings: (updater: Updater<Settings | undefined>) => void;
  setPresets: (updater: Updater<ApiPreset[]>) => void;
  setSelectedCharId: (id: number | undefined) => void;
  setSelectedRoomId: (id: number | undefined) => void;
  setActivePresetId: (id: number | undefined) => void;
  setActiveModel: (model: string) => void;
  setAvailableModels: (models: string[]) => void;

  loadData: () => Promise<void>;
  refreshModels: (base: string, key: string, options?: RefreshModelsOptions) => Promise<void>;
  handlePresetChange: (presetIdStr: string) => Promise<void>;
  handleModelChange: (modelId: string) => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  viewMode: 'char',
  characters: [],
  rooms: [],
  settings: undefined,
  presets: [],
  selectedCharId: undefined,
  selectedRoomId: undefined,
  activePresetId: undefined,
  activeModel: '',
  availableModels: [],
  isLoading: true,
  isFetchingModels: false,

  setViewMode: (viewMode) => set({ viewMode }),
  setCharacters: (updater) => set((state) => ({ characters: resolveState(updater, state.characters) })),
  setRooms: (updater) => set((state) => ({ rooms: resolveState(updater, state.rooms) })),
  setSettings: (updater) =>
    set((state) => ({
      settings: normalizePromptProfiles(resolveState(updater, state.settings)),
    })),
  setPresets: (updater) => set((state) => ({ presets: resolveState(updater, state.presets) })),
  setSelectedCharId: (selectedCharId) => set({ selectedCharId }),
  setSelectedRoomId: (selectedRoomId) => set({ selectedRoomId }),
  setActivePresetId: (activePresetId) => set({ activePresetId }),
  setActiveModel: (activeModel) => set({ activeModel }),
  setAvailableModels: (availableModels) => set({ availableModels }),

  loadData: async () => {
    set({ isLoading: true });
    try {
      const [characters, rooms, rawSettings, presets] = await Promise.all([
        api.characters.list(),
        api.rooms.list(),
        api.settings.get(),
        api.presets.list(),
      ]);
      const settings = normalizePromptProfiles(rawSettings);

      set({
        characters,
        rooms,
        settings,
        presets,
      });

      if (settings?.active_preset_id && presets.some((preset) => preset.id === settings.active_preset_id)) {
        const currentPreset = presets.find((preset) => preset.id === settings.active_preset_id);
        set({ activePresetId: settings.active_preset_id });
        if (currentPreset) {
          await get().refreshModels(currentPreset.api_base, currentPreset.api_key, {
            keepModelId: settings.active_model_id,
            manualListStr: settings.model_list,
            mode: getPresetMode(currentPreset),
          });
        }
      } else {
        set({
          activePresetId: undefined,
          activeModel: '',
          availableModels: [],
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ isLoading: false });
    }
  },

  refreshModels: async (base, key, options) => {
    set({ isFetchingModels: true });
    try {
      const llm = new LLMClient(base, key, options?.mode ?? 'chat_completions');
      const fetchedModels = await llm.fetchModels();
      set({ availableModels: fetchedModels });

      const settings = get().settings;
      const manualList = (options?.manualListStr ?? settings?.model_list ?? '')
        .split(/[,，\n]/)
        .map((model) => model.trim())
        .filter(Boolean);

      let nextModel = '';
      if (options?.keepModelId && (fetchedModels.includes(options.keepModelId) || manualList.includes(options.keepModelId))) {
        nextModel = options.keepModelId;
      } else if (fetchedModels.length > 0) {
        nextModel = fetchedModels[0];
      } else if (manualList.length > 0) {
        nextModel = manualList[0];
      }

      if (nextModel) {
        set({ activeModel: nextModel });
        if (settings && settings.active_model_id !== nextModel) {
          const nextSettings = { ...settings, active_model_id: nextModel };
          set({ settings: nextSettings });
          await api.settings.update(nextSettings);
        }
      }
    } finally {
      set({ isFetchingModels: false });
    }
  },

  handlePresetChange: async (presetIdStr) => {
    const presetId = parseInt(presetIdStr, 10);
    const settings = get().settings;
    const presets = get().presets;

    set({ activePresetId: presetId });

    if (settings) {
      const nextSettings = { ...settings, active_preset_id: presetId };
      set({ settings: nextSettings });
      await api.settings.update(nextSettings);
    }

    const preset = presets.find((item) => item.id === presetId);
    if (preset) {
      await get().refreshModels(preset.api_base, preset.api_key, {
        mode: getPresetMode(preset),
      });
    }
  },

  handleModelChange: async (modelId) => {
    const settings = get().settings;
    set({ activeModel: modelId });
    if (settings) {
      const nextSettings = { ...settings, active_model_id: modelId };
      set({ settings: nextSettings });
      await api.settings.update(nextSettings);
    }
  },
}));
