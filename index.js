import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import { AppRegistry } from 'react-native';
import App from './App';

// Optimize navigation by using native screens
enableScreens();

// Register app components for native entry points
AppRegistry.registerComponent('CallAnalytics', () => App);
AppRegistry.registerComponent('main', () => App);
AppRegistry.registerComponent('callyzer-clone', () => App);
// Native Android/iOS entry expects the application name; register it too
AppRegistry.registerComponent('YDBabaTrack', () => App);
AppRegistry.registerHeadlessTask('RecordingUploadTask', () => require('./src/tasks/RecordingUploadTask'));

