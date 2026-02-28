import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNavigationContainerRef } from '@react-navigation/native';

const BASE_URL = 'https://connect.leadvidya.in/api';

// ── Global 429 backoff ─────────────────────────────────────────────────────
// When ANY request returns 429, block ALL new requests for BACKOFF_MS.
const BACKOFF_MS = 60_000; // 60 seconds
let rateLimitedUntil = 0; // timestamp (ms) until which requests are blocked

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    async (config) => {
        // Block request if we are in a 429 backoff window
        if (Date.now() < rateLimitedUntil) {
            const waitMs = rateLimitedUntil - Date.now();
            return Promise.reject(
                new Error(`Rate limited — retrying in ${Math.ceil(waitMs / 1000)}s`)
            );
        }
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Helper to get navigation outside of components

export const navigationRef = createNavigationContainerRef<any>();

let logoutHandler: (() => void) | null = null;
export const setLogoutHandler = (handler: () => void) => {
    logoutHandler = handler;
};

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response && error.response.status === 401) {
            // Handle unauthorized (session expired)
            console.log('Session expired, logging out...');

            if (logoutHandler) {
                logoutHandler();
            } else {
                // Fallback if no handler registered (e.g. before AuthProvider mounts)
                await AsyncStorage.multiRemove(['user', 'token', 'refreshToken']);
                if (navigationRef.isReady()) {
                    navigationRef.reset({
                        index: 0,
                        routes: [{ name: 'SessionExpired' }],
                    });
                }
            }
        }

        // Handle 429 — set backoff, do NOT navigate away
        if (error.response?.status === 429) {
            rateLimitedUntil = Date.now() + BACKOFF_MS;
            console.warn('[API] 429 received — pausing requests for 60s');
            return Promise.reject(error);
        }

        // Handle Server Down / Network Errors (exclude 429)
        const isNoInternet = !error.response || error.message === 'Network Error';
        const isServerError = error.response && [500, 502, 503, 504].includes(error.response.status);

        if ((isNoInternet || isServerError) && navigationRef.isReady()) {
            navigationRef.navigate('ServerDown', {
                errorType: isNoInternet ? 'no_internet' : 'server_error',
            });
        }

        return Promise.reject(error);
    }
);

export default apiClient;
