import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, NativeModules, NativeEventEmitter } from 'react-native';
import { Phone, UserPlus, X } from 'lucide-react-native';
import { colors } from '../theme/colors';

const { PhoneModule } = NativeModules;

// Polyfill to suppress NativeEventEmitter warning
if (PhoneModule) {
    if (!PhoneModule.addListener) {
        PhoneModule.addListener = () => { };
    }
    if (!PhoneModule.removeListeners) {
        PhoneModule.removeListeners = () => { };
    }
}

interface OngoingCallCardProps {
    onAddLead: (number: string) => void;
}

export const OngoingCallCard: React.FC<OngoingCallCardProps> = ({ onAddLead }) => {
    const [callState, setCallState] = useState<string | null>(null);
    const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const eventEmitter = new NativeEventEmitter(PhoneModule);

        const onCallStateChanged = (event: any) => {
            // event: { state, number }
            setPhoneNumber(event.number);

            switch (event.state) {
                case 4: // STATE_ACTIVE
                    setCallState('Connected');
                    break;
                case 2: // STATE_RINGING
                    setCallState('Ringing...');
                    break;
                case 1: // STATE_DIALING
                    setCallState('Dialing...');
                    break;
                case 9: // STATE_CONNECTING
                    setCallState('Connecting...');
                    break;
                case 7: // STATE_DISCONNECTED
                case 10: // STATE_DISCONNECTING
                    setCallState(null);
                    setPhoneNumber(null);
                    break;
                default:
                    // Other states?
                    break;
            }
        };

        // Also listen for CallAdded to catch initial state
        const onCallAdded = (event: any) => {
            setPhoneNumber(event.number);
            setCallState('Dialing...'); // Default assumption or wait for state change
        };

        const onCallRemoved = () => {
            setCallState(null);

            setPhoneNumber(null);
            setDuration(0);
        };

        const checkInitialState = async () => {
            try {
                const currentCall = await PhoneModule.getCurrentCall();
                if (currentCall) {
                    setPhoneNumber(currentCall.number);
                    setCallState('Connected'); // Or map state from int
                }
            } catch (e) {
                console.log("Error checking call state", e);
            }
        };

        const subState = eventEmitter.addListener('CallStateChanged', onCallStateChanged);
        const subAdded = eventEmitter.addListener('CallAdded', onCallAdded);
        const subRemoved = eventEmitter.addListener('CallRemoved', onCallRemoved);

        checkInitialState();

        return () => {
            subState.remove();
            subAdded.remove();
            subRemoved.remove();
        };
    }, []);

    useEffect(() => {
        let timer: any;
        if (callState === 'Connected') {
            timer = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else {
            setDuration(0);
        }
        return () => clearInterval(timer);
    }, [callState]);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (!callState || !phoneNumber) return null;

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Phone size={20} color={colors.white} />
                </View>
                <View style={styles.info}>
                    <Text style={styles.number}>{phoneNumber}</Text>
                    <Text style={styles.status}>{callState} • {formatTime(duration)}</Text>
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity style={[styles.button, styles.addLeadBtn]} onPress={() => onAddLead(phoneNumber)}>
                    <UserPlus size={16} color={colors.white} style={{ marginRight: 6 }} />
                    <Text style={styles.btnText}>Add Lead</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.cancelBtn]} onPress={() => { }}>
                    <X size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={[styles.btnText, { color: colors.textSecondary }]}>Ignore</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.white,
        margin: 16,
        marginTop: 8,
        marginBottom: 8,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: colors.success // Green for active call
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.success,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    info: {
        flex: 1
    },
    number: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textPrimary
    },
    status: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 2
    },
    actions: {
        flexDirection: 'row',
        gap: 12
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8
    },
    addLeadBtn: {
        backgroundColor: colors.primary,
    },
    cancelBtn: {
        backgroundColor: '#F5F5F5',
    },
    btnText: {
        fontWeight: '600',
        fontSize: 14,
        color: colors.white
    }
});
