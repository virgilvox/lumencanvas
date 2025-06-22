import { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { useProjectionStore, type Surface, type Scene, type Layer, type Asset } from '../store/projectionStore';
import { 
  ydoc, 
  ySurfaces, 
  yScenes, 
  yLayers, 
  yAssets,
  docLoaded,
  yjsMapToObject,
  syncObjectToYjsMap
} from '../lib/yjs';

export const useYjsSync = () => {
  const isInitialized = useRef(false);
  const isSyncing = useRef(false);

  useEffect(() => {
    let cleanup: (() => void)[] = [];

    const initializeSync = async () => {
      // Wait for the document to be loaded from IndexedDB
      await docLoaded;

      // Load initial state from Yjs if available
      if (!isInitialized.current) {
        isSyncing.current = true;

        const surfacesFromYjs = yjsMapToObject<Surface>(ySurfaces);
        const scenesFromYjs = yjsMapToObject<Scene>(yScenes);
        const layersFromYjs = yjsMapToObject<Layer>(yLayers);
        const assetsFromYjs = yjsMapToObject<Asset>(yAssets);

        // Get current state
        const currentState = useProjectionStore.getState();

        // Only load from Yjs if there's data there and Zustand is empty
        if (Object.keys(surfacesFromYjs).length > 0 && Object.keys(currentState.surfaces).length === 0) {
          currentState.setSurfaces(surfacesFromYjs);
        }
        if (Object.keys(scenesFromYjs).length > 0 && Object.keys(currentState.scenes).length === 0) {
          currentState.setScenes(scenesFromYjs);
        }
        if (Object.keys(layersFromYjs).length > 0 && Object.keys(currentState.layers).length === 0) {
          currentState.setLayers(layersFromYjs);
        }
        if (Object.keys(assetsFromYjs).length > 0 && Object.keys(currentState.assets).length === 0) {
          currentState.setAssets(assetsFromYjs);
        }

        isInitialized.current = true;
        isSyncing.current = false;
      }

      // Set up Yjs -> Zustand sync (when Yjs changes, update Zustand)
      const handleSurfacesChange = () => {
        if (isSyncing.current) return;
        isSyncing.current = true;
        const surfaces = yjsMapToObject<Surface>(ySurfaces as Y.Map<Surface>);
        useProjectionStore.getState().setSurfaces(surfaces);
        isSyncing.current = false;
      };

      const handleScenesChange = () => {
        if (isSyncing.current) return;
        isSyncing.current = true;
        const scenes = yjsMapToObject<Scene>(yScenes as Y.Map<Scene>);
        useProjectionStore.getState().setScenes(scenes);
        isSyncing.current = false;
      };

      const handleLayersChange = () => {
        if (isSyncing.current) return;
        isSyncing.current = true;
        const layers = yjsMapToObject<Layer>(yLayers as Y.Map<Layer>);
        useProjectionStore.getState().setLayers(layers);
        isSyncing.current = false;
      };

      const handleAssetsChange = () => {
        if (isSyncing.current) return;
        isSyncing.current = true;
        const assets = yjsMapToObject<Asset>(yAssets as Y.Map<Asset>);
        useProjectionStore.getState().setAssets(assets);
        isSyncing.current = false;
      };

      ySurfaces.observe(handleSurfacesChange);
      yScenes.observe(handleScenesChange);
      yLayers.observe(handleLayersChange);
      yAssets.observe(handleAssetsChange);

      cleanup.push(
        () => ySurfaces.unobserve(handleSurfacesChange),
        () => yScenes.unobserve(handleScenesChange),
        () => yLayers.unobserve(handleLayersChange),
        () => yAssets.unobserve(handleAssetsChange)
      );

      // Set up Zustand -> Yjs sync (when Zustand changes, update Yjs)
      const unsubscribe = useProjectionStore.subscribe((state, prevState) => {
        if (isSyncing.current) return;
        
        ydoc.transact(() => {
          isSyncing.current = true;

          if (state.surfaces !== prevState.surfaces) {
            syncObjectToYjsMap(state.surfaces, ySurfaces as Y.Map<Surface>);
          }
          if (state.scenes !== prevState.scenes) {
            syncObjectToYjsMap(state.scenes, yScenes as Y.Map<Scene>);
          }
          if (state.layers !== prevState.layers) {
            syncObjectToYjsMap(state.layers, yLayers as Y.Map<Layer>);
          }
          if (state.assets !== prevState.assets) {
            syncObjectToYjsMap(state.assets, yAssets as Y.Map<Asset>);
          }

          isSyncing.current = false;
        });
      });

      cleanup.push(unsubscribe);
    };

    initializeSync().catch(console.error);

    return () => {
      cleanup.forEach(fn => fn());
    };
  }, []);
};