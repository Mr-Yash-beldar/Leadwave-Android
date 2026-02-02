import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.1.20:5000/api';

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            // If token already has 'Bearer ', use it as is, otherwise add it
            config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Helper to get navigation outside of components
import { createNavigationContainerRef } from '@react-navigation/native';
export const navigationRef = createNavigationContainerRef<any>();

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response && error.response.status === 401) {
            // Handle unauthorized (session expired)
        }

        // Handle Server Down / Network Errors
        if (!error.response || error.message === 'Network Error' || (error.response && [500, 502, 503, 504].includes(error.response.status))) {
            if (navigationRef.isReady()) {
                navigationRef.navigate('ServerDown');
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
