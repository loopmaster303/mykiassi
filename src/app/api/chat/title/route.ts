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
    const pollinationsApiUrl = 'https://text.pollinations.ai/openai'; // Renamed apiUrl
    // const url = `${apiUrl}`; // url variable is now pollinationsApiUrl

    const payloadToPollinations = { // Renamed payload
      model: 'openai-reasoning',
      messages: [
        { role: 'system', content: 'Erstelle einen kurzen Titel (max. 5 Wörter):' },
        { role: 'user', content: promptText }
      ],
      // temperature: 0.7, // Temperature can be added if desired
      // max_tokens: 15, // Max tokens for a short title
    };

    console.log('API Title: Sending request to Pollinations URL:', pollinationsApiUrl);
    console.log('API Title: Payload to Pollinations:', JSON.stringify(payloadToPollinations, null, 2));

      const resp = await fetch(pollinationsApiUrl, { // Used pollinationsApiUrl
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(payloadToPollinations), // Used payloadToPollinations
      });

      if (!resp.ok) {
        const errorText = await resp.text(); 
        console.error('API Title: Pollinations API request failed:', resp.status, resp.statusText, errorText);
        // title remains 'Neuer Chat'
      } else {
        const data = await resp.json(); // This could fail if response is not valid JSON
        console.log('API Title: Pollinations API response data:', data); 
        if (Array.isArray(data.choices) && data.choices.length > 0) {
          const choice = data.choices[0];
          let extractedTitle = ''; // Use a temporary variable for extracted title
          if (choice.message?.content) {
            extractedTitle = choice.message.content.trim().split('\n')[0];
          } else if (typeof choice.text === 'string') {
            extractedTitle = choice.text.trim().split('\n')[0];
          }
          
          if (extractedTitle) { // Only assign if non-empty
            title = extractedTitle; // Assign to the main title variable
            // Ensure title is not too long
            const words = title.split(' ');
            if (words.length > 7) {
              title = words.slice(0, 7).join(' ') + '...';
            }
          }
        } else {
          console.warn('API Title: Pollinations response does not have expected choices structure.');
          // title remains 'Neuer Chat' or previously extracted valid title
        }
      }
    } catch (fetchOrProcessingError) { // Catches errors from fetch itself or resp.json() or other processing
      console.error('API Title: Error during fetch to Pollinations or processing its response:', fetchOrProcessingError);
      // title remains 'Neuer Chat' as it was initialized outside this try-catch
    }
    
    // Ensure title is not an empty string after all attempts; if so, revert to default.
    // This also handles the case where title might have been set to an empty string during extraction.
    if (!title.trim()) { 
        title = 'Neuer Chat';
    }

    console.log('API Title: Final title being returned:', title);
    return NextResponse.json({ title }, { status: 200 }); // Explicitly set status 200
  } catch (e) {
    // This outer catch handles errors like the initial request.json() failing.
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred in title generation.';
    console.error('API Title: General error in POST handler (e.g. request parsing):', errorMessage, e);
    return NextResponse.json({ error: 'Fehler bei Titelgenerierung' }, { status: 500 });
  }
}