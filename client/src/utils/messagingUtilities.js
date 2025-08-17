import { format, isToday, isYesterday } from 'date-fns';
import { toast } from "react-hot-toast";

// --- Helper Function for Formatting Timestamps ---
export const formatMessageTimestamp = (timestamp) => {
    try {
        if (!timestamp) return '';
        const date = new Date(timestamp);

        if (isToday(date)) {
            return format(date, 'p'); // e.g., "12:35 PM"
        }
        if (isYesterday(date)) {
            return `Yesterday at ${format(date, 'p')}`; // e.g., "Yesterday at 4:30 PM"
        }
        return format(date, 'MMM d, p'); // e.g., "Oct 26, 2:15 PM"
    } catch (err) {
        toast.error('Error formatting timestamp:', err);
        return '';
    }
};
