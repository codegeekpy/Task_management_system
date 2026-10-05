/**
 * TaskFlow API Client
 * Handles authenticated HTTP requests to the backend
 */
const api = (() => {
  const API_BASE = '/api';
  const TOKEN_KEY = 'taskflow_jwt_token';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          // Trigger unauthenticated handling
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  }

  return {
    getToken,
    setToken,

    // Auth API
    login: (email, password) => request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

    register: (userData) => request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),

    demoLogin: (email) => request('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),

    getMe: () => request('/auth/me'),

    updateProfile: (profileData) => request('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    }),

    getTeamUsers: () => request('/auth/users'),

    resetDatabase: () => request('/auth/reset', {
      method: 'POST'
    }),

    // Tasks API
    getTasks: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val && val !== 'all') qs.append(key, val);
      });
      const queryString = qs.toString() ? `?${qs.toString()}` : '';
      return request(`/tasks${queryString}`);
    },

    getTaskById: (id) => request(`/tasks/${id}`),

    createTask: (taskData) => request('/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    }),

    updateTask: (id, updates) => request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),

    deleteTask: (id) => request(`/tasks/${id}`, {
      method: 'DELETE'
    }),

    addComment: (taskId, content) => request(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    }),

    toggleSubtask: (taskId, subtaskId) => request(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`, {
      method: 'PATCH'
    }),

    getStatsSummary: () => request('/tasks/stats/summary'),

    getActivityLog: (limit = 25) => request(`/tasks/activity/log?limit=${limit}`)
  };
})();
