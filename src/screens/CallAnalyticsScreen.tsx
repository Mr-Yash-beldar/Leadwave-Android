import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Modal,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Share2,
  Download,
  Calendar,
  Info,
  MessageSquare,
  X,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { api } from '../services/api';
import { ReportService } from '../services/ReportService';
import { ReportMetrics } from '../types/Report';

// ─── Skeleton shimmer ─────────────────────────────────────────────────────
const SkeletonCard = () => {
  const anim = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  return (
    <Animated.View style={[styles.card, { opacity: anim }]}>
      <View style={styles.skeletonValue} />
      <View style={styles.skeletonLabel} />
    </Animated.View>
  );
};

const SkeletonSection = ({ rows = 4 }: { rows?: number }) => (
  <>
    <View style={styles.sectionHeader}>
      <View style={styles.skeletonTitle} />
    </View>
    <View style={styles.grid}>
      {Array.from({ length: rows }).map((_, i) => <SkeletonCard key={i} />)}
    </View>
  </>
);

// ─── Main Screen ──────────────────────────────────────────────────────────
export const CallAnalyticsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'custom'>('today');

  // Custom date range
  const [customStart, setCustomStart] = useState<Date>(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d;
  });
  const [customEnd, setCustomEnd] = useState<Date>(new Date());
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end'>('start');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const getDateRange = useCallback(() => {
    const now = new Date();
    if (dateFilter === 'today') {
      const s = now.toISOString().split('T')[0];
      return { start: s, end: s };
    }
    if (dateFilter === 'yesterday') {
      const y = new Date(now); y.setDate(now.getDate() - 1);
      const s = y.toISOString().split('T')[0];
      return { start: s, end: s };
    }
    return {
      start: customStart.toISOString().split('T')[0],
      end: customEnd.toISOString().split('T')[0],
    };
  }, [dateFilter, customStart, customEnd]);

  const filterLabel =
    dateFilter === 'today' ? 'Today'
      : dateFilter === 'yesterday' ? 'Yesterday'
        : `${fmtDate(customStart)} – ${fmtDate(customEnd)}`;

  const fetchReport = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { start, end } = getDateRange();
      const response = await api.getCallReports(start, end);
      if (response.success) {
        setMetrics(ReportService.calculateMetrics(response.data));
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getDateRange]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // ── original sub-components ───────────────────────────────────────────
  const MetricCard = ({ label, value, subValue, icon: Icon, info }: any) => (
    <View style={styles.card}>
      <Text style={styles.cardValue}>{value ?? 0}</Text>
      <View style={styles.labelRow}>
        <Text style={styles.cardLabel}>{label}</Text>
        {Icon && <Icon size={14} color={colors.textSecondary} style={styles.cardIcon} />}
        {info && <Info size={14} color={colors.textSecondary} />}
      </View>
      {subValue && <Text style={styles.cardSubValue}>{subValue}</Text>}
    </View>
  );

  const SectionHeader = ({ title, info }: { title: string; info?: boolean }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {info && <Info size={16} color={colors.textSecondary} style={styles.infoIcon} />}
    </View>
  );

  // ── custom date range modal ───────────────────────────────────────────
  const CustomRangeModal = () => (
    <Modal visible={showRangeModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Custom Date Range</Text>
            <TouchableOpacity onPress={() => setShowRangeModal(false)}>
              <X size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>Start Date</Text>
          <TouchableOpacity
            style={styles.datePickerBtn}
            onPress={() => { setPickerTarget('start'); setShowDatePicker(true); }}
          >
            <Calendar size={16} color={colors.primary} />
            <Text style={styles.datePickerText}>{fmtDate(customStart)}</Text>
          </TouchableOpacity>

          <Text style={styles.modalLabel}>End Date</Text>
          <TouchableOpacity
            style={styles.datePickerBtn}
            onPress={() => { setPickerTarget('end'); setShowDatePicker(true); }}
          >
            <Calendar size={16} color={colors.primary} />
            <Text style={styles.datePickerText}>{fmtDate(customEnd)}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={pickerTarget === 'start' ? customStart : customEnd}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={new Date()}
              onChange={(_, selected) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selected) {
                  if (pickerTarget === 'start') setCustomStart(selected);
                  else setCustomEnd(selected);
                }
              }}
            />
          )}

          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => { setDateFilter('custom'); setShowRangeModal(false); }}
          >
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ── render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header — original */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reports</Text>
        <View style={styles.headerActions} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchReport(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Date selector row — now with 3 chips */}
        <View style={styles.dateSelectorRow}>
          <TouchableOpacity
            style={[styles.dateChip, dateFilter === 'today' && styles.dateChipActive]}
            onPress={() => setDateFilter('today')}
          >
            <Text style={[styles.dateChipText, dateFilter === 'today' && styles.dateChipTextActive]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dateChip, dateFilter === 'yesterday' && styles.dateChipActive]}
            onPress={() => setDateFilter('yesterday')}
          >
            <Text style={[styles.dateChipText, dateFilter === 'yesterday' && styles.dateChipTextActive]}>
              Yesterday
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dateChip, dateFilter === 'custom' && styles.dateChipActive,
            dateFilter === 'custom' && { flexShrink: 1 }]}
            onPress={() => setShowRangeModal(true)}
          >
            <Calendar size={13} color={dateFilter === 'custom' ? colors.black : colors.textSecondary} />
            <Text style={[styles.dateChipText, { marginLeft: 4 },
            dateFilter === 'custom' && styles.dateChipTextActive]}
              numberOfLines={1}>
              {dateFilter === 'custom' ? filterLabel : 'Custom'}
            </Text>
          </TouchableOpacity>
          {/* <Text style={styles.reportSubtitle}>My Report</Text> */}
        </View>

        {loading ? (
          <View style={styles.reportsContainer}>
            <SkeletonSection rows={6} />
            <SkeletonSection rows={4} />
            <SkeletonSection rows={4} />
            <SkeletonSection rows={4} />
          </View>
        ) : metrics ? (
          <View style={styles.reportsContainer}>
            <SectionHeader title="Call Overview" />
            <View style={styles.grid}>
              <MetricCard label="Total Calls" value={metrics.callOverview.totalCalls} />
              <MetricCard label="Total Calls Connected" value={metrics.callOverview.totalConnected} />
              <MetricCard label="Total Call Time" value={metrics.callOverview.totalCallTime} />
              <MetricCard label="Total Unconnected Calls" value={metrics.callOverview.totalUnconnected} />
              <MetricCard label="Avg. Call Duration" value={metrics.callOverview.avgCallDuration} />
              <MetricCard label="Avg. Start Calling Time" value={metrics.callOverview.avgStartCallingTime} />
            </View>

            <SectionHeader title="Outgoing Calls" />
            <View style={styles.grid}>
              <MetricCard label="Total Outgoing Calls" value={metrics.outgoingCalls.totalOutgoing} />
              <MetricCard label="Outgoing Connected Calls" value={metrics.outgoingCalls.outgoingConnected} />
              <MetricCard label="Outgoing Unanswered Calls" value={metrics.outgoingCalls.outgoingUnanswered} />
              <MetricCard label="Avg. Outgoing Call Duration" value={metrics.outgoingCalls.avgOutgoingDuration} />
            </View>

            <SectionHeader title="Incoming Calls" />
            <View style={styles.grid}>
              <MetricCard label="Total Incoming Calls" value={metrics.incomingCalls.totalIncoming} />
              <MetricCard label="Incoming Connected Calls" value={metrics.incomingCalls.incomingConnected} />
              <MetricCard label="Incoming Unanswered Calls" value={metrics.incomingCalls.incomingUnanswered} />
              <MetricCard label="Avg. Incoming Call Duration" value={metrics.incomingCalls.avgIncomingDuration} />
            </View>

            {/* <SectionHeader title="Follow up Report" info />
            <View style={styles.grid}>
              <MetricCard label="Follow Ups Due Today" value={metrics.followUpReport.dueToday} />
              <MetricCard label="Follow Ups Missed Yesterday" value={metrics.followUpReport.missedYesterday} />
              <MetricCard label="Avg. Turn Around Time" value={metrics.followUpReport.avgTurnAroundTime} info />
              <MetricCard label="Compliance%" value={metrics.followUpReport.compliance} info />
            </View> */}

            {/* <SectionHeader title="Dispositions" />
            <View style={styles.grid}>
              <MetricCard label="Total Disposed count" value={metrics.dispositions.totalDisposed} />
              <MetricCard label="Disposed Connected count" value={metrics.dispositions.disposedConnected} />
              <MetricCard label="Disposed Not Connected count" value={metrics.dispositions.disposedNotConnected} />
              <MetricCard label="Converted" value={metrics.dispositions.converted} />
            </View> */}

            {/* <SectionHeader title="Activity Report" />
            <View style={styles.grid}>
              <MetricCard label="Total Break count" value={metrics.activityReport.totalBreakCount} />
              <MetricCard label="Total Break Duration" value={metrics.activityReport.totalBreakDuration} />
              <MetricCard label="Avg. Break Duration" value={metrics.activityReport.avgBreakDuration} />
              <MetricCard label="Avg. Form Filling Time" value={metrics.activityReport.avgFormFillingTime} />
            </View>

            <SectionHeader title="Message Activity" />
            <View style={styles.messageSection}>
              <View style={[styles.center, { height: 80 }]}>
                <MessageSquare size={32} color={colors.border} />
                <Text style={styles.emptyText}>No Message Activity Recorded</Text>
              </View>
            </View> */}
          </View>
        ) : null}
      </ScrollView>

      <CustomRangeModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ── original styles — unchanged ───────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: '#fdfdfdff',
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
    backgroundColor: colors.primary,
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // ── date selector — updated with chips ────────────────────────────────
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
    gap: 6,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dateChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFF9E6',
  },
  dateChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dateChipTextActive: {
    color: colors.black,
  },
  reportSubtitle: {
    marginLeft: 'auto',
    fontSize: 16,
    color: '#4A4A4A',
    fontWeight: '500',
  },
  // ── original report layout ────────────────────────────────────────────
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
  // ── original card ─────────────────────────────────────────────────────
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
  },
  // ── skeleton ──────────────────────────────────────────────────────────
  skeletonValue: {
    height: 22,
    width: '55%',
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonLabel: {
    height: 11,
    width: '80%',
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonTitle: {
    height: 16,
    width: '40%',
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  // ── custom date modal ─────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  datePickerText: {
    marginLeft: 8,
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  applyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
  },
});
