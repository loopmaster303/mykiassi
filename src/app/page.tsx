'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ThemeToggle } from '../components/ui/theme-toggle';
import ToolRouterClient from '../components/ui/ToolRouterClient';
import { ChatThreadsProvider, useChatThreads } from '../context/ChatThreadsContext';
import ChatThreadsClient from '../components/ui/tools/ChatThreadsClient';

function SidebarNav() {
  const searchParams = useSearchParams();
  const tool = searchParams.get('tool');
  const { createThread } = useChatThreads(); // hook innerhalb des Providers nutzen

  return (
    <nav className="space-y-2 flex-1">
      <Link href="/?tool=home" className="block px-3 py-2 rounded-md hover:bg-accent">🏠 Home</Link>
      <Link href="/?tool=simple-image-gen" className="block px-3 py-2 rounded-md hover:bg-accent">🖼️ Simple Image Gen</Link>
      <Link href="/?tool=flux-kontext" className="block px-3 py-2 rounded-md hover:bg-accent">🧠 Pro Image Gen</Link>

      <div className="flex items-center justify-between">
        <Link href="/?tool=chatbot" className="block px-3 py-2 rounded-md hover:bg-accent flex-1">💬 Chatbot</Link>
        <button
          onClick={() => createThread('')}
          className="ml-2 text-accent-foreground hover:text-primary font-bold text-lg"
          title="Neuen Thread starten"
        >
          +
        </button>
      </div>

      {tool === 'chatbot' && <ChatThreadsClient />}
      
      <Link href="/?tool=kalender" className="block px-3 py-2 rounded-md hover:bg-accent">📅 Kalender</Link>
    </nav>
  );
}

export default function Page() {
  return (
    <ChatThreadsProvider>
      <div className="flex h-screen bg-background text-foreground">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-card p-4 flex flex-col">
          <div className="text-xl font-bold mb-4">AI Assistant</div>
          <SidebarNav />
          <div className="mt-auto pt-4 border-t">
            <ThemeToggle />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <ToolRouterClient />
        </main>
      </div>
    </ChatThreadsProvider>
  );
}