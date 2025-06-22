/** @jsxImportSource @pixi/react */
import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Application } from '@pixi/react';
import { useProjectionStore } from '@/store/projectionStore';
import { useBroadcastSync } from '@/hooks/useBroadcastSync';
import { useWebSocketSync } from '@/hooks/useWebSocketSync';
import { useYjsSync } from '@/hooks/useYjsSync';
import { WarpableQuadLayer } from '@/components/editor/WarpableQuadLayer';

const ProjectorLayout: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Get projection state
  const surfaces = useProjectionStore(state => state.surfaces);
  // const layers = useProjectionStore(state => state.layers);
  const scenes = useProjectionStore(state => state.scenes);
  const currentSceneId = useProjectionStore(state => state.currentSceneId);
  
  // Initialize sync based on route parameter
  const isLocal = id === 'local';
  
  // Use BroadcastChannel for local projector windows
  const { status: broadcastStatus } = isLocal ? useBroadcastSync() : { status: 'disabled' };
  
  // Use WebSocket for remote projector views
  const { status: wsStatus, connected: wsConnected } = !isLocal ? 
    useWebSocketSync('ws://localhost:1234', `lumencanvas-${id}`) : 
    { status: 'disabled', connected: false };
  
  // Initialize Yjs sync (always active for persistence)
  useYjsSync();

  // Get current scene
  // const currentScene = currentSceneId ? scenes[currentSceneId] : null;
  const visibleSurfaces = Object.values(surfaces).filter(s => s.visible);

  // Handle fullscreen
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          canvasRef.current?.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Calculate stage dimensions
  const [stageWidth, setStageWidth] = React.useState(window.innerWidth);
  const [stageHeight, setStageHeight] = React.useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setStageWidth(window.innerWidth);
      setStageHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div 
      ref={canvasRef}
      className="projector-layout"
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        overflow: 'hidden',
        cursor: 'none' // Hide cursor in projection mode
      }}
    >
      <Application
        width={stageWidth}
        height={stageHeight}
        backgroundAlpha={1}
        backgroundColor={0x000000}
        antialias={true}
        resolution={window.devicePixelRatio || 1}
        autoDensity={true}
        resizeTo={canvasRef.current || undefined}
      >
        {/* Render all visible surfaces */}
        {visibleSurfaces.map((surface) => (
          <WarpableQuadLayer
            key={surface.id}
            surface={surface}
            isSelected={false} // No selection in projector view
          />
        ))}
        
        {/* TODO: Render layers associated with surfaces */}
        {/* This will include media layers, shader layers, HTML layers */}
      </Application>

      {/* Status indicator (only visible when not in fullscreen) */}
      {!document.fullscreenElement && (
        <div className="absolute top-4 right-4 text-white/50 text-xs">
          <div>Projector ID: {id}</div>
          {isLocal && <div>BroadcastChannel: {broadcastStatus}</div>}
          {!isLocal && <div>WebSocket: {wsStatus} {wsConnected && '✓'}</div>}
          <div className="mt-2">Press F11 for fullscreen</div>
        </div>
      )}
    </div>
  );
};

export default ProjectorLayout; 