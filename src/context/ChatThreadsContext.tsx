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
    try {
      const all = await db.threads.toArray();
      setThreads(all);
      if (all.length > 0 && !activeThreadId) {
        setActiveThreadId(all[0].id);
      } else if (all.length === 0) {
        setActiveThreadId(null);
      }
    } catch (error) {
      console.error("Error in loadThreads:", error);
    }
  };

  useEffect(() => {
    loadThreads();
  }, []); // Consider dependencies if activeThreadId changes should re-trigger selection

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
    try {
      await db.threads.add(newThread);
      console.log('ChatContext: Thread created:', newThread.id);
      await loadThreads(); // Reloads threads and potentially activeThreadId logic
      setActiveThreadId(id); // Explicitly set new thread as active
      return id;
    } catch (error) {
      console.error("Error in createThread:", error);
      return ''; // Return empty string or handle error as appropriate
    }
  };

  const setActiveThread = (id: string) => {
    console.log('ChatContext: Setting active thread to:', id);
    setActiveThreadId(id);
  };

  // Message hinzufügen
  const addMessage = async (threadId: string, message: ChatMessage) => {
    try {
      const thread = await db.threads.get(threadId);
      if (!thread) {
        console.error("Error in addMessage: Thread not found");
        return;
      }
      const updated = {
        ...thread,
        messages: [...thread.messages, message],
        updatedAt: Date.now(),
      };
      await db.threads.put(updated);
      console.log('ChatContext: Message added to thread:', threadId, 'New message:', message);
      await loadThreads();
    } catch (error) {
      console.error("Error in addMessage:", error);
    }
  };

  // Thread updaten
  const updateThread = async (threadId: string, data: Partial<Omit<ChatThread, 'id'>>) => {
    try {
      const thread = await db.threads.get(threadId);
      if (!thread) {
        console.error("Error in updateThread: Thread not found");
        return;
      }
      const updated = { ...thread, ...data, updatedAt: Date.now() };
      await db.threads.put(updated);
      console.log('ChatContext: Thread updated:', threadId, 'Data:', data);
      await loadThreads();
    } catch (error) {
      console.error("Error in updateThread:", error);
    }
  };

  // Thread löschen
  const deleteThread = async (threadId: string) => {
    try {
      const wasActive = activeThreadId === threadId;
      await db.threads.delete(threadId);
      console.log('ChatContext: Thread deleted:', threadId);

      let newActiveThreadIdAfterDeletion = activeThreadId; // Default to current if not changed
      if (wasActive) {
        const remainingThreads = await db.threads.toArray(); // Get fresh list
        if (remainingThreads.length > 0) {
          newActiveThreadIdAfterDeletion = remainingThreads[0].id;
          setActiveThreadId(newActiveThreadIdAfterDeletion);
        } else {
          newActiveThreadIdAfterDeletion = null;
          setActiveThreadId(null);
        }
        console.log('ChatContext: New active thread ID after deletion:', newActiveThreadIdAfterDeletion);
      }

      await loadThreads();

    } catch (error) {
      console.error("Error in deleteThread:", error);
    }
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