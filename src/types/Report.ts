export interface ReportMetrics {
    callOverview: {
        totalCalls: number;
        totalConnected: number;
        totalCallTime: string;
        totalUnconnected: number;
        avgCallDuration: string;
        avgStartCallingTime: string;
    };
    outgoingCalls: {
        totalOutgoing: number;
        outgoingConnected: number;
        outgoingUnanswered: number;
        avgOutgoingDuration: string;
    };
    incomingCalls: {
        totalIncoming: number;
        incomingConnected: number;
        incomingUnanswered: number;
        avgIncomingDuration: string;
    };
    followUpReport: {
        dueToday: number;
        missedYesterday: number;
        avgTurnAroundTime: string;
        compliance: string;
    };
    dispositions: {
        totalDisposed: number;
        disposedConnected: number;
        disposedNotConnected: number;
        converted: number;
    };
    activityReport: {
        totalBreakCount: number;
        totalBreakDuration: string;
        avgBreakDuration: string;
        avgFormFillingTime: string;
    };
}
