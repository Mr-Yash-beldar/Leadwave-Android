import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, Check, Circle } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { Lead } from '../types/Lead';
import { LeadsService } from '../services/LeadsService';
import { CallLogService } from '../services/CallLogService';
import DateTimePicker from '@react-native-community/datetimepicker';

export const LeadDisposeScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { lead, callData } = route.params as { lead: Lead, callData?: { path: string, duration: string } };

    const [connected, setConnected] = useState<boolean | null>(null);

    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('');
    const [expectedValue, setExpectedValue] = useState('');
    const [followUpDate, setFollowUpDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [purchaseDate, setPurchaseDate] = useState(''); // Keeping for now if needed, or remove? User said "plan date" before.

    const [submitting, setSubmitting] = useState(false);

    const fetchTodayCallLog = async () => {
        try {
            const logs = await CallLogService.getCallLogsByDay(0);
            // Normalize numbers for comparison (remove spaces, etc.)
            const normalize = (num: string) => num.replace(/[^0-9]/g, '');
            const leadNum = normalize(lead.phone || lead.number || '');
            
            // Find all calls to/from this number today
            const calls = logs.filter(log => normalize(log.phoneNumber).includes(leadNum) || leadNum.includes(normalize(log.phoneNumber)));
            return calls;
        } catch (e) {
            console.error("Error fetching logs", e);
            return [];
        }
    };

    const handleSubmit = async () => {
        if (connected === null) {
            Alert.alert("Error", "Please select if the call was connected.");
            return;
        }
        
        setSubmitting(true);
        try {
             // 1. Get Call Log Data
             const matchedCalls = await fetchTodayCallLog();
             
             // 2. Log calls to API
             console.log("Syncing calls for lead:", lead._id);
             
             // IMPORTANT: We must post call logs first.
             if (matchedCalls && matchedCalls.length > 0) {
                 for (const call of matchedCalls) {
                     let callStatus = 'not_connected';
                     const isConnectedType = (call.type === 'OUTGOING' || call.type === 'INCOMING') ;
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
             } else {
                 console.log("No matching call logs found on device for today.");
                 // We don't block submission, but maybe warn? 
                 // Proceeding as user might have disconnected before log was created or permissions issue.
             }

             // 3. Update API with Lead Status
             const apiStatus = status || (connected ? 'Connected' : 'Not Connected');
             
             // Create a clean JSON string for notes.
             // LeadDetailsScreen expects: { description, expectedValue, followUpDate, ... }
             // We put it in 'note' field or just pass as generic notes.
             // The API likely appends this to an array.
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

    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || followUpDate;
        setShowDatePicker(Platform.OS === 'ios');
        setFollowUpDate(currentDate);
    };

    const renderConnectedForm = () => (
        <View>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput 
                style={[styles.input, {height: 80, textAlignVertical: 'top'}]} 
                placeholder="Enter call description..." 
                value={description}
                onChangeText={setDescription}
                multiline
            />

            <Text style={styles.inputLabel}>Status</Text>
             <View style={styles.radioGroup}>
                {['Interested', 'Callback', 'Not Interested'].map(s => (
                    <TouchableOpacity key={s} style={styles.radioRow} onPress={() => setStatus(s)}>
                         <View style={styles.radioOuter}>
                             {status === s && <View style={styles.radioInner} />}
                         </View>
                         <Text style={styles.radioText}>{s}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.inputLabel}>Expected Value</Text>
            <TextInput 
                style={styles.input} 
                placeholder="0.00" 
                value={expectedValue}
                onChangeText={setExpectedValue}
                keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Follow Up Date</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateBtn}>
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
        </View>
    );

    const renderNotConnectedForm = () => (
        <View>
             <Text style={styles.inputLabel}>Status</Text>
             <View style={styles.radioGroup}>
                {['No Answer', 'Busy', 'Switch Off', 'Not Reachable'].map(s => (
                    <TouchableOpacity key={s} style={styles.radioRow} onPress={() => setStatus(s)}>
                         <View style={styles.radioOuter}>
                             {status === s && <View style={styles.radioInner} />}
                         </View>
                         <Text style={styles.radioText}>{s}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.inputLabel}>Follow Up Date</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateBtn}>
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
                <View style={styles.card}>
                    <Text style={styles.question}>Was call connected?</Text>
                    <View style={styles.btnRow}>
                        <TouchableOpacity 
                            style={[styles.choiceBtn, connected === false && styles.choiceBtnSelected]}
                            onPress={() => setConnected(false)}
                        >
                            <Text style={[styles.choiceText, connected === false && styles.choiceTextSelected]}>Not Connected</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.choiceBtn, connected === true && styles.choiceBtnSelected, connected === true && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }]}
                            onPress={() => setConnected(true)}
                        >
                            <Text style={[styles.choiceText, connected === true && { color: 'white' }]}>Yes Connected</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Dispose Details</Text>
                    <View style={styles.divider} />
                    
                    {connected === true && renderConnectedForm()}
                    {connected === false && renderNotConnectedForm()}
                    {connected === null && <Text style={{color: colors.textSecondary, textAlign:'center', fontStyle:'italic'}}>Select connection status above</Text>}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                    <Text style={styles.submitText}>{submitting ? "Submitting..." : "Send Message"}</Text>
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
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
    },
    question: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 16,
        textAlign: 'center',
    },
    btnRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    choiceBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
        minWidth: 120,
        alignItems: 'center',
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
    sectionTitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginBottom: 16,
    },
    scriptText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 16,
        lineHeight: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 8,
        marginTop: 8,
        color: colors.text,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#FFFFFF',
        marginBottom: 16,
    },
    radioGroup: {
        marginTop: 8,
    },
    radioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingVertical: 4,
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.textSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },
    radioText: {
        fontSize: 16,
        color: colors.text,
    },
    footer: {
        padding: 16,
        backgroundColor: colors.white,
        elevation: 10,
    },
    submitBtn: {
        backgroundColor: colors.primary,
        borderWidth: 1,
        borderColor: colors.primary,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        elevation: 1,
    },
    submitText: {
        color: colors.black,
        fontSize: 16,
        fontWeight: '600',
    },
    dateBtn: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#FFFFFF',
        marginBottom: 16,
    },
    dateText: {
        color: colors.text,
        fontSize: 14,
    }
});
