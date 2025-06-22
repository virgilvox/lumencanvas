/** @jsxImportSource @pixi/react */
import React, { useCallback, useMemo } from 'react';
import { useProjectionStore, type Surface } from '@/store/projectionStore';
import * as PIXI from 'pixi.js';
import { Graphics } from 'pixi.js';
import { useExtend } from '@pixi/react';

interface WarpableQuadLayerProps {
  surface: Surface;
  isSelected: boolean;
}

useExtend({ Graphics });

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
    g.lineStyle(2, isSelected ? 0x00ff00 : 0x666666, 0.8);
    g.moveTo(corners[0].x, corners[0].y);
    g.lineTo(corners[1].x, corners[1].y);
    g.lineTo(corners[2].x, corners[2].y);
    g.lineTo(corners[3].x, corners[3].y);
    g.lineTo(corners[0].x, corners[0].y);
    g.stroke();

    // Draw corner handles
    corners.forEach((corner) => {
      // Handle background
      g.beginFill(isSelected ? 0x12B0FF : 0x666666, 0.9);
      g.drawRect(corner.x - 4, corner.y - 4, 8, 8);
      g.endFill();
      // Handle border
      g.lineStyle(2, 0xffffff, 1);
      g.drawRect(corner.x - 4, corner.y - 4, 8, 8);
      // Inner dot
      g.beginFill(0xffffff, 1);
      g.drawCircle(corner.x, corner.y, 2.5);
      g.endFill();
    });

    // Draw surface label
    if (surface.name) {
      const centerX = corners.reduce((sum, c) => sum + c.x, 0) / 4;
      const centerY = corners.reduce((sum, c) => sum + c.y, 0) / 4;
      // Create text background
      g.beginFill(0x000000, 0.7);
      g.drawRoundedRect(centerX - 40, centerY - 10, 80, 20, 4);
      g.endFill();
      // Note: Text rendering should be handled by a separate Pixi.Text if needed
    }
  }, [corners, isSelected, surface.name]);

  // Handle corner dragging
  const handlePointerDown = useCallback((event: PIXI.FederatedPointerEvent) => {
    const globalPos = event.global;
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
      const normalizedX = Math.max(0, Math.min(1, newPos.x / screenWidth));
      const normalizedY = Math.max(0, Math.min(1, newPos.y / screenHeight));
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
    <graphics
      draw={drawQuad}
      eventMode={"static"}
      cursor="pointer"
      pointerdown={handlePointerDown}
    />
  );
};