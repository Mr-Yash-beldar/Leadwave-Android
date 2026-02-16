// components/CallEndPopup.tsx
import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { colors } from '../theme/colors';
import { CallInfo } from '../services/CallDetectionService';

interface CallEndPopupProps {
  isVisible: boolean;
  callInfo: CallInfo;
  onAction: (action: 'add' | 'dispose' | 'dismiss', callInfo: CallInfo) => void;
  onClose: () => void;
}

export const CallEndPopup: React.FC<CallEndPopupProps> = ({
  isVisible,
  callInfo,
  onAction,
  onClose,
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.popupContainer}>
              <View style={styles.header}>
                <Text style={styles.title}>Call Ended</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.content}>
                <Text style={styles.phoneNumber}>{callInfo.phoneNumber}</Text>
                
                {callInfo.name && (
                  <Text style={styles.contactName}>{callInfo.name}</Text>
                )}
                
                <View style={styles.detailsRow}>
                  <Text style={styles.detailLabel}>Duration:</Text>
                  <Text style={styles.detailValue}>
                    {formatDuration(callInfo.duration || 0)}
                  </Text>
                </View>

                <View style={styles.detailsRow}>
                  <Text style={styles.detailLabel}>Type:</Text>
                  <Text style={styles.detailValue}>
                    {callInfo.isIncoming ? 'Incoming' : 'Outgoing'}
                  </Text>
                </View>

                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.addButton]}
                    onPress={() => onAction('add', callInfo)}
                  >
                    <Text style={styles.addButtonText}>Add Lead</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.disposeButton]}
                    onPress={() => onAction('dispose', callInfo)}
                  >
                    <Text style={styles.disposeButtonText}>Dispose Lead</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={() => onAction('dismiss', callInfo)}
                >
                  <Text style={styles.dismissButtonText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupContainer: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.primary,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  phoneNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  contactName: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  addButton: {
    backgroundColor: colors.primary,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  disposeButton: {
    backgroundColor: colors+'warning 20',
    borderWidth: 1,
    borderColor: colors+'warning 20',
  },
  disposeButtonText: {
    color: colors+'warning 20',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dismissButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});