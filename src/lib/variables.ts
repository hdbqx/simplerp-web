import type { Character, Settings } from './db';

export function replaceVariables(text: string, settings: Settings, char?: Character): string {
  if (!text) return "";

  const userName = settings.user_name || "User";

  const variables: Record<string, string> = {
    'user': userName,
    'char': char?.name || 'Assistant',
    'char_name': char?.name || 'Assistant',
    'date': new Date().toLocaleDateString(),
    'time': new Date().toLocaleTimeString(),
    'weekday': new Date().toLocaleDateString('zh-CN', { weekday: 'long' }),
  };

  return text.replace(/\{\{([\w_]+)\}\}/g, (match, key) => {
    const k = key.toLowerCase();
    return variables[k] !== undefined ? variables[k] : match;
  });
}