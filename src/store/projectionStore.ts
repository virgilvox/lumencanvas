import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import type { 
  Store, 
  StoreState, 
  Surface, 
  Scene, 
  Asset, 
  Layer,
  AssetType 
} from '../types/store';

// Export types for external use
export type { Surface, Scene, Asset, Layer };

// Utility function to generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Default initial state
const initialState: StoreState = {
  surfaces: {},
  scenes: {},
  assets: {},
  layers: {},
  currentSceneId: '',
  selectedSurfaceId: undefined,
  selectedLayerId: undefined,
  selectedSceneId: undefined,
  isPlaying: false,
  editor: {
    showGrid: true,
    gridSize: 20,
    snapToGrid: false,
    autoMask: false,
  },
};

// Create the Zustand store with Immer middleware
export const useProjectionStore = create<Store>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      // Bulk update functions for Yjs sync
      setSurfaces: (surfaces: Record<string, Surface>) => set((state) => {
        state.surfaces = surfaces;
      }),

      setScenes: (scenes: Record<string, Scene>) => set((state) => {
        state.scenes = scenes;
      }),

      setLayers: (layers: Record<string, Layer>) => set((state) => {
        state.layers = layers;
      }),

      setAssets: (assets: Record<string, Asset>) => set((state) => {
        state.assets = assets;
      }),

      // Surface actions
      addSurface: (surface) => set((state) => {
        const now = Date.now();
        const newSurface: Surface = {
          ...surface,
          id: surface.id || generateId(),
          createdAt: now,
          updatedAt: now,
        };
        state.surfaces[newSurface.id] = newSurface;
      }),

      updateSurface: (id, patch) => set((state) => {
        if (state.surfaces[id]) {
          Object.assign(state.surfaces[id], patch, { updatedAt: Date.now() });
        }
      }),

      removeSurface: (id) => set((state) => {
        delete state.surfaces[id];
        // Clean up references
        Object.values(state.scenes).forEach(scene => {
          delete scene.surfaceAssignments[id];
        });
        // Deselect if currently selected
        if (state.selectedSurfaceId === id) {
          state.selectedSurfaceId = undefined;
        }
      }),

      // Scene actions
      addScene: (scene) => set((state) => {
        const now = Date.now();
        const newScene: Scene = {
          ...scene,
          id: scene.id || generateId(),
          createdAt: now,
          updatedAt: now,
        };
        state.scenes[newScene.id] = newScene;
        
        // Set as current scene if none exists
        if (!state.currentSceneId) {
          state.currentSceneId = newScene.id;
        }
      }),

      updateScene: (id, patch) => set((state) => {
        if (state.scenes[id]) {
          Object.assign(state.scenes[id], patch, { updatedAt: Date.now() });
        }
      }),

      removeScene: (id) => set((state) => {
        delete state.scenes[id];
        // Switch to another scene if this was current
        if (state.currentSceneId === id) {
          const remainingScenes = Object.keys(state.scenes);
          state.currentSceneId = remainingScenes.length > 0 ? remainingScenes[0] : '';
        }
        // Deselect if currently selected
        if (state.selectedSceneId === id) {
          state.selectedSceneId = undefined;
        }
      }),

      setCurrentScene: (id) => set((state) => {
        if (state.scenes[id]) {
          state.currentSceneId = id;
        }
      }),

      // Asset actions
      addAsset: (asset) => set((state) => {
        const now = Date.now();
        const newAsset: Asset = {
          ...asset,
          id: asset.id || generateId(),
          createdAt: now,
          updatedAt: now,
        };
        state.assets[newAsset.id] = newAsset;
      }),

      updateAsset: (id, patch) => set((state) => {
        if (state.assets[id]) {
          Object.assign(state.assets[id], patch, { updatedAt: Date.now() });
        }
      }),

      removeAsset: (id) => set((state) => {
        delete state.assets[id];
        // Clean up layer references
        Object.values(state.layers).forEach(layer => {
          if (layer.assetId === id) {
            layer.assetId = undefined;
          }
        });
      }),

      // Layer actions
      addLayer: (layer) => set((state) => {
        const now = Date.now();
        const newLayer: Layer = {
          ...layer,
          id: layer.id || generateId(),
          createdAt: now,
          updatedAt: now,
        };
        state.layers[newLayer.id] = newLayer;
      }),

      updateLayer: (id, patch) => set((state) => {
        if (state.layers[id]) {
          Object.assign(state.layers[id], patch, { updatedAt: Date.now() });
        }
      }),

      removeLayer: (id) => set((state) => {
        delete state.layers[id];
        // Remove from all scenes
        Object.values(state.scenes).forEach(scene => {
          scene.layerIds = scene.layerIds.filter(layerId => layerId !== id);
          // Remove from surface assignments
          Object.keys(scene.surfaceAssignments).forEach(surfaceId => {
            if (scene.surfaceAssignments[surfaceId] === id) {
              delete scene.surfaceAssignments[surfaceId];
            }
          });
        });
        // Deselect if currently selected
        if (state.selectedLayerId === id) {
          state.selectedLayerId = undefined;
        }
      }),

      reorderLayers: (sceneId, layerIds) => set((state) => {
        if (state.scenes[sceneId]) {
          state.scenes[sceneId].layerIds = layerIds;
          state.scenes[sceneId].updatedAt = Date.now();
        }
      }),

      // Selection actions
      selectSurface: (id) => set((state) => {
        state.selectedSurfaceId = id;
      }),

      selectLayer: (id) => set((state) => {
        state.selectedLayerId = id;
      }),

      selectScene: (id) => set((state) => {
        state.selectedSceneId = id;
      }),

      // Playback actions
      play: () => set((state) => {
        state.isPlaying = true;
      }),

      pause: () => set((state) => {
        state.isPlaying = false;
      }),

      togglePlayback: () => set((state) => {
        state.isPlaying = !state.isPlaying;
      }),

      // Editor actions
      updateEditorSettings: (settings) => set((state) => {
        Object.assign(state.editor, settings);
      }),

      // Selectors (computed state)
      getCurrentScene: () => {
        const state = get();
        return state.scenes[state.currentSceneId];
      },

      getLayersForScene: (sceneId) => {
        const state = get();
        const scene = state.scenes[sceneId];
        if (!scene) return [];
        return scene.layerIds
          .map(id => state.layers[id])
          .filter(Boolean)
          .sort((a, b) => a.zIndex - b.zIndex);
      },

      getAssetsOfType: (type: AssetType) => {
        const state = get();
        return Object.values(state.assets).filter(asset => asset.type === type);
      },

      getSurfacesForScene: (sceneId) => {
        const state = get();
        const scene = state.scenes[sceneId];
        if (!scene) return [];
        return Object.values(state.surfaces).filter(surface => 
          Object.values(scene.surfaceAssignments).includes(surface.id)
        );
      },
    }))
  )
);

// Export selectors for use in components
export const useCurrentScene = () => useProjectionStore(state => state.getCurrentScene());
export const useLayersForCurrentScene = () => {
  const currentSceneId = useProjectionStore(state => state.currentSceneId);
  return useProjectionStore(state => state.getLayersForScene(currentSceneId));
};
export const useSelectedSurface = () => {
  const selectedId = useProjectionStore(state => state.selectedSurfaceId);
  const surfaces = useProjectionStore(state => state.surfaces);
  return selectedId ? surfaces[selectedId] : undefined;
};
export const useSelectedLayer = () => {
  const selectedId = useProjectionStore(state => state.selectedLayerId);
  const layers = useProjectionStore(state => state.layers);
  return selectedId ? layers[selectedId] : undefined;
}; 