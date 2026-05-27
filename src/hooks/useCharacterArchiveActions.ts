import { useRef, type ChangeEvent } from 'react';
import type { Character } from '../lib/db';
import {
  exportCharacterArchive as exportCharacterArchiveFile,
  importCharacterArchive as importCharacterArchiveFile,
} from '../lib/character-archive';

type UseCharacterArchiveActionsParams = {
  selectedCharId?: number;
  characters: Character[];
  loadData: () => Promise<void>;
  onArchiveLoaded: () => Promise<void>;
};

export function useCharacterArchiveActions({
  selectedCharId,
  characters,
  loadData,
  onArchiveLoaded,
}: UseCharacterArchiveActionsParams) {
  const importFileRef = useRef<HTMLInputElement>(null);

  const exportCharacter = async () => {
    await exportCharacterArchiveFile({
      selectedCharId,
      characters,
    });
  };

  const importCharacterArchive = async (text: string) => {
    await importCharacterArchiveFile({
      selectedCharId,
      text,
      characters,
      loadData,
      onArchiveLoaded,
    });
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importCharacterArchive(text);
    } finally {
      event.target.value = '';
    }
  };

  return {
    importFileRef,
    exportCharacter,
    handleImportFile,
  };
}
