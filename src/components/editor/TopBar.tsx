import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Play, Settings, Save, Download, Camera, Monitor } from 'lucide-react';
import { useProjectionStore, useCurrentScene } from '@/store/projectionStore';
import { WebcamMasking } from '@/components/editor/WebcamMasking';
import { useBroadcastSync } from '@/hooks/useBroadcastSync';

const TopBar: React.FC = () => {
  const surfaces = useProjectionStore(state => state.surfaces);
  const layers = useProjectionStore(state => state.layers);
  const currentScene = useCurrentScene();
  const [webcamMaskingOpen, setWebcamMaskingOpen] = React.useState(false);
  
  // Initialize broadcast sync
  const { status: broadcastStatus } = useBroadcastSync();
  
  const openProjectorWindow = () => {
    // Open a new window with the projector view
    const projectorWindow = window.open(
      '/projector/local',
      'LumenCanvas Projector',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );
    
    if (projectorWindow) {
      // Focus the projector window
      projectorWindow.focus();
    }
  };

  return (
    <>
      <header className="flex items-center justify-between px-6 py-3 bg-card border-b border-border">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-foreground">LumenCanvas</h1>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              {currentScene?.name || 'No Scene'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {Object.keys(surfaces).length} Surfaces
            </Badge>
            <Badge variant="outline" className="text-xs">
              {Object.keys(layers).length} Layers
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setWebcamMaskingOpen(true)}
          >
            <Camera className="w-4 h-4 mr-2" />
            Auto-Mask
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button 
            variant="default" 
            size="sm"
            onClick={openProjectorWindow}
            title={`BroadcastChannel: ${broadcastStatus}`}
          >
            <Monitor className="w-4 h-4 mr-2" />
            Projector
          </Button>
          <Button variant="default" size="sm">
            <Play className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <WebcamMasking 
        open={webcamMaskingOpen}
        onOpenChange={setWebcamMaskingOpen}
      />
    </>
  );
};

export default TopBar;