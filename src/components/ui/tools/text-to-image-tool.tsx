'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export default function TextToImageTool() {
  // States für die Eingaben
  const [prompt, setPrompt] = useState('');
  const [imageModels, setImageModels] = useState<string[]>([]);
  // Standardmodell auf Stable Diffusion (SD) setzen, da es der Standard für Pollinations ist
  const [model, setModel] = useState<string>(''); 
  
  // States für die neuen Parameter
  const [width, setWidth] = useState([1024]);
  const [height, setHeight] = useState([1024]);
  const [seed, setSeed] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState(false);
  // Removed enhance and safe states
  const [transparent, setTransparent] = useState(false);

  // States für den App-Zustand
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Neue erweiterte Optionen
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  const [batchSize, setBatchSize] = useState<number>(1);
  const [safetyTolerance, setSafetyTolerance] = useState<number>(0);
  const [upsampling, setUpsampling] = useState(false);
  const [outputFormat, setOutputFormat] = useState<string>('jpg');
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/image/models')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.models) && data.models.length > 0) {
          setImageModels(data.models);
          // Set default model if not yet set
          if (!data.models.includes(model)) {
            setModel(data.models[0]);
          }
        }
      })
      .catch(err => {
        console.error('Fehler beim Laden der Bildmodelle:', err);
        // Fallback: keep model empty or set to first known
        if (!model) {
          setModel('flux');
        }
      });
  }, []); // run once on mount

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('Bitte gib zuerst einen Prompt ein.');
      return;
    }
    setLoading(true);
    setError('');
    setImageUrls([]);
    // setImageUrl(''); // imageUrl is not used anymore
    const urls: string[] = [];
    for (let i = 0; i < batchSize; i++) {
      // Determine seed for this iteration
      let seedVal: number | undefined;
      if (seed.trim()) {
        const base = Number(seed);
        if (!isNaN(base)) {
          seedVal = base + i;
        }
      } else if (batchSize > 1) {
        seedVal = Math.floor(Math.random() * 100000);
      }
      // Build payload
      const payload: Record<string, any> = {
        prompt: prompt.trim(),
        model,
        width: width[0],
        height: height[0],
      };
      if (seedVal != null) payload.seed = seedVal;
      payload.nologo = true;
      if (isPrivate) payload.private = true;
      if (upsampling) payload.enhance = true;
      if (transparent) payload.transparent = true;
      try {
        const resp = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) {
          const data = await resp.json().catch(() => null);
          console.error('API-Generate Error:', resp.status, data);
          // Fallback for gptimage tier
          if (model === 'gptimage' && data?.message?.includes('flower tier')) {
            setError('gptimage nicht freigeschaltet. Wechsle auf flux und erneut generieren.');
            setModel('flux');
          } else {
            setError(data?.error || `Fehler: ${resp.status}`);
          }
          break;
        }
        const blob = await resp.blob();
        const objectUrl = URL.createObjectURL(blob);
        urls.push(objectUrl);
      } catch (err) {
        console.error('Network-Error bei /api/generate:', err);
        setError('Netzwerkfehler bei Bildanfrage');
        break;
      }
    }
    setImageUrls(urls);
    setLoading(false);
  };

  return (
    <div className="flex flex-col space-y-6 p-4 w-full">
      <Card>
        <CardHeader><CardTitle>Image Generator</CardTitle></CardHeader>
        <CardContent>
          {/* Prompt */}
          <div className="flex flex-col md:flex-row items-center justify-center space-y-2 md:space-y-0 md:space-x-4 w-full">
            <Input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ein pinker Elefant in einer futuristischen Stadt..."
              className="w-full md:w-3/4 lg:w-2/3 mx-auto"
            />
            <Button onClick={handleGenerate} disabled={loading} className="mx-auto md:mx-0">
              {loading ? 'Generiere...' : 'Generieren'}
            </Button>
          </div>
          {/* Erste Zeile Einstellungen: Modell und Canvas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 justify-items-center">
            {/* Modell */}
            <div className="flex flex-col items-center space-y-1 w-full md:w-auto">
              <Label className="text-center">Modell</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="w-40 mx-auto">
                  <SelectValue placeholder="Modell" />
                </SelectTrigger>
                <SelectContent>
                  {imageModels.length > 0 ? (
                    imageModels.map(m => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="flux">flux</SelectItem>
                      <SelectItem value="turbo">turbo</SelectItem>
                      <SelectItem value="gptimage">gptimage</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            {/* Canvas Breite */}
            <div className="flex flex-col items-center space-y-1 w-full md:w-auto">
              <Label className="text-center">Breite: {width[0]}px</Label>
              <Slider
                value={width}
                onValueChange={setWidth}
                min={512}
                max={1536}
                step={64}
                className="w-32"
              />
            </div>
            {/* Canvas Höhe */}
            <div className="flex flex-col items-center space-y-1 w-full md:w-auto">
              <Label className="text-center">Höhe: {height[0]}px</Label>
              <Slider
                value={height}
                onValueChange={setHeight}
                min={512}
                max={1536}
                step={64}
                className="w-32"
              />
            </div>
          </div>

          {/* Zweite Zeile Einstellungen: Erweiterte Optionen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6 justify-items-center">
            {/* Seitenverhältnis */}
            <div className="flex flex-col items-center space-y-1 w-full md:w-auto">
              <Label className="text-center">Seitenverhältnis</Label>
              <Select value={aspectRatio} onValueChange={(val) => {
                setAspectRatio(val);
                const [wStr, hStr] = val.split(':');
                const w = Number(wStr);
                const h = Number(hStr);
                if (!isNaN(w) && !isNaN(h)) {
                  const newHeight = Math.round((width[0] * h) / w);
                  setHeight([newHeight]);
                }
              }}>
                <SelectTrigger className="w-32 mx-auto">
                  <SelectValue placeholder="Ratio" />
                </SelectTrigger>
                <SelectContent>
                  {['1:1','16:9','4:3','9:16','21:9','3:4','16:21'].map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Batch Size */}
            <div className="flex flex-col items-center space-y-1 w-full md:w-auto">
              <Label className="text-center">Batch Size</Label>
              <div className="flex items-center space-x-2">
                <Slider
                  defaultValue={[batchSize]}
                  onValueChange={(val) => setBatchSize(val[0])}
                  max={5}
                  step={1}
                  onValueCommit={(val) => setBatchSize(val[0])}
                  className="w-24"
                />
                <span className="w-6 text-center">{batchSize}</span>
              </div>
            </div>
            {/* Safety Tolerance */}
            <div className="flex flex-col items-center space-y-1 w-full md:w-auto">
              <Label className="text-center">Safety</Label>
              <div className="flex items-center space-x-2">
                <Slider
                  defaultValue={[safetyTolerance]}
                  onValueChange={(val) => setSafetyTolerance(val[0])}
                  max={100}
                  step={10}
                  onValueCommit={(val) => setSafetyTolerance(val[0])}
                  className="w-24"
                />
                <span className="w-8 text-center">{safetyTolerance}%</span>
              </div>
            </div>
            {/* Upsampling */}
            <div className="flex flex-col items-center space-y-1">
              <Checkbox checked={upsampling} onCheckedChange={setUpsampling} id="upsampling" />
              <Label className="text-center" htmlFor="upsampling">Upsampling</Label>
            </div>
            {/* Transparent */}
            <div className="flex flex-col items-center space-y-1">
              <Checkbox checked={transparent} onCheckedChange={setTransparent} id="transparent" />
              <Label className="text-center" htmlFor="transparent">Transparent</Label>
            </div>
            {/* Format */}
            <div className="flex flex-col items-center space-y-1 w-full md:w-auto">
              <Label className="text-center">Format</Label>
              <Select value={outputFormat} onValueChange={setOutputFormat}>
                <SelectTrigger className="w-24 mx-auto">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  {['jpg','png'].map(f => (
                    <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Seed with Random */}
            <div className="flex flex-col items-center space-y-1 w-full md:w-auto">
              <Label className="text-center" htmlFor="seed">Seed</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="seed"
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Optional"
                  className="w-20"
                />
                <Button size="sm" onClick={() => setSeed(String(Math.floor(Math.random()*100000)))}>Random</Button>
              </div>
            </div>
            {/* Privat */}
            <div className="flex flex-col items-center space-y-1">
              <Checkbox checked={isPrivate} onCheckedChange={setIsPrivate} id="private" />
              <Label className="text-center" htmlFor="private">Privat (kein Feed)</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="aspect-video w-full">
        <CardHeader><CardTitle>Ergebnis</CardTitle></CardHeader>
        <CardContent className="p-4 w-full flex flex-col items-center justify-center text-center">
          {loading && <p className="text-muted-foreground">Bild wird geladen...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!loading && !error && imageUrls.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {imageUrls.map((url, idx) => (
                <div key={idx} className="w-full bg-gray-100 flex items-center justify-center p-2 rounded-md">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={`Bild ${idx+1}`} className="object-contain max-w-full max-h-full" />
                  </a>
                </div>
              ))}
            </div>
          )}
          {!loading && !error && imageUrls.length === 0 && (
            <p className="text-muted-foreground">Hier wird dein Bild erscheinen.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}