import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import EditorLayout from './layouts/EditorLayout';
import ProjectorLayout from './layouts/ProjectorLayout';

function App() {
  return (
    <div className="app-container">
      <Routes>
        {/* Redirect root to editor */}
        <Route path="/" element={<Navigate to="/edit" replace />} />
        
        {/* Editor route */}
        <Route path="/edit" element={<EditorLayout />} />
        
        {/* Projector route with dynamic ID */}
        <Route path="/projector/:id" element={<ProjectorLayout />} />
        
        {/* Catch-all route - redirect to editor */}
        <Route path="*" element={<Navigate to="/edit" replace />} />
      </Routes>
    </div>
  );
}

export default App;
