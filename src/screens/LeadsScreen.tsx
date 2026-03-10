import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronRight,
  Search,
  Clock,
  UserPlus,
  CheckSquare,
  BarChart2,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { LeadsService } from '../services/LeadsService';
import { Lead } from '../types/Lead';
import { ScreenWrapper } from '../components/ScreenWrapper';

type TabType = 'myLeads' | 'myTasks' | 'stages';
type ViewType = 'dashboard' | 'list';
type CategoryType = 'new' | 'followup' | 'notConnected';

// ─── Coming Soon Placeholder ───────────────────────────────────────────────────
const ComingSoonView = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <View style={csStyles.container}>
    <View style={csStyles.iconCircle}>
      {title === 'My Tasks' ?
        <CheckSquare size={36} color={colors.primary} /> :
        <BarChart2 size={36} color={colors.primary} />
      }
    </View>
    <Text style={csStyles.title}>{title}</Text>
    <Text style={csStyles.subtitle}>{subtitle}</Text>
    <View style={csStyles.badge}>
      <Text style={csStyles.badgeText}>🚀  Coming Soon</Text>
    </View>
  </View>
);

const csStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F8F9FE',
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.primary + '33',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  badge: {
    backgroundColor: colors.primary + '18',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.4,
  },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export const LeadsScreen = () => {
  const [activeTab, setActiveTab] = useState<TabType>('myLeads');
  const [view, setView] = useState<ViewType>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = useNavigation<any>();

  const fetchLeads = useCallback(async () => {
    try {
      const data = await LeadsService.getAssignedLeads();
      setLeads(data);
    } catch (error: any) {
      console.error('Failed to fetch leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeads();
  };

  const handleLeadPress = (lead: Lead) => {
    navigation.navigate('LeadDetails', { lead });
  };

  const filteredLeads = useMemo(() => {
    let result = leads;

    if (selectedCategory === 'new') {
      result = result.filter((l: Lead) => !l.last_contacted_date);
    } else if (selectedCategory === 'followup') {
      result = result.filter((l: Lead) => l.next_followup_date || l.followUpDate);
    } else if (selectedCategory === 'notConnected') {
      result = result.filter((l: Lead) => l.leadStatus === 'Not Connected' || l.status === 'Not Connected');
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((l: Lead) =>
        (l.firstName && l.firstName.toLowerCase().includes(query)) ||
        (l.lastName && l.lastName.toLowerCase().includes(query)) ||
        (l.name && l.name.toLowerCase().includes(query)) ||
        (l.phone && l.phone.includes(query)) ||
        (l.campaignName && l.campaignName.toLowerCase().includes(query))
      );
    }

    return result;
  }, [leads, selectedCategory, searchQuery]);

  const getCategoryTitle = () => {
    switch (selectedCategory) {
      case 'new': return 'New Leads';
      case 'followup': return 'Follow-up Leads';
      case 'notConnected': return 'Not Connected Leads';
      default: return 'My Leads';
    }
  };

  const getScreenTitle = () => {
    if (activeTab === 'myTasks') return 'My Tasks';
    if (activeTab === 'stages') return 'Stages';
    return view === 'dashboard' ? 'My Leads' : getCategoryTitle();
  };

  // ── Tab Bar ─────────────────────────────────────────────────────────────────
  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'myLeads', label: 'My Leads' },
        { key: 'myTasks', label: 'My Tasks' },
        { key: 'stages', label: 'Stages' },
      ].map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          style={[styles.tabItem, activeTab === key && styles.tabItemActive]}
          onPress={() => {
            setActiveTab(key as TabType);
            if (key === 'myLeads') {
              setView('dashboard');
              setSelectedCategory(null);
            }
          }}
        >
          <Text style={[styles.tabLabel, activeTab === key && styles.tabLabelActive]}>
            {label}
          </Text>
          {activeTab === key && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── My Leads: Dashboard ──────────────────────────────────────────────────────
  const renderDashboard = () => (
    <View style={styles.dashboardContainer}>
      <Text style={styles.sectionTitle}>Lead Categories</Text>

      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => {
          setSelectedCategory('new');
          setView('list');
        }}
      >
        <View style={styles.categoryIconContainer}>
          <UserPlus size={24} color={colors.white} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryTitle}>New Leads</Text>
          <Text style={styles.categorySubtitle}>Leads which haven't been called so far</Text>
        </View>
        <ChevronRight size={24} color={colors.primary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => {
          setSelectedCategory('followup');
          setView('list');
        }}
      >
        <View style={[styles.categoryIconContainer, { backgroundColor: '#FF9800' }]}>
          <Clock size={24} color={colors.white} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryTitle}>Follow-up Leads</Text>
          <Text style={styles.categorySubtitle}>Leads scheduled to be called later</Text>
        </View>
        <ChevronRight size={24} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  // ── My Leads: List ───────────────────────────────────────────────────────────
  const renderLeadItem = ({ item }: { item: Lead }) => (
    <TouchableOpacity style={styles.leadCard} onPress={() => handleLeadPress(item)}>
      <View style={styles.cardHeader}>
        <View style={styles.labelCol}>
          <Text style={styles.cardLabel}>Contact Name</Text>
          <Text style={styles.cardValue}>
            {`${item.firstName || ''} ${item.lastName || ''}`.trim() || item.name || 'Unknown'}
          </Text>
        </View>
        <View style={[styles.labelCol, { alignItems: 'flex-end' }]}>
          <Text style={styles.cardLabel}>Campaign Name</Text>
          <Text style={styles.cardValue} numberOfLines={1}>
            {item.campaignName || item.campaign?.name || 'General'}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardFooter}>
        <View style={styles.footerCol}>
          <Text style={styles.cardLabel}>Lead Stage</Text>
          <Text style={[styles.cardValue, styles.statusValue]}>
            {item.leadStatus || item.status || 'OPEN'}
          </Text>
        </View>
        <View style={styles.footerCol}>
          <Text style={styles.cardLabel}>Follow-up</Text>
          <Text style={styles.cardValue}>{item.next_followup_date || 'N/A'}</Text>
        </View>
        <View style={[styles.footerCol, { alignItems: 'flex-end' }]}>
          <Text style={styles.cardLabel}>Lead tag</Text>
          <Text style={styles.cardValue}>{item.tag || '-'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderListView = () => (
    <View style={styles.listContainer}>
      <FlatList
        data={filteredLeads}
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
        renderItem={renderLeadItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No leads found in this category.</Text>
          </View>
        }
      />
    </View>
  );

  return (
    <ScreenWrapper
      navigation={navigation}
      title={getScreenTitle()}
      onBackPress={() => {
        if (activeTab === 'myLeads' && view === 'list') {
          setView('dashboard');
          setSelectedCategory(null);
          return true;
        }
        return false;
      }}
      rightComponent={<TouchableOpacity style={styles.filterButton} />}
    >
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Top Tab Bar */}
        {renderTabBar()}

        {/* Tab Content */}
        {activeTab === 'myLeads' && (
          <>
            {loading ? (
              <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <>
                {/* Search Bar (list view only) */}
                {view === 'list' && (
                  <View style={styles.searchContainer}>
                    <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search leads..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                  </View>
                )}
                {view === 'dashboard' ? renderDashboard() : renderListView()}
              </>
            )}
          </>
        )}

        {activeTab === 'myTasks' && (
          <ComingSoonView
            title="My Tasks"
            subtitle={"Tasks assigned by your manager will appear here.\nStay tuned!"}
          />
        )}

        {activeTab === 'stages' && (
          <ComingSoonView
            title="Stages"
            subtitle={"Track leads by their current stage in the pipeline.\nComing soon!"}
          />
        )}
      </SafeAreaView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  // ── Tab Bar ──────────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    position: 'relative',
  },
  tabItemActive: {},
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 3,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  // ── Search ───────────────────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: colors.text,
  },
  // ── Dashboard ─────────────────────────────────────────────────────────────────
  dashboardContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  categoryCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  categorySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // ── Lead List ─────────────────────────────────────────────────────────────────
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  leadCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  labelCol: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerCol: {
    flex: 1,
  },
  statusValue: {
    color: colors.primaryDark,
    fontWeight: 'bold',
  },
  filterButton: {
    padding: 4,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
});
