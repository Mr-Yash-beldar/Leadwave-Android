import React, { useCallback, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, BellOff, ChevronLeft, Clock, User } from 'lucide-react-native';
import { colors } from '../theme/colors';
import {
    NotificationService,
    DEMO_FOLLOWUPS,
    FollowUp,
} from '../services/NotificationService';

export const FollowUpScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const [scheduled, setScheduled] = useState(false);

    useEffect(() => {
        // Schedule all reminders when screen mounts
        NotificationService.scheduleAll(DEMO_FOLLOWUPS)
            .then(() => setScheduled(true))
            .catch(console.error);
    }, []);

    const handleTestNow = useCallback(async (item: FollowUp) => {
        try {
            await NotificationService.showImmediateTest(item);
            Alert.alert('✅ Notification Sent', `Test notification for ${item.name} fired immediately.`);
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to send notification');
        }
    }, []);

    const handleScheduleAll = useCallback(async () => {
        try {
            await NotificationService.scheduleAll(DEMO_FOLLOWUPS);
            setScheduled(true);
            Alert.alert('✅ Reminders Scheduled', '1-hour reminders scheduled for all follow-ups.');
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to schedule');
        }
    }, []);

    const handleCancelAll = useCallback(async () => {
        await NotificationService.cancelAll();
        setScheduled(false);
        Alert.alert('Cancelled', 'All scheduled reminders have been cancelled.');
    }, []);

    const renderItem = ({ item }: { item: FollowUp }) => (
        <View style={styles.card}>
            <View style={styles.cardLeft}>
                <View style={styles.avatar}>
                    <User size={20} color={colors.white} />
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{item.name}</Text>
                    <View style={styles.row}>
                        <Clock size={12} color={colors.textSecondary} />
                        <Text style={styles.meta}>  {item.followUpDate}  ·  {item.followUpTime}</Text>
                    </View>
                    <View style={[styles.badge,
                    item.status === 'Pending' ? styles.badgePending : styles.badgeDone]}>
                        <Text style={styles.badgeText}>{item.status}</Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity style={styles.testBtn} onPress={() => handleTestNow(item)}>
                <Bell size={16} color={colors.black} />
                <Text style={styles.testBtnText}>Test</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ChevronLeft size={28} color={colors.black} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Follow-up Reminders</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity onPress={handleCancelAll} style={styles.headerBtn}>
                        <BellOff size={20} color={colors.black} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Info banner */}
            <View style={styles.banner}>
                <Bell size={16} color={colors.black} />
                <Text style={styles.bannerText}>
                    {scheduled
                        ? 'Reminders scheduled — you\'ll be notified 1 hour before each follow-up.'
                        : 'Scheduling reminders…'}
                </Text>
            </View>

            <FlatList
                data={DEMO_FOLLOWUPS}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                ListFooterComponent={
                    <TouchableOpacity style={styles.scheduleBtn} onPress={handleScheduleAll}>
                        <Bell size={18} color={colors.black} />
                        <Text style={styles.scheduleBtnText}>Re-schedule All Reminders</Text>
                    </TouchableOpacity>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F6FA' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: colors.primary,
    },
    headerTitle: {
        flex: 1, fontSize: 20, fontWeight: 'bold',
        color: colors.black, marginLeft: 12,
    },
    headerRight: { flexDirection: 'row' },
    headerBtn: { padding: 4 },

    banner: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFF9E6',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#F0E8C0',
        gap: 8,
    },
    bannerText: { flex: 1, fontSize: 13, color: '#5A4B00' },

    list: { padding: 14 },

    card: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 12, padding: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 3,
    },
    cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    avatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.primary,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12,
    },
    info: { flex: 1 },
    name: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    meta: { fontSize: 12, color: colors.textSecondary },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8, paddingVertical: 2,
        borderRadius: 12,
    },
    badgePending: { backgroundColor: '#FFF3CD' },
    badgeDone: { backgroundColor: '#D4EDDA' },
    badgeText: { fontSize: 11, fontWeight: '600', color: '#555' },

    testBtn: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 10, paddingVertical: 7,
        borderRadius: 8, gap: 4,
    },
    testBtnText: { fontSize: 13, fontWeight: '600', color: colors.black },

    scheduleBtn: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        margin: 16,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        elevation: 2,
    },
    scheduleBtnText: { fontSize: 15, fontWeight: '700', color: colors.black },
});
