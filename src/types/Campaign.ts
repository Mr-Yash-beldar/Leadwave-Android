import { Lead } from './Lead';

export interface CampaignStats {
    assigned: number;
    open: number;
    inProgress: number;
    closed: number;
    unAssigned: number;
}

export interface Campaign {
    _id: string;
    name: string;
    createdAt?: string;
    status?: string; // e.g., 'Active', 'Completed'
    stats?: CampaignStats; // Optional if not always returned

    // For the list view cards, we need these counts. 
    // Assuming the API returns them either as a 'stats' object or directly.
    // Based on screenshot, let's assume flat or structured. I'll use a flexible approach or dedicated fields if I knew the exact JSON.
    // For now, I will add them as optional fields if they come flattened
    assignedCount?: number;
    openCount?: number;
    inProgressCount?: number;
    closedCount?: number;
    unAssignedCount?: number;
}

export interface CampaignDetailResponse {
    success?: boolean;
    data: {
        campaign: Campaign;
        leads: Lead[];
        totalLeads: number;
    };
}
