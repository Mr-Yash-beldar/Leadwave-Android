import { NativeModules } from 'react-native';
import { api } from '../services/api';

const { OverlayModule } = NativeModules;

module.exports = async (taskData) => {
    console.log('[IncomingCallLookupTask] Woke up for ringing call:', taskData);
    
    try {
        const { phoneNumber } = taskData;
        
        if (!phoneNumber) {
            console.warn('[IncomingCallLookupTask] No phone number provided, skipping UI.');
            return;
        }

        // 1. Clean the phone number
        const cleanedPhone = phoneNumber.replace(/[^0-9+]/g, '');
        
        // 2. Headless API call to get lead details
        console.log(`[IncomingCallLookupTask] Checking number ${cleanedPhone} with API for Caller ID...`);
        const lead = await api.checkPhone(cleanedPhone);
        
        let leadName = null;
        let isLead = false;

        if (lead && (lead._id || lead.id)) {
            isLead = true;
            // Best effort to get a readable name
            leadName = `${lead.firstName || lead.name || ''} ${lead.lastName || ''}`.trim();
            if (!leadName) {
                leadName = 'Unknown Name';
            }
        }

        // 3. Show the overlay natively
        if (OverlayModule && OverlayModule.showLeadOverlay) {
            console.log(`[IncomingCallLookupTask] Displaying Native Overlay for ${cleanedPhone}. Lead: ${isLead}`);
            OverlayModule.showLeadOverlay(phoneNumber, leadName, isLead);
        } else {
            console.warn('[IncomingCallLookupTask] OverlayModule is not available in NativeModules');
        }

    } catch (e) {
        console.error('[IncomingCallLookupTask] Fatal Error:', e);
    }
};
