"use client";

import { useState, useCallback, FC } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ImageKontextTool: FC = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultImageUrl, setResultImageUrl] = useState('');
  const [inputImageUrl, setInputImageUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [inferenceSteps, setInferenceSteps] = useState([20]);

  const handleImageDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInputImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);
  
  const handleGenerate = async () => {
    if (!prompt && !inputImageUrl) {
      alert('Bitte gib einen Prompt ein oder lade ein Bild hoch.');
      return;
    }
    setLoading(true);
    setResultImageUrl('');
    setError('');

  const payload = {
  model: 'flux-kontext-pro',
  prompt,
  input_image: inputImageUrl,
  aspect_ratio: aspectRatio,
};
    
    // KORREKTUR: Ruft die neue, dedizierte API-Route auf
    const res = await fetch('/api/generate-bfl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setResultImageUrl(data.imageUrl);
    } else {
      setError(data.error || 'Ein unbekannter Fehler ist aufgetreten.');
    }
  };

  return (
    <div className="flex flex-col space-y-6 p-4 w-full">
      <Card>
        <CardHeader>
          <CardTitle>Eingabe</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="w-full h-64 border-2 border-dashed rounded-md flex items-center justify-center text-muted-foreground bg-muted/20"
            onDrop={handleImageDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {inputImageUrl ? (
              <img src={inputImageUrl} alt="Eingabebild" className="max-h-full max-w-full object-contain" />
            ) : (
              "Bild hierher ziehen"
            )}
          </div>
          <div className="flex flex-col items-center space-y-4 w-full mt-4">
            <Input
              className="w-full md:w-3/4 lg:w-2/3"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Beschreibe, was du ändern oder generieren möchtest..."
            />
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4 w-full justify-center">
              <div className="flex flex-col space-y-1 w-full md:w-1/4">
                <Label>Seitenverhältnis</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">Quadrat (1:1)</SelectItem>
                    <SelectItem value="16:9">Breitbild (16:9)</SelectItem>
                    <SelectItem value="9:16">Hochformat (9:16)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col space-y-1 w-full md:w-1/4">
                <Label>Inferenz-Schritte: {inferenceSteps[0]}</Label>
                <Slider
                  value={inferenceSteps}
                  onValueChange={setInferenceSteps}
                  max={50}
                  step={1}
                />
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full md:w-1/2"
            >
              {loading ? 'Generiere...' : 'Generieren'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="aspect-video">
        <CardHeader><CardTitle>Ergebnis</CardTitle></CardHeader>
        <CardContent className="p-4 h-full w-full flex items-center justify-center text-center">
          {loading && <p className="text-muted-foreground">Bild wird geladen...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {resultImageUrl && !loading && !error && (
            <img src={resultImageUrl} alt="Generated AI Image" className="w-full h-full object-contain rounded-md" />
          )}
          {!loading && !resultImageUrl && !error && <p className="text-muted-foreground">Hier wird dein Bild erscheinen.</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageKontextTool;
