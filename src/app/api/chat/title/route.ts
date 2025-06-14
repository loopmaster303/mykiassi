import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Nachrichten erforderlich' }, { status: 400 });
    }
    // Prompt bauen: kurzen Titel generieren
    const promptParts = messages.map(msg =>
      `${msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : msg.role}: ${msg.content}`
    );
    const promptText = `Erstelle einen kurzen, prägnanten Titel für den folgenden Chatverlauf (maximal 5 Wörter):\n${promptParts.join('\n')}`;

    // Beispiel: Pollinations-Text-Endpoint oder OpenAI-Endpoint verwenden
    const apiKey = process.env.POLLINATIONS_API_KEY;
    // Pollinations OpenAI-kompatibler Text-Endpoint
    const apiUrl = 'https://text.pollinations.ai/openai';
    const url = `${apiUrl}`; // wir nutzen POST-Body für OpenAI-kompatible API

    const payload = {
      model: 'openai-reasoning',
      messages: [
        { role: 'system', content: 'Erstelle einen kurzen Titel (max. 5 Wörter):' },
        { role: 'user', content: promptText }
      ],
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const errorData = await resp.text();
      console.error('Titel-API Fehler:', resp.status, errorData);
      throw new Error(`Titel-API Fehler: ${resp.status}`);
    }
    const data = await resp.json();
    let title = '';
    if (Array.isArray(data.choices) && data.choices.length > 0) {
      const choice = data.choices[0];
      if (choice.message?.content) {
        title = choice.message.content.trim().split('\n')[0];
      } else if (typeof choice.text === 'string') {
        title = choice.text.trim().split('\n')[0];
      }
    }
    if (!title) {
      title = 'Neuer Chat';
    }
    return NextResponse.json({ title });
  } catch (e) {
    console.error('Fehler in Title-Route:', e);
    return NextResponse.json({ error: 'Fehler bei Titelgenerierung' }, { status: 500 });
  }
}