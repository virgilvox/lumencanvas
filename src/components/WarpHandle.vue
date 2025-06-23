<template>
  <Graphics
    :x="x"
    :y="y"
    :draw="draw"
    @pointerdown="onDragStart"
    @pointerup="onDragEnd"
    @pointerupoutside="onDragEnd"
    @pointermove="onDragMove"
    event-mode="static"
    :cursor="isDragging ? 'grabbing' : 'grab'"
  />
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  id: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
});

const emit = defineEmits(['update:position']);

const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

const onDragStart = (event) => {
  isDragging.value = true;
  const localPos = event.data.getLocalPosition(event.currentTarget.parent);
  dragOffset.value = {
    x: props.x - localPos.x,
    y: props.y - localPos.y,
  };
};

const onDragEnd = () => {
  isDragging.value = false;
};

const onDragMove = (event) => {
  if (isDragging.value) {
    const newPos = event.data.getLocalPosition(event.currentTarget.parent);
    emit('update:position', {
      x: newPos.x + dragOffset.value.x,
      y: newPos.y + dragOffset.value.y,
    });
  }
};

const draw = (g) => {
  g.clear();
  g.beginFill(0xffffff); // White handles
  g.lineStyle(1.5, 0x12B0FF, 1); // Accent color outline
  g.drawRect(-4, -4, 8, 8); // 8px square handle, centered on x/y
  g.endFill();
};
</script> 