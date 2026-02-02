import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, NativeModules, Platform, TextInput, Keyboard, Alert, Modal, Animated, Dimensions } from 'react-native';
import { colors } from '../theme/colors';
import { Phone, X, Copy, MessageCircle, GripVertical } from 'lucide-react-native';

const { PhoneModule } = NativeModules;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DialerButton = ({ value, onPress }: { value: string; onPress: (v: string) => void }) => (
  <TouchableOpacity style={styles.dialButton} onPress={() => onPress(value)} activeOpacity={0.6}>
    <Text style={styles.dialButtonText}>{value}</Text>
  </TouchableOpacity>
);

interface DialerModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const DialerModal: React.FC<DialerModalProps> = ({ isVisible, onClose }) => {
  const [number, setNumber] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isVisible) {
      // Small delay to ensure input is ready for focus after modal animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    } else {
      setNumber('');
    }
  }, [isVisible]);

  const handlePress = (val: string) => {
    setNumber(prev => prev + val);
    inputRef.current?.focus();
  };

  const handleDelete = () => {
    setNumber(prev => prev.slice(0, -1));
    inputRef.current?.focus();
  };

  const handleCall = (slot: number) => {
    if (number) {
      if (PhoneModule) {
        PhoneModule.makeCall(number, slot);
      }
    }
  };

  const handleWhatsApp = () => {
    if (!number.startsWith('+')) {
      Alert.alert('Error', 'Please add country code (e.g., +91) for WhatsApp');
      return;
    }
    const cleanNumber = number.replace('+', '');
    const url = `whatsapp://send?phone=${cleanNumber}`;
    const { Linking } = require('react-native');
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'WhatsApp not installed');
    });
  };

  const handleCopy = () => {
    const { Clipboard, ToastAndroid } = require('react-native');
    Clipboard.setString(number);
    if (ToastAndroid) ToastAndroid.show('Number copied', ToastAndroid.SHORT);
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
         <TouchableOpacity 
            style={styles.dismissOverlay} 
            activeOpacity={1} 
            onPress={onClose} 
         />
        <View style={styles.modalContent}>
          <View style={styles.indicator} />
          
          <View style={styles.numberRow}>
            <TouchableOpacity onPress={handleCopy} style={styles.iconSide}>
              <Copy size={24} color="#555" />
            </TouchableOpacity>
            
            <TextInput
              ref={inputRef}
              style={styles.numberInput}
              value={number}
              onChangeText={setNumber}
              showSoftInputOnFocus={false}
              caretHidden={false}
              selectionColor="#FFD600"
              keyboardType="phone-pad"
              textAlign="center"
              editable={true}
              onFocus={() => Keyboard.dismiss()}
            />

            <TouchableOpacity onPress={handleDelete} style={styles.iconSide}>
              <View style={styles.backspaceIcon}>
                   <X size={18} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.dialpad}>
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
                  <DialerButton value="*" onPress={handlePress} />
                  <DialerButton value="0" onPress={handlePress} />
                  <DialerButton value="#" onPress={handlePress} />
              </View>
          </View>

          <View style={styles.bottomActions}>
              <TouchableOpacity style={styles.whiteIconBtn} onPress={handleWhatsApp}>
                  <MessageCircle size={28} color="#25D366" />
              </TouchableOpacity>

              <View style={styles.greenCallBtnGroup}>
                  <TouchableOpacity style={styles.callSplitBtn} onPress={() => handleCall(0)}>
                      <Phone size={24} color="white" fill="white" />
                      <Text style={styles.simBadge}>1</Text>
                  </TouchableOpacity>
                  <View style={styles.splitLine} />
                  <TouchableOpacity style={styles.callSplitBtn} onPress={() => handleCall(1)}>
                      <Phone size={24} color="white" fill="white" />
                      <Text style={styles.simBadge}>2</Text>
                  </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.whiteIconBtn} onPress={onClose}>
                  <GripVertical size={24} color="#888" />
              </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingBottom: 20,
    minHeight: SCREEN_HEIGHT * 0.7,
  },
  indicator: {
    width: 40,
    height: 5,
    backgroundColor: '#CCC',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    marginTop: 10,
  },
  iconSide: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberInput: {
    flex: 1,
    fontSize: 42,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  backspaceIcon: {
      backgroundColor: '#333',
      borderRadius: 12,
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
  },
  dialpad: {
    marginVertical: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 5,
  },
  dialButton: {
    width: 80,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialButtonText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  bottomActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      marginTop: 10,
      marginBottom: 10,
  },
  whiteIconBtn: {
      width: 50,
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
  },
  greenCallBtnGroup: {
      flexDirection: 'row',
      backgroundColor: '#00A859',
      borderRadius: 35,
      height: 60,
      width: 170,
      alignItems: 'center',
      overflow: 'hidden',
  },
  callSplitBtn: {
      flex: 1,
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
  },
  splitLine: {
      width: 1,
      height: '50%',
      backgroundColor: 'rgba(255,255,255,0.3)',
  },
  simBadge: {
      color: 'white',
      fontSize: 10,
      fontWeight: 'bold',
      marginLeft: 4,
      marginTop: 8,
  }
});
