import React from 'react';
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
} from 'lucide-react-native';

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

// ────────────────────────────────────────────────
// Extended props – add isLeadLog flag + optional lead fields
interface CallLogItemProps {
  item: CallLog & {
    leadName?: string;
    leadEmail?: string;
    leadMobile?: string;
    notes?: string;
    callStatus?: string;
    recordingUrl?: string;
  };
  simCount?: number;
  isLeadLog?: boolean;           // ← new – tells us if this is CRM/lead data
}

export const CallLogItem: React.FC<CallLogItemProps> = ({
  item,
  simCount = 0,
  isLeadLog = false,
}) => {
  const navigation = useNavigation<any>();
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

  return (
    <View style={styles.card}>
      {/* Top Section – Name, Number, Meta */}
      <TouchableOpacity style={styles.topSection} onPress={handleAnalytics} activeOpacity={0.7}>
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
        <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
          <Copy size={20} color="#9E9E9E" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
          <MessageSquare size={20} color="#546E7A" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleWhatsApp}>
          <MessageCircle size={20} color="#25D366" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
          <Phone size={20} color="#546E7A" />
        </TouchableOpacity>
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
});