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
    if (props.layer.warp?.points && props.layer.warp.points.length === 4) {
        return props.layer.warp.points.flatMap(p => [p.x, p.y]);
    }
    const { x = 0, y = 0, width = 0, height = 0 } = props.layer;
    return [
        x - width / 2, y - height / 2,
        x + width / 2, y - height / 2,
        x + width / 2, y + height / 2,
        x - width / 2, y + height / 2,
    ];
}

function draw(g) {
  const verts = buildVertices();
  g.clear();
  g.beginFill(0xFFFFFF, 0.00001); // Barely visible fill is needed for hit-testing
  g.drawPolygon(verts);
  g.endFill();
}
</script>