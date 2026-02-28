import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ToastAndroid,
  Clipboard,
  NativeModules,
  Platform,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CallLog, CallType } from '../types/CallLog';
import { formatDuration, formatTime } from '../utils/formatters';
import { colors } from '../theme/colors';
import {
  Phone,
  Copy,
  StickyNote,
  MessageCircle,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  Mail,
  User,
  UserPlus,
  X,
  CheckCircle,
  Trash2,
  UserCheck
} from 'lucide-react-native';
import { api } from '../services/api';

const { PhoneModule } = NativeModules;

// Move outside component to avoid recreating on each render
const CALL_TYPE_INFO = {
  [CallType.Incoming]: { color: '#8BC34A', Icon: PhoneIncoming },
  [CallType.Outgoing]: { color: '#FFA000', Icon: PhoneOutgoing },
  [CallType.Missed]: { color: '#E57373', Icon: PhoneMissed },
  [CallType.Unknown]: { color: '#999', Icon: Phone }
};

const getCallTypeInfo = (type: CallType) => CALL_TYPE_INFO[type] || CALL_TYPE_INFO[CallType.Unknown];

interface Campaign {
  _id: string;
  name: string;
}

interface CallLogItemProps {
  item: CallLog & {
    leadName?: string;
    leadEmail?: string;
    leadMobile?: string;
    notes?: string;
    callStatus?: string;
    recordingUrl?: string;
    leadId?: string;
    leadData?: any;
    disposed?: boolean;
    canAssignSelf?: boolean;      // lead in DB, not mine (unassigned or other's)
    isAssignedToOther?: boolean;  // lead in DB, assigned to someone else specifically
    assignedToName?: string;      // name of the agent it's assigned to
    _enrichedLeadId?: string;     // leadId from checkPhone enrichment
    _enrichedLeadData?: any;      // leadData from checkPhone enrichment
  };
  simCount?: number;
  isLeadLog?: boolean;
  onAddLead?: (number: string) => void;
  onDispose?: (item: any) => void;
  onAssignSelf?: (item: any) => void;
}

