import type { ApiMode, ApiPreset, PromptProfile, Settings } from './db';
import { LLMClient } from './llm';

type PromptConversionContext = {
  settings?: Settings;
  presets: ApiPreset[];
  activePresetId?: number;
  activeModel?: string;
  promptProfile: PromptProfile;
  getPresetMode: (preset?: ApiPreset) => ApiMode;
};

const TRANSLATE_PROXY_ENDPOINT = '/api/translate';
const CHINESE_CHAR_PATTERN = /[\u3400-\u9fff\uf900-\ufaff]/;

function addUnsigned(x: number, y: number): number {
  const x8 = x & 0x80000000;
  const y8 = y & 0x80000000;
  const x4 = x & 0x40000000;
  const y4 = y & 0x40000000;
  const result = (x & 0x3fffffff) + (y & 0x3fffffff);

  if (x4 & y4) return result ^ 0x80000000 ^ x8 ^ y8;
  if (x4 | y4) {
    if (result & 0x40000000) return result ^ 0xc0000000 ^ x8 ^ y8;
    return result ^ 0x40000000 ^ x8 ^ y8;
  }

  return result ^ x8 ^ y8;
}

function rotateLeft(value: number, shiftBits: number): number {
  return (value << shiftBits) | (value >>> (32 - shiftBits));
}

function md5F(x: number, y: number, z: number): number {
  return (x & y) | (~x & z);
}

function md5G(x: number, y: number, z: number): number {
  return (x & z) | (y & ~z);
}

function md5H(x: number, y: number, z: number): number {
  return x ^ y ^ z;
}

function md5I(x: number, y: number, z: number): number {
  return y ^ (x | ~z);
}

function md5Round(
  fn: (x: number, y: number, z: number) => number,
  a: number,
  b: number,
  c: number,
  d: number,
  x: number,
  s: number,
  ac: number,
): number {
  return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, fn(b, c, d)), addUnsigned(x, ac)), s), b);
}

function bytesToWordArray(bytes: Uint8Array): number[] {
  const wordCount = (((bytes.length + 8) >> 6) + 1) * 16;
  const words = new Array<number>(wordCount).fill(0);

  for (let i = 0; i < bytes.length; i += 1) {
    words[i >> 2] |= bytes[i] << ((i % 4) * 8);
  }

  words[bytes.length >> 2] |= 0x80 << ((bytes.length % 4) * 8);

  const bitLength = bytes.length * 8;
  words[wordCount - 2] = bitLength >>> 0;
  words[wordCount - 1] = Math.floor(bitLength / 0x100000000) >>> 0;

  return words;
}

function wordToHex(value: number): string {
  let result = '';
  for (let i = 0; i <= 3; i += 1) {
    const byte = (value >>> (i * 8)) & 255;
    result += byte.toString(16).padStart(2, '0');
  }
  return result;
}

