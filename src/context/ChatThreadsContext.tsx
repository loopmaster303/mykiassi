"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { db, ChatThread, ChatMessage } from "../lib/chatdatabase"; // Pfad anpassen, je nach Projektstruktur

type ChatThreadsContextType = {
  threads: ChatThread[];
  activeThreadId: string | null;
  activeThread: ChatThread | null;
  createThread: (firstMessage: string) => Promise<string>;
  setActiveThread: (id: string) => void;
  addMessage: (threadId: string, message: ChatMessage) => Promise<void>;
  updateThread: (threadId: string, data: Partial<Omit<ChatThread, "id">>) => Promise<void>;
  deleteThread: (id: string) => Promise<void>;
};

const ChatThreadsContext = createContext<ChatThreadsContextType | undefined>(undefined);

export const ChatThreadsProvider = ({ children }: { children: React.ReactNode }) => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const threadsRef = useRef(threads);

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  const loadThreads = async () => {
    try {
      const all = await db.threads.toArray();
      setThreads(all);
      if (all.length > 0 && !activeThreadId) {
        setActiveThreadId(all[0].id);
      } else if (all.length === 0) {
        setActiveThreadId(null);
      }
    } catch (error) {
      console.error("Error loading threads:", error);
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  const createThread = async (firstMessage: string): Promise<string> => {
    const id = crypto.randomUUID();
    let title = `Thread ${threads.length + 1}`;

    if (firstMessage?.trim()) {
      try {
        const titleResponse = await fetch('/api/chat/title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            messages: [{ role: 'user', content: firstMessage.trim() }] 
          }),
        });
        if (titleResponse.ok) {
          const data = await titleResponse.json();
          if (data.title?.trim()) {
            title = data.title.trim();
          }
        }
      } catch (e) {
        console.error('Title generation failed:', e);
      }
    }

    const newThread: ChatThread = {
      id,
      title,
      messages: [],
      model: "gpt-3.5-turbo",
      style: "normal",
      persona: "default",
      tool: "chatbot",
      memory: [],
      updatedAt: Date.now(),
    };

    await db.threads.add(newThread);
    setThreads(prev => [...prev, newThread]);
    setActiveThreadId(id);
    return id;
  };

  const setActiveThread = (id: string) => {
    setActiveThreadId(id);
  };

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

  const updateThread = async (threadId: string, data: Partial<Omit<ChatThread, "id">>) => {
    const thread = await db.threads.get(threadId);
    if (!thread) return;
    const updated = { ...thread, ...data, updatedAt: Date.now() };
    await db.threads.put(updated);
    await loadThreads();
 setThreads(prevThreads =>
 prevThreads.map(t => (t.id === threadId ? updated : t))
 );
 };

  const deleteThread = async (threadId: string) => {
    const wasActive = activeThreadId === threadId;
    await db.threads.delete(threadId);
    if (wasActive) {
      const remaining = await db.threads.toArray();
      if (remaining.length > 0) setActiveThreadId(remaining[0].id);
      else setActiveThreadId(null);
    }
    await loadThreads();
  };

  const activeThread = threads.find((t) => t.id === activeThreadId) || null;

  return (
    <ChatThreadsContext.Provider
      value={{
        threads,
        activeThreadId,
        activeThread,
        createThread,
        setActiveThread,
        addMessage,
        updateThread,
        deleteThread,
      }}
    >
      {children}
    </ChatThreadsContext.Provider>
  );
};

export const useChatThreads = () => {
  const context = useContext(ChatThreadsContext);
  if (!context) throw new Error("useChatThreads must be used within a ChatThreadsProvider");
  return context;
};