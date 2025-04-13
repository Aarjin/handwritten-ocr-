import axios from 'axios'
import { ACCESS_TOKEN } from './constants'


const api = axios.create({
    baseURL:import.meta.env.VITE_API_URL
})

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(ACCESS_TOKEN);
        if(token){
            config.headers.Authorization=`Bearer ${token}`
        }
        return config;
    },
    (error)=>{
        return Promise.reject(error)
    }
)

const documentApi = {
    // Get document details
    getDocument: async (id) => {
      return api.get(`/api/documents/${id}/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}`,
        }
      })
    },
    
    // Get all documents for the current user
    getAllDocuments: async () => {
      return api.get('/api/documents/', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}`,
        }
      })
    },
    
    // Delete a document
    deleteDocument: async (id) => {
      return api.delete(`/api/documents/${id}/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}`,
        }
      })
    },

    updateDocument: async (id, data) => {
      return api.patch(`/api/documents/${id}/`, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}`,
        }
      })
    }
    
  }
  export { api };
  export default documentApi;