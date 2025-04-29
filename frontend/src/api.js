import axios from 'axios';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL
});

// Request interceptor for adding the auth token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(ACCESS_TOKEN);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for handling token refresh
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        
        // If the error is 401 and we haven't tried to refresh the token yet
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
                // Try to refresh the token
                const refreshToken = localStorage.getItem(REFRESH_TOKEN);
                if (!refreshToken) {
                    // No refresh token available, redirect to login
                    window.location.href = '/login';
                    return Promise.reject(error);
                }
                
                const response = await axios.post(
                    `${import.meta.env.VITE_API_URL}/api/token/refresh/`, 
                    { refresh: refreshToken }
                );
                
                // Update the tokens
                const { access } = response.data;
                localStorage.setItem(ACCESS_TOKEN, access);
                
                // Update the auth header
                originalRequest.headers.Authorization = `Bearer ${access}`;
                
                // Retry the original request
                return axios(originalRequest);
            } catch (refreshError) {
                // If refresh fails, redirect to login
                localStorage.removeItem(ACCESS_TOKEN);
                localStorage.removeItem(REFRESH_TOKEN);
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        
        return Promise.reject(error);
    }
);

const documentApi = {
    // Get document details
    getDocument: async (id) => {
        return api.get(`/api/documents/${id}/`);
    },
    
    // Get all documents for the current user
    getAllDocuments: async () => {
        return api.get('/api/documents/');
    },
    
    // Delete a document
    deleteDocument: async (id) => {
        return api.delete(`/api/documents/${id}/`);
    },

    updateDocument: async (id, data) => {
        return api.patch(`/api/documents/${id}/`, data);
    }
};

export { api };
export default documentApi;