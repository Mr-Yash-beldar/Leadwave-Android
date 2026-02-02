import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { LucideIcon } from 'lucide-react-native';

interface StatCardProps {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  count: number;
  duration?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ icon: Icon, iconColor, label, count, duration }) => {
  return (
    <View style={styles.card}>
      <View style={styles.iconRow}>
        <Icon size={24} color={iconColor} strokeWidth={2} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={styles.count}>{count}</Text>
      {duration && (
        <View style={styles.durationRow}>
          <Text style={styles.durationIcon}>⏱</Text>
          <Text style={styles.duration}>{duration}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  count: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  duration: {
    fontSize: 13,
    color: '#666',
  },
});
