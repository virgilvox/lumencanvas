import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Maximize2, Grid3X3, Zap } from 'lucide-react';
import { Application } from '@pixi/react';
import { WarpableQuadLayer } from './WarpableQuadLayer';
import { useProjectionStore } from '@/store/projectionStore';

const Canvas: React.FC = () => {
  const surfaces = useProjectionStore(state => state.surfaces);

  return (
    <div className="flex-1 bg-background relative">
      {/* Canvas Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
        <Button variant="secondary" size="sm">
          <Grid3X3 className="w-4 h-4 mr-2" />
          Grid
        </Button>
        <Button variant="secondary" size="sm">
          <Maximize2 className="w-4 h-4 mr-2" />
          Fullscreen
        </Button>
        <Badge variant="outline" className="text-xs">
          1920×1080
        </Badge>
      </div>

      {/* Pixi.js Canvas */}
      <div className="w-full h-full relative canvas-container">
        <Application
          width={1920}
          height={1080}
          backgroundAlpha={0}
          antialias={true}
          resolution={window.devicePixelRatio || 1}
          autoDensity={true}
          resizeTo={document.querySelector('.canvas-container') as HTMLElement}
        >
          {/* Render surfaces as warpable quads */}
          {Object.values(surfaces).map(surface => (
            <WarpableQuadLayer
              key={surface.id}
              surface={surface}
              isSelected={false} // TODO: connect to selection state
            />
          ))}
        </Application>

        {/* Status overlay when no surfaces exist */}
        {Object.keys(surfaces).length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="w-96 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Projection Canvas</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add surfaces from the sidebar to start mapping content.
                </p>
                
                <div className="space-y-2 text-left">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Pixi.js Status:</span>
                    <Badge variant="secondary" className="text-xs">Ready</Badge>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span>Yjs sync active</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span>IndexedDB persistence</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span>Quad warping ready</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Grid overlay (optional) */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Canvas;