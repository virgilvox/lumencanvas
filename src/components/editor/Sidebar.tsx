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
  const [activeSection, setActiveSection] = React.useState<'layers' | 'scenes' | 'assets'>('layers');
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
      <aside className="sidebar">
        {/* Section Tabs */}
        <div className="flex border-b border-[var(--border)]">
          <button
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeSection === 'layers' 
                ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' 
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
            onClick={() => setActiveSection('layers')}
          >
            Layers
          </button>
          <button
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeSection === 'scenes' 
                ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' 
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
            onClick={() => setActiveSection('scenes')}
          >
            Scenes
          </button>
          <button
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeSection === 'assets' 
                ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]' 
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
            onClick={() => setActiveSection('assets')}
          >
            Assets
          </button>
        </div>

        {/* Section Content */}
        <div className="sidebar-content">
          {/* Layers Section */}
          {activeSection === 'layers' && (
            <div>
              <div className="sidebar-header">
                <span>Layers</span>
                <div className="relative group">
                  <button className="p-1 hover:bg-[var(--hover)] rounded">
                    <Plus className="w-4 h-4" />
                  </button>
                  <div className="absolute right-0 top-full mt-1 bg-[var(--panel-bg)] border border-[var(--border)] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <button
                      className="block w-full px-3 py-2 text-sm text-left hover:bg-[var(--hover)]"
                      onClick={() => handleAddLayer('media')}
                    >
                      <Image className="w-4 h-4 inline mr-2" />
                      Media
                    </button>
                    <button
                      className="block w-full px-3 py-2 text-sm text-left hover:bg-[var(--hover)]"
                      onClick={() => handleAddLayer('shader')}
                    >
                      <Code className="w-4 h-4 inline mr-2" />
                      Shader
                    </button>
                    <button
                      className="block w-full px-3 py-2 text-sm text-left hover:bg-[var(--hover)]"
                      onClick={() => handleAddLayer('html')}
                    >
                      <FileText className="w-4 h-4 inline mr-2" />
                      HTML
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                {Object.values(layers).map((layer) => (
                  <div
                    key={layer.id}
                    className="sidebar-item group"
                  >
                    {getLayerIcon(layer.type)}
                    <span className="flex-1 truncate">{layer.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1 hover:bg-[var(--hover)] rounded"
                        onClick={() => updateLayer(layer.id, { visible: !layer.visible })}
                      >
                        {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>
                      {(layer.type === 'shader' || layer.type === 'html') && (
                        <button
                          className="p-1 hover:bg-[var(--hover)] rounded"
                          onClick={() => {
                            setEditingLayer(layer);
                            setCodeEditorOpen(true);
                          }}
                        >
                          <Code className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        className="p-1 hover:bg-[var(--hover)] rounded"
                        onClick={() => removeLayer(layer.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scenes Section */}
          {activeSection === 'scenes' && (
            <div>
              <div className="sidebar-header">
                <span>Scenes</span>
                <button className="p-1 hover:bg-[var(--hover)] rounded">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-1">
                {Object.values(scenes).map((scene, index) => (
                  <div
                    key={scene.id}
                    className={`sidebar-item ${scene.id === currentSceneId ? 'selected' : ''}`}
                    onClick={() => setCurrentScene(scene.id)}
                  >
                    <span>Scene {index + 1}</span>
                    <kbd className="text-[10px] opacity-50">{index + 1}</kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assets Section */}
          {activeSection === 'assets' && (
            <div>
              <div className="sidebar-header">
                <span>Assets</span>
                <span className="text-[var(--text-muted)] text-xs">
                  {Object.keys(assets).length} files
                </span>
              </div>
              
              <div className="space-y-1">
                {Object.values(assets).map((asset) => (
                  <div key={asset.id} className="asset-item">
                    {asset.type === 'image' ? (
                      <Image className="asset-icon" />
                    ) : (
                      <Video className="asset-icon" />
                    )}
                    <span className="asset-name">{asset.name}</span>
                    <span className="asset-size">
                      {asset.size ? formatFileSize(asset.size) : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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