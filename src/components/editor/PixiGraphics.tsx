import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

interface PixiGraphicsProps {
  app: PIXI.Application;
  draw: (g: PIXI.Graphics) => void;
  interactive?: boolean;
  pointerdown?: (e: PIXI.FederatedPointerEvent) => void;
  cursor?: string;
}

export const PixiGraphics: React.FC<PixiGraphicsProps> = ({
  app,
  draw,
  interactive,
  pointerdown,
  cursor,
}) => {
  const ref = useRef<PIXI.Graphics | null>(null);

  useEffect(() => {
    if (!ref.current) {
      ref.current = new PIXI.Graphics();
      app.stage.addChild(ref.current);
    }
    const g = ref.current;
    draw(g!);
    if (interactive) {
      g!.eventMode = 'static';
      g!.interactive = true;
      g!.cursor = cursor || 'pointer';
      if (pointerdown) g!.on('pointerdown', pointerdown);
    }
    return () => {
      if (g && g.parent) g.parent.removeChild(g);
      if (pointerdown) g!.off('pointerdown', pointerdown);
    };
  }, [app, draw, interactive, pointerdown, cursor]);

  return null; // This is a Pixi display object, not a React DOM node
}; 