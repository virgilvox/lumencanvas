import React from 'react';
import TopBar from '@/components/editor/TopBar';
import Sidebar from '@/components/editor/Sidebar';
import Canvas from '@/components/editor/Canvas';
import { useYjsSync } from '@/hooks/useYjsSync';

const EditorLayout: React.FC = () => {
  // Initialize Yjs sync for persistence and real-time collaboration
  useYjsSync();

  return (
    <>
      <TopBar />
      <div className="main-layout">
        <Sidebar />
        <Canvas />
      </div>
    </>
  );
};

export default EditorLayout; 