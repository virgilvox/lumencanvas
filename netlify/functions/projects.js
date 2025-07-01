/**
 * Netlify function for handling project operations
 */

// Helper function to format response
function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // For CORS
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

// Mock database for demo purposes
// In a real app, this would be replaced with a proper database
const mockProjects = {
  projects: {},
  
  // Get all projects
  getAll() {
    return Object.values(this.projects);
  },
  
  // Get project by ID
  getById(id) {
    return this.projects[id] || null;
  },
  
  // Create a new project
  create(projectData) {
    const id = projectData.id || `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Ensure project has required fields
    const project = {
      id,
      metadata: {
        id,
        name: projectData.metadata?.name || projectData.name || 'Untitled Project',
        description: projectData.metadata?.description || projectData.description || '',
        created: projectData.metadata?.created || new Date().toISOString(),
        modified: new Date().toISOString()
      },
      canvas: projectData.canvas || {
        width: 800,
        height: 600,
        background: '#000000',
        blendMode: 'normal'
      },
      layers: projectData.layers || [],
      ...projectData
    };
    
    this.projects[id] = project;
    return project;
  },
  
  // Update a project
  update(id, projectData) {
    if (!this.projects[id]) return null;
    
    // Update project
    this.projects[id] = {
      ...this.projects[id],
      ...projectData,
      metadata: {
        ...this.projects[id].metadata,
        ...projectData.metadata,
        modified: new Date().toISOString()
      }
    };
    
    return this.projects[id];
  },
  
  // Delete a project
  delete(id) {
    if (!this.projects[id]) return false;
    delete this.projects[id];
    return true;
  }
};

// Handle HTTP methods
export default async function(event, context) {
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return formatResponse(200, {});
  }
  
  // Get project ID from path if present
  const path = event.path.replace('/.netlify/functions/projects', '');
  const segments = path.split('/').filter(Boolean);
  const id = segments[0];
  
  try {
    // Handle different HTTP methods
    switch (event.httpMethod) {
      case 'GET':
        // Get all projects
        if (!id) {
          return formatResponse(200, mockProjects.getAll());
        }
        
        // Get project by ID
        const project = mockProjects.getById(id);
        if (!project) {
          return formatResponse(404, { error: 'Project not found' });
        }
        
        return formatResponse(200, project);
      
      case 'POST':
        // Create a new project
        const projectData = JSON.parse(event.body);
        const newProject = mockProjects.create(projectData);
        
        return formatResponse(201, newProject);
      
      case 'PUT':
        // Update a project
        if (!id) {
          return formatResponse(400, { error: 'Project ID is required' });
        }
        
        const updateData = JSON.parse(event.body);
        const updatedProject = mockProjects.update(id, updateData);
        
        if (!updatedProject) {
          return formatResponse(404, { error: 'Project not found' });
        }
        
        return formatResponse(200, updatedProject);
      
      case 'DELETE':
        // Delete a project
        if (!id) {
          return formatResponse(400, { error: 'Project ID is required' });
        }
        
        const deleted = mockProjects.delete(id);
        
        if (!deleted) {
          return formatResponse(404, { error: 'Project not found' });
        }
        
        return formatResponse(204, {});
      
      default:
        return formatResponse(405, { error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return formatResponse(500, { error: 'Internal server error', details: error.message });
  }
}; 