// Extracted modal component to prevent re-renders of main component
const AddLeadModal = memo(({
  visible,
  onClose,
  phoneNumber,
  onSubmit
}: {
  visible: boolean;
  onClose: () => void;
  phoneNumber: string;
  onSubmit: (data: { firstName: string; lastName: string; campaign: string }) => Promise<void>;
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoadingCampaigns(true);
      const res = await api.getCampaigns();
      if (res?.data) setCampaigns(res.data);
    } catch (error) {
      console.log('Error fetching campaigns', error);
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!firstName || !selectedCampaign) {
      Alert.alert('Error', 'Please fill in First Name and select a Campaign.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ firstName, lastName, campaign: selectedCampaign });
      setFirstName('');
      setLastName('');
      setSelectedCampaign('');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to create lead.');
    } finally {
      setLoading(false);
    }
  }, [firstName, lastName, selectedCampaign, onSubmit, onClose]);

  const resetForm = useCallback(() => {
    setFirstName('');
    setLastName('');
    setSelectedCampaign('');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // Fetch campaigns when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      fetchCampaigns();
    }
  }, [visible, fetchCampaigns]);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Lead</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.phoneDisplayContainer}>
            <Text style={styles.phoneLabel}>Phone Number:</Text>
            <Text style={styles.phoneNumber}>{phoneNumber}</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                placeholder="First Name *"
                value={firstName}
                onChangeText={setFirstName}
                placeholderTextColor="#999"
                autoFocus={true}
              />
              <TextInput
                style={styles.input}
                placeholder="Last Name"
                value={lastName}
                onChangeText={setLastName}
                placeholderTextColor="#999"
              />
            </View>

            <Text style={styles.label}>Select Campaign *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.campaignList}>
              {loadingCampaigns ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                campaigns.map((c) => (
                  <TouchableOpacity
                    key={c._id}
                    style={[styles.campaignChip, selectedCampaign === c._id && styles.campaignChipSelected]}
                    onPress={() => setSelectedCampaign(c._id)}
                  >
                    <Text
                      style={[
                        styles.campaignChipText,
                        selectedCampaign === c._id && styles.campaignChipTextSelected,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <>
                    <CheckCircle size={18} color={colors.white} />
                    <Text style={styles.saveButtonText}>Save Lead</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

export const CallLogItem: React.FC<CallLogItemProps> = memo((
  {
    item,
    simCount = 0,
    isLeadLog = false,
    onAddLead,
    onDispose,
    onAssignSelf,
  }) => {
  const navigation = useNavigation<any>();
  const [isAddLeadModalVisible, setIsAddLeadModalVisible] = useState(false);
  const [checkingLead, setCheckingLead] = useState(false);

  // ── Lead state flags ──────────────────────────────────────────────────────
  // MINE: has real leadId (matched by HistoryScreen) OR leadData without canAssignSelf
  const isMyLead = useMemo(() =>
    !!(item.leadId || (item.leadData && !item.canAssignSelf)),
    [item.leadId, item.leadData, item.canAssignSelf]
  );

  // Resolved agent name (from enrichment or explicit field)
  const assignedToName = useMemo(() => {
    if (item.assignedToName) return item.assignedToName;
    const lead = item._enrichedLeadData || item.leadData;
    if (!lead) return null;
    const a = lead.assigned_to || lead.assignedTo;
    if (!a) return null;
    if (typeof a === 'object') return (a as any).name || (a as any).username || null;
    return null;
  }, [item.assignedToName, item._enrichedLeadData, item.leadData]);

  // Case A: not in DB at all
  const showAddLeadButton = useMemo(() =>
    !isLeadLog && !isMyLead && !item._enrichedLeadId && !item.disposed,
    [isLeadLog, isMyLead, item._enrichedLeadId, item.disposed]
  );

  const showDisposeButton = useMemo(() =>
    !item.disposed && (isLeadLog || isMyLead),
    [item.disposed, isLeadLog, isMyLead]
  );

  const displayName = useMemo(() => {
    // My lead: prefer leadName → leadData name → fallback
    if (isMyLead) {
      return item.leadName ||
        `${item.leadData?.firstName || ''} ${item.leadData?.lastName || ''}`.trim() ||
        'Unknown Lead';
    }
    // Enriched lead (found in DB, not yet mine): show lead name from API
    if (item.canAssignSelf && item.leadName) {
      return item.leadName;
    }
    // Unknown number
    return item.name || item.phoneNumber || 'Unknown';
  }, [isMyLead, item.leadName, item.leadData, item.name, item.phoneNumber, item.canAssignSelf]);

  const displayNumber = useMemo(() =>
    item.phoneNumber || item.leadMobile || 'No number',
    [item.phoneNumber, item.leadMobile]
  );

  const { color, Icon: TypeIcon } = useMemo(() =>
    getCallTypeInfo(item.type),
    [item.type]
  );

  // Callback handlers - all memoized
  const handleCopy = useCallback(() => {
    Clipboard.setString(displayNumber);
    if (Platform.OS === 'android') {
      ToastAndroid.show('Number copied', ToastAndroid.SHORT);
    }
  }, [displayNumber]);

  const handleMessage = useCallback(() => {
    const url = Platform.OS === 'android' ? `sms:${displayNumber}?body=` : `sms:${displayNumber}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Cannot open messaging'));
  }, [displayNumber]);

  const handleWhatsApp = useCallback(() => {
    const clean = displayNumber.replace(/[^\d+]/g, '');
    Linking.openURL(`whatsapp://send?phone=${clean}`).catch(() =>
      Alert.alert('Error', 'WhatsApp not installed')
    );
  }, [displayNumber]);

  const handleCall = useCallback(() => {
    if (PhoneModule?.makeCall) {
      PhoneModule.makeCall(displayNumber, item.simSlot || 0);
    } else {
      Linking.openURL(`tel:${displayNumber}`);
    }
  }, [displayNumber, item.simSlot]);

  const handleAnalytics = useCallback(() => {
    navigation.navigate('ContactAnalytics', {
      phoneNumber: displayNumber,
      name: displayName,
      isLead: isMyLead,
    });
  }, [navigation, displayNumber, displayName, isMyLead]);

  const handleLeadPress = useCallback(() => {
    // MINE: open LeadDetails
    if (isMyLead) {
      const callInfo = {
        id: item.id,
        duration: item.duration,
        timestamp: item.timestamp,
        phoneNumber: item.phoneNumber || item.leadMobile,
        callType: item.type,
        recordingUrl: item.recordingUrl,
      };
      if (item.leadData) {
        navigation.navigate('LeadDetails', { lead: item.leadData, fromCall: true, callInfo });
      } else if (item.leadId) {
        navigation.navigate('LeadDetails', { leadId: item.leadId, fromCall: true, callInfo });
      }
      return;
    }
    console.log('item', item);

    // ASSIGNED TO SOMEONE ELSE: show info, don't navigate
    if (item.isAssignedToOther) {
      Alert.alert(
        'Lead Assigned',
        `This lead is assigned to ${assignedToName || 'another agent'}.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // UNASSIGNED (canAssignSelf but NOT isAssignedToOther): prompt assign
    if (item.canAssignSelf) {
      Alert.alert(
        'Assign Lead',
        `"${displayName}" is in the system but not yet assigned.\nAssign this lead to yourself?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Assign to Me', onPress: () => onAssignSelf && onAssignSelf(item) },
        ]
      );
      return;
    }

    // NOT IN DB: go to analytics
    navigation.navigate('ContactAnalytics', {
      phoneNumber: displayNumber,
      name: displayName,
      isLead: false,
    });
  }, [isMyLead, item, navigation, displayName, displayNumber, onAssignSelf, assignedToName]);

  const handleDisposePress = useCallback(() => {
    if (onDispose) {
      onDispose(item);
    } else {
      Alert.alert(
        'Dispose Lead',
        'Are you sure you want to dispose this lead?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Dispose',
            style: 'destructive',
            onPress: () => {
              if (item.leadData) {
                navigation.navigate('LeadDetails', { lead: item.leadData, fromCall: true });
              } else if (item.leadId) {
                navigation.navigate('LeadDetails', { leadId: item.leadId, fromCall: true });
              }
            }
          }
        ]
      );
    }
  }, [onDispose, item, navigation]);

  const checkIfLeadExists = useCallback(async (): Promise<boolean> => {
    try {
      setCheckingLead(true);
      const res = await api.checkLeadAssignment(displayNumber);
      if (res.assignedTo) {
        Alert.alert(
          'Already a Lead',
          `This number is already assigned to ${res.assignedTo.name || 'another user'}`,
          [{ text: 'OK' }]
        );
        return true;
      }
      return false;
    } catch (error) {
      console.log('Error checking lead:', error);
      return false;
    } finally {
      setCheckingLead(false);
    }
  }, [displayNumber]);

  const handleAddLeadPress = useCallback(async () => {
    const exists = await checkIfLeadExists();
    if (exists) return;
    setIsAddLeadModalVisible(true);
  }, [checkIfLeadExists]);

  const handleCreateLead = useCallback(async (data: { firstName: string; lastName: string; campaign: string }) => {
    await api.createLead({
      firstName: data.firstName,
      lastName: data.lastName,
      phone: displayNumber,
      campaign: data.campaign,
      date: new Date().toISOString(),
    });
    Alert.alert('Success', 'Lead created successfully!');
    if (onAddLead) onAddLead(displayNumber);
  }, [displayNumber, onAddLead]);

  const closeModal = useCallback(() => {
    setIsAddLeadModalVisible(false);
  }, []);

  // Unified card press: routes to correct handler
  const handleCardPress = useCallback(() => {
    handleLeadPress();
  }, [handleLeadPress]);

  return (
    <>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.topSection}
          onPress={handleCardPress}
          activeOpacity={0.7}
        >
          {/* Avatar icon: 4 states */}
          <View style={[styles.avatar, { backgroundColor: isMyLead ? color : item.isAssignedToOther ? '#9E9E9E' : item.canAssignSelf ? '#FFA000' : color }]}>
            {isMyLead
              ? <User size={20} color="white" />
              : item.isAssignedToOther
                ? <User size={20} color="white" />        // assigned to someone else
                : item.canAssignSelf
                  ? <UserCheck size={20} color="white" /> // unassigned — can assign
                  : <UserPlus size={20} color="white" />  // not in DB
            }
          </View>

          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>

            <Text style={styles.number}>{displayNumber}</Text>

            {isMyLead && (
              <View style={styles.leadExtra}>

                {item.leadMobile && item.leadMobile !== displayNumber && (
                  <View style={styles.leadRow}>
                    <Phone size={14} color="#757575" />
                    <Text style={styles.leadText}>{item.leadMobile}</Text>
                  </View>
                )}
              </View>
            )}


            {/* {item.disposed && (
              <View style={styles.disposedTag}>
                <CheckCircle size={14} color="#22c55e" />
                <Text style={styles.disposedText}>Disposed</Text>
              </View>
            )} */}
          </View>

          <View style={styles.meta}>
            {item.simSlot !== undefined && simCount > 1 && (
              <View style={styles.simIndicator}>
                <Text style={styles.simText}>{item.simSlot + 1}</Text>
              </View>
            )}
            <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
            <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionRow}>

          {/* ── Case A: NOT in DB → add lead ── */}
          {showAddLeadButton && (
            <TouchableOpacity style={styles.actionButton} onPress={handleAddLeadPress} disabled={checkingLead}>
              {checkingLead
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <UserPlus size={20} color={colors.primary} />}
            </TouchableOpacity>
          )}

          {/* ── Case B: UNASSIGNED → show assign button ── */}
          {!isMyLead && item.canAssignSelf && !item.isAssignedToOther && (
            <TouchableOpacity
              style={[styles.actionButton, styles.assignSelfBtn]}
              onPress={() => {
                Alert.alert(
                  'Assign Lead to Me',
                  `"${item.leadName || item.phoneNumber}" is in the system but not yet assigned.\nAssign to yourself?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Assign', onPress: () => onAssignSelf && onAssignSelf(item) },
                  ]
                );
              }}
            >
              <UserCheck size={20} color='#FFA000' />
            </TouchableOpacity>
          )}

          {/* ── Case C: ASSIGNED TO SOMEONE ELSE → show who + copy + WA ── */}
          {item.isAssignedToOther && (
            <View style={styles.assignedBadge}>
              <User size={13} color="#555" />
              <Text style={styles.assignedText} numberOfLines={1}>
                {assignedToName || 'Other agent'}
              </Text>
            </View>
          )}

          {/* ── Case C + Mine → copy + WhatsApp ── */}
          {(isMyLead || item.isAssignedToOther) && (
            <>
              <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
                <Copy size={20} color="#9E9E9E" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleWhatsApp}>
                <MessageCircle size={20} color="#25D366" />
              </TouchableOpacity>
            </>
          )}

        </View>

        {isMyLead && (item.notes || item.callStatus) && (
          <View style={styles.noteSection}>
            <StickyNote size={16} color="#9E9E9E" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              {item.callStatus && <Text style={styles.statusText}>Status: {item.callStatus}</Text>}
              {item.notes && (
                <Text style={styles.noteText} numberOfLines={2}>
                  {item.notes}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* {!isMyLead && !isLeadLog && (
          <TouchableOpacity style={styles.noteSection}>
            <StickyNote size={14} color="#9E9E9E" />
            <Text style={styles.noteText}>Tap to add note & tag</Text>
          </TouchableOpacity>
        )} */}
      </View>

      <AddLeadModal
        visible={isAddLeadModalVisible}
        onClose={closeModal}
        phoneNumber={displayNumber}
        onSubmit={handleCreateLead}
      />
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison — re-render if identity, lead name, canAssignSelf or leadData changes
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.disposed === nextProps.item.disposed &&
    prevProps.item.notes === nextProps.item.notes &&
    prevProps.item.callStatus === nextProps.item.callStatus &&
    prevProps.item.leadName === nextProps.item.leadName &&
    prevProps.item.canAssignSelf === nextProps.item.canAssignSelf &&
    prevProps.item.leadId === nextProps.item.leadId &&
    prevProps.simCount === nextProps.simCount &&
    prevProps.isLeadLog === nextProps.isLeadLog
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  topSection: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  number: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  leadExtra: {
    marginTop: 4,
  },
  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  leadText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 6,
  },
  disposedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  disposedText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
  },
  meta: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  simIndicator: {
    borderWidth: 1.5,
    borderColor: '#333',
    borderRadius: 4,
    width: 18,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  simText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
  },
  time: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  duration: {
    fontSize: 12,
    color: '#757575',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  actionButton: {
    padding: 8,
  },
  assignSelfBtn: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  noteSection: {
    backgroundColor: '#F5F5F5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  noteText: {
    fontSize: 13,
    color: '#555',
    flex: 1,
  },
  statusText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  phoneDisplayContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  phoneLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  inputGroup: {
    gap: 12,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: colors.text,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  campaignList: {
    maxHeight: 50,
    marginBottom: 24,
  },
  campaignChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  campaignChipSelected: {
    backgroundColor: '#FFF8E1',
    borderColor: colors.primary,
  },
  campaignChipText: {
    color: '#666',
    fontWeight: '500',
  },
  campaignChipTextSelected: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontWeight: '600',
    color: '#666',
  },
  saveButtonText: {
    fontWeight: 'bold',
    color: '#000',
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    maxWidth: 120,
  },
  assignedText: {
    fontSize: 11,
    color: '#555',
    fontWeight: '500',
    flexShrink: 1,
  },
});