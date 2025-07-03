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
  
  const token = await window.Clerk.session?.getToken();

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
  };
  
  if (token) {
    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
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
  async list() {
    return fetchAPI('/projects/list');
  },
  
  async get(id) {
    return fetchAPI(`/projects/${id}`);
  },
  
  async create(projectData) {
    // Ensure name/description are in metadata
    if (projectData.name) {
      projectData.metadata = projectData.metadata || {};
      projectData.metadata.name = projectData.name;
      delete projectData.name;
    }
    if (projectData.description) {
      projectData.metadata = projectData.metadata || {};
      projectData.metadata.description = projectData.description;
      delete projectData.description;
    }
    return fetchAPI('/projects/create', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  },
  
  async update(projectData) {
    // Ensure name/description are in metadata
    if (projectData.name) {
      projectData.metadata = projectData.metadata || {};
      projectData.metadata.name = projectData.name;
      delete projectData.name;
    }
    if (projectData.description) {
      projectData.metadata = projectData.metadata || {};
      projectData.metadata.description = projectData.description;
      delete projectData.description;
    }
    return fetchAPI('/projects/update', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  },
  
  async delete(id) {
    return fetchAPI(`/projects/${id}`, {
      method: 'DELETE',
    });
  }
};

/**
 * Assets API methods
 */
export const assetsAPI = {
  async getUploadUrl(fileName, fileType, projectId) {
    return fetchAPI('/assets/create-upload-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, fileType, projectId }),
    });
  },

  async setPublic(key) {
    return fetchAPI('/assets/set-public-acl', {
      method: 'POST',
      body: JSON.stringify({ key }),
    });
  },

  async delete(key) {
    return fetchAPI('/assets/delete', {
        method: 'POST', // Using POST to send a body with the key
        body: JSON.stringify({ key }),
    });
  }
};

export default {
  projects: projectsAPI,
  assets: assetsAPI,
}; 