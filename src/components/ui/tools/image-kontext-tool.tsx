'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDropzone } from 'react-dropzone';

export default function ImageContextTool() {
  const [prompt, setPrompt] = useState('');
  const [inferenceSteps, setInferenceSteps] = useState([20]);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [context, setContext] = useState('');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          setUploadedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
    accept: { 'image/*': [] },
    multiple: false,
  });

  const handleGenerate = async () => {
    if (!prompt) {
      alert('Bitte gib einen Prompt ein.');
      return;
    }
    setLoading(true);
    setImageUrl('');
    setError('');

    // **Payload anpassen: KEIN model mehr, nur prompt, aspect_ratio, input_image, context**
    const payload: {
      prompt: string;
      aspect_ratio: string;
      input_image?: string;
      context?: string;
    } = {
      prompt,
      aspect_ratio: aspectRatio,
    };

    if (uploadedImage) {
      // Nur den Base64-Inhalt ohne Präfix senden
      payload.input_image = uploadedImage.split(',')[1];
    }
    if (context) {
      payload.context = context;
    }

    try {
      const res = await fetch('/api/generate-bfl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setImageUrl(data.imageUrl);
      } else {
        setError(data.error || 'Ein unbekannter Fehler ist aufgetreten.');
      }
    } catch (err) {
      setLoading(false);
      setError('Netzwerkfehler oder Problem bei der API-Anfrage.');
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-4">
      {/* LINKE SPALTE: PARAMETER */}
      <div className="md:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Parameter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Seitenverhältnis</Label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger>
                  <SelectValue placeholder="Wähle Seitenverhältnis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">Quadrat (1:1)</SelectItem>
                  <SelectItem value="16:9">Querformat (16:9)</SelectItem>
                  <SelectItem value="2:3">Hochformat (2:3)</SelectItem>
                  <SelectItem value="3:2">Querformat (3:2)</SelectItem>
                  <SelectItem value="4:5">Hochformat (4:5)</SelectItem>
                  <SelectItem value="5:4">Querformat (5:4)</SelectItem>
                  <SelectItem value="9:16">Hochformat (9:16)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* UI-only: Inferenz-Schritte */}
            <div>
              <Label>Inferenz-Schritte: {inferenceSteps[0]}</Label>
              <Slider
                value={inferenceSteps}
                onValueChange={setInferenceSteps}
                max={50}
                min={10}
                step={1}
                className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
              />
            </div>
            {/* Optional: Kontext-Feld */}
            <div>
              <Label htmlFor="context">Kontext (optional)</Label>
              <Textarea
                id="context"
                placeholder="Beschreibe Vorwissen, Story, Style oder Folgeprompt..."
                value={context}
                onChange={e => setContext(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MITTLERE SPALTE: EINGABE */}
      <div className="md:col-span-1 space-y-6">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Eingabe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 h-full flex flex-col">
            <div
              {...getRootProps()}
              className={`flex-1 border-2 border-dashed rounded-md p-4 text-center flex flex-col items-center justify-center cursor-pointer 
                          ${isDragActive ? 'border-primary' : 'border-gray-300'}`}
            >
              <input {...getInputProps()} />
              {uploadedImage ? (
                <img src={uploadedImage} alt="Hochgeladenes Bild" className="max-w-full max-h-48 object-contain mb-2" />
              ) : (
                <p className="text-muted-foreground">Bild hierher ziehen</p>
              )}
              {!uploadedImage && <p className="text-sm text-muted-foreground">(oder klicken zum Hochladen)</p>}
            </div>
            <Textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Beschreibe, was du generieren möchtest…"
              className="mt-4 flex-grow"
            />
            <Button onClick={handleGenerate} disabled={loading} className="w-full">
              {loading ? 'Generiere...' : 'Generieren'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* RECHTE SPALTE: ERGEBNIS */}
      <div className="md:col-span-1 space-y-6">
        <Card className="aspect-video h-full">
          <CardHeader><CardTitle>Ergebnis</CardTitle></CardHeader>
          <CardContent className="p-4 h-full w-full flex items-center justify-center text-center">
            {loading && <p className="text-muted-foreground">Bild wird geladen…</p>}
            {error && <p className="text-red-500">{error}</p>}
            {imageUrl && !loading && !error && (
              <img src={imageUrl} alt="Generiertes KI-Bild" className="w-full h-full object-contain rounded-md" />
            )}
            {!loading && !imageUrl && !error && <p className="text-muted-foreground">Hier wird dein Bild erscheinen.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}