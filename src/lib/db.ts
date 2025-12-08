import Dexie, { type Table } from 'dexie';

export interface Character {
  id?: number;
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_message: string;
  mes_example: string;
  // --- 修复点：添加这两个可选字段 ---
  output_template?: string;
  custom_css?: string; 
}

export interface Message {
  id?: number;
  char_id: number;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  timestamp: number;
}

export interface Settings {
  id?: number;
  api_base: string;
  api_key: string;
  model: string;
  model_list: string;
  sd_url: string;
  baidu_appid: string;
  baidu_secret: string;
  temperature: number;
}

class RPDatabase extends Dexie {
  characters!: Table<Character>;
  messages!: Table<Message>;
  settings!: Table<Settings>;

  constructor() {
    super('SimpleRPDB');
    this.version(1).stores({
      characters: '++id, name',
      messages: '++id, char_id, timestamp',
      settings: '++id'
    });
  }
}

export const db = new RPDatabase();

export async function initDB() {
  const count = await db.settings.count();
  if (count === 0) {
    await db.settings.add({
      api_base: import.meta.env.VITE_API_BASE || "https://ark.cn-beijing.volces.com/api/v3",
      api_key: import.meta.env.VITE_API_KEY || "",
      model: "",
      model_list: "",
      sd_url: import.meta.env.VITE_SD_URL || "http://127.0.0.1:7860",
      baidu_appid: "",
      baidu_secret: "",
      temperature: 0.7
    });
  }

  const charCount = await db.characters.count();
  if (charCount === 0) {
    await db.characters.add({
      name: "薇薇安",
      description: "薇薇安是来自2077年夜之城的黑客。",
      personality: "傲娇, 毒舌",
      scenario: "赛博朋克公寓",
      first_message: "喂，别碰我的控制台！",
      mes_example: "",
      custom_css: "",
      output_template: ""
    });
  }
}