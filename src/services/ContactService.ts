import { PermissionsAndroid, Platform, NativeModules } from 'react-native';
import Contacts from 'react-native-contacts';
import { Contact } from '../types/Contact';
import { CallLogService } from './CallLogService';

export const ContactService = {
    getContacts: async (forceRefresh?: boolean): Promise<Contact[]> => {
        // Fallback or full fetch if needed, but we recommend getContactsChunked
        return ContactService.getContactsChunked(500, 0, forceRefresh);
    },

    getContactsChunked: async (limit: number, offset: number, forceRefresh?: boolean): Promise<Contact[]> => {
        try {
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.READ_CONTACTS
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    return [];
                }

                // Use our new native method for speed and chunking
                if (NativeModules.PhoneModule?.getContacts) {
                    const data = await NativeModules.PhoneModule.getContacts(limit, offset);

                    // We still need call logs for the "totalCalls" count
                    // Fetching all logs once is better than fetching per contact
                    const logs = await CallLogService.getCallLogs(forceRefresh);
                    const callCounts = ContactService.getCallCounts(logs);

                    return data.map((c: any) => {
                        const cleanPhone = c.number ? c.number.replace(/[^\d]/g, '') : '';
                        const matchKey = cleanPhone.length >= 7 ? cleanPhone.slice(-10) : '';

                        return {
                            id: c.id || Math.random().toString(),
                            name: c.name || 'Unknown',
                            phoneNumbers: [{
                                number: c.number || '',
                                label: 'mobile'
                            }],
                            imageAvailable: c.hasThumbnail,
                            totalCalls: matchKey ? callCounts[matchKey] || 0 : 0,
                            isStarred: c.isStarred || false
                        };
                    });
                }
            }

            // Fallback to react-native-contacts if native module fails or on iOS
            const data = await Contacts.getAll();
            const logs = await CallLogService.getCallLogs(forceRefresh);
            const callCounts = ContactService.getCallCounts(logs);

            if (data.length > 0) {
                return data.slice(offset, offset + limit).map(c => {
                    const phone = c.phoneNumbers?.[0]?.number || '';
                    const cleanPhone = phone.replace(/[^\d]/g, '');
                    const matchKey = cleanPhone.length >= 7 ? cleanPhone.slice(-10) : '';

                    return {
                        id: c.recordID || Math.random().toString(),
                        name: [c.givenName, c.familyName].filter(Boolean).join(' ') || 'Unknown',
                        phoneNumbers: c.phoneNumbers?.map(p => ({
                            number: p.number || '',
                            label: p.label || 'mobile'
                        })) || [],
                        imageAvailable: c.hasThumbnail,
                        totalCalls: matchKey ? callCounts[matchKey] || 0 : 0,
                        isStarred: c.isStarred || false
                    };
                });
            }
            return [];
        } catch (e) {
            console.error('Error in getContactsChunked:', e);
            return [];
        }
    },

    toggleFavorite: async (contactId: string, isStarred: boolean): Promise<boolean> => {
        try {
            // Need to fetch the full contact object first to update it
            const contact = await Contacts.getContactById(contactId);
            if (contact) {
                const updatedContact = {
                    ...contact,
                    isStarred: isStarred
                };
                await Contacts.updateContact(updatedContact);
                return true;
            }
            return false;
        } catch (e) {
            console.error('Failed to toggle favorite:', e);
            return false;
        }
    },

    getCallCounts: (logs: any[]): Record<string, number> => {
        const counts: Record<string, number> = {};
        logs.forEach(log => {
            if (!log.phoneNumber) return;
            const cleanPhone = log.phoneNumber.replace(/[^\d]/g, '');
            if (cleanPhone.length >= 7) { // Minimum length for a valid mobile/landline check
                const matchKey = cleanPhone.slice(-10);
                counts[matchKey] = (counts[matchKey] || 0) + 1;
            }
        });
        return counts;
    }
};
