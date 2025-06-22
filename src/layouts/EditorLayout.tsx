import React, { useEffect } from 'react';
import { useProjectionStore } from '../store/projectionStore';
import { useYjsSync } from '../hooks/useYjsSync';
import TopBar from '../components/editor/TopBar';
import Sidebar from '../components/editor/Sidebar';
import Canvas from '../components/editor/Canvas';

const EditorLayout: React.FC = () => {
  const addScene = useProjectionStore(state => state.addScene);
  const addSurface = useProjectionStore(state => state.addSurface);
  const addLayer = useProjectionStore(state => state.addLayer);
  const scenes = useProjectionStore(state => state.scenes);

  // Initialize Yjs sync
  useYjsSync();

  // Initialize default data on first load
  useEffect(() => {
    if (Object.keys(scenes).length === 0) {
      // Create default scene
      addScene({
        id: 'default-scene',
        name: 'Main Scene',
        layerIds: [],
        surfaceAssignments: {},
        crossfadeDurationMs: 500,
      });

      // Create default surface
      addSurface({
        id: 'default-surface',
        name: 'Main Surface',
        quad: [
          { x: 0.1, y: 0.1 }, // Top-left
          { x: 0.9, y: 0.1 }, // Top-right
          { x: 0.9, y: 0.9 }, // Bottom-right
          { x: 0.1, y: 0.9 }, // Bottom-left
        ],
        visible: true,
      });

      // Create default layer
      addLayer({
        id: 'default-layer',
        type: 'media',
        name: 'Welcome Layer',
        opacity: 1,
        blendMode: 'normal',
        transform: {
          position: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          rotation: 0,
        },
        visible: true,
        zIndex: 0,
      });
    }
  }, [scenes, addScene, addSurface, addLayer]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <Canvas />
      </div>
    </div>
  );
};

export default EditorLayout; 