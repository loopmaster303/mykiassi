import { NextResponse } from 'next/server';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  console.log('\n--- NEUE ANFRAGE an /api/generate-bfl ---');
  try {
    const body = await request.json();
    console.log('1. Frontend-Body empfangen:', body);

    const { prompt, model, input_image, ...restParams } = body; // KORRIGIERT: input_image statt image

    if (!prompt && !input_image) { // KORRIGIERT: input_image statt image
      console.error('Fehler: Weder Prompt noch Bild vorhanden.');
      return NextResponse.json({ error: 'Prompt oder Bild ist erforderlich.' }, { status: 400 });
    }

    const apiKey = process.env.BFL_API_KEY;
    if (!apiKey) {
      console.error('Fehler: BFL_API_KEY nicht gefunden.');
      throw new Error('BFL_API_KEY nicht gefunden.');
    }

    // Korrekte URL-Konstruktion
    let jobStartUrl;
    if (input_image) {
      jobStartUrl = `https://api.bfl.ai/v1/flux-kontext-pro`; // Explicitly set for editing
    } else {
      jobStartUrl = `https://api.bfl.ai/v1/${model}`; // For generation, use the model name
    }

    const payload: any = { prompt, ...restParams };
    
    if (input_image && typeof input_image === 'string' && input_image.startsWith('data:')) { // KORRIGIERT
      const base64Image = input_image.split(',')[1];
      payload.input_image = base64Image; // KORRIGIERT: input_image verwenden
      console.log('2a. Bilddaten zu reinem Base64 konvertiert.');
    }
    
    console.log(`2b. Sende Payload an BFL (${jobStartUrl}):`, JSON.stringify(payload, null, 2));

    const startJobResponse = await fetch(jobStartUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'x-key': apiKey, // Korrekt: kleingeschrieben
      },
      body: JSON.stringify(payload),
    });

    console.log(`3. Antwort-Status von BFL (Job Start): ${startJobResponse.status}`);

    if (!startJobResponse.ok) {
        const errorData = await startJobResponse.json();
        console.error('4a. FEHLER von BFL (Job Start):', errorData);
        throw new Error(`BFL API Fehler (Job Start): ${JSON.stringify(errorData)}`);
    }

    const job = await startJobResponse.json();
    console.log('4b. Erfolgreiche Antwort von BFL (Job Start):', job);
    
    const jobId = job.id;
    
    let finalResult;

    for (let i = 0; i < 30; i++) {
      await sleep(2000);
      
      let fetchUrl;
      if (job.polling_url) {
        // Check if polling_url already contains the 'id' parameter
        if (job.polling_url.includes('?id=')) {
          fetchUrl = job.polling_url;
        } else {
          // If polling_url exists but doesn't contain 'id', append it
          fetchUrl = `${job.polling_url}?id=${jobId}`;
        }
      } else {
        // If polling_url is not provided, use the default and append 'id'
        fetchUrl = `https://api.bfl.ai/v1/get_result?id=${jobId}`;
      }

      console.log(`5. Polling bei: ${fetchUrl} (Versuch ${i + 1})`); // Use fetchUrl for logging
      const getResultResponse = await fetch(fetchUrl, {
        method: 'GET',
        headers: { 
          'accept': 'application/json',
          'x-key': apiKey  // Korrekt: kleingeschrieben
        }
      });

      console.log(`6. Polling-Antwort-Status: ${getResultResponse.status}`);
      if (!getResultResponse.ok) {
        const errorData = await getResultResponse.json();
        console.error('Polling-Fehler:', errorData);
        throw new Error('BFL API Fehler (Status Abfrage).');
      }
      
      const result = await getResultResponse.json();
      console.log(`7. Polling-Ergebnis: Status ist '${result.status}'`);

      if (result.status === 'Ready') {
        console.log('8. JOB ERFOLGREICH! Lade Bild herunter...');
        finalResult = result;
        break; 
      }
      if (result.status === 'Failed' || result.status === 'Error') {
        console.error('Job fehlgeschlagen:', result);
        throw new Error(`BFL API Job ist fehlgeschlagen: ${JSON.stringify(result)}`);
      }
    }

    if (!finalResult) throw new Error('BFL API Job hat zu lange gedauert.');
    
    const temporaryImageUrl = finalResult.result.sample;
    const imageResponse = await fetch(temporaryImageUrl);
    if (!imageResponse.ok) throw new Error('Konnte finales Bild nicht herunterladen.');

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const imageMimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const dataUrl = `data:${imageMimeType};base64,${imageBase64}`;

    return NextResponse.json({ imageUrl: dataUrl });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler.';
    console.error('--- ENDE DER ANFRAGE MIT FEHLER ---', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

