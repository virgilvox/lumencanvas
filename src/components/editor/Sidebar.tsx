import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
// import { Separator } from '@/components/ui/separator'; // Unused for now
import { Button } from '@/components/ui/button';
import { 
  Eye, 
  EyeOff, 
  Layers, 
  Monitor, 
  Image, 
  Upload,
  Plus 
} from 'lucide-react';
import { useProjectionStore } from '@/store/projectionStore';
import { FileDropZone } from './FileDropZone';

const Sidebar: React.FC = () => {
  const scenes = useProjectionStore(state => state.scenes);
  const surfaces = useProjectionStore(state => state.surfaces);
  const layers = useProjectionStore(state => state.layers);

  return (
    <aside className="w-80 bg-card border-r border-border">
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          
          {/* Scenes Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4" />
                  <span>Scenes</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {Object.keys(scenes).length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {Object.values(scenes).map(scene => (
                  <div 
                    key={scene.id} 
                    className="flex items-center justify-between p-2 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{scene.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {scene.layerIds.length} layers
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs ml-2">
                      {scene.crossfadeDurationMs}ms
                    </Badge>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Scene
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Surfaces Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Monitor className="w-4 h-4" />
                  <span>Surfaces</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {Object.keys(surfaces).length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {Object.values(surfaces).map(surface => (
                  <div 
                    key={surface.id} 
                    className="flex items-center justify-between p-2 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{surface.name}</p>
                      <p className="text-xs text-muted-foreground">Quad surface</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {surface.visible ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                ))}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => {
                    const id = `surface-${Date.now()}`;
                    useProjectionStore.getState().addSurface({
                      id,
                      name: `Surface ${Object.keys(surfaces).length + 1}`,
                      quad: [
                        { x: 0.2, y: 0.2 }, // Top-left
                        { x: 0.8, y: 0.2 }, // Top-right
                        { x: 0.8, y: 0.8 }, // Bottom-right
                        { x: 0.2, y: 0.8 }, // Bottom-left
                      ],
                      visible: true,
                    });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Surface
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Layers Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Image className="w-4 h-4" />
                  <span>Layers</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {Object.keys(layers).length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {Object.values(layers)
                  .sort((a, b) => b.zIndex - a.zIndex)
                  .map(layer => (
                  <div 
                    key={layer.id} 
                    className="flex items-center justify-between p-2 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{layer.name}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {layer.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          z:{layer.zIndex}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {layer.visible ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Layer
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Assets Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Assets</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <FileDropZone />
            </CardContent>
          </Card>

        </div>
      </ScrollArea>
    </aside>
  );
};

export default Sidebar;