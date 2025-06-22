import React from 'react';
import { Application } from '@pixi/react';
import { useProjectionStore } from '@/store/projectionStore';
import { WarpableQuadLayer } from './WarpableQuadLayer';
import { FileDropZone } from './FileDropZone';

const Canvas: React.FC = () => {
  const surfaces = useProjectionStore(state => state.surfaces);
  const selectedSurfaceId = useProjectionStore(state => state.selectedSurfaceId);

  return (
    <div className="canvas-container">
      <Application
        width={window.innerWidth - 280} // Account for sidebar
        height={window.innerHeight - 48} // Account for topbar
        backgroundAlpha={1}
        backgroundColor={0x000000}
        antialias={true}
        resolution={window.devicePixelRatio || 1}
        autoDensity={true}
        resizeTo={document.querySelector('.canvas-container') as HTMLElement}
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
      <FileDropZone />
    </div>
  );
};

export default Canvas;