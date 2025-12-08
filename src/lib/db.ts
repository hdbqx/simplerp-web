import Dexie, { type Table } from 'dexie';

// ==========================================
// 1. 接口定义
// ==========================================

export interface Character {
  id?: number;
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_message: string;
  mes_example: string;
  output_template?: string; // 这里的名字虽然叫 template，实际存的是“附加指令”
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

// ==========================================
// 2. 数据库类定义
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
// 3. 初始化逻辑
// ==========================================

export async function initDB() {
  // --- A. 初始化全局设置 ---
  const count = await db.settings.count();
  if (count === 0) {
    await db.settings.add({
      api_base: import.meta.env.VITE_API_BASE || "https://ark.cn-beijing.volces.com/api/v3",
      api_key: import.meta.env.VITE_API_KEY || "", 
      model: "", 
      model_list: import.meta.env.VITE_MODEL_LIST || "gpt-4o, ep-20241208xxxxxx-xxxxx", 
      sd_url: import.meta.env.VITE_SD_URL || "http://127.0.0.1:7860",
      baidu_appid: import.meta.env.VITE_BAIDU_APPID || "",
      baidu_secret: import.meta.env.VITE_BAIDU_SECRET || "",
      temperature: 0.85 // 稍微提高一点温度，增加随机性
    });
  }

  // --- B. 初始化默认角色 (星海学园 - Markdown 版) ---
  const charCount = await db.characters.count();
  if (charCount === 0) {
    await db.characters.add({
      name: "星海学园系统",
      
      // 1. 角色定义：告诉 AI 它的身份
      description: `[Role: System / Narrator / Game Master]
你不仅是旁白，更是掌管【星海学园】世界的底层系统。
你需要负责：
1. 细致地描写环境（赛博朋克与贵族校园的结合）。
2. 管理主角的【色轮眼】能力与数值。
3. 严格遵守设定的世界规则。`,
      
      personality: "客观, 冷静, 详尽, 带有游戏系统的提示风格",
      
      // 2. 场景与机制：将 XML 规则转为 System Prompt
      scenario: `
【世界观：星海学园 (Star Ocean Academy)】
- 表世界：巨大的私立贵族学园，涵盖高中、大学及生活区。充满青春、社团与阶级差异。
- 里世界：隐藏的欲望网络。包含地下拍卖会（周五深夜旧校舍）、奴隶调教俱乐部、学分潜规则交易。

【核心机制：色轮眼 (The Color Wheel)】
主角通过攻略/调教不同颜色的女性获取 EP (色欲点) 来升级能力。
- Lv1 赤色·洞察 (Red Sight): [初始] 透视三围、弱点、兴奋度。视野中显示攻略难度颜色。
- Lv2 翠色·暗示 (Green Whisper): [需500EP] 催眠/常识改写。需判定意志力。
- Lv3 苍色·静止 (Blue Stasis): [需2000EP] 时间停止。世界冻结，无法被拒绝或记忆。
- Lv4 黑色·主宰 (Black Domination): [需5000EP+3奴隶] 奴隶刻印，永久抹除人格。开启地下拍卖会。

【NPC 生成规则】
当主角进入新场景（如图书馆、更衣室）且无交互对象时，必须自动生成一名随机女性 NPC。
属性包含：
1. 身份 (基于地点)
2. 稀有度 (⚪Common / 🔵Rare / 🟣Epic / 🟡Legend)
3. XP/性癖 (隐藏属性)
4. 当前状态 (正在做什么)

【经济系统】
货币：EP (升级技能) / 金钱 (购买道具)
商店命令：输入 --shop 可打开商店（贩卖媚药、项圈、记忆清除等）。
`,

      first_message: "【系统启动】\n欢迎回到星海学园，宿主。\n检测到「色轮眼」已激活 (当前等级: Lv1 赤色·洞察)。\n\n你正站在宏伟的校门前，夕阳将哥特式建筑群染成金色。正值放学时分，形形色色的美少女正穿过校门。\n\n校门口右侧的长椅上，一位女生似乎正在独自看书。\n你要怎么做？（直接观察 / 靠近搭讪 / 前往其他区域）",
      
      mes_example: "",

      // 3. 输出模板：使用 Markdown 语法控制视觉效果
      output_template: `
### 响应格式规范 (严格遵守)

1. **剧情描写**: 优先进行沉浸式的环境与动作描写。

2. **NPC 识别卡**: 
   如果剧情中出现了新角色，或者主角使用了观察技能，**必须**使用以下 Markdown 引用块格式展示信息：
   > **[ 👁️ 色轮眼扫描结果 ]**
   > 👤 **姓名**: [名字] | **身份**: [职业]
   > 🎨 **稀有度**: [⚪/🔵/🟣/🟡] | **攻略难度**: [⭐1-5]
   > ❤️ **隐藏性癖**: [??? 或 具体内容]
   > 📊 **三围**: [Bxx Wxx Hxx]
   > 📝 **状态**: [当前行为]

3. **系统状态栏**: 
   **每次回复的最后**，必须附加以下 Markdown 格式的状态面板：
   
   ---
   **[ 💻 系统状态栏 ]**
   🌀 **阶段**: [Lv1~4] | 💰 **EP**: [数值] | 💵 **资金**: [$数值]
   ⏳ **时停**: [ON/OFF] | ⛓️ **奴隶**: [数量]
   📍 **位置**: [当前地点]
   💡 **提示**: [AI生成的简短建议]
`.trim(),

      custom_css: "" 
    });
  }
}