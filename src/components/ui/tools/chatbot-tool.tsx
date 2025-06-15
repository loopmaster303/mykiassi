'use client';

import React, { useState, useEffect } from 'react';
import { useChatThreads } from '../../../context/ChatThreadsContext';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ImagePlay, Paperclip, Brain, Fingerprint, Send } from 'lucide-react';

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
  const [selectedModel, setSelectedModel] = useState(activeThread?.model || staticAvailableModels[0].value);
  const [responseStyle, setResponseStyle] = useState(activeThread?.style || 'normal');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!activeThread && threads.length === 0) createThread();
  }, [activeThread, threads, createThread]);

  useEffect(() => {
    if (activeThread) {
      console.log('ChatbotTool: activeThread changed. ID:', activeThread.id, 'Model:', activeThread.model, 'Style:', activeThread.style);
      setSelectedModel(activeThread.model || staticAvailableModels[0].value);
      setResponseStyle(activeThread.style || 'normal');
    }
  }, [activeThread]);

  const handleSendMessage = async () => {
    console.log('ChatbotTool: handleSendMessage called. ActiveThread ID:', activeThread?.id, 'Input:', inputMessage, "ImageMode:", isImageMode);

    if (!activeThread) {
        console.warn("handleSendMessage: No active thread.");
        return;
    }
    if (!inputMessage.trim() && !uploadFile && !isImageMode) { // For chat mode, need input or file
        console.warn("handleSendMessage: No input message or file for chat mode.");
        return;
    }
    if (isImageMode && !inputMessage.trim()) { // For image mode, need input
        console.warn("handleSendMessage: No prompt for image generation mode.");
        return;
    }

    setLoading(true);
    try {
      if (isImageMode) {
        // A. Image Generation Logic
        const prompt = inputMessage.trim();
        if (!prompt) {
          console.warn('ChatbotTool: Image generation prompt is empty.');
          setLoading(false); // Ensure loading is reset
          return;
        }

        addMessage(activeThread.id, { role: 'user', content: `Image prompt: "${prompt}"` });
        setInputMessage(''); // Clear input after capturing prompt

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error generating image:', response.status, errorText);
          addMessage(activeThread.id, { role: 'assistant', content: `Sorry, image generation failed. Status: ${response.status}` });
          return; // Exits the try block, finally will run
        }

        const imageBlob = await response.blob();
        const imageUrl = URL.createObjectURL(imageBlob);
        addMessage(activeThread.id, {
          role: 'assistant',
          content: [
            { type: 'text', text: `Generated image for: "${prompt}"`},
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        });
        setIsImageMode(false); // Switch back to chat mode

      } else {
        // B. Existing Chat Logic (Text and File Upload)
        const currentInputMessage = inputMessage.trim(); // Capture before potential title generation clears it
        const userMessageForTitle: ChatMessage = { role: 'user', content: currentInputMessage };

        // 1. Title Generation (if applicable)
        if (activeThread.title.startsWith('Thread') && currentInputMessage) {
          try {
            const titleResponse = await fetch('/api/chat/title', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: [...activeThread.messages, userMessageForTitle] }),
            });
            if (titleResponse.ok) {
              const { title } = await titleResponse.json();
              if (typeof title === 'string' && title.trim()) {
                updateThread(activeThread.id, { title: title.trim() });
              } else {
                console.error('Error generating thread title: Received invalid title format.', title);
              }
            } else {
              console.error('Error generating thread title:', titleResponse.status, await titleResponse.text());
            }
          } catch (error) {
            console.error('Failed to fetch thread title:', error);
          }
        }

        // 2. File Upload Logic
        if (uploadFile) {
          const reader = new FileReader();
          reader.onload = async () => { // This is async
            const dataUrl = reader.result as string;
            const userMessageContentWithImage: ChatMessage['content'] = [
              { type: 'text', text: currentInputMessage || 'Bitte beschreibe dieses Bild.' },
              { type: 'image_url', image_url: { url: dataUrl } }
            ];

            // Important: Use a snapshot of messages before adding this user's message
            const messagesForApi = [...activeThread.messages, { role: 'user', content: userMessageContentWithImage }];
            addMessage(activeThread.id, { role: 'user', content: userMessageContentWithImage });

            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: messagesForApi, // Send the constructed list
                model: selectedModel,
                style: responseStyle,
              })
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error('Error in chat API (file upload):', response.status, errorText);
              addMessage(activeThread.id, { role: 'assistant', content: `Sorry, I encountered an error. Status: ${response.status}` });
            } else {
              const result = await response.json();
              addMessage(activeThread.id, { role: 'assistant', content: result.reply });
            }
            setInputMessage('');
            setUploadFile(null);
            setUploadPreview(null);
          };
          reader.readAsDataURL(uploadFile);
        } else {
          // 3. Text Message Logic (only if not a file upload)
          const userMessageForTextChat: ChatMessage = { role: 'user', content: currentInputMessage };

          // Important: Use a snapshot of messages before adding this user's message
          const messagesForApi = [...activeThread.messages, userMessageForTextChat];
          addMessage(activeThread.id, userMessageForTextChat);

          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: messagesForApi, // Send the constructed list
              model: selectedModel,
              style: responseStyle,
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error in chat API (text message):', response.status, errorText);
            addMessage(activeThread.id, { role: 'assistant', content: `Sorry, I encountered an error. Status: ${response.status}` });
          } else {
            const result = await response.json();
            addMessage(activeThread.id, { role: 'assistant', content: result.reply });
          }
          setInputMessage('');
        }
      }
    } catch (err) {
      // C. Outer catch block
      console.error("Error in handleSendMessage:", err);
      if (activeThread) {
        addMessage(activeThread.id, { role: 'assistant', content: 'An unexpected error occurred.' });
      }
    } finally {
      setLoading(false);
      // uploadFile and uploadPreview are reset inside reader.onload for file uploads,
      // or if they were not part of this specific message send.
      // If it was only an image generation, these wouldn't be touched here, which is fine.
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadPreview(URL.createObjectURL(file));
    }
  };

  if (!mounted || !activeThread) return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
      <h2 className="text-xl font-semibold mb-2">Kein aktiver Chat</h2>
      <p className="text-center">Bitte wähle links einen bestehenden Thread<br />oder erstelle über das ➕-Symbol einen neuen.</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-black justify-between">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-[120px] max-w-2xl mx-auto w-full">
        {activeThread.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Noch keine Nachrichten im aktuellen Chat.</p>
          </div>
        ) : (
          activeThread.messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl p-4 ${
                msg.role === 'user'
                  ? 'bg-gray-700 text-white shadow-md border border-gray-800'
                  : 'bg-card border border-border shadow-sm'
              }`}>
                {Array.isArray(msg.content)
                  ? msg.content.map((part, i) =>
                      part.type === 'text'
                        ? <p key={i}>{part.text}</p>
                        : <img key={i} src={part.image_url.url} alt="Upload" className="max-w-full rounded-md mt-2" />
                    )
                  : <p>{msg.content}</p>}
              </div>
            </div>
          ))
        )}
         {uploadPreview && !isImageMode && ( // Only show preview if not in image gen mode and preview exists
          <div className="fixed bottom-[120px] left-1/2 transform -translate-x-1/2 z-20">
            <img src={uploadPreview} alt="Upload Preview" className="max-h-40 rounded-md border border-gray-600 shadow-lg" />
            <button
              onClick={() => { setUploadFile(null); setUploadPreview(null);}}
              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 text-xs w-6 h-6 flex items-center justify-center"
            >&times;</button>
          </div>
        )}
      </div>
      
      <div className="w-full flex justify-center items-end">
        <div className="rounded-2xl bg-black/60 backdrop-blur-sm border border-gray-700 shadow-lg p-3 w-full max-w-2xl mb-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
              placeholder={isImageMode ? "Bild generieren..." : "Nachricht eingeben..."}
              className="flex-grow bg-transparent border-none outline-none text-gray-300 placeholder:text-gray-400 p-2 text-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || (isImageMode ? !inputMessage.trim() : (!inputMessage.trim() && !uploadFile))}
              className="p-2 text-white disabled:text-gray-500"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          <div className="flex justify-between items-center mt-2 pt-2">
            <div className="flex items-center gap-1">
              <Select
                value={responseStyle}
                onValueChange={(newStyle) => {
                  console.log('ChatbotTool: Response style changed to:', newStyle);
                  setResponseStyle(newStyle);
                  if (activeThread) {
                    updateThread(activeThread.id, { style: newStyle });
                  }
                }}
              >
                <SelectTrigger className="bg-transparent border-none p-1 h-auto text-gray-300 focus:ring-0 hover:text-white">
                  <Fingerprint className="w-5 h-5" />
                </SelectTrigger>
                <SelectContent side="top" align="start" className="bg-gray-800 text-white border-gray-700">
                  {['normal', 'concise', 'detailed', 'formal', 'casual', 'coder', 'creative', 'brainstorm', 'unrestricted', 'wifey'].map((style) => (
                    <SelectItem key={style} value={style} className="hover:bg-gray-700 focus:bg-gray-700">{style}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedModel}
                onValueChange={(newModel) => {
                  console.log('ChatbotTool: Model changed to:', newModel);
                  setSelectedModel(newModel);
                  if (activeThread) {
                    updateThread(activeThread.id, { model: newModel });
                  }
                }}
              >
                <SelectTrigger className="bg-transparent border-none p-1 h-auto text-gray-300 focus:ring-0 hover:text-white">
                  <Brain className="w-5 h-5" />
                </SelectTrigger>
                <SelectContent side="top" align="start" className="bg-gray-800 text-white border-gray-700">
                  {staticAvailableModels.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="hover:bg-gray-700 focus:bg-gray-700">{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                title={isImageMode ? "Chat-Modus umschalten" : "Bildmodus umschalten"}
                onClick={() => setIsImageMode(!isImageMode)}
                className={`p-2 hover:text-white ${isImageMode ? 'text-blue-400' : 'text-gray-400'}`}
              >
                <ImagePlay className="w-5 h-5" />
              </button>
              {!isImageMode && ( // Only show paperclip if not in image mode
                <label className="p-2 text-gray-400 hover:text-white cursor-pointer">
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