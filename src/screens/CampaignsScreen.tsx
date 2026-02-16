import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Search, X } from 'lucide-react-native';
import { campaignService } from '../services/campaignService';
import { Campaign } from '../types/Campaign';

export const CampaignsScreen = () => {
    const navigation = useNavigation<any>();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const fetchCampaigns = async () => {
        try {
            const data = await campaignService.getCampaigns();
            setCampaigns(data);
            setFilteredCampaigns(data);
        } catch (error) {
            console.error('Failed to fetch campaigns', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchCampaigns();
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (text && Array.isArray(campaigns)) {
            const filtered = campaigns.filter(c =>
                c.name.toLowerCase().includes(text.toLowerCase())
            );
            setFilteredCampaigns(filtered);
        } else {
            setFilteredCampaigns(Array.isArray(campaigns) ? campaigns : []);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setFilteredCampaigns(Array.isArray(campaigns) ? campaigns : []);
    };

    const renderItem = ({ item }: { item: Campaign }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('CampaignLeads', { campaignId: item._id, title: item.name })}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.campaignName}>{item.name}</Text>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Assigned</Text>
                        <Text style={styles.statValue}>{item.assignedCount || 0}</Text>
                    </View>
                    <View style={styles.statBorder} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Open</Text>
                        <Text style={styles.statValue}>{item.openCount || 0}</Text>
                    </View>
                </View>

                <View style={[styles.statsRow, { marginTop: 10 }]}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>In-Progress</Text>
                        <Text style={styles.statValue}>{item.inProgressCount || 0}</Text>
                    </View>
                    <View style={styles.statBorder} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Closed</Text>
                        <Text style={styles.statValue}>{item.closedCount || 0}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.unassignedContainer}>
                    <Text style={styles.statLabel}>Un-Assigned</Text>
                    <Text style={styles.statValue}>{item.unAssignedCount || 0}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Campaigns</Text>
            </View>

            <View style={styles.searchContainer}>
                <Search size={20} color={colors.textSecondary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search Campaign"
                    value={searchQuery}
                    onChangeText={handleSearch}
                    placeholderTextColor={colors.textSecondary}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={clearSearch}>
                        <X size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={filteredCampaigns}
                renderItem={renderItem}
                keyExtractor={item => item._id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No campaigns found</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3E5F5', // Light purple background as in screenshot (approx), or keep it neutral? 
        // User said "use theme color should be same as our yellow theme color.primary". 
        // Screenshot shows light purple background. I will used a very light yellow or keep neutral.
        // Let's use a very light neutral/yellowish? 
        // Actually, let's stick to standard background color from theme or neutral.
        // If user wants EXACT same UI, they might want the purple background but user said "theme color should be same as our yellow".
        // So I will use a neutral background.
        // backgroundColor: '#FFFDE7', // Light yellow
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        backgroundColor: colors.primary,
        padding: 16,
        paddingTop: 16, // Adjust for status bar if needed
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000', // Black text on yellow
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 8,
        height: 50,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#000',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        marginBottom: 16,
        elevation: 3,
        overflow: 'hidden',
    },
    cardHeader: {
        backgroundColor: colors.primary, // Yellow header
        padding: 12,
        paddingHorizontal: 16,
    },
    campaignName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000', // Black text on yellow header
    },
    cardBody: {
        padding: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statBorder: {
        width: 1,
        height: 40,
        backgroundColor: '#E0E0E0',
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 12,
        width: '80%',
        alignSelf: 'center',
    },
    unassignedContainer: {
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        color: '#666',
        fontSize: 16,
    }
});
