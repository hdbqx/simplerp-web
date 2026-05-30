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
import { LorebookEngine, type LorebookInjectionBuckets } from '../lib/lorebook-engine';
import { getActivePromptProfile } from '../lib/prompt-profiles';
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

  const joinLorebookEntries = (entries: string[]) => entries.filter(Boolean).join('\n---\n');

  const insertSystemMessages = (
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    index: number,
    entries: string[],
  ) => {
    const normalized = entries
      .map((content) => content.trim())
      .filter(Boolean)
      .map((content) => ({ role: 'system' as const, content }));
    if (normalized.length === 0) return messages;

    const next = [...messages];
    const safeIndex = Math.max(0, Math.min(index, next.length));
    next.splice(safeIndex, 0, ...normalized);
    return next;
  };

  const buildLorebookChatMessages = (
    history: Message[],
    injections: LorebookInjectionBuckets,
  ): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> => {
    let messages = history.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    messages = insertSystemMessages(messages, 0, injections.after_system);

    const lastUserIndex = messages.map((message) => message.role).lastIndexOf('user');
    if (lastUserIndex >= 0) {
      messages = insertSystemMessages(messages, lastUserIndex, injections.before_user);
      const updatedLastUserIndex = messages.map((message) => message.role).lastIndexOf('user');
      messages = insertSystemMessages(messages, updatedLastUserIndex + 1, injections.after_user);
    }

    const lastAssistantIndex = messages.map((message) => message.role).lastIndexOf('assistant');
    if (lastAssistantIndex >= 0) {
      messages = insertSystemMessages(messages, lastAssistantIndex, injections.before_ai);
      const updatedLastAssistantIndex = messages.map((message) => message.role).lastIndexOf('assistant');
      messages = insertSystemMessages(messages, updatedLastAssistantIndex + 1, injections.after_ai);
    } else {
      messages = insertSystemMessages(messages, messages.length, injections.before_ai);
      messages = insertSystemMessages(messages, messages.length, injections.after_ai);
    }

    messages = insertSystemMessages(messages, messages.length, injections.last);
    return messages;
  };

  const sendRoomChat = async (userText: string, speakerCharId: number | null): Promise<boolean> => {
    if (!settings) return false;
    if (!selectedRoomId) {
      alert('请先选择一个群聊房间。');
      return false;
    }

    setIsTyping(true);
    try {
      if (speakerCharId) {
        if (!activePresetId || !activeModel) {
          alert('请先选择预设与模型。');
          return false;
        }
        const promptProfile = getActivePromptProfile(settings);
        await api.roomChat.send({
          room_id: selectedRoomId,
          user_input: userText || undefined,
          speaker_char_id: speakerCharId,
          fallback_preset_id: activePresetId,
          fallback_model_id: activeModel,
          global_system_instruction: promptProfile.global_system_instruction,
          global_post_history_instruction: promptProfile.global_post_history_instruction,
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
      alert('请先选择预设与模型。');
      return;
    }

    const currentPreset = presets.find((preset) => preset.id === activePresetId);
    if (!currentPreset) {
      alert('当前预设无效。');
      return;
    }

    const promptProfile = getActivePromptProfile(settings);
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
      showToast(`世界书已触发：${triggeredLorebook.map((item: any) => item.name || item.keywords).join('、')}`);
    }

    const stagePrompts = varEngine.getActiveStagePrompts().join('\n');
    const globalSystemInstruction = (promptProfile.global_system_instruction || '').trim();
    const globalPostHistoryInstruction = (promptProfile.global_post_history_instruction || '').trim();

    let basePrompt = char.description;
    if (char.summary) basePrompt += `\n\n【阶段总结】\n${char.summary}`;
    if (stagePrompts) basePrompt += `\n\n【当前状态】\n${stagePrompts}`;

    const rawSystemContent = [
      globalSystemInstruction,
      (lorebookInjections.before_system.length > 0 ? `${joinLorebookEntries(lorebookInjections.before_system)}\n---\n` : '') +
        basePrompt +
        '',
    ]
      .filter(Boolean)
      .join('\n\n---\n\n');

    const fullSystemContent = replaceBuiltInVariables(
      varEngine.replaceVariables(rawSystemContent, settings, char),
      settings,
      char,
    );
    const lorebookChatMessages = buildLorebookChatMessages(effectiveHistory, lorebookInjections).map((message) => ({
      ...message,
      content: replaceBuiltInVariables(varEngine.replaceVariables(message.content, settings, char), settings, char),
    }));
    const fullPostHistoryInstruction = globalPostHistoryInstruction
      ? replaceBuiltInVariables(varEngine.replaceVariables(globalPostHistoryInstruction, settings, char), settings, char)
      : '';

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
        fullPostHistoryInstruction,
        undefined,
        controller,
        lorebookChatMessages,
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
                  thought_prompt: promptProfile.thought_prompt,
                })
                .then((result) => {
                  if (result?.updates?.length > 0) {
                    showToast('后台变量推演已完成。', 'success');
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

    const promptProfile = getActivePromptProfile(settings);
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
          const tags = await llm.generateImageTags(rawPrompt, sdPromptModel, {
            systemPrompt: promptProfile.sd_system_prompt,
            userPromptTemplate: promptProfile.sd_user_prompt,
          });
          finalPrompt = tags;
        }
      }

      let reqBody: any = {
        char_id: viewMode === 'char' ? selectedCharId : undefined,
        room_id: viewMode === 'group' ? selectedRoomId : undefined,
      };

      if (imageBackend === 'huggingface') {
        if (!settings.hf_keys) throw new Error('请先在设置中填写 ComfyUI 穿透地址。');
        reqBody = {
          ...reqBody,
          backend: 'huggingface',
          model: 'comfyui-local',
          apiKey: settings.hf_keys,
          payload: { prompt: finalPrompt },
        };
      } else if (imageBackend === 'modelscope') {
        if (!settings.modelscope_api_key) throw new Error('请先在设置中填写 ModelScope 接口密钥。');
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
        if (!imagePreset || !imageModel) throw new Error('请先配置生图预设与模型。');
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
        const errorData = await response.json().catch(() => ({ error: '生图失败。' }));
        throw new Error(errorData.error || '生图后端没有正确返回结果。');
      }

      const data = await response.json();
      const imgSrc =
        (Array.isArray(data?.images) && data.images[0] ? `data:image/png;base64,${data.images[0]}` : '') ||
        (Array.isArray(data?.urls) && data.urls[0] ? data.urls[0] : '');
      if (!imgSrc) throw new Error('后端没有返回图片内容。');

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
      alert(`生图失败：${error.message}`);
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
    if (!confirm('确定删除这条消息吗？')) return;
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
      alert('图片已保存。');
    } catch {
      alert('图片保存失败。');
    }
  };

  const handleClearConversation = () => {
    if (!confirm('确定清空当前对话吗？')) return;

    if (viewMode === 'group' && selectedRoomId) {
      api.roomMessages.clear(selectedRoomId).then(() => {
        setRoomMessages([]);
        alert('对话已清空。');
      });
      return;
    }

    api.messages.clear(viewMode === 'char' ? selectedCharId : undefined).then(() => {
      clearCharMessages();
      alert('对话已清空。');
    });
  };

  const handleSummarizeProgress = async () => {
    if (!activePresetId || !activeModel || !settings) {
      alert('请先选择模型。');
      return;
    }

    try {
      setIsTyping(true);
      const currentPreset = presets.find((preset) => preset.id === activePresetId);
      if (!currentPreset) throw new Error('当前预设无效。');

      const promptProfile = getActivePromptProfile(settings);
      const summaryPreset = presets.find((preset) => preset.id === settings.summary_preset_id) || currentPreset;
      const summaryModel = settings.summary_model_id || activeModel;
      const llm = new LLMClient(summaryPreset.api_base, summaryPreset.api_key, getPresetMode(summaryPreset));

      const sourceMessages = viewMode === 'group' ? roomMessages : getCharMessages();
      const fragment = await llm.summarizeRecent(sourceMessages as Message[], summaryModel, {
        systemPrompt: promptProfile.summary_system_prompt,
        userPromptTemplate: promptProfile.summary_user_prompt,
      });

      if (!fragment || fragment.trim() === '无新进展') {
        alert('这段对话没有检测到新的记忆进展。');
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
        const updatedSummary = (char?.summary ? `${char.summary}\n\n` : '') + `#### [总结 ${date}]\n${fragment}`;
        await api.characters.update(selectedCharId, { summary: updatedSummary });
      } else if (viewMode === 'group' && selectedRoomId) {
        const room = rooms.find((item) => item.id === selectedRoomId);
        const updatedSummary = (room?.summary ? `${room.summary}\n\n` : '') + `#### [群聊总结 ${date}]\n${fragment}`;
        await api.rooms.update(selectedRoomId, { summary: updatedSummary });
      }

      await loadData();
      alert('总结已追加到记忆中。');
    } catch (error: any) {
      alert(error.message || '总结失败。');
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
