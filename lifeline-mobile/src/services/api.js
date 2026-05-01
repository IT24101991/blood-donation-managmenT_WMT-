import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'lifeline_token';

// Pointing to Production Render Backend per User request
const api = axios.create({
    baseURL: 'https://lifeline-backend-node.onrender.com',
    headers: {
        'Content-Type': 'application/json'
    }
});

api.interceptors.request.use(async (config) => {
    try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (error) {
        console.error('Error fetching token from SecureStore', error);
    }
    return config;
});

export default api;
export { TOKEN_KEY };
