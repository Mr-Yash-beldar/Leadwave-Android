import apiClient from './apiClient';

export const api = {
    // Auth
    login: async (data: { email: string; password: string }) => {
        try {
            const response = await apiClient.post('/auth/login', {
                email: data.email,
                password: data.password
            });
            // The response itself is { success: true, accessToken: "...", refreshToken: "..." }
            return response.data;
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message || 'Login failed';
            console.error('Login Error:', error.response?.data || error.message);
            throw new Error(errorMsg);
        }
    },

    // Auth
    register: async (data: any) => {
        try {
            const response = await apiClient.post('/auth/register', data);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Registration failed');
        }
    },

    verify: async (data: { phone: string; code: string }) => {
        try {
            const response = await apiClient.post('/auth/verify', data);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Verification failed');
        }
    },

    // Sync
    syncLogs: async (userId: string, logs: any[]) => {
        try {
            const response = await apiClient.post('/logs/sync', {
                userId,
                logs
            });
            return response.data;
        } catch (error: any) {
            console.error('Sync Error:', error.response?.data || error.message);
            throw error;
        }
    },

    getLogs: async (userId: string) => {
        try {
            const response = await apiClient.get(`/logs/${userId}`);
            return response.data;
        } catch (error: any) {
            throw error;
        }
    }
};
