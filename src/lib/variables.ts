import type { Character, Settings } from './db';

/**
 * 递归替换文本中的 {{variable}} 占位符
 */
export function replaceVariables(text: string, settings: Settings, char?: Character, userName: string = "User"): string {
  if (!text) return "";

  // 定义可用变量映射
  const variables: Record<string, string> = {
    // 用户与角色
    'user': userName,
    'char': char?.name || 'Assistant',
    'char_name': char?.name || 'Assistant',
    
    // 设置相关 (支持系统变量默认)
    'model': settings.model || 'unknown_model',
    'api_base': settings.api_base || '',
    'sd_url': settings.sd_url || '',
    
    // 甚至可以注入 API Key (慎用，取决于 Prompt 是否需要)
    // 'api_key': settings.api_key || '', 
    // 'baidu_appid': settings.baidu_appid || '',
    
    // 时间与日期
    'date': new Date().toLocaleDateString(),
    'time': new Date().toLocaleTimeString(),
    'weekday': new Date().toLocaleDateString('en-US', { weekday: 'long' }),
  };

  // 正则替换 {{key}}
  return text.replace(/\{\{([\w_]+)\}\}/g, (match, key) => {
    const k = key.toLowerCase();
    return variables[k] !== undefined ? variables[k] : match; // 如果没找到变量，保留原样
  });
}