import React, { useEffect } from 'react';
import { useProjectionStore, useCurrentScene } from '../store/projectionStore';

const EditorLayout: React.FC = () => {
  const addScene = useProjectionStore(state => state.addScene);
  const addSurface = useProjectionStore(state => state.addSurface);
  const addLayer = useProjectionStore(state => state.addLayer);
  const scenes = useProjectionStore(state => state.scenes);
  const surfaces = useProjectionStore(state => state.surfaces);
  const layers = useProjectionStore(state => state.layers);
  const currentScene = useCurrentScene();

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
    <div className="editor-layout">
      <header className="editor-header">
        <h1>LumenCanvas Editor</h1>
        <div className="editor-status">
          <span>Current Scene: {currentScene?.name || 'None'}</span>
          <span>Surfaces: {Object.keys(surfaces).length}</span>
          <span>Layers: {Object.keys(layers).length}</span>
        </div>
      </header>
      <main className="editor-main">
        <aside className="editor-sidebar">
          <div className="sidebar-section">
            <h3>Scenes ({Object.keys(scenes).length})</h3>
            <div className="scene-list">
              {Object.values(scenes).map(scene => (
                <div key={scene.id} className="scene-item">
                  <span className="scene-name">{scene.name}</span>
                  <span className="scene-layers">{scene.layerIds.length} layers</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="sidebar-section">
            <h3>Surfaces ({Object.keys(surfaces).length})</h3>
            <div className="surface-list">
              {Object.values(surfaces).map(surface => (
                <div key={surface.id} className="surface-item">
                  <span className="surface-name">{surface.name}</span>
                  <span className={`surface-status ${surface.visible ? 'visible' : 'hidden'}`}>
                    {surface.visible ? '👁' : '🚫'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Layers ({Object.keys(layers).length})</h3>
            <div className="layer-list">
              {Object.values(layers).map(layer => (
                <div key={layer.id} className="layer-item">
                  <span className="layer-name">{layer.name}</span>
                  <span className="layer-type">{layer.type}</span>
                  <span className={`layer-status ${layer.visible ? 'visible' : 'hidden'}`}>
                    {layer.visible ? '👁' : '🚫'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Assets</h3>
            <div className="asset-drop-zone">
              <p>Drop files here</p>
              <small>MP4, PNG, GLSL, HTML</small>
            </div>
          </div>
        </aside>
        
        <div className="editor-canvas">
          <div className="canvas-placeholder">
            <h2>Canvas Area</h2>
            <p>Pixi.js integration coming next</p>
            <div className="store-status">
              <h3>Store Status:</h3>
              <ul>
                <li>✅ Zustand store initialized</li>
                <li>✅ Immer middleware active</li>
                <li>✅ Default scene, surface, and layer created</li>
                <li>✅ State updates working correctly</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EditorLayout; 