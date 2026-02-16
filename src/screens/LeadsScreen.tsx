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
  ChevronLeft,
  Search,
  Filter,
  Clock,
  UserPlus,
  PhoneOff,
  User
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { LeadsService } from '../services/LeadsService';
import { Lead } from '../types/Lead';

type ViewType = 'dashboard' | 'list';
type CategoryType = 'new' | 'followup' | 'notConnected';

export const LeadsScreen = () => {
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

    // Filter by Category
    if (selectedCategory === 'new') {
      result = result.filter((l: Lead) => !l.last_contacted_date);
    } else if (selectedCategory === 'followup') {
      result = result.filter((l: Lead) => l.next_followup_date || l.followUpDate);
    } else if (selectedCategory === 'notConnected') {
      result = result.filter((l: Lead) => l.leadStatus === 'Not Connected' || l.status === 'Not Connected');
    }

    // Filter by Search Query
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
      default: return 'Leads';
    }
  };

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
          <Text style={styles.categorySubtitle}>Leads, which haven't been called so far</Text>
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
          <Text style={styles.categorySubtitle}>Leads, which are scheduled to be called later</Text>
        </View>
        <ChevronRight size={24} color={colors.primary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => {
          setSelectedCategory('notConnected');
          setView('list');
        }}
      >
        <View style={[styles.categoryIconContainer, { backgroundColor: '#F44336' }]}>
          <PhoneOff size={24} color={colors.white} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryTitle}>Not Connected Leads</Text>
          <Text style={styles.categorySubtitle}>Leads, which were not connected in previous attempt</Text>
        </View>
        <ChevronRight size={24} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderLeadItem = ({ item }: { item: Lead }) => (
    <TouchableOpacity
      style={styles.leadCard}
      onPress={() => handleLeadPress(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.labelCol}>
          <Text style={styles.cardLabel}>Contact Name</Text>
          <Text style={styles.cardValue}>{`${item.firstName || ''} ${item.lastName || ''}`.trim() || item.name || 'Unknown'}</Text>
        </View>
        <View style={[styles.labelCol, { alignItems: 'flex-end' }]}>
          <Text style={styles.cardLabel}>Campaign Name</Text>
          <Text style={styles.cardValue} numberOfLines={1}>{item.campaignName || item.campaign?.name || 'General'}</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardFooter}>
        <View style={styles.footerCol}>
          <Text style={styles.cardLabel}>Lead Stage</Text>
          <Text style={[styles.cardValue, styles.statusValue]}>{item.leadStatus || item.status || 'OPEN'}</Text>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No leads found in this category.</Text>
          </View>
        }
      />



    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {view === 'list' ? (
          <TouchableOpacity onPress={() => setView('dashboard')} style={styles.backButton}>
            <ChevronLeft size={28} color={colors.black} />
          </TouchableOpacity>
        ) : <View style={{ width: 40, }} />}

        <Text style={styles.headerTitle}>{view === 'dashboard' ? 'My Leads' : getCategoryTitle()}</Text>

        <TouchableOpacity style={styles.filterButton}>
          {/* // <Filter size={24} color={colors.black} /> */}
        </TouchableOpacity>
      </View>

      {/* Search Bar (Only shown in list view) */}
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
    </SafeAreaView>
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
  header: {
    padding: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.black,
  },
  backButton: {
    padding: 4,
  },
  filterButton: {
    padding: 4,
  },
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
  startCallingButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  startCallingText: {
    color: colors.black,
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  }
});
