import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Megaphone, Users } from 'lucide-react-native';

// Demo Data
const DEMO_CAMPAIGNS = [
    { id: '1', name: 'Real Estate Leads', leads: 45, status: 'Active' },
    { id: '2', name: 'Insurance Cold Calls', leads: 120, status: 'Active' },
    { id: '3', name: 'Web Inquiry Follow-up', leads: 15, status: 'Paused' },
    { id: '4', name: 'Past Clients', leads: 340, status: 'Completed' },
    { id: '5', name: 'New Product Launch', leads: 8, status: 'Active' },
];

export const CampaignsScreen = () => {
    const navigation = useNavigation();

    const renderItem = ({ item }: { item: typeof DEMO_CAMPAIGNS[0] }) => (
        <TouchableOpacity style={styles.card} onPress={() => { }}>
            <View style={styles.iconContainer}>
                <Megaphone size={24} color={colors.primary} />
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.campaignName}>{item.name}</Text>
                <View style={styles.statsContainer}>
                    <Users size={14} color="#666" />
                    <Text style={styles.leadsCount}>{item.leads} Leads</Text>
                    <Text style={[styles.status, { color: item.status === 'Active' ? 'green' : (item.status === 'Completed' ? 'blue' : 'orange') }]}>
                        • {item.status}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Campaigns</Text>
            </View>
            <FlatList
                data={DEMO_CAMPAIGNS}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        backgroundColor: colors.white,
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFF8E1', // Light yellow for primary
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    infoContainer: {
        flex: 1,
    },
    campaignName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    leadsCount: {
        fontSize: 14,
        color: '#666',
        marginLeft: 4,
        marginRight: 12,
    },
    status: {
        fontSize: 14,
        fontWeight: '500',
    }
});
