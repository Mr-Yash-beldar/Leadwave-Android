import apiClient from './apiClient';
import { Platform } from 'react-native';

export const RecordingUploadService = {
    uploadRecording: async (filePath: string, phoneNumber?: string) => {
        try {
            console.log('Starting upload for:', filePath);

            const formData = new FormData();

            const fileName = filePath.split('/').pop() || 'recording.mp4';
            const fileType = 'audio/mp4';

            formData.append('file', {
                uri: Platform.OS === 'android' ? `file://${filePath}` : filePath,
                type: fileType,
                name: fileName,
            } as any);

            if (phoneNumber) {
                formData.append('phoneNumber', phoneNumber);
            }

            // Adjust endpoint as per backend requirement. Assuming /calls/upload based on context.
            const response = await apiClient.post('/calls/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('Upload success:', response.data);
            return response.data;
        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    }
};
