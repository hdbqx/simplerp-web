import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { ApiMode, ApiPreset } from './lib/db';
import { useAppStore } from './lib/store';
import { ChatWorkspace } from './components/chat/ChatWorkspace';
import { AppHeader } from './components/layout/AppHeader';
import { Sidebar } from './components/layout/Sidebar';
import { CharEditModal } from './components/modals/CharEditModal';
import { GroupEditModal } from './components/modals/GroupEditModal';
import { ImagePromptModal } from './components/modals/ImagePromptModal';
import { LorebookModal } from './components/modals/LorebookModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { useCharacterArchiveActions } from './hooks/useCharacterArchiveActions';
import { useChatController } from './hooks/useChatController';
import { usePresetModels } from './hooks/usePresetModels';
import { useWorkspaceData } from './hooks/useWorkspaceData';

type CharEditTab = 'basic' | 'variables' | 'snapshots';

function App() {
  const {
    viewMode,
    characters,
    rooms,
    presets,
    activePresetId,
    activeModel,
    availableModels,
    selectedCharId,
    selectedRoomId,
    settings,
    isLoading,
    isFetchingModels,
    loadData,
    refreshModels,
    handlePresetChange,
    handleModelChange,
  } = useAppStore(
    useShallow((state) => ({
      viewMode: state.viewMode,
      characters: state.characters,
      rooms: state.rooms,
      presets: state.presets,
      activePresetId: state.activePresetId,
      activeModel: state.activeModel,
      availableModels: state.availableModels,
      selectedCharId: state.selectedCharId,
      selectedRoomId: state.selectedRoomId,
      settings: state.settings,
      isLoading: state.isLoading,
      isFetchingModels: state.isFetchingModels,
      loadData: state.loadData,
      refreshModels: state.refreshModels,
      handlePresetChange: state.handlePresetChange,
      handleModelChange: state.handleModelChange,
    })),
  );

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCharEdit, setShowCharEdit] = useState(false);
  const [charEditTab, setCharEditTab] = useState<CharEditTab>('basic');
  const [showGroupEdit, setShowGroupEdit] = useState(false);
  const [showLorebook, setShowLorebook] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [useSdPromptConversion, setUseSdPromptConversion] = useState(true);

  const manualModels = useMemo(() => {
    if (!settings?.model_list) return [];
    return settings.model_list
      .split(/[,\n]/)
      .map((model) => model.trim())
      .filter(Boolean);
  }, [settings?.model_list]);

  const characterNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const character of characters) {
      if (character.id) map.set(character.id, character.name);
    }
    return map;
  }, [characters]);

  const currentCharacter = useMemo(
    () => (viewMode === 'char' ? characters.find((character) => character.id === selectedCharId) : undefined),
    [characters, selectedCharId, viewMode],
  );

  const getPresetMode = (preset?: ApiPreset): ApiMode =>
    preset?.api_mode === 'responses' ? 'responses' : 'chat_completions';

  const { presetModelsMap, presetModelsLoading, fetchPresetModels } = usePresetModels({
    presets,
    getPresetMode,
  });

  const {
    charVariables,
    setCharVariables,
    setCharLorebookEntries,
    lorebookEntries,
    globalVariables,
    setGlobalVariables,
    globalStages,
    groupMemberIds,
    roomMessages,
    setRoomMessages,
    roomMembersDraft,
    setRoomMembersDraft,
    loadCharData,
    loadLorebookEntries,
    loadCharArchive,
    saveRoomConfigs,
  } = useWorkspaceData({
    selectedCharId,
    selectedRoomId,
    viewMode,
    showGroupEdit,
    showCharEdit,
    charEditTab,
    rooms,
    loadData,
  });

  const groupMembers = useMemo(
    () =>
      characters
        .filter((character) => character.id && groupMemberIds.includes(character.id))
        .map((member) => ({ id: member.id!, name: member.name })),
    [characters, groupMemberIds],
  );

  const { importFileRef, exportCharacter, handleImportFile } = useCharacterArchiveActions({
    selectedCharId,
    characters,
    loadData,
    onArchiveLoaded: loadCharArchive,
  });

  const {
    toastMsg,
    isTyping,
    stopGeneration,
    sendRoomChat,
    handleSend,
    handleRegenerate,
    handleDeleteCharMessage,
    handleEditCharMessage,
    handleSaveCharImage,
    handleClearConversation,
    handleSummarizeProgress,
    handleGenImageAction,
  } = useChatController({
    settings,
    activePresetId,
    activeModel,
    presets,
    viewMode,
    selectedCharId,
    selectedRoomId,
    characters,
    rooms,
    roomMessages,
    setRoomMessages,
    globalVariables,
    setGlobalVariables,
    globalStages,
    lorebookEntries,
    loadData,
    getPresetMode,
  });

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!showSettings) return;
    void fetchPresetModels(activePresetId);
    void fetchPresetModels(settings?.image_preset_id);
    void fetchPresetModels(settings?.summary_preset_id);
    void fetchPresetModels(settings?.sd_prompt_preset_id);
  }, [showSettings, activePresetId, settings?.image_preset_id, settings?.summary_preset_id, settings?.sd_prompt_preset_id]);

  const handleRefreshModels = () => {
    const preset = presets.find((item) => item.id === activePresetId);
    if (!preset) return;
    void refreshModels(preset.api_base, preset.api_key, {
      keepModelId: activeModel,
      mode: getPresetMode(preset),
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-base-100">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <>
      <div className="drawer fixed inset-0 w-full overflow-hidden bg-base-100 text-base-content md:drawer-open">
        <input
          id="my-drawer"
          type="checkbox"
          className="drawer-toggle"
          checked={mobileMenuOpen}
          onChange={(event) => setMobileMenuOpen(event.target.checked)}
        />

        <div className="drawer-content relative flex h-full min-h-0 flex-col overflow-hidden bg-base-100">
          <AppHeader
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
            viewMode={viewMode}
            characters={characters}
            rooms={rooms}
            selectedCharId={selectedCharId}
            selectedRoomId={selectedRoomId}
            activePresetId={activePresetId}
            activeModel={activeModel}
            presets={presets}
            manualModels={manualModels}
            availableModels={availableModels}
            isFetchingModels={isFetchingModels}
            onPresetChange={handlePresetChange}
            onModelChange={handleModelChange}
            onRefreshModels={handleRefreshModels}
            onClearConversation={handleClearConversation}
            onSummarizeProgress={handleSummarizeProgress}
            onOpenLorebook={() => setShowLorebook(true)}
            onOpenCharEdit={() => setShowCharEdit(true)}
            onOpenGroupEdit={() => setShowGroupEdit(true)}
          />

          <ChatWorkspace
            viewMode={viewMode}
            selectedCharId={selectedCharId}
            selectedRoomId={selectedRoomId}
            roomMessages={roomMessages}
            settings={settings}
            currentCharacter={currentCharacter}
            characterNameById={characterNameById}
            isTyping={isTyping}
            groupMembers={groupMembers}
            activePresetId={activePresetId}
            activeModel={activeModel}
            presets={presets}
            manualModels={manualModels}
            getPresetMode={getPresetMode}
            fetchPresetModels={fetchPresetModels}
            presetModelsMap={presetModelsMap}
            presetModelsLoading={presetModelsLoading}
            onRegenerate={handleRegenerate}
            onDeleteCharMessage={handleDeleteCharMessage}
            onEditCharMessage={handleEditCharMessage}
            onSaveCharImage={handleSaveCharImage}
            onSend={handleSend}
            onSendAsMember={sendRoomChat}
            onOpenImageGen={() => {
              setGenPrompt('');
              setShowGenModal(true);
            }}
            onStop={stopGeneration}
          />
        </div>

        <div className="drawer-side z-50">
          <label
            htmlFor="my-drawer"
            className="drawer-overlay bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() => setMobileMenuOpen(false)}
          ></label>
          <Sidebar setMobileMenuOpen={setMobileMenuOpen} setShowSettings={setShowSettings} />
        </div>

        <SettingsModal
          show={showSettings}
          onClose={() => setShowSettings(false)}
          manualModels={manualModels}
          presetModelsMap={presetModelsMap}
          fetchPresetModels={fetchPresetModels}
        />

        <CharEditModal
          show={showCharEdit}
          onClose={() => setShowCharEdit(false)}
          charEditTab={charEditTab}
          setCharEditTab={setCharEditTab}
          charVariables={charVariables}
          setCharVariables={setCharVariables}
          setGlobalVariables={setGlobalVariables}
          loadCharData={loadCharData}
          loadCharArchive={loadCharArchive}
          exportCharacter={exportCharacter}
          handleImportFile={handleImportFile}
          importFileRef={importFileRef}
          setCharLorebookEntries={setCharLorebookEntries}
        />

        <GroupEditModal
          show={showGroupEdit}
          onClose={() => setShowGroupEdit(false)}
          roomMembersDraft={roomMembersDraft}
          setRoomMembersDraft={setRoomMembersDraft}
          saveRoomConfigs={async () => {
            await saveRoomConfigs();
            setShowGroupEdit(false);
          }}
        />

        <LorebookModal
          show={showLorebook}
          charId={selectedCharId}
          onClose={() => {
            setShowLorebook(false);
            void loadLorebookEntries();
          }}
        />

        <ImagePromptModal
          show={showGenModal}
          prompt={genPrompt}
          useSdPromptConversion={useSdPromptConversion}
          settings={settings}
          onPromptChange={setGenPrompt}
          onUseSdPromptConversionChange={setUseSdPromptConversion}
          onConfirm={() => {
            setShowGenModal(false);
            void handleGenImageAction({ genPrompt, useSdPromptConversion });
          }}
          onClose={() => setShowGenModal(false)}
        />
      </div>

      {toastMsg && (
        <div className="toast toast-bottom toast-start z-50">
          <div className={`alert ${toastMsg.type === 'success' ? 'alert-success' : 'alert-info'} shadow-lg`}>
            <span className="text-sm">{toastMsg.text}</span>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
