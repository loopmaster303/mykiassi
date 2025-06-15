'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useChatThreads } from '../../../context/ChatThreadsContext';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ImagePlay, Paperclip, Brain, Fingerprint, Send, X } from 'lucide-react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
}

const staticAvailableModels = [
  { label: 'OpenAI GPT-4.1-nano', value: 'openai' },
  { label: 'OpenAI GPT-4.1-mini', value: 'openai-large' },
  { label: 'OpenAI o4-mini', value: 'openai-reasoning' },
  { label: 'Qwen 2.5 Coder 32B', value: 'qwen-coder' },
  { label: 'Llama 3.3 70B', value: 'llama' },
  { label: 'Llama 4 Scout 17B', value: 'llamascout' },
  { label: 'Mistral Small 3', value: 'mistral' },
  { label: 'Unity Mistral Large', value: 'unity' },
];

export default function ChatbotTool() {
  const { activeThread, threads, addMessage, updateThread, createThread } = useChatThreads();
  const [mounted, setMounted] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isImageMode, setIsImageMode] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState(staticAvailableModels[0].value);
  const [responseStyle, setResponseStyle] = useState('normal');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (!activeThread && threads.length === 0) {
      console.log("ChatbotTool: No active thread and no threads, creating one.");
      createThread("Neuer Thread gestartet");
    }
  }, [activeThread, threads, createThread]);

  useEffect(() => {
    if (activeThread) {
      console.log('ChatbotTool: activeThread changed in useEffect. ID:', activeThread.id, 'Title:', activeThread.title, 'Model:', activeThread.model, 'Style:', activeThread.style);
      setSelectedModel(activeThread.model || staticAvailableModels[0].value);
      setResponseStyle(activeThread.style || 'normal');
    } else {
      console.log('ChatbotTool: activeThread is null in useEffect.');
    }
  }, [activeThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages]);


  const handleSendMessage = async () => {
    console.log('ChatbotTool: handleSendMessage BEGIN. Active Thread ID:', activeThread?.id, 'Active Thread Title:', activeThread?.title, 'Input Message:', inputMessage, 'IsImageMode:', isImageMode);

    if (!activeThread || (!inputMessage.trim() && !uploadFile && !isImageMode) || (isImageMode && !inputMessage.trim())) {
      console.log('ChatbotTool: handleSendMessage returning early. Conditions: !activeThread:', !activeThread, '(!inputMessage.trim() && !uploadFile && !isImageMode):', (!inputMessage.trim() && !uploadFile && !isImageMode), '(isImageMode && !inputMessage.trim()):', (isImageMode && !inputMessage.trim()));
      if (!activeThread) console.warn("ChatbotTool: No active thread to send message to.");
      if ((!inputMessage.trim() && !uploadFile && !isImageMode)) console.warn("ChatbotTool: No input message or file for chat mode.");
      if ((isImageMode && !inputMessage.trim())) console.warn("ChatbotTool: No prompt for image mode.");
      return;
    }

    setLoading(true);
    const currentInputMessage = inputMessage; // Capture before clearing for some paths
    const currentUploadFile = uploadFile; // Capture file
    // const currentUploadPreview = uploadPreview; // Capture preview - not directly used in send logic

    // Clear input for text/image prompt modes immediately after capturing
    // File state is cleared after successful send in file upload path
    if (isImageMode || (!isImageMode && !currentUploadFile)) {
      setInputMessage('');
    }


    try {
      if (isImageMode) {
        console.log('ChatbotTool: In image generation mode.');
        const prompt = currentInputMessage.trim();
        
        addMessage(activeThread.id, { role: 'user', content: `Image prompt: "${prompt}"` });
        // setInputMessage(''); // Already done above

        console.log('ChatbotTool: Calling /api/generate with prompt:', prompt);
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        console.log('ChatbotTool: /api/generate response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('ChatbotTool: /api/generate call failed. Status:', response.status, 'Response:', errorText);
          addMessage(activeThread.id, { role: 'assistant', content: `Sorry, image generation failed. Status: ${response.status}` });
        } else {
          const imageBlob = await response.blob();
          const imageUrl = URL.createObjectURL(imageBlob); // Note: Consider revoking this URL later if needed
          console.log('ChatbotTool: Image generated, blob URL:', imageUrl);
          addMessage(activeThread.id, {
            role: 'assistant',
            content: [
              { type: 'text', text: `Generated image for: "${prompt}"` },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          });
        }
        setIsImageMode(false); 
        console.log('ChatbotTool: Switched back to chat mode. isImageMode:', false);

      } else { // Normal chat message or title generation path
        console.log('ChatbotTool: In normal chat message path.');

        // Title Generation Logic Block
        console.log(
          'ChatbotTool: Pre-title-gen check. Current ActiveThread Title:', 
          activeThread?.title, 
          '| StartsWith("Thread")?:', 
          activeThread?.title?.startsWith('Thread'),
          '| InputTrimmedEmpty?:', 
          !currentInputMessage.trim(),
          '| ActiveThread Exists?:',
          !!activeThread
        );

        if (activeThread && activeThread.title && activeThread.title.startsWith('Thread') && currentInputMessage.trim()) {
          console.log('ChatbotTool: Title generation condition MET. Fetching title...');
          try {
            const messagesForTitleApi = [...activeThread.messages, { role: 'user', content: currentInputMessage.trim() }];
            console.log('ChatbotTool: Calling /api/chat/title with messages:', messagesForTitleApi);
            
            const titleResponse = await fetch('/api/chat/title', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: messagesForTitleApi }),
            });

            console.log('ChatbotTool: /api/chat/title response status:', titleResponse.status);

            if (titleResponse.ok) {
              const titleData = await titleResponse.json();
              const newTitle = titleData.title;
              console.log('ChatbotTool: Received dynamic title from API:', newTitle);

              if (typeof newTitle === 'string' && newTitle.trim() !== '') {
                console.log('ChatbotTool: Valid title received. Calling updateThread for ID:', activeThread.id, 'with Title:', newTitle.trim());
                updateThread(activeThread.id, { title: newTitle.trim() });
              } else {
                console.error('ChatbotTool: Invalid or empty title received from API. Title:', newTitle, 'TitleData:', titleData);
              }
            } else {
              const errorText = await titleResponse.text();
              console.error('ChatbotTool: /api/chat/title call failed. Status:', titleResponse.status, 'Response:', errorText);
            }
          } catch (titleError) {
            console.error('ChatbotTool: Exception during title generation fetch/processing:', titleError);
          }
        } else {
          console.log('ChatbotTool: Title generation condition NOT MET. Proceeding with chat.');
        }

        // Proceed with sending the actual chat message (text or file upload)
        if (currentUploadFile) {
          console.log('ChatbotTool: File upload logic processing.');
          const reader = new FileReader();
          reader.onload = async () => {
            const dataUrl = reader.result as string;
            const userMessageContent: ChatMessage['content'] = [
              { type: 'text', text: currentInputMessage.trim() || 'Bitte beschreibe dieses Bild.' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ];
            const userMessageForApi = { role: 'user' as const, content: userMessageContent };
            
            addMessage(activeThread.id, userMessageForApi);
            if (currentInputMessage.trim()) setInputMessage(''); // Clear text input if it was part of file upload

            const messagesForApi = [...activeThread.messages, userMessageForApi];
            console.log('ChatbotTool: Calling /api/chat for file upload with messages:', messagesForApi.length);

            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: messagesForApi,
                model: selectedModel,
                style: responseStyle,
              }),
            });
            console.log('ChatbotTool: /api/chat (file) response status:', response.status);

            if (!response.ok) {
              const errorText = await response.text();
              console.error('ChatbotTool: Error in chat API (file upload):', response.status, errorText);
              addMessage(activeThread.id, { role: 'assistant', content: `Sorry, I encountered an error. Status: ${response.status}` });
            } else {
              const result = await response.json();
              console.log('ChatbotTool: Received from /api/chat (file). Result:', result);
              addMessage(activeThread.id, { role: 'assistant', content: result.reply || 'No reply content.' });
            }
            setUploadFile(null); // Clear file state after processing
            setUploadPreview(null);
          };
          reader.readAsDataURL(currentUploadFile);
        } else { // Text message
          console.log('ChatbotTool: Text message logic processing with input:', currentInputMessage.trim());
          const userMessageForApi = { role: 'user' as const, content: currentInputMessage.trim() };

          addMessage(activeThread.id, userMessageForApi);
          // setInputMessage(''); // Already done at the start of the 'else' for !isImageMode if no file

          const messagesForApi = [...activeThread.messages, userMessageForApi];
          console.log('ChatbotTool: Calling /api/chat for text message with messages:', messagesForApi.length);
          
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: messagesForApi,
              model: selectedModel,
              style: responseStyle,
            }),
          });
          console.log('ChatbotTool: /api/chat (text) response status:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('ChatbotTool: Error in chat API (text message):', response.status, errorText);
            addMessage(activeThread.id, { role: 'assistant', content: `Sorry, I encountered an error. Status: ${response.status}` });
          } else {
            const result = await response.json();
            console.log('ChatbotTool: Received from /api/chat (text). Result:', result);
            addMessage(activeThread.id, { role: 'assistant', content: result.reply || 'No reply content.' });
          }
        }
      }
    } catch (error) {
      console.error('ChatbotTool: General error in handleSendMessage:', error);
      if (activeThread) {
        addMessage(activeThread.id, { role: 'assistant', content: 'Sorry, an unexpected error occurred processing your request.' });
      }
    } finally {
      setLoading(false);
      console.log('ChatbotTool: handleSendMessage END.');
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadPreview(URL.createObjectURL(file));
      setIsImageMode(false); 
    }
  };

  const clearUploadPreview = () => {
    if (uploadPreview) { // Only revoke if it exists
        URL.revokeObjectURL(uploadPreview);
    }
    setUploadFile(null);
    setUploadPreview(null);
  };

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread?.messages, loading]); // Also scroll when loading state changes for new messages


  if (!mounted) return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
      <h2 className="text-xl font-semibold mb-2">Lade Chatbot...</h2>
    </div>
  );
  
  if (!activeThread && threads.length > 0) return (
     <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
      <h2 className="text-xl font-semibold mb-2">Wähle einen Chat aus</h2>
      <p className="text-center">Bitte wähle links einen bestehenden Thread<br />oder erstelle über das ➕-Symbol einen neuen.</p>
    </div>
  );

  if (!activeThread && threads.length === 0 ) return (
     <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
      <h2 className="text-xl font-semibold mb-2">Kein aktiver Chat</h2>
      <p className="text-center">Bitte erstelle über das ➕-Symbol einen neuen Thread.</p>
    </div>
  );
  
  if (!activeThread) return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
      <h2 className="text-xl font-semibold mb-2">Lade Thread...</h2>
       <p className="text-center">Wenn dies länger dauert, versuche einen neuen Thread zu erstellen.</p>
    </div>
  );


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground justify-between">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-[160px] max-w-2xl mx-auto w-full"> {/* Adjusted pb */}
        {activeThread.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Noch keine Nachrichten im aktuellen Chat.</p>
          </div>
        ) : (
          activeThread.messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl p-4 shadow-md ${
                msg.role === 'user'
                  ? 'bg-gray-200 text-gray-900 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-800'
                  : 'bg-card text-card-foreground border border-border'
              }`}>
                {Array.isArray(msg.content)
                  ? msg.content.map((part, i) =>
                      part.type === 'text'
                        ? <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                        : <img key={i} src={part.image_url.url} alt={ part.type === 'image_url' && typeof msg.content[0] === 'object' && 'text' in msg.content[0] ? msg.content[0].text : "Generated/Uploaded Image"} className="max-w-full rounded-md mt-2" />
                    )
                  : <p className="whitespace-pre-wrap">{msg.content}</p>}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {uploadPreview && (
        <div className="w-full flex justify-center sticky bottom-[140px] z-10"> {/* Adjusted bottom */}
            <div className="relative max-w-xs">
                <img src={uploadPreview} alt="Upload Vorschau" className="rounded-md max-h-40 border border-gray-500" />
                <button 
                    onClick={clearUploadPreview} 
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center text-xs"
                    title="Vorschau entfernen"
                >
                    <X size={14}/>
                </button>
            </div>
        </div>
      )}

      <div className="w-full flex justify-center items-end sticky bottom-0 left-0 right-0 z-20 pb-2">
        <div 
            className="bg-white/80 dark:bg-black/60 backdrop-blur-sm border border-gray-300 dark:border-gray-700 shadow-lg p-3 rounded-2xl w-full max-w-2xl mb-2" 
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={isImageMode ? "Bild generieren..." : "Nachricht eingeben..."}
              className="flex-grow bg-transparent border-none outline-none text-gray-900 dark:text-gray-300 placeholder:text-gray-500 dark:placeholder:text-gray-400 p-2 text-sm"
              disabled={loading}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || (!inputMessage.trim() && !uploadFile && !isImageMode) || (isImageMode && !inputMessage.trim())}
              className="p-2 text-gray-800 dark:text-white disabled:text-gray-400 dark:disabled:text-gray-600 hover:opacity-80"
              title="Senden"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          <div className="flex justify-between items-center mt-2 pt-2"> 
            <div className="flex items-center gap-1"> 
              <Select value={responseStyle} onValueChange={(newStyle) => { setResponseStyle(newStyle); if (activeThread) updateThread(activeThread.id, { style: newStyle }); console.log('ChatbotTool: Response style changed to:', newStyle);}}>
                <SelectTrigger title="Antwortstil wählen" className="bg-transparent border-none p-1 h-auto text-gray-700 dark:text-gray-300 focus:ring-0 hover:text-primary dark:hover:text-white">
                  <Fingerprint className="w-5 h-5" />
                </SelectTrigger>
                <SelectContent side="top" align="start" className="bg-popover text-popover-foreground border-border">
                  {['normal', 'concise', 'detailed', 'formal', 'casual', 'coder', 'creative', 'brainstorm', 'unrestricted', 'wifey'].map((style) => (
                    <SelectItem key={style} value={style} className="hover:bg-accent focus:bg-accent">{style}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedModel} onValueChange={(newModel) => { setSelectedModel(newModel); if (activeThread) updateThread(activeThread.id, { model: newModel }); console.log('ChatbotTool: Model changed to:', newModel);}}>
                <SelectTrigger title="Modell wählen" className="bg-transparent border-none p-1 h-auto text-gray-700 dark:text-gray-300 focus:ring-0 hover:text-primary dark:hover:text-white">
                  <Brain className="w-5 h-5" />
                </SelectTrigger>
                <SelectContent side="top" align="start" className="bg-popover text-popover-foreground border-border">
                  {staticAvailableModels.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="hover:bg-accent focus:bg-accent">{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1"> 
              <button
                type="button"
                title={isImageMode ? "Textmodus aktivieren" : "Bildmodus aktivieren"}
                className={`p-2 rounded-full ${isImageMode ? 'bg-blue-500/30 text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-white'}`}
                onClick={() => setIsImageMode(!isImageMode)}
              >
                <ImagePlay className="w-5 h-5" />
              </button>
              {!isImageMode && (
                <label
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-white cursor-pointer rounded-full"
                  title="Datei anhängen"
                >
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  <Paperclip className="w-5 h-5" />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}