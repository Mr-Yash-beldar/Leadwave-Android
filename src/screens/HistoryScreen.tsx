import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  ActivityIndicator,
  Dimensions,
  NativeModules,
  Platform,
  TouchableOpacity,
  AppState,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { CallLogService } from '../services/CallLogService';
import { CallLog, CallType } from '../types/CallLog';
import { CallLogItem } from '../components/CallLogItem';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { FilterBar } from '../components/FilterBar';
import { SearchBar } from '../components/SearchBar';
import { DialpadFab } from '../components/DialpadFab';
import { BubbleLoader } from '../components/BubbleLoader';
import { DialerModal } from '../components/DialerModal';
import { OngoingCallCard } from '../components/OngoingCallCard';
import { AddLeadModal } from '../components/AddLeadModal';
import { colors } from '../theme/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CATEGORIES = ['all', 'incoming', 'outgoing', 'missed', 'rejected'];

type SourceType = 'personal' | 'leads';

interface HistoryPageProps {
  category: string;
  logs: CallLog[];                    // personal logs
  leadLogs: CallLog[];                // API / lead logs
  searchQuery: string;
  simCount: number;
  simFilter: 'all' | number;
  onLoadMore: () => void;
  loadingMore: boolean;
  initialLoading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  onAddLead: (number: string) => void;
  source: SourceType;
}

