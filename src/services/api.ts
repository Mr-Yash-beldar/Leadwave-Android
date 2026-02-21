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
    },

    checkLeadAssignment: async (phone: string) => {
        try {
            const response = await apiClient.get('/leads/check-phone', {
                params: { phone }
            });
            return response.data;
        } catch (error: any) {
            console.error('Lead Check Error:', error);
            return { success: false, error: true };
        }
    },
    checkPhone: async (phone: string) => {
        try {
            const response = await apiClient.get('/leads/checkandgive', {
                params: { phone }
            });
            return response.data.lead;
        } catch (error: any) {
            console.error('Lead Check Error:', error);
            return { success: false, error: true };
        }
    },

    getCampaigns: async () => {
        try {
            const response = await apiClient.get('/campaigns');
            return response.data;
        } catch (error: any) {
            console.error('Get Campaigns Error:', error);
            throw error;
        }
    },

    createLead: async (data: { firstName: string; lastName: string; phone: string; campaign: string; date?: string }) => {
        try {
            const response = await apiClient.post('/leads/create-and-assign', data);
            return response.data;
        } catch (error: any) {
            console.error('Create Lead Error:', error);
            throw error;
        }
    },

    assignSelf: async (leadId: string, phone: string) => {
        try {
            const response = await apiClient.post('/leads/assign-self', { leadId, phone });
            return response.data;
        } catch (error: any) {
            console.error('Assign Self Error:', error);
            throw error;
        }
    },

    checkHealth: async () => {
        try {
            const response = await apiClient.get('/health');
            return response.status === 200;
        } catch (error) {
            console.log(error);
            return false;
        }
    },

    getCallReports: async (startDate?: string, endDate?: string) => {
        let start = startDate;
        let end = endDate;
        try {
            const response = await apiClient.get('/calls/reports/', {
                params: { start, end }
            });
            return response.data;
        } catch (error: any) {
            console.error('Report Fetch Error:', error.response?.data || error.message);
            throw error;
        }
    },

    getProfile: async () => {
        try {
            const response = await apiClient.get('/users/current/profile');
            return response.data;
        } catch (error: any) {
            console.error('Profile Fetch Error:', error.response?.data || error.message);
            throw error;
        }
    },

    getCallLogs: async () => {
        try {
            const response = await apiClient.get('/calls/call-logs');
            // ✅ Correct ways to log objects:
            // console.log('backen:', response.data);  // Comma separates values

            return response.data;
        } catch (error: any) {
            console.error('Profile Fetch Error:', error.response?.data || error.message);
            throw error;
        }
    },
    getAssigned: async () => {
        try {
            const response = await apiClient.get('/leads/assigned');
            // ✅ Correct ways to log objects:
            // console.log('backen:', response.data);  // Comma separates values

            return response.data;
        } catch (error: any) {
            console.error('Profile Fetch Error:', error.response?.data || error.message);
            throw error;
        }
    },

};
