import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  Modal,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, RefreshCw, PenSquare, ChevronUp, ChevronDown, MessageSquare, Mail, Phone, Calendar as CalendarIcon } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { Lead } from '../types/Lead';
import RNFS from 'react-native-fs';
import { CallLogService } from '../services/CallLogService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LeadsService } from '../services/LeadsService'; import { useAuth } from '../context/AuthContext';
// import AudioRecorderPlayer from 'react-native-audio-recorder-player'; // REMOVED


const LEAD_STATUS = {
  NEW: "new",
  ASSIGNED: "assigned",
  TRANSFERRED: "transferred",
  DISPOSED: "disposed",
  FOLLOW_UP: "follow_up",
  APPROVED: "approved",
  LOST: "lost",
  CLOSED: "closed",
};

const { PhoneModule } = NativeModules;
// Removed top-level instantiation to avoid constructor error

// Top level tabs
type Tab = 'LEAD_INFO' | 'DISPOSE_LEAD';

export const LeadDetailsScreen = () => {
  // const audioRecorderPlayer = AudioRecorderPlayer; // REMOVED

  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { lead, openDispose } = route.params as { lead: Lead; openDispose?: boolean };
  const [activeTab, setActiveTab] = useState<Tab>(openDispose ? 'DISPOSE_LEAD' : 'LEAD_INFO');
  const [subTab, setSubTab] = useState<'About' | 'Timeline'>('About');

  // Modal state
  const [callDisposeModalVisible, setCallDisposeModalVisible] = useState(false);

  // Collapse states for sections
  const [basicDetailsOpen, setBasicDetailsOpen] = useState(true);
  const [progressOpen, setProgressOpen] = useState(true);

  useEffect(() => {
    if (openDispose) {
      setCallDisposeModalVisible(true);
    }
  }, [openDispose]);

  // Recording state removed, managed natively


  // Dispose Form State
  const { user } = useAuth(); // Get logged in user for message template
  const [connected, setConnected] = useState<boolean | null>(null);
  const [disposeStatus, setDisposeStatus] = useState('');
  const [notConnectedReason, setNotConnectedReason] = useState('');
  const [description, setDescription] = useState(''); // Remarks
  const [expectedValue, setExpectedValue] = useState('');
  const [followUpDate, setFollowUpDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastRecordingPath, setLastRecordingPath] = useState<string | null>(null);

  // New State for Dispose Flow
  const [nextActionType, setNextActionType] = useState(''); // '1h', '6h', '1d', 'custom'
  const [reassign, setReassign] = useState(false);
  const [copyToCampaign, setCopyToCampaign] = useState(false);
  const [moveToCampaign, setMoveToCampaign] = useState(false);
  const [whatsappModalVisible, setWhatsappModalVisible] = useState(false);

  const NOT_CONNECTED_REASONS = [
    "Did not pick",
    "Busy in another call",
    "User disconnected the call",
    "Switch off",
    "Out of Coverage area / Network issue",
    "Call not connected / can not be completed",
    "Other reason",
    "Incorrect / Invalid number",
    "Incoming calls not available",
    "Number not in use / does not exists / out of service"
  ];

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
      try {
        // Store pending call state so we can resume to dispose screen if app restarts
        await AsyncStorage.setItem('pendingDisposeLead', JSON.stringify(lead));
      } catch (e) {
        console.error("Failed to save pending call state", e);
      }

      PhoneModule.startCallListener(); // Ensure listener is active
      PhoneModule.makeCall(lead.phone || lead.number);
      // Navigation to CallScreen removed as per request - direct dialing only
    } else {
      Alert.alert("Permission Error", "Call permission is required");
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

      // Auto switch to Dispose directly
      setActiveTab('DISPOSE_LEAD');
      setCallDisposeModalVisible(true);
    });

    // AppState listener to handle resume after call
    const appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        try {
          // Check if we have a pending dispose for THIS lead
          const pendingLeadJson = await AsyncStorage.getItem('pendingDisposeLead');
          if (pendingLeadJson) {
            const pendingLead = JSON.parse(pendingLeadJson);
            // Use loose comparison or check both ID fields just in case
            const currentId = lead._id || lead.id;
            const pendingId = pendingLead._id || pendingLead.id;

            if (currentId && pendingId && currentId === pendingId) {
              setActiveTab('DISPOSE_LEAD');
              setCallDisposeModalVisible(true);
            }
          }
        } catch (e) {
          console.error("Error checking pending dispose on resume", e);
        }
      }
    });

    return () => {
      subscription.remove();
      appStateSubscription.remove();
    };
  }, [lead]);

  // ... render ...


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
          <PenSquare size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
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
          <PenSquare size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
          {progressOpen ? <ChevronUp size={20} color={colors.text} /> : <ChevronDown size={20} color={colors.text} />}
        </View>
      </TouchableOpacity>

      {progressOpen && (
        <View style={styles.sectionContent}>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{lead.leadStatus || lead.status || 'New'}</Text>
            </View>
          </View>
          <DetailRow label="Lead Source" value={lead.leadSource || '-'} />
          <DetailRow label="Follow-Up Date" value={lead.next_followup_date ? new Date(lead.next_followup_date).toLocaleDateString() : (lead.followUpDate || '-')} />
          <DetailRow
            label="Assigned To"

            value={
              (typeof lead.assigned_to === 'object' && lead.assigned_to !== null ? (lead.assigned_to as any).name : lead.assigned_to) ||
              (typeof lead.assignedUser === 'object' && lead.assignedUser !== null ? (lead.assignedUser as any).name : lead.assignedUser) ||
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
      // return { duration: 0, timestamp: Date.now() }; // Fallback
    }
  };

  const handleProceed = async () => {
    if (connected === null) {
      Alert.alert("Error", "Please select if the call was connected.");
      return;
    }
    // If connected=false, check notConnectedReason
    if (!connected && !notConnectedReason) {
      Alert.alert("Error", "Please specify the reason.");
      return;
    }

    setIsProcessing(true);
    try {
      // const matchedCall = await fetchTodayCallLog(); // Optional check

      const formData = {
        connected,
        status: connected ? 'Connected' : notConnectedReason, // Use reason as status if not connected? Or use specific statuses
        description,
        nextActionType,
        followUpDate: followUpDate.toISOString(),
        reassign,
        copyToCampaign,
        moveToCampaign
      };

      // In real implementation, we would save the dispose data here via API
      // await LeadsService.submitDispose(lead._id, formData);

      console.log("Submitting Dispose:", formData);

      // Simulate API call
      setTimeout(() => {
        Alert.alert("Success", "Lead disposed successfully");
        setCallDisposeModalVisible(false);
        navigation.goBack();
      }, 1000);

    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setIsProcessing(false);
      // Clear pending state upon successful dispose/proceed
      AsyncStorage.removeItem('pendingDisposeLead').catch(err => console.error(err));
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || followUpDate;
    setShowDatePicker(Platform.OS === 'ios');
    setFollowUpDate(currentDate);
  };

  const handleQuickTimeAction = (hours: number) => {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    setFollowUpDate(d);
    // Set type based on time for UI state
    if (hours === 1) setNextActionType('1h');
    else if (hours === 6) setNextActionType('6h');
    else if (hours === 24) setNextActionType('1d');
  };

  const renderDisposeContent = () => (
    <View style={styles.disposeContainer}>
      <View style={styles.card}>
        <Text style={styles.question}>Was call connected?</Text>
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.choiceBtn, connected === false && { backgroundColor: '#FF5252', borderColor: '#FF5252' }]}
            onPress={() => setConnected(false)}
          >
            <Text style={[styles.choiceText, connected === false && { color: 'white' }]}>Not Connected</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.choiceBtn, connected === true && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }]}
            onPress={() => setConnected(true)}
          >
            <Text style={[styles.choiceText, connected === true && { color: 'white' }]}>Yes Connected</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logic: if NOT connected, show reasons. If connected, maybe show dispositions? 
          Based on screenshot 1, "Not Connected" is selected and reasons are shown.
          Based on screenshot 2, assuming "Connected" uses the "Select next action".
          Let's assume "Select next action" is always visible or depends on previous connection type.
          Screenshot 2 title is just "Select next action", seems like it follows up.
      */}

      {!connected && connected !== null && (
        <View style={styles.card}>
          <Text style={styles.question}>Please specify the reason?<Text style={{ color: 'red' }}>*</Text></Text>
          {NOT_CONNECTED_REASONS.map((r, i) => (
            <TouchableOpacity key={i} style={styles.radioRow} onPress={() => setNotConnectedReason(r)}>
              <View style={[styles.radioOuter, notConnectedReason === r && { borderColor: colors.primary }]}>
                {notConnectedReason === r && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Next Action & Remarks - Assuming this is standard for both or mainly connected? 
          Screenshot 2 shows "Select next action" with time pills. 
          Usually we schedule follow up even if not connected or connected.
      */}
      <View style={styles.card}>
        <Text style={styles.question}>Select next action</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 }}>
          <TouchableOpacity
            style={[styles.timePill, nextActionType === '1h' && styles.timePillActive]}
            onPress={() => handleQuickTimeAction(1)}
          >
            <Text style={[styles.timePillText, nextActionType === '1h' && styles.timePillTextActive]}>1 hour</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timePill, nextActionType === '6h' && styles.timePillActive]}
            onPress={() => handleQuickTimeAction(6)}
          >
            <Text style={[styles.timePillText, nextActionType === '6h' && styles.timePillTextActive]}>6 hour</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timePill, nextActionType === '1d' && styles.timePillActive]}
            onPress={() => handleQuickTimeAction(24)}
          >
            <Text style={[styles.timePillText, nextActionType === '1d' && styles.timePillTextActive]}>1 day</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.datePickerBtn}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.datePickerText}>Pick date & time</Text>
          <CalendarIcon size={20} color="#666" />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            testID="dateTimePicker"
            value={followUpDate}
            mode="date" // or datetime if supported by platform/lib config
            display="default"
            onChange={onDateChange}
          />
        )}

        {/* Checkboxes */}
        <View style={{ marginTop: 15 }}>
          <TouchableOpacity style={styles.checkRow} onPress={() => setReassign(!reassign)}>
            <View style={[styles.checkBox, reassign && styles.checkBoxActive]}>
              {reassign && <View style={styles.checkmark} />}
            </View>
            <Text style={styles.checkLabel}>Re-assign this lead?{"\n"}(NOV LEADS (R))</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.checkRow} onPress={() => setCopyToCampaign(!copyToCampaign)}>
            <View style={[styles.checkBox, copyToCampaign && styles.checkBoxActive]}>
              {copyToCampaign && <View style={styles.checkmark} />}
            </View>
            <Text style={styles.checkLabel}>Copy this lead to other campaign</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.checkRow} onPress={() => setMoveToCampaign(!moveToCampaign)}>
            <View style={[styles.checkBox, moveToCampaign && styles.checkBoxActive]}>
              {moveToCampaign && <View style={styles.checkmark} />}
            </View>
            <Text style={styles.checkLabel}>Move this lead to other campaign</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.inputLabel, { marginTop: 15 }]}>Dispose Remark</Text>
        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          placeholder="Type here..."
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={1500}
        />
        <Text style={{ textAlign: 'right', color: '#999', fontSize: 12 }}>{description.length}/1500</Text>
      </View>

      {/* Send Message Section */}
      <View style={styles.card}>
        <Text style={styles.question}>Send Message</Text>
        <View style={styles.shareRow}>
          <TouchableOpacity style={styles.shareItem}>
            <View style={[styles.shareIcon, { borderColor: '#7E57C2' }]}>
              <MessageSquare size={24} color="#7E57C2" />
            </View>
            <Text style={styles.shareText}>SMS</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareItem}>
            <View style={[styles.shareIcon, { borderColor: '#7E57C2' }]}>
              <Mail size={24} color="#7E57C2" />
            </View>
            <Text style={styles.shareText}>Email</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareItem} onPress={() => setWhatsappModalVisible(true)}>
            <View style={[styles.shareIcon, { borderColor: '#7E57C2' }]}>
              <Phone size={24} color="#7E57C2" />
            </View>
            <Text style={styles.shareText}>Whatsapp</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleProceed} disabled={isProcessing}>
          <Text style={styles.submitBtnText}>{isProcessing ? "Processing..." : "Submit"}</Text>
        </TouchableOpacity>
      </View>
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
                  {/* Create "Lead Created" event */}
                  <View style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={styles.timelineLine} />
                      <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineTitle}>Lead Created</Text>
                      <Text style={styles.timelineDate}>
                        {new Date(lead.created || lead.createdAt || Date.now()).toLocaleString()}
                      </Text>
                      <Text style={styles.timelineDesc}>Lead was added to the system.</Text>
                    </View>
                  </View>

                  {/* Unified Timeline of Notes and Call Logs */}
                  {(() => {
                    const noteEvents = (lead.notes || []).map((note: any) => {
                      const noteDate = note.date || note.createdAt || note.timestamp || Date.now();
                      const noteDesc = typeof note === 'string' ? note : (note.note || note.description || 'Note added');
                      return {
                        type: 'NOTE',
                        date: new Date(noteDate),
                        title: 'Note Added',
                        desc: typeof noteDesc === 'object' ? JSON.stringify(noteDesc) : noteDesc,
                        color: colors.secondary
                      };
                    });

                    // Mock Call Logs (In real app, fetch efficiently. Here we filter sync or assume fetched)
                    // Since fetchTodayCallLog is async and scoped, we might need to fetch all logs on mount.
                    // For this step, we will use a separate effect to fetch logs or just assume we have them if passed.
                    // FIXME: To properly show call history for *this* lead, we need to fetch calls. 
                    // For now, let's just integrate the structure. A real fetch would require state.

                    // Placeholder for actual call logs if they were in state.
                    // Assuming we might have some mocked or passed logs/history for now.
                    const callEvents: { type: string; date: Date; title: string; desc: string; color: string; }[] = [];

                    // Merge and sort
                    const allEvents = [...noteEvents, ...callEvents].sort((a, b) => b.date.getTime() - a.date.getTime());

                    return allEvents.map((event, index) => (
                      <View key={index} style={styles.timelineItem}>
                        <View style={styles.timelineLeft}>
                          <View style={styles.timelineLine} />
                          <View style={[styles.timelineDot, { backgroundColor: event.color }]} />
                        </View>
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineTitle}>{event.title}</Text>
                          <Text style={styles.timelineDate}>{event.date.toLocaleString()}</Text>
                          <Text style={styles.timelineDesc}>{event.desc}</Text>
                        </View>
                      </View>
                    ));
                  })()}

                  {/* Call History Section (As requested specifically for "call histry for that particular lead") */}
                  <View style={{ marginTop: 20, marginBottom: 10 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 10 }}>Recent Calls</Text>
                    <CallHistoryList lead={lead} />
                  </View>
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
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerCallBtn} onPress={handleCallNow}>
          <Text style={styles.footerCallText}>Call Now</Text>
        </TouchableOpacity>
      </View>

      {/* Dispose Modal */}
      <Modal
        visible={callDisposeModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCallDisposeModalVisible(false)} // Optional: prevent closing on back button if strict
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Call Disposition</Text>
              <TouchableOpacity onPress={() => setCallDisposeModalVisible(false)}>
                {/* Close Icon or Text */}
                <Text style={{ fontSize: 20, color: '#333' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: '80%' }}>
              {renderDisposeContent()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* WhatsApp Modal */}
      <Modal
        visible={whatsappModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setWhatsappModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <SendTemplateMessageModal
              lead={lead}
              user={user}
              onClose={() => setWhatsappModalVisible(false)}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};
