// LumenCanvas Store Types

export interface WarpPoint {
  x: number; // normalized coordinates [0,1]
  y: number;
}

export interface Surface {
  id: string;
  name: string;
  quad: [WarpPoint, WarpPoint, WarpPoint, WarpPoint]; // corners: TL, TR, BR, BL
  warping?: {
    meshResolution: [number, number]; // e.g., [8,8]
    meshPoints: WarpPoint[]; // grid of control points for mesh warping
  };
  assignedLayerId?: string; // Layer currently projected on this surface
  visible: boolean;
  createdAt: number;
  updatedAt: number;
}

export type AssetType = 'image' | 'video' | 'audio' | 'shader' | 'html' | 'other';

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  url: string; // file URL or blob URL
  thumbnailUrl?: string;
  size: number; // bytes
  meta?: {
    duration?: number; // for video/audio
    resolution?: { width: number; height: number }; // for image/video
    [key: string]: any;
  };
  createdAt: number;
  updatedAt: number;
}

export type LayerType = 'media' | 'shader' | 'html' | 'group' | 'plugin';

export interface Layer {
  id: string;
  type: LayerType;
  name: string;
  assetId?: string; // for media layers
  shaderCode?: string; // for shader layers
  htmlCode?: string; // for HTML layers
  pluginId?: string; // for plugin layers
  opacity: number; // 0-1
  blendMode: 'normal' | 'add' | 'multiply' | 'screen' | 'overlay' | 'custom';
  transform: {
    position: { x: number; y: number };
    scale: { x: number; y: number };
    rotation: number; // radians
  };
  visible: boolean;
  zIndex: number;
  groupLayerIds?: string[]; // for group layers
  createdAt: number;
  updatedAt: number;
}

export interface Scene {
  id: string;
  name: string;
  layerIds: string[]; // ordered, top-to-bottom
  surfaceAssignments: Record<string, string | undefined>; // surfaceId -> layerId
  crossfadeDurationMs: number; // e.g., 500
  hotkey?: number; // 1-9
  createdAt: number;
  updatedAt: number;
}

// Main store state
export interface StoreState {
  // Core entities
  surfaces: Record<string, Surface>;
  scenes: Record<string, Scene>;
  assets: Record<string, Asset>;
  layers: Record<string, Layer>;
  
  // Current state
  currentSceneId: string;
  
  // UI/editor state
  selectedSurfaceId?: string;
  selectedLayerId?: string;
  selectedSceneId?: string;
  isPlaying: boolean;
  
  // Editor settings
  editor: {
    showGrid: boolean;
    gridSize: number;
    snapToGrid: boolean;
    autoMask: boolean;
  };
}

// Store actions interface
export interface StoreActions {
  // Bulk update functions for Yjs sync
  setSurfaces: (surfaces: Record<string, Surface>) => void;
  setScenes: (scenes: Record<string, Scene>) => void;
  setLayers: (layers: Record<string, Layer>) => void;
  setAssets: (assets: Record<string, Asset>) => void;

  // Surface actions
  addSurface: (surface: Omit<Surface, 'createdAt' | 'updatedAt'>) => void;
  updateSurface: (id: string, patch: Partial<Surface>) => void;
  removeSurface: (id: string) => void;
  
  // Scene actions
  addScene: (scene: Omit<Scene, 'createdAt' | 'updatedAt'>) => void;
  updateScene: (id: string, patch: Partial<Scene>) => void;
  removeScene: (id: string) => void;
  setCurrentScene: (id: string) => void;
  
  // Asset actions
  addAsset: (asset: Omit<Asset, 'createdAt' | 'updatedAt'>) => void;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  removeAsset: (id: string) => void;
  
  // Layer actions
  addLayer: (layer: Omit<Layer, 'createdAt' | 'updatedAt'>) => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  removeLayer: (id: string) => void;
  reorderLayers: (sceneId: string, layerIds: string[]) => void;
  
  // Selection actions
  selectSurface: (id?: string) => void;
  selectLayer: (id?: string) => void;
  selectScene: (id?: string) => void;
  
  // Playback actions
  play: () => void;
  pause: () => void;
  togglePlayback: () => void;
  
  // Editor actions
  updateEditorSettings: (settings: Partial<StoreState['editor']>) => void;
  
  // Selectors (computed state)
  getCurrentScene: () => Scene | undefined;
  getLayersForScene: (sceneId: string) => Layer[];
  getAssetsOfType: (type: AssetType) => Asset[];
  getSurfacesForScene: (sceneId: string) => Surface[];
}

// Combined store type
export type Store = StoreState & StoreActions; 