function md5(value: string): string {
  const words = bytesToWordArray(new TextEncoder().encode(value));
  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let k = 0; k < words.length; k += 16) {
    const aa = a;
    const bb = b;
    const cc = c;
    const dd = d;

    a = md5Round(md5F, a, b, c, d, words[k + 0], 7, 0xd76aa478);
    d = md5Round(md5F, d, a, b, c, words[k + 1], 12, 0xe8c7b756);
    c = md5Round(md5F, c, d, a, b, words[k + 2], 17, 0x242070db);
    b = md5Round(md5F, b, c, d, a, words[k + 3], 22, 0xc1bdceee);
    a = md5Round(md5F, a, b, c, d, words[k + 4], 7, 0xf57c0faf);
    d = md5Round(md5F, d, a, b, c, words[k + 5], 12, 0x4787c62a);
    c = md5Round(md5F, c, d, a, b, words[k + 6], 17, 0xa8304613);
    b = md5Round(md5F, b, c, d, a, words[k + 7], 22, 0xfd469501);
    a = md5Round(md5F, a, b, c, d, words[k + 8], 7, 0x698098d8);
    d = md5Round(md5F, d, a, b, c, words[k + 9], 12, 0x8b44f7af);
    c = md5Round(md5F, c, d, a, b, words[k + 10], 17, 0xffff5bb1);
    b = md5Round(md5F, b, c, d, a, words[k + 11], 22, 0x895cd7be);
    a = md5Round(md5F, a, b, c, d, words[k + 12], 7, 0x6b901122);
    d = md5Round(md5F, d, a, b, c, words[k + 13], 12, 0xfd987193);
    c = md5Round(md5F, c, d, a, b, words[k + 14], 17, 0xa679438e);
    b = md5Round(md5F, b, c, d, a, words[k + 15], 22, 0x49b40821);

    a = md5Round(md5G, a, b, c, d, words[k + 1], 5, 0xf61e2562);
    d = md5Round(md5G, d, a, b, c, words[k + 6], 9, 0xc040b340);
    c = md5Round(md5G, c, d, a, b, words[k + 11], 14, 0x265e5a51);
    b = md5Round(md5G, b, c, d, a, words[k + 0], 20, 0xe9b6c7aa);
    a = md5Round(md5G, a, b, c, d, words[k + 5], 5, 0xd62f105d);
    d = md5Round(md5G, d, a, b, c, words[k + 10], 9, 0x02441453);
    c = md5Round(md5G, c, d, a, b, words[k + 15], 14, 0xd8a1e681);
    b = md5Round(md5G, b, c, d, a, words[k + 4], 20, 0xe7d3fbc8);
    a = md5Round(md5G, a, b, c, d, words[k + 9], 5, 0x21e1cde6);
    d = md5Round(md5G, d, a, b, c, words[k + 14], 9, 0xc33707d6);
    c = md5Round(md5G, c, d, a, b, words[k + 3], 14, 0xf4d50d87);
    b = md5Round(md5G, b, c, d, a, words[k + 8], 20, 0x455a14ed);
    a = md5Round(md5G, a, b, c, d, words[k + 13], 5, 0xa9e3e905);
    d = md5Round(md5G, d, a, b, c, words[k + 2], 9, 0xfcefa3f8);
    c = md5Round(md5G, c, d, a, b, words[k + 7], 14, 0x676f02d9);
    b = md5Round(md5G, b, c, d, a, words[k + 12], 20, 0x8d2a4c8a);

    a = md5Round(md5H, a, b, c, d, words[k + 5], 4, 0xfffa3942);
    d = md5Round(md5H, d, a, b, c, words[k + 8], 11, 0x8771f681);
    c = md5Round(md5H, c, d, a, b, words[k + 11], 16, 0x6d9d6122);
    b = md5Round(md5H, b, c, d, a, words[k + 14], 23, 0xfde5380c);
    a = md5Round(md5H, a, b, c, d, words[k + 1], 4, 0xa4beea44);
    d = md5Round(md5H, d, a, b, c, words[k + 4], 11, 0x4bdecfa9);
    c = md5Round(md5H, c, d, a, b, words[k + 7], 16, 0xf6bb4b60);
    b = md5Round(md5H, b, c, d, a, words[k + 10], 23, 0xbebfbc70);
    a = md5Round(md5H, a, b, c, d, words[k + 13], 4, 0x289b7ec6);
    d = md5Round(md5H, d, a, b, c, words[k + 0], 11, 0xeaa127fa);
    c = md5Round(md5H, c, d, a, b, words[k + 3], 16, 0xd4ef3085);
    b = md5Round(md5H, b, c, d, a, words[k + 6], 23, 0x04881d05);
    a = md5Round(md5H, a, b, c, d, words[k + 9], 4, 0xd9d4d039);
    d = md5Round(md5H, d, a, b, c, words[k + 12], 11, 0xe6db99e5);
    c = md5Round(md5H, c, d, a, b, words[k + 15], 16, 0x1fa27cf8);
    b = md5Round(md5H, b, c, d, a, words[k + 2], 23, 0xc4ac5665);

    a = md5Round(md5I, a, b, c, d, words[k + 0], 6, 0xf4292244);
    d = md5Round(md5I, d, a, b, c, words[k + 7], 10, 0x432aff97);
    c = md5Round(md5I, c, d, a, b, words[k + 14], 15, 0xab9423a7);
    b = md5Round(md5I, b, c, d, a, words[k + 5], 21, 0xfc93a039);
    a = md5Round(md5I, a, b, c, d, words[k + 12], 6, 0x655b59c3);
    d = md5Round(md5I, d, a, b, c, words[k + 3], 10, 0x8f0ccc92);
    c = md5Round(md5I, c, d, a, b, words[k + 10], 15, 0xffeff47d);
    b = md5Round(md5I, b, c, d, a, words[k + 1], 21, 0x85845dd1);
    a = md5Round(md5I, a, b, c, d, words[k + 8], 6, 0x6fa87e4f);
    d = md5Round(md5I, d, a, b, c, words[k + 15], 10, 0xfe2ce6e0);
    c = md5Round(md5I, c, d, a, b, words[k + 6], 15, 0xa3014314);
    b = md5Round(md5I, b, c, d, a, words[k + 13], 21, 0x4e0811a1);
    a = md5Round(md5I, a, b, c, d, words[k + 4], 6, 0xf7537e82);
    d = md5Round(md5I, d, a, b, c, words[k + 11], 10, 0xbd3af235);
    c = md5Round(md5I, c, d, a, b, words[k + 2], 15, 0x2ad7d2bb);
    b = md5Round(md5I, b, c, d, a, words[k + 9], 21, 0xeb86d391);

    a = addUnsigned(a, aa);
    b = addUnsigned(b, bb);
    c = addUnsigned(c, cc);
    d = addUnsigned(d, dd);
  }

  return `${wordToHex(a)}${wordToHex(b)}${wordToHex(c)}${wordToHex(d)}`;
}

