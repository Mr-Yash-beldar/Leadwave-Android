import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { CallLogService } from '../services/CallLogService';
import { api } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_INTERVAL = 60 * 1000; // 1 Minute


export const useAutoSync = () => {
    // Logic removed as per request to stop auto-sync
    // const { user } = useAuth();
    // ...
};

