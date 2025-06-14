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
    <div className="flex flex-col min-h-screen bg-background justify-between">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-[180px]">
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

      {/* Floating, zentrierte Eingabe-Card */}
      <div className="fixed left-1/2 bottom-10 -translate-x-1/2 w-full max-w-2xl z-50">
        {uploadPreview && (
          <div className="mb-2 flex justify-end">
            <img src={uploadPreview} alt="Preview" className="max-w-[200px] rounded-md" />
          </div>
        )}
        <div className="bg-card/90 shadow-2xl rounded-2xl px-4 py-2 w-full flex flex-row items-end border border-border">
          <div className="flex flex-row gap-1">
            <Select value={responseStyle} onValueChange={setResponseStyle}>
              <SelectTrigger className="rounded-full min-w-[88px] max-w-[120px] px-2 py-1.5 bg-background text-sm font-medium flex items-center gap-1">
                <Fingerprint className="w-6 h-6 text-muted-foreground" />
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                {[
                  'normal', 'concise', 'detailed', 'formal', 'casual',
                  'coder', 'creative', 'brainstorm', 'unrestricted', 'wifey'
                ].map((style) => (
                  <SelectItem key={style} value={style}>{style}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="rounded-full min-w-[88px] max-w-[120px] px-2 py-1.5 bg-background text-sm font-medium flex items-center gap-1">
                <Brain className="w-6 h-6 text-muted-foreground" />
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                {staticAvailableModels.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isImageMode ? 'Prompt für Bild...' : 'Nachricht eingeben...'}
            className="flex-1 mx-1 bg-transparent text-lg outline-none px-3 py-2 rounded-full"
          />
          <button
            type="button"
            title="Bildmodus umschalten"
            className="rounded-full w-10 h-10 bg-background hover:bg-accent flex items-center justify-center transition ml-0.5"
            onClick={() => setIsImageMode(!isImageMode)}
          >
            <ImagePlay className="w-6 h-6 text-muted-foreground" />
          </button>
          <label
            className="rounded-full w-10 h-10 bg-background hover:bg-accent flex items-center justify-center transition cursor-pointer ml-0.5"
          >
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            <Paperclip className="w-6 h-6 text-muted-foreground" />
          </label>
          <Button
            onClick={handleSendMessage}
            disabled={loading}
            className="ml-1 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center"
          >
            <Send className="w-7 h-7 text-black" />
          </Button>
        </div>
      </div>
    </div>
  );
}