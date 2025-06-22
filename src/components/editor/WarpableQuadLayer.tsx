import React, { useCallback, useMemo } from 'react';
import { useProjectionStore, type Surface } from '@/store/projectionStore';
import * as PIXI from 'pixi.js';

interface WarpableQuadLayerProps {
  surface: Surface;
  isSelected: boolean;
}

export const WarpableQuadLayer: React.FC<WarpableQuadLayerProps> = ({ 
  surface, 
  isSelected 
}) => {
  const updateSurface = useProjectionStore(state => state.updateSurface);

  // Convert normalized coordinates to screen coordinates
  const screenWidth = 1920;
  const screenHeight = 1080;
  
  const corners = useMemo(() => {
    return surface.quad.map(point => ({
      x: point.x * screenWidth,
      y: point.y * screenHeight
    }));
  }, [surface.quad, screenWidth, screenHeight]);

  // Draw the quad outline and handles
  const drawQuad = useCallback((g: PIXI.Graphics) => {
    g.clear();
    
    // Draw the quad outline
    g.setStrokeStyle({
      width: 2,
      color: isSelected ? 0x00ff00 : 0x666666,
      alpha: 0.8
    });
    
    // Draw quad lines
    g.moveTo(corners[0].x, corners[0].y);
    g.lineTo(corners[1].x, corners[1].y);
    g.lineTo(corners[2].x, corners[2].y);
    g.lineTo(corners[3].x, corners[3].y);
    g.lineTo(corners[0].x, corners[0].y);
    g.stroke();
    
    // Draw corner handles
    corners.forEach((corner) => {
      // Handle background
      g.setFillStyle({
        color: isSelected ? 0x00ff00 : 0x666666,
        alpha: 0.8
      });
      g.circle(corner.x, corner.y, 8);
      g.fill();
      
      // Handle border
      g.setStrokeStyle({
        width: 2,
        color: 0xffffff,
        alpha: 1
      });
      g.circle(corner.x, corner.y, 8);
      g.stroke();
      
      // Inner dot
      g.setFillStyle({
        color: 0xffffff,
        alpha: 1
      });
      g.circle(corner.x, corner.y, 3);
      g.fill();
    });

    // Draw surface label
    if (surface.name) {
      const centerX = corners.reduce((sum, c) => sum + c.x, 0) / 4;
      const centerY = corners.reduce((sum, c) => sum + c.y, 0) / 4;
      
      // Create text background
      g.setFillStyle({
        color: 0x000000,
        alpha: 0.7
      });
      g.roundRect(centerX - 40, centerY - 10, 80, 20, 4);
      g.fill();
    }
  }, [corners, isSelected, surface.name]);

  // Handle corner dragging
  const handlePointerDown = useCallback((event: PIXI.FederatedPointerEvent) => {
    const globalPos = event.global;
    
    // Find which corner is being dragged
    let draggedCorner = -1;
    const threshold = 15; // Pixels
    
    for (let i = 0; i < corners.length; i++) {
      const distance = Math.sqrt(
        Math.pow(globalPos.x - corners[i].x, 2) + 
        Math.pow(globalPos.y - corners[i].y, 2)
      );
      if (distance < threshold) {
        draggedCorner = i;
        break;
      }
    }
    
    if (draggedCorner === -1) return;
    
    const stage = event.currentTarget.parent;
    if (!stage) return;
    
    const onPointerMove = (moveEvent: PIXI.FederatedPointerEvent) => {
      const newPos = moveEvent.global;
      
      // Convert screen coordinates back to normalized coordinates
      const normalizedX = Math.max(0, Math.min(1, newPos.x / screenWidth));
      const normalizedY = Math.max(0, Math.min(1, newPos.y / screenHeight));
      
      // Update the surface quad
      const newQuad = [...surface.quad];
      newQuad[draggedCorner] = { x: normalizedX, y: normalizedY };
      
      updateSurface(surface.id, { 
        quad: newQuad as [typeof newQuad[0], typeof newQuad[1], typeof newQuad[2], typeof newQuad[3]],
        updatedAt: Date.now()
      });
    };
    
    const onPointerUp = () => {
      stage.off('pointermove', onPointerMove);
      stage.off('pointerup', onPointerUp);
      stage.off('pointerupoutside', onPointerUp);
    };
    
    stage.on('pointermove', onPointerMove);
    stage.on('pointerup', onPointerUp);
    stage.on('pointerupoutside', onPointerUp);
  }, [corners, surface.id, surface.quad, updateSurface, screenWidth, screenHeight]);

  return (
    <pixiGraphics
      draw={drawQuad}
      eventMode="static"
      cursor="pointer"
      onPointerDown={handlePointerDown}
    />
  );
};