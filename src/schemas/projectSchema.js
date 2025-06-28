/**
 * Project schema definition
 * This schema defines the structure of a LumenCanvas project
 */
export const projectSchema = {
  version: "1.0",
  metadata: {
    id: String,
    name: String,
    description: String,
    created: Date,
    modified: Date,
    author: String,
  },
  canvas: {
    width: Number,
    height: Number,
    background: String, // Hex color
    blendMode: String,
  },
  layers: [
    {
      id: Number,
      type: String, // 'image', 'video', 'shader', etc.
      name: String,
      visible: Boolean,
      opacity: Number,
      blendMode: String,
      x: Number,
      y: Number,
      width: Number,
      height: Number,
      scale: { x: Number, y: Number },
      rotation: Number,
      content: Object, // Type-specific content
      properties: Object, // Type-specific properties
      warp: {
        enabled: Boolean,
        points: [{ x: Number, y: Number }],
      },
    }
  ],
  assets: [
    {
      id: String,
      type: String, // 'image', 'video', 'audio', etc.
      name: String,
      url: String, // URL or data URI
      metadata: Object, // Additional metadata
    }
  ],
  history: {
    commands: Array, // Optional: include command history
    currentIndex: Number,
  }
};

/**
 * Validate a project against the schema
 * @param {Object} project - Project to validate
 * @returns {Object} Validation result { valid: boolean, errors: Array }
 */
export function validateProject(project) {
  const errors = [];
  
  // Check version
  if (!project.version) {
    errors.push('Missing project version');
  }
  
  // Check metadata
  if (!project.metadata || !project.metadata.id) {
    errors.push('Missing project ID');
  }
  
  // Check canvas
  if (!project.canvas || !project.canvas.width || !project.canvas.height) {
    errors.push('Invalid canvas dimensions');
  }
  
  // Check layers
  if (!Array.isArray(project.layers)) {
    errors.push('Layers must be an array');
  } else {
    project.layers.forEach((layer, index) => {
      if (!layer.id || !layer.type) {
        errors.push(`Layer at index ${index} is missing required properties`);
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create a new empty project with default values
 * @param {Object} options - Project options
 * @returns {Object} New project
 */
export function createEmptyProject(options = {}) {
  const id = options.id || `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  return {
    version: "1.0",
    metadata: {
      id,
      name: options.name || 'Untitled Project',
      description: options.description || '',
      created: now,
      modified: now,
      author: options.author || '',
    },
    canvas: {
      width: options.width || 800,
      height: options.height || 600,
      background: options.background || '#000000',
      blendMode: options.blendMode || 'normal',
    },
    layers: [],
    assets: [],
    history: {
      commands: [],
      currentIndex: -1,
    }
  };
} 