export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt, width, height, model, seed, nologo, private: isPrivate, enhance, safe, transparent, referrer } = await request.json();
    const imgWidth = typeof width === 'number' ? width : 1024;
    const imgHeight = typeof height === 'number' ? height : 1024;
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return NextResponse.json({ error: 'Prompt ist erforderlich.' }, { status: 400 });
    }
    const trimmedPrompt = prompt.trim();
    const encodedPrompt = encodeURIComponent(trimmedPrompt);

    // Basis-URL für Pollinations Image-API
    const baseUrl = 'https://image.pollinations.ai/prompt';
    const params = new URLSearchParams();
    if (model) params.append('model', model);
    if (imgWidth) params.append('width', String(imgWidth));
    if (imgHeight) params.append('height', String(imgHeight));
    if (seed !== undefined && seed !== null) {
      params.append('seed', String(seed));
    }
    if (nologo) {
      params.append('nologo', 'true');
    }
    if (isPrivate) {
      params.append('private', 'true');
    }
    if (enhance) {
      params.append('enhance', 'true');
    }
    if (safe) {
      params.append('safe', 'true');
    }
    if (transparent) {
      params.append('transparent', 'true');
    }
    if (referrer && typeof referrer === 'string') {
      params.append('referrer', referrer);
    }
    const paramString = params.toString();
    const imageUrl = paramString
      ? `${baseUrl}/${encodedPrompt}?${paramString}`
      : `${baseUrl}/${encodedPrompt}`;

    // Fetch the image using the Pollinations token from environment
    const token = process.env.POLLINATIONS_API_TOKEN;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Perform the request to Pollinations
    const resp = await fetch(imageUrl, { headers });
    if (!resp.ok) {
      const text = await resp.text();
      console.error('Pollinations Error:', resp.status, text);
      return NextResponse.json({ error: 'Bild-Generierung fehlgeschlagen' }, { status: 500 });
    }
    // Read response as array buffer and return binary
    const blob = await resp.blob();
    const arrayBuffer = await blob.arrayBuffer();
    return new NextResponse(Buffer.from(arrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': resp.headers.get('Content-Type') || 'image/jpeg',
      },
    });
  } catch (error) {
    console.error("Fehler in /api/generate:", error);
    const msg = error instanceof Error ? error.message : 'Ein interner Fehler ist aufgetreten.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
