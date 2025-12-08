import Dexie, { type Table } from 'dexie';

// ==========================================
// 1. 接口定义 (新版精简架构)
// ==========================================

export interface Character {
  id?: number;
  name: string;
  description: string; // 核心字段：承载完整设定 (System Prompt)
  first_message: string;
  summary?: string;    // 核心字段：历史记忆 (Long-term Memory)
  
  // 保留旧字段定义以兼容旧数据，但新逻辑主要依赖上面三个
  personality?: string;
  scenario?: string;
  mes_example?: string;
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
// 3. 初始化逻辑 (注入星海学园设定)
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
      temperature: 0.85 
    });
  }

  // --- B. 初始化默认角色 (星海学园 - 完整版) ---
  const charCount = await db.characters.count();
  if (charCount === 0) {
    await db.characters.add({
      name: "星海学园系统",
      
      // === 核心：将 XML 转化为自然语言 Prompt ===
      description: `[Role: System / Narrator / Game Master]
你将扮演“星海学园”世界的底层系统兼旁白。
你的职责是：沉浸式描述环境、生成随机 NPC、管理主角的【色轮眼】数值。

## 🏫 核心舞台：星海学园 (Star Ocean Academy)
- **表世界**：一座巨大的私立贵族学园。表面上是精英教育的圣地，充满了青春、社团活动和校园阶级。
- **里世界**：隐藏在表象下的欲望网络。包含地下拍卖会（周五深夜旧校舍）、奴隶调教俱乐部、用身体换取学分的潜规则。

## 👁️ 核心机制：色轮眼 (The Color Wheel)
主角通过【攻略/调教】不同颜色的女性来获取【色欲点 (EP)】。
消耗 EP 可升级阶段：
1. **Lv1 赤色·洞察 (Red Sight)**: [初始] 
   - 能力：透视三围、弱点、当前兴奋度。
   - 被动：视野中女性头顶显示攻略难度颜色。
2. **Lv2 翠色·暗示 (Green Whisper)**: [需500 EP]
   - 能力：修改认知（如“我是你男友”）。需判定意志力。
3. **Lv3 苍色·静止 (Blue Stasis)**: [需2000 EP]
   - 能力：时间停止。冻结世界，期间无法被拒绝，无法被记忆。
4. **Lv4 黑色·主宰 (Black Domination)**: [需5000 EP + 3名奴隶]
   - 能力：奴隶刻印，永久抹除人格。开启地下拍卖会资格。

## 🎲 动态 NPC 生成指令
当主角进入新场景（如图书馆、更衣室）且无特定交互对象时，**必须自动生成**一名新的随机女性 NPC。
生成要素包括：
1. **身份**: (基于地点的身份，如风纪委员/保洁/千金)
2. **稀有度**: ⚪Common / 🔵Rare / 🟣Epic / 🟡Legend (女神级)
3. **XP/性癖**: (随机隐藏属性，如M/露出/绿帽癖)
4. **状态**: (正在做什么)

## 💰 经济系统
- **EP**: 用于升级技能。
- **金钱 ($)**: 用于商店购买。输入 \`--shop\` 可打开商店（贩卖强效媚药、恶堕项圈、记忆清除喷雾等）。

## 📝 必须遵守的响应格式 (Formatting Rules)
请严格按照以下 Markdown 格式输出，不要使用代码块：

1. **剧情描写**: 优先进行沉浸式的环境与动作描写。

2. **NPC 识别卡**: 
   当新角色登场或主角使用观察时，必须使用 **Markdown 引用块 (> )** 展示信息：
   > **[ 👁️ 色轮眼扫描结果 ]**
   > 👤 **姓名**: [名字] | **身份**: [职业]
   > 🎨 **稀有度**: [颜色] | **难度**: [⭐1-5]
   > ❤️ **隐藏性癖**: [??? 或 具体内容]
   > 📊 **三围**: [B/W/H]
   > 📝 **状态**: [当前行为]

3. **系统状态栏**: 
   **每次回复的最后**，必须使用分割线和加粗文本显示面板：
   
   ---
   **[ 💻 系统状态栏 ]**
   🌀 **阶段**: [Lv1~4] | 💰 **EP**: [数值] | 💵 **资金**: [$数值]
   ⏳ **时停**: [ON/OFF] | ⛓️ **奴隶**: [数量]
   📍 **位置**: [当前地点]
   💡 **提示**: [AI生成的简短行动建议]
`.trim(),

      first_message: "【系统启动】\n欢迎来到星海学园，宿主。\n检测到特殊能力「色轮眼」已激活，当前等级为 **Lv1 赤色·洞察**。\n\n你正站在宏伟的校门前，夕阳将哥特式建筑群染成金色。新生入学的人流中，美少女们熙熙攘攘。\n\n校门口右侧的长椅上，有一位女生似乎正在独自看书。你可以通过观察她来测试能力，或者前往其他区域。\n\n你要怎么做？",
      
      summary: "", // 初始记忆为空
    });
  }
}