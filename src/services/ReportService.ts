import { ReportMetrics } from '../types/Report';

export const ReportService = {
    formatDuration: (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    calculateMetrics: (calls: any[]): ReportMetrics => {
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
            const status = (call.callStatus || call.status || '').toLowerCase();
            const type = (call.callType || call.type || '').toLowerCase();
            const duration = Number(call.durationSeconds || call.duration || 0);

            // "connected" or "completed" both count as a connected call
            const isConnected = status === 'connected' || status === 'completed';

            // Total call time = ALL calls' durations
            totalDuration += duration;

            if (isConnected) {
                metrics.callOverview.totalConnected++;
            } else {
                metrics.callOverview.totalUnconnected++;
            }

            if (type === 'outgoing') {
                metrics.outgoingCalls.totalOutgoing++;
                if (isConnected) {
                    metrics.outgoingCalls.outgoingConnected++;
                    outgoingDuration += duration;
                } else {
                    metrics.outgoingCalls.outgoingUnanswered++;
                }
            } else if (type === 'incoming') {
                metrics.incomingCalls.totalIncoming++;
                if (isConnected) {
                    metrics.incomingCalls.incomingConnected++;
                    incomingDuration += duration;
                } else {
                    metrics.incomingCalls.incomingUnanswered++;
                }
            } else if (type === 'missed') {
                // Some backends send callType:'missed' for missed incoming calls
                metrics.incomingCalls.totalIncoming++;
                metrics.incomingCalls.incomingUnanswered++;
            }
        });

        // Final calculations
        metrics.callOverview.totalCallTime = ReportService.formatDuration(totalDuration);

        if (metrics.callOverview.totalConnected > 0) {
            metrics.callOverview.avgCallDuration = ReportService.formatDuration(
                totalDuration / metrics.callOverview.totalConnected
            );
        }

        if (metrics.outgoingCalls.outgoingConnected > 0) {
            metrics.outgoingCalls.avgOutgoingDuration = ReportService.formatDuration(
                outgoingDuration / metrics.outgoingCalls.outgoingConnected
            );
        }

        if (metrics.incomingCalls.incomingConnected > 0) {
            metrics.incomingCalls.avgIncomingDuration = ReportService.formatDuration(
                incomingDuration / metrics.incomingCalls.incomingConnected
            );
        }

        return metrics;
    }
};
