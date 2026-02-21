import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  Dimensions,
  Platform,
  TouchableOpacity,
  AppState,
  RefreshControl,
  Alert,
  Linking,
  ActivityIndicator,
  NativeModules
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { CallLogService } from '../services/CallLogService';
import { CallLog, CallType } from '../types/CallLog';
import { CallLogItem } from '../components/CallLogItem';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { LeadsService } from '../services/LeadsService';

import { FilterBar } from '../components/FilterBar';
import { SearchBar } from '../components/SearchBar';
import { DialpadFab } from '../components/DialpadFab';
import { BubbleLoader } from '../components/BubbleLoader';
import { DialerModal } from '../components/DialerModal';
import { OngoingCallCard } from '../components/OngoingCallCard';
import { AddLeadModal } from '../components/AddLeadModal';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CATEGORIES = ['all', 'incoming', 'outgoing', 'missed', 'rejected'];
const POSTED_CALLS_KEY = 'posted_calls'; // AsyncStorage dedup key

type SourceType = 'personal' | 'leads';

/** Maps a native CallType to the backend API payload fields */
const callPayloadFromLog = (log: CallLog) => {
  switch (log.type) {
    case CallType.Incoming:
      return { callStatus: 'completed', callType: 'incoming' };
    case CallType.Outgoing:
      return { callStatus: 'completed', callType: 'outgoing' };
    case CallType.Missed:
      return { callStatus: 'missed', callType: 'missed' };
    case CallType.Rejected:
      return { callStatus: 'rejected', callType: 'missed' };
    default:
      return { callStatus: 'completed', callType: 'outgoing' };
  }
};

/** Fire-and-forget: post a matched call to the DB, once per unique log ID */
const autoPostMatchedCall = async (log: CallLog, leadId: string) => {
  try {
    // Load the dedup set
    const raw = await AsyncStorage.getItem(POSTED_CALLS_KEY);
    const postedSet: string[] = raw ? JSON.parse(raw) : [];
    if (postedSet.includes(log.id)) {
      console.log('Auto-post skipped (already posted):', log.id);
      return;
    }
    console.log('Auto-posting call to DB:', leadId, log.id);
    const { callStatus, callType } = callPayloadFromLog(log);
    await LeadsService.postCallLog({
      leadId,
      callTime: new Date(log.timestamp).toISOString(),
      durationSeconds: log.duration,
      callStatus,
      callType,
      notes: 'incoming call auto dispose',
    });
    // Mark as posted
    postedSet.push(log.id);
    await AsyncStorage.setItem(POSTED_CALLS_KEY, JSON.stringify(postedSet));
    console.log('Call posted to DB:', log.id);
  } catch (e) {
    console.warn('Auto-post failed (will retry next refresh):', e);
  }
};


interface Lead {
  _id: string;
  id?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  mobile?: string;
  alt_phone?: string;
  leadStatus?: string;
}

interface HistoryPageProps {
  category: string;
  logs: CallLog[];
  leadLogs: CallLog[];
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
  navigation: any;
  leads: Lead[];
}

export const HistoryScreen: React.FC = () => {
  // ============ ALL useState HOOKS FIRST ============
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [leadLogs, setLeadLogs] = useState<CallLog[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [source, setSource] = useState<SourceType>('personal');
  const navigation = useNavigation<any>();

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

  // ============ ALL useRef HOOKS ============
  const pagerRef = useRef<FlatList>(null);

  // ============ ALL useCallback HOOKS ============
  // Fetch leads function
  const fetchLeads = useCallback(async () => {
    try {
      const response = await api.getAssigned();
      // console.log(response);

      if (response?.data) {
        setLeads(response.data);
        AsyncStorage.setItem('cached_leads', JSON.stringify(response.data)).catch(err =>
          console.error('Failed to cache leads:', err)
        );
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  }, []);

  // Helper function to find lead by phone number
  // Alert.alert(phoneNumber);

  const findLeadByNumber = useCallback((phoneNumber: string): Lead | null => {
    if (!phoneNumber) {
      // console.log('[findLead] No phone number → null');
      return null;
    }

    if (!leads.length) {
      // console.log('[findLead] No leads loaded → null');
      return null;
    }

    // 1. Clean input number
    const inputDigits = phoneNumber.replace(/[^0-9]/g, '');
    const inputLast10 = inputDigits.slice(-10);

    // console.log(
    //   `[findLead] Input: "${phoneNumber}" → cleaned: ${inputDigits} → last10: ${inputLast10}`
    // );

    if (inputLast10.length < 10) {
      // console.log('[findLead] Input too short (<10 digits) → no match');
      return null;
    }

    // 2. Check every lead
    for (const lead of leads) {
      const leadNumbers = [lead.phone, lead.mobile, lead.alt_phone].filter((n): n is string => !!n);

      if (leadNumbers.length === 0) continue;

      // console.log(
      //   `[findLead] Checking lead: ${lead.firstName} ${lead.lastName} (ID: ${lead._id}) → numbers:`,
      //   leadNumbers
      // );

      for (const rawLeadNum of leadNumbers) {
        const leadDigits = rawLeadNum.replace(/[^0-9]/g, '');
        const leadLast10 = leadDigits.slice(-10);

        // console.log(
        //   `  → lead raw: "${rawLeadNum}" → cleaned: ${leadDigits} → last10: ${leadLast10}`
        // );

        // Match if last 10 digits are exactly the same
        if (leadLast10 === inputLast10) {
          // console.log(
          //   `>>> [MATCH SUCCESS] Lead: ${lead.firstName} ${lead.lastName} ` +
          //   `| input last10: ${inputLast10} | lead last10: ${leadLast10} | raw lead num: ${rawLeadNum}`
          // );
          return lead;
        }
      }
    }

    // console.log(`[findLead] NO MATCH for last10: ${inputLast10}`);
    return null;
  }, [leads]);


  // Fetch personal logs
  const fetchPersonalLogs = useCallback(async (force: boolean = false) => {
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

      // Format personal logs — match against leads, show name, auto-post to DB
      const formattedLogs = fetchedLogs.map(log => {
        const matchedLead = findLeadByNumber(log.phoneNumber);

        const baseLog = {
          ...log,
          name: log.name || log.phoneNumber || 'Unknown',
          leadName: log.name || log.phoneNumber || 'Unknown',
        };

        // If matched with a lead, add lead data and auto-post to DB
        if (matchedLead) {
          const leadId = matchedLead._id || matchedLead.id || '';
          autoPostMatchedCall(log, leadId); // fire-and-forget
          return {
            ...baseLog,
            leadName: `${matchedLead.firstName} ${matchedLead.lastName}`.trim(),
            leadId,
            leadData: matchedLead,
            disposed: matchedLead.leadStatus === 'disposed'
          };
        }

        return baseLog;
      });

      if (force || !dataFetched) {
        setLogs(formattedLogs);
      } else {
        setLogs((prev) => {
          const combined = [...prev, ...formattedLogs];
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
  }, [dataFetched, findLeadByNumber]);

  // Fetch lead logs
  const fetchLeadLogs = useCallback(async (force = false) => {
    if (!force && leadLogs.length > 0) return;

    try {
      if (force) setRefreshing(true);
      else setInitialLoading(true);

      const response = await api.getCallLogs();

      if (response?.success && Array.isArray(response.data)) {
        const formatted: CallLog[] = response.data.map((item: any) => {
          const lead = item.lead || {};
          const leadName = lead.fullName || `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
          const phoneNumber = lead.phone || lead.mobile || '';

          let callType = CallType.Unknown;
          switch (item.callType?.toLowerCase()) {
            case 'incoming':
              callType = CallType.Incoming;
              break;
            case 'outgoing':
              callType = CallType.Outgoing;
              break;
            case 'missed':
              callType = CallType.Missed;
              break;
            default:
              callType = CallType.Unknown;
          }

          return {
            id: item.id,
            phoneNumber: phoneNumber,
            name: leadName || 'Unknown Lead',
            leadName: leadName,
            type: callType,
            timestamp: new Date(item.callTime).getTime(),
            duration: item.callDuration || 0,
            simSlot: 0,
            leadEmail: lead.email,
            leadMobile: phoneNumber,
            notes: item.notes,
            callStatus: item.callStatus,
            recordingUrl: item.recording,
            disposed: lead.leadStatus === 'disposed',
            leadId: lead.id,
            leadData: lead
          };
        }).sort((a: any, b: any) => b.timestamp - a.timestamp);

        setLeadLogs(formatted);
      } else {
        setLeadLogs([]);
      }
    } catch (error) {
      console.error('Error fetching lead logs:', error);
      Alert.alert('Error', 'Failed to load lead call logs');
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Load more personal logs
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || source === 'leads') return;

    setLoadingMore(true);
    try {
      let nextOffset = daysOffset + 1;
      let fetchedLogs: CallLog[] = [];
      let attempts = 0;
      const MAX_ATTEMPTS = 14;

      while (fetchedLogs.length === 0 && attempts < MAX_ATTEMPTS && nextOffset < 365) {
        fetchedLogs = await CallLogService.getCallLogsByDay(nextOffset);

        const formattedLogs = fetchedLogs.map(log => {
          const matchedLead = findLeadByNumber(log.phoneNumber);

          const baseLog = {
            ...log,
            name: log.name || log.phoneNumber || 'Unknown',
            leadName: log.name || log.phoneNumber || 'Unknown',
          };

          if (matchedLead) {
            const leadId = matchedLead._id || matchedLead.id || '';
            autoPostMatchedCall(log, leadId); // fire-and-forget
            return {
              ...baseLog,
              leadName: `${matchedLead.firstName} ${matchedLead.lastName}`.trim(),
              leadId,
              leadData: matchedLead,
              disposed: matchedLead.leadStatus === 'disposed'
            };
          }

          return baseLog;
        });

        if (formattedLogs.length === 0) {
          nextOffset++;
          attempts++;
        } else {
          fetchedLogs = formattedLogs;
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
  }, [loadingMore, hasMore, source, daysOffset, findLeadByNumber]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchLeads();
    if (source === 'personal') fetchPersonalLogs(true);
    else fetchLeadLogs(true);
  }, [source, fetchLeads, fetchPersonalLogs, fetchLeadLogs]);

  // Handle filter selection
  const handleFilterSelect = useCallback((newFilter: string) => {
    const index = CATEGORIES.indexOf(newFilter);
    if (index !== -1) {
      setFilter(newFilter);
      pagerRef.current?.scrollToIndex({ index, animated: true });
    }
  }, []);

  // Handle pager scroll
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

  // Open add lead modal
  const openAddLead = useCallback((number: string) => {
    setActiveCallNumber(number);
    setIsLeadModalVisible(true);
  }, []);

  // Render category page
  const renderCategoryPage = useCallback(({ item: cat }: { item: string }) => (
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
      navigation={navigation}
      leads={leads}
    />
  ), [logs, leadLogs, searchQuery, simCount, simFilter, loadMore, loadingMore, initialLoading, handleRefresh, refreshing, openAddLead, source, navigation, leads]);

  // ============ ALL useEffect HOOKS ============

  // Load cached leads on mount
  useEffect(() => {
    const loadCachedLeads = async () => {
      try {
        const cached = await AsyncStorage.getItem('cached_leads');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLeads(parsed);
          }
        }
      } catch (e) {
        console.error('Error loading cached leads', e);
      }
    };
    loadCachedLeads();
  }, []);

  // Update logs when leads change (Reactive Update)
  useEffect(() => {
    if (leads.length === 0) return;

    setLogs(prevLogs => {
      let hasUpdates = false;
      const updatedLogs = prevLogs.map(log => {
        // If already matched, we can skip or re-match. 
        // Re-matching ensures that if a lead name changed, it updates.
        // But for performance, if we have leadId, maybe we skip? 
        // The user wants "backend names will be seen there", implying they were missing.
        // So main priority is filling missing ones.
        if (log.leadId) return log;

        const matchedLead = findLeadByNumber(log.phoneNumber);
        if (matchedLead) {
          hasUpdates = true;
          return {
            ...log,
            leadName: `${matchedLead.firstName} ${matchedLead.lastName}`.trim(),
            leadId: matchedLead._id || matchedLead.id,
            leadData: matchedLead,
            disposed: matchedLead.leadStatus === 'disposed'
          };
        }
        return log;
      });
      return hasUpdates ? updatedLogs : prevLogs;
    });
  }, [leads, findLeadByNumber]);

  // Initial data load - Leads
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Initial data load - Personal Logs
  useEffect(() => {
    if (source === 'personal') {
      fetchPersonalLogs();
    }
  }, [source, fetchPersonalLogs]);

  // Initial data load - Lead Logs
  useEffect(() => {
    if (source === 'leads') {
      fetchLeadLogs(true);
    }
  }, [source, fetchLeadLogs]);

  // App state change listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        fetchLeads();
        if (source === 'personal') fetchPersonalLogs(true);
        else fetchLeadLogs(true);
      }
    });
    return () => subscription.remove();
  }, [source, fetchLeads, fetchPersonalLogs, fetchLeadLogs]);

  // Focus effect
  useFocusEffect(
    useCallback(() => {
      if (!dataFetched && source === 'personal') {
        fetchPersonalLogs();
      }
    }, [dataFetched, source, fetchPersonalLogs])
  );

  // ============ COMPONENT RETURN ============
  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Call Logs</Text>
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

        {/* Source Toggle */}
        <View style={styles.sourceToggleContainer}>
          <TouchableOpacity
            style={[styles.sourceOption, source === 'personal' && styles.sourceOptionActive]}
            onPress={() => setSource('personal')}
          >
            <Text
              style={[styles.sourceOptionText, source === 'personal' && styles.sourceOptionTextActive]}
            >
              Call History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sourceOption, source === 'leads' && styles.sourceOptionActive]}
            onPress={() => setSource('leads')}
          >
            <Text
              style={[styles.sourceOptionText, source === 'leads' && styles.sourceOptionTextActive]}
            >
              Lead Call History
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
    navigation,
    leads,
  }: HistoryPageProps) => {
    const activeLogs = source === 'leads' ? leadLogs : logs;

    const groupedData = React.useMemo(() => {
      if (initialLoading) return [];

      const filtered = activeLogs.filter((log: CallLog) => {
        if (source === 'personal' && simFilter !== 'all') {
          if (log.simSlot !== simFilter) return false;
        }

        if (category !== 'all') {
          if (category === 'incoming' && log.type !== CallType.Incoming) return false;
          if (category === 'outgoing' && log.type !== CallType.Outgoing) return false;
          if (category === 'missed' && log.type !== CallType.Missed) return false;
          if (category === 'rejected' && log.type !== CallType.Rejected) return false;
        }

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
        else dateLabel = logDate.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });

        if (dateLabel !== currentDate) {
          if (currentGroup.length > 0) {
            groups.push({ title: currentDate, data: [...currentGroup] });
          }
          currentDate = dateLabel;
          currentGroup = [log];
        } else {
          currentGroup.push(log);
        }
      });

      if (currentGroup.length > 0) {
        groups.push({ title: currentDate, data: currentGroup });
      }

      return groups;
    }, [activeLogs, category, searchQuery, simFilter, initialLoading, source]);

    if (initialLoading) {
      return (
        <View style={styles.pageContainer}>
          <View style={styles.centerContainer}>
            <BubbleLoader visible={true} />
            <Text style={styles.loadingText}>
              Loading {source === 'leads' ? 'lead' : 'personal'} calls...
            </Text>
          </View>
        </View>
      );
    }

    if (activeLogs.length === 0) {
      return (
        <View style={styles.pageContainer}>
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>
              No {source === 'leads' ? 'lead' : 'personal'} calls found
            </Text>
            <Text style={styles.emptySubtext}>
              {source === 'leads'
                ? 'Calls from your leads will appear here'
                : 'Make or receive calls to see them here'}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.pageContainer}>
        <FlatList
          data={groupedData}
          keyExtractor={(item) => `${source}-${category}-${item.title}-${item.data.length}`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>{item.title}</Text>
              {/* // ... inside HistoryPage → FlatList renderItem */}

              {/* // Inside HistoryPage → FlatList renderItem */}

              {item.data.map((log) => {
                const displayLog = source === 'personal'
                  ? {
                    ...log,
                    name: log.name || log.phoneNumber || 'Unknown',
                    leadName: log.leadName || log.name || log.phoneNumber || 'Unknown',
                  }
                  : log;

                return (
                  <CallLogItem
                    key={displayLog.id}
                    item={displayLog}
                    simCount={simCount}
                    isLeadLog={source === 'leads'}           // ← crucial: only true in leads tab
                    onAddLead={() => onAddLead(displayLog.phoneNumber)}
                    onDispose={(callItem) => {
                      // your existing navigation logic
                      // console.log('Dispose callback for:', callItem.phoneNumber);

                      if (callItem.leadData) {
                        navigation.navigate('LeadDetails', {
                          lead: callItem.leadData,
                          fromCall: true,
                          callInfo: {
                            id: callItem.id,
                            duration: callItem.duration,
                            timestamp: callItem.timestamp,
                            phoneNumber: callItem.phoneNumber,
                            recordingUrl: callItem.recordingUrl
                          }
                        });
                      } else if (callItem.leadId) {
                        navigation.navigate('LeadDetails', {
                          leadId: callItem.leadId,
                          fromCall: true,
                          phoneNumber: callItem.phoneNumber
                        });
                      } else {
                        navigation.navigate('LeadDetails', {
                          phoneNumber: callItem.phoneNumber,
                          fromCall: true
                        });
                      }
                    }}
                  />
                );
              })}
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
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default HistoryScreen;