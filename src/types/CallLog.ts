export enum CallType {
    Incoming = 'INCOMING',
    Outgoing = 'OUTGOING',
    Missed = 'MISSED',
    Rejected = 'REJECTED',
    Blocked = 'BLOCKED',
    Voicemail = 'VOICEMAIL',
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
}
