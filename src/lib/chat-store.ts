import { create } from 'zustand';
import type { SetStateAction } from 'react';
import type { Message } from './db';

type Updater<T> = SetStateAction<T>;

function resolveState<T>(updater: Updater<T>, prev: T): T {
  return typeof updater === 'function' ? (updater as (value: T) => T)(prev) : updater;
}

interface ChatStore {
  messages: Message[];
  setMessages: (updater: Updater<Message[]>) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  setMessages: (updater) => set((state) => ({ messages: resolveState(updater, state.messages) })),
  clearMessages: () => set({ messages: [] }),
}));
