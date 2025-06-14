'use client';

import React, { useState, useEffect } from 'react';
import { useChatThreads } from '../../../context/ChatThreadsContext';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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
      setSelectedModel(activeThread.model || staticAvailableModels[0].value);
      setResponseStyle(activeThread.style || 'normal');
    }
  }, [activeThread]);

  const handleSendMessage = async () => {
    if (!activeThread || (!inputMessage.trim() && !uploadFile)) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim()
    };

    if (activeThread.title.startsWith('Thread') && inputMessage.trim()) {
      const titleResponse = await fetch('/api/chat/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...activeThread.messages, userMessage] }),
      });
      const { title } = await titleResponse.json();
      updateThread(activeThread.id, { title });
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
          updateThread(activeThread.id, { model: selectedModel });

          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [...activeThread.messages, { role: 'user', content }],
              model: selectedModel,
              style: responseStyle,
            })
          });
          const result = await response.json();
          addMessage(activeThread.id, { role: 'assistant', content: result.reply });
        };
        reader.readAsDataURL(uploadFile);
      } else {
        const userMessage: ChatMessage = {
          role: 'user',
          content: inputMessage.trim()
        };
        addMessage(activeThread.id, userMessage);
        updateThread(activeThread.id, { model: selectedModel });

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...activeThread.messages, userMessage],
            model: selectedModel,
            style: responseStyle,
          })
        });
        const result = await response.json();
        addMessage(activeThread.id, { role: 'assistant', content: result.reply });

        setInputMessage('');
      }
    } catch (err) {
      console.error("Fehler beim Senden:", err);
    } finally {
      setLoading(false);
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-[100px]">
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
      </div>
      
      <div className="w-full flex justify-center items-end">
        <div className="rounded-2xl bg-gray-800/80 border border-gray-700 shadow-lg p-4 w-full max-w-2xl flex items-center justify-between min-h-[150px] mb-8 backdrop-blur-sm">
          <div className="flex-1 flex flex-col">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Nachricht eingeben..."
              className="w-full bg-transparent text-sm outline-none text-gray-300 placeholder:text-gray-300 px-3 py-2 rounded-lg border border-gray-600 mb-2"
            />
            <div className="flex gap-2">
              <div className="rounded-lg bg-gray-700 px-2 py-1 flex items-center">
                <Fingerprint className="w-4 h-4 mr-1 text-gray-400" />
                <Select value={responseStyle} onValueChange={setResponseStyle} className="text-sm w-full">
                  <SelectTrigger className="bg-transparent border-none p-0 h-auto min-w-[60px] text-gray-300 focus:ring-0">
                    <SelectValue placeholder="normal" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 text-white border-gray-600 w-full">
                    {['normal', 'concise', 'detailed', 'formal', 'casual', 'coder', 'creative', 'brainstorm', 'unrestricted', 'wifey'].map((style) => (
                      <SelectItem key={style} value={style} className="hover:bg-gray-600">{style}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg bg-gray-700 px-2 py-1 flex items-center">
                <Brain className="w-4 h-4 mr-1 text-gray-400" />
                <Select value={selectedModel} onValueChange={setSelectedModel} className="text-sm w-full">
                  <SelectTrigger className="bg-transparent border-none p-0 h-auto min-w-[90px] text-gray-300 focus:ring-0">
                    <SelectValue placeholder="Mistral Small 3" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 text-white border-gray-600 w-full">
                    {staticAvailableModels.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="hover:bg-gray-600">{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Button
              onClick={handleSendMessage}
              disabled={loading}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-2"
            >
              <Send className="w-5 h-5 text-black" />
            </Button>
            <button
              type="button"
              title="Bildmodus umschalten"
              className="rounded-full w-10 h-10 bg-gray-700 flex items-center justify-center"
              onClick={() => setIsImageMode(!isImageMode)}
            >
              <ImagePlay className="w-5 h-5 text-gray-400" />
            </button>
            <label
              className="rounded-full w-10 h-10 bg-gray-700 flex items-center justify-center cursor-pointer"
            >
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              <Paperclip className="w-5 h-5 text-gray-400" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}