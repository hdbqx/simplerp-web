export async function translateToEnglish(text: string, appid: string, secret: string): Promise<string> {
  if (!appid || !secret) return text;
  if (/^[\x00-\x7F]*$/.test(text)) return text;

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, appid, secret }),
    });

    if (!res.ok) return text;
    const data: any = await res.json();
    return data?.text || text;
  } catch (e) {
    console.error('Translate Error:', e);
    return text;
  }
}
