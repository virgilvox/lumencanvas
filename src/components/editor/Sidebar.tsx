import React from 'react';
import { 
  Layers, 
  Image, 
  Video,
  Globe, 
  Code, 
  FileText,
  Plus,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';
import { useProjectionStore } from '@/store/projectionStore';
import type { Layer, LayerType } from '@/types/store';
import { CodeEditor } from './CodeEditor';

const Sidebar: React.FC = () => {
  const [codeEditorOpen, setCodeEditorOpen] = React.useState(false);
  const [editingLayer, setEditingLayer] = React.useState<Layer | null>(null);
  
  const scenes = useProjectionStore(state => state.scenes);
  const currentSceneId = useProjectionStore(state => state.currentSceneId);
  const layers = useProjectionStore(state => state.layers);
  const assets = useProjectionStore(state => state.assets);
  
  const addLayer = useProjectionStore(state => state.addLayer);
  const updateLayer = useProjectionStore(state => state.updateLayer);
  const removeLayer = useProjectionStore(state => state.removeLayer);
  const setCurrentScene = useProjectionStore(state => state.setCurrentScene);

  const handleAddLayer = (type: LayerType) => {
    const newLayer: Omit<Layer, 'createdAt' | 'updatedAt'> = {
      id: `layer-${Date.now()}`,
      name: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Layer`,
      type,
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      transform: {
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
      },
      zIndex: Object.keys(layers).length,
      ...(type === 'shader' ? { 
        shaderCode: 'void main() {\n  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n}' 
      } : {}),
      ...(type === 'html' ? { 
        htmlCode: '<div>Hello World</div>' 
      } : {})
    };
    
    addLayer(newLayer);
    
    if (type === 'shader' || type === 'html') {
      // Need to get the created layer from the store
      const createdLayer = Object.values(layers).find(l => l.id === newLayer.id);
      if (createdLayer) {
        setEditingLayer(createdLayer);
        setCodeEditorOpen(true);
      }
    }
  };

  const getLayerIcon = (type: LayerType) => {
    switch (type) {
      case 'media': return <Image className="w-4 h-4" />;
      case 'shader': return <Code className="w-4 h-4" />;
      case 'html': return <FileText className="w-4 h-4" />;
      case 'group': return <Layers className="w-4 h-4" />;
      case 'plugin': return <Globe className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <aside className="sidebar flex flex-col h-full overflow-y-auto border-r border-[var(--border)] bg-[var(--sidebar-bg)] min-w-[var(--sidebar-width)] max-w-[var(--sidebar-width)]">
        {/* Layers Section */}
        <div className="border-b border-[var(--border)] pb-2 mb-2">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="font-semibold text-[var(--text)] text-sm">Layers</span>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--panel-bg)] rounded px-2 py-0.5">{Object.keys(layers).length}</span>
          </div>
          <div className="flex flex-col gap-1 px-2">
            {Object.values(layers).map((layer) => (
              <div
                key={layer.id}
                className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors text-sm ${layer.visible ? '' : 'opacity-60'} ${editingLayer?.id === layer.id ? 'bg-[var(--surface-selected)] border-l-2 border-[var(--accent)]' : 'hover:bg-[var(--surface-hover)]'}`}
                onClick={() => {
                  setEditingLayer(layer);
                  setCodeEditorOpen(layer.type === 'shader' || layer.type === 'html');
                }}
              >
                {getLayerIcon(layer.type)}
                <span className="flex-1 truncate">{layer.name}</span>
                <button
                  className="p-1 hover:bg-[var(--hover)] rounded"
                  onClick={e => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                  title={layer.visible ? 'Hide' : 'Show'}
                >
                  {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
                <button
                  className="p-1 hover:bg-[var(--hover)] rounded"
                  onClick={e => { e.stopPropagation(); removeLayer(layer.id); }}
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              className="flex items-center gap-2 px-2 py-1 mt-2 text-xs text-[var(--accent)] hover:bg-[var(--surface-hover)] rounded transition-colors"
              onClick={() => handleAddLayer('media')}
            >
              <Plus className="w-4 h-4" /> Add Layer
            </button>
          </div>
        </div>

        {/* Scenes Section */}
        <div className="border-b border-[var(--border)] pb-2 mb-2">
          <div className="flex items-center justify-between px-4 pt-2 pb-2">
            <span className="font-semibold text-[var(--text)] text-sm">Scenes</span>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--panel-bg)] rounded px-2 py-0.5">{Object.keys(scenes).length}</span>
          </div>
          <div className="flex flex-col gap-1 px-2">
            {Object.values(scenes).map((scene, index) => (
              <div
                key={scene.id}
                className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors text-sm ${scene.id === currentSceneId ? 'bg-[var(--surface-selected)] border-l-2 border-[var(--accent)]' : 'hover:bg-[var(--surface-hover)]'}`}
                onClick={() => setCurrentScene(scene.id)}
              >
                <span className="flex-1 truncate">Scene {index + 1}</span>
                <kbd className="text-[10px] opacity-50">{index + 1}</kbd>
              </div>
            ))}
            <button
              className="flex items-center gap-2 px-2 py-1 mt-2 text-xs text-[var(--accent)] hover:bg-[var(--surface-hover)] rounded transition-colors"
              onClick={() => {/* TODO: Add scene logic */}}
            >
              <Plus className="w-4 h-4" /> Add Scene
            </button>
          </div>
        </div>

        {/* Assets Section */}
        <div className="pb-4">
          <div className="flex items-center justify-between px-4 pt-2 pb-2">
            <span className="font-semibold text-[var(--text)] text-sm">Assets</span>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--panel-bg)] rounded px-2 py-0.5">{Object.keys(assets).length}</span>
          </div>
          <div className="flex flex-col gap-1 px-2">
            {Object.values(assets).map((asset) => (
              <div key={asset.id} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors text-sm hover:bg-[var(--surface-hover)]">
                {asset.type === 'image' ? (
                  <Image className="w-4 h-4" />
                ) : (
                  <Video className="w-4 h-4" />
                )}
                <span className="flex-1 truncate">{asset.name}</span>
                <span className="text-xs text-[var(--text-muted)]">{asset.size ? formatFileSize(asset.size) : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Code Editor Dialog */}
      <CodeEditor
        open={codeEditorOpen}
        onOpenChange={setCodeEditorOpen}
        layerId={editingLayer?.id}
        layerType={editingLayer?.type === 'shader' || editingLayer?.type === 'html' ? editingLayer.type : undefined}
      />
    </>
  );
};

export default Sidebar;