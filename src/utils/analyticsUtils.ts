import { CallLog, CallType } from '../types/CallLog';

export interface CallStats {
    total: number;
    incoming: number;
    outgoing: number;
    missed: number;
    rejected: number;
    neverAttended: number;
    totalDuration: number;
    incomingDuration: number;
    outgoingDuration: number;
}

export interface HourlyData {
    hour: string;
    incoming: number;
    outgoing: number;
    missed: number;
    rejected: number;
}

export const calculateCallStats = (logs: CallLog[]): CallStats => {
    const stats: CallStats = {
        total: logs.length,
        incoming: 0,
        outgoing: 0,
        missed: 0,
        rejected: 0,
        neverAttended: 0,
        totalDuration: 0,
        incomingDuration: 0,
        outgoingDuration: 0,
    };

    logs.forEach(log => {
        stats.totalDuration += log.duration;

        switch (log.type) {
            case CallType.Incoming:
                stats.incoming++;
                stats.incomingDuration += log.duration;
                break;
            case CallType.Outgoing:
                stats.outgoing++;
                stats.outgoingDuration += log.duration;
                break;
            case CallType.Missed:
                stats.missed++;
                stats.neverAttended++;
                break;
            case CallType.Rejected:
                stats.rejected++;
                break;
        }
    });

    return stats;
};

export const groupCallsByHour = (logs: CallLog[]): HourlyData[] => {
    const hourlyMap: { [key: string]: HourlyData } = {};

    logs.forEach(log => {
        const date = new Date(log.timestamp);
        const hour = date.getHours();
        const hourKey = `${hour.toString().padStart(2, '0')}:00`;

        if (!hourlyMap[hourKey]) {
            hourlyMap[hourKey] = {
                hour: hourKey,
                incoming: 0,
                outgoing: 0,
                missed: 0,
                rejected: 0,
            };
        }

        switch (log.type) {
            case CallType.Incoming:
                hourlyMap[hourKey].incoming++;
                break;
            case CallType.Outgoing:
                hourlyMap[hourKey].outgoing++;
                break;
            case CallType.Missed:
                hourlyMap[hourKey].missed++;
                break;
            case CallType.Rejected:
                hourlyMap[hourKey].rejected++;
                break;
        }
    });

    return Object.values(hourlyMap).sort((a, b) => a.hour.localeCompare(b.hour));
};

export const filterLogsByDateRange = (logs: CallLog[], range: 'today' | 'week' | 'month' | 'custom', customStart?: Date, customEnd?: Date): CallLog[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let startDate: Date;
    let endDate: Date = new Date(now.getTime() + 24 * 60 * 60 * 1000); // End of today

    switch (range) {
        case 'today':
            startDate = today;
            break;
        case 'week':
            startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case 'custom':
            if (!customStart || !customEnd) return logs;
            startDate = customStart;
            endDate = customEnd;
            break;
        default:
            return logs;
    }

    return logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= startDate && logDate <= endDate;
    });
};

export const formatDurationLong = (seconds: number): string => {
    if (seconds === 0) return '0s';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);

    return parts.join(' ');
};
