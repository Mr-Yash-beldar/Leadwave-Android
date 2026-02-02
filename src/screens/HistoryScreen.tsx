import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, Text, ActivityIndicator, Dimensions, NativeModules, Platform, TouchableOpacity, AppState, RefreshControl } from 'react-native';
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
import { colors } from '../theme/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CATEGORIES = ['all', 'incoming', 'outgoing', 'missed', 'rejected'];

export const HistoryScreen: React.FC = () => {
  const [logs, setLogs] = useState<CallLog[]>([]);
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
  
  const { user } = useAuth();
  
  const pagerRef = useRef<FlatList>(null);

  useFocusEffect(
    useCallback(() => {
      if (!dataFetched) {
        fetchData();
      }
    }, [dataFetched])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: string) => {
      if (nextAppState === 'active' && dataFetched) {
        // Refresh data when app becomes active (after a call)
        fetchData(true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [dataFetched]);

  const fetchData = async (force: boolean = false) => {
    // Show bubble loader only on first fetch
    if (!dataFetched) setInitialLoading(true);
    if (force) {
        setRefreshing(true);
        setHasMore(true);
    }
    
    try {
      let currentOffset = 0;
      let fetchedLogs: CallLog[] = [];
      let attempts = 0;
      const MAX_INITIAL_ATTEMPTS = 7; // Look back up to 7 days initially

      // Keep looking for a day with logs if Today is empty
      while (fetchedLogs.length === 0 && attempts < MAX_INITIAL_ATTEMPTS) {
          fetchedLogs = await CallLogService.getCallLogsByDay(currentOffset);
          if (fetchedLogs.length === 0) {
              currentOffset++;
              attempts++;
          }
      }
      
      const count = await NativeModules.PhoneModule?.getSimCount?.() || 0;
      setSimCount(count);
      setDaysOffset(currentOffset);
      
      if (force || !dataFetched) {
        setLogs(fetchedLogs);
      } else {
        setLogs(prev => {
          const combined = [...prev, ...fetchedLogs];
          return Array.from(new Map(combined.map(item => [item.id, item])).values())
            .sort((a, b) => b.timestamp - a.timestamp);
        });

        // Sync logs to server if user is logged in
        if (user && user._id && fetchedLogs.length > 0) {
            api.syncLogs(user._id, fetchedLogs).catch(err => console.log('Sync error:', err));
        }
      }
      
      setDataFetched(true);
      if (attempts >= MAX_INITIAL_ATTEMPTS && fetchedLogs.length === 0) {
          // If we still found nothing after 7 days, we'll stop for now
          // but let loadMore try further if they scroll (though they can't scroll if empty)
          // So let's set a minimum daysOffset so loadMore can continue
          setHasMore(true); 
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, []);

  const handleFilterSelect = (newFilter: string) => {
    const index = CATEGORIES.indexOf(newFilter);
    if (index !== -1) {
      setFilter(newFilter);
      pagerRef.current?.scrollToIndex({ index, animated: true });
    }
  };

  const onPagerScroll = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const width = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(offsetX / width);
    
    if (index >= 0 && index < CATEGORIES.length) {
      const newFilter = CATEGORIES[index];
      if (newFilter !== filter) {
        setFilter(newFilter);
      }
    }
  }, [filter]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      let nextOffset = daysOffset + 1;
      let fetchedLogs: CallLog[] = [];
      let attempts = 0;
      const MAX_LOAD_MORE_ATTEMPTS = 14; // Look back up to another 14 days

      while (fetchedLogs.length === 0 && attempts < MAX_LOAD_MORE_ATTEMPTS && nextOffset < 365) {
          fetchedLogs = await CallLogService.getCallLogsByDay(nextOffset);
          if (fetchedLogs.length === 0) {
              nextOffset++;
              attempts++;
          }
      }
      
      if (fetchedLogs.length > 0) {
        setLogs(prev => {
          const combined = [...prev, ...fetchedLogs];
          return Array.from(new Map(combined.map(item => [item.id, item])).values())
            .sort((a, b) => b.timestamp - a.timestamp);
        });
        setDaysOffset(nextOffset);
      } else {
        // If we found nothing after MAX_LOAD_MORE_ATTEMPTS, stop
        setHasMore(false);
      }
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  const renderCategoryPage = ({ item: cat }: { item: string }) => {
    return (
      <HistoryPage 
        category={cat} 
        logs={logs} 
        searchQuery={searchQuery} 
        simCount={simCount}
        simFilter={simFilter}
        onLoadMore={loadMore}
        loadingMore={loadingMore}
        initialLoading={initialLoading}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
    );
  };

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
              <View style={[styles.simIconBoxSmall, { position: 'absolute', top: 2, left: 2, zIndex: 1, borderColor: simFilter === 'all' ? colors.primary : colors.black }]} />
              <View style={[styles.simIconBoxSmall, { backgroundColor: colors.black, borderColor: simFilter === 'all' ? colors.primary : colors.black }]} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setSimFilter(0)}
            style={[styles.simHeaderIcon, simFilter === 0 && styles.simHeaderIconActive]}
          >
            <View style={[styles.simIconBox, simFilter === 0 && styles.activeSimIconBox]}>
              <Text style={[styles.simIconText, simFilter === 0 && styles.activeSimIconText]}>1</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setSimFilter(1)}
            style={[styles.simHeaderIcon, simFilter === 1 && styles.simHeaderIconActive]}
          >
            <View style={[styles.simIconBox, simFilter === 1 && styles.activeSimIconBox]}>
              <Text style={[styles.simIconText, simFilter === 1 && styles.activeSimIconText]}>2</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <FilterBar selectedFilter={filter} onSelectFilter={handleFilterSelect} />
      
      <View style={styles.contentContainer}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
        
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
      />
      <DialpadFab onPress={() => setIsDialerVisible(true)} />
    </SafeAreaView>
  );
};

const HistoryPage = React.memo(({ category, logs, searchQuery, simCount, simFilter, onLoadMore, loadingMore, initialLoading, onRefresh, refreshing }: any) => {
  const groupedData = React.useMemo(() => {
    if (initialLoading) return [];
    
    const filtered = logs.filter((log: CallLog) => {
      // SIM Filter
      if (simFilter !== 'all') {
        if (log.simSlot !== simFilter) return false;
      }
      
      // Category Filter
      if (category !== 'all') {
        if (category === 'incoming' && log.type !== CallType.Incoming) return false;
        if (category === 'outgoing' && log.type !== CallType.Outgoing) return false;
        if (category === 'missed' && log.type !== CallType.Missed) return false;
        if (category === 'rejected' && log.type !== CallType.Rejected) return false;
      }
      
      // Search Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (log.name && log.name.toLowerCase().includes(query)) || log.phoneNumber.includes(query);
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
  }, [logs, category, searchQuery, simFilter, initialLoading]);

  if (initialLoading) {
    return (
      <View style={styles.pageContainer}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <BubbleLoader visible={true} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.pageContainer}>
      <FlatList
        data={groupedData}
        keyExtractor={(item) => `${category}-${item.title}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        renderItem={({ item }) => (
          <View>
            <Text style={styles.sectionTitle}>{item.title}</Text>
            {item.data.map(log => (
              <CallLogItem key={log.id} item={log} simCount={simCount} />
            ))}
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={onLoadMore}
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
});

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
