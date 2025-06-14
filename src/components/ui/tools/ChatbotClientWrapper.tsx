"use client";
import dynamic from 'next/dynamic';
import React from 'react';

const ChatbotTool = dynamic(
  () => import('./chatbot-tool'),
  { ssr: false }
);

export default function ChatbotClientWrapper(props: any) {
  return <ChatbotTool {...props} />;
}