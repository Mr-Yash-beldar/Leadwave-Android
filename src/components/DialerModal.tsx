import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, NativeModules, TextInput, Keyboard, Alert, Modal, Dimensions, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Phone, X, Delete, UserPlus, AlertCircle, CheckCircle, UserCheck } from 'lucide-react-native';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const { PhoneModule } = NativeModules;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DialerButton = ({ value, onPress, onLongPress }: { value: string; onPress: (v: string) => void, onLongPress?: (v: string) => void }) => (
  <TouchableOpacity
    style={styles.dialButton}
    onPress={() => onPress(value)}
    onLongPress={() => onLongPress && onLongPress(value)}
    activeOpacity={0.7}
  >
    <Text style={styles.dialButtonText}>{value}</Text>
  </TouchableOpacity>
);

interface DialerModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAddLead?: (number: string) => void;
}

interface Campaign {
  _id: string;
  name: string;
}

export const DialerModal: React.FC<DialerModalProps> = ({ isVisible, onClose, onAddLead }) => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [number, setNumber] = useState('');
  // Status state: 'checking' | 'not_exist' | 'assign_self' | 'assigned' | 'ok'
  const [leadStatus, setLeadStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Lead Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => inputRef.current?.focus(), 300);
      fetchCampaigns();
    } else {
      resetState();
    }
  }, [isVisible]);

  const resetState = () => {
    setNumber('');
    setLeadStatus(null);
    setShowAddForm(false);
    setFirstName('');
    setLastName('');
    setSelectedCampaign('');
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

  const checkLead = async (phone: string) => {
    if (phone.length < 10) {
      setLeadStatus(null);
      return;
    }

    setLeadStatus({ status: 'checking' });

    try {
      const res = await api.checkLeadAssignment(phone);

      if (res.notexist) {
        setLeadStatus({ status: 'not_exist' });
      } else if (res.assignself) {
        setLeadStatus({ status: 'assign_self', leadId: res.leadId }); // Assuming API returns leadId
      }
      else if (res.assignedTo) {
        // Check if assigned to current user
        if (res.assignedTo.id === user?._id) {
          // If assigned to current user, treat as available for calling
          setLeadStatus({ status: 'ok', leadId: res.leadId });
        } else {
          // Assigned to different user
          setLeadStatus({
            status: 'assigned',
            assignedTo: res.assignedTo.name,
            assignedId: res.assignedTo.id
          });
        }
      } else {
        // Fallback if none of the above specific flags are met, but call was success
        // Usually implies it's assigned to current user or free to call
        setLeadStatus({ status: 'ok' });
      }

    } catch (e) {
      console.log("Check lead error", e);
      setLeadStatus({ status: 'ok' }); // Allow call on error fallback
    }
  };

  const handleNumberChange = (text: string) => {
    const clean = text.replace(/[^0-9*#+]/g, '');
    setNumber(clean);
    setShowAddForm(false); // Hide form if number changes

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (clean.length >= 10) {
      debounceTimer.current = setTimeout(() => {
        checkLead(clean);
      }, 800);
    } else {
      setLeadStatus(null);
    }
  };

  const handlePress = (val: string) => handleNumberChange(number + val);

  const handleLongPress = (val: string) => {
    if (val === '0') handleNumberChange(number + '+');
  };

  const handleDelete = () => handleNumberChange(number.slice(0, -1));
  const handleLongDelete = () => handleNumberChange('');

  const handleCall = (slot: number) => {
    if (number.length < 10) return;

    if (leadStatus?.status === 'assigned') {
      Alert.alert("Lead Assigned", `This number is assigned to ${leadStatus.assignedTo}. You cannot call.`);
      return;
    }

    if (number) {
      if (PhoneModule) {
        // MATCHING BEHAVIOR FROM LeadDetailsScreen
        // 1. Start Listener
        try {
          PhoneModule.startCallListener();
        } catch (e) { console.log("Listener start error", e) }

        // 2. Make Call (Single argument)
        PhoneModule.makeCall(number);

        // 3. Navigate to CallScreen
        // onClose(); // Close modal first?
        // navigation.navigate('lead', {
        //   number: number,
        //   name: 'Unknown' // Or try to find if we have a name from checkLead?
        // });
      }
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
        phone: number,
        campaign: selectedCampaign,
        date: new Date().toISOString()
      });
      Alert.alert('Success', 'Lead created successfully!');
      setShowAddForm(false);
      // Re-check status to enable call button
      checkLead(number);
    } catch (error) {
      Alert.alert('Error', 'Failed to create lead.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSelf = async () => {
    if (!leadStatus?.leadId) return;

    setLoading(true);
    try {
      await api.assignSelf(leadStatus.leadId, number);
      Alert.alert('Success', 'Lead assigned to you!');
      // Re-check logic or just set status to OK
      setLeadStatus({ status: 'ok' });
    } catch (error) {
      Alert.alert('Error', 'Failed to assign lead.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // UI Components
  const renderStatusArea = () => {
    if (!leadStatus || number.length < 10) return null;

    if (leadStatus.status === 'checking') {
      return (
        <View style={styles.checkingBadge}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.checkingText}>Checking...</Text>
        </View>
      );
    }

    if (leadStatus.status === 'not_exist') {
      return !showAddForm ? (
        <TouchableOpacity style={styles.addLeadButton} onPress={() => setShowAddForm(true)}>
          <UserPlus size={18} color={colors.white} />
          <Text style={styles.addLeadText}>Add to Leads</Text>
        </TouchableOpacity>
      ) : null;
    }

    if (leadStatus.status === 'assign_self') {
      return (
        <TouchableOpacity style={styles.assignSelfButton} onPress={handleAssignSelf} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} size="small" /> : <UserCheck size={18} color={colors.white} />}
          <Text style={styles.addLeadText}>Assign to Self</Text>
        </TouchableOpacity>
      );
    }

    if (leadStatus.status === 'assigned') {
      return (
        <View style={styles.assignedBadge}>
          <AlertCircle size={16} color={colors.error} />
          <Text style={styles.assignedText}>Assigned to: {leadStatus.assignedTo}</Text>
        </View>
      );
    }

    return null;
  };

  const renderAddLeadForm = () => {
    if (!showAddForm) return null;

    return (
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Add New Lead</Text>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>

        <Text style={styles.label}>Select Campaign:</Text>
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
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddForm(false)}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleCreateLead} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.white} size="small" /> : <CheckCircle size={18} color={colors.white} />}
            <Text style={styles.saveButtonText}>Save & Call</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <X size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dial Pad</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          {/* Status Area */}
          <View style={styles.statusArea}>
            {renderStatusArea()}
          </View>

          {/* Add Lead Form (Overlays keypad if active) */}
          {showAddForm ? (
            renderAddLeadForm()
          ) : (
            <>
              {/* Display Number */}
              <View style={styles.displayContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.numberDisplay}
                  value={number}
                  showSoftInputOnFocus={false}
                  onChangeText={handleNumberChange}
                  selectionColor={colors.primary}
                />
              </View>

              {/* Keypad */}
              <View style={styles.keypad}>
                <View style={styles.row}>
                  <DialerButton value="1" onPress={handlePress} />
                  <DialerButton value="2" onPress={handlePress} />
                  <DialerButton value="3" onPress={handlePress} />
                </View>
                <View style={styles.row}>
                  <DialerButton value="4" onPress={handlePress} />
                  <DialerButton value="5" onPress={handlePress} />
                  <DialerButton value="6" onPress={handlePress} />
                </View>
                <View style={styles.row}>
                  <DialerButton value="7" onPress={handlePress} />
                  <DialerButton value="8" onPress={handlePress} />
                  <DialerButton value="9" onPress={handlePress} />
                </View>
                <View style={styles.row}>
                  <DialerButton value="+" onPress={handlePress} />
                  <DialerButton value="0" onPress={handlePress} onLongPress={handleLongPress} />
                  <TouchableOpacity
                    style={styles.dialButtonDelete}
                    onPress={handleDelete}
                    onLongPress={handleLongDelete}
                  >
                    <Delete size={28} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Call Action */}
              <View style={styles.actionArea}>
                <TouchableOpacity
                  style={[
                    styles.callButton,
                    (number.length < 10 || leadStatus?.status === 'assigned') && styles.callButtonDisabled
                  ]}
                  onPress={() => handleCall(0)}
                  disabled={number.length < 10 || leadStatus?.status === 'assigned'}
                >
                  <Phone size={32} color={colors.white} fill={colors.white} />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F2',
  },
  header: {
    height: 60,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    elevation: 4
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600'
  },
  backButton: {
    padding: 8
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40
  },
  statusArea: {
    alignItems: 'center',
    marginBottom: 10,
    minHeight: 40,
    justifyContent: 'center'
  },
  checkingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8
  },
  checkingText: {
    marginLeft: 8,
    color: '#666'
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.error
  },
  assignedText: {
    color: colors.error,
    marginLeft: 8,
    fontWeight: '600'
  },
  addLeadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    elevation: 3
  },
  assignSelfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50', // Green
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    elevation: 3
  },
  addLeadText: {
    color: colors.white,
    marginLeft: 8,
    fontWeight: 'bold'
  },
  displayContainer: {
    marginBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center'
  },
  numberDisplay: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    width: '100%',
  },
  keypad: {
    paddingHorizontal: 40,
    marginBottom: 20
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  dialButton: {
    width: 64, // Slightly smaller for better fit
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  dialButtonText: {
    fontSize: 28,
    color: '#333',
    fontWeight: '500'
  },
  dialButtonDelete: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionArea: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  callButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  callButtonDisabled: {
    backgroundColor: '#BDBDBD',
    elevation: 0
  },
  // Form Styles
  formContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    elevation: 4
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333'
  },
  inputGroup: {
    gap: 12,
    marginBottom: 16
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA'
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8
  },
  campaignList: {
    maxHeight: 50,
    marginBottom: 24
  },
  campaignChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EEE'
  },
  campaignChipSelected: {
    backgroundColor: '#FFF8E1', // Light yellow/primary
    borderColor: colors.primary
  },
  campaignChipText: {
    color: '#666',
    fontWeight: '500'
  },
  campaignChipTextSelected: {
    color: colors.primary,
    fontWeight: 'bold'
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto'
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#F5F5F5'
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: colors.primary,
    gap: 8
  },
  cancelButtonText: {
    fontWeight: '600',
    color: '#666'
  },
  saveButtonText: {
    fontWeight: 'bold',
    color: '#000' // Black text on yellow button
  }
});
