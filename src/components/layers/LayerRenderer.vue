<template>
  <component
    :is="layerComponent"
    v-if="layer.visible && layerComponent"
    :layer="layer"
    :blendMode="getBlendMode(layer.blendMode)"
    @request-edit="$emit('requestEdit', layer)"
    @pointerdown="$emit('pointerdown', $event)"
  />
</template>

<script setup>
import { computed } from 'vue';
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
  }
});

defineEmits(['requestEdit', 'pointerdown']);

const layersStore = useLayersStore();
const { LayerTypes } = layersStore;

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

function getBlendMode(mode) {
  const modes = {
    normal: PIXI.BLEND_MODES.NORMAL,
    add: PIXI.BLEND_MODES.ADD,
    screen: PIXI.BLEND_MODES.SCREEN,
    multiply: PIXI.BLEND_MODES.MULTIPLY,
  };
  return modes[mode] ?? PIXI.BLEND_MODES.NORMAL;
}
</script>