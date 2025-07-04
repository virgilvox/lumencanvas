<template>
  <component
    :is="layerComponent"
    v-if="layer.visible && layerComponent"
    :key="layerKey"
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
  },
  isEditMode: {
    type: Boolean,
    default: false,
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

const layerKey = computed(() => {
  if (props.layer.type === LayerTypes.VIDEO && !props.isEditMode) {
    // For video layers in the projector view, change the key only when a full
    // re-render is actually required (e.g. the source or size changes). Avoid
    // including position (x & y) so that simply moving the layer does **not**
    // destroy and recreate the component, which caused videos to disappear.
    return `${props.layer.id}-${props.layer.content.src}-${props.layer.width}-${props.layer.height}`;
  }
  
  if (props.layer.type === LayerTypes.URL && !props.isEditMode) {
    // For URL layers in the projector view, also avoid recreating iframes when just moving
    // This prevents MutationObserver errors from browser extensions
    return `${props.layer.id}-${props.layer.content.url}-${props.layer.width}-${props.layer.height}`;
  }
  
  // For other layers, or in edit mode, just the ID is sufficient.
  return props.layer.id;
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