import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { X, Save } from 'lucide-react-native';
import { colors } from '../theme/colors';

interface AddLeadModalProps {
    isVisible: boolean;
    onClose: () => void;
    phoneNumber: string;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({ isVisible, onClose, phoneNumber }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [source, setSource] = useState('Manual'); // Default source
    const [campaign, setCampaign] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a name');
            return;
        }

        setLoading(true);

        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            Alert.alert('Success', 'Lead added successfully!');

            // Reset form
            setName('');
            setEmail('');
            setCampaign('');

            onClose();
        }, 1500);
    };

    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Add New Lead</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                style={[styles.input, styles.disabledInput]}
                                value={phoneNumber}
                                editable={false}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Name *</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter lead name"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter email address"
                                keyboardType="email-address"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Source</Text>
                            <TextInput
                                style={styles.input}
                                value={source}
                                onChangeText={setSource}
                                placeholder="e.g. Manual, Inbound Call"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Campaign</Text>
                            <TextInput
                                style={styles.input}
                                value={campaign}
                                onChangeText={setCampaign}
                                placeholder="Select or enter campaign"
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.saveButton, loading && styles.disabledButton]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.white} />
                            ) : (
                                <>
                                    <Save size={20} color={colors.white} style={{ marginRight: 8 }} />
                                    <Text style={styles.saveButtonText}>Save Lead</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '80%', // Takes up 80% of screen
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    form: {
        paddingBottom: 40
    },
    inputGroup: {
        marginBottom: 16
    },
    label: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
        fontWeight: '500'
    },
    input: {
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: colors.textPrimary,
        backgroundColor: '#FAFAFA'
    },
    disabledInput: {
        backgroundColor: '#EEEEEE',
        color: '#888'
    },
    saveButton: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginTop: 20
    },
    disabledButton: {
        opacity: 0.7
    },
    saveButtonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: 'bold'
    }
});
