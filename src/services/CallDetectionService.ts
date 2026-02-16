// src/services/CallDetectionService.ts
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

// Types
export type CallState = 'IDLE' | 'RINGING' | 'OFFHOOK' | 'CONNECTED' | 'DISCONNECTED';

export interface CallStateEvent {
  state: CallState;
  phoneNumber: string;
}

export interface CallInfo {
  phoneNumber: string;
  state: CallState;
  startTime?: number;
  endTime?: number;
  duration?: number;
  isIncoming: boolean;
  name?: string;
}

export interface CallDetectionModuleInterface {
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

class CallDetectionServiceClass {
  private eventEmitter: NativeEventEmitter | null = null;
  private listeners: Map<string, { event: string; callback: Function; subscription?: any }> = new Map();
  private currentCall: CallInfo | null = null;
  private callStartTime: number | null = null;
  private module: CallDetectionModuleInterface | null = null;

  // Event names
  public readonly EVENTS = {
    PHONE_STATE_CHANGED: 'onPhoneStateChanged',
    INCOMING_CALL: 'onIncomingCallReceived',
    CALL_ANSWERED: 'onCallAnswered',
    CALL_ENDED: 'onCallEnded',
    OUTGOING_CALL: 'onOutgoingCallMade',
    CALL_CONNECTED: 'onCallConnected'
  } as const;

  constructor() {
    const { CallDetectionModule } = NativeModules;
    
    if (Platform.OS === 'android' && CallDetectionModule) {
      this.module = CallDetectionModule as CallDetectionModuleInterface;
      this.eventEmitter = new NativeEventEmitter(CallDetectionModule);
      this.setupAndroidListeners();
    } else {
      console.log('CallDetectionModule is not available on this platform');
      // Fallback for iOS - use mock implementation for testing
      this.setupMockListeners();
    }
  }

  private setupAndroidListeners(): void {
    if (!this.eventEmitter) return;

    // Phone state changes (ringing, offhook, idle)
    this.addNativeListener(
      this.EVENTS.PHONE_STATE_CHANGED,
      this.handlePhoneStateChange.bind(this)
    );
    
    // New incoming call
    this.addNativeListener(
      this.EVENTS.INCOMING_CALL,
      this.handleIncomingCall.bind(this)
    );
    
    // Call ended
    this.addNativeListener(
      this.EVENTS.CALL_ENDED,
      this.handleCallEnded.bind(this)
    );
    
    // Outgoing call
    this.addNativeListener(
      this.EVENTS.OUTGOING_CALL,
      this.handleOutgoingCall.bind(this)
    );
  }

  // Mock implementation for development/testing
  private setupMockListeners(): void {
    console.log('Using mock call detection (for development only)');
    
    // Simulate an incoming call after 5 seconds (for testing)
    setTimeout(() => {
      this.handleIncomingCall('9876543210');
    }, 5000);
    
    // Simulate call end after 15 seconds
    setTimeout(() => {
      this.handleCallEnded();
    }, 15000);
  }

  private addNativeListener(eventName: string, handler: (data: any) => void): void {
    if (!this.eventEmitter) return;
    
    const subscription = this.eventEmitter.addListener(eventName, handler);
    const id = Math.random().toString(36).substring(2, 9);
    
    this.listeners.set(id, {
      event: eventName,
      callback: handler,
      subscription
    });
  }

  private handlePhoneStateChange = (event: CallStateEvent | string, phoneNumber?: string): void => {
    // Handle both object format and string format
    let state: string;
    let number: string;

    if (typeof event === 'object') {
      state = event.state;
      number = event.phoneNumber;
    } else {
      state = event;
      number = phoneNumber || 'unknown';
    }

    console.log('Phone state changed:', state, number);
    
    switch (state) {
      case 'RINGING':
        this.handleIncomingCall(number);
        break;
      case 'OFFHOOK':
        if (this.currentCall?.state === 'RINGING' || this.currentCall?.state === 'IDLE') {
          this.handleCallAnswered();
        }
        break;
      case 'IDLE':
        if (this.currentCall && this.currentCall.state !== 'DISCONNECTED') {
          this.handleCallEnded();
        }
        break;
    }
  };

  private handleIncomingCall = (phoneNumber: string): void => {
    const startTime = Date.now();
    this.callStartTime = startTime;
    
    this.currentCall = {
      phoneNumber: this.formatPhoneNumber(phoneNumber),
      state: 'RINGING',
      isIncoming: true,
      startTime,
    };
    
    this.notifyListeners(this.EVENTS.INCOMING_CALL, this.currentCall);
  };

  private handleCallAnswered = (): void => {
    if (this.currentCall) {
      this.currentCall.state = 'CONNECTED';
      this.notifyListeners(this.EVENTS.CALL_CONNECTED, this.currentCall);
    }
  };

  private handleCallEnded = (): void => {
    if (this.currentCall && this.callStartTime) {
      const endTime = Date.now();
      const duration = Math.floor((endTime - this.callStartTime) / 1000); // in seconds
      
      this.currentCall.state = 'DISCONNECTED';
      this.currentCall.endTime = endTime;
      this.currentCall.duration = duration;
      
      // Notify for all calls that ended
      this.notifyListeners(this.EVENTS.CALL_ENDED, { ...this.currentCall });
      
      this.currentCall = null;
      this.callStartTime = null;
    }
  };

  private handleOutgoingCall = (phoneNumber: string): void => {
    const startTime = Date.now();
    this.callStartTime = startTime;
    
    this.currentCall = {
      phoneNumber: this.formatPhoneNumber(phoneNumber),
      state: 'OFFHOOK',
      isIncoming: false,
      startTime,
    };
    
    this.notifyListeners(this.EVENTS.OUTGOING_CALL, this.currentCall);
  };

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-numeric characters but keep + for international format
    if (phoneNumber.startsWith('+')) {
      return '+' + phoneNumber.substring(1).replace(/[^0-9]/g, '');
    }
    return phoneNumber.replace(/[^0-9]/g, '');
  }

  /**
   * Add a listener for call events
   * @param event - Event name from EVENTS enum
   * @param callback - Function to call when event occurs
   * @returns Listener ID for removal
   */
  public addListener(event: string, callback: (data: CallInfo) => void): string {
    const id = Math.random().toString(36).substring(2, 9);
    
    // Store callback for custom events
    this.listeners.set(id, { event, callback });
    
    return id;
  }

  /**
   * Remove a listener by ID
   * @param id - Listener ID returned from addListener
   */
  public removeListener(id: string): void {
    const listener = this.listeners.get(id);
    
    if (listener && 'subscription' in listener && listener.subscription) {
      // Native event listener
      listener.subscription.remove();
    }
    
    this.listeners.delete(id);
  }

  /**
   * Remove all listeners
   */
  public removeAllListeners(): void {
    this.listeners.forEach((listener, id) => {
      if ('subscription' in listener && listener.subscription) {
        listener.subscription.remove();
      }
      this.listeners.delete(id);
    });
  }

  private notifyListeners(event: string, data: CallInfo): void {
    this.listeners.forEach((listener) => {
      if (listener.event === event) {
        try {
          listener.callback(data);
        } catch (error) {
          console.error('Error in call detection listener:', error);
        }
      }
    });
  }

  /**
   * Get current active call if any
   */
  public getCurrentCall(): CallInfo | null {
    return this.currentCall;
  }

  /**
   * Check if the module is available
   */
  public isAvailable(): boolean {
    return Platform.OS === 'android' && this.module !== null;
  }
}

// Export singleton instance
export const CallDetectionService = new CallDetectionServiceClass();