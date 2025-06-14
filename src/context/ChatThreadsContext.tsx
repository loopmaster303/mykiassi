"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ChatMessage } from '../components/ui/tools/chatbot-tool';
import { db, ChatThread } from '../lib/chatdatabase';

type ChatThreadsContextType = {
  threads: ChatThread[];
  activeThreadId: string | null;
  activeThread: ChatThread | null;
  createThread: () => Promise<string>;
  setActiveThread: (id: string) => void;
  addMessage: (threadId: string, message: ChatMessage) => Promise<void>;
  updateThread: (threadId: string, data: Partial<Omit<ChatThread, 'id'>>) => Promise<void>;
  deleteThread: (id: string) => Promise<void>;
};

const ChatThreadsContext = createContext<ChatThreadsContextType | undefined>(undefined);

export const ChatThreadsProvider = ({ children }: { children: ReactNode }) => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Threads aus DB laden
  const loadThreads = async () => {
    const all = await db.threads.toArray();
    setThreads(all);
    if (all.length > 0 && !activeThreadId) setActiveThreadId(all[0].id);
    if (all.length === 0) setActiveThreadId(null);
  };

  useEffect(() => { loadThreads(); }, []);

  // Thread anlegen
  const createThread = async (): Promise<string> => {
    const id = crypto.randomUUID();
    const newThread: ChatThread = {
      id,
      title: `Thread ${threads.length + 1}`,
      messages: [],
      model: 'gpt-3.5-turbo',
      style: 'normal',
      persona: 'default',
      tool: 'chatbot',
      memory: [],
      updatedAt: Date.now(),
    };
    await db.threads.add(newThread);
    await loadThreads();
    setActiveThreadId(id);
    return id;
  };

  const setActiveThread = (id: string) => setActiveThreadId(id);

  // Message hinzufügen
  const addMessage = async (threadId: string, message: ChatMessage) => {
    const thread = await db.threads.get(threadId);
    if (!thread) return;
    const updated = {
      ...thread,
      messages: [...thread.messages, message],
      updatedAt: Date.now(),
    };
    await db.threads.put(updated);
    await loadThreads();
  };

  // Thread updaten
  const updateThread = async (threadId: string, data: Partial<Omit<ChatThread, 'id'>>) => {
    const thread = await db.threads.get(threadId);
    if (!thread) return;
    const updated = { ...thread, ...data, updatedAt: Date.now() };
    await db.threads.put(updated);
    await loadThreads();
  };

  // Thread löschen
  const deleteThread = async (threadId: string) => {
    await db.threads.delete(threadId);
    await loadThreads();
    setActiveThreadId((prevId) => (prevId === threadId ? null : prevId));
  };

  const activeThread = threads.find(t => t.id === activeThreadId) || null;

  return (
    <ChatThreadsContext.Provider value={{
      threads,
      activeThreadId,
      activeThread,
      createThread,
      setActiveThread,
      addMessage,
      updateThread,
      deleteThread
    }}>
      {children}
    </ChatThreadsContext.Provider>
  );
};

export const useChatThreads = (): ChatThreadsContextType => {
  const context = useContext(ChatThreadsContext);
  if (!context) throw new Error('useChatThreads must be used within a ChatThreadsProvider');
  return context;
};