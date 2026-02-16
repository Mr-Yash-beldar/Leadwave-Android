// src/services/VoipCallService.ts
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { api } from './api';

// Handle AudioRecord safely
let AudioRecord: any;
try {
  AudioRecord = require('react-native-audio-record');
  console.log('✅ AudioRecord loaded successfully');
} catch (e) {
  console.warn('⚠️ AudioRecord not available, using mock');
  AudioRecord = {
    init: (options: any) => console.log('📱 Mock AudioRecord init'),
    start: () => console.log('📱 Mock AudioRecord start'),
    stop: (callback: Function) => {
      setTimeout(() => callback(''), 500);
    },
  };
}

export interface CallInfo {
  id: string;
  phoneNumber: string;
  name?: string;
  type: 'INCOMING' | 'OUTGOING' | 'MISSED' | 'REJECTED';
  startTime: number;
  endTime?: number;
  duration?: number;
  recordingPath?: string;
  isLead?: boolean;
  leadId?: string;
  leadData?: any;
}

class VoipCallServiceClass {
  private listeners: Map<string, { event: string; callback: Function }> = new Map();
  private currentCall: CallInfo | null = null;
  private callStartTime: number = 0;
  private historyFilePath: string = '';

  public readonly EVENTS = {
    INCOMING_CALL: 'onIncomingCall',
    OUTGOING_CALL: 'onOutgoingCall',
    CALL_CONNECTED: 'onCallConnected',
    CALL_ENDED: 'onCallEnded',
    CALL_MISSED: 'onCallMissed',
    RECORDING_COMPLETE: 'onRecordingComplete'
  } as const;

  constructor() {
    this.historyFilePath = `${RNFS.DocumentDirectoryPath}/call_history.json`;
    this.initAudioRecord();
    this.ensureHistoryFile();
  }

  private async ensureHistoryFile() {
    try {
      const exists = await RNFS.exists(this.historyFilePath);
      if (!exists) {
        await RNFS.writeFile(this.historyFilePath, JSON.stringify([]));
        console.log('✅ Created call history file');
      }
    } catch (error) {
      console.error('❌ Failed to create history file:', error);
    }
  }

  private initAudioRecord() {
    try {
      const options = {
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        audioSource: 6,
        wavFile: 'call_recording.wav'
      };
      AudioRecord.init(options);
    } catch (error) {
      console.error('❌ Failed to init AudioRecord:', error);
    }
  }

  public async makeCall(phoneNumber: string, name?: string): Promise<boolean> {
    try {
      const callId = Date.now().toString();
      this.callStartTime = Date.now();
      
      // Check if number is lead from backend
      let isLead = false;
      let leadData = null;
      
      try {
        const leads = await api.get('/leads/search', { params: { phone: phoneNumber } });
        if (leads.data && leads.data.length > 0) {
          isLead = true;
          leadData = leads.data[0];
        }
      } catch (error) {
        console.log('Lead check failed:', error);
      }
      
      this.currentCall = {
        id: callId,
        phoneNumber,
        name: name || (leadData ? `${leadData.firstName} ${leadData.lastName}` : undefined),
        type: 'OUTGOING',
        startTime: this.callStartTime,
        isLead,
        leadData
      };

      console.log('📞 Making call to:', phoneNumber, isLead ? '(LEAD)' : '');
      
      this.startRecording();

      // Simulate call connection
      setTimeout(() => {
        this.notifyListeners(this.EVENTS.CALL_CONNECTED, this.currentCall);
      }, 2000);

      // For testing - end call after 10 seconds
      setTimeout(() => {
        this.endCall(callId);
      }, 10000);

      this.notifyListeners(this.EVENTS.OUTGOING_CALL, this.currentCall);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to make call:', error);
      return false;
    }
  }

  public async endCall(callId: string) {
    if (this.currentCall) {
      const endTime = Date.now();
      const duration = Math.floor((endTime - this.callStartTime) / 1000);
      
      const recordingPath = await this.stopRecording();
      
      this.currentCall.endTime = endTime;
      this.currentCall.duration = duration;
      this.currentCall.recordingPath = recordingPath;

      // Save to local history
      await this.saveCallToHistory(this.currentCall);
      
      // Sync with backend if needed
      await this.syncCallWithBackend(this.currentCall);
      
      this.notifyListeners(this.EVENTS.CALL_ENDED, this.currentCall);
      
      console.log('✅ Call ended, saved to history');
      this.currentCall = null;
    }
  }

