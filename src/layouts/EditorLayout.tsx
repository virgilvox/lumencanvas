import React from 'react';
import TopBar from '@/components/editor/TopBar';
import Sidebar from '@/components/editor/Sidebar';
import Canvas from '@/components/editor/Canvas';
import { useYjsSync } from '@/hooks/useYjsSync';

const EditorLayout: React.FC = () => {
  // Initialize Yjs sync for persistence and real-time collaboration
  useYjsSync();

  return (
    <div className="editor-root flex flex-col h-screen w-screen overflow-hidden">
      <TopBar />
      <div className="flex flex-row flex-1 min-h-0 min-w-0">
        <Sidebar />
        <div className="flex-1 min-w-0 min-h-0 relative">
          <Canvas />
        </div>
      </div>
    </div>
  );
};

export default EditorLayout; 