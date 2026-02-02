import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ToastAndroid, Clipboard, NativeModules, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CallLog, CallType } from '../types/CallLog';
import { formatDuration, formatTime } from '../utils/formatters';
import { colors } from '../theme/colors';
import { Phone, MessageSquare, Copy, StickyNote, MessageCircle, PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneOff } from 'lucide-react-native';

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

interface CallLogItemProps {
  item: CallLog;
  simCount?: number;
}

export const CallLogItem: React.FC<CallLogItemProps> = ({ item, simCount = 0 }) => {
  const navigation = useNavigation<any>();
  const { color, Icon: TypeIcon } = getCallTypeInfo(item.type);

  const handleCopy = () => {
    Clipboard.setString(item.phoneNumber);
    if (ToastAndroid) {
      ToastAndroid.show('Number copied to clipboard', ToastAndroid.SHORT);
    }
  };

  const handleMessage = () => {
    const url = Platform.OS === 'android' ? `sms:${item.phoneNumber}?body=` : `sms:${item.phoneNumber}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback for some devices where canOpenURL fails but openURL works
        Linking.openURL(url).catch(() => {
          Alert.alert('Error', 'Messaging app not found');
        });
      }
    });
  };

  const handleWhatsApp = () => {
    const cleanNumber = item.phoneNumber.replace(/[^\d+]/g, '');
    const url = `whatsapp://send?phone=${cleanNumber}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'WhatsApp not installed');
    });
  };

  const handleCall = () => {
    // Direct call using the native module to skip the system dialer confirmation if possible
    if (PhoneModule && PhoneModule.makeCall) {
        PhoneModule.makeCall(item.phoneNumber, item.simSlot || 0);
    } else {
        Linking.openURL(`tel:${item.phoneNumber}`);
    }
  };

  const handleAnalytics = () => {
    navigation.navigate('ContactAnalytics', { 
      phoneNumber: item.phoneNumber, 
      name: item.name 
    });
  };

  return (
    <View style={styles.card}>
      {/* Top Section */}
      <TouchableOpacity style={styles.topSection} onPress={handleAnalytics} activeOpacity={0.7}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <TypeIcon size={20} color="white" />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name || 'Unknown'}</Text>
          <Text style={styles.number}>{item.phoneNumber}</Text>
        </View>
        <View style={styles.meta}>
          <View style={styles.simIndicator}>
            <Text style={styles.simText}>{item.simSlot !== undefined ? item.simSlot + 1 : '1'}</Text>
          </View>
          <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
          <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
        </View>
      </TouchableOpacity>

      {/* Action Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleCopy} accessibilityLabel="Copy Number">
          <Copy size={20} color="#9E9E9E" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleMessage} accessibilityLabel="Send Message">
          <MessageSquare size={20} color="#546E7A" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleWhatsApp} accessibilityLabel="WhatsApp Message">
          <MessageCircle size={20} color="#25D366" /> 
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleCall} accessibilityLabel="Make Call">
          <Phone size={20} color="#546E7A" />
        </TouchableOpacity>
      </View>
      
      {/* Recording Section */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          {item.recordingUrl ? (
             <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F7FA', padding: 8, borderRadius: 8 }} onPress={() => Alert.alert("Playing", "Playing recording...")}>
                <Text style={{ color: '#006064', fontWeight: 'bold' }}>Play Recording</Text>
             </TouchableOpacity>
          ) : (
             <Text style={{ fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', marginLeft: 4 }}>No recording available</Text>
          )}
      </View>


      {/* Note Section */}
      <TouchableOpacity style={styles.noteSection}>
        <StickyNote size={14} color="#9E9E9E" />
        <Text style={styles.noteText}>Tap to add note & tag</Text>
      </TouchableOpacity>
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
    alignItems: 'center',
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
  },
  meta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
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
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  actionButton: {
    padding: 8,
  },
  noteSection: {
    backgroundColor: '#EEEEEE',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  noteText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 8,
  },
});
