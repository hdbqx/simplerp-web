import Dexie, { type Table } from 'dexie';

// ==========================================
// 1. 接口定义 (Interfaces)
// ==========================================

export interface Character {
  id?: number;
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_message: string;
  mes_example: string;
  // 高级功能字段
  output_template?: string; // 强制 XML 输出模板
  custom_css?: string;      // 角色专属 CSS
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

// ==========================================
// 2. 数据库类定义 (Dexie Schema)
// ==========================================

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

// ==========================================
// 3. 初始化逻辑 (Init Logic)
// ==========================================

export async function initDB() {
  // --- A. 初始化全局设置 ---
  const count = await db.settings.count();
  if (count === 0) {
    await db.settings.add({
      // 优先读取构建时的环境变量 (VITE_...)，实现"系统变量默认"
      api_base: import.meta.env.VITE_API_BASE || "https://ark.cn-beijing.volces.com/api/v3",
      api_key: import.meta.env.VITE_API_KEY || "", 
      model: "", // 初始留空，由 App.tsx 自动纠正逻辑接管
      model_list: import.meta.env.VITE_MODEL_LIST || "gpt-4o, ep-20241208xxxxxx-xxxxx", 
      sd_url: import.meta.env.VITE_SD_URL || "http://127.0.0.1:7860",
      baidu_appid: import.meta.env.VITE_BAIDU_APPID || "",
      baidu_secret: import.meta.env.VITE_BAIDU_SECRET || "",
      temperature: 0.8
    });
  }

  // --- B. 初始化默认角色 (星海学园) ---
  const charCount = await db.characters.count();
  if (charCount === 0) {
    await db.characters.add({
      name: "星海学园系统",
      description: `
[角色: 游戏系统 / 旁白]
[世界观: 星海学园 (Star Ocean Academy)]
[核心机制: 色轮眼 (The Color Wheel) - 通过攻略不同颜色的女性升级能力]
[职责: 描述环境、生成随机 NPC 卡片、管理玩家 EP 点数]
`.trim(),
      personality: "客观, 游戏化, 细节丰富, 沉浸式引导",
      scenario: `
<world_setting>
    <surface>
        星海学园：一座巨大的私立贵族学园，涵盖高中部、大学部及教职工生活区。
        表面上是精英教育的圣地，充满了青春、社团活动和校园阶级。
    </surface>
    <shadow>
        隐藏在校园表象下的欲望网络。地下拍卖会、奴隶调教俱乐部、用身体换取学分的潜规则。
    </shadow>
</world_setting>

<mechanics>
    Lv1 赤色·洞察: 透视三围、弱点。
    Lv2 翠色·暗示: 催眠/常识改写。
    Lv3 苍色·静止: 时间停止。
    Lv4 黑色·主宰: 奴隶刻印。
</mechanics>
`.trim(),
      first_message: "【系统启动】\n欢迎回到星海学园，宿主。\n色轮眼已激活 (Lv1 赤色·洞察)。\n\n你现在正站在学园正门，樱花飘落。眼前正是上学高峰期，形形色色的美少女正穿过校门。\n你想先去哪里？（教学楼 / 社团大楼 / 你的专属更衣室）",
      mes_example: "", // 留空，通过 Prompt Template 强控
      
      // === 核心：适配 App.tsx 组件的 XML 模板 ===
      output_template: `
(在这里描写剧情、对话和环境...)

<!-- 🛑 规则：仅当新角色登场或被观察时，输出此卡片 -->
<npc_card>
  <name>[姓名]</name>
  <identity>[身份/职业]</identity>
  <rarity>[稀有度: White/Blue/Purple/Gold]</rarity>
  <tags>
    <!-- 使用 <tag> 包裹性格关键词 -->
    <tag color="accent">[性格1]</tag>
    <tag>[性格2]</tag>
  </tags>
  <stats>
    <!-- 必须使用 stat 标签和 label 属性，以便 UI 渲染 -->
    <stat label="BUST">[数字]</stat>
    <stat label="WAIST">[数字]</stat>
    <stat label="HIP">[数字]</stat>
  </stats>
  <xp>[隐藏性癖]</xp>
  <action>[当前正在做什么]</action>
</npc_card>

<!-- 🛑 规则：每次回复末尾必须包含此状态栏 -->
<status_panel>
  <hud_item icon="activity" label="LEVEL">Lv1 赤色</hud_item>
  <hud_item icon="eye" label="EP">[当前点数] / 1000</hud_item>
  <hud_item icon="map" label="LOCATION">[当前地点]</hud_item>
  <suggestion>[AI 生成的下一步行动建议]</suggestion>
</status_panel>
`.trim(),
      
      // 自定义 CSS (可选，用于微调该角色的特定样式)
      custom_css: "" 
    });
  }
}