import { CallLog, CallType } from '../types/CallLog';
import { PermissionsAndroid } from 'react-native';
import apiClient from './apiClient';
// Use optional runtime require for native call-log module so the bundle
// doesn't fail when the native module isn't installed (development mode).

// Mock data generator for development
const generateMockLogs = (count: number): CallLog[] => {
    const types: CallType[] = [
        CallType.Incoming,
        CallType.Outgoing,
        CallType.Missed,

    ];
    const names = ['Alice Smith', 'Bob Jones', 'Mom', 'Dad', 'Work', 'Unknown', 'Scam Likely'];

    return Array.from({ length: count }).map((_, i) => {
        const type = types[Math.floor(Math.random() * types.length)];
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));

        return {
            id: `call-${i}-${Date.now()}`,
            phoneNumber: `+1555000${1000 + i}`,
            name: Math.random() > 0.3 ? names[Math.floor(Math.random() * names.length)] : undefined,
            dateTime: date.toISOString(),
            timestamp: date.getTime(),
            duration: type === CallType.Missed ? 0 : Math.floor(Math.random() * 600),
            type,
            simSlot: Math.floor(Math.random() * 2), // Random SIM 0 or 1 for testing
        };
    });
};

// Internal cache for call logs to avoid redundant native calls
let cachedLogs: CallLog[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds cache

export const CallLogService = {
    getCallLogs: async (forceRefresh?: boolean): Promise<CallLog[]> => {
        const now = Date.now();
        if (!forceRefresh && cachedLogs && (now - lastFetchTime < CACHE_DURATION)) {
            return cachedLogs;
        }

        try {
            const result = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
                {
                    title: 'Call Log Permission',
                    message: 'Callyzer needs access to your call logs to manage your history.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                },
            );

            if (result === PermissionsAndroid.RESULTS.GRANTED) {
                let CallLogs: any = null;
                try {
                    // runtime require so bundler doesn't throw if native module missing
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    CallLogs = require('react-native-call-log');
                } catch (e) {
                    CallLogs = null;
                }

                if (CallLogs && typeof CallLogs.load === 'function') {
                    const logs = await CallLogs.load(-1); // -1 fetches all
                    const mappedLogs = mapLogs(logs);

                    cachedLogs = mappedLogs;
                    lastFetchTime = Date.now();
                    return mappedLogs;
                }

                // Fallback to generated mock logs in development or when native module missing
                const mocks = generateMockLogs(50);
                cachedLogs = mocks;
                lastFetchTime = Date.now();
                return mocks;
            } else {
                return [];
            }
        } catch (error) {
            console.error(error);
            return [];
        }
    },

    getRecentLogs: async (minTimestamp: number): Promise<CallLog[]> => {
        try {
            const hasPermission = await CallLogService.requestPermissions();
            if (!hasPermission) return [];

            let CallLogs: any = null;
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                CallLogs = require('react-native-call-log');
            } catch (e) {
                CallLogs = null;
            }

            if (CallLogs && typeof CallLogs.load === 'function') {
                const logs = await CallLogs.load(-1, { minTimestamp });
                return mapLogs(logs);
            }
            return [];
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    getCallLogsByDay: async (daysOffset: number): Promise<CallLog[]> => {
        try {
            const hasPermission = await CallLogService.requestPermissions();
            if (!hasPermission) return [];

            const date = new Date();
            date.setDate(date.getDate() - daysOffset);
            date.setHours(0, 0, 0, 0);
            const minTimestamp = date.getTime();

            const maxTimestamp = minTimestamp + (24 * 60 * 60 * 1000) - 1;

            let CallLogs: any = null;
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                CallLogs = require('react-native-call-log');
            } catch (e) {
                CallLogs = null;
            }

            if (CallLogs && typeof CallLogs.load === 'function') {
                const logs = await CallLogs.load(-1, {
                    minTimestamp,
                    maxTimestamp
                });
                return mapLogs(logs);
            }

            // Mock implementation for development - generate logs for the specific day
            // Only generate if it's within the last 30 days (typical for mock data)
            // if (daysOffset < 30) {
            //     const count = Math.floor(Math.random() * 5) + 2; // 2-6 logs for that day
            //     return Array.from({ length: count }).map((_, i) => {
            //         const date = new Date(minTimestamp + Math.random() * (24 * 60 * 60 * 1000));
            //         const types = [CallType.Incoming, CallType.Outgoing, CallType.Missed, CallType.Rejected];
            //         const names = ['Alice', 'Bob', 'Charlie', 'David', 'Eva'];

            //         return {
            //             id: `mock-${daysOffset}-${i}`,
            //             phoneNumber: `+1555${daysOffset}${i}00`,
            //             name: names[i % names.length],
            //             dateTime: date.toISOString(),
            //             timestamp: date.getTime(),
            //             duration: Math.floor(Math.random() * 300),
            //             type: types[i % types.length],
            //             simSlot: i % 2,
            //         };
            //     });
            // }
            return [];
        } catch (error) {
            console.error('Error fetching logs by day:', error);
            return [];
        }
    },


    requestPermissions: async (): Promise<boolean> => {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            return false;
        }
    },

    /**
     * Fetches the pre-computed timeline for a lead from the backend.
     * The backend returns { events: [...], lead: {...} } where each event has
     * kind ("CALL" | "NOTE"), date, timestamp, label, durStr, addedBy, desc, etc.
     */
    getLeadTimeline: async (leadId: string): Promise<any[]> => {
        try {
            const response = await apiClient.get<any>(`/leads/timeline/${leadId}`);
            // Backend returns { success: true, data: { events: [...], lead: {...} } }
            const data = response.data?.data || response.data || {};
            const events: any[] = data.events || [];

            // console.log('Timeline events:', events);
            return events;
        } catch (error) {
            console.warn('Failed to fetch lead timeline:', error);
            return [];
        }
    },

    /** @deprecated use getLeadTimeline instead */
    getRemoteCallLogs: async (leadId: string): Promise<CallLog[]> => {
        return [];
    }
};

const mapLogs = (logs: any[]): CallLog[] => {
    return logs.map((log: any) => ({
        id: log.timestamp ? log.timestamp.toString() : Math.random().toString(),
        phoneNumber: log.phoneNumber,
        name: log.name || undefined,
        dateTime: log.dateTime,
        timestamp: parseInt(log.timestamp, 10),
        duration: parseInt(log.duration, 10),
        type: normalizeCallType(log.type),
        rawType: log.type,
        simSlot: log.simId ? parseInt(log.simId, 10) - 1 : 0, // simId is 1-based, convert to 0-based
    }));
};

const normalizeCallType = (type: string): CallType => {
    switch (type) {
        case 'INCOMING': return CallType.Incoming;
        case 'OUTGOING': return CallType.Outgoing;
        case 'MISSED': return CallType.Missed;
        default: return CallType.Unknown;
    }
};
