import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, NativeEventEmitter, NativeModules, Dimensions, Image } from 'react-native';
import { Mic, MicOff, Phone, Volume2, VolumeX, Pause } from 'lucide-react-native';
import { colors } from '../theme/colors';

const { PhoneModule } = NativeModules;
const { width } = Dimensions.get('window');

export const CallScreen = ({ navigation, route }: any) => {
    const { number, name } = route.params || {};
    const [callState, setCallState] = useState('Dialing...');
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaker, setIsSpeaker] = useState(false);
    const [isHold, setIsHold] = useState(false);
    const [recordingPath, setRecordingPath] = useState<string | null>(null);

    const [isRecording, setIsRecording] = useState(false);

    useEffect(() => {
        const eventEmitter = new NativeEventEmitter(PhoneModule);

        const onCallStateChanged = (event: any) => {
            console.log("Call State:", event.state);
            switch (event.state) {
                case 4: // STATE_ACTIVE
                    setCallState('Connected');
                    break;
                case 7: // STATE_DISCONNECTED
                case 7: // STATE_DISCONNECTED
                    setCallState('Ended');
                    setTimeout(() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            navigation.navigate('MainTabs');
                        }
                    }, 1500);
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
                case 10: // STATE_DISCONNECTING
                    setCallState('Disconnecting...');
                    break;
            }
        };

        const onRecordingState = (event: any) => {
            setIsRecording(event.isRecording);
            if (event.path) {
                setRecordingPath(event.path);
            }
        };

        const sub = eventEmitter.addListener('CallStateChanged', onCallStateChanged);
        const subRec = eventEmitter.addListener('RecordingState', onRecordingState);

        // Also listen for CallRemoved to close
        const sub2 = eventEmitter.addListener('CallRemoved', () => {
            setCallState('Ended');
            setTimeout(() => {
                if (navigation.canGoBack()) {
                    navigation.goBack();
                } else {
                    navigation.navigate('MainTabs');
                }
            }, 100);
        });

        return () => {
            sub.remove();
            subRec.remove();
            sub2.remove();
        };
    }, []);

    useEffect(() => {
        let timer: any;
        // Only start timer if strictly Connected
        if (callState === 'Connected') {
            timer = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [callState]);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleEndCall = () => {
        PhoneModule.endCall();
        // Force UI update immediately for better UX, even if event is delayed
        setCallState('Ending...');
        // Fallback safety: if no event comes back in 2s, close screen
        setTimeout(() => {
            if (navigation.canGoBack()) {
                navigation.goBack();
            } else {
                navigation.navigate('MainTabs');
            }
        }, 2000);
    };

    const toggleMute = () => {
        PhoneModule.setMute(!isMuted);
        setIsMuted(!isMuted);
    };

    const toggleSpeaker = () => {
        PhoneModule.setSpeaker(!isSpeaker);
        setIsSpeaker(!isSpeaker);
    };

    const toggleHold = () => {
        PhoneModule.setHold(!isHold);
        setIsHold(!isHold);
    };

    return (
        <View style={styles.container}>
            <View style={styles.topSection}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>{name ? name[0] : (number ? number[0] : '?')}</Text>
                </View>
                <Text style={styles.name}>{name || 'Unknown'}</Text>
                <Text style={styles.number}>{number}</Text>
                <Text style={styles.status}>{callState}</Text>
                {isRecording && <Text style={styles.recordingText}>● Recording</Text>}
                {recordingPath && <Text style={styles.pathText} numberOfLines={1}>{recordingPath.split('/').pop()}</Text>}
                {(callState === 'Connected' || callState === 'Dialing...') && (
                    <Text style={styles.timer}>{formatTime(duration)}</Text>
                )}
            </View>

            <View style={styles.controlsContainer}>
                <View style={styles.row}>
                    <TouchableOpacity style={[styles.controlBtn, isMuted && styles.activeControl]} onPress={toggleMute}>
                        {isMuted ? <MicOff color={isMuted ? "black" : "white"} size={32} /> : <Mic color="white" size={32} />}
                        <Text style={[styles.controlLabel, isMuted && { color: 'black' }]}>Mute</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.controlBtn, isHold && styles.activeControl]} onPress={toggleHold}>
                        <Pause color={isHold ? "black" : "white"} size={32} />
                        <Text style={[styles.controlLabel, isHold && { color: 'black' }]}>Hold</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.controlBtn, isSpeaker && styles.activeControl]} onPress={toggleSpeaker}>
                        {isSpeaker ? <Volume2 color={isSpeaker ? "black" : "white"} size={32} /> : <VolumeX color="white" size={32} />}
                        <Text style={[styles.controlLabel, isSpeaker && { color: 'black' }]}>Speaker</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
                    <Phone color="white" size={40} style={{ transform: [{ rotate: '135deg' }] }} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingVertical: 40
    },
    topSection: {
        alignItems: 'center',
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#444',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20
    },
    avatarText: {
        fontSize: 48,
        color: 'white',
        fontWeight: 'bold'
    },
    name: {
        fontSize: 32,
        color: 'white',
        fontWeight: 'bold',
        marginBottom: 10
    },
    number: {
        fontSize: 18,
        color: '#AAA',
        marginBottom: 20
    },
    status: {
        fontSize: 16,
        color: '#CCC',
        marginBottom: 10
    },
    recordingText: {
        fontSize: 14,
        color: '#FF3B30',
        fontWeight: 'bold',
        marginBottom: 10
    },
    pathText: {
        fontSize: 12,
        color: '#AAA',
        marginBottom: 10,
        maxWidth: '80%'
    },
    timer: {
        fontSize: 24,
        color: '#EEE',
        fontVariant: ['tabular-nums']
    },
    controlsContainer: {
        width: width,
        alignItems: 'center',
        paddingBottom: 40,
        zIndex: 2,
    },
    row: {
        flexDirection: 'row',
        width: '80%',
        justifyContent: 'space-around',
        marginBottom: 40
    },
    controlBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.2)'
    },
    activeControl: {
        backgroundColor: 'white',
    },
    controlLabel: {
        color: 'white',
        marginTop: 8,
        fontSize: 12,
        fontWeight: '500'
    },
    endCallBtn: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FF3B30',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    }
});