export const HistoryScreen: React.FC = () => {
  const [logs, setLogs] = useState<CallLog[]>([]);           // Personal / device logs
  const [leadLogs, setLeadLogs] = useState<CallLog[]>([]);   // Lead / CRM logs from API
  const [source, setSource] = useState<SourceType>('personal');

  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [daysOffset, setDaysOffset] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [simCount, setSimCount] = useState(0);
  const [simFilter, setSimFilter] = useState<'all' | number>('all');
  const [isDialerVisible, setIsDialerVisible] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Lead Modal State
  const [isLeadModalVisible, setIsLeadModalVisible] = useState(false);
  const [activeCallNumber, setActiveCallNumber] = useState('');

  const { user } = useAuth();
  const pagerRef = useRef<FlatList>(null);

  // ─── Personal logs fetch ────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (!dataFetched && source === 'personal') {
        fetchPersonalLogs();
      }
    }, [dataFetched, source])
  );

  const fetchPersonalLogs = async (force: boolean = false) => {
    if (!force && dataFetched) return;

    if (!dataFetched) setInitialLoading(true);
    if (force) {
      setRefreshing(true);
      setHasMore(true);
    }

    try {
      let currentOffset = 0;
      let fetchedLogs: CallLog[] = [];
      let attempts = 0;
      const MAX_INITIAL_ATTEMPTS = 7;

      while (fetchedLogs.length === 0 && attempts < MAX_INITIAL_ATTEMPTS) {
        fetchedLogs = await CallLogService.getCallLogsByDay(currentOffset);
        if (fetchedLogs.length === 0) {
          currentOffset++;
          attempts++;
        }
      }

      const count = (await NativeModules.PhoneModule?.getSimCount?.()) || 0;
      setSimCount(count);
      setDaysOffset(currentOffset);

      if (force || !dataFetched) {
        setLogs(fetchedLogs);
      } else {
        setLogs((prev) => {
          const combined = [...prev, ...fetchedLogs];
          return Array.from(new Map(combined.map((item) => [item.id, item])).values()).sort(
            (a, b) => b.timestamp - a.timestamp
          );
        });
      }

      setDataFetched(true);
      if (attempts >= MAX_INITIAL_ATTEMPTS && fetchedLogs.length === 0) {
        setHasMore(true);
      }
    } catch (e) {
      console.error('Personal logs fetch error:', e);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };
 
  // ─── Lead logs (API) fetch ──────────────────────────────────────
  const fetchLeadLogs = useCallback(async (force = false) => {
    if (!force && leadLogs.length > 0) return;

    try {
      const response = await api.getCallLogs(); // ← adjust endpoint/method if needed
      console.log('Lead logs API response:', response);
 
      if (response?.success && Array.isArray(response.data)) {
        // IMPORTANT: Map API shape → CallLog type
        const formatted: CallLog[] = response.data.map((item: any) => ({
          id: item.id || item.callId || String(Math.random()),
          phoneNumber: item.phone || item.number || item.contactNumber || '',
          name: item.leadName || item.contactName || item.name || '',
          type:
            item.direction === 'in' || item.type === 'incoming'
              ? CallType.Incoming
              : item.direction === 'out' || item.type === 'outgoing'
              ? CallType.Outgoing
              : item.missed || item.type === 'missed'
              ? CallType.Missed
              : CallType.Rejected,
          timestamp: new Date(item.createdAt || item.date || item.timestamp).getTime(),
          duration: item.duration || 0,
          simSlot: item.sim || item.simSlot || 0,
          // Add any other fields your CallLog type & UI need
        })).sort((a, b) => b.timestamp - a.timestamp);
console.log(formatted);
// console.log('formatted');

        setLeadLogs(formatted);
      }
    } catch (err) {
      console.error('Failed to fetch lead logs:', err);
    }
  }, [leadLogs.length]);

  // ─── Combined logic ─────────────────────────────────────────────
  useEffect(() => {
    if (source === 'personal') {
      fetchPersonalLogs();
    } else if (source === 'leads') {
      fetchLeadLogs(true);
    }
  }, [source]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        if (source === 'personal') fetchPersonalLogs(true);
        else fetchLeadLogs(true);
      }
    });
    return () => subscription.remove();
  }, [source]);

  const handleRefresh = useCallback(() => {
    if (source === 'personal') fetchPersonalLogs(true);
    else fetchLeadLogs(true);
  }, [source]);

  const handleFilterSelect = (newFilter: string) => {
    const index = CATEGORIES.indexOf(newFilter);
    if (index !== -1) {
      setFilter(newFilter);
      pagerRef.current?.scrollToIndex({ index, animated: true });
    }
  };

  const onPagerScroll = useCallback(
    (event: any) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const width = event.nativeEvent.layoutMeasurement.width;
      const index = Math.round(offsetX / width);

      if (index >= 0 && index < CATEGORIES.length) {
        const newFilter = CATEGORIES[index];
        if (newFilter !== filter) setFilter(newFilter);
      }
    },
    [filter]
  );

  const loadMore = async () => {
    if (loadingMore || !hasMore || source === 'leads') return; // ← no pagination for leads (yet)

    setLoadingMore(true);
    try {
      let nextOffset = daysOffset + 1;
      let fetchedLogs: CallLog[] = [];
      let attempts = 0;
      const MAX_ATTEMPTS = 14;

      while (fetchedLogs.length === 0 && attempts < MAX_ATTEMPTS && nextOffset < 365) {
        fetchedLogs = await CallLogService.getCallLogsByDay(nextOffset);
        if (fetchedLogs.length === 0) {
          nextOffset++;
          attempts++;
        }
      }

      if (fetchedLogs.length > 0) {
        setLogs((prev) => {
          const combined = [...prev, ...fetchedLogs];
          return Array.from(new Map(combined.map((item) => [item.id, item])).values()).sort(
            (a, b) => b.timestamp - a.timestamp
          );
        });
        setDaysOffset(nextOffset);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  const openAddLead = (number: string) => {
    setActiveCallNumber(number);
    setIsLeadModalVisible(true);
  };

  const renderCategoryPage = ({ item: cat }: { item: string }) => (
    <HistoryPage
      category={cat}
      logs={logs}
      leadLogs={leadLogs}
      searchQuery={searchQuery}
      simCount={simCount}
      simFilter={simFilter}
      onLoadMore={loadMore}
      loadingMore={loadingMore}
      initialLoading={initialLoading}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      onAddLead={openAddLead}
      source={source}
    />
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Call History</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setSimFilter('all')}
            style={[styles.simHeaderIcon, simFilter === 'all' && styles.simHeaderIconActive]}
          >
            <View style={[styles.allSimsIcon, simFilter === 'all' && styles.activeSimIconBox]}>
              <View
                style={[
                  styles.simIconBoxSmall,
                  { position: 'absolute', top: 2, left: 2, zIndex: 1, borderColor: simFilter === 'all' ? colors.primary : colors.black },
                ]}
              />
              <View
                style={[
                  styles.simIconBoxSmall,
                  { backgroundColor: colors.black, borderColor: simFilter === 'all' ? colors.primary : colors.black },
                ]}
              />
            </View>
          </TouchableOpacity>

          {simCount >= 1 && (
            <TouchableOpacity
              onPress={() => setSimFilter(0)}
              style={[styles.simHeaderIcon, simFilter === 0 && styles.simHeaderIconActive]}
            >
              <View style={[styles.simIconBox, simFilter === 0 && styles.activeSimIconBox]}>
                <Text style={[styles.simIconText, simFilter === 0 && styles.activeSimIconText]}>1</Text>
              </View>
            </TouchableOpacity>
          )}

          {simCount >= 2 && (
            <TouchableOpacity
              onPress={() => setSimFilter(1)}
              style={[styles.simHeaderIcon, simFilter === 1 && styles.simHeaderIconActive]}
            >
              <View style={[styles.simIconBox, simFilter === 1 && styles.activeSimIconBox]}>
                <Text style={[styles.simIconText, simFilter === 1 && styles.activeSimIconText]}>2</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FilterBar selectedFilter={filter} onSelectFilter={handleFilterSelect} />

      <View style={styles.contentContainer}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />

        {/* ─── Source Toggle ──────────────────────────────────────── */}
        <View style={styles.sourceToggleContainer}>
          <TouchableOpacity
            style={[styles.sourceOption, source === 'personal' && styles.sourceOptionActive]}
            onPress={() => setSource('personal')}
          >
            <Text
              style={[styles.sourceOptionText, source === 'personal' && styles.sourceOptionTextActive]}
            >
              Personal Logs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sourceOption, source === 'leads' && styles.sourceOptionActive]}
            onPress={() => setSource('leads')}
          >
            <Text
              style={[styles.sourceOptionText, source === 'leads' && styles.sourceOptionTextActive]}
            >
              Lead Logs
            </Text>
          </TouchableOpacity>
        </View>

        <OngoingCallCard onAddLead={openAddLead} />

        <FlatList
          ref={pagerRef}
          data={CATEGORIES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          renderItem={renderCategoryPage}
          onScroll={onPagerScroll}
          scrollEventThrottle={16}
          initialNumToRender={1}
          maxToRenderPerBatch={1}
          windowSize={2}
          removeClippedSubviews={Platform.OS === 'android'}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
        />
      </View>

      <DialerModal
        isVisible={isDialerVisible}
        onClose={() => setIsDialerVisible(false)}
        onAddLead={openAddLead}
      />
      <DialpadFab onPress={() => setIsDialerVisible(true)} />

      <AddLeadModal
        isVisible={isLeadModalVisible}
        onClose={() => setIsLeadModalVisible(false)}
        phoneNumber={activeCallNumber}
      />
    </SafeAreaView>
  );
};

const HistoryPage = React.memo(
  ({
    category,
    logs,
    leadLogs,
    searchQuery,
    simCount,
    simFilter,
    onLoadMore,
    loadingMore,
    initialLoading,
    onRefresh,
    refreshing,
    onAddLead,
    source,
  }: HistoryPageProps) => {
    const activeLogs = source === 'leads' ? leadLogs : logs;

    const groupedData = React.useMemo(() => {
      if (initialLoading) return [];

      const filtered = activeLogs.filter((log: CallLog) => {
        // SIM filter — you may want to disable for lead logs
        if (source === 'personal' && simFilter !== 'all') {
          if (log.simSlot !== simFilter) return false;
        }

        // Category filter
        if (category !== 'all') {
          if (category === 'incoming' && log.type !== CallType.Incoming) return false;
          if (category === 'outgoing' && log.type !== CallType.Outgoing) return false;
          if (category === 'missed' && log.type !== CallType.Missed) return false;
          if (category === 'rejected' && log.type !== CallType.Rejected) return false;
        }

        // Search
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            (log.name && log.name.toLowerCase().includes(q)) ||
            log.phoneNumber.includes(q) ||
            (log.leadName && log.leadName.toLowerCase().includes(q))
          ); 
        }
        return true;
      });

      const groups: { title: string; data: CallLog[] }[] = [];
      let currentDate = '';
      let currentGroup: CallLog[] = [];

      filtered.forEach((log: CallLog) => {
        const logDate = new Date(log.timestamp);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        let dateLabel = logDate.toDateString();
        if (logDate.toDateString() === today.toDateString()) dateLabel = 'Today';
        else if (logDate.toDateString() === yesterday.toDateString()) dateLabel = 'Yesterday';
        else dateLabel = logDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

        if (dateLabel !== currentDate) {
          if (currentGroup.length > 0) groups.push({ title: currentDate, data: currentGroup });
          currentDate = dateLabel;
          currentGroup = [log];
        } else {
          currentGroup.push(log);
        }
      });

      if (currentGroup.length > 0) groups.push({ title: currentDate, data: currentGroup });
      return groups;
    }, [activeLogs, category, searchQuery, simFilter, initialLoading, source]);

    if (initialLoading && source === 'personal') {
      return (
        <View style={styles.pageContainer}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <BubbleLoader visible={true} />
          </View>
        </View>
      );
    }

    if (source === 'leads' && leadLogs.length === 0) {
      return (
        <View style={styles.pageContainer}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>No lead call logs found</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.pageContainer}>
        <FlatList
          data={groupedData}
          keyExtractor={(item) => `${category}-${item.title}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          renderItem={({ item }) => (
            <View>
              <Text style={styles.sectionTitle}>{item.title}</Text>
              {item.data.map((log) => (
                <CallLogItem key={log.id} item={log} simCount={simCount} />
              ))}
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={source === 'personal' ? onLoadMore : undefined}
          onEndReachedThreshold={0.5}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  simHeaderIcon: {
    marginLeft: 12,
    opacity: 0.5,
  },
  simHeaderIconActive: {
    opacity: 1,
  },
  activeSimIconBox: {
    borderColor: colors.primary,
    backgroundColor: '#FFF9E6',
  },
  activeSimIconText: {
    color: colors.primary,
  },
  simIconBox: {
    width: 20,
    height: 24,
    borderWidth: 1.5,
    borderColor: colors.black,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simIconText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.black,
  },
  allSimsIcon: {
    width: 24,
    height: 24,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simIconBoxSmall: {
    width: 14,
    height: 18,
    borderWidth: 1.5,
    borderColor: colors.black,
    borderRadius: 2,
    backgroundColor: colors.white,
  },
  contentContainer: {
    flex: 1,
  },
  sourceToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  sourceOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  sourceOptionActive: {
    backgroundColor: colors.primary,
  },
  sourceOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  sourceOptionTextActive: {
    color: 'white',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});