// types/CallDetectionModule.ts

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