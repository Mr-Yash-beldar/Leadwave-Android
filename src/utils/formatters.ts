export const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
};

export const formatDateTime = (isoString: string): string => {
    const date = new Date(isoString);
    // Simple formatting: "Jan 10, 10:30 AM"
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
};

export const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strMinutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${strMinutes} ${ampm}`;
};

export const getCallTypeIconName = (type: string): string => {
    switch (type) {
        case 'INCOMING': return 'arrow-down-left';
        case 'OUTGOING': return 'arrow-up-right';
        case 'MISSED': return 'phone-missed';
        case 'REJECTED': return 'phone-off';
        default: return 'phone';
    }
};

export const getCallTypeColor = (type: string, colors: any): string => {
    switch (type) {
        case 'INCOMING': return colors.primary;
        case 'OUTGOING': return colors.secondary;
        case 'MISSED': return colors.error;
        case 'REJECTED': return colors.textSecondary;
        default: return colors.text;
    }
};
