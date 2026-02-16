import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { campaignService } from '../services/campaignService';

// Actually the "Start Calling" likely initiates a call flow. 
// For now, I'll just navigate to the CallScreen or initiate the first call.
// The user requirement says "Start Calling".
import { Lead } from '../types/Lead';
import { Phone, ArrowLeft } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
    CampaignLeads: { campaignId: string; title: string };

};

type Props = NativeStackScreenProps<RootStackParamList, 'CampaignLeads'>;

export const CampaignLeadsScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { campaignId, title } = route.params;

    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await campaignService.getCampaignDetails(campaignId);

                setLeads(data.data.leads || []); // data.leads might be undefined if API structure varies
            } catch (error) {
                console.error('Failed to fetch campaign leads', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [campaignId]);

    const handleStartCalling = () => {
        // improved logic: find first 'Open' or 'In Progress' lead and start calling
        // For now, just a placeholder alert or navigation
        if (leads.length > 0) {
            // Navigate to CallScreen with the first lead?
            // Or maybe a specific "Campaign Call Mode"
            // For now, let's just log it or pick the first one.
            console.log("Starting call with first lead", leads[0]);
            // navigation.navigate('CallScreen', { lead: leads[0] }); 
            // Logic to start auto-dialing might be complex. 
            // I'll just select the first lead for now.

            // Check if 'CallScreen' exists in RootNavigator (it does)
            navigation.navigate('CallScreen', { lead: leads[0] });
        }
    };

    const renderLeadItem = ({ item }: { item: Lead }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('LeadDetails', { lead: item })}
        >
            <View style={styles.cardRow}>
                <Text style={styles.label}>Name: </Text>
                <Text style={styles.value}>{item.name || item.firstName || 'Unknown'}</Text>
            </View>
            <View style={styles.cardRow}>
                <Text style={styles.label}>Number: </Text>
                <Text style={styles.value}>{item.number || item.phone}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.cardRow}>
                <Text style={styles.label}>Lead stage: </Text>
                <Text style={styles.value}>{item.stage || 'N/A'}</Text>
            </View>
            <View style={styles.cardRow}>
                <Text style={styles.label}>Lead tag: </Text>
                <Text style={styles.value}>{item.tag || 'N/A'}</Text>
            </View>
            <View style={styles.cardRow}>
                <Text style={styles.label}>Status: </Text>
                <Text style={styles.value}>{item.status || 'OPEN'}</Text>
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
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
            </View>

            <FlatList
                data={leads}
                renderItem={renderLeadItem}
                keyExtractor={(item) => item._id || item.id || Math.random().toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No leads found in this campaign.</Text>
                    </View>
                }
            />

            <View style={styles.bottomContainer}>
                <TouchableOpacity style={styles.callButton} onPress={handleStartCalling}>
                    <Text style={styles.callButtonText}>Start Calling</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3E5F5', // Light purple background to match screenshot 2
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        padding: 16,
        paddingTop: 16,
        elevation: 4,
    },
    backButton: {
        marginRight: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        flex: 1,
    },
    listContent: {
        padding: 16,
        paddingBottom: 100, // Space for bottom button
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
    },
    cardRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    label: {
        fontWeight: '600',
        color: '#333',
        width: 100,
    },
    value: {
        color: '#555',
        flex: 1,
    },
    divider: {
        height: 1,
        backgroundColor: '#EEE',
        marginVertical: 8,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    callButton: {
        backgroundColor: colors.primary, // Yellow button
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        elevation: 2,
    },
    callButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000', // Black text on yellow button
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        color: '#999',
        fontSize: 16,
    }
});