  private async syncCallWithBackend(call: CallInfo) {
    try {
      // Send call data to your backend
      await api.post('/calls', {
        phoneNumber: call.phoneNumber,
        type: call.type,
        duration: call.duration,
        startTime: call.startTime,
        leadId: call.leadId,
        recordingUrl: call.recordingPath
      });
      console.log('✅ Call synced with backend');
    } catch (error) {
      console.error('❌ Failed to sync call with backend:', error);
    }
  }

  private startRecording() {
    try {
      AudioRecord.start();
      console.log('🎙️ Recording started');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
    }
  }

  private async stopRecording(): Promise<string> {
    return new Promise((resolve) => {
      AudioRecord.stop(async (result: string) => {
        try {
          const recordingsDir = `${RNFS.DocumentDirectoryPath}/recordings`;
          const dirExists = await RNFS.exists(recordingsDir);
          if (!dirExists) {
            await RNFS.mkdir(recordingsDir);
          }

          const fileName = `call_${Date.now()}.wav`;
          const destPath = `${recordingsDir}/${fileName}`;
          
          if (result && await RNFS.exists(result)) {
            await RNFS.moveFile(result, destPath);
            console.log('💾 Recording saved');
            this.notifyListeners(this.EVENTS.RECORDING_COMPLETE, { path: destPath });
            resolve(destPath);
          } else {
            resolve('');
          }
        } catch (error) {
          console.error('❌ Failed to save recording:', error);
          resolve('');
        }
      });
    });
  }

  private async saveCallToHistory(call: CallInfo) {
    try {
      let history: CallInfo[] = [];
      
      const exists = await RNFS.exists(this.historyFilePath);
      if (exists) {
        const content = await RNFS.readFile(this.historyFilePath);
        history = JSON.parse(content);
      }
      
      history.unshift(call);
      
      if (history.length > 100) {
        history = history.slice(0, 100);
      }
      
      await RNFS.writeFile(this.historyFilePath, JSON.stringify(history, null, 2));
      
    } catch (error) {
      console.error('❌ Failed to save call history:', error);
    }
  }

  public async getCallHistory(): Promise<CallInfo[]> {
    try {
      // First try to get from local storage
      const exists = await RNFS.exists(this.historyFilePath);
      if (exists) {
        const content = await RNFS.readFile(this.historyFilePath);
        const localHistory = JSON.parse(content);
        
        // Then fetch from backend and merge
        try {
          const response = await api.get('/calls');
          const backendCalls = response.data || [];
          
          // Merge and deduplicate
          const allCalls = [...backendCalls, ...localHistory];
          const uniqueCalls = Array.from(
            new Map(allCalls.map(call => [call.id, call])).values()
          ).sort((a, b) => b.startTime - a.startTime);
          
          return uniqueCalls;
        } catch (backendError) {
          console.log('Backend fetch failed, using local history');
          return localHistory;
        }
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to load call history:', error);
      return [];
    }
  }

  public async addTestCall() {
    const testCall: CallInfo = {
      id: Date.now().toString(),
      phoneNumber: '+919876543213',
      name: 'Test Call',
      type: 'INCOMING',
      startTime: Date.now() - 3600000,
      endTime: Date.now() - 3540000,
      duration: 60,
      recordingPath: '',
      isLead: false
    };
    
    await this.saveCallToHistory(testCall);
    return testCall;
  }

  public addListener(event: string, callback: Function): string {
    const id = Math.random().toString(36).substring(2, 9);
    this.listeners.set(id, { event, callback });
    return id;
  }

  public removeListener(id: string): void {
    this.listeners.delete(id);
  }

  private notifyListeners(event: string, data: any) {
    this.listeners.forEach(listener => {
      if (listener.event === event) {
        try {
          listener.callback(data);
        } catch (error) {
          console.error('❌ Error in listener:', error);
        }
      }
    });
  }

  public getCurrentCall(): CallInfo | null {
    return this.currentCall;
  }
}

export const VoipCallService = new VoipCallServiceClass();