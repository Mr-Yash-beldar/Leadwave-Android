import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { LeadsService } from '../services/LeadsService';

const POSTED_CALLS_KEY = 'posted_calls';
const LATEST_CALL_TS_KEY = 'latest_call_timestamp';

module.exports = async (taskData) => {
    console.log('[BackgroundCallTask] Woke up with data:', taskData);
    
    try {
        const { phoneNumber, duration, callType, timestamp } = taskData;
        
        if (!phoneNumber) {
            console.warn('[BackgroundCallTask] No phone number provided, aborting.');
            return;
        }

        // 1. Clean the phone number
        const cleanedPhone = phoneNumber.replace(/[^0-9+]/g, '');
        const inputLast10 = cleanedPhone.replace(/[^0-9]/g, '').slice(-10);
        
        // 2. We can't easily access React state (leadsRef) here because we are headless.
        // We will directly check the API.
        console.log(`[BackgroundCallTask] Checking number ${cleanedPhone} with API...`);
        const lead = await api.checkPhone(cleanedPhone);
        
        let leadId = null;
        if (lead && (lead._id || lead.id)) {
            leadId = lead._id || lead.id;
        }

        // 3. If matched, post to backend
        if (leadId) {
            console.log(`[BackgroundCallTask] Matched lead ${leadId}. Preparing to post...`);
            
            // Build a synthetic call log object matching what the UI uses
            const syntheticCallId = `bg_${timestamp}_${cleanedPhone}`;
            
            // Deduplication check
            const rawPosted = await AsyncStorage.getItem(POSTED_CALLS_KEY);
            const postedSet = rawPosted ? JSON.parse(rawPosted) : [];
            
            if (postedSet.includes(syntheticCallId)) {
                console.log(`[BackgroundCallTask] Call ${syntheticCallId} was already posted. Skipping.`);
                return;
            }

            const ts = timestamp ? Number(timestamp) : Date.now();

            const payload = {
                lead_id: leadId,
                call_log_id: syntheticCallId,
                call_type: callType || 'unknown',
                duration: duration || 0,
                timestamp: new Date(ts).toISOString(),
                notes: 'Auto Recorded Background Call',
                synced: false
            };

            await LeadsService.postCallLog(payload);
            console.log(`[BackgroundCallTask] Successfully posted background call ${syntheticCallId}`);
            
            // Add to posted set
            postedSet.push(syntheticCallId);
            await AsyncStorage.setItem(POSTED_CALLS_KEY, JSON.stringify(postedSet));
            
            // Update global timestamp so the foreground app doesn't re-process it
            const currentGlobalStr = await AsyncStorage.getItem(LATEST_CALL_TS_KEY);
            const currentGlobalTs = currentGlobalStr ? parseInt(currentGlobalStr, 10) : 0;
            if (ts > currentGlobalTs) {
                await AsyncStorage.setItem(LATEST_CALL_TS_KEY, String(ts));
            }
        } else {
            console.log(`[BackgroundCallTask] No lead matched for ${cleanedPhone}. Leaving it alone.`);
        }
    } catch (e) {
        console.error('[BackgroundCallTask] Fatal Error:', e);
    }
};
