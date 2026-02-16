import React, { useState } from 'react';
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
  MessageSquare,
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
  Trash2
} from 'lucide-react-native';
import { api } from '../services/api';

const { PhoneModule } = NativeModules;

const getCallTypeInfo = (type: CallType) => {
  switch (type) {
    case CallType.Incoming:
      return { color: '#8BC34A', Icon: PhoneIncoming };
    case CallType.Outgoing:
      return { color: '#FFA000', Icon: PhoneOutgoing };
    case CallType.Missed:
      return { color: '#E57373', Icon: PhoneMissed };
    case CallType.Rejected:
      return { color: '#E57373', Icon: PhoneOff };
    default:
      return { color: '#999', Icon: Phone };
  }
};

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
  };
  simCount?: number;
  isLeadLog?: boolean;
  onAddLead?: (number: string) => void;
  onDispose?: (item: any) => void; // Add dispose callback
}

export const CallLogItem: React.FC<CallLogItemProps> = ({
  item,
  simCount = 0,
  isLeadLog = false,
  onAddLead,
  onDispose,
}) => {
  const navigation = useNavigation<any>();
  const [isAddLeadModalVisible, setIsAddLeadModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [checkingLead, setCheckingLead] = useState(false);
  
  // Add Lead Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const { color, Icon: TypeIcon } = getCallTypeInfo(item.type);

  const displayName = isLeadLog
    ? item.leadName || item.name || 'Unknown Lead'
    : item.name || 'Unknown';

  const displayNumber = item.phoneNumber || item.leadMobile || 'No number';

  const handleCopy = () => {
    Clipboard.setString(displayNumber);
    if (ToastAndroid) {
      ToastAndroid.show('Number copied', ToastAndroid.SHORT);
    }
  };

  const handleMessage = () => {
    const url = Platform.OS === 'android' ? `sms:${displayNumber}?body=` : `sms:${displayNumber}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Cannot open messaging'));
  };

  const handleWhatsApp = () => {
    const clean = displayNumber.replace(/[^\d+]/g, '');
    Linking.openURL(`whatsapp://send?phone=${clean}`).catch(() =>
      Alert.alert('Error', 'WhatsApp not installed')
    );
  };

  const handleCall = () => {
    if (PhoneModule?.makeCall) {
      PhoneModule.makeCall(displayNumber, item.simSlot || 0);
    } else {
      Linking.openURL(`tel:${displayNumber}`);
    }
  };

  const handleAnalytics = () => {
    navigation.navigate('ContactAnalytics', {
      phoneNumber: displayNumber,
      name: displayName,
      isLead: isLeadLog,
    });
  };

  // Handle Lead Press - Navigate to Lead Details
  const handleLeadPress = () => {
    if (isLeadLog && (item.leadData || item.leadId)) {
      if (item.leadData) {
        navigation.navigate('LeadDetails', { lead: item.leadData });
      } else if (item.leadId) {
        navigation.navigate('LeadDetails', { leadId: item.leadId });
      }
    }
  };

  // Handle Dispose Press
  // In CallLogItem.tsx, check the handleDisposePress function:

const handleDisposePress = () => {
  console.log('Dispose pressed for:', displayNumber); // Add this for debugging
  
  if (onDispose) {
    // If parent provided onDispose, call it
    onDispose(item);
  } else {
    // Fallback dispose behavior
    Alert.alert(
      'Dispose Lead',
      'Are you sure you want to dispose this lead?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispose',
          style: 'destructive',
          onPress: () => {
            // Navigate to lead details for disposal
            if (item.leadData) {
              navigation.navigate('LeadDetails', { 
                lead: item.leadData,
                fromCall: true
              });
            } else if (item.leadId) {
              navigation.navigate('LeadDetails', { 
                leadId: item.leadId,
                fromCall: true
              });
            }
          }
        }
      ]
    );
  }
};

  const checkIfLeadExists = async () => {
    try {
      setCheckingLead(true);
      const res = await api.checkLeadAssignment(displayNumber);
      if (res.assignedTo) {
        Alert.alert(
          'Already a Lead',
          `This number is already assigned to ${res.assignedTo.name || 'another user'}`,
          [
            { text: 'OK' }
          ]
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
  };

  const handleAddLeadPress = async () => {
    const exists = await checkIfLeadExists();
    if (exists) return;
    
    await fetchCampaigns();
    setIsAddLeadModalVisible(true);
  };

  const fetchCampaigns = async () => {
    try {
      setLoadingCampaigns(true);
      const res = await api.getCampaigns();
      if (res && res.data) {
        setCampaigns(res.data);
      }
    } catch (error) {
      console.log('Error fetching campaigns', error);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleCreateLead = async () => {
    if (!firstName || !selectedCampaign) {
      Alert.alert('Error', 'Please fill in First Name and select a Campaign.');
      return;
    }

    setLoading(true);
    try {
      await api.createLead({
        firstName,
        lastName,
        phone: displayNumber,
        campaign: selectedCampaign,
        date: new Date().toISOString()
      });
      Alert.alert('Success', 'Lead created successfully!');
      setIsAddLeadModalVisible(false);
      resetForm();
      
      if (onAddLead) {
        onAddLead(displayNumber);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create lead.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setSelectedCampaign('');
  };

  const closeModal = () => {
    setIsAddLeadModalVisible(false);
    resetForm();
  };

  return (
    <>
      <View style={styles.card}>
        {/* Top Section – Name, Number, Meta */}
        <TouchableOpacity 
          style={styles.topSection} 
          onPress={isLeadLog ? handleLeadPress : handleAnalytics} 
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, { backgroundColor: color }]}>
            {isLeadLog ? <User size={20} color="white" /> : <TypeIcon size={20} color="white" />}
          </View>

          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.number}>{displayNumber}</Text>

            {/* Lead extra info */}
            {isLeadLog && (
              <View style={styles.leadExtra}>
                {item.leadEmail && (
                  <View style={styles.leadRow}>
                    <Mail size={14} color="#757575" />
                    <Text style={styles.leadText}>{item.leadEmail}</Text>
                  </View>
                )}
                {item.leadMobile && item.leadMobile !== displayNumber && (
                  <View style={styles.leadRow}>
                    <Phone size={14} color="#757575" />
                    <Text style={styles.leadText}>{item.leadMobile}</Text>
                  </View>
                )}
              </View>
            )}
            
            {/* Show disposed tag if applicable */}
            {/* {item.disposed && (
              <View style={styles.disposedTag}>
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

        {/* Action Row */}
        <View style={styles.actionRow}>
          {/* Add Lead Button - Show for non-lead logs only */}
          {!isLeadLog && (
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleAddLeadPress}
              disabled={checkingLead}
            >
              {checkingLead ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <UserPlus size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          )}
          
          {/* Dispose Button - Show for lead logs that are not disposed */}
          {/* {isLeadLog && !item.disposed && ( */}
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleDisposePress}
            >
              <Trash2 size={20} color={colors.error} />
            </TouchableOpacity>
          {/* )} */}
          
          <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
            <Copy size={20} color="#9E9E9E" />
          </TouchableOpacity>
          
          {/* <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
            <MessageSquare size={20} color="#546E7A" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleWhatsApp}>
            <MessageCircle size={20} color="#25D366" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
            <Phone size={20} color="#546E7A" />
          </TouchableOpacity> */}
        </View>

        {/* Recording Section */}
        <View style={styles.recordingSection}>
          {item.recordingUrl ? (
            <TouchableOpacity
              style={styles.recordingButton}
              onPress={() => Alert.alert('Recording', 'Would play: ' + item.recordingUrl)}
            >
              <Text style={styles.recordingText}>▶ Play Recording</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.noRecordingText}>No recording</Text>
          )}
        </View>

        {/* Notes / Call Status */}
        {(isLeadLog && (item.notes || item.callStatus)) && (
          <View style={styles.noteSection}>
            <StickyNote size={16} color="#9E9E9E" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              {item.callStatus && (
                <Text style={styles.statusText}>Status: {item.callStatus}</Text>
              )}
              {item.notes && (
                <Text style={styles.noteText} numberOfLines={2}>
                  {item.notes}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Generic note section for personal logs */}
        {!isLeadLog && (
          <TouchableOpacity style={styles.noteSection}>
            <StickyNote size={14} color="#9E9E9E" />
            <Text style={styles.noteText}>Tap to add note & tag</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Add Lead Modal */}
      <Modal
        visible={isAddLeadModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Lead</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.phoneDisplayContainer}>
              <Text style={styles.phoneLabel}>Phone Number:</Text>
              <Text style={styles.phoneNumber}>{displayNumber}</Text>
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
                  campaigns.map(c => (
                    <TouchableOpacity
                      key={c._id}
                      style={[styles.campaignChip, selectedCampaign === c._id && styles.campaignChipSelected]}
                      onPress={() => setSelectedCampaign(c._id)}
                    >
                      <Text style={[styles.campaignChipText, selectedCampaign === c._id && styles.campaignChipTextSelected]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              <View style={styles.formActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
                  onPress={handleCreateLead} 
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
    </>
  );
};

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
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  disposedText: {
    fontSize: 11,
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
  recordingSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  recordingButton: {
    backgroundColor: '#E0F7FA',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  recordingText: {
    color: '#006064',
    fontWeight: '600',
    fontSize: 14,
  },
  noRecordingText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginLeft: 4,
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
  // Modal Styles
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
});