import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Share2,
  Download,
  Calendar,
  Info,
  MessageSquare
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { api } from '../services/api';
import { ReportService } from '../services/ReportService';
import { ReportMetrics } from '../types/Report';

export const CallAnalyticsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'custom'>('today');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      let startDateStr, endDateStr;
      const now = new Date();

      if (dateFilter === 'today') {
        startDateStr = now.toISOString().split('T')[0];
        endDateStr = startDateStr;
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        startDateStr = yesterday.toISOString().split('T')[0];
        endDateStr = startDateStr;
      }
      // Custom range logic would go here if needed

      const response = await api.getCallReports(startDateStr, endDateStr);
      if (response.success) {
        const calculated = ReportService.calculateMetrics(response.data);
        setMetrics(calculated);
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
      // Fallback to local stats calculation if API fails or for testing
      // Alert.alert('Error', 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Shared Call Analytics Report from Leadwave app.',
      });
    } catch (error) {
      console.error(error);
    }
  };

  const MetricCard = ({ label, value, subValue, icon: Icon, info }: any) => (
    <View style={styles.card}>
      <Text style={styles.cardValue}>{value || 0}</Text>
      <View style={styles.labelRow}>
        <Text style={styles.cardLabel}>{label}</Text>
        {Icon && <Icon size={14} color={colors.textSecondary} style={styles.cardIcon} />}
        {info && <Info size={14} color={colors.textSecondary} />}
      </View>
      {subValue && <Text style={styles.cardSubValue}>{subValue}</Text>}
    </View>
  );

  const SectionHeader = ({ title, info }: { title: string, info?: boolean }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {info && <Info size={16} color={colors.textSecondary} style={styles.infoIcon} />}
    </View>
  );

  if (loading && !metrics) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reports</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare}>
            <Share2 size={24} color={colors.black} style={styles.headerActionIcon} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Download', 'PDF Report generation started...')}>
            <Download size={24} color={colors.black} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Date Selector Row */}
        <View style={styles.dateSelectorRow}>
          <TouchableOpacity
            style={styles.dateDisplay}
            onPress={() => {
              // Toggle between today/yesterday for now
              setDateFilter(prev => prev === 'today' ? 'yesterday' : 'today');
            }}
          >
            <Calendar size={20} color={colors.black} />
            <Text style={styles.dateDisplayText}>{dateFilter === 'today' ? 'Today' : 'Yesterday'}</Text>
          </TouchableOpacity>
          <Text style={styles.reportSubtitle}>My Report</Text>
        </View>

        {metrics && (
          <View style={styles.reportsContainer}>
            {/* Call Overview */}
            <SectionHeader title="Call Overview" />
            <View style={styles.grid}>
              <MetricCard label="Total Calls" value={metrics.callOverview.totalCalls} />
              <MetricCard label="Total Calls Connected" value={metrics.callOverview.totalConnected} />
              <MetricCard label="Total Call Time" value={metrics.callOverview.totalCallTime} />
              <MetricCard label="Total Unconnected Calls" value={metrics.callOverview.totalUnconnected} />
              <MetricCard label="Avg. Call Duration" value={metrics.callOverview.avgCallDuration} />
              <MetricCard label="Avg. Start Calling Time" value={metrics.callOverview.avgStartCallingTime} />
            </View>

            {/* Outgoing Calls */}
            <SectionHeader title="Outgoing Calls" />
            <View style={styles.grid}>
              <MetricCard label="Total Outgoing Calls" value={metrics.outgoingCalls.totalOutgoing} />
              <MetricCard label="Outgoing Connected Calls" value={metrics.outgoingCalls.outgoingConnected} />
              <MetricCard label="Outgoing Unanswered Calls" value={metrics.outgoingCalls.outgoingUnanswered} />
              <MetricCard label="Avg. Outgoing Call Duration" value={metrics.outgoingCalls.avgOutgoingDuration} />
            </View>

            {/* Incoming Calls */}
            <SectionHeader title="Incoming Calls" />
            <View style={styles.grid}>
              <MetricCard label="Total Incoming Calls" value={metrics.incomingCalls.totalIncoming} />
              <MetricCard label="Incoming Connected Calls" value={metrics.incomingCalls.incomingConnected} />
              <MetricCard label="Incoming Unanswered Calls" value={metrics.incomingCalls.incomingUnanswered} />
              <MetricCard label="Avg. Incoming Call Duration" value={metrics.incomingCalls.avgIncomingDuration} />
            </View>

            {/* Follow up Report */}
            <SectionHeader title="Follow up Report" info />
            <View style={styles.grid}>
              <MetricCard label="Follow Ups Due Today" value={metrics.followUpReport.dueToday} />
              <MetricCard label="Follow Ups Missed Yesterday" value={metrics.followUpReport.missedYesterday} />
              <MetricCard label="Avg. Turn Around Time" value={metrics.followUpReport.avgTurnAroundTime} info />
              <MetricCard label="Compliance%" value={metrics.followUpReport.compliance} info />
            </View>

            {/* Dispositions */}
            <SectionHeader title="Dispositions" />
            <View style={styles.grid}>
              <MetricCard label="Total Disposed count" value={metrics.dispositions.totalDisposed} />
              <MetricCard label="Disposed Connected count" value={metrics.dispositions.disposedConnected} />
              <MetricCard label="Disposed Not Connected count" value={metrics.dispositions.disposedNotConnected} />
              <MetricCard label="Converted" value={metrics.dispositions.converted} />
            </View>

            {/* Activity Report */}
            <SectionHeader title="Activity Report" />
            <View style={styles.grid}>
              <MetricCard label="Total Break count" value={metrics.activityReport.totalBreakCount} />
              <MetricCard label="Total Break Duration" value={metrics.activityReport.totalBreakDuration} />
              <MetricCard label="Avg. Break Duration" value={metrics.activityReport.avgBreakDuration} />
              <MetricCard label="Avg. Form Filling Time" value={metrics.activityReport.avgFormFillingTime} />
            </View>

            {/* Message Activity */}
            <SectionHeader title="Message Activity" />
            <View style={styles.messageSection}>
              <View style={[styles.center, { height: 80 }]}>
                <MessageSquare size={32} color={colors.border} />
                <Text style={styles.emptyText}>No Message Activity Recorded</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdfdfdff', // Very light purple background
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.primary, // Purple header
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.black,
    marginLeft: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionIcon: {
    marginRight: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dateDisplayText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
  },
  reportSubtitle: {
    marginLeft: 12,
    fontSize: 16,
    color: '#4A4A4A',
    fontWeight: '500',
  },
  reportsContainer: {
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  infoIcon: {
    marginLeft: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '49%',
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.black,
    marginBottom: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  cardIcon: {
    marginLeft: 4,
  },
  cardSubValue: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
  },
  messageSection: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  }
});
