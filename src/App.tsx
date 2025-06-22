// import React from 'react'; // Not needed with new JSX transform
import { Routes, Route, Navigate } from 'react-router-dom';
import EditorLayout from './layouts/EditorLayout';
import ProjectorLayout from './layouts/ProjectorLayout';
import './App.css';

function App() {
  return (
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
  );
}

export default App;
