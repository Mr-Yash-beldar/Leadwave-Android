// src/components/CallEndPopup.tsx
/**
 * CallEndPopup — shown after every call ends.
 *
 * Checks the phone number via `checkPhone` API (cached) and shows:
 *  - My lead (assigned to me)   → Dispose Lead + auto-post already done
 *  - Lead but not mine          → Assign to Me
 *  - Not in DB                  → Add Lead
 *  - Always                     → Dismiss
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';

export interface PendingCallEnd {
  phoneNumber: string;
  duration: number;       // seconds
  callType: 'incoming' | 'outgoing' | 'missed';
}

/** What the checkPhone API returns about a number */
export interface CheckPhoneResult {
  found: boolean;
  isMyLead: boolean;      // lead exists and IS assigned to current user
  leadId?: string;
  leadName?: string;
  leadStatus?: string;
  leadData?: any;         // full lead object for navigation
}

interface CallEndPopupProps {
  isVisible: boolean;
  callEnd: PendingCallEnd | null;
  checkResult: CheckPhoneResult | null;
  isChecking: boolean;
  onDispose: () => void;
  onAssignSelf: () => void;
  onAddLead: () => void;
  onClose: () => void;
}

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const callTypeLabel = (type: string): string => {
  switch (type) {
    case 'incoming': return '↙ Incoming';
    case 'outgoing': return '↗ Outgoing';
    case 'missed': return '✕ Missed';
    default: return type;
  }
};

export const CallEndPopup: React.FC<CallEndPopupProps> = ({
  isVisible,
  callEnd,
  checkResult,
  isChecking,
  onDispose,
  onAssignSelf,
  onAddLead,
  onClose,
}) => {
  if (!callEnd) return null;

  const renderActions = () => {
    if (isChecking) {
      return (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Checking number...</Text>
        </View>
      );
    }

    if (!checkResult) return null;

    if (checkResult.found && checkResult.isMyLead) {
      // My lead — show dispose
      return (
        <View style={styles.buttonColumn}>
          <View style={styles.leadBadge}>
            <Text style={styles.leadBadgeText}>
              Your Lead: {checkResult.leadName || 'Known Lead'}
            </Text>
          </View>
          <TouchableOpacity style={[styles.actionBtn, styles.disposeBtn]} onPress={onDispose}>
            <Text style={styles.disposeBtnText}>✓ Dispose Lead</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (checkResult.found && !checkResult.isMyLead) {
      // Lead exists but not mine
      return (
        <View style={styles.buttonColumn}>
          <View style={[styles.leadBadge, styles.leadBadgeOrange]}>
            <Text style={styles.leadBadgeText}>
              Lead Exists: {checkResult.leadName || 'Someone Else\'s Lead'}
            </Text>
          </View>
          <TouchableOpacity style={[styles.actionBtn, styles.assignBtn]} onPress={onAssignSelf}>
            <Text style={styles.assignBtnText}>+ Assign to Me</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Not in DB
    return (
      <TouchableOpacity style={[styles.actionBtn, styles.addBtn]} onPress={onAddLead}>
        <Text style={styles.addBtnText}>+ Add as Lead</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheet}>
              {/* Handle bar */}
              <View style={styles.handle} />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.callEndIcon}>
                  <Text style={styles.callEndIconText}>📞</Text>
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.title}>Call Ended</Text>
                  <Text style={styles.phoneNum}>{callEnd.phoneNumber}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Duration</Text>
                  <Text style={styles.statValue}>{formatDuration(callEnd.duration)}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Type</Text>
                  <Text style={styles.statValue}>{callTypeLabel(callEnd.callType)}</Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                {renderActions()}
              </View>

              {/* Dismiss */}
              <TouchableOpacity style={styles.dismissBtn} onPress={onClose}>
                <Text style={styles.dismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    paddingHorizontal: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  callEndIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  callEndIconText: {
    fontSize: 22,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  phoneNum: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  actionsContainer: {
    marginBottom: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  buttonColumn: {
    gap: 10,
  },
  leadBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  leadBadgeOrange: {
    backgroundColor: '#FFF3E0',
  },
  leadBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  disposeBtn: {
    backgroundColor: colors.primary,
  },
  disposeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  assignBtn: {
    backgroundColor: colors.secondary,
  },
  assignBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  addBtn: {
    backgroundColor: colors.success,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  dismissBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  dismissText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});