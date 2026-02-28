import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, CheckCircle2, Clock, Calendar, FileText } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { LeadsService } from '../services/LeadsService';

export const CallSummaryScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { leadId, formData, callLog, leadName } = route.params;
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {

        console.log("Form Data:", JSON.stringify(formData, null, 2));
        setSubmitting(true);
        try {
            // Prepare payload according to API requirements
            const payload = {
                leadId: leadId,
                status: formData.connected ? formData.status : 'follow up',
                followupdate: formData.followUpDate,
                contacted: formData.connected,
                // When connected: send description + expectedValue
                ...(formData.connected && {
                    note_desc: formData.description,
                    expectedValue: formData.expectedValue,
                }),
                // When NOT connected: pass selected status as note_desc
                ...(!formData.connected && {
                    note_desc: formData.status,
                }),
            };


            // 1. Log the call if callLog is present
            if (callLog) {
                const callPayload = {
                    leadId: leadId,
                    callTime: new Date(callLog.timestamp).toISOString(),
                    durationSeconds: callLog.duration,
                    callStatus: formData.connected ? 'connected' : 'not_connected',
                    callType: callLog.type ? callLog.type.toLowerCase() : 'outgoing',
                    recordingLink: callLog.recordingPath || null,
                    notes: `Call Summary: ${formData.status}`
                };
                console.log("Logging specific call:", callPayload);
                await LeadsService.logCall(callPayload);
            }

            // 2. Submit Lead Update
            console.log("Submitting Payload:", JSON.stringify(payload, null, 2));

            await LeadsService.updateLeadBySalesperson(payload);

            Alert.alert("Success", "Call log stored and lead updated successfully", [
                {
                    text: "OK",
                    onPress: () => {
                        // Navigate to 'Leads' tab within 'MainTabs' stack
                        navigation.navigate('MainTabs', { screen: 'Leads' });
                        // fallback if MainTabs isn't found
                        // navigation.navigate('Leads'); 
                    }
                }
            ]);
        } catch (error: any) {
            // console.error("Submission Error:", error);
            // if status is 409 then show error message we cant desponse same lead     
            if (error.response && error.response.status === 409) {
                Alert.alert("Warning", "We can't respond to the same lead");
            } else {
                Alert.alert("Error", error.message);
            };
        } finally {
            setSubmitting(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Call Summary</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* Call Details Card */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Call Details</Text>
                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <View style={styles.iconBox}><Clock size={20} color={colors.primary} /></View>
                        <View style={styles.infoBox}>
                            <Text style={styles.label}>Duration</Text>
                            <Text style={styles.value}>
                                {callLog ? formatDuration(callLog.duration) : '0:00'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.iconBox}><Calendar size={20} color={colors.primary} /></View>
                        <View style={styles.infoBox}>
                            <Text style={styles.label}>Time</Text>
                            <Text style={styles.value}>
                                {callLog ? new Date(callLog.timestamp).toLocaleString() : new Date().toLocaleString()}
                            </Text>
                        </View>
                    </View>

                    {callLog?.recordingPath && (
                        <View style={styles.row}>
                            <View style={styles.iconBox}><FileText size={20} color={colors.primary} /></View>
                            <View style={styles.infoBox}>
                                <Text style={styles.label}>Recording</Text>
                                <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
                                    {callLog.recordingPath.split('/').pop()}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Disposition Data Card */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Disposition Details</Text>
                    <View style={styles.divider} />

                    <DetailItem label="Lead Name" value={leadName || 'Unknown'} />
                    <DetailItem label="Status" value={formData.status.toUpperCase()} />
                    <DetailItem label="Follow Up" value={new Date(formData.followUpDate).toDateString()} />
                    <DetailItem label="Contacted" value={formData.connected ? "Yes" : "No"} />

                    {formData.connected && (
                        <>
                            <DetailItem label="Expected Value" value={formData.expectedValue || '-'} />
                            <View style={styles.descBox}>
                                <Text style={styles.label}>Description:</Text>
                                <Text style={styles.descText}>{formData.description || 'No description provided.'}</Text>
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                    {submitting ? (
                        <Text style={styles.submitText}>Submitting...</Text>
                    ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <CheckCircle2 size={20} color={colors.black} style={{ marginRight: 8 }} />
                            <Text style={styles.submitText}>Confirm & Submit</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const DetailItem = ({ label, value }: { label: string, value: string }) => (
    <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}:</Text>
        <Text style={styles.detailValue}>{value}</Text>
    </View>
);

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
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#EEEEEE',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF8E1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    infoBox: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    value: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F9F9F9',
        paddingBottom: 8,
    },
    detailLabel: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    detailValue: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '600',
    },
    descBox: {
        marginTop: 8,
        backgroundColor: '#F9F9F9',
        padding: 12,
        borderRadius: 8,
    },
    descText: {
        marginTop: 4,
        color: colors.text,
        fontSize: 14,
        fontStyle: 'italic',
    },
    footer: {
        padding: 16,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    submitBtn: {
        backgroundColor: colors.primary,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitText: {
        color: colors.black,
        fontSize: 16,
        fontWeight: 'bold',
    }
});
