import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { colors } from '../theme/colors';

interface SIMPickerModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (slot: number) => void;
  phoneNumber: string;
}

export const SIMPickerModal: React.FC<SIMPickerModalProps> = ({ isVisible, onClose, onSelect, phoneNumber }) => {
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container}>
          <Text style={styles.title}>Select SIM for Call</Text>
          <Text style={styles.subtitle}>{phoneNumber}</Text>
          
          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={styles.simOption}
              onPress={() => onSelect(0)}
            >
              <View style={styles.simBadge}>
                <Text style={styles.simBadgeText}>1</Text>
              </View>
              <Text style={styles.simLabel}>SIM 1</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.simOption}
              onPress={() => onSelect(1)}
            >
              <View style={styles.simBadge}>
                <Text style={styles.simBadgeText}>2</Text>
              </View>
              <Text style={styles.simLabel}>SIM 2</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  simOption: {
    alignItems: 'center',
    width: 100,
  },
  simBadge: {
    width: 48,
    height: 60,
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  simBadgeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  simLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#F44336',
    fontWeight: '600',
  },
});
