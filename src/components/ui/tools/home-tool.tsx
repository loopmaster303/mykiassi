"use client";

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Image, Code } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HomeTool() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-5xl font-bold tracking-tighter">Hallo John, ich bin MeckDrAImy.</h1>
      <p className="text-muted-foreground mt-4 max-w-lg">Wie kann ich dir heute helfen? Wähle eine Aktion oder starte einen neuen Chat in der Seitenleiste.</p>
      
      <Card className="mt-12 p-6">
        <div className="flex items-center justify-center space-x-4">
          <Button variant="outline" onClick={() => router.push('/?tool=chatbot')}>
            <Search className="mr-2 h-4 w-4" />
            RiftMind Search
          </Button>
          <Button variant="outline" onClick={() => router.push('/?tool=simple-image-gen')}>
            <Image className="mr-2 h-4 w-4" />
            ImageGen
          </Button>
          <Button variant="outline">
            <Code className="mr-2 h-4 w-4" />
            VibeCode
          </Button>
        </div>
      </Card>
    </div>
  );
}
