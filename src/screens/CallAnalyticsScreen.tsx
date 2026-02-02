import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneOff, PhoneForwarded, PhoneMissedIcon } from 'lucide-react-native';
import { CallLogService } from '../services/CallLogService';
import { CallLog } from '../types/CallLog';
import { calculateCallStats, groupCallsByHour, filterLogsByDateRange, formatDurationLong } from '../utils/analyticsUtils';
import { BarChart } from '../components/BarChart';
import { StatCard } from '../components/StatCard';

export const CallAnalyticsScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const [allLogs, setAllLogs] = useState<CallLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<CallLog[]>([]);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month'>('today');
  const [activeTab, setActiveTab] = useState<'summary' | 'analysis'>('summary');
  const [chartMode, setChartMode] = useState<'calls' | 'duration'>('calls');

  useEffect(() => {
    loadCallLogs();
  }, []);

  useEffect(() => {
    if (allLogs.length > 0) {
      const filtered = filterLogsByDateRange(allLogs, dateFilter);
      setFilteredLogs(filtered);
    }
  }, [allLogs, dateFilter]);

  const loadCallLogs = async () => {
    const logs = await CallLogService.getCallLogs();
    setAllLogs(logs);
  };

  const stats = calculateCallStats(filteredLogs);
  const hourlyData = groupCallsByHour(filteredLogs);

  const getDateRangeText = () => {
    if (filteredLogs.length === 0) return 'No data';
    
    const dates = filteredLogs.map(l => new Date(l.timestamp)).sort((a, b) => a.getTime() - b.getTime());
    const start = dates[0];
    const end = dates[dates.length - 1];
    
    const formatDate = (d: Date) => {
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      const hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      
      return `${day}-${month} ${hour12}:${minutes} ${ampm}`;
    };
    
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
      </View>

      {/* Date Range */}
      <View style={styles.dateRangeContainer}>
        <Text style={styles.dateRangeText}>{getDateRangeText()}</Text>
        <View style={styles.filterDropdown}>
          <TouchableOpacity 
            style={[styles.filterButton, dateFilter === 'today' && styles.filterButtonActive]}
            onPress={() => setDateFilter('today')}
          >
            <Text style={[styles.filterButtonText, dateFilter === 'today' && styles.filterButtonTextActive]}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, dateFilter === 'week' && styles.filterButtonActive]}
            onPress={() => setDateFilter('week')}
          >
            <Text style={[styles.filterButtonText, dateFilter === 'week' && styles.filterButtonTextActive]}>Week</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, dateFilter === 'month' && styles.filterButtonActive]}
            onPress={() => setDateFilter('month')}
          >
            <Text style={[styles.filterButtonText, dateFilter === 'month' && styles.filterButtonTextActive]}>Month</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Bar Chart */}
        <View style={styles.chartSection}>
          <BarChart data={hourlyData} />
          
          {/* Chart Mode Toggle */}
          <View style={styles.chartModeToggle}>
            <TouchableOpacity 
              style={styles.chartModeButton}
              onPress={() => setChartMode('calls')}
            >
              <Text style={[styles.chartModeText, chartMode === 'calls' && styles.chartModeTextActive]}>Phone Call</Text>
              {chartMode === 'calls' && <View style={styles.chartModeDot} />}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.chartModeButton}
              onPress={() => setChartMode('duration')}
            >
              <Text style={[styles.chartModeText, chartMode === 'duration' && styles.chartModeTextActive]}>Duration</Text>
              {chartMode === 'duration' && <View style={styles.chartModeDot} />}
            </TouchableOpacity>
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
        </View>

        {/* Summary Cards */}
        {activeTab === 'summary' && (
          <View style={styles.statsGrid}>
            <StatCard
              icon={PhoneIncoming}
              iconColor="#8BC34A"
              label="Total Phone Calls"
              count={stats.total}
              duration={formatDurationLong(stats.totalDuration)}
            />
            <StatCard
              icon={PhoneIncoming}
              iconColor="#8BC34A"
              label="Incoming Calls"
              count={stats.incoming}
              duration={formatDurationLong(stats.incomingDuration)}
            />
            <StatCard
              icon={PhoneOutgoing}
              iconColor="#FFA000"
              label="Outgoing Calls"
              count={stats.outgoing}
              duration={formatDurationLong(stats.outgoingDuration)}
            />
            <StatCard
              icon={PhoneMissed}
              iconColor="#E57373"
              label="Missed Calls"
              count={stats.missed}
            />
            <StatCard
              icon={PhoneOff}
              iconColor="#9E9E9E"
              label="Rejected Calls"
              count={stats.rejected}
            />
            <StatCard
              icon={PhoneForwarded}
              iconColor="#FFA000"
              label="Never Attended Calls"
              count={stats.neverAttended}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  dateRangeContainer: {
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRangeText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  filterDropdown: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 4,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 13,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  chartSection: {
    margin: 16,
  },
  chartModeToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 40,
  },
  chartModeButton: {
    alignItems: 'center',
  },
  chartModeText: {
    fontSize: 14,
    color: '#999',
  },
  chartModeTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  chartModeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000',
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 16,
    gap: 40,
  },
  tab: {
    alignItems: 'center',
  },
  tabText: {
    fontSize: 15,
    color: '#999',
  },
  tabTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  tabIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
});
