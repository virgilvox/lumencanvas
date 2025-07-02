/**
 * API Service for LumenCanvas
 * Handles all communication with the backend server
 */

// Base API URL - defaults to Netlify Functions
const API_BASE_URL = '/api';

/**
 * Generic fetch wrapper with error handling
 * @param {string} endpoint - API endpoint to call
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} Response data
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
  };
  
  if (options.token) {
    defaultOptions.headers['Authorization'] = `Bearer ${options.token}`;
  }
  
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
    const contentType = response.headers.get('content-type');
    
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    if (!response.ok) {
      const error = new Error(data.error || data.message || 'API Error');
      error.status = response.status;
      error.data = data;
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Project API methods
 */
export const projectsAPI = {
  async list(token) {
    return fetchAPI('/projects/list', { token });
  },
  
  async get(id, token) {
    return fetchAPI(`/projects/${id}`, { token });
  },
  
  async create(projectData, token) {
    return fetchAPI('/projects/create', {
      method: 'POST',
      body: JSON.stringify(projectData),
      token
    });
  },
  
  async update(id, projectData, token) {
    return fetchAPI(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
      token
    });
  },
  
  async delete(id, token) {
    return fetchAPI(`/projects/${id}`, {
      method: 'DELETE',
      token
    });
  }
};

/**
 * Assets API methods
 */
export const assetsAPI = {
  async getUploadUrl(fileName, fileType, projectId, token) {
    return fetchAPI('/assets/create-upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, fileType, projectId }),
      token
    });
  },
};

export default {
  projects: projectsAPI,
  assets: assetsAPI,
}; 