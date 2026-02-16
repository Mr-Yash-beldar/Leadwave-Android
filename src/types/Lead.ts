export interface Lead {
    _id: string;
    id?: string;
    firstName?: string;
    lastName?: string;
    name?: string; // Computed or fallback
    email?: string;
    phone?: string;
    number?: string; // internal mapping
    alt_phone?: string;
    alternateNumber?: string; // internal mapping
    leadSource?: string;
    leadStatus?: string;
    status?: string; // internal mapping
    assigned_to?: string | { name?: string; username?: string };
    assigned_by?: string;
    companyId?: string;
    expectedValue?: number | string | null;
    last_contacted_date?: string | null;
    next_followup_date?: string | null;
    isDeleted?: boolean;
    notes?: any[];
    created?: string;
    updated?: string;
    createdAt?: string;
    star?: number;
    followUpDate?: string;
    stage?: string;
    tag?: string;
    dealAmount?: string;
    assignedUser?: string | { name?: string; username?: string };
    campaignName?: string;
    campaign?: {
        name: string;
        _id: string;
    };
}

export interface LeadsResponse {
    success: boolean;
    data: Lead[];
}
