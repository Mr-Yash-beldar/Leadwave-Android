export enum CallType {
    Incoming = 'INCOMING',
    Outgoing = 'OUTGOING',
    Missed = 'MISSED',
    Rejected = 'REJECTED',
    Unknown = 'UNKNOWN',
}

export interface CallLog {
    id: string;
    phoneNumber: string;
    name?: string;
    dateTime: string; // ISO String
    duration: number; // in seconds
    type: CallType;
    rawType?: string;
    timestamp: number;
    simSlot?: number;
    recordingUrl?: string;

    // Lead matching fields
    leadName?: string;
    leadId?: string;
    leadData?: import('./Lead').Lead;
    disposed?: boolean;
    leadEmail?: string;
    leadMobile?: string;
    notes?: string;
    callStatus?: string;
}
