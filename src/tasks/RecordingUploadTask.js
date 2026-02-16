import { RecordingUploadService } from '../services/RecordingUploadService';

module.exports = async (taskData) => {
    console.log('Headless JS Task: Starting Recording Upload', taskData);
    const { path, phoneNumber } = taskData;

    if (path) {
        try {
            await RecordingUploadService.uploadRecording(path, phoneNumber);
            console.log('Headless JS Task: Upload completed');
        } catch (error) {
            console.error('Headless JS Task: Upload failed', error);
        }
    } else {
        console.warn('Headless JS Task: No path provided');
    }
};
