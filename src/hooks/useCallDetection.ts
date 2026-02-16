// src/hooks/useCallDetection.ts
import { useEffect, useState, useCallback } from 'react';
import { CallDetectionService } from '../services/CallDetectionService';
import type { CallInfo } from '../services/CallDetectionService';

interface UseCallDetectionOptions {
  onIncomingCall?: (call: CallInfo) => void;
  onCallConnected?: (call: CallInfo) => void;
  onCallEnded?: (call: CallInfo) => void;
  onOutgoingCall?: (call: CallInfo) => void;
  minDuration?: number; // Minimum call duration in seconds to trigger onCallEnded
}

export const useCallDetection = (options: UseCallDetectionOptions = {}) => {
  const [currentCall, setCurrentCall] = useState<CallInfo | null>(null);
  const [lastCall, setLastCall] = useState<CallInfo | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    setIsAvailable(CallDetectionService.isAvailable());

    // Set up listeners
    const incomingListener = CallDetectionService.addListener(
      CallDetectionService.EVENTS.INCOMING_CALL,
      (call: CallInfo) => {
        console.log('Incoming call detected:', call);
        setCurrentCall(call);
        options.onIncomingCall?.(call);
      }
    );

    const connectedListener = CallDetectionService.addListener(
      CallDetectionService.EVENTS.CALL_CONNECTED,
      (call: CallInfo) => {
        console.log('Call connected:', call);
        setCurrentCall(call);
        options.onCallConnected?.(call);
      }
    );

    const endedListener = CallDetectionService.addListener(
      CallDetectionService.EVENTS.CALL_ENDED,
      (call: CallInfo) => {
        console.log('Call ended:', call);
        
        // Apply duration filter if specified
        if (options.minDuration && call.duration && call.duration < options.minDuration) {
          console.log('Call too short, ignoring');
          return;
        }
        
        setCurrentCall(null);
        setLastCall(call);
        options.onCallEnded?.(call);
      }
    );

    const outgoingListener = CallDetectionService.addListener(
      CallDetectionService.EVENTS.OUTGOING_CALL,
      (call: CallInfo) => {
        console.log('Outgoing call detected:', call);
        setCurrentCall(call);
        options.onOutgoingCall?.(call);
      }
    );

    // Cleanup
    return () => {
      CallDetectionService.removeListener(incomingListener);
      CallDetectionService.removeListener(connectedListener);
      CallDetectionService.removeListener(endedListener);
      CallDetectionService.removeListener(outgoingListener);
    };
  }, [options.onIncomingCall, options.onCallConnected, options.onCallEnded, options.onOutgoingCall, options.minDuration]);

  const clearLastCall = useCallback(() => {
    setLastCall(null);
  }, []);

  return {
    currentCall,
    lastCall,
    isAvailable,
    clearLastCall
  };
};