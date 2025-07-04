<template>
  <!-- The URL layer is now a transparent placeholder for interaction. 
       The actual rendering is handled by WarpedIframe.vue in the DOM. 
       This component provides the interactive handles and selection outline. -->
  <graphics
    @render="draw"
    event-mode="static"
    @pointerdown="$emit('pointerdown', $event)"
  />
</template>

<script setup>
import { watch } from 'vue';

const props = defineProps({
  layer: { type: Object, required: true },
});

defineEmits(['pointerdown']);

function buildVertices() {
  if (props.layer.warp?.points && props.layer.warp.points.length === 4 && props.layer.warp.enabled) {
    return props.layer.warp.points.flatMap(p => [p.x, p.y]);
  }
  
  const { x = 0, y = 0, width = 0, height = 0, scale = {x: 1, y: 1}, rotation = 0 } = props.layer;
  const w = width * (scale?.x || 1);
  const h = height * (scale?.y || 1);

  const corners = [
      { x: -w / 2, y: -h / 2 }, { x:  w / 2, y: -h / 2 },
      { x:  w / 2, y:  h / 2 }, { x: -w / 2, y:  h / 2 }
  ];

  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  return corners.flatMap(p => {
      const rotatedX = p.x * cos - p.y * sin;
      const rotatedY = p.x * sin + p.y * cos;
      return [rotatedX + x, rotatedY + y];
  });
}

function draw(g) {
  const verts = buildVertices();
  g.clear();
  g.beginFill(0xFFFFFF, 0.00001); // Barely visible fill is needed for hit-testing
  g.drawPolygon(verts);
  g.endFill();
}
</script>