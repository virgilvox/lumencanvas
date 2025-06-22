/** @jsxImportSource @pixi/react */
import React from 'react';
import { Application } from '@pixi/react';
import { useProjectionStore } from '@/store/projectionStore';
import { WarpableQuadLayer } from './WarpableQuadLayer';
import { FileDropZone } from './FileDropZone';

const Canvas: React.FC = () => {
  const surfaces = useProjectionStore(state => state.surfaces);
  const selectedSurfaceId = useProjectionStore(state => state.selectedSurfaceId);

  return (
    <div className="canvas-container flex-1 w-full h-full bg-[var(--canvas-bg)] relative overflow-hidden">
      <Application
        width={undefined}
        height={undefined}
        backgroundAlpha={1}
        backgroundColor={0x000000}
        antialias={true}
        resolution={window.devicePixelRatio || 1}
        autoDensity={true}
        resizeTo={typeof window !== 'undefined' ? window : undefined}
      >
        {Object.values(surfaces).map(surface => (
          <WarpableQuadLayer
            key={surface.id}
            surface={surface}
            isSelected={surface.id === selectedSurfaceId}
          />
        ))}
      </Application>
      {/* File drop zone overlay */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <FileDropZone />
      </div>
    </div>
  );
};

export default Canvas;