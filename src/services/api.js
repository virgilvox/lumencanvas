/**
 * API Service for LumenCanvas
 * Handles all communication with the backend server
 */

// Base API URL - defaults to Netlify Functions or can be set via environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || '/.netlify/functions';

/**
 * Generic fetch wrapper with error handling
 * @param {string} endpoint - API endpoint to call
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} Response data
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  // Default options
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    credentials: 'include' // Include cookies for auth
  };
  
  // Merge options
  const fetchOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };
  
  try {
    const response = await fetch(url, fetchOptions);
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      // Check if response is not ok (status outside 200-299)
      if (!response.ok) {
        const error = new Error(data.message || 'API Error');
        error.status = response.status;
        error.data = data;
        throw error;
      }
      
      return data;
    } else {
      // For non-JSON responses
      const text = await response.text();
      
      if (!response.ok) {
        const error = new Error(text || 'API Error');
        error.status = response.status;
        throw error;
      }
      
      return text;
    }
  } catch (error) {
    // Add request details to error
    error.endpoint = endpoint;
    error.request = fetchOptions;
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * Project API methods
 */
export const projectsAPI = {
  /**
   * Get all projects
   * @returns {Promise<Array>} List of projects
   */
  async getAll() {
    return fetchAPI('/projects');
  },
  
  /**
   * Get a project by ID
   * @param {string} id - Project ID
   * @returns {Promise<Object>} Project data
   */
  async getById(id) {
    return fetchAPI(`/projects/${id}`);
  },
  
  /**
   * Create a new project
   * @param {Object} projectData - Project data
   * @returns {Promise<Object>} Created project
   */
  async create(projectData) {
    return fetchAPI('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
  },
  
  /**
   * Update a project
   * @param {string} id - Project ID
   * @param {Object} projectData - Updated project data
   * @returns {Promise<Object>} Updated project
   */
  async update(id, projectData) {
    return fetchAPI(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData)
    });
  },
  
  /**
   * Delete a project
   * @param {string} id - Project ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    return fetchAPI(`/projects/${id}`, {
      method: 'DELETE'
    });
  }
};

/**
 * Assets API methods
 */
export const assetsAPI = {
  /**
   * Upload an asset
   * @param {File} file - File to upload
   * @param {Object} metadata - Asset metadata
   * @returns {Promise<Object>} Uploaded asset data
   */
  async upload(file, metadata = {}) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));
    
    return fetchAPI('/assets/upload', {
      method: 'POST',
      headers: {
        // Don't set Content-Type here, it will be set automatically with boundary
        'Accept': 'application/json'
      },
      body: formData
    });
  },
  
  /**
   * Get asset by ID
   * @param {string} id - Asset ID
   * @returns {Promise<Object>} Asset data
   */
  async getById(id) {
    return fetchAPI(`/assets/${id}`);
  },
  
  /**
   * Get assets by project ID
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} List of assets
   */
  async getByProject(projectId) {
    return fetchAPI(`/assets/project/${projectId}`);
  },
  
  /**
   * Delete an asset
   * @param {string} id - Asset ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    return fetchAPI(`/assets/${id}`, {
      method: 'DELETE'
    });
  }
};

/**
 * Auth API methods
 */
export const authAPI = {
  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} User data
   */
  async login(email, password) {
    return fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },
  
  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user
   */
  async register(userData) {
    return fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },
  
  /**
   * Logout user
   * @returns {Promise<void>}
   */
  async logout() {
    return fetchAPI('/auth/logout', {
      method: 'POST'
    });
  },
  
  /**
   * Get current user
   * @returns {Promise<Object>} User data
   */
  async getCurrentUser() {
    return fetchAPI('/auth/me');
  }
};

export default {
  projects: projectsAPI,
  assets: assetsAPI,
  auth: authAPI
}; 