<template>
  <component
    :is="layerComponent"
    v-if="layer.visible && layerComponent"
    :layer="layerWithSelection"
    :canvas-size="canvasSize"
    @request-edit="$emit('requestEdit', layer)"
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

const emit = defineEmits(['requestEdit']);

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
</script>