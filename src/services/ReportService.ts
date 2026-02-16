import { ReportMetrics } from '../types/Report';

export const ReportService = {
    formatDuration: (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    calculateMetrics: (calls: any[]): ReportMetrics => {
        // Basic initialization with zeroes
        const metrics: ReportMetrics = {
            callOverview: {
                totalCalls: calls.length,
                totalConnected: 0,
                totalCallTime: '00:00:00',
                totalUnconnected: 0,
                avgCallDuration: '00:00:00',
                avgStartCallingTime: '00:00:00',
            },
            outgoingCalls: {
                totalOutgoing: 0,
                outgoingConnected: 0,
                outgoingUnanswered: 0,
                avgOutgoingDuration: '00:00:00',
            },
            incomingCalls: {
                totalIncoming: 0,
                incomingConnected: 0,
                incomingUnanswered: 0,
                avgIncomingDuration: '00:00:00',
            },
            followUpReport: {
                dueToday: 0,
                missedYesterday: 0,
                avgTurnAroundTime: '00:00:00',
                compliance: '0%',
            },
            dispositions: {
                totalDisposed: 0,
                disposedConnected: 0,
                disposedNotConnected: 0,
                converted: 0,
            },
            activityReport: {
                totalBreakCount: 0,
                totalBreakDuration: '00:00:00',
                avgBreakDuration: '00:00:00',
                avgFormFillingTime: '00:00:00',
            },
        };

        let totalDuration = 0;
        let outgoingDuration = 0;
        let incomingDuration = 0;

        calls.forEach(call => {
            const isConnected = call.callStatus?.toLowerCase() === 'connected' || call.status?.toLowerCase() === 'connected';
            const duration = Number(call.durationSeconds || call.duration || 0);

            if (isConnected) {
                metrics.callOverview.totalConnected++;
                totalDuration += duration;
            } else {
                metrics.callOverview.totalUnconnected++;
            }

            if (call.callType?.toLowerCase() === 'outgoing' || call.type?.toLowerCase() === 'outgoing') {
                metrics.outgoingCalls.totalOutgoing++;
                if (isConnected) {
                    metrics.outgoingCalls.outgoingConnected++;
                    outgoingDuration += duration;
                } else {
                    metrics.outgoingCalls.outgoingUnanswered++;
                }
            } else if (call.callType?.toLowerCase() === 'incoming' || call.type?.toLowerCase() === 'incoming') {
                metrics.incomingCalls.totalIncoming++;
                if (isConnected) {
                    metrics.incomingCalls.incomingConnected++;
                    incomingDuration += duration;
                } else {
                    metrics.incomingCalls.incomingUnanswered++;
                }
            }
        });

        // Final calculations
        metrics.callOverview.totalCallTime = ReportService.formatDuration(totalDuration);

        if (metrics.callOverview.totalConnected > 0) {
            metrics.callOverview.avgCallDuration = ReportService.formatDuration(totalDuration / metrics.callOverview.totalConnected);
        }

        if (metrics.outgoingCalls.outgoingConnected > 0) {
            metrics.outgoingCalls.avgOutgoingDuration = ReportService.formatDuration(outgoingDuration / metrics.outgoingCalls.outgoingConnected);
        }

        if (metrics.incomingCalls.incomingConnected > 0) {
            metrics.incomingCalls.avgIncomingDuration = ReportService.formatDuration(incomingDuration / metrics.incomingCalls.incomingConnected);
        }

        return metrics;
    }
};
