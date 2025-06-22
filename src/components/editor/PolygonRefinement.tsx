import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MousePointer2, 
  Plus, 
  Minus, 
  RotateCcw, 
  Check,
  X
} from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface PolygonRefinementProps {
  imageData: ImageData | null;
  initialMask?: ImageData | null;
  onRefine: (points: Point[]) => void;
}

export function PolygonRefinement({ 
  imageData, 
  initialMask, 
  onRefine 
}: PolygonRefinementProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [mode, setMode] = useState<'add' | 'edit' | 'remove'>('add');
  const [showPolygon, setShowPolygon] = useState(true);

  const POINT_RADIUS = 8;
  const HOVER_RADIUS = 12;

  useEffect(() => {
    drawCanvas();
  }, [points, selectedPoint, imageData, initialMask, showPolygon]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;

    const ctx = canvas.getContext('2d')!;
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.putImageData(imageData, 0, 0);

    // Draw initial mask if provided
    if (initialMask) {
      ctx.globalAlpha = 0.3;
      ctx.putImageData(initialMask, 0, 0);
      ctx.globalAlpha = 1.0;
    }

    if (!showPolygon) return;

    // Draw polygon
    if (points.length > 0) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      
      if (points.length > 2) {
        ctx.closePath();
      }
      
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw points
    points.forEach((point, index) => {
      const isSelected = selectedPoint === index;
      const radius = isSelected ? HOVER_RADIUS : POINT_RADIUS;
      
      // Outer circle
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? '#00ff00' : '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Inner dot
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#000000';
      ctx.fill();
      
      // Point number
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((index + 1).toString(), point.x, point.y);
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (mode === 'add') {
      setPoints([...points, { x, y }]);
    } else if (mode === 'remove') {
      // Find closest point
      const closestIndex = findClosestPoint(x, y);
      if (closestIndex !== -1) {
        const newPoints = points.filter((_, index) => index !== closestIndex);
        setPoints(newPoints);
        setSelectedPoint(null);
      }
    } else if (mode === 'edit') {
      const closestIndex = findClosestPoint(x, y);
      if (closestIndex !== -1) {
        setSelectedPoint(closestIndex);
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === 'edit' && selectedPoint !== null) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const newPoints = [...points];
      newPoints[selectedPoint] = { x, y };
      setPoints(newPoints);
    }
  };

  const handleCanvasMouseUp = () => {
    if (mode === 'edit') {
      setSelectedPoint(null);
    }
  };

  const findClosestPoint = (x: number, y: number): number => {
    let closestIndex = -1;
    let minDistance = HOVER_RADIUS;

    points.forEach((point, index) => {
      const distance = Math.sqrt(
        Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  };

  const clearPoints = () => {
    setPoints([]);
    setSelectedPoint(null);
  };

  const applyRefinement = () => {
    if (points.length >= 3) {
      onRefine(points);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MousePointer2 className="w-4 h-4" />
            <span>Polygon Refinement</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {points.length} points
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Mode selection */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'add' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('add')}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
            <Button
              variant={mode === 'edit' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('edit')}
            >
              <MousePointer2 className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              variant={mode === 'remove' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('remove')}
            >
              <Minus className="w-4 h-4 mr-1" />
              Remove
            </Button>
          </div>

          {/* Canvas */}
          {imageData && (
            <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain cursor-crosshair"
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPolygon(!showPolygon)}
              className="flex-1"
            >
              {showPolygon ? 'Hide' : 'Show'} Polygon
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearPoints}
              disabled={points.length === 0}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Clear
            </Button>
            <Button
              size="sm"
              onClick={applyRefinement}
              disabled={points.length < 3}
            >
              <Check className="w-4 h-4 mr-1" />
              Apply
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>• Click to add points in '{mode}' mode</p>
            <p>• Drag points in 'edit' mode</p>
            <p>• Need at least 3 points to create a mask</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}