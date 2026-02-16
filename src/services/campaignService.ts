import apiClient from './apiClient';
import { Campaign, CampaignDetailResponse } from '../types/Campaign';
import { Lead } from '../types/Lead';

export const campaignService = {
    getCampaigns: async (): Promise<Campaign[]> => {
        try {
            const response = await apiClient.get('/campaigns');
            // Backend might return the array directly or wrapped in an object
            if (Array.isArray(response.data)) {
                return response.data;
            } else if (response.data && Array.isArray(response.data.campaigns)) {
                return response.data.campaigns;
            } else if (response.data && Array.isArray(response.data.data)) {
                return response.data.data;
            }
            return [];
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            throw error;
        }
    },

    getCampaignDetails: async (id: string): Promise<CampaignDetailResponse> => {
        try {
            const response = await apiClient.get<CampaignDetailResponse>(`/campaigns/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching campaign details for ${id}:`, error);
            throw error;
        }
    }
};
