interface ImageProxyBody {
  sd_url: string;
  payload: Record<string, unknown>;
}

function normalizeBase(input: string): string {
  return (input || '').trim().replace(/\/+$/, '');
}

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body = (await context.request.json()) as ImageProxyBody;
    if (!body?.sd_url) return new Response('Missing sd_url', { status: 400 });

    const res = await fetch(`${normalizeBase(body.sd_url)}/sdapi/v1/txt2img`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body.payload || {}),
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(text || 'Image generation failed', { status: res.status });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Image proxy error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