// Sub-component for Message Modal
const SendTemplateMessageModal = ({ lead, user, onClose }: { lead: Lead, user: any, onClose: () => void }) => {
  const leadName = lead.firstName || lead.name || "";
  // User name from AuthContext (passed as prop)
  const senderName = user?.name || "Team";

  // Predefined message: "Hi [Lead Name], I tried reaching out to you! Feel free to call me back or message. Regards, [User Name]"
  // If +91 added... "send using wa/+91 api but if +91 added then dont add if not added then add accordingly"

  // Actually the message in screenshot is:
  // "Hi Vaishali,\n\nI tried reaching out to you!\nFeel free to call me back or message.\n\nRegards, Shinde Sir"

  const [message, setMessage] = useState(`Hi ${leadName},\n\nI tried reaching out to you!\nFeel free to call me back or message.\n\nRegards, ${senderName}`);

  const handleSend = () => {
    let phone = lead.phone || lead.number || "";
    // Remove non-digits
    phone = phone.replace(/[^0-9]/g, '');

    // Check 91 logic
    if (!phone.startsWith('91') && phone.length === 10) {
      phone = '91' + phone;
    }

    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Error", "WhatsApp is not installed or invalid URL");
      }
    });
  };

  return (
    <View style={{ width: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 10 }}>
        <MessageSquare size={24} color="#5E35B1" style={{ marginRight: 8 }} />
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#5E35B1' }}>Send message</Text>
      </View>

      <View style={{ backgroundColor: '#F3E5F5', padding: 15, borderRadius: 8, marginBottom: 15 }}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          multiline
          style={{ color: '#333', fontSize: 16, minHeight: 100, textAlignVertical: 'top' }}
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#5E35B1', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#5E35B1' }} />
        </View>
        <Text style={{ color: '#333', fontWeight: 'bold' }}>{lead.phone || lead.number}</Text>
      </View>

      <TouchableOpacity
        onPress={handleSend}
        style={{ backgroundColor: '#5E35B1', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Send</Text>
      </TouchableOpacity>
    </View>
  );
};




const CallHistoryList = ({ lead }: { lead: Lead }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [lead]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      let remoteLogs: any[] = [];
      if (lead._id || lead.id) {
        remoteLogs = await CallLogService.getRemoteCallLogs(lead._id || lead.id || '');
      }
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
  subTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: '90%',
    paddingBottom: 20,
    elevation: 5
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text
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
    padding: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
    width: 20,
  },
  timelineLine: {
    position: 'absolute',
    top: 0,
    bottom: -20,
    width: 2,
    backgroundColor: '#E0E0E0',
    zIndex: -1,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 8,
    elevation: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  timelineDesc: {
    fontSize: 14,
    color: colors.text,
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
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioOuter: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#757575',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioInner: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioLabel: {
    fontSize: 14,
    color: colors.text,
  },
  timePill: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  timePillActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFFDE7',
  },
  timePillText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  timePillTextActive: {
    color: colors.primaryDark,
    fontWeight: 'bold',
  },
  datePickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    marginTop: 10,
  },
  datePickerText: {
    fontSize: 14,
    color: colors.text,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkBox: {
    height: 20,
    width: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#757575',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkBoxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    height: 10,
    width: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  checkLabel: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 20,
  },
  shareItem: {
    alignItems: 'center',
  },
  shareIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  shareText: {
    fontSize: 12,
    color: colors.text,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
