import { Pencil, Users } from 'lucide-react';
import { ImageStudio } from '../ImageStudio';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import type { ApiMode, ApiPreset, Character, Message, RoomMessage, Settings } from '../../lib/db';

type GroupMember = {
  id: number;
  name: string;
};

type ChatWorkspaceProps = {
  viewMode: 'char' | 'group' | 'image';
  selectedCharId?: number;
  selectedRoomId?: number;
  roomMessages: RoomMessage[];
  settings?: Settings;
  currentCharacter?: Character;
  characterNameById: Map<number, string>;
  isTyping: boolean;
  groupMembers: GroupMember[];
  activePresetId?: number;
  activeModel?: string;
  presets: ApiPreset[];
  manualModels: string[];
  getPresetMode: (preset?: ApiPreset) => ApiMode;
  fetchPresetModels: (presetId?: number, force?: boolean) => Promise<void>;
  presetModelsMap: Record<number, string[]>;
  presetModelsLoading: Record<number, boolean>;
  onRegenerate: () => Promise<void>;
  onDeleteCharMessage: (message: Message) => Promise<void>;
  onEditCharMessage: (messageId: number, content: string) => Promise<void>;
  onSaveCharImage: (message: Message) => Promise<void>;
  onSend: (text: string) => Promise<boolean>;
  onSendAsMember: (text: string, memberId: number | null) => Promise<boolean>;
  onOpenImageGen: () => void;
  onStop: () => void;
};

export function ChatWorkspace({
  viewMode,
  selectedCharId,
  selectedRoomId,
  roomMessages,
  settings,
  currentCharacter,
  characterNameById,
  isTyping,
  groupMembers,
  activePresetId,
  activeModel,
  presets,
  manualModels,
  getPresetMode,
  fetchPresetModels,
  presetModelsMap,
  presetModelsLoading,
  onRegenerate,
  onDeleteCharMessage,
  onEditCharMessage,
  onSaveCharImage,
  onSend,
  onSendAsMember,
  onOpenImageGen,
  onStop,
}: ChatWorkspaceProps) {
  if (viewMode === 'image') {
    return (
      <ImageStudio
        settings={settings}
        presets={presets}
        activePresetId={activePresetId}
        activeModel={activeModel || ''}
        manualModels={manualModels}
        getPresetMode={getPresetMode}
        fetchPresetModels={fetchPresetModels}
        presetModelsMap={presetModelsMap}
        presetModelsLoading={presetModelsLoading}
      />
    );
  }

  if (viewMode === 'char' && !selectedCharId) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-md rounded-[2rem] border border-base-300 bg-base-100 p-8 text-center shadow-xl">
          <Pencil size={48} className="mx-auto mb-4 opacity-30" />
          <p>在侧栏选择一个角色，即可开始对话。</p>
        </div>
      </div>
    );
  }

  if (viewMode === 'group' && !selectedRoomId) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-md rounded-[2rem] border border-base-300 bg-base-100 p-8 text-center shadow-xl">
          <Users size={48} className="mx-auto mb-4 opacity-30" />
          <p>在侧栏选择一个房间，即可开始群聊。</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <MessageList
        viewMode={viewMode}
        roomMessages={roomMessages}
        settings={settings}
        currentCharacter={currentCharacter}
        characterNameById={characterNameById}
        isTyping={isTyping}
        onRegenerate={onRegenerate}
        onDeleteCharMessage={onDeleteCharMessage}
        onEditCharMessage={onEditCharMessage}
        onSaveCharImage={onSaveCharImage}
      />

      <ChatInput
        viewMode={viewMode}
        isTyping={isTyping}
        placeholder={
          viewMode === 'group'
            ? '输入消息，或使用上方成员按钮代发。'
            : '输入消息...'
        }
        scopeKey={`${viewMode}:${selectedCharId || selectedRoomId || 0}`}
        groupMembers={groupMembers}
        onSend={onSend}
        onSendAsMember={onSendAsMember}
        onOpenImageGen={onOpenImageGen}
        onStop={onStop}
      />
    </>
  );
}
