import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useHistoryStore = defineStore('history', () => {
  // State
  const commands = ref([]);
  const currentIndex = ref(-1);
  const maxHistory = ref(50); // Limit history size to prevent memory issues
  
  // Getters
  const canUndo = computed(() => currentIndex.value >= 0);
  const canRedo = computed(() => currentIndex.value < commands.value.length - 1);
  
  // Actions
  function pushCommand(command) {
    // If we're not at the end of the stack, remove all commands after current index
    if (currentIndex.value < commands.value.length - 1) {
      commands.value.splice(currentIndex.value + 1);
    }
    
    // Add the new command
    commands.value.push(command);
    
    // Trim history if it exceeds max size
    if (commands.value.length > maxHistory.value) {
      commands.value.shift();
    }
    
    // Update current index
    currentIndex.value = commands.value.length - 1;
  }
  
  function undo() {
    if (!canUndo.value) return false;
    
    const command = commands.value[currentIndex.value];
    if (command && typeof command.undo === 'function') {
      command.undo();
      currentIndex.value--;
      return true;
    }
    
    return false;
  }
  
  function redo() {
    if (!canRedo.value) return false;
    
    currentIndex.value++;
    const command = commands.value[currentIndex.value];
    if (command && typeof command.execute === 'function') {
      command.execute();
      return true;
    }
    
    return false;
  }
  
  function clear() {
    commands.value = [];
    currentIndex.value = -1;
  }
  
  // Return the store
  return {
    // State
    commands,
    currentIndex,
    maxHistory,
    
    // Getters
    canUndo,
    canRedo,
    
    // Actions
    pushCommand,
    undo,
    redo,
    clear
  };
}); 