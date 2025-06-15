// src/components/ui/ToolRouterClient.tsx
'use client';

import React, { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import ChatbotClientWrapper from '@/components/ui/tools/chatbot-tool';
import TextToImageTool from '@/components/ui/tools/text-to-image-tool';
import FluxKontextTool from '@/components/ui/tools/image-kontext-tool';

export default function ToolRouterClient() {
  const searchParams = useSearchParams();
  const toolParam = searchParams.get('tool') || 'home';

  const activeTool = useMemo(() => {
    switch (toolParam) {
      case 'chatbot':
      case 'simple-image-gen':
      case 'flux-kontext':
      case 'kalender':
        return toolParam;
      default:
        return 'home';
    }
  }, [toolParam]);

  const renderTool = () => {
    switch (activeTool) {
      case 'chatbot':
        return <ChatbotClientWrapper />;
      case 'simple-image-gen':
        return <TextToImageTool />;
      case 'flux-kontext':
        return <FluxKontextTool />;
      case 'kalender':
        return (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h1 className="text-3xl font-bold">Kalender & To Dos</h1>
            <p className="text-muted-foreground">Dieses Feature kommt bald.</p>
          </div>
        );
      // Since chatbot is the default, the 'home' case is no longer needed here.
      // If a tool is not found, we could default to chatbot or show an error.
      default:
        return <ChatbotClientWrapper />; // Default to Chatbot if toolParam is not recognized
    }
  };

  return (
    <div className="flex-1 p-4 bg-background text-foreground">
      {renderTool()}
    </div>
  );
}