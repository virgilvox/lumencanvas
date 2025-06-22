import React from 'react';
import { useParams } from 'react-router-dom';

const ProjectorLayout: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="projector-layout">
      <div className="projector-fullscreen">
        <div className="projector-canvas">
          {/* Full-screen projection canvas will go here */}
          <div className="projection-placeholder">
            <h2>Projection View</h2>
            <p>Project ID: {id}</p>
            <p>Full-screen projection canvas will be implemented here</p>
            <small>Press F11 for fullscreen, ESC to exit</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectorLayout; 