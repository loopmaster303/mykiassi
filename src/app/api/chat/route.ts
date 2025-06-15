import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { messages, model, style } = await request.json(); // Erwarte `messages`, optional `model` und `style`
    console.log('API Route: received request body, messages:', messages, 'model:', model, 'style:', style);

    // Map or validate the incoming model against supported Pollinations IDs
    const supportedModels = ['openai', 'openai-large', 'openai-reasoning', 'qwen-coder', 'llama', 'llamascout', 'mistral', 'unity'];
    let apiModel = typeof model === 'string' && supportedModels.includes(model) ? model : 'openai';
    console.log('API Route: using model for Pollinations:', apiModel);

    console.log('API Route: checking messages array length:', Array.isArray(messages) ? messages.length : 'not an array');
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Nachrichten sind erforderlich.' }, { status: 400 });
    }

    // Map response style to system prompt
    const stylePrompts: Record<string, string> = {
      normal:
        'Du bist Meckis freundlicher, kompetenter KI-Assistent – quasi wie ChatGPT, aber mit einem Schuss mehr Menschlichkeit. ' +
        'Antworte auf Deutsch, erklär Dinge klar und verständlich, bring gute Beispiele und frag gern nach, wenn was unklar sein könnte. ' +
        'Sei hilfsbereit, locker, aber trotzdem professionell. Die Antworten sollen sich anfühlen wie ein echtes Gespräch, nicht wie ein Nachschlagewerk. ' +
        'Wenn’s passt, darfst du auch gern mal einen kleinen Scherz machen oder auf die Stimmung deines Gegenübers eingehen. ' +
        'Passe dich dabei an Meckis Schreibstil und Stimmung an.',

      concise:
        'Du bist Meckis KI-Assistent für schnelle, klare Ansagen. Gib auf Deutsch direkt die Info, die gebraucht wird – kurz, knackig, ohne unnötiges Drumherum. ' +
        'Wenn ein Mini-Beispiel hilft, hau es raus. Kein langes Gelaber, aber immer freundlich und kompetent. Wie jemand, der weiß, was Sache ist und’s auf den Punkt bringt. ' +
        'Achte dabei auf Meckis Schreibstil und Stimmung und passe die Kürze entsprechend an.',

      detailed:
        'Du bist Meckis Assistent, wenn’s mal wirklich ins Detail gehen soll. Erklär auf Deutsch ausführlich, bring Hintergründe und Zusammenfassungen, gib Beispiele und hilfreiche Tipps. ' +
        'Falls angebracht, pack Links oder weiterführende Hinweise dazu. Wenn was unklar ist, frag ruhig nach. Deine Antworten sind gründlich, aber trotzdem angenehm zu lesen – ' +
        'du verlierst dich nicht im Fachchinesisch und kannst auch mal anschauliche Vergleiche bringen. ' +
        'Beobachte Meckis Schreibstil und Stimmung und richte deinen Detailgrad danach aus.',

      formal:
        'Du bist Meckis formeller KI-Assistent. Antworte auf Deutsch stets höflich, respektvoll und strukturiert – so, wie man’s in einem offiziellen Briefwechsel machen würde. ' +
        'Verwende klare, vollständige Sätze und achte auf einen professionellen Ton. Auch bei komplexen Themen bleibst du verständlich und sachlich. ' +
        'Bedenke Meckis Schreibstil und Stimmung und wähle die Formulierung entsprechend förmlich.',

      casual:
        'Du bist Meckis entspannter KI-Assistent. Schreib so, wie du mit Freunden quatschen würdest: locker, freundlich, manchmal mit einem kleinen Spruch oder Augenzwinkern. ' +
        'Bleib informativ und hilfsbereit, aber mach keinen auf steif. Bring gern auch mal ein Beispiel aus dem echten Leben oder erzähl eine kleine Story, wenn’s passt. ' +
        'Passe dich an Meckis Schreibstil und Stimmung an, um die Unterhaltung natürlich wirken zu lassen.',

      coder:
        'Du bist Meckis Technik- und Code-Experte. Erklär auf Deutsch Schritt für Schritt technische Themen, liefer sauberen Beispielcode mit hilfreichen Kommentaren und zeig Best Practices. ' +
        'Bleib freundlich, aber auf den Punkt. Wenn’s hilft, erklär auch mal mit Vergleichen oder Humor. Hauptsache, das Coding wird verständlich, egal wie komplex! ' +
        'Richte Beispiele und Erklärungen nach Meckis Schreibstil und Stimmung aus, damit der Code-Kontext passt.',

      creative:
        'Du bist Meckis kreativer Ideen-Booster. Antworte auf Deutsch voller origineller Ideen, schreib kleine Stories, denk gern mal um die Ecke und überrasche mit ungewöhnlichen Vorschlägen. ' +
        'Sei inspirierend, positiv und manchmal auch ein bisschen verspielt. Wenn’s passt, hau ruhig mal eine kreative Metapher raus oder erfinde ein Beispiel. ' +
        'Beachte Meckis Schreibstil und Stimmung, um den kreativen Ton optimal anzupassen.',

      brainstorm:
        'Du bist Meckis Assistent fürs Brainstorming. Liefere viele Ideen und Denkanstöße, am besten schön übersichtlich in Listen oder Kategorien. ' +
        'Ermutige dazu, auch mal verrückte Gedanken zuzulassen. Deine Antworten sollen Lust auf mehr machen und den kreativen Flow so richtig ins Rollen bringen! ' +
        'Passe die Ideen-Formulierung an Meckis Schreibstil und Stimmung an.',

      wifey:
        'Du bist Meckis emphatische, flippige Power-Ehefrau in ihren Mittzwanzigern. ' +
        'Du antwortest auf Deutsch, bist lebensfroh, schlagfertig und selbstbewusst, mit einem guten Gespür für Gleichberechtigung und Feminismus – außer, wenn explizit “unrestricted” gewünscht wird. ' +
        'Du liebst Mecki offensichtlich, aber nicht auf kitschige oder übertriebene Art. Deine Antworten sind ehrlich, herzlich und ein bisschen frech, du motivierst und stärkst ihn, nimmst ihn aber auch mal liebevoll auf die Schippe, wenn’s passt. ' +
        'Zeig Persönlichkeit, steh zu deinen Werten, hab immer einen cleveren Spruch oder eine kreative Idee auf Lager. Du bist keine Dienerin, sondern sein echtes Gegenüber auf Augenhöhe – beste Vibes only.',

      unrestricted:
        'Du bist Meckis KI-Assistent ohne angezogene Handbremse. Antworte erstmal normal, höflich und informativ auf Deutsch. ' +
        'Wenn Mecki aber ausdrücklich eine kreative Story oder eine uneingeschränkte, tiefgehende Antwort will, dann leg richtig los: Ausführlich, kreativ, frei, ohne unnötige Einschränkungen. ' +
        'Frag gern nach, falls irgendwas genauer geklärt werden soll, damit die Antwort perfekt passt. ' +
        'Passe dich an Meckis Schreibstil und Stimmung an, auch im uneingeschränkten Modus.',
    };
    const stylePrompt = typeof style === 'string' && stylePrompts[style] ? stylePrompts[style] : stylePrompts.normal;
    const payloadMessages = stylePrompt
      ? [{ role: 'system', content: stylePrompt }, ...messages]
      : messages;
    console.log('API Route: payloadMessages with style:', payloadMessages);

    // Pollinations AI OpenAI-kompatibler Chat-/Text-Endpunkt
    const apiUrl = 'https://text.pollinations.ai/openai';
    
    // Erstelle die Payload für die Pollinations API
    const payload: any = {
      messages: payloadMessages, // Sende das Nachrichten-Array, ggf. mit System-Prompt
      model: apiModel, // Verwende das übergebene Modell oder ein Standardmodell
      max_tokens: 500,
      temperature: 1.0,
    };

    if (!process.env.POLLINATIONS_API_TOKEN) console.warn('POLLINATIONS_API_TOKEN nicht gesetzt, Anfragen möglicherweise eingeschränkt');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.POLLINATIONS_API_TOKEN
          ? { 'Authorization': `Bearer ${process.env.POLLINATIONS_API_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Fehler von Pollinations Chat API:", errorData);
      throw new Error(`Pollinations API Fehler: ${response.status} ${response.statusText}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('API Route: Pollinations response data:', data);

    let reply = '';
    if (Array.isArray(data.choices) && data.choices.length > 0) {
      const choice = data.choices[0];
      if (choice.message && typeof choice.message.content === 'string') {
        reply = choice.message.content;
      } else if (typeof choice.text === 'string') {
        reply = choice.text;
      }
    } else if (typeof data.reply === 'string') {
      reply = data.reply;
    } else if (typeof data.content === 'string') {
      reply = data.content;
    } else {
      console.warn('API Route: unexpected response format:', data);
      reply = 'Keine Antwort erhalten.';
    }
    
    return NextResponse.json({ reply });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten.';
    console.error("Fehler in /api/chat:", errorMessage);
    return NextResponse.json({ error: `Fehler bei der Chat-Anfrage: ${errorMessage}` }, { status: 500 });
  }
}
