import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  AppState,
  TextInput,
  PermissionsAndroid,
  NativeModules,
  NativeEventEmitter,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, RefreshCw, PenSquare, ChevronUp, ChevronDown } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { Lead } from '../types/Lead';
import RNFS from 'react-native-fs';
import { CallLogService } from '../services/CallLogService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LeadsService } from '../services/LeadsService';
import { MessageCircle, MessageSquare } from 'lucide-react-native';

// import AudioRecorderPlayer from 'react-native-audio-recorder-player'; // REMOVED


const LEAD_STATUS = {
  NEW: "New",
  QUALIFIED: "Qualified",
  FOLLOW_UP: "Followup",
  DEMO_BOOKED: "Demo Booked",
  DEMO_COMPLETED: "Demo Completed",
  DEMO_RESCHEDULED: "Demo Rescheduled",
  NIFC: "Not Interested for Full Course (NIFC)",
  MAY_BE_BUY_LATER: "May be Buy Later",
  POSITIVE: "Positive",
  ENROLLED: "Enrolled",
};

const NOT_CONNECTED_REASONS = [
  "Did not pick",
  "Busy in another call",
  "User disconnected the call",
  "Switch off",
  "Out of coverage",
  " Wrong Number",
  "Incomings not available",
  "Not exist/ Number not in use / Out of service"
];

const { PhoneModule } = NativeModules;
// Removed top-level instantiation to avoid constructor error

// Top level tabs
type Tab = 'LEAD_INFO' | 'DISPOSE_LEAD';

