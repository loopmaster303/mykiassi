'use client';

import React, { useState, useEffect } from 'react';
import { useChatThreads } from '../../../context/ChatThreadsContext';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
// Removed Button import as we'll use a simpler clickable div/button for Send
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
  const [isImageMode, setIsImageMode] = useState(false); // State for ImagePlay, though not fully used
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
    console.log('ChatbotTool: handleSendMessage called. ActiveThread ID:', activeThread?.id, 'Input:', inputMessage);
    if (!activeThread || (!inputMessage.trim() && !uploadFile)) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim()
    };

    if (activeThread.title.startsWith('Thread') && inputMessage.trim()) {
      try {
        const titleResponse = await fetch('/api/chat/title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [...activeThread.messages, userMessage] }),
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

    setLoading(true);
    try {
      if (uploadFile) {
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = reader.result as string;
          const content: ChatMessage['content'] = [
            { type: 'text', text: inputMessage.trim() || 'Bitte beschreibe dieses Bild.' },
            { type: 'image_url', image_url: { url: dataUrl } }
          ];
          addMessage(activeThread.id, { role: 'user', content });

          const apiPayloadForImage = {
            messages: [...activeThread.messages, { role: 'user', content }],
            model: selectedModel,
            style: responseStyle,
          };
          console.log('ChatbotTool: Sending to /api/chat. Payload:', apiPayloadForImage);
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiPayloadForImage)
          });
          const result = await response.json();
          console.log('ChatbotTool: Received from /api/chat. Result:', result);
          addMessage(activeThread.id, { role: 'assistant', content: result.reply });
        };
        reader.readAsDataURL(uploadFile);
      } else {
        const userMessageText: ChatMessage = {
          role: 'user',
          content: inputMessage.trim()
        };
        addMessage(activeThread.id, userMessageText);

        const apiPayloadForText = {
          messages: [...activeThread.messages, userMessageText],
          model: selectedModel,
          style: responseStyle,
        };
        console.log('ChatbotTool: Sending to /api/chat. Payload:', apiPayloadForText);
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiPayloadForText)
        });
        const result = await response.json();
        console.log('ChatbotTool: Received from /api/chat. Result:', result);
        addMessage(activeThread.id, { role: 'assistant', content: result.reply });

        setInputMessage('');
      }
    } catch (err) {
      console.error("Fehler beim Senden:", err);
    } finally {
      setLoading(false);
      setUploadFile(null); // Clear file after sending
      setUploadPreview(null); // Clear preview
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-[100px]"> {/* Adjusted pb for new input area height */}
        {activeThread.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Noch keine Nachrichten im aktuellen Chat.</p>
          </div>
        ) : (
          activeThread.messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl p-4 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white'
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
         {uploadPreview && (
          <div className="fixed bottom-[120px] left-1/2 transform -translate-x-1/2 z-20">
            <img src={uploadPreview} alt="Upload Preview" className="max-h-40 rounded-md border border-gray-600 shadow-lg" />
            <button
              onClick={() => { setUploadFile(null); setUploadPreview(null);}}
              className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 text-xs w-6 h-6 flex items-center justify-center"
            >&times;</button>
          </div>
        )}
      </div>
      
      {/* Chat Input Island */}
      <div className="w-full flex justify-center items-end">
        <div className="rounded-2xl bg-black/60 backdrop-blur-sm border border-gray-700 shadow-lg p-3 w-full max-w-2xl mb-4"> {/* Adjusted padding and margin */}
          {/* Top Part: Input Field & Send Button */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
              placeholder="Nachricht eingeben..."
              className="flex-grow bg-transparent border-none outline-none text-gray-300 placeholder:text-gray-400 p-2 text-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || (!inputMessage.trim() && !uploadFile)}
              className="p-2 text-white disabled:text-gray-500"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom Part: Selectors & Other Action Buttons */}
          <div className="flex justify-between items-center mt-2 pt-2"> {/* REMOVED border-t border-gray-700/60 */}
            {/* Bottom-Left Group: Selectors */}
            <div className="flex items-center gap-1"> {/* Reduced gap */}
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

            {/* Bottom-Right Group: Other Action Buttons */}
            <div className="flex items-center gap-1"> {/* Reduced gap */}
              <button
                type="button"
                title="Bildmodus umschalten"
                onClick={() => setIsImageMode(!isImageMode)} // isImageMode state not currently used elsewhere
                className="p-2 text-gray-400 hover:text-white"
              >
                <ImagePlay className="w-5 h-5" />
              </button>
              <label className="p-2 text-gray-400 hover:text-white cursor-pointer">
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                <Paperclip className="w-5 h-5" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}