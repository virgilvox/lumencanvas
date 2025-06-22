import { useState } from 'react';
import { WebcamCapture } from './WebcamCapture';
import { AutoMasking } from './AutoMasking';
import { PolygonRefinement } from './PolygonRefinement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Camera, Wand2, MousePointer2 } from 'lucide-react';

interface WebcamMaskingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Point {
  x: number;
  y: number;
}

export function WebcamMasking({ open, onOpenChange }: WebcamMaskingProps) {
  const [webcamActive, setWebcamActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<ImageData | null>(null);
  const [sourceCanvas, setSourceCanvas] = useState<HTMLCanvasElement | null>(null);
  const [generatedMask, setGeneratedMask] = useState<ImageData | null>(null);
  const [activeTab, setActiveTab] = useState('capture');

  const handleCapture = (imageData: ImageData, canvas: HTMLCanvasElement) => {
    setCapturedImage(imageData);
    setSourceCanvas(canvas);
    setActiveTab('masking'); // Automatically switch to masking tab
  };

  const handleMaskGenerated = (mask: ImageData) => {
    setGeneratedMask(mask);
  };

  const handlePolygonRefine = (points: Point[]) => {
    if (!capturedImage) return;

    // Create mask from polygon points
    const canvas = document.createElement('canvas');
    canvas.width = capturedImage.width;
    canvas.height = capturedImage.height;
    const ctx = canvas.getContext('2d')!;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw polygon
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.closePath();
    ctx.fill();

    // Get mask data
    const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setGeneratedMask(maskData);
  };

  const handleClose = () => {
    // Clean up state when closing
    setWebcamActive(false);
    setCapturedImage(null);
    setSourceCanvas(null);
    setGeneratedMask(null);
    setActiveTab('capture');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Webcam Auto-Masking</DialogTitle>
          <DialogDescription>
            Capture an image from your webcam and automatically generate projection masks using AI.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="capture" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Capture
            </TabsTrigger>
            <TabsTrigger 
              value="masking" 
              disabled={!capturedImage}
              className="flex items-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              Auto-Mask
            </TabsTrigger>
            <TabsTrigger 
              value="refine" 
              disabled={!capturedImage}
              className="flex items-center gap-2"
            >
              <MousePointer2 className="w-4 h-4" />
              Refine
            </TabsTrigger>
          </TabsList>

          <TabsContent value="capture" className="mt-4">
            <WebcamCapture
              onCapture={handleCapture}
              isActive={webcamActive}
              onToggle={setWebcamActive}
            />
          </TabsContent>

          <TabsContent value="masking" className="mt-4">
            <AutoMasking
              imageData={capturedImage}
              sourceCanvas={sourceCanvas}
              onMaskGenerated={handleMaskGenerated}
            />
          </TabsContent>

          <TabsContent value="refine" className="mt-4">
            <PolygonRefinement
              imageData={capturedImage}
              initialMask={generatedMask}
              onRefine={handlePolygonRefine}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}