export const LeadDetailsScreen = () => {
  // const audioRecorderPlayer = AudioRecorderPlayer; // REMOVED

  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { lead } = route.params as { lead: Lead };
  const [activeTab, setActiveTab] = useState<Tab>('LEAD_INFO');
  const [subTab, setSubTab] = useState<'About' | 'Timeline'>('About');

  // Collapse states for sections
  const [basicDetailsOpen, setBasicDetailsOpen] = useState(true);
  const [progressOpen, setProgressOpen] = useState(true);

  // Recording state removed, managed natively


  // Dispose Form State
  const [connected, setConnected] = useState<boolean | null>(null);
  const [disposeStatus, setDisposeStatus] = useState('');
  const [description, setDescription] = useState('');
  const [expectedValue, setExpectedValue] = useState('');
  const [followUpDate, setFollowUpDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastRecordingPath, setLastRecordingPath] = useState<string | null>(null);
  const [timelineLogs, setTimelineLogs] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [expandedLogIndex, setExpandedLogIndex] = useState<number | null>(null);

  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.CALL_PHONE,
        ]);

        if (
          grants['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
          grants['android.permission.READ_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED &&
          grants['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED &&
          grants['android.permission.CALL_PHONE'] === PermissionsAndroid.RESULTS.GRANTED
        ) {
          console.log('Permissions granted');
          return true;
        } else {
          if (grants['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED) {
            return true;
          }
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handleCallNow = async () => {
    // 2. Check Permissions
    const hasPermission = await checkPermissions();
    if (hasPermission) {
      // PhoneModule.startCallListener(); // Ensure listener is active
      PhoneModule.makeCall(lead.phone || lead.number);
      // navigation.navigate('CallScreen', { number: lead.phone || lead.number, name: getLeadName() });
    } else {
      Alert.alert(
        "Permission Required",
        "Call permission is required to make calls. Please enable it in settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() }
        ]
      );
    }
  };

  useEffect(() => {
    const eventEmitter = new NativeEventEmitter(PhoneModule);
    const subscription = eventEmitter.addListener('CallRemoved', (event: any) => {
      console.log("Call Ended Event:", event);
      const recPath = event ? event.recordingPath : null;
      if (recPath) {
        setLastRecordingPath(recPath);
      }

      // Auto switch to Dispose
      Alert.alert("Call Ended", "Proceed to dispose lead?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes", onPress: () => {
            setActiveTab('DISPOSE_LEAD');
            // If we had the recording path here, we could potentially set it in state 
            // to ensure it's passed when CallSummary screen is opened (if it is opened from here).
            // However, CallSummaryScreen is likely a separate navigation or a modal. 
            // If LeadDetailsScreen handles the "Dispose" form, then we just need to ensure 
            // handleProceed uses the updated 'lastRecordingPath'.
          }
        }
      ]);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Fetch timeline events from backend
  useEffect(() => {
    const fetchTimelineLogs = async () => {
      if (!lead._id && !lead.id) return;
      setTimelineLoading(true);
      try {
        const events = await CallLogService.getLeadTimeline(lead._id || lead.id || '');
        // Backend events are already sorted newest-first
        setTimelineLogs(events);
      } catch (e) {
        console.error('Timeline fetch error', e);
      } finally {
        setTimelineLoading(false);
      }
    };
    fetchTimelineLogs();
  }, [lead._id, lead.id]);

  // // ... render ...
  // console.log("lead", lead);

  const getLeadName = () => {
    if (lead.firstName || lead.lastName) {
      return `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
    }
    return lead.name || 'Unknown';
  };

  const renderBasicDetails = () => (
    <View style={styles.sectionCard}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setBasicDetailsOpen(!basicDetailsOpen)}
      >
        <Text style={styles.sectionTitle}>Basic Details</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* <PenSquare size={16} color={colors.textSecondary} style={{ marginRight: 10 }} /> */}
          {basicDetailsOpen ? <ChevronUp size={20} color={colors.text} /> : <ChevronDown size={20} color={colors.text} />}
        </View>
      </TouchableOpacity>

      {basicDetailsOpen && (
        <View style={styles.sectionContent}>
          <DetailRow label="Lead Name" value={getLeadName()} />
          <DetailRow label="Mobile Number" value={lead.phone || lead.number || '-'} />
          <DetailRow label="Alternate Number" value={lead.alt_phone || lead.alternateNumber || '-'} />
          <DetailRow label="Email Address" value={lead.email || '-'} />
          <DetailRow label="Creation Time" value={new Date(lead.created || lead.createdAt || Date.now()).toLocaleDateString()} />
        </View>
      )}
    </View>
  );

  const renderNotes = () => (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Notes</Text>
      </View>
      <View style={styles.sectionContent}>
        {(lead.notes && lead.notes.length > 0) ? (
          lead.notes.map((note: any, index: number) => {
            let noteData = note;
            // If note itself is a string, try to parse it or treat as description
            if (typeof note === 'string') {
              try {
                const parsed = JSON.parse(note);
                if (typeof parsed === 'object' && parsed !== null) {
                  noteData = parsed;
                } else {
                  noteData = { description: note };
                }
              } catch (e) {
                noteData = { description: note };
              }
            }

            // If noteData has a 'note' field that might be JSON
            if (noteData.note && typeof noteData.note === 'string') {
              try {
                const parsed = JSON.parse(noteData.note);
                if (typeof parsed === 'object' && parsed !== null) {
                  noteData = { ...noteData, ...parsed };
                } else {
                  if (!noteData.description) noteData.description = noteData.note;
                }
              } catch (e) {
                if (!noteData.description) noteData.description = noteData.note;
              }
            }

            const description = noteData.note_desc || noteData.notes || 'No description';
            const dateVal = noteData.date || noteData.createdAt || noteData.timestamp;

            let dateStr = '';
            if (dateVal) {
              try {
                dateStr = new Date(dateVal).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              } catch (e) { }
            }

            // Resolve addedBy name
            let addedByName = 'System';
            if (noteData.addedBy) {
              if (typeof noteData.addedBy === 'object') {
                addedByName = noteData.addedBy.name || noteData.addedBy.username || 'System';
              } else {
                addedByName = String(noteData.addedBy);
              }
            } else if (noteData.addedByName) {
              addedByName = noteData.addedByName;
            }

            return (
              <View key={index} style={styles.noteItem}>
                <View style={styles.noteHeaderRow}>
                  <Text style={styles.noteLabel}>{addedByName}</Text>
                  <Text style={styles.noteDate}>{dateStr}</Text>
                </View>
                <Text style={styles.noteText}>
                  {typeof description === 'string' ? description : JSON.stringify(description)}
                </Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.noDataText}>No notes available</Text>
        )}
      </View>
    </View>
  );

  const renderLeadProgress = () => (
    <View style={styles.sectionCard}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setProgressOpen(!progressOpen)}
      >
        <Text style={styles.sectionTitle}>Lead Progress</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* <PenSquare size={16} color={colors.textSecondary} style={{ marginRight: 10 }} /> */}
          {progressOpen ? <ChevronUp size={20} color={colors.text} /> : <ChevronDown size={20} color={colors.text} />}
        </View>
      </TouchableOpacity>

      {progressOpen && (
        <View style={styles.sectionContent}>
          <View style={styles.row}>
            <Text style={styles.label}>Stage:</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{lead.leadStatus || lead.status || 'New'}</Text>
            </View>
          </View>
          <DetailRow label="Lead Source" value={lead.leadSource || '-'} />
          <DetailRow label="Follow-Up Date" value={lead.next_followup_date ? new Date(lead.next_followup_date).toLocaleDateString() : (lead.followUpDate || '-')} />
          <DetailRow
            label="Assigned To"
            value={
              (typeof lead.assigned_to === 'object' && lead.assigned_to.name !== null ? (lead.assigned_to as any).name || (lead.assigned_to as any).username : lead.assigned_to) ||
              (typeof lead.assignedUser === 'object' && lead.assignedUser !== null ? (lead.assignedUser as any).name || (lead.assignedUser as any).username : lead.assignedUser) ||
              '-'
            }
          />
          {lead.stage && <DetailRow label="Stage" value={lead.stage} />}
          {lead.tag && <DetailRow label="Tag" value={lead.tag} />}
          {lead.dealAmount && <DetailRow label="Deal Amount" value={lead.dealAmount} />}
        </View>
      )}
    </View>
  );

  // --- Dispose Logic ---

  const fetchTodayCallLog = async () => {
    try {
      // Use CallLogService to get native logs for today to verify call attempt
      const logs = await CallLogService.getCallLogsByDay(0);
      const normalize = (num: string) => num.replace(/[^0-9]/g, '');
      const leadNum = normalize(lead.phone || lead.number || '');

      if (!leadNum) return null;

      // Find the most recent call to/from this number
      const call = logs.find(log => {
        const logNum = normalize(log.phoneNumber);
        return logNum.includes(leadNum) || leadNum.includes(logNum);
      });
      return call;
    } catch (e) {
      console.error("Error fetching logs", e);
      return null;
    }
  };

  const handleProceed = async () => {
    if (connected === null) {
      Alert.alert("Error", "Please select if the call was connected.");
      return;
    }
    if (!disposeStatus) {
      Alert.alert("Error", "Please select a status.");
      return;
    }

    setIsProcessing(true);
    try {
      const matchedCall = await fetchTodayCallLog();

      const formData = {
        connected,
        status: disposeStatus,
        description,
        expectedValue,
        followUpDate: followUpDate.toISOString(),
      };

      // Find if there is a recorded file from this session
      // We might want to pass the recording path if we just finished a call
      // For now, rely on matching call log or existing logic

      navigation.navigate('CallSummary', {
        leadId: lead._id || lead.id,
        leadName: getLeadName(),
        formData,
        callLog: matchedCall ? {
          duration: matchedCall.duration,
          timestamp: matchedCall.timestamp,
          recordingPath: lastRecordingPath // Pass the recorded file path
        } : (lastRecordingPath ? {
          duration: 0, // Duration will be handled in summary if needed or from logs
          timestamp: Date.now(),
          recordingPath: lastRecordingPath
        } : null)
      });

    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setIsProcessing(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || followUpDate;
    setShowDatePicker(Platform.OS === 'ios');
    setFollowUpDate(currentDate);
    if (Platform.OS === 'android') {
      setShowTimePicker(true);
    }
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || followUpDate;
    setShowTimePicker(Platform.OS === 'ios');
    setFollowUpDate(currentDate);
  };

  const handleSendMessage = () => {
    const message = connected
      ? "Thanks for connecting if any issue call this number or msg"
      : `Hello ${getLeadName()},
      ${typeof lead.assigned_to === 'object' && lead.assigned_to.name !== null ? (lead.assigned_to as any).name : lead.assigned_to} from this side from YD Baba Organisation, I am trying to connect with you but not able to connect please let me know when you are available to connect over the call`;

    Linking.openURL(`sms:${lead.phone || lead.number}?body=${message}`);
  };

  const handleSendWhatsApp = () => {
    const message = connected
      ? "Thanks for connecting if any issue call this number or msg"
      : `Hello ${getLeadName()},
      ${typeof lead.assigned_to === 'object' && lead.assigned_to.name !== null ? (lead.assigned_to as any).name : lead.assigned_to} from this side from YD Baba Organisation, I am trying to connect with you but not able to connect please let me know when you are available to connect over the call`;


    const rawPhone = lead.phone || lead.number || '';
    const phone = rawPhone.startsWith('+91') ? rawPhone : `+91${rawPhone}`;

    Linking.openURL(`whatsapp://send?phone=${phone}&text=${message}`);
  };

  const renderDisposeContent = () => (
    <View style={styles.disposeContainer}>
      <View style={styles.card}>
        <Text style={styles.question}>Was call connected?</Text>
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.choiceBtn, connected === false && styles.choiceBtnSelected]}
            onPress={() => { setConnected(false); setDisposeStatus(''); }} // Clear status on toggle
          >
            <Text style={[styles.choiceText, connected === false && styles.choiceTextSelected]}>Not Connected</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.choiceBtn, connected === true && styles.choiceBtnSelected, connected === true && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }]}
            onPress={() => { setConnected(true); setDisposeStatus(''); }}
          >
            <Text style={[styles.choiceText, connected === true && { color: 'white' }]}>Yes Connected</Text>
          </TouchableOpacity>
        </View>
      </View>

      {(connected !== null) && (
        <View style={styles.card}>

          {/* Messaging Options */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#25D366' }]} onPress={handleSendWhatsApp}>
              <MessageCircle color="white" size={20} />
              <Text style={styles.actionBtnText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2196F3' }]} onPress={handleSendMessage}>
              <MessageSquare color="white" size={20} />
              <Text style={styles.actionBtnText}>Message</Text>
            </TouchableOpacity>
          </View>

          {connected ? (
            <>
              <Text style={styles.inputLabel}>Stages</Text>
              <View style={styles.statusGrid}>
                {Object.values(LEAD_STATUS).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusOption, disposeStatus === s && styles.statusOptionSelected]}
                    onPress={() => setDisposeStatus(s)}
                  >
                    <Text style={[styles.statusTextOption, disposeStatus === s && { color: colors.primary, fontWeight: 'bold' }]}>
                      {s.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Enter call discussion..."
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <Text style={styles.inputLabel}>Expected Value</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={expectedValue}
                onChangeText={setExpectedValue}
                keyboardType="numeric"
              />
            </>
          ) : (
            <>
              <Text style={styles.inputLabel}>Reason</Text>
              <View style={styles.statusGrid}>
                {NOT_CONNECTED_REASONS.map((s) => (

                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusOption,
                      disposeStatus === s && styles.statusOptionSelected,
                      { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }
                    ]}
                    onPress={() => setDisposeStatus(s)}
                  >
                    <View style={styles.radioCircle}>
                      {disposeStatus === s && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.radioText, { marginLeft: 8 }]}>{s}</Text>
                  </TouchableOpacity>

                ))}
              </View >

              <Text style={styles.inputLabel}>Dispose Remark</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Enter remark..."
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </>
          )}

          <Text style={styles.inputLabel}>Follow Up Date & Time</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateBtn}>
            <Text style={styles.dateText}>{followUpDate.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
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

          {showTimePicker && (
            <DateTimePicker
              testID="timePicker"
              value={followUpDate}
              mode="time"
              display="default"
              onChange={onTimeChange}
            />
          )}

          <TouchableOpacity style={styles.proceedBtn} onPress={handleProceed} disabled={isProcessing}>
            <Text style={styles.proceedText}>{isProcessing ? "Processing..." : "Proceed to Summary"}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leads Details</Text>
        <TouchableOpacity style={styles.iconBtn}>
          <RefreshCw size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TabButton title="LEAD DETAILS" isActive={activeTab === 'LEAD_INFO'} onPress={() => setActiveTab('LEAD_INFO')} />
        <TabButton title="DISPOSE LEAD" isActive={activeTab === 'DISPOSE_LEAD'} onPress={() => setActiveTab('DISPOSE_LEAD')} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Timer / Banner */}


        {activeTab === 'LEAD_INFO' && (
          <>
            {/* Sub Tabs */}
            <View style={styles.subTabContainer}>
              <TouchableOpacity
                style={[styles.subTab, subTab === 'About' && styles.subTabActive]}
                onPress={() => setSubTab('About')}
              >
                <Text style={[styles.subTabText, subTab === 'About' && styles.subTabTextActive]}>About</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTab, subTab === 'Timeline' && styles.subTabActive]}
                onPress={() => setSubTab('Timeline')}
              >
                <Text style={[styles.subTabText, subTab === 'Timeline' && styles.subTabTextActive]}>Timeline</Text>
              </TouchableOpacity>
            </View>


            <ScrollView style={styles.scrollContent}>
              {subTab === 'About' ? (
                <>
                  {renderBasicDetails()}
                  {renderNotes()}
                  {renderLeadProgress()}
                  <View style={{ height: 100 }} />
                </>
              ) : (
                <View style={styles.timelineContainer}>
                  {/* Header */}
                  <View style={styles.tlHeader}>
                    <Text style={styles.tlHeaderText}>Activities</Text>
                  </View>

                  {timelineLoading && (
                    <Text style={{ color: colors.textSecondary, marginBottom: 12, textAlign: 'center' }}>Loading history...</Text>
                  )}

                  {/* Build unified event list from backend + lead created */}
                  {(() => {
                    // Append a local "Lead Created" event at the end (backend doesn't include it)
                    const createdDate = new Date(lead.created || lead.createdAt || Date.now());
                    const createdSource = lead.leadSource || 'System';

                    const allEvts: any[] = [
                      ...timelineLogs, // already sorted newest-first by backend
                      { kind: 'CREATED', date: createdDate.toISOString(), timestamp: createdDate.getTime(), source: createdSource },
                    ];

                    // Helper: date badge string
                    const dateBadge = (d: Date) =>
                      d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

                    let lastBadge = '';

                    return allEvts.map((evt: any, i: number) => {
                      const evtDate = new Date(evt.date || evt.timestamp);
                      const badge = dateBadge(evtDate);
                      const showBadge = badge !== lastBadge;
                      lastBadge = badge;
                      const isLast = i === allEvts.length - 1;

                      if (evt.kind === 'CALL') {
                        const expanded = expandedLogIndex === i;
                        // Icon colour: grey for not_connected, red for missed, green for answered
                        const isNotConnected = (evt.label || '').toLowerCase().includes('not_connected') || (evt.label || '').toLowerCase().includes('not connected');
                        const iconBg = isNotConnected ? '#9E9E9E' : evt.isMissed ? '#F44336' : '#4CAF50';
                        return (
                          <View key={`call-${evt.logId || i}`} style={styles.tlRow}>
                            <View style={styles.tlDateCol}>
                              {showBadge && <View style={styles.tlDateBadge}><Text style={styles.tlDateText}>{badge}</Text></View>}
                            </View>
                            <View style={styles.tlSpineCol}>
                              {!isLast && <View style={styles.tlSpineLine} />}
                              <View style={[styles.tlIconCircle, { backgroundColor: iconBg }]}>
                                <Text style={{ color: 'white', fontSize: 16 }}>📞</Text>
                              </View>
                            </View>
                            <TouchableOpacity
                              style={[styles.tlCard, expanded && styles.tlCardExpanded]}
                              onPress={() => setExpandedLogIndex(expanded ? null : i)}
                              activeOpacity={0.8}
                            >
                              <View style={styles.tlCardRow}>
                                <Text style={styles.tlCallLabel}>{evt.label} | {evt.timeStr}</Text>
                                <Text style={styles.tlChevron}>{expanded ? '▲' : '▼'}</Text>
                              </View>
                              {expanded && (
                                <View style={styles.tlExpanded}>
                                  <View style={styles.tlDetailRow}>
                                    <Text style={styles.tlDetailLabel}>Call Duration</Text>
                                    <Text style={styles.tlDetailValue}>{evt.durStr}</Text>
                                  </View>
                                  {evt.addedBy && (
                                    <View style={styles.tlDetailRow}>
                                      <Text style={styles.tlDetailLabel}>Agent</Text>
                                      <Text style={styles.tlDetailValue}>{evt.addedBy}</Text>
                                    </View>
                                  )}
                                </View>
                              )}
                            </TouchableOpacity>
                          </View>
                        );
                      }

                      if (evt.kind === 'NOTE') {
                        return (
                          <View key={`note-${evt.noteId || i}`} style={styles.tlRow}>
                            <View style={styles.tlDateCol}>
                              {showBadge && <View style={styles.tlDateBadge}><Text style={styles.tlDateText}>{badge}</Text></View>}
                            </View>
                            <View style={styles.tlSpineCol}>
                              {!isLast && <View style={styles.tlSpineLine} />}
                              <View style={[styles.tlIconCircle, { backgroundColor: '#FF9800' }]}>
                                <Text style={{ color: 'white', fontSize: 14 }}>📝</Text>
                              </View>
                            </View>
                            <View style={styles.tlCard}>
                              <Text style={styles.tlNoteTitle}>Note Added</Text>
                              <Text style={styles.tlNoteDesc}>{evt.desc}</Text>
                              {evt.addedBy && <Text style={styles.tlAddedBy}>Added by: {evt.addedBy}</Text>}
                            </View>
                          </View>
                        );
                      }

                      // CREATED
                      return (
                        <View key={`created-${i}`} style={styles.tlRow}>
                          <View style={styles.tlDateCol}>
                            {showBadge && <View style={styles.tlDateBadge}><Text style={styles.tlDateText}>{badge}</Text></View>}
                          </View>
                          <View style={styles.tlSpineCol}>
                            <View style={[styles.tlIconCircle, { backgroundColor: '#9C27B0' }]}>
                              <Text style={{ color: 'white', fontSize: 16 }}>👤</Text>
                            </View>
                          </View>
                          <View style={styles.tlCard}>
                            <Text style={styles.tlCallLabel}>Lead Created | Source: {evt.source}</Text>
                            <Text style={styles.tlAddedBy}>{evtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                          </View>
                        </View>
                      );
                    });
                  })()}
                  <View style={{ height: 80 }} />
                </View>


              )}
            </ScrollView>
          </>
        )}

        {activeTab === 'DISPOSE_LEAD' && (
          <ScrollView style={styles.scrollContent}>
            {renderDisposeContent()}
            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </View>

      {/* Footer Call Button */}
      {activeTab != 'DISPOSE_LEAD' && (
        < View style={styles.footer}>
          <TouchableOpacity style={styles.footerCallBtn} onPress={handleCallNow}>
            <Text style={styles.footerCallText}>Call Now</Text>
          </TouchableOpacity>
        </View>)}

    </SafeAreaView >
  );
};



const CallHistoryList = ({ lead }: { lead: Lead }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Use ID dependency to prevent infinite reloads if lead object reference changes
  useEffect(() => {
    loadLogs();
  }, [lead._id, lead.id]);

  const loadLogs = async () => {
    try {
      // Don't set loading true if we already have logs to avoid flash, or keep it if UX needs it.
      // Better to check if we are already loading or if id changed.
      // For now, let's keep it simple but rely on ID stability.
      setLoading(true);
      let remoteLogs: any[] = [];
      if (lead._id || lead.id) {
        remoteLogs = await CallLogService.getRemoteCallLogs(lead._id || lead.id || '');
      }
      // Check if component is mounted or if result is valid before setting state? 
      // React handles unmount updates with warning, but safe here.
      setLogs(remoteLogs.sort((a: any, b: any) => b.timestamp - a.timestamp));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Text style={{ padding: 10, color: colors.textSecondary }}>Loading call history...</Text>;
  if (logs.length === 0) return <Text style={{ padding: 10, color: colors.textSecondary }}>No recent call history found.</Text>;

  return (
    <View>
      {logs.map((log, i) => (
        <View key={i} style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.white,
          padding: 12,
          borderRadius: 8,
          marginBottom: 8,
          elevation: 1,
          borderWidth: 1,
          borderColor: '#EEEEEE'
        }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: (log.type === 'OUTGOING' || log.type === 'Outgoing') ? '#E3F2FD' : ((log.type === 'INCOMING' || log.type === 'Incoming') ? '#E8F5E9' : '#FFEBEE'),
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12
          }}>
            <Text style={{ fontSize: 18 }}>
              {(log.type === 'OUTGOING' || log.type === 'Outgoing') ? '↗' : ((log.type === 'INCOMING' || log.type === 'Incoming') ? '↙' : '✕')}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: 'bold', color: colors.text }}>
              {(log.type === 'MISSED' || log.type === 'Missed') ? 'Missed Call' : `${log.type} Call`}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {new Date(Number(log.timestamp)).toLocaleString()}
            </Text>
          </View>
          <View>
            <Text style={{ color: colors.text, fontWeight: '500' }}>
              {Math.floor(log.duration / 60)}:{(log.duration % 60).toString().padStart(2, '0')}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const DetailRow = ({ label, value }: { label: string, value: string }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}:</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const TabButton = ({ title, isActive, onPress }: { title: string, isActive: boolean, onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={[styles.tabBtn, isActive && styles.tabBtnActive]}>
    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{title}</Text>
  </TouchableOpacity>
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
  iconBtn: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  timerBanner: {
    backgroundColor: '#F3E5F5',
    padding: 8,
    alignItems: 'center',
  },
  timerText: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  radioContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
    justifyContent: "flex-end",
  },

  radioCircle: {
    height: 12,
    width: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#2563EB", // primary color


  },

  radioInner: {
    height: 10,
    width: 10,

    borderRadius: 5,
    backgroundColor: "#2563EB",

  },

  radioText: {
    fontSize: 12,
    color: "#1F2937",
  },
  subTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: {
    borderBottomColor: '#4A148C',
  },
  subTabText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  subTabTextActive: {
    color: '#4A148C',
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  sectionContent: {
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  value: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    flex: 1, // approximate
    textAlign: 'right'
  },
  statusBadge: {
    backgroundColor: '#FFF8E1', // Light yellow
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: 'bold',
  },
  noteItem: {
    padding: 8,
    backgroundColor: '#F9F9F9',
    borderRadius: 4,
    marginBottom: 8,
  },
  noteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
  },
  noteDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  noteText: {
    color: colors.text,
    fontSize: 14,
  },
  noDataText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    backgroundColor: colors.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerCallBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  footerCallText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: 'bold',
  },
  disposeContainer: {
    padding: 4,
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    color: colors.text,
  },
  timelineContainer: {
    padding: 0,
    paddingTop: 12,
  },
  // Legacy (kept for safety)
  timelineItem: { flexDirection: 'row', marginBottom: 20 },
  timelineLeft: { alignItems: 'center', marginRight: 16, width: 20 },
  timelineLine: { position: 'absolute', top: 0, bottom: -20, width: 2, backgroundColor: '#E0E0E0', zIndex: -1 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary, marginTop: 4 },
  timelineContent: { flex: 1, backgroundColor: colors.white, padding: 12, borderRadius: 8, elevation: 1 },
  timelineTitle: { fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  timelineDate: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  timelineDesc: { fontSize: 14, color: colors.text },
  // New timeline styles
  tlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  tlHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  tlRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  tlDateCol: {
    width: 100,
    alignItems: 'flex-end',
    paddingRight: 8,
    paddingTop: 10,
  },
  tlDateBadge: {
    backgroundColor: '#EFEFEF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tlDateText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tlSpineCol: {
    width: 44,
    alignItems: 'center',
    position: 'relative',
  },
  tlSpineLine: {
    position: 'absolute',
    top: 44,
    bottom: -16,
    width: 2,
    backgroundColor: '#D0D0D0',
    left: 21,
  },
  tlIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 12,
    marginLeft: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  tlCardExpanded: {
    borderColor: '#E0E0E0',
    borderWidth: 1,
  },
  tlCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tlCallLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    flexWrap: 'wrap',
  },
  tlChevron: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  tlExpanded: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
  },
  tlDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tlDetailLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  tlDetailValue: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  tlNoteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  tlNoteDesc: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 6,
  },
  tlAddedBy: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: '#FAFAFA',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  statusOption: {
    width: '48%',
    margin: '1%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  statusOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FFFDE7', // Light yellow
  },
  statusTextOption: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dateBtn: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  dateText: {
    color: colors.text,
    fontSize: 14,
  },
  proceedBtn: {
    backgroundColor: colors.primary,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  proceedText: {
    color: colors.black,
    fontWeight: 'bold',
    fontSize: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  actionBtnText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  }
});
