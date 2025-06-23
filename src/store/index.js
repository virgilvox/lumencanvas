import { defineStore } from 'pinia';

export const useAppStore = defineStore('app', {
  state: () => ({
    activeTool: 'select', // Default tool
  }),
  actions: {
    setActiveTool(tool) {
      this.activeTool = tool;
    },
  },
}); 