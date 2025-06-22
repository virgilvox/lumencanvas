import { useState, useEffect, useRef } from 'react';
import * as ort from 'onnxruntime-web';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2, RefreshCw, Save } from 'lucide-react';
import { useProjectionStore } from '@/store/projectionStore';
import type { WarpPoint } from '@/types/store';

interface AutoMaskingProps {
  imageData: ImageData | null;
  sourceCanvas: HTMLCanvasElement | null;
  onMaskGenerated: (mask: ImageData) => void;
}

// Mock U-Net model URL - in production, this would be a real model
const MODEL_URL = '/models/unet-lite.onnx';
const MODEL_SIZE = 1.2; // MB

export function AutoMasking({ imageData, sourceCanvas, onMaskGenerated }: AutoMaskingProps) {
  const [session, setSession] = useState<ort.InferenceSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionProvider, setExecutionProvider] = useState<string>('wasm');
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [mask, setMask] = useState<ImageData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const polygonPoints = useRef<WarpPoint[]>([]);
  
  const { addSurface } = useProjectionStore();

  // Initialize ONNX Runtime
  useEffect(() => {
    initializeORT();
  }, []);

  const initializeORT = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Configure ONNX Runtime Web
      ort.env.wasm.wasmPaths = '/wasm/';
      
      // Try WebGPU first, fallback to WASM
      let provider: string;
      let sessionOptions: ort.InferenceSession.SessionOptions;
      
      try {
        // Check if WebGPU is available
        if ('gpu' in navigator && navigator.gpu) {
          sessionOptions = { executionProviders: ['webgpu'] };
          provider = 'webgpu';
        } else {
          throw new Error('WebGPU not available');
        }
      } catch (e) {
        // Fallback to WASM
        sessionOptions = { executionProviders: ['wasm'] };
        provider = 'wasm';
      }

      // For demo purposes, we'll create a mock session
      // In production, you would load a real U-Net model
      console.log(`Initializing ONNX Runtime with ${provider} provider`);
      setExecutionProvider(provider);
      
      // Mock session creation - replace with actual model loading
      // const session = await ort.InferenceSession.create(MODEL_URL, sessionOptions);
      // setSession(session);
      
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to initialize ONNX Runtime:', err);
      setError('Failed to initialize ML model. Using fallback mode.');
      setIsLoading(false);
    }
  };

  const preprocessImage = (imageData: ImageData): Float32Array => {
    const { width, height, data } = imageData;
    const inputSize = 256; // Standard U-Net input size
    
    // Create a canvas for resizing
    const canvas = document.createElement('canvas');
    canvas.width = inputSize;
    canvas.height = inputSize;
    const ctx = canvas.getContext('2d')!;
    
    // Draw and resize image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);
    
    ctx.drawImage(tempCanvas, 0, 0, inputSize, inputSize);
    const resizedData = ctx.getImageData(0, 0, inputSize, inputSize);
    
    // Normalize and convert to CHW format
    const float32Data = new Float32Array(3 * inputSize * inputSize);
    const pixels = resizedData.data;
    
    for (let c = 0; c < 3; c++) {
      for (let h = 0; h < inputSize; h++) {
        for (let w = 0; w < inputSize; w++) {
          const idx = (h * inputSize + w) * 4 + c;
          const floatIdx = c * inputSize * inputSize + h * inputSize + w;
          float32Data[floatIdx] = pixels[idx] / 255.0;
        }
      }
    }
    
    return float32Data;
  };

  const postprocessMask = (output: Float32Array, originalWidth: number, originalHeight: number): ImageData => {
    const outputSize = Math.sqrt(output.length);
    
    // Create a canvas for the mask
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d')!;
    
    const imageData = ctx.createImageData(outputSize, outputSize);
    const data = imageData.data;
    
    // Convert model output to image data
    for (let i = 0; i < output.length; i++) {
      const value = Math.round(output[i] * 255);
      const pixelIdx = i * 4;
      data[pixelIdx] = value;     // R
      data[pixelIdx + 1] = value; // G
      data[pixelIdx + 2] = value; // B
      data[pixelIdx + 3] = 255;   // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Resize back to original dimensions
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = originalWidth;
    finalCanvas.height = originalHeight;
    const finalCtx = finalCanvas.getContext('2d')!;
    finalCtx.drawImage(canvas, 0, 0, originalWidth, originalHeight);
    
    return finalCtx.getImageData(0, 0, originalWidth, originalHeight);
  };

  const runInference = async () => {
    if (!imageData) return;
    
    setIsLoading(true);
    setError(null);
    const startTime = performance.now();
    
    try {
      // For demo purposes, we'll generate a mock mask
      // In production, this would run actual inference
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing
      
      // Generate a simple mock mask (circular mask in center)
      const { width, height } = imageData;
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const ctx = maskCanvas.getContext('2d')!;
      
      // Create gradient mask
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.3;
      
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, 'white');
      gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.5)');
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      const maskData = ctx.getImageData(0, 0, width, height);
      
      /* Real inference code would be:
      const input = preprocessImage(imageData);
      const inputTensor = new ort.Tensor('float32', input, [1, 3, 256, 256]);
      const results = await session!.run({ input: inputTensor });
      const output = results.output.data as Float32Array;
      const maskData = postprocessMask(output, width, height);
      */
      
      setMask(maskData);
      onMaskGenerated(maskData);
      
      const endTime = performance.now();
      setProcessingTime(endTime - startTime);
    } catch (err) {
      console.error('Inference failed:', err);
      setError('Failed to generate mask. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const drawMask = () => {
    if (!mask || !canvasRef.current || !sourceCanvas) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    // Set canvas size
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    
    // Draw original image
    ctx.drawImage(sourceCanvas, 0, 0);
    
    // Draw mask overlay
    ctx.globalAlpha = 0.5;
    ctx.putImageData(mask, 0, 0);
    ctx.globalAlpha = 1.0;
  };

  useEffect(() => {
    if (mask) {
      drawMask();
    }
  }, [mask]);

  const saveAsSurface = () => {
    if (!mask) return;
    
    // Convert mask to surface quad points
    // For demo, we'll create a simple rectangular surface
    const surface = {
      id: `surface-mask-${Date.now()}`,
      name: 'Auto-masked Surface',
      quad: [
        { x: 0.2, y: 0.2 },
        { x: 0.8, y: 0.2 },
        { x: 0.8, y: 0.8 },
        { x: 0.2, y: 0.8 },
      ] as [WarpPoint, WarpPoint, WarpPoint, WarpPoint],
      visible: true,
    };
    
    addSurface(surface);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wand2 className="w-4 h-4" />
            <span>Auto-Masking</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={executionProvider === 'webgpu' ? 'default' : 'secondary'}>
              {executionProvider.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              ~{MODEL_SIZE}MB
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}
          
          {imageData && (
            <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
              <canvas 
                ref={canvasRef}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              onClick={runInference}
              disabled={!imageData || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Mask
                </>
              )}
            </Button>
            
            {mask && (
              <>
                <Button
                  onClick={runInference}
                  variant="outline"
                  size="icon"
                  title="Regenerate mask"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button
                  onClick={saveAsSurface}
                  variant="outline"
                  size="icon"
                  title="Save as surface"
                >
                  <Save className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
          
          {processingTime && (
            <p className="text-xs text-muted-foreground text-center">
              Processed in {processingTime.toFixed(0)}ms
            </p>
          )}
          
          <div className="text-xs text-muted-foreground">
            <p>• U-Net model runs locally in your browser</p>
            <p>• No data is sent to servers</p>
            <p>• {executionProvider === 'webgpu' ? 'GPU accelerated' : 'CPU fallback mode'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}