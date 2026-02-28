import notifee, {
    AndroidImportance,
    TimestampTrigger,
    TriggerType,
    AndroidVisibility,
} from '@notifee/react-native';

// ─── Demo follow-up records ──────────────────────────────────────────────────
// These are 5 hard-coded follow-ups used until real API data is wired in.
// Each entry triggers a notification 1 hour before the followUpTime.

export interface FollowUp {
    id: string;
    name: string;
    status: string;
    followUpDate: string;   // "DD.MM.YYYY"
    followUpTime: string;   // "3:00 PM"
    followUpTimestamp: number; // epoch ms of the actual follow-up
}

export const DEMO_FOLLOWUPS: FollowUp[] = [
    {
        id: 'fu_1',
        name: 'Yashodip Shete',
        status: 'Pending',
        followUpDate: '27.02.2026',
        followUpTime: '3:00 PM',
        followUpTimestamp: new Date('2026-02-27T09:30:00.000Z').getTime(), // 3 PM IST = 9:30 UTC
    },
    {
        id: 'fu_2',
        name: 'Ajit Sir',
        status: 'Pending',
        followUpDate: '27.02.2026',
        followUpTime: '5:00 PM',
        followUpTimestamp: new Date('2026-02-27T11:30:00.000Z').getTime(), // 5 PM IST
    },
    {
        id: 'fu_3',
        name: 'Ravi Kumar',
        status: 'Pending',
        followUpDate: '28.02.2026',
        followUpTime: '10:00 AM',
        followUpTimestamp: new Date('2026-02-28T04:30:00.000Z').getTime(), // 10 AM IST
    },
    {
        id: 'fu_4',
        name: 'Priya Sharma',
        status: 'Pending',
        followUpDate: '28.02.2026',
        followUpTime: '2:00 PM',
        followUpTimestamp: new Date('2026-02-28T08:30:00.000Z').getTime(), // 2 PM IST
    },
    {
        id: 'fu_5',
        name: 'Sneha Patil',
        status: 'Pending',
        followUpDate: '01.03.2026',
        followUpTime: '11:00 AM',
        followUpTimestamp: new Date('2026-03-01T05:30:00.000Z').getTime(), // 11 AM IST
    },
];

// ─── NotificationService ─────────────────────────────────────────────────────

const CHANNEL_ID = 'followup_reminders';

export const NotificationService = {

    /** Must be called once at app start (e.g. App.js / AuthContext) */
    async init() {
        await notifee.createChannel({
            id: CHANNEL_ID,
            name: 'Follow-up Reminders',
            importance: AndroidImportance.HIGH,
            visibility: AndroidVisibility.PUBLIC,
            sound: 'default',
            vibration: true,
        });
    },

    /** Request permission (Android 13+, iOS always) */
    async requestPermission() {
        await notifee.requestPermission();
    },

    /**
     * Schedule a reminder notification 1 hour before the follow-up time.
     * Skips if the reminder time is already in the past.
     */
    async scheduleReminder(followUp: FollowUp) {
        const reminderTs = followUp.followUpTimestamp - 60 * 60 * 1000; // 1 hour before
        if (reminderTs <= Date.now()) return; // already passed

        const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: reminderTs,
        };

        await notifee.createTriggerNotification(
            {
                id: followUp.id,
                title: `📞 Follow-up Reminder — ${followUp.name}`,
                body: `Status: ${followUp.status} · Due at ${followUp.followUpTime} on ${followUp.followUpDate}`,
                android: {
                    channelId: CHANNEL_ID,
                    importance: AndroidImportance.HIGH,
                    smallIcon: 'ic_notification', // white icon in res/drawable
                    pressAction: { id: 'default' },
                    showTimestamp: true,
                },
            },
            trigger,
        );
    },

    /** Schedule reminders for ALL demo (or real) follow-ups */
    async scheduleAll(followUps: FollowUp[] = DEMO_FOLLOWUPS) {
        await NotificationService.init();
        await NotificationService.requestPermission();
        for (const fu of followUps) {
            await NotificationService.scheduleReminder(fu);
        }
    },

    /** Show an immediate test notification to verify the channel works */
    async showImmediateTest(followUp: FollowUp) {
        await NotificationService.init();
        await notifee.displayNotification({
            title: `📞 Follow-up Reminder — ${followUp.name}`,
            body: `Status: ${followUp.status} · Due at ${followUp.followUpTime} on ${followUp.followUpDate}`,
            android: {
                channelId: CHANNEL_ID,
                importance: AndroidImportance.HIGH,
                pressAction: { id: 'default' },
            },
        });
    },

    /** Cancel all scheduled reminders */
    async cancelAll() {
        await notifee.cancelAllNotifications();
    },
};
