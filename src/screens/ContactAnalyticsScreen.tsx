import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Funnel, MoreVertical } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { CallLogService } from '../services/CallLogService';
import { CallLog, CallType } from '../types/CallLog';
import { calculateCallStats, formatDurationLong } from '../utils/analyticsUtils';
import { DonutChart } from '../components/DonutChart';
import { CallLogItem } from '../components/CallLogItem';

export const ContactAnalyticsScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { phoneNumber, name } = route.params;
  const [allLogs, setAllLogs] = useState<CallLog[]>([]);
  const [contactLogs, setContactLogs] = useState<CallLog[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'analysis' | 'history'>('summary');

  useEffect(() => {
    loadContactLogs();
  }, []);

  const loadContactLogs = async () => {
    const logs = await CallLogService.getCallLogs();
    setAllLogs(logs);
    
    // Filter logs for this specific contact
    const filtered = logs.filter(log => log.phoneNumber === phoneNumber);
    setContactLogs(filtered);
  };

  const stats = calculateCallStats(contactLogs);

  const getDurationRange = () => {
    if (contactLogs.length === 0) return { start: '', end: '', days: 0 };
    
    const timestamps = contactLogs.map(l => l.timestamp).sort((a, b) => a - b);
    const start = new Date(timestamps[0]);
    const end = new Date(timestamps[timestamps.length - 1]);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    
    const formatDate = (d: Date) => {
      const day = d.getDate().toString().padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'short' });
      return `${day} ${month}`;
    };
    
    return {
      start: formatDate(start),
      end: formatDate(end),
      days,
    };
  };

  const duration = getDurationRange();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerName}>{name || 'Unknown'}</Text>
          <Text style={styles.headerNumber}>{phoneNumber}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Funnel size={22} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <MoreVertical size={22} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Add to Group */}
      <TouchableOpacity style={styles.addToGroup}>
        <Text style={styles.addToGroupText}>+ Add to Group</Text>
      </TouchableOpacity>

      {/* Duration Info */}
      <View style={styles.durationInfo}>
        <View style={styles.durationItem}>
          <Text style={styles.durationLabel}>Duration</Text>
          <Text style={styles.durationValue}>{duration.start} - {duration.end}</Text>
        </View>
        <View style={styles.durationItem}>
          <Text style={styles.durationLabel}>Total days</Text>
          <Text style={styles.durationValue}>{duration.days} Days</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={styles.tab}
          onPress={() => setActiveTab('summary')}
        >
          <Text style={[styles.tabText, activeTab === 'summary' && styles.tabTextActive]}>Summary</Text>
          {activeTab === 'summary' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tab}
          onPress={() => setActiveTab('analysis')}
        >
          <Text style={[styles.tabText, activeTab === 'analysis' && styles.tabTextActive]}>Analysis</Text>
          {activeTab === 'analysis' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tab}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Call History</Text>
          {activeTab === 'history' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === 'summary' && (
          <>
            {/* Donut Chart */}
            <View style={styles.chartCard}>
              <DonutChart
                incoming={stats.incoming}
                outgoing={stats.outgoing}
                missed={stats.missed}
                rejected={stats.rejected}
                size={220}
              />
            </View>

            {/* Stats Table Header */}
            <View style={styles.tableHeader}>
               <Text style={[styles.tableHeaderText, { flex: 1.5 }]}> </Text>
               <Text style={styles.tableHeaderText}>Calls</Text>
               <Text style={styles.tableHeaderText}>Duration</Text>
            </View>

            {/* Stats Table */}
            <View style={styles.statsTable}>
              <View style={styles.statsRow}>
                <Text style={[styles.statsLabel, { color: '#8BC34A' }]}>Incoming</Text>
                <Text style={styles.statsValue}>{stats.incoming}</Text>
                <Text style={styles.statsDuration}>{formatDurationLong(stats.incomingDuration)}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={[styles.statsLabel, { color: '#FFA000' }]}>Outgoing</Text>
                <Text style={styles.statsValue}>{stats.outgoing}</Text>
                <Text style={styles.statsDuration}>{formatDurationLong(stats.outgoingDuration)}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={[styles.statsLabel, { color: '#E57373' }]}>Missed</Text>
                <Text style={styles.statsValue}>{stats.missed}</Text>
                <Text style={styles.statsDuration}>-</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={[styles.statsLabel, { color: '#D32F2F' }]}>Rejected</Text>
                <Text style={styles.statsValue}>{stats.rejected}</Text>
                <Text style={styles.statsDuration}>-</Text>
              </View>
              
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValue}>{stats.total}</Text>
                <Text style={styles.totalDuration}>{formatDurationLong(stats.totalDuration)}</Text>
              </View>
            </View>
          </>
        )}

        {activeTab === 'history' && (
          <View style={styles.historyContainer}>
            {contactLogs.map(log => (
              <CallLogItem key={log.id} item={log} simCount={2} />
            ))}
          </View>
        )}

        {activeTab === 'analysis' && (
          <View style={styles.analysisContainer}>
            <Text style={styles.comingSoon}>Analysis coming soon...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  headerNumber: {
    fontSize: 14,
    color: '#666',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
  },
  addToGroup: {
    backgroundColor: colors.white,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  addToGroupText: {
    fontSize: 15,
    color: '#F9A825',
    fontWeight: '600',
  },
  durationInfo: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  durationItem: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  durationValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '700',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingTop: 8,
    paddingHorizontal: 10,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    minWidth: 100,
  },
  tabText: {
    fontSize: 15,
    color: '#888',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#333',
  },
  tabIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  chartCard: {
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingVertical: 30,
    margin: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 30,
    marginTop: 10,
    marginBottom: 5,
  },
  tableHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  statsTable: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statsLabel: {
    flex: 1.5,
    fontSize: 16,
    fontWeight: '500',
  },
  statsValue: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  statsDuration: {
    flex: 1,
    fontSize: 15,
    color: '#555',
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#DDD',
  },
  totalLabel: {
    flex: 1.5,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  totalValue: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  totalDuration: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'right',
  },
  historyContainer: {
    padding: 16,
  },
  analysisContainer: {
    padding: 40,
    alignItems: 'center',
  },
  comingSoon: {
    fontSize: 16,
    color: '#999',
  },
});
