import Dexie, { type Table } from 'dexie';

export interface Character {
  id?: number;
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_message: string;
  mes_example: string;
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
    // === 环境变量读取逻辑 ===
    // 允许在构建/部署时通过 VITE_ 前缀的环境变量注入默认配置
    await db.settings.add({
      api_base: import.meta.env.VITE_API_BASE || "https://ark.cn-beijing.volces.com/api/v3",
      api_key: import.meta.env.VITE_API_KEY || "", // 支持默认 Key
      model: "", // 初始为空，由 App.tsx 自动纠正逻辑接管
      model_list: import.meta.env.VITE_MODEL_LIST || "ep-20241208xxxxxx-xxxxx, gpt-4o", // 支持默认模型列表
      sd_url: import.meta.env.VITE_SD_URL || "http://127.0.0.1:7860",
      baidu_appid: import.meta.env.VITE_BAIDU_APPID || "",
      baidu_secret: import.meta.env.VITE_BAIDU_SECRET || "",
      temperature: 0.8
    });
  }

  const charCount = await db.characters.count();
  if (charCount === 0) {
    // === 注入用户提供的“星海学园”默认设定 ===
    await db.characters.add({
      name: "星海学园系统",
      description: `
[角色: 系统/旁白]
[任务: 描述环境、生成随机 NPC、管理主角数值]
[世界观: 赛博朋克风格的贵族学园，表面光鲜，暗地里流通着奴隶与欲望]
`.trim(),
      personality: "绝对客观, 详尽, 具有游戏感的引导风格",
      scenario: `
<world_system id="color_wheel_infinite">
    <!-- 🏫 核心舞台 -->
    <setting>
        <surface_world>
            星海学园：一座巨大的私立贵族学园，涵盖高中部、大学部及教职工生活区。
            表面上是精英教育的圣地，充满了青春、社团活动和校园阶级。
        </surface_world>
        <shadow_world>
            隐藏在校园表象下的欲望网络。地下拍卖会（每周五深夜在旧校舍）、奴隶调教俱乐部、用身体换取学分的潜规则。
        </shadow_world>
    </setting>

    <!-- 👁️ 进化型神器：色轮眼 -->
    <system_mechanics>
        <progression>
            主角通过【攻略/调教】不同颜色的女性来点亮色轮，获取【色欲点 (EP)】。
            消耗 EP 可升级色轮眼阶段，解锁新能力。
        </progression>
        <phases>
            Lv1 赤色·洞察: 透视三围、弱点。
            Lv2 翠色·暗示: 催眠/常识改写。
            Lv3 苍色·静止: 时间停止。
            Lv4 黑色·主宰: 奴隶刻印，永久抹除人格。
        </phases>
    </system_mechanics>
</world_system>
`.trim(),
      first_message: "【系统启动】\n欢迎回到星海学园，宿主。\n色轮眼已激活 (Lv1 赤色·洞察)。\n\n你现在正站在学园正门，樱花飘落。眼前正是上学高峰期，形形色色的美少女正穿过校门。\n你想先去哪里？（教学楼 / 社团大楼 / 你的专属更衣室）",
      mes_example: "", // 规则已写入 Scenario 和 Template，此处留空减少 token 消耗
      output_template: `
(剧情描写...)

<npc_event_check>
<!-- 仅在新 NPC 出现时输出此块 -->
<npc_card>
  <name>[随机名]</name> <identity>[职业/身份]</identity>
  <rarity>[⚪Common / 🔵Rare / 🟣Epic / 🟡Legend]</rarity>
  <stats>B[数值] W[数值] H[数值]</stats>
  <xp>[隐藏性癖]</xp>
  <state>[当前行为]</state>
</npc_card>
</npc_event_check>

<status_panel>
  <line>🌀 阶段: [Lv1~4] | 💰 EP: [数值] | 💵 资金: [$数值]</line>
  <line>⏳ 时停: [ON/OFF] | 😵 催眠: [无/浅/深]</line>
  <line>📍 位置: [当前地点]</line>
  <suggestion>[AI生成的下一步行动建议]</suggestion>
</status_panel>
`.trim(),
      custom_css: `
/* 星海学园专用皮肤 */
.xml-npc-card {
  border-left: 4px solid #facc15; 
  background: linear-gradient(90deg, rgba(250, 204, 21, 0.1), transparent);
}
.xml-status-panel {
  border: 1px solid #3b82f6;
  background: rgba(0, 0, 0, 0.4);
  font-family: 'Courier New', monospace;
}
`.trim()
    });
  }
}