function pickTranslateTarget(text: string): 'en' | 'zh' {
  return CHINESE_CHAR_PATTERN.test(text) ? 'en' : 'zh';
}

export async function convertImagePromptWithAi(
  rawPrompt: string,
  { settings, presets, activePresetId, activeModel, promptProfile, getPresetMode }: PromptConversionContext,
): Promise<string> {
  const trimmedPrompt = rawPrompt.trim();
  if (!trimmedPrompt) {
    throw new Error('请先输入需要转换的提示词。');
  }

  const sdPromptPreset =
    presets.find((preset) => preset.id === settings?.sd_prompt_preset_id) ||
    presets.find((preset) => preset.id === activePresetId);
  const sdPromptModel = settings?.sd_prompt_model_id || activeModel;

  if (!sdPromptPreset || !sdPromptModel) {
    throw new Error('请先在设置中配置 SD 提示词转换模型。');
  }

  const llm = new LLMClient(sdPromptPreset.api_base, sdPromptPreset.api_key, getPresetMode(sdPromptPreset));
  const converted = await llm.generateImageTags(trimmedPrompt, sdPromptModel, {
    systemPrompt: promptProfile.sd_system_prompt,
    userPromptTemplate: promptProfile.sd_user_prompt,
  });

  return converted.trim() || trimmedPrompt;
}

export async function translateImagePromptWithBaidu(rawPrompt: string, settings?: Settings): Promise<string> {
  const trimmedPrompt = rawPrompt.trim();
  if (!trimmedPrompt) {
    throw new Error('请先输入需要翻译的提示词。');
  }

  const appid = settings?.baidu_translate_appid?.trim();
  const secret = settings?.baidu_translate_secret?.trim();

  if (!appid || !secret) {
    throw new Error('请先在设置中填写百度翻译 AppID 和密钥。');
  }

  const salt = `${Date.now()}`;
  const sign = md5(`${appid}${trimmedPrompt}${salt}${secret}`);
  const body = {
    q: trimmedPrompt,
    from: 'auto',
    to: pickTranslateTarget(trimmedPrompt),
    appid,
    salt,
    sign,
  };

  const response = await fetch(TRANSLATE_PROXY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || data?.error_msg || '百度翻译请求失败。');
  }

  if (data?.error_code) {
    throw new Error(data?.error_msg || `百度翻译失败（${data.error_code}）。`);
  }

  const translatedText = Array.isArray(data?.trans_result)
    ? data.trans_result
        .map((item: { dst?: string }) => item?.dst || '')
        .filter(Boolean)
        .join('\n')
    : '';

  if (!translatedText) {
    throw new Error('百度翻译未返回可用结果。');
  }

  return translatedText.trim();
}
