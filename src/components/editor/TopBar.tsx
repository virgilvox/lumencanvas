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
      <header className="topbar flex items-center justify-between h-12 px-6 bg-[var(--bg)] border-b border-[var(--border)] sticky top-0 z-[30] select-none">
        {/* Logo */}
        <div className="font-bold text-lg tracking-tight text-[var(--text)]">LumenCanvas</div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Scene Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-transparent text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] border border-transparent focus:outline-none focus-visible:border-[var(--accent)]"
              onClick={() => setSceneDropdownOpen(!sceneDropdownOpen)}
            >
              <span>{currentScene?.name || 'Scene 1'}</span>
              <ChevronDown className="w-4 h-4 opacity-70" />
            </button>
            {sceneDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 min-w-[120px] bg-[var(--panel-bg)] border border-[var(--border)] rounded shadow-lg z-50">
                {/* TODO: List scenes for selection */}
                <div className="px-4 py-2 text-xs text-[var(--text-muted)]">Scene list here</div>
              </div>
            )}
          </div>

          {/* +Layer */}
          <button className="flex items-center gap-1 px-3 py-1.5 rounded bg-transparent text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] border border-transparent focus:outline-none focus-visible:border-[var(--accent)]">
            <Plus className="w-4 h-4" />
            <span>+ Layer</span>
          </button>

          {/* Mask */}
          <button
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-transparent text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] border border-transparent focus:outline-none focus-visible:border-[var(--accent)]"
            onClick={() => setWebcamMaskingOpen(true)}
          >
            <Camera className="w-4 h-4" />
            <span>Mask</span>
            <kbd className="ml-1 text-[10px] opacity-50">(M)</kbd>
          </button>

          {/* Shader */}
          <button
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-transparent text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] border border-transparent focus:outline-none focus-visible:border-[var(--accent)]"
            onClick={handleNewShaderLayer}
          >
            <Code2 className="w-4 h-4" />
            <span>Shader</span>
            <kbd className="ml-1 text-[10px] opacity-50">(F2)</kbd>
          </button>

          {/* Preview/Projector */}
          <button
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-transparent text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] border border-transparent focus:outline-none focus-visible:border-[var(--accent)]"
            onClick={openProjectorWindow}
          >
            <Monitor className="w-4 h-4" />
            <span>Preview</span>
            <kbd className="ml-1 text-[10px] opacity-50">(P)</kbd>
          </button>

          {/* 60OS and 60 FPS badges */}
          <span className="ml-2 flex items-center gap-1">
            <span className="px-2 py-0.5 rounded-full bg-[var(--panel-bg)] text-xs font-medium text-[var(--text-muted)] border border-[var(--border)]">60OS</span>
            <span className="px-2 py-0.5 rounded-full bg-[var(--panel-bg)] text-xs font-medium text-[var(--text-muted)] border border-[var(--border)]">60 FPS</span>
          </span>
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