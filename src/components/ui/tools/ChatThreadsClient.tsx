"use client";

import dynamic from "next/dynamic";
import React, { Suspense } from "react";
import { useChatThreads } from "@/context/ChatThreadsContext";

// Lazy load ChatThreads component, disable SSR (only render client-side)
const ChatThreads = dynamic(() => import("./ChatThreads"), { ssr: false });

export default function ChatThreadsClient() {
  const {
    threads,
    activeThreadId,
    setActiveThread,
    updateThread,
    deleteThread,
  } = useChatThreads();

  return (
    <Suspense
      fallback={
        <div className="p-4 text-center text-muted-foreground">
          Lade Chat-Threads...
        </div>
      }
    >
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