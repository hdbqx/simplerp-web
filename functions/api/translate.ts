import md5 from 'blueimp-md5';

interface TranslateBody {
  text: string;
  appid: string;
  secret: string;
}

export const onRequestPost: PagesFunction = async (context) => {
  let fallback = '';
  try {
    const body = (await context.request.json()) as TranslateBody;
    const text = body?.text || '';
    fallback = text;
    if (!body?.appid || !body?.secret || !text) return Response.json({ text });

    if (/^[\x00-\x7F]*$/.test(text)) return Response.json({ text });

    const salt = Date.now();
    const sign = md5(body.appid + text + salt + body.secret);
    const url = `https://api.fanyi.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(text)}&from=auto&to=en&appid=${body.appid}&salt=${salt}&sign=${sign}`;
    const res = await fetch(url);
    if (!res.ok) return Response.json({ text });

    const data: any = await res.json();
    const translated = data?.trans_result?.[0]?.dst;
    return Response.json({ text: translated || text });
  } catch {
    return Response.json({ text: fallback });
  }
};
