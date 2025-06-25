<template>
  <component
    :is="layerComponent"
    v-if="layer.visible && layerComponent"
    :layer="layerWithSelection"
    :canvas-size="canvasSize"
    @request-edit="$emit('requestEdit', layer)"
    @pointerdown="$emit('pointerdown', $event)"
  />
</template>

<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useLayersStore } from '../../store/layers';
import ImageLayer from './ImageLayer.vue';
import VideoLayer from './VideoLayer.vue';
import ShaderLayer from './ShaderLayer.vue';
import HtmlLayer from './HtmlLayer.vue';
import UrlLayer from './UrlLayer.vue';
import * as PIXI from 'pixi.js';

const props = defineProps({
  layer: {
    type: Object,
    required: true
  },
  canvasSize: {
    type: Object,
    default: () => ({ width: 800, height: 600 })
  }
});

const emit = defineEmits(['requestEdit', 'pointerdown']);

const layersStore = useLayersStore();
const { selectedLayerId } = storeToRefs(layersStore);
const { LayerTypes } = layersStore;

// Add selection state to layer
const layerWithSelection = computed(() => ({
  ...props.layer,
  selected: props.layer.id === selectedLayerId.value
}));

// Map layer types to components
const layerComponent = computed(() => {
  const components = {
    [LayerTypes.IMAGE]: ImageLayer,
    [LayerTypes.VIDEO]: VideoLayer,
    [LayerTypes.SHADER]: ShaderLayer,
    [LayerTypes.HTML]: HtmlLayer,
    [LayerTypes.URL]: UrlLayer,
  };
  
  return components[props.layer.type] || null;
});

const BlendModeMap = {
  normal: PIXI.BLEND_MODES.NORMAL,
  add: PIXI.BLEND_MODES.ADD,
  screen: PIXI.BLEND_MODES.SCREEN,
  multiply: PIXI.BLEND_MODES.MULTIPLY,
};
</script>