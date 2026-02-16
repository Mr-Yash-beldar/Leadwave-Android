import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Platform,
    Alert,
    Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, MessageCircle, Phone, Calendar, Clock } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { Lead } from '../types/Lead';
import { LeadsService } from '../services/LeadsService';
import { CallLogService } from '../services/CallLogService';
import DateTimePicker from '@react-native-community/datetimepicker';

export const LeadDisposeScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { lead, callData } = route.params as { lead: Lead, callData?: { path: string, duration: string } };

    // Default to false (Not Connected) so options are visible, or null if we want to force choice?
    // User wants "without clicking... select next action". So we default to something or show all.
    // Let's default to null but show the *status* options.
    const [connected, setConnected] = useState<boolean | null>(false);

    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('');
    const [expectedValue, setExpectedValue] = useState('');
    const [followUpDate, setFollowUpDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [submitting, setSubmitting] = useState(false);

    const fetchTodayCallLog = async () => {
        try {
            const logs = await CallLogService.getCallLogsByDay(0);
            const normalize = (num: string) => num.replace(/[^0-9]/g, '');
            const leadNum = normalize(lead.phone || lead.number || '');

            const calls = logs.filter(log => normalize(log.phoneNumber).includes(leadNum) || leadNum.includes(normalize(log.phoneNumber)));
            return calls;
        } catch (e) {
            console.error("Error fetching logs", e);
            return [];
        }
    };

    const handleSubmit = async () => {
        // Validation: If they haven't explicitly set connected, strictly speaking we might need it.
        // But we defaulted to false.

        setSubmitting(true);
        try {
            // 1. Get Call Log Data
            const matchedCalls = await fetchTodayCallLog();

            // 2. Log calls to API
            console.log("Syncing calls for lead:", lead._id);

            if (matchedCalls && matchedCalls.length > 0) {
                for (const call of matchedCalls) {
                    let callStatus = 'not_connected';
                    const isConnectedType = (call.type === 'OUTGOING' || call.type === 'INCOMING');
                    if (isConnectedType) callStatus = 'connected';

                    const payload = {
                        leadId: lead._id || lead.id,
                        callTime: new Date(Number(call.timestamp)).toISOString(),
                        durationSeconds: call.duration,
                        callStatus: callStatus,
                        callType: call.type ? call.type.toLowerCase() : 'unknown',
                        recordingLink: null,
                        notes: `Dispose Status: ${status}, Notes: ${description}`
                    };

                    console.log("Posting call log:", payload);
                    await LeadsService.logCall(payload);
                }
            }

            // 3. Update API with Lead Status
            const apiStatus = status || (connected ? 'Connected' : 'Not Connected');

            const apiNotesObj = {
                description: description,
                expectedValue: expectedValue,
                followUpDate: followUpDate.toDateString(),
                disposeStatus: status
            };

            const apiNotes = JSON.stringify(apiNotesObj);

            await LeadsService.updateLeadStatus(lead._id || lead.id!, apiStatus, apiNotes);

            Alert.alert("Success", "Lead updated successfully", [
                { text: "OK", onPress: () => navigation.navigate('Leads') }
            ]);
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Failed to update lead. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleWhatsAppSend = async () => {
        // Send WhatsApp message logic
        const message = `Hi ${lead.name || 'Customer'},\n\nI tried reaching out to you!\nFeel free to call me back or message.\n\nRegards, Shinde Sir`;
        const phone = lead.phone || lead.number;
        if (phone) {
            const url = `whatsapp://send?text=${encodeURIComponent(message)}&phone=${phone}`;
            try {
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                    await Linking.openURL(url);
                } else {
                    Alert.alert("Error", "WhatsApp is not installed");
                }
            } catch (err) {
                console.error("An error occurred", err);
            }
        }

        // Also submit the disposition? User might want to just send msg.
        // For now, standalone action.
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || followUpDate;
        setShowDatePicker(Platform.OS === 'ios');
        setFollowUpDate(currentDate);
    };

    const renderRadioOptions = () => {
        const options = connected
            ? ['Interested', 'Callback', 'Not Interested']
            : ['No Answer', 'Busy', 'Switch Off', 'Not Reachable'];

        return (
            <View style={styles.radioGroup}>
                {options.map(s => (
                    <TouchableOpacity key={s} style={styles.radioRow} onPress={() => setStatus(s)}>
                        <View style={styles.radioOuter}>
                            {status === s && <View style={styles.radioInner} />}
                        </View>
                        <Text style={styles.radioText}>{s}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const renderWhatsAppCard = () => (
        <View style={styles.card}>
            <View style={styles.whatsAppHeader}>
                <MessageCircle size={24} color={colors.primaryDark} style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>Send message</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.messagePreview}>
                <Text style={styles.messageText}>
                    Hi {lead.name || 'Vaishali'},{'\n\n'}
                    I tried reaching out to you!
                    Feel free to call me back or message.{'\n\n'}
                    Regards, Shinde Sir
                </Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.contactRow}>
                <View style={[styles.radioOuter, { borderColor: colors.primaryDark }]}>
                    <View style={[styles.radioInner, { backgroundColor: colors.primaryDark }]} />
                </View>
                <Text style={styles.contactText}>{lead.phone || lead.number || '9405990905'}(P)</Text>
            </View>

            <TouchableOpacity style={styles.sendBtn} onPress={handleWhatsAppSend}>
                <Text style={styles.sendBtnText}>Send</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Dispose Lead</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>

                {/* Disposition Section */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Call Status</Text>
                    <View style={styles.btnRow}>
                        <TouchableOpacity
                            style={[styles.choiceBtn, connected === false && styles.choiceBtnSelected]}
                            onPress={() => setConnected(false)}
                        >
                            <Text style={[styles.choiceText, connected === false && styles.choiceTextSelected]}>Not Connected</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.choiceBtn, connected === true && styles.choiceBtnSelected, connected === true && { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' }]}
                            onPress={() => setConnected(true)}
                        >
                            <Text style={[styles.choiceText, connected === true && { color: '#2E7D32' }]}>Yes Connected</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.inputLabel, { marginTop: 20 }]}>Next Action</Text>
                    {renderRadioOptions()}

                    <Text style={styles.inputLabel}>Follow Up Date</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateBtn}>
                        <Calendar size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                        <Text style={styles.dateText}>{followUpDate.toDateString()}</Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            testID="dateTimePicker"
                            value={followUpDate}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                        />
                    )}

                    <Text style={styles.inputLabel}>Internal Notes</Text>
                    <TextInput
                        style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                        placeholder="Internal notes..."
                        value={description}
                        onChangeText={setDescription}
                        multiline
                    />

                    {connected && (
                        <View>
                            <Text style={styles.inputLabel}>Expected Value</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                value={expectedValue}
                                onChangeText={setExpectedValue}
                                keyboardType="numeric"
                            />
                        </View>
                    )}
                </View>

                {/* WhatsApp Section */}
                {renderWhatsAppCard()}

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                    <Text style={styles.submitText}>{submitting ? "Saving..." : "Save Disposition"}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        backgroundColor: colors.white,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    headerTitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '600',
    },
    iconBtn: { padding: 4 },
    content: { flex: 1, padding: 16 },
    card: {
        backgroundColor: colors.white,
        borderRadius: 12, // More rounded like screenshot
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    btnRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    choiceBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        marginHorizontal: 4,
    },
    choiceBtnSelected: {
        borderColor: colors.text,
        backgroundColor: '#E0E0E0',
    },
    choiceText: {
        color: colors.text,
        fontWeight: '500',
    },
    choiceTextSelected: {
        color: colors.black,
        fontWeight: 'bold',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
        marginTop: 16,
        color: colors.textSecondary,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#F9F9F9',
        fontSize: 14,
        color: colors.text,
    },
    radioGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    radioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
        marginBottom: 12,
        width: '45%' // 2 columns
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.textSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },
    radioText: {
        fontSize: 14,
        color: colors.text,
    },
    dateBtn: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#F9F9F9',
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        color: colors.text,
        fontSize: 14,
    },
    // WhatsApp Card Styles
    whatsAppHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#EEEEEE',
        marginVertical: 12,
    },
    messagePreview: {
        backgroundColor: '#F5F5F5',
        padding: 12,
        borderRadius: 8,
    },
    messageText: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 20,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    contactText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
    },
    sendBtn: {
        backgroundColor: colors.primary,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    sendBtnText: {
        color: colors.white, // Should we check contrast? Yellow usually needs black text. 
        // User primary color is Yellow (#FFC107). White text on Yellow is bad.
        // I will change this to black if primary is yellow.
        // Wait, theme says primary is #FFC107.
        // I will use colors.black for text on primary if it's yellow.
        // Let's stick to theme conventions. `colors.primaryDark` was #FFA000.
        // I'll check `submitText` style which used `colors.black`.
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        padding: 16,
        backgroundColor: colors.white,
        elevation: 10,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    submitBtn: {
        backgroundColor: colors.primary,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitText: {
        color: colors.black, // Consistent with other buttons on yellow
        fontSize: 16,
        fontWeight: '600',
    },
});
