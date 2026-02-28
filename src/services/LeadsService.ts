import { Platform } from 'react-native';
import apiClient from './apiClient';
import { Lead } from '../types/Lead';

export const LeadsService = {
    getAssignedLeads: async (page: number = 1, limit: number = 100): Promise<Lead[]> => {
        try {
            // console.log('Fetching assigned leads from /leads/assigned');
            const response = await apiClient.get<{ success: boolean; data: Lead[]; meta?: any }>('/leads/assigned', {
                params: { page, limit }
            });
            // console.log('Response received:', response.data);
            if (response.data.success) {
                return response.data.data;
            }
            return [];
        } catch (error: any) {
            console.error('Error fetching assigned leads:', error.message);

            // Return empty array instead of throwing to prevent app crash
            return [];
        }
    },

    updateLeadStatus: async (leadId: string, status: string, notes?: string) => {
        try {
            const response = await apiClient.put(`/leads/${leadId}`, { status, notes });
            return response.data;
        } catch (error) {
            console.error('Error updating lead:', error);
            throw error;
        }
    },

    updateLeadBySalesperson: async (data: any) => {
        try {
            const response = await apiClient.put('/leads/update-by-salesperson', data);
            return response.data;
        } catch (error) {
            console.error('Error updating lead by salesperson:', error);
            throw error;
        }
    },


    /**
     * Auto-posts a matched system call log to the backend.
     * Token is added automatically by apiClient interceptor.
     */
    postCallLog: async (data: {
        leadId: string;
        callTime: string;        // ISO string
        durationSeconds: number;
        callStatus: string;      // "completed" | "missed" | "rejected"
        callType: string;        // "incoming" | "outgoing" | "missed"
        notes?: string;
    }) => {
        const response = await apiClient.post('/calls', data);
        return response.data;
    },

    logCall: async (data: any) => {
        try {
            // If there's a local recording path, use FormData for file upload
            if (data.recordingLink && (data.recordingLink.startsWith('/') || data.recordingLink.startsWith('file://'))) {
                const formData = new FormData();

                // Add all existing fields to formData
                Object.keys(data).forEach(key => {
                    if (key !== 'recordingLink') {
                        formData.append(key, data[key]);
                    }
                });

                // Add the file
                const filePath = data.recordingLink.replace('file://', '');
                const fileName = filePath.split('/').pop() || 'recording.mp4';

                formData.append('recording', {
                    uri: Platform.OS === 'android' ? `file://${filePath}` : filePath,
                    type: 'audio/mp4', // Adjust type as needed
                    name: fileName,
                } as any);

                const response = await apiClient.post('/calls', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                console.log("required", response);
                return response.data;
            }

            // Fallback to regular JSON if no local file
            const response = await apiClient.post('/calls', data);
            console.log("call log response :", response);
            return response.data;
        } catch (error) {
            console.error('Error logging call:', error);
            throw error;
        }
    }
};
