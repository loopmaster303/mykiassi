import { NextResponse } from 'next/server';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  try {
    // Hole prompt und aspect_ratio aus dem Frontend
    const { prompt, aspect_ratio } = await request.json();

    if (!prompt || !aspect_ratio) {
      return NextResponse.json({ error: 'Prompt und Seitenverhältnis sind erforderlich.' }, { status: 400 });
    }

    const apiKey = process.env.BFL_API_KEY;
    if (!apiKey) throw new Error('BFL_API_KEY nicht gefunden.');

    // HART den Endpunkt eintragen!
    const jobStartUrl = 'https://api.bfl.ai/v1/flux-kontext-pro';
    const payload = { prompt, aspect_ratio };

    // Debug: Logge die Anfrage
    console.log('Starte Job auf:', jobStartUrl, payload);

    // Anfrage an BFL schicken
    const startJobResponse = await fetch(jobStartUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'x-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!startJobResponse.ok) {
      const errorData = await startJobResponse.json().catch(() => ({}));
      return NextResponse.json({ error: errorData?.detail || 'Fehler beim Start.' }, { status: 500 });
    }

    const job = await startJobResponse.json();
    const pollingUrl = job.polling_url;
    let finalResult = null;

    // Polling-Schleife (max. 2 Minuten)
    for (let i = 0; i < 60; i++) {
      await sleep(2000);
      const pollResponse = await fetch(pollingUrl, { headers: { 'x-key': apiKey } });
      if (!pollResponse.ok) continue;
      const result = await pollResponse.json();
      if (result.status === 'Ready' || result.status === 'succeeded') {
        finalResult = result;
        break;
      }
      if (result.status === 'Failed' || result.status === 'Error') {
        return NextResponse.json({ error: `BFL API Job fehlgeschlagen: ${JSON.stringify(result)}` }, { status: 500 });
      }
    }

    if (!finalResult) {
      return NextResponse.json({ error: 'Timeout: Kein Ergebnis von BFL.' }, { status: 504 });
    }

    // Bild holen & base64 zurückgeben
    const temporaryImageUrl = finalResult.result.sample;
    const imageResponse = await fetch(temporaryImageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json({ error: 'Bild konnte nicht geladen werden.' }, { status: 500 });
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const imageMimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const dataUrl = `data:${imageMimeType};base64,${imageBase64}`;

    return NextResponse.json({ imageUrl: dataUrl });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}