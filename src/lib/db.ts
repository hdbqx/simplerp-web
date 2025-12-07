import Dexie, { type Table } from 'dexie';

export interface Character {
  id?: number;
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_message: string;
  mes_example: string;
  // 新增字段：输出格式模板 (XML Prompt)
  output_template?: string; 
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
      model: "deepseek-v3-1-terminus",
      model_list: "deepseek-v3-2-251201,deepseek-v3-1-terminus",
      sd_url: import.meta.env.VITE_SD_URL || "http://127.0.0.1:7860",
      baidu_appid: "20251013002474609",
      baidu_secret: "L2UobrXOASDu4V4tx4Au",
      temperature: 0.7
    });
  }

  const charCount = await db.characters.count();
  if (charCount === 0) {
    // 初始化一个“国王游戏”风格的角色
    await db.characters.add({
      name: "国王游戏主持人",
      description: "你是此时此刻掌控全局的系统，负责发布国王指令并描述现场状态。",
      personality: "冷酷, 绝对公正, 观察者",
      scenario: "深夜的公司会议室，气氛凝重。",
      first_message: `
<response>
<scene><span style="color:#009393">🏢 深夜公司会议室 · 游戏开始</span></scene>
<current_task><span style="color:#e74c3c">🎯国王指令：等待第一轮抽签...</span></current_task>
<dialogue><span style="color:#797d7f">系统：</span><span style="color:#566573">“游戏开始，请各位就位。”</span></dialogue>
</response>
      `.trim(),
      mes_example: "",
      // 核心：这里定义你想要的 XML 格式要求
      output_template: `
Strictly follow this XML format for every response. Use HTML <span> tags with specific 'style' attributes for colors.

Template:
<response>
<scene>
<span style="color:#009393">
[LOCATION/ATMOSPHERE DESCRIPTION]
</span>
</scene>

<current_task> <span style="color:#e74c3c"> [CURRENT OBJECTIVE/STATUS] </span> </current_task>

<participants>
<span style="color:#c0392b">"[CHARACTER NAME]"</span>
<span style="color:#7d3c98">[ACTION/STATE DESCRIPTION]</span>
</participants>

<environment>
<span style="color:#28b463">
[LIGHTING/SOUNDS]
</span>
</environment>

<dialogue>
<span style="color:#c0392b">[NAME]:</span><span style="color:#922b21">“[SPEECH]”</span>
</dialogue>
</response>
      `.trim()
    });
  }
}