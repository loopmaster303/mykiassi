// src/components/ui/tools/ChatThreadsClient.tsx
"use client";

import dynamic from 'next/dynamic';
import React, { Suspense } from 'react';
import { useChatThreads } from '@/context/ChatThreadsContext';

// Lazy load der Thread-Liste (um SSR zu verhindern)
const ChatThreads = dynamic(() => import('./ChatThreads'), { ssr: false });

export default function ChatThreadsClient() {
  const {
    threads,
    activeThreadId,
    setActiveThread,
    updateThread,
    deleteThread
  } = useChatThreads();

  return (
    <Suspense fallback={<div className="p-4 text-center text-muted-foreground">Lade Chat-Threads...</div>}>
      <ChatThreads
        threads={threads}
        activeThreadId={activeThreadId}
        setActiveThread={setActiveThread}
        updateThread={updateThread}
        deleteThread={deleteThread}
      />
    </Suspense>
  );
}