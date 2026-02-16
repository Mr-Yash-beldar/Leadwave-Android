// src/services/CallRecorderService.ts
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { CallRecorderModule } = NativeModules;
const eventEmitter = new NativeEventEmitter(CallRecorderModule);

export interface CallRecord {
  phoneNumber: string;
  name?: string;
  duration: number; // in seconds
  timestamp: number;
  type: 'INCOMING' | 'OUTGOING' | 'MISSED' | 'REJECTED';
  recordingPath?: string;
  isLead?: boolean;
}

class CallRecorderServiceClass {
  private listeners: Map<string, { event: string; callback: Function }> = new Map();
  
  public readonly EVENTS = {
    INCOMING_CALL: 'onIncomingCall',
    OUTGOING_CALL: 'onOutgoingCall',
    CALL_ENDED: 'onCallEnded',
    CALL_RECORDED: 'onCallRecorded'
  } as const;

  constructor() {
    if (Platform.OS === 'android' && CallRecorderModule) {
      this.setupListeners();
    }
  }

  private setupListeners(): void {
    // Listen for incoming calls
    eventEmitter.addListener('incomingCall', this.handleIncomingCall.bind(this));
    
    // Listen for outgoing calls
    eventEmitter.addListener('outgoingCall', this.handleOutgoingCall.bind(this));
    
    // Listen for call end
    eventEmitter.addListener('callEnded', this.handleCallEnded.bind(this));
    
    // Listen for recording completion
    eventEmitter.addListener('callRecorded', this.handleCallRecorded.bind(this));
  }

  private handleIncomingCall = (data: { phoneNumber: string; name?: string }): void => {
    console.log('Incoming call detected:', data);
    this.notifyListeners(this.EVENTS.INCOMING_CALL, {
      ...data,
      type: 'INCOMING',
      timestamp: Date.now()
    });
  };

  private handleOutgoingCall = (data: { phoneNumber: string; name?: string }): void => {
    console.log('Outgoing call detected:', data);
    this.notifyListeners(this.EVENTS.OUTGOING_CALL, {
      ...data,
      type: 'OUTGOING',
      timestamp: Date.now()
    });
  };

  private handleCallEnded = (data: { phoneNumber: string; duration: number; recordingPath?: string }): void => {
    console.log('Call ended:', data);
    this.notifyListeners(this.EVENTS.CALL_ENDED, {
      ...data,
      timestamp: Date.now()
    });
  };

  private handleCallRecorded = (data: { phoneNumber: string; recordingPath: string; duration: number }): void => {
    console.log('Call recorded:', data);
    this.notifyListeners(this.EVENTS.CALL_RECORDED, data);
  };

  public addListener(event: string, callback: Function): string {
    const id = Math.random().toString(36).substring(2, 9);
    this.listeners.set(id, { event, callback });
    return id;
  }

  public removeListener(id: string): void {
    this.listeners.delete(id);
  }

  private notifyListeners(event: string, data: any): void {
    this.listeners.forEach(listener => {
      if (listener.event === event) {
        try {
          listener.callback(data);
        } catch (error) {
          console.error('Error in call recorder listener:', error);
        }
      }
    });
  }

  // Start recording a call (if needed)
  public startRecording(phoneNumber: string): Promise<boolean> {
    if (Platform.OS === 'android' && CallRecorderModule?.startRecording) {
      return CallRecorderModule.startRecording(phoneNumber);
    }
    return Promise.resolve(false);
  }

  // Stop recording
  public stopRecording(): Promise<string | null> {
    if (Platform.OS === 'android' && CallRecorderModule?.stopRecording) {
      return CallRecorderModule.stopRecording();
    }
    return Promise.resolve(null);
  }

  // Get all recorded calls
  public getRecordedCalls(): Promise<CallRecord[]> {
    if (Platform.OS === 'android' && CallRecorderModule?.getRecordings) {
      return CallRecorderModule.getRecordings();
    }
    return Promise.resolve([]);
  }
}

export const CallRecorderService = new CallRecorderServiceClass();