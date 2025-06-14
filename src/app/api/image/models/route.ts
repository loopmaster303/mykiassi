import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const resp = await fetch('https://image.pollinations.ai/models');
    if (!resp.ok) {
      const text = await resp.text();
      console.error('Fehler beim Abrufen der Bildmodelle:', resp.status, text);
      return NextResponse.json({ error: 'Fehler beim Abrufen der Modelle' }, { status: 500 });
    }
    const models = await resp.json(); // erwartet: ["flux","turbo","gptimage"]
    return NextResponse.json({ models });
  } catch (err) {
    console.error('Error in /api/image/models:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}