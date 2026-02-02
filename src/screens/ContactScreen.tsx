import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, ScrollView, NativeModules, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Search, Heart, ArrowUpDown, MoreVertical } from 'lucide-react-native';
import { Contact } from '../types/Contact';
import { ContactService } from '../services/ContactService';
import { colors } from '../theme/colors';
import { ContactCard }from '../components/ContactCard';
import { SIMPickerModal } from '../components/SIMPickerModal';
import { DialpadFab } from '../components/DialpadFab';

const { PhoneModule } = NativeModules;
const PAGE_SIZE = 20;

export const ContactScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [displayContacts, setDisplayContacts] = useState<Contact[]>([]);
  const [favorites, setFavorites] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  
  // SIM Selection state
  const [isSIMPickerVisible, setIsSIMPickerVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async (force: boolean = false) => {
    try {
      if (force) {
          setRefreshing(true);
          setPage(0);
      } else {
          setLoading(true);
      }
      
      const chunk = await ContactService.getContactsChunked(PAGE_SIZE, 0, force);
      
      setDisplayContacts(chunk);
      setAllContacts(chunk); // For now, searching will only work on what's loaded unless we change it
      setPage(1);
      
      // For favorites, we ideally want to fetch all starred ones. 
      // For now, let's take them from the first 50 or fetch a larger batch in background
      const initialFavorites = chunk.filter(c => c.isStarred || (c.totalCalls || 0) > 0);
      setFavorites(initialFavorites.slice(0, 15));

      // Optional: Load more for favorites in background
      if (chunk.length === PAGE_SIZE) {
          loadFavoritesInBackground();
      }
      
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadFavoritesInBackground = async () => {
      try {
          // Fetch more to find favorites, but don't block UI
          const more = await ContactService.getContactsChunked(200, 0, false);
          const deviceFavorites = more.filter(c => c.isStarred);
          const frequentCallers = more
            .filter(c => !c.isStarred && (c.totalCalls || 0) > 0)
            .sort((a, b) => (b.totalCalls || 0) - (a.totalCalls || 0));
          
          setFavorites(prev => {
              const combined = [...prev, ...deviceFavorites, ...frequentCallers];
              return Array.from(new Map(combined.map(item => [item.id, item])).values()).slice(0, 15);
          });
      } catch (e) {
          // ignore
      }
  };

  const loadMoreContacts = async () => {
    if (searchQuery.trim() !== '' || loadingMore) return; 
    
    setLoadingMore(true);
    try {
        const offset = displayContacts.length;
        const nextChunk = await ContactService.getContactsChunked(PAGE_SIZE, offset);
        
        if (nextChunk.length > 0) {
            setDisplayContacts(prev => [...prev, ...nextChunk]);
            setAllContacts(prev => [...prev, ...nextChunk]);
            setPage(prev => prev + 1);
        }
    } catch (e) {
        console.error('Load more error:', e);
    } finally {
        setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(() => {
    loadContacts(true);
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setDisplayContacts(allContacts);
    } else {
      const lowerQuery = query.toLowerCase();
      // Since we are paginated, search is only on loaded contacts
      // BUT we could also call a search API. For now, keep it simple.
      const filtered = allContacts.filter(c => 
        c.name.toLowerCase().includes(lowerQuery) || 
        (c.phoneNumbers && c.phoneNumbers.some(p => p.number.includes(query)))
      );
      setDisplayContacts(filtered);
    }
  };

  const toggleFavorite = async (contact: Contact) => {
    const newStatus = !contact.isStarred;
    const success = await ContactService.toggleFavorite(contact.id, newStatus);
    
    if (success) {
      // Update local state
      const updatedAll = allContacts.map(c => 
        c.id === contact.id ? { ...c, isStarred: newStatus } : c
      );
      setAllContacts(updatedAll);
      
      // Update display list
      setDisplayContacts(prev => prev.map(c => 
        c.id === contact.id ? { ...c, isStarred: newStatus } : c
      ));

      // Update favorites slider
      if (newStatus) {
        // Add to favorites if not already there
        if (!favorites.find(f => f.id === contact.id)) {
            setFavorites(prev => [{ ...contact, isStarred: newStatus }, ...prev].slice(0, 15));
        } else {
            setFavorites(prev => prev.map(f => f.id === contact.id ? { ...f, isStarred: newStatus } : f));
        }
      } else {
        // Remove from favorites slider if it was only there because it was starred
        // If it was there because of frequent calls, keep it but unstarred
        setFavorites(prev => {
            const updated = prev.map(f => f.id === contact.id ? { ...f, isStarred: newStatus } : f);
            if (!contact.totalCalls || contact.totalCalls === 0) {
                return updated.filter(f => f.id !== contact.id);
            }
            return updated;
        });
      }
    }
  };

  const handleCall = (contact: Contact) => {
    setSelectedContact(contact);
    setIsSIMPickerVisible(true);
  };

  const onSelectSIM = (slot: number) => {
    if (selectedContact && selectedContact.phoneNumbers && selectedContact.phoneNumbers.length > 0) {
      if (PhoneModule && PhoneModule.makeCall) {
        PhoneModule.makeCall(selectedContact.phoneNumbers[0].number, slot);
      }
    }
    setIsSIMPickerVisible(false);
  };

  const handleAnalytics = (contact: Contact) => {
    navigation.navigate('ContactAnalytics', { 
      phoneNumber: (contact.phoneNumbers && contact.phoneNumbers[0]?.number) || '', 
      name: contact.name 
    });
  };

  const renderHeader = () => (
    <View style={{ backgroundColor: '#F9F9F9' }}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts"
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* Favorites Section */}
      <View style={styles.favoritesSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favoritesList}>
          {favorites.map((fav, index) => (
            <TouchableOpacity key={fav.id} style={styles.favItem} onPress={() => handleAnalytics(fav)}>
              <View style={[styles.favAvatar, { borderColor: fav.isStarred ? '#E91E63' : '#FFD600' }]}>
                <Text style={styles.favAvatarText}>{fav.name ? fav.name[0].toUpperCase() : '?'}</Text>
              </View>
              <Text style={styles.favName} numberOfLines={1}>{fav.name.split(' ')[0]}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.favItem} onPress={() => {}}>
            <View style={[styles.favAvatar, { borderColor: '#FFD600', backgroundColor: '#333' }]}>
              <Heart size={24} color="#FFD600" fill="#FFD600" />
            </View>
            <Text style={styles.favName} numberOfLines={1}>Add Contacts</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contacts</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIcon}>
            <Heart size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <ArrowUpDown size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <MoreVertical size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={displayContacts}
        renderItem={({ item }) => (
          <ContactCard
            key={item.id}
            name={item.name}
            phoneNumber={(item.phoneNumbers && item.phoneNumbers[0]?.number) || ''}
            totalCalls={item.totalCalls || 0}
            isStarred={item.isStarred}
            onCall={() => handleCall(item)}
            onAnalytics={() => handleAnalytics(item)}
            onToggleFavorite={() => toggleFavorite(item)}
          />
        )}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        onEndReached={loadMoreContacts}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FFD600']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No contacts found</Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Dialer FAB */}
      <DialpadFab onPress={() => {}} />

      {/* SIM Picker Modal */}
      <SIMPickerModal
        isVisible={isSIMPickerVisible}
        onClose={() => setIsSIMPickerVisible(false)}
        onSelect={onSelectSIM}
        phoneNumber={(selectedContact?.phoneNumbers && selectedContact.phoneNumbers[0]?.number) || ''}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerIcon: {
    marginLeft: 16,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  favoritesSection: {
    paddingVertical: 16,
    backgroundColor: colors.white,
    marginBottom: 8,
  },
  favoritesList: {
    paddingHorizontal: 16,
  },
  favItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 80,
  },
  favAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    marginBottom: 8,
    overflow: 'hidden',
  },
  favAvatarText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  favName: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
  },
  listContainer: {
    paddingTop: 8,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
});
