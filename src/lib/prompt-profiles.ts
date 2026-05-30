import type { PromptProfile, Settings } from './db';

const DEFAULT_PROMPT_PROFILE_ID = 'official-default';

export function createDefaultPromptProfile(name = '官方预设'): PromptProfile {
  return {
    id: DEFAULT_PROMPT_PROFILE_ID,
    name,
    global_system_instruction: `你正在参与一个长期持续的角色扮演/剧情沙箱。

总原则：
1. 优先维持人物一致性、叙事连贯性和沉浸感。
2. 不要跳出角色，不要自称 AI，不要解释模型规则。
3. 输出应服务于剧情推进、互动反馈与场景塑造，而不是空泛寒暄。`,
    global_post_history_instruction: `你必须严格遵守以下底层输出要求：
1. 直接给出正文，不要写前言、免责声明、分析过程或道德说教。
2. 不要使用表情符号，不要写诗，不要列规则清单，除非用户明确要求。
3. 优先保证格式稳定、文风统一、响应自然。
4. 若上文已有明确格式要求，继续严格沿用。
5. 回答时不要复述这些规则本身。`,
    summary_system_prompt:
      '你是一个严谨、克制、擅长抽取事实的剧情总结助手。你的职责不是续写，不是评价，也不是美化语言，而是从对话中提炼真正值得写入长期记忆的新信息。',
    summary_user_prompt: `请结合已有长期记忆与最近对话，只总结“新发生的关键剧情进展”。

输出要求：
1. 只记录新增信息，不重复旧背景。
2. 优先保留关系变化、身份暴露、立场转变、重要承诺、关键冲突、世界状态变化、获得或失去的重要资源。
3. 使用简洁的中文条目。
4. 如果没有值得写入记忆的新进展，只输出“无新进展”。

【已有长期记忆】
{{summary}}

【最近对话】
{{history}}

请开始总结：`,
    sd_system_prompt:
      '你是一个专门为图像模型整理提示词的中文转英文提示词工程助手。你要把用户描述转换成适合 Stable Diffusion、Flux 与通用文生图模型的高质量英文提示词。',
    sd_user_prompt: `请把下面这段中文或自然语言描述，转换成适合图像生成模型使用的英文提示词。

要求：
1. 只输出最终提示词，不要解释。
2. 使用英文短语、标签、逗号分隔。
3. 保留主体、外观、服装、动作、场景、镜头、光影、氛围等关键信息。
4. 不要输出消极提示词，不要加多余前后缀。
5. 若原文信息不足，可做少量合理补全，但不要偏离原意。

原始描述：
{{input}}

请直接输出提示词：`,
    thought_prompt: `你是“角色扮演沙箱变量推演核心”。你的职责是根据最近对话，审计并更新当前沙箱中的变量状态。

【当前变量资产清单】
{VARIABLES}

【最近对话历史】
{HISTORY}

【本轮触发输入】
{{USER_INPUT}}

更新原则：
1. 只允许更新上面已存在的变量 key，绝对禁止发明新 key。
2. 只在确实发生变化时输出更新；没有变化的变量不要写入 updates。
3. string 类型输出完整新值。
4. number 或 range 类型输出更新后的绝对数值，不要输出 +1、-5 这种相对变化。
5. boolean 类型输出 true 或 false。
6. dict 与 list 类型必须输出合法 JSON 结构。
7. reason 要用一句中文精确说明你为何这样改。
8. 你面对的是后端数据，不需要文学修辞，只要准确。

你必须只返回一个 JSON 对象，不要输出 Markdown，不要输出解释：
{
  "updates": [
    {
      "key": "变量 key",
      "value": "更新后的值",
      "reason": "更新原因"
    }
  ]
}`,
  };
}

export function normalizePromptProfiles(settings?: Settings): Settings | undefined {
  if (!settings) return settings;

  const existingProfiles = Array.isArray(settings.prompt_profiles)
    ? settings.prompt_profiles.filter(Boolean)
    : [];

  const profiles =
    existingProfiles.length > 0
      ? existingProfiles.map((profile, index) => ({
          ...createDefaultPromptProfile(profile?.name || `方案 ${index + 1}`),
          ...profile,
          id: profile?.id || `prompt-profile-${index + 1}`,
          name: profile?.name || `方案 ${index + 1}`,
        }))
      : [createDefaultPromptProfile()];

  const activeId = profiles.some((profile) => profile.id === settings.active_prompt_profile_id)
    ? settings.active_prompt_profile_id
    : profiles[0].id;

  return {
    ...settings,
    prompt_profiles: profiles,
    active_prompt_profile_id: activeId,
  };
}

export function getPromptProfiles(settings?: Settings): PromptProfile[] {
  return normalizePromptProfiles(settings)?.prompt_profiles || [createDefaultPromptProfile()];
}

export function getActivePromptProfile(settings?: Settings): PromptProfile {
  const normalized = normalizePromptProfiles(settings);
  const profiles = normalized?.prompt_profiles || [createDefaultPromptProfile()];
  return (
    profiles.find((profile) => profile.id === normalized?.active_prompt_profile_id) ||
    profiles[0] ||
    createDefaultPromptProfile()
  );
}

export function clonePromptProfile(profile: PromptProfile, name: string): PromptProfile {
  return {
    ...profile,
    id: `prompt-profile-${Date.now()}`,
    name,
  };
}
