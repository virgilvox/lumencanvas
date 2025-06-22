import React from 'react';
import { Plus, Camera, Code2, Monitor, ChevronDown } from 'lucide-react';
import { useCurrentScene } from '@/store/projectionStore';
import { WebcamMasking } from '@/components/editor/WebcamMasking';

const TopBar: React.FC = () => {
  const currentScene = useCurrentScene();
  const [webcamMaskingOpen, setWebcamMaskingOpen] = React.useState(false);
  const [sceneDropdownOpen, setSceneDropdownOpen] = React.useState(false);
  
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

  const handleNewShaderLayer = () => {
    // TODO: Open shader editor for new layer
    console.log('New shader layer');
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar-logo">LumenCanvas</div>
        
        <div className="topbar-actions">
          {/* Scene Selector */}
          <div className="relative">
            <button 
              className="topbar-button"
              onClick={() => setSceneDropdownOpen(!sceneDropdownOpen)}
            >
              <span>{currentScene?.name || 'Scene 1'}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {sceneDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-[var(--panel-bg)] border border-[var(--border)] rounded shadow-lg">
                {/* Scene dropdown content */}
              </div>
            )}
          </div>

          {/* Add Layer */}
          <button className="topbar-button">
            <Plus className="w-4 h-4" />
            <span>Layer</span>
          </button>

          {/* Auto-Mask */}
          <button 
            className="topbar-button"
            onClick={() => setWebcamMaskingOpen(true)}
          >
            <Camera className="w-4 h-4" />
            <span>Mask</span>
            <kbd className="ml-1 text-[10px] opacity-50">(M)</kbd>
          </button>

          {/* Shader */}
          <button 
            className="topbar-button"
            onClick={handleNewShaderLayer}
          >
            <Code2 className="w-4 h-4" />
            <span>Shader</span>
            <kbd className="ml-1 text-[10px] opacity-50">(F2)</kbd>
          </button>

          {/* Separator */}
          <div className="w-px h-6 bg-[var(--border)]" />

          {/* Preview/Projector */}
          <button 
            className="topbar-button"
            onClick={openProjectorWindow}
          >
            <Monitor className="w-4 h-4" />
            <span>Preview</span>
            <kbd className="ml-1 text-[10px] opacity-50">(P)</kbd>
          </button>
        </div>
      </header>

      {/* Webcam Masking Dialog */}
      <WebcamMasking 
        open={webcamMaskingOpen} 
        onOpenChange={setWebcamMaskingOpen} 
      />
    </>
  );
};

export default TopBar;