import md5 from 'blueimp-md5';
import fetchJsonp from 'fetch-jsonp';

export async function translateToEnglish(text: string, appid: string, secret: string): Promise<string> {
  if (!appid || !secret) return text;
  // 如果是纯ASCII字符（英文），直接返回，不调API
  if (/^[\x00-\x7F]*$/.test(text)) return text;

  const salt = Date.now();
  const sign = md5(appid + text + salt + secret);
  const url = `https://api.fanyi.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(text)}&from=auto&to=en&appid=${appid}&salt=${salt}&sign=${sign}`;

  try {
    const res = await fetchJsonp(url);
    const data = await res.json();
    if (data.trans_result?.[0]?.dst) return data.trans_result[0].dst;
  } catch (e) {
    console.error("Translate Error:", e);
  }
  return text;
}