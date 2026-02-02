import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ToastAndroid, Clipboard, Alert } from 'react-native';
import { Copy, MessageSquare, MessageCircle, Phone, Heart } from 'lucide-react-native';
import { colors } from '../theme/colors';

interface ContactCardProps {
  name: string;
  phoneNumber: string;
  totalCalls: number;
  isStarred?: boolean;
  onCall: () => void;
  onAnalytics: () => void;
  onToggleFavorite?: () => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({ 
  name, 
  phoneNumber, 
  totalCalls, 
  isStarred,
  onCall, 
  onAnalytics,
  onToggleFavorite
}) => {
  const handleCopy = () => {
    Clipboard.setString(phoneNumber);
    ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT);
  };

  const handleMessage = () => {
    Linking.openURL(`sms:${phoneNumber}`);
  };

  const handleWhatsApp = () => {
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    Linking.openURL(`whatsapp://send?phone=${cleanNumber}`).catch(() => {
      Alert.alert('Error', 'WhatsApp is not installed');
    });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onAnalytics} activeOpacity={0.9}>
      <View style={styles.topRow}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name ? name[0].toUpperCase() : '?'}</Text>
          </View>
        </View>
        <View style={styles.infoContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <TouchableOpacity style={styles.addGroupButton}>
              <Text style={styles.addGroupText}>+ Add to Group</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.phoneNumber}>{phoneNumber}</Text>
          <Text style={styles.totalCalls}>Total Calls : {totalCalls}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={onToggleFavorite}>
          <Heart size={22} color={isStarred ? '#E91E63' : '#90A4AE'} fill={isStarred ? '#E91E63' : 'transparent'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
          <Copy size={22} color="#90A4AE" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
          <MessageSquare size={22} color="#00ACC1" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleWhatsApp}>
          <MessageCircle size={22} color="#43A047" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onCall}>
          <Phone size={22} color="#546E7A" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  topRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatarContainer: {
    borderWidth: 2,
    borderColor: '#FFD600',
    borderRadius: 30,
    padding: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  addGroupButton: {
    borderWidth: 1,
    borderColor: '#FFD600',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  addGroupText: {
    color: '#FFD600',
    fontSize: 11,
    fontWeight: 'bold',
  },
  phoneNumber: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  totalCalls: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  actionButton: {
    padding: 8,
  },
});
