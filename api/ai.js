export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let key = process.env.CODE_API_KEY;
  if (!key) return res.status(500).json({ error: 'CODE_API_KEY is not configured on the server.' });
  key = String(key).trim().replace(/^['"]|['"]$/g, '').trim();
  if (!key) return res.status(500).json({ error: 'CODE_API_KEY is empty on the server.' });

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array.' });
  }

  try {
    const model = 'gemini-2.5-flash';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(m.content || '') }]
        })),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || `Gemini HTTP ${response.status}`);
    }

    const text = data?.candidates?.[0]?.content?.parts?.map(x => x.text || '').join('') || '';
    if (!text) throw new Error('Gemini returned an empty response.');
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(502).json({ error: err?.message || 'Gemini request failed.' });
  }
}
