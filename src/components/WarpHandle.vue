<template>
  <container
    :x="x"
    :y="y"
  >
    <graphics
      @render="draw"
      @pointerdown="onDragStart"
      @pointerup="onDragEnd"
      @pointerupoutside="onDragEnd"
      @pointermove="onDragMove"
      event-mode="static"
      :cursor="isDragging ? 'grabbing' : 'grab'"
    />
  </container>
</template>

<script setup>
import { ref } from 'vue';
import * as PIXI from 'pixi.js';

const props = defineProps({
  id: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
});

const emit = defineEmits(['update:position']);

const isDragging = ref(false);
const dragData = ref({ parent: null, offsetX: 0, offsetY: 0 });
let stage = null;

const onDragStart = (event) => {
  event.stopPropagation();
  isDragging.value = true;
  const parent = event.currentTarget.parent.parent;
  stage = event.currentTarget.stage;
  
  const clickPos = event.data.getLocalPosition(parent);
  
  dragData.value = {
    parent: parent,
    offsetX: clickPos.x - props.x,
    offsetY: clickPos.y - props.y,
  };

  if (stage) {
    stage.on('pointermove', onDragMove);
    stage.on('pointerup', onDragEnd);
    stage.on('pointerupoutside', onDragEnd);
  }
};

const onDragEnd = () => {
  if (!isDragging.value) return;
  isDragging.value = false;
  if (stage) {
    stage.off('pointermove', onDragMove);
    stage.off('pointerup', onDragEnd);
    stage.off('pointerupoutside', onDragEnd);
  }
  dragData.value.parent = null;
  stage = null;
};

const onDragMove = (event) => {
  if (!isDragging.value || !dragData.value.parent) return;
  
  const newPos = event.data.getLocalPosition(dragData.value.parent);
  
  emit('update:position', {
    x: newPos.x - dragData.value.offsetX,
    y: newPos.y - dragData.value.offsetY,
  });
};

const draw = (g) => {
  g.clear();
  g.beginFill(0xFF0000, 1);
  g.lineStyle(2, 0xFFFFFF, 1);
  g.drawCircle(0, 0, 12);
  g.endFill();
  g.hitArea = new PIXI.Circle(0, 0, 20);
};
</script> 