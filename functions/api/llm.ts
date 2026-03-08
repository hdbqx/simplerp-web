interface LlmRequestBody {
  action?: 'models' | 'complete' | 'chat';
  apiBase: string;
  apiKey: string;
  mode?: 'chat_completions' | 'responses';
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
  temperature?: number;
  systemContent?: string;
  chatMessages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  stop?: string[];
}

function normalizeBase(input: string): string {
  return (input || '').trim().replace(/\/+$/, '');
}

function extractResponsesText(res: any): string {
  if (!res) return '';
  if (typeof res.output_text === 'string' && res.output_text.trim()) return res.output_text;

  const output = Array.isArray(res.output) ? res.output : [];
  const texts: string[] = [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (typeof c?.text === 'string') texts.push(c.text);
      else if (typeof c?.output_text === 'string') texts.push(c.output_text);
    }
  }
  return texts.join('');
}

async function callProvider(base: string, key: string, path: string, payload?: unknown, method = 'POST') {
  const url = `${normalizeBase(base)}${path}`;
  const trimmedKey = (key || '').trim();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (trimmedKey) {
    headers.Authorization = `Bearer ${trimmedKey}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Provider request failed (${res.status}): ${text || res.statusText}`);
  }
  return res;
}

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body = (await context.request.json()) as LlmRequestBody;
    const action = body.action || 'chat';
    const mode = body.mode === 'responses' ? 'responses' : 'chat_completions';

    if (!body.apiBase || !body.apiKey) {
      return new Response('Missing apiBase/apiKey', { status: 400 });
    }

    if (action === 'models') {
      const res = await callProvider(body.apiBase, body.apiKey, '/models', undefined, 'GET');
      const data: any = await res.json();
      const models = Array.isArray(data?.data)
        ? data.data.map((m: any) => m?.id).filter(Boolean).sort()
        : [];
      return Response.json({ models });
    }

    if (!body.model) {
      return new Response('Missing model', { status: 400 });
    }

    if (action === 'complete') {
      const temperature = body.temperature ?? 0.7;
      if (mode === 'responses') {
        const res = await callProvider(body.apiBase, body.apiKey, '/responses', {
          model: body.model,
          input: [
            { role: 'system', content: body.systemPrompt || '' },
            { role: 'user', content: body.userPrompt || '' },
          ],
          temperature,
        });
        const data = await res.json();
        return Response.json({ content: extractResponsesText(data) || body.userPrompt || '' });
      }

      const res = await callProvider(body.apiBase, body.apiKey, '/chat/completions', {
        model: body.model,
        messages: [
          { role: 'system', content: body.systemPrompt || '' },
          { role: 'user', content: body.userPrompt || '' },
        ],
        temperature,
      });
      const data: any = await res.json();
      return Response.json({ content: data?.choices?.[0]?.message?.content || body.userPrompt || '' });
    }

    if (action === 'chat') {
      const temperature = body.temperature ?? 0.8;
      if (mode === 'responses') {
        const res = await callProvider(body.apiBase, body.apiKey, '/responses', {
          model: body.model,
          input: [
            { role: 'system', content: body.systemContent || '' },
            ...(body.chatMessages || []),
          ],
          temperature,
          stop: body.stop,
        });
        const data = await res.json();
        return Response.json({ content: extractResponsesText(data) || '' });
      }

      const res = await callProvider(body.apiBase, body.apiKey, '/chat/completions', {
        model: body.model,
        messages: [{ role: 'system', content: body.systemContent || '' }, ...(body.chatMessages || [])],
        temperature,
        stop: body.stop,
      });
      const data: any = await res.json();
      return Response.json({ content: data?.choices?.[0]?.message?.content || '' });
    }

    return new Response('Unsupported action', { status: 400 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'LLM proxy error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
