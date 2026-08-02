interface TranslateRequestBody {
  q?: string;
  from?: string;
  to?: string;
  appid?: string;
  salt?: string;
  sign?: string;
}

const BAIDU_TRANSLATE_ENDPOINT = 'https://fanyi-api.baidu.com/api/trans/vip/translate';
const ALLOWED_TARGET_LANGUAGES = new Set(['en', 'zh']);

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export const onRequestPost: PagesFunction = async (context) => {
  let body: TranslateRequestBody;

  try {
    body = (await context.request.json()) as TranslateRequestBody;
  } catch {
    return jsonError('请求内容不是有效的 JSON。', 400);
  }

  const q = body.q?.trim();
  const appid = body.appid?.trim();
  const salt = body.salt?.trim();
  const sign = body.sign?.trim();
  const from = body.from?.trim() || 'auto';
  const to = body.to?.trim();

  if (!q || !appid || !salt || !sign || !to) {
    return jsonError('缺少百度翻译请求参数。', 400);
  }

  if (from !== 'auto' || !ALLOWED_TARGET_LANGUAGES.has(to)) {
    return jsonError('不支持的翻译语言。', 400);
  }

  try {
    const baiduResponse = await fetch(BAIDU_TRANSLATE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: new URLSearchParams({ q, from, to, appid, salt, sign }).toString(),
    });

    const responseText = await baiduResponse.text();
    return new Response(responseText, {
      status: baiduResponse.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知网络错误';
    return jsonError(`无法连接百度翻译服务：${message}`, 502);
  }
};
