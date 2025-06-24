<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click="handleOverlayClick">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <h3>{{ title }}</h3>
            <div class="header-actions">
              <button @click="formatCode" class="action-btn" title="Format Code">
                <AlignLeft :size="16" />
              </button>
              <button @click="close" class="action-btn close-btn" title="Close (Esc)">
                <X :size="16" />
              </button>
            </div>
          </div>
          
          <div class="editor-container">
            <VueMonacoEditor
              v-model:value="code"
              :language="language"
              theme="vs-dark"
              :options="editorOptions"
              @mount="handleMount"
            />
          </div>
          
          <div class="modal-footer">
            <div class="status">
              {{ language === 'glsl' ? 'GLSL Fragment Shader' : 'HTML' }}
              <span v-if="hasChanges" class="unsaved">• Unsaved changes</span>
            </div>
            <div class="actions">
              <button @click="revert" class="btn btn-secondary" :disabled="!hasChanges">
                Revert
              </button>
              <button @click="apply" class="btn btn-primary">
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';
import { X, AlignLeft } from 'lucide-vue-next';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  layer: {
    type: Object,
    default: null
  },
  initialCode: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'glsl'
  }
});

const emit = defineEmits(['update:modelValue', 'apply']);

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const code = ref('');
const originalCode = ref('');
const editorInstance = ref(null);

const title = computed(() => {
  if (!props.layer) return 'Code Editor';
  return `Edit ${props.layer.name}`;
});

const hasChanges = computed(() => code.value !== originalCode.value);

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  fontFamily: 'Fira Code, monospace',
  fontLigatures: true,
  lineNumbers: 'on',
  renderWhitespace: 'selection',
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  wordWrap: 'on',
  glyphMargin: true,
  folding: true,
  lineDecorationsWidth: 5,
  lineNumbersMinChars: 3,
  renderLineHighlight: 'all',
  scrollbar: {
    vertical: 'visible',
    horizontal: 'visible',
    useShadows: false,
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10
  }
};

// Initialize code when opening
watch(isOpen, async (newVal) => {
  if (newVal) {
    code.value = props.initialCode;
    originalCode.value = props.initialCode;
    
    // Focus editor after opening
    await nextTick();
    if (editorInstance.value) {
      editorInstance.value.focus();
    }
    
    // Add keyboard listener
    document.addEventListener('keydown', handleKeyDown);
  } else {
    // Remove keyboard listener
    document.removeEventListener('keydown', handleKeyDown);
  }
});

function handleMount(editor) {
  editorInstance.value = editor;
  
  // Register GLSL language if needed
  if (props.language === 'glsl') {
    // Basic GLSL syntax highlighting
    monaco.languages.register({ id: 'glsl' });
    monaco.languages.setMonarchTokensProvider('glsl', {
      tokenizer: {
        root: [
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          [/\b(void|float|vec2|vec3|vec4|mat2|mat3|mat4|sampler2D|bool|int)\b/, 'type'],
          [/\b(if|else|for|while|return|break|continue)\b/, 'keyword'],
          [/\b(uniform|varying|attribute|const|in|out|inout)\b/, 'keyword'],
          [/\b(gl_FragCoord|gl_FragColor)\b/, 'variable.predefined'],
          [/[0-9]+\.?[0-9]*/, 'number'],
          [/\b(sin|cos|tan|asin|acos|atan|pow|exp|log|sqrt|abs|sign|floor|ceil|fract|mod|min|max|clamp|mix|step|smoothstep|length|distance|dot|cross|normalize|reflect|refract)\b/, 'function'],
        ],
        comment: [
          [/[^\/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ]
      }
    });
  }
}

function handleKeyDown(e) {
  // Escape to close
  if (e.key === 'Escape') {
    close();
  }
  // Ctrl/Cmd + Enter to apply
  else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    apply();
  }
  // Ctrl/Cmd + S to apply
  else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    apply();
  }
}

function handleOverlayClick(e) {
  if (e.target === e.currentTarget) {
    close();
  }
}

function formatCode() {
  if (editorInstance.value) {
    editorInstance.value.getAction('editor.action.formatDocument').run();
  }
}

function revert() {
  code.value = originalCode.value;
}

function apply() {
  emit('apply', code.value);
  originalCode.value = code.value;
  close();
}

function close() {
  if (hasChanges.value) {
    const confirm = window.confirm('You have unsaved changes. Are you sure you want to close?');
    if (!confirm) return;
  }
  isOpen.value = false;
}
</script>

<style scoped>
/* Modal overlay and animation */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  width: 90%;
  max-width: 900px;
  height: 80vh;
  background-color: #1e1e1e;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #333;
  background-color: #252525;
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
  color: #E0E0E0;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: #333;
  color: #E0E0E0;
}

.close-btn:hover {
  background-color: #ff4444;
  color: white;
}

/* Editor */
.editor-container {
  flex: 1;
  overflow: hidden;
}

/* Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-top: 1px solid #333;
  background-color: #252525;
}

.status {
  font-size: 13px;
  color: #888;
}

.unsaved {
  color: #ffa500;
  margin-left: 8px;
}

.actions {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #333;
  color: #E0E0E0;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #444;
}

.btn-primary {
  background-color: #12B0FF;
  color: #000;
}

.btn-primary:hover {
  background-color: #4acbff;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
}
</style>