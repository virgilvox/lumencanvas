import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

// Create a new Yjs document for the projection mapping application
export const ydoc = new Y.Doc();

// Set up IndexedDB persistence
export const indexedDBProvider = new IndexeddbPersistence('lumencanvas-state', ydoc);

// Import types for proper typing
import type { Surface, Scene, Layer, Asset } from '../store/projectionStore';

// Create shared maps for different data types
export const ySurfaces = ydoc.getMap('surfaces') as Y.Map<Surface>;
export const yScenes = ydoc.getMap('scenes') as Y.Map<Scene>;
export const yLayers = ydoc.getMap('layers') as Y.Map<Layer>;
export const yAssets = ydoc.getMap('assets') as Y.Map<Asset>;

// Export a promise that resolves when the document is loaded from IndexedDB
export const docLoaded = new Promise<void>((resolve) => {
  indexedDBProvider.once('synced', () => {
    console.log('✅ Yjs document loaded from IndexedDB');
    resolve();
  });
});

// Helper function to convert Yjs Map to regular object
export function yjsMapToObject<T>(yjsMap: Y.Map<T>): Record<string, T> {
  const result: Record<string, T> = {};
  yjsMap.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

// Helper function to sync object to Yjs Map
export function syncObjectToYjsMap<T>(obj: Record<string, T>, yjsMap: Y.Map<T>): void {
  // Add/update items that exist in obj
  Object.entries(obj).forEach(([key, value]) => {
    yjsMap.set(key, value);
  });

  // Remove items that don't exist in obj anymore
  const objKeys = new Set(Object.keys(obj));
  yjsMap.forEach((_, key) => {
    if (!objKeys.has(key)) {
      yjsMap.delete(key);
    }
  });
}