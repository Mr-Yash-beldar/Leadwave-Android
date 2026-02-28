import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  NativeModules,
  NativeEventEmitter,
  Animated,
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
import { CallEndPopup, PendingCallEnd, CheckPhoneResult } from '../components/CallEndPopup';
import { colors } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CATEGORIES = ['all', 'incoming', 'outgoing', 'missed'];
const POSTED_CALLS_KEY = 'posted_calls'; // AsyncStorage dedup key
const LATEST_CALL_TS_KEY = 'latest_call_timestamp'; // last processed call timestamp
const CHECK_PHONE_CACHE_KEY = 'check_phone_cache'; // { [phone]: { result, expiresAt } }
const CHECK_PHONE_TTL = 30 * 60 * 1000; // 30 minutes (was 5 — reduced API hammering)
const ASSIGN_SELF_CACHE_KEY = 'assign_self_cache_v2'; // v2 adds isAssignedToOther
const LEADS_FETCH_MIN_INTERVAL = 60_000; // min 60s between fetchLeads calls
let lastLeadsFetchAt = 0;

const { PhoneModule } = NativeModules;
const { OverlayPermission } = NativeModules;

const requestOverlayPermission = async () => {
  if (Platform.OS === 'android') {
    const hasPermission = await OverlayPermission.hasPermission();
    if (!hasPermission) {
      await OverlayPermission.requestPermission();
    }
  }
};

// Polyfill addListener/removeListeners so NativeEventEmitter doesn't warn
if (PhoneModule && !PhoneModule.addListener) {
  PhoneModule.addListener = () => { };
}
if (PhoneModule && !PhoneModule.removeListeners) {
  PhoneModule.removeListeners = () => { };
}

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

/** Animated shimmer skeleton for a call log card */
const SkeletonCard: React.FC = () => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.row}>
        <Animated.View style={[skeletonStyles.avatar, { opacity }]} />
        <View style={skeletonStyles.info}>
          <Animated.View style={[skeletonStyles.nameLine, { opacity }]} />
          <Animated.View style={[skeletonStyles.numberLine, { opacity }]} />
        </View>
        <View style={skeletonStyles.meta}>
          <Animated.View style={[skeletonStyles.timeLine, { opacity }]} />
          <Animated.View style={[skeletonStyles.durLine, { opacity }]} />
        </View>
      </View>
      <View style={skeletonStyles.actionRow}>
        {[0, 1, 2].map(i => (
          <Animated.View key={i} style={[skeletonStyles.actionBtn, { opacity }]} />
        ))}
      </View>
    </View>
  );
};

const skeletonStyles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, marginHorizontal: 12, padding: 14, borderWidth: 1, borderColor: '#f0f0f0', elevation: 1 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0E0E0', marginRight: 12 },
  info: { flex: 1, gap: 6 },
  nameLine: { height: 14, borderRadius: 7, backgroundColor: '#E0E0E0', width: '65%' },
  numberLine: { height: 11, borderRadius: 6, backgroundColor: '#E0E0E0', width: '45%' },
  meta: { alignItems: 'flex-end', gap: 4 },
  timeLine: { height: 11, borderRadius: 6, backgroundColor: '#E0E0E0', width: 48 },
  durLine: { height: 10, borderRadius: 5, backgroundColor: '#E0E0E0', width: 36 },
  actionRow: { flexDirection: 'row', gap: 8, paddingTop: 2 },
  actionBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#E0E0E0' },
});

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
  leadLoading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  onAddLead: (number: string) => void;
  onAssignSelf: (log: any) => void;
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
  const [leadLoading, setLeadLoading] = useState(false); // dedicated skeleton for Lead Call History
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

  // ============ Popup / Call-End State ============
  const [pendingCallEnd, setPendingCallEnd] = useState<PendingCallEnd | null>(null);
  const [checkResult, setCheckResult] = useState<CheckPhoneResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isPopupVisible, setIsPopupVisible] = useState(false);

  // ============ ALL useRef HOOKS ============
  const pagerRef = useRef<FlatList>(null);
  // Always-fresh reference to leads so background poller never has a stale closure
  const leadsRef = useRef<Lead[]>([]);

  // ============ ALL useCallback HOOKS ============
  // Fetch leads function
  const fetchLeads = useCallback(async () => {
    // Debounce: skip if fetched less than 60s ago
    const now = Date.now();
    if (now - lastLeadsFetchAt < LEADS_FETCH_MIN_INTERVAL) return;
    lastLeadsFetchAt = now;
    try {
      const response = await api.getAssigned();
      if (response?.data) {
        setLeads(response.data);
        leadsRef.current = response.data; // keep ref in sync
        AsyncStorage.setItem('cached_leads', JSON.stringify(response.data)).catch(err =>
          console.error('Failed to cache leads:', err)
        );
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  }, []);

  // ── Enrich personal call logs with lead name/data from checkPhone API ──
  // Uses /leads/checkandgive which returns any lead (assigned or not).
  // Runs after logs load. Cached per phone (5-min TTL) in ASSIGN_SELF_CACHE_KEY.
  const enrichLogsWithCheckPhone = useCallback(async (logsToEnrich: CallLog[]) => {
    const unmatched = logsToEnrich.filter((l: any) => !l.leadId && l.phoneNumber);
    if (unmatched.length === 0) return;

    const uniquePhones = [...new Set(unmatched.map((l: any) => l.phoneNumber as string))];

    let cache: Record<string, {
      leadId?: string; leadName?: string; canAssignSelf: boolean;
      isAssignedToOther?: boolean; assignedToName?: string;
      leadData?: any; expiresAt: number;
    }> = {};
    try {
      const raw = await AsyncStorage.getItem(ASSIGN_SELF_CACHE_KEY);
      if (raw) cache = JSON.parse(raw);
    } catch (_) { }

    const now = Date.now();
    const updates: Record<string, {
      leadId?: string; leadName?: string; canAssignSelf: boolean;
      isAssignedToOther?: boolean; assignedToName?: string; leadData?: any;
    }> = {};
    const newCacheEntries: typeof cache = {};

    const myId = user?._id || null;

    for (const phone of uniquePhones) {
      const cleaned = phone.replace(/[^0-9+]/g, '');
      if (!cleaned || cleaned.length < 7) continue;

      const cached = cache[cleaned];
      if (cached && cached.expiresAt > now) {
        if (cached.leadId || cached.leadName) {
          updates[phone] = {
            leadId: cached.leadId,
            leadName: cached.leadName,
            canAssignSelf: cached.canAssignSelf,
            isAssignedToOther: cached.isAssignedToOther,
            assignedToName: cached.assignedToName,
            leadData: cached.leadData,
          };
        }
        continue;
      }

      try {
        const lead = await api.checkPhone(cleaned);
        const hasLead = !!(lead && (lead._id || lead.id));

        if (!hasLead) {
          newCacheEntries[cleaned] = { canAssignSelf: false, expiresAt: now + CHECK_PHONE_TTL };
          continue;
        }

        const leadId = lead._id || lead.id;
        const leadName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() ||
          lead.fullName || lead.name || undefined;

        // Parse assignedTo
        const assignedRaw = lead.assigned_to || lead.assignedTo;
        const assignedId = typeof assignedRaw === 'string'
          ? assignedRaw
          : assignedRaw?._id || assignedRaw?.id || null;
        const isAlreadyMine = !!(myId && assignedId && assignedId === myId);

        // canAssignSelf = lead is NOT assigned to me (either unassigned or assigned to someone else)
        const canAssignSelf = !isAlreadyMine;

        // isAssignedToOther = lead exists AND is assigned AND NOT to me
        const isAssignedToOther = !!(assignedId && !isAlreadyMine);

        // Resolve agent name for display
        let assignedToName: string | undefined;
        if (assignedRaw && typeof assignedRaw === 'object') {
          assignedToName = (assignedRaw as any).name || (assignedRaw as any).username || undefined;
        }

        const entry = {
          leadId, leadName, canAssignSelf, isAssignedToOther, assignedToName,
          leadData: lead, expiresAt: now + CHECK_PHONE_TTL,
        };
        newCacheEntries[cleaned] = entry;
        updates[phone] = { leadId, leadName, canAssignSelf, isAssignedToOther, assignedToName, leadData: lead };
      } catch (e) {
        // Silently ignore
      }
    }

    if (Object.keys(newCacheEntries).length > 0) {
      try {
        const merged = { ...cache, ...newCacheEntries };
        await AsyncStorage.setItem(ASSIGN_SELF_CACHE_KEY, JSON.stringify(merged));
      } catch (_) { }
    }

    if (Object.keys(updates).length > 0) {
      setLogs(prev => {
        let changed = false;
        const next = prev.map((log: any) => {
          const update = updates[log.phoneNumber];
          if (!update || log.leadId) return log;
          changed = true;
          return {
            ...log,
            ...(update.leadName ? { leadName: update.leadName, name: update.leadName } : {}),
            _enrichedLeadId: update.leadId,
            _enrichedLeadData: update.leadData,
            canAssignSelf: update.canAssignSelf,
            isAssignedToOther: update.isAssignedToOther,
            assignedToName: update.assignedToName,
          };
        });
        return changed ? next : prev;
      });
    }
  }, [user]);

  // ── Handle Assign Self from a call log entry ──
  const handleAssignSelf = useCallback(async (log: any) => {
    const leadId = log._enrichedLeadId || log.leadId || '';
    if (!leadId && !log.phoneNumber) return;
    try {
      await api.assignSelf(leadId, log.phoneNumber);
      // Promote the log to a proper lead (set leadId + leadData, clear canAssignSelf)
      setLogs(prev =>
        prev.map((l: any) =>
          l.id === log.id
            ? {
              ...l,
              canAssignSelf: false,
              leadId: leadId || l.leadId,
              leadData: log._enrichedLeadData || l._enrichedLeadData,
              _enrichedLeadId: undefined,
              _enrichedLeadData: undefined,
            }
            : l
        )
      );
      // Invalidate cache for this phone
      try {
        const cleaned = log.phoneNumber.replace(/[^0-9+]/g, '');
        const raw = await AsyncStorage.getItem(ASSIGN_SELF_CACHE_KEY);
        if (raw) {
          const c = JSON.parse(raw);
          if (c[cleaned]) {
            c[cleaned].canAssignSelf = false;
            c[cleaned].expiresAt = 0;
            await AsyncStorage.setItem(ASSIGN_SELF_CACHE_KEY, JSON.stringify(c));
          }
        }
      } catch (_) { }
      fetchLeads();
    } catch (e) {
      Alert.alert('Error', 'Failed to assign lead. Please try again.');
    }
  }, [fetchLeads]);

  // ── checkPhone with AsyncStorage cache (TTL 5 min) ──────────────────────
  const checkPhoneWithCache = useCallback(async (phoneNumber: string): Promise<CheckPhoneResult> => {
    const cleaned = phoneNumber.replace(/[^0-9+]/g, '');
    if (!cleaned) return { found: false, isMyLead: false };

    // Try cache
    try {
      const rawCache = await AsyncStorage.getItem(CHECK_PHONE_CACHE_KEY);
      const cache: Record<string, { result: CheckPhoneResult; expiresAt: number }> =
        rawCache ? JSON.parse(rawCache) : {};
      const entry = cache[cleaned];
      if (entry && entry.expiresAt > Date.now()) {
        console.log('[checkPhone] cache hit:', cleaned);
        return entry.result;
      }
    } catch (_) { }

    // API call
    try {
      console.log("clean: ", cleaned)
      const lead = await api.checkPhone(cleaned);
      let result: CheckPhoneResult;
      if (lead && lead._id) {
        // Determine if it's the current user's lead
        // assignedTo may be a string (userId) or object {_id, ...}
        const assignedId =
          typeof lead.assignedTo === 'string'
            ? lead.assignedTo
            : lead.assignedTo?._id || lead.assignedTo?.id || null;
        const currentUserId = user?._id || null;
        const isMyLead = !!assignedId && !!currentUserId && assignedId === currentUserId;

        result = {
          found: true,
          isMyLead,
          leadId: lead._id || lead.id,
          leadName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.fullName,
          leadStatus: lead.leadStatus,
          leadData: lead,
        };
      } else {
        result = { found: false, isMyLead: false };
      }

      // Write to cache
      try {
        const rawCache = await AsyncStorage.getItem(CHECK_PHONE_CACHE_KEY);
        const cache: Record<string, { result: CheckPhoneResult; expiresAt: number }> =
          rawCache ? JSON.parse(rawCache) : {};
        cache[cleaned] = { result, expiresAt: Date.now() + CHECK_PHONE_TTL };
        await AsyncStorage.setItem(CHECK_PHONE_CACHE_KEY, JSON.stringify(cache));
      } catch (_) { }

      return result;
    } catch (e) {
      console.warn('[checkPhone] API error:', e);
      return { found: false, isMyLead: false };
    }
  }, [user]);

  // ── Show the post-call popup for a given ended call ──────────────────────
  const handleCallEnded = useCallback(async (callEnd: PendingCallEnd) => {
    // Skip if already showing a popup
    setPendingCallEnd(callEnd);
    setCheckResult(null);
    setIsChecking(true);
    setIsPopupVisible(true);

    const result = await checkPhoneWithCache(callEnd.phoneNumber);
    setCheckResult(result);
    setIsChecking(false);

    // Auto-post call log whenever the lead exists in DB (mine OR someone else's)
    // Only skip if lead is NOT present in system at all
    if (result.found && result.leadId) {
      const callStatus =
        callEnd.callType === 'missed' ? 'missed' :
          callEnd.callType === 'incoming' ? 'completed' : 'completed';
      const fakeLog: any = {
        id: `call-bgend-${callEnd.phoneNumber}-${Date.now()}`,
        timestamp: Date.now() - callEnd.duration * 1000,
        duration: callEnd.duration,
        type:
          callEnd.callType === 'incoming' ? CallType.Incoming :
            callEnd.callType === 'missed' ? CallType.Missed :
              CallType.Outgoing,
        phoneNumber: callEnd.phoneNumber,
      };
      autoPostMatchedCall(fakeLog, result.leadId);
    }
  }, [checkPhoneWithCache]);

  // ── Handle popup actions ─────────────────────────────────────────────────
  const handlePopupClose = useCallback(() => {
    setIsPopupVisible(false);
    setPendingCallEnd(null);
    setCheckResult(null);
  }, []);

  const handlePopupDispose = useCallback(() => {
    if (!checkResult || !pendingCallEnd) return;
    setIsPopupVisible(false);
    navigation.navigate('LeadDetails', {
      lead: checkResult.leadData,
      leadId: checkResult.leadId,
      fromCall: true,
      callInfo: {
        duration: pendingCallEnd.duration,
        timestamp: Date.now(),
        phoneNumber: pendingCallEnd.phoneNumber,
      },
    });
  }, [checkResult, pendingCallEnd, navigation]);

  const handlePopupAssignSelf = useCallback(async () => {
    if (!checkResult?.leadId || !pendingCallEnd) return;
    try {
      setIsChecking(true);
      await api.assignSelf(checkResult.leadId, pendingCallEnd.phoneNumber);
      // Update cache entry to isMyLead: true
      const newResult: CheckPhoneResult = { ...checkResult, isMyLead: true };
      setCheckResult(newResult);
      // Also invalidate cache for this number
      try {
        const cleaned = pendingCallEnd.phoneNumber.replace(/[^0-9+]/g, '');
        const rawCache = await AsyncStorage.getItem(CHECK_PHONE_CACHE_KEY);
        const cache: Record<string, any> = rawCache ? JSON.parse(rawCache) : {};
        if (cache[cleaned]) {
          cache[cleaned].result.isMyLead = true;
          await AsyncStorage.setItem(CHECK_PHONE_CACHE_KEY, JSON.stringify(cache));
        }
      } catch (_) { }
    } catch (e) {
      Alert.alert('Error', 'Failed to assign lead. Please try again.');
    } finally {
      setIsChecking(false);
    }
  }, [checkResult, pendingCallEnd]);



  /**
   * Background new-call checker.
   * Posts a call log for ANY call whose number exists in the DB,
   * whether the lead is mine or assigned to someone else.
   * Only skips posting when the phone number is NOT found in the system at all.
   */
  const checkAndPostNewCalls = useCallback(async () => {
    try {
      const rawTs = await AsyncStorage.getItem(LATEST_CALL_TS_KEY);
      const lastProcessedTs: number = rawTs ? parseInt(rawTs, 10) : 0;

      const todayLogs: CallLog[] = await CallLogService.getCallLogsByDay(0);
      if (!todayLogs.length) return;

      const sorted = [...todayLogs].sort((a, b) => b.timestamp - a.timestamp);
      const newestTs = sorted[0].timestamp;

      const newLogs = sorted.filter(log => log.timestamp > lastProcessedTs);

      if (newLogs.length > 0) {
        console.log(`[AutoPost] ${newLogs.length} new call(s) to process`);

        for (const log of newLogs) {
          if (!log.phoneNumber) continue;

          const inputDigits = log.phoneNumber.replace(/[^0-9]/g, '');
          const inputLast10 = inputDigits.slice(-10);
          if (inputLast10.length < 10) continue;

          // 1. First try matching against local assigned leads (free, no API)
          let leadId: string | null = null;
          const currentLeads = leadsRef.current;
          for (const lead of currentLeads) {
            const nums = [lead.phone, lead.mobile, lead.alt_phone].filter((n): n is string => !!n);
            for (const raw of nums) {
              const last10 = raw.replace(/[^0-9]/g, '').slice(-10);
              if (last10 === inputLast10) { leadId = lead._id || lead.id || null; break; }
            }
            if (leadId) break;
          }

          // 2. If not in my local leads, call checkPhone to see if it's in DB at all
          if (!leadId) {
            try {
              const cleanedPhone = log.phoneNumber.replace(/[^0-9+]/g, '');
              // Check cache first
              let fromCache = false;
              const rawCache = await AsyncStorage.getItem(CHECK_PHONE_CACHE_KEY);
              if (rawCache) {
                const cacheMap: Record<string, { result: any; expiresAt: number }> = JSON.parse(rawCache);
                const entry = cacheMap[cleanedPhone];
                if (entry && entry.expiresAt > Date.now()) {
                  fromCache = true;
                  if (entry.result?.found && entry.result?.leadId) {
                    leadId = entry.result.leadId;
                  }
                }
              }
              if (!fromCache) {
                const lead = await api.checkPhone(cleanedPhone);
                if (lead && (lead._id || lead.id)) {
                  leadId = lead._id || lead.id;
                }
              }
            } catch (_) { /* non-fatal */ }
          }

          // 3. Post only if leadId found (lead exists in system, regardless of assignment)
          if (leadId) {
            await autoPostMatchedCall(log, leadId);
          }
        }

        await AsyncStorage.setItem(LATEST_CALL_TS_KEY, String(newestTs));
      } else {
        if (newestTs > lastProcessedTs) {
          await AsyncStorage.setItem(LATEST_CALL_TS_KEY, String(newestTs));
        }
      }
    } catch (e) {
      console.warn('[AutoPost] Background check failed:', e);
    }
  }, []); // reads leadsRef (always fresh) and uses module-level constants

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

      // Format personal logs — match against leads and show lead name.
      // NOTE: Auto-posting is handled exclusively by the background poller
      // (checkAndPostNewCalls) so we never re-post old entries here.
      const formattedLogs = fetchedLogs.map(log => {
        const matchedLead = findLeadByNumber(log.phoneNumber);

        const baseLog = {
          ...log,
          name: log.name || log.phoneNumber || 'Unknown',
          leadName: log.name || log.phoneNumber || 'Unknown',
        };

        if (matchedLead) {
          const leadId = matchedLead._id || matchedLead.id || '';
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
        // Background-enrich with checkLeadAssignment API (shows lead names + assign-self badge)
        enrichLogsWithCheckPhone(formattedLogs);
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
      setLeadLoading(true);  // always show skeleton while loading lead logs
      if (force) setRefreshing(true);

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
      setLeadLoading(false);
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
            // No autoPostMatchedCall here — background poller owns this
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

  // Handle popup Add Lead action (depends on openAddLead, so defined after it)
  const handlePopupAddLead = useCallback(() => {
    handlePopupClose();
    if (pendingCallEnd) openAddLead(pendingCallEnd.phoneNumber);
  }, [pendingCallEnd, handlePopupClose, openAddLead]);

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
      leadLoading={leadLoading}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      onAddLead={openAddLead}
      onAssignSelf={handleAssignSelf}
      source={source}
      navigation={navigation}
      leads={leads}
    />
  ), [logs, leadLogs, searchQuery, simCount, simFilter, loadMore, loadingMore, initialLoading, leadLoading, handleRefresh, refreshing, openAddLead, handleAssignSelf, source, navigation, leads]);

  // ============ ALL useEffect HOOKS ============

  // Keep leadsRef in sync with leads state
  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  // Load cached leads on mount
  useEffect(() => {
    const loadCachedLeads = async () => {
      try {
        const cached = await AsyncStorage.getItem('cached_leads');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLeads(parsed);
            leadsRef.current = parsed; // hydrate ref immediately
          }
        }
      } catch (e) {
        console.error('Error loading cached leads', e);
      }
    };
    loadCachedLeads();
  }, []);

  // ── Background poller: check for new call log entries every 3 minutes ──
  useEffect(() => {
    // Run once immediately on mount, then on a longer interval to avoid 429s
    checkAndPostNewCalls();
    const pollInterval = setInterval(checkAndPostNewCalls, 3 * 60_000); // 3 minutes
    return () => clearInterval(pollInterval);
  }, [checkAndPostNewCalls]);

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
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        fetchLeads();
        if (source === 'personal') fetchPersonalLogs(true);
        else fetchLeadLogs(true);

        // Check for a pending call that ended while the app was in background/killed
        try {
          if (PhoneModule?.getPendingCall) {
            const pending = await PhoneModule.getPendingCall();
            if (pending && pending.phoneNumber) {
              handleCallEnded({
                phoneNumber: pending.phoneNumber,
                duration: pending.duration || 0,
                callType: pending.callType || 'incoming',
              });
            }
          }
        } catch (e) {
          console.warn('[CallEnded] Failed to read pending call:', e);
        }
      }
    });
    return () => subscription.remove();
  }, [source, fetchLeads, fetchPersonalLogs, fetchLeadLogs, handleCallEnded]);

  // ── Listen for real-time CallEnded event (app foreground/background running) ──
  useEffect(() => {
    if (!PhoneModule) return;
    const emitter = new NativeEventEmitter(PhoneModule);
    const sub = emitter.addListener('CallEnded', (event: any) => {
      console.log('[CallEnded] event received:', event);
      if (event?.phoneNumber) {
        handleCallEnded({
          phoneNumber: event.phoneNumber,
          duration: event.duration || 0,
          callType: event.callType || 'incoming',
        });
      }
    });
    return () => sub.remove();
  }, [handleCallEnded]);

  // Focus effect
  useFocusEffect(
    useCallback(() => {
      if (!dataFetched && source === 'personal') {
        fetchPersonalLogs();
      }

      // On focus, also check for pending call from SharedPreferences (background/killed scenario)
      const checkPending = async () => {
        try {
          if (PhoneModule?.getPendingCall) {
            const pending = await PhoneModule.getPendingCall();
            if (pending && pending.phoneNumber) {
              handleCallEnded({
                phoneNumber: pending.phoneNumber,
                duration: pending.duration || 0,
                callType: pending.callType || 'incoming',
              });
            }
          }
        } catch (e) {
          console.warn('[CallEnded] Focus pending check failed:', e);
        }
      };
      checkPending();
    }, [dataFetched, source, fetchPersonalLogs, handleCallEnded])
  );

  // ============ COMPONENT RETURN ============
  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Call Logs</Text>
        <View style={styles.headerRight}>
          {/* <TouchableOpacity
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
          </TouchableOpacity> */}

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

      {/* ── Post-Call Popup ── */}
      <CallEndPopup
        isVisible={isPopupVisible}
        callEnd={pendingCallEnd}
        checkResult={checkResult}
        isChecking={isChecking}
        onDispose={handlePopupDispose}
        onAssignSelf={handlePopupAssignSelf}
        onAddLead={handlePopupAddLead}
        onClose={handlePopupClose}
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
    leadLoading,
    onRefresh,
    refreshing,
    onAddLead,
    onAssignSelf,
    source,
    navigation,
    leads,
  }: HistoryPageProps) => {
    const activeLogs = source === 'leads' ? leadLogs : logs;

    const groupedData = React.useMemo(() => {
      if (initialLoading || (source === 'leads' && leadLoading)) return [];

      const filtered = activeLogs.filter((log: CallLog) => {
        if (source === 'personal' && simFilter !== 'all') {
          if (log.simSlot !== simFilter) return false;
        }

        if (category !== 'all') {
          if (category === 'incoming' && log.type !== CallType.Incoming) return false;
          if (category === 'outgoing' && log.type !== CallType.Outgoing) return false;
          if (category === 'missed' && log.type !== CallType.Missed) return false;
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
    }, [activeLogs, category, searchQuery, simFilter, initialLoading, leadLoading, source]);

    // Show skeleton for personal tab initial load OR lead tab while fetching
    if (initialLoading || (source === 'leads' && leadLoading)) {
      return (
        <View style={styles.pageContainer}>
          <FlatList
            data={[1, 2, 3, 4, 5, 6, 7, 8]}
            keyExtractor={(i) => `skeleton-${i}`}
            renderItem={() => <SkeletonCard />}
            scrollEnabled={false}
            contentContainerStyle={{ paddingTop: 8 }}
          />
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
                    onAssignSelf={onAssignSelf}
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
                            recordingUrl: callItem.recordingUrl,
                            callType: callItem.type,
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