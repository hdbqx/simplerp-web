import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  api,
  type ApiMode,
  type ApiPreset,
  type Character,
  type LorebookV2Entry,
  type Message,
  type Room,
  type RoomMessage,
  type Settings,
  type Variable,
  type VariableStage,
} from '../lib/db';
import { LLMClient } from '../lib/llm';
import { LorebookEngine } from '../lib/lorebook-engine';
import { VariableEngine } from '../lib/variable-engine';
import { replaceVariables as replaceBuiltInVariables } from '../lib/variables';
import { useChatStore } from '../lib/chat-store';
import type { ViewMode } from '../lib/store';

type ToastMessage = {
  text: string;
  type: 'info' | 'success';
};

type ImageGenerationOptions = {
  genPrompt: string;
  useSdPromptConversion: boolean;
};

type UseChatControllerParams = {
  settings?: Settings;
  activePresetId?: number;
  activeModel?: string;
  presets: ApiPreset[];
  viewMode: ViewMode;
  selectedCharId?: number;
  selectedRoomId?: number;
  characters: Character[];
  rooms: Room[];
  roomMessages: RoomMessage[];
  setRoomMessages: Dispatch<SetStateAction<RoomMessage[]>>;
  globalVariables: Variable[];
  setGlobalVariables: Dispatch<SetStateAction<Variable[]>>;
  globalStages: VariableStage[];
  lorebookEntries: LorebookV2Entry[];
  loadData: () => Promise<void>;
  getPresetMode: (preset?: ApiPreset) => ApiMode;
};

export function useChatController({
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
}: UseChatControllerParams) {
  const [toastMsg, setToastMsg] = useState<ToastMessage | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getCharMessages = () => useChatStore.getState().messages;
  const setCharMessages = useChatStore.getState().setMessages;
  const clearCharMessages = useChatStore.getState().clearMessages;

  const showToast = (text: string, type: 'info' | 'success' = 'info') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    if (viewMode === 'char' && selectedCharId) {
      setTurnCount(0);
    }
  }, [viewMode, selectedCharId]);

  const stopGeneration = () => {
    if (!abortControllerRef.current) return;
    abortControllerRef.current.abort();
    abortControllerRef.current = null;
    setIsTyping(false);
  };

  const sendRoomChat = async (userText: string, speakerCharId: number | null): Promise<boolean> => {
    if (!settings) return false;
    if (!selectedRoomId) {
      alert('Please select a room first.');
      return false;
    }

    setIsTyping(true);
    try {
      if (speakerCharId) {
        if (!activePresetId || !activeModel) {
          alert('Please select a preset and model first.');
          return false;
        }
        await api.roomChat.send({
          room_id: selectedRoomId,
          user_input: userText || undefined,
          speaker_char_id: speakerCharId,
          fallback_preset_id: activePresetId,
          fallback_model_id: activeModel,
        });
      } else if (userText) {
        await api.roomMessages.add({
          room_id: selectedRoomId,
          role: 'user',
          sender_type: 'user',
          content: userText,
          timestamp: Date.now(),
        });
      }

      const latest = await api.roomMessages.list(selectedRoomId);
      setRoomMessages(latest);
      return true;
    } catch (error: any) {
      alert(error.message || String(error));
      return false;
    } finally {
      setIsTyping(false);
    }
  };

  const triggerAI = async (char: Character, textOverride?: string, historyOverride?: Message[]) => {
    if (isTyping || !settings) return;
    if (!activePresetId || !activeModel) {
      alert('Please select a preset and model first.');
      return;
    }

    const currentPreset = presets.find((preset) => preset.id === activePresetId);
    if (!currentPreset) {
      alert('Invalid preset.');
      return;
    }

    const varEngine = new VariableEngine(globalVariables, globalStages);
    const loreEngine = new LorebookEngine(lorebookEntries);
    const currentHistory = (historyOverride || getCharMessages()).filter(
      (message) => message.content || message.role === 'user',
    );
    const hasPriorDialogue = currentHistory.some((message) => message.role !== 'user');
    const shouldInjectFirstMessage = !hasPriorDialogue && !!char.first_message;
    const firstUserMessage = shouldInjectFirstMessage
      ? currentHistory.find((message) => message.role === 'user')
      : undefined;
    const firstMessageTimestamp = firstUserMessage ? Math.max(1, firstUserMessage.timestamp - 1) : Date.now();
    const effectiveHistory = shouldInjectFirstMessage
      ? [
          {
            role: 'assistant' as const,
            content: char.first_message,
            timestamp: firstMessageTimestamp,
            char_id: char.id,
          },
          ...currentHistory,
        ]
      : currentHistory;

    const triggeredLorebook = loreEngine.scan(textOverride || '', effectiveHistory, varEngine.getVariablesMap(), {});
    const lorebookInjections = loreEngine.buildInjection(triggeredLorebook);
    if (triggeredLorebook.length > 0) {
      showToast(
        `Lorebook activated: ${triggeredLorebook.map((item: any) => item.name || item.keywords).join(', ')}`,
      );
    }

    const stagePrompts = varEngine.getActiveStagePrompts().join('\n');

    let basePrompt = char.description;
    if (char.summary) basePrompt += `\n\n[Summary]\n${char.summary}`;
    if (stagePrompts) basePrompt += `\n\n[Current State]\n${stagePrompts}`;

    const rawSystemContent =
      (lorebookInjections.beforeSystem ? `${lorebookInjections.beforeSystem}\n---\n` : '') +
      basePrompt +
      (lorebookInjections.afterSystem ? `\n---\n${lorebookInjections.afterSystem}` : '');

    const fullSystemContent = replaceBuiltInVariables(
      varEngine.replaceVariables(rawSystemContent, settings, char),
      settings,
      char,
    );

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsTyping(true);

    const tempTs = Date.now() + 1;
    if (shouldInjectFirstMessage) {
      const firstMessage: Message = {
        role: 'assistant',
        content: char.first_message,
        char_id: char.id,
        timestamp: firstMessageTimestamp,
      };

      setCharMessages((current) => {
        const next = [...current];
        const insertAt = firstUserMessage
          ? next.findIndex((message) => message.role === 'user' && message.timestamp === firstUserMessage.timestamp)
          : -1;
        if (insertAt >= 0) next.splice(insertAt, 0, firstMessage);
        else next.unshift(firstMessage);
        return next;
      });

      api.messages
        .add(firstMessage)
        .then((result) => {
          setCharMessages((current) =>
            current.map((message) =>
              message.timestamp === firstMessage.timestamp ? { ...message, id: result.id } : message,
            ),
          );
        })
        .catch(console.error);
    }

    setCharMessages((current) => [...current, { role: 'assistant', content: '', char_id: char.id, timestamp: tempTs }]);

    const llm = new LLMClient(currentPreset.api_base, currentPreset.api_key, getPresetMode(currentPreset));
    let fullContent = '';

    try {
      const stream = llm.chatStream(
        char,
        effectiveHistory,
        textOverride || '',
        settings,
        activeModel,
        fullSystemContent,
        undefined,
        controller,
      );
      for await (const chunk of stream) {
        fullContent += chunk;
        setCharMessages((current) =>
          current.map((message) => (message.timestamp === tempTs ? { ...message, content: fullContent } : message)),
        );
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') console.error('Generation failed:', error);
    } finally {
      if (fullContent.trim()) {
        try {
          const result = await api.messages.add({
            role: 'assistant',
            content: fullContent,
            char_id: char.id,
            timestamp: tempTs,
          });
          setCharMessages((current) =>
            current.map((message) => (message.timestamp === tempTs ? { ...message, id: result.id } : message)),
          );

          setTurnCount((current) => {
            const nextCount = current + 1;
            const interval = settings?.thought_interval ?? 5;
            if (settings?.is_thought_auto_update && nextCount >= interval) {
              const thoughtHistory = [
                ...effectiveHistory.slice(-9),
                { role: 'assistant' as const, content: fullContent, timestamp: tempTs, char_id: char.id },
              ];

              api.variableThoughtConfig
                .triggerThought({
                  char_id: char.id,
                  history: thoughtHistory,
                  user_input: textOverride,
                  preset_id: settings?.thought_preset_id,
                  model: settings?.thought_model_id || activeModel,
                })
                .then((result) => {
                  if (result?.updates?.length > 0) {
                    showToast('Background thought update completed.', 'success');
                  }
                  api.variables.list(char.id).then(setGlobalVariables);
                })
                .catch(console.error);

              return 0;
            }
            return nextCount;
          });

          const updatedVars = globalVariables.map((variable) => varEngine.applyStageEffects(variable));
          const changedVars = updatedVars.filter(
            (variable, index) => variable.value !== globalVariables[index]?.value && variable.id != null,
          );
          if (changedVars.length > 0) {
            setGlobalVariables(updatedVars);
            api.variables
              .bulkUpdate(changedVars.map((variable) => ({ id: variable.id!, value: variable.value })))
              .catch(console.error);
          }

          api.snapshots
            .autoCreate({
              char_id: char.id,
              user_message: textOverride || '',
              ai_response: fullContent,
            })
            .catch(console.error);
        } catch {
          // Ignore DB persistence failures for streamed temp messages.
        }
      } else {
        setCharMessages((current) => current.filter((message) => message.timestamp !== tempTs));
      }

      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const handleGenImageAction = async ({ genPrompt, useSdPromptConversion }: ImageGenerationOptions) => {
    if (!settings) return;

    const imageBackend = settings.image_backend || 'huggingface';
    const rawPrompt =
      genPrompt ||
      (viewMode === 'group'
        ? roomMessages.length > 0
          ? roomMessages[roomMessages.length - 1].content
          : ''
        : getCharMessages().length > 0
          ? getCharMessages()[getCharMessages().length - 1].content
          : '');
    if (!rawPrompt) return;

    setIsTyping(true);
    try {
      let finalPrompt = rawPrompt;

      if (useSdPromptConversion) {
        const sdPromptPreset =
          presets.find((preset) => preset.id === settings.sd_prompt_preset_id) ||
          presets.find((preset) => preset.id === activePresetId);
        const sdPromptModel = settings.sd_prompt_model_id || activeModel;
        if (sdPromptPreset && sdPromptModel) {
          const llm = new LLMClient(sdPromptPreset.api_base, sdPromptPreset.api_key, getPresetMode(sdPromptPreset));
          const tags = await llm.generateImageTags(rawPrompt, sdPromptModel);
          finalPrompt = `1girl, (photorealistic:1.3), best quality, ultra high res, soft lighting, ${tags}`;
        }
      }

      let reqBody: any = {
        char_id: viewMode === 'char' ? selectedCharId : undefined,
        room_id: viewMode === 'group' ? selectedRoomId : undefined,
      };

      if (imageBackend === 'huggingface') {
        if (!settings.hf_keys) throw new Error('Please configure the ComfyUI tunnel URL first.');
        reqBody = {
          ...reqBody,
          backend: 'huggingface',
          model: 'comfyui-local',
          apiKey: settings.hf_keys,
          payload: { prompt: finalPrompt },
        };
      } else if (imageBackend === 'modelscope') {
        if (!settings.modelscope_api_key) throw new Error('Please configure the ModelScope API key first.');
        reqBody = {
          ...reqBody,
          backend: 'modelscope',
          model: settings.modelscope_model || 'Tongyi-MAI/Z-Image-Turbo',
          apiKey: settings.modelscope_api_key,
          payload: { prompt: finalPrompt, size: '1024x1024', n: 1 },
        };
      } else {
        const imagePreset =
          presets.find((preset) => preset.id === settings.image_preset_id) ||
          presets.find((preset) => preset.id === activePresetId);
        const imageModel = settings.image_model_id || activeModel;
        if (!imagePreset || !imageModel) throw new Error('Please configure the image preset and model first.');
        reqBody = {
          ...reqBody,
          backend: 'openai',
          apiBase: imagePreset.api_base,
          apiKey: imagePreset.api_key,
          model: imageModel,
          payload: { prompt: finalPrompt, size: '1024x1024', n: 1, response_format: 'b64_json' },
        };
      }

      const response = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Image generation failed.' }));
        throw new Error(errorData.error || 'The backend did not respond correctly.');
      }

      const data = await response.json();
      const imgSrc =
        (Array.isArray(data?.images) && data.images[0] ? `data:image/png;base64,${data.images[0]}` : '') ||
        (Array.isArray(data?.urls) && data.urls[0] ? data.urls[0] : '');
      if (!imgSrc) throw new Error('The backend did not return an image.');

      const timestamp = Date.now();
      const imageMsg: Message = {
        role: 'assistant',
        content: '',
        image: imgSrc,
        timestamp,
        char_id: selectedCharId,
      };
      setCharMessages((current) => [...current, imageMsg]);

      try {
        const saved = await api.messages.add(imageMsg);
        setCharMessages((current) =>
          current.map((message) => (message.timestamp === timestamp ? { ...message, id: saved.id } : message)),
        );
      } catch (error) {
        console.error('Failed to persist generated image message:', error);
      }
    } catch (error: any) {
      alert(`Image generation failed: ${error.message}`);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || !settings || isTyping) return false;

    if (viewMode === 'group') {
      return sendRoomChat(text, null);
    }

    const timestamp = Date.now();
    const userMsg: Message = { role: 'user', content: text, timestamp, char_id: selectedCharId };
    setCharMessages((current) => [...current, userMsg]);

    try {
      const result = await api.messages.add(userMsg);
      const msgWithId = { ...userMsg, id: result.id };
      const baseHistory = getCharMessages().filter((message) => message.timestamp !== timestamp);
      setCharMessages((current) => current.map((message) => (message.timestamp === timestamp ? msgWithId : message)));
      if (viewMode === 'char' && selectedCharId) {
        const selectedChar = characters.find((character) => character.id === selectedCharId);
        if (selectedChar) {
          await triggerAI(selectedChar, text, [...baseHistory, msgWithId]);
        }
      }
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const handleRegenerate = async () => {
    const messages = getCharMessages();
    if (messages.length === 0 || isTyping) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== 'assistant') return;

    const newHistory = messages.slice(0, -1);
    setCharMessages(newHistory);
    if (lastMsg.id) await api.messages.delete(lastMsg.id);
    const char = characters.find((character) => character.id === lastMsg.char_id);
    const lastUserMsg = [...newHistory].reverse().find((message) => message.role === 'user');
    if (char) void triggerAI(char, lastUserMsg?.content || '', newHistory);
  };

  const handleDeleteCharMessage = async (message: Message) => {
    if (!confirm('Delete this message?')) return;
    if (message.id) {
      await api.messages.delete(message.id);
      setCharMessages((current) => current.filter((item) => item.id !== message.id));
      return;
    }
    setCharMessages((current) => current.filter((item) => item.timestamp !== message.timestamp));
  };

  const handleEditCharMessage = async (messageId: number, content: string) => {
    await api.messages.update(messageId, content);
    setCharMessages((current) =>
      current.map((item) => (item.id === messageId ? { ...item, content } : item)),
    );
  };

  const handleSaveCharImage = async (message: Message) => {
    try {
      const result = await api.messages.add(message);
      setCharMessages((current) =>
        current.map((item) => (item.timestamp === message.timestamp ? { ...item, id: result.id } : item)),
      );
      alert('Image saved.');
    } catch {
      alert('Failed to save image.');
    }
  };

  const handleClearConversation = () => {
    if (!confirm('Clear the current conversation?')) return;

    if (viewMode === 'group' && selectedRoomId) {
      api.roomMessages.clear(selectedRoomId).then(() => {
        setRoomMessages([]);
        alert('Conversation cleared.');
      });
      return;
    }

    api.messages.clear(viewMode === 'char' ? selectedCharId : undefined).then(() => {
      clearCharMessages();
      alert('Conversation cleared.');
    });
  };

  const handleSummarizeProgress = async () => {
    if (!activePresetId || !activeModel) {
      alert('Please select a model first.');
      return;
    }

    try {
      setIsTyping(true);
      const currentPreset = presets.find((preset) => preset.id === activePresetId);
      if (!currentPreset) throw new Error('Invalid preset.');

      const summaryPreset = presets.find((preset) => preset.id === settings?.summary_preset_id) || currentPreset;
      const summaryModel = settings?.summary_model_id || activeModel;
      const llm = new LLMClient(summaryPreset.api_base, summaryPreset.api_key, getPresetMode(summaryPreset));

      const sourceMessages = viewMode === 'group' ? roomMessages : getCharMessages();
      const fragment = await llm.summarizeRecent(sourceMessages as Message[], summaryModel);
      if (!fragment) {
        alert('No new progress was detected.');
        return;
      }

      const date = new Date().toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      });

      if (viewMode === 'char' && selectedCharId) {
        const char = characters.find((character) => character.id === selectedCharId);
        const updatedSummary = (char?.summary ? `${char.summary}\n\n` : '') + `#### [Summary ${date}]\n${fragment}`;
        await api.characters.update(selectedCharId, { summary: updatedSummary });
      } else if (viewMode === 'group' && selectedRoomId) {
        const room = rooms.find((item) => item.id === selectedRoomId);
        const updatedSummary = (room?.summary ? `${room.summary}\n\n` : '') + `#### [Group Summary ${date}]\n${fragment}`;
        await api.rooms.update(selectedRoomId, { summary: updatedSummary });
      }

      await loadData();
      alert('Summary appended.');
    } catch (error: any) {
      alert(error.message || 'Failed to summarize progress.');
    } finally {
      setIsTyping(false);
    }
  };

  return {
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
  };
}
