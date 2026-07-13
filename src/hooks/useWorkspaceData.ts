import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { api, type LorebookV2Entry, type Room, type RoomMember, type RoomMessage, type Variable, type VariableStage } from '../lib/db';
import type { ViewMode } from '../lib/store';
import { useChatStore } from '../lib/chat-store';

type CharEditTab = 'basic' | 'variables' | 'snapshots';

type UseWorkspaceDataParams = {
  selectedCharId?: number;
  selectedRoomId?: number;
  viewMode: ViewMode;
  showGroupEdit: boolean;
  showCharEdit: boolean;
  charEditTab: CharEditTab;
  rooms: Room[];
  loadData: () => Promise<void>;
};

type UseWorkspaceDataResult = {
  charVariables: Variable[];
  setCharVariables: Dispatch<SetStateAction<Variable[]>>;
  setCharLorebookEntries: Dispatch<SetStateAction<LorebookV2Entry[]>>;
  lorebookEntries: LorebookV2Entry[];
  globalVariables: Variable[];
  setGlobalVariables: Dispatch<SetStateAction<Variable[]>>;
  globalStages: VariableStage[];
  groupMemberIds: number[];
  roomMessages: RoomMessage[];
  setRoomMessages: Dispatch<SetStateAction<RoomMessage[]>>;
  roomMembersDraft: RoomMember[];
  setRoomMembersDraft: Dispatch<SetStateAction<RoomMember[]>>;
  loadCharData: () => Promise<void>;
  loadLorebookEntries: () => Promise<void>;
  loadCharArchive: () => Promise<void>;
  saveRoomConfigs: () => Promise<void>;
};

export function useWorkspaceData({
  selectedCharId,
  selectedRoomId,
  viewMode,
  showGroupEdit,
  showCharEdit,
  charEditTab,
  rooms,
  loadData,
}: UseWorkspaceDataParams): UseWorkspaceDataResult {
  const [charVariables, setCharVariables] = useState<Variable[]>([]);
  const [, setCharLorebookEntries] = useState<LorebookV2Entry[]>([]);
  const [lorebookEntries, setLorebookEntries] = useState<LorebookV2Entry[]>([]);
  const [globalVariables, setGlobalVariables] = useState<Variable[]>([]);
  const [globalStages, setGlobalStages] = useState<VariableStage[]>([]);
  const [groupMemberIds, setGroupMemberIds] = useState<number[]>([]);
  const [roomMessages, setRoomMessages] = useState<RoomMessage[]>([]);
  const [roomMembersDraft, setRoomMembersDraft] = useState<RoomMember[]>([]);

  const setCharMessages = useChatStore.getState().setMessages;
  const clearCharMessages = useChatStore.getState().clearMessages;

  const loadCharData = async () => {
    if (!selectedCharId) return;
    try {
      const vars = await api.variables.list(selectedCharId, undefined);
      setCharVariables(vars);
      setGlobalVariables(vars);

      let allStages: VariableStage[] = [];
      for (const variable of vars) {
        if (!variable.id) continue;
        const stages = await api.variableStages.list(variable.id);
        allStages = [...allStages, ...stages];
      }
      setGlobalStages(allStages);

      const lore = await api.lorebookV2.list(selectedCharId, undefined);
      setCharLorebookEntries(lore as LorebookV2Entry[]);
    } catch (error) {
      console.error('Failed to load char data', error);
    }
  };

  const loadLorebookEntries = async () => {
    if (!selectedCharId) return;
    const entries = await api.lorebookV2.list(selectedCharId, undefined);
    setLorebookEntries(entries as LorebookV2Entry[]);
  };

  const loadCharArchive = async () => {
    if (!selectedCharId) return;
    const [vars, lore] = await Promise.all([
      api.variables.list(selectedCharId, undefined),
      api.lorebookV2.list(selectedCharId, undefined),
    ]);
    setCharVariables(vars);
    setGlobalVariables(vars);
    setCharLorebookEntries(lore as LorebookV2Entry[]);
  };

  const saveRoomConfigs = async () => {
    if (!selectedRoomId) return;
    const room = rooms.find((item) => item.id === selectedRoomId);
    if (!room) return;

    await api.rooms.update(selectedRoomId, {
      name: room.name,
      description: room.description,
      summary: room.summary || '',
    });
    await api.rooms.updateMembers(
      selectedRoomId,
      roomMembersDraft.map((member) => ({ char_id: member.char_id })),
    );

    await loadData();
    const members = await api.rooms.getMembers(selectedRoomId).catch(() => []);
    setGroupMemberIds((members as any[]).map((item) => Number((item as any).char_id)).filter(Boolean));
    alert('群聊设置已保存。');
  };

  useEffect(() => {
    const handleConversationImageAdded = (event: Event) => {
      const detail = (event as CustomEvent<{ viewMode?: string; roomId?: number }>).detail;
      if (detail?.viewMode === 'group' && detail.roomId && detail.roomId === selectedRoomId) {
        void api.roomMessages.list(detail.roomId).then(setRoomMessages);
      }
    };

    window.addEventListener('simplerp:conversation-image-added', handleConversationImageAdded);
    return () => window.removeEventListener('simplerp:conversation-image-added', handleConversationImageAdded);
  }, [selectedRoomId]);

  useEffect(() => {
    if (!showGroupEdit || !selectedRoomId) return;
    api.rooms.getMembers(selectedRoomId).then((members) => setRoomMembersDraft(members as RoomMember[]));
  }, [showGroupEdit, selectedRoomId]);

  useEffect(() => {
    if (!showCharEdit || !selectedCharId) return;
    void loadCharData();
  }, [showCharEdit, selectedCharId, charEditTab]);

  useEffect(() => {
    clearCharMessages();
    setRoomMessages([]);

    if (viewMode === 'char' && selectedCharId) {
      api.messages.list(selectedCharId).then((nextMessages) => {
        setCharMessages(nextMessages);
      });
      void loadLorebookEntries();
      api.variables.list(selectedCharId).then(async (vars) => {
        setGlobalVariables(vars);
        let allStages: VariableStage[] = [];
        for (const variable of vars) {
          if (!variable.id) continue;
          const stages = await api.variableStages.list(variable.id);
          allStages = [...allStages, ...stages];
        }
        setGlobalStages(allStages);
      });
      return;
    }

    if (viewMode === 'group' && selectedRoomId) {
      api.rooms.getMembers(selectedRoomId).then((members) => {
        setGroupMemberIds((members || []).map((item) => item.char_id));
      });
      api.roomMessages.list(selectedRoomId).then(setRoomMessages);
    }
  }, [selectedCharId, selectedRoomId, viewMode]);

  return {
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
  };
}
