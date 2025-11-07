"use strict";


Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventStatusColor = exports.getEventTypeColor = exports.formatEventDate = exports.formatEventTime = exports.getShortDayName = exports.getDayName = exports.getMonthName = exports.isToday = exports.isSameMonth = exports.isSameDay = void 0;


const isSameDay = (date1, date2, timeZone) => {
    if (!timeZone) {
        return date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
    }


    const d1 = new Date(date1.toLocaleString("en-US", { timeZone }));
    const d2 = new Date(date2.toLocaleString("en-US", { timeZone }));
    return d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();
};
exports.isSameDay = isSameDay;
const isSameMonth = (date1, date2, timeZone) => {
    if (!timeZone) {
        return date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
    }


    const d1 = new Date(date1.toLocaleString("en-US", { timeZone }));
    const d2 = new Date(date2.toLocaleString("en-US", { timeZone }));
    return d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();
};
exports.isSameMonth = isSameMonth;
const isToday = (date, timeZone) => {
    return (0, exports.isSameDay)(date, new Date(), timeZone);
};
exports.isToday = isToday;
const getMonthName = (month) => {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month];
};
exports.getMonthName = getMonthName;
const getDayName = (day) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
};
exports.getDayName = getDayName;
const getShortDayName = (day) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[day];
};
exports.getShortDayName = getShortDayName;
const formatEventTime = (date, timeZone) => {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone
    });
};
exports.formatEventTime = formatEventTime;
const formatEventDate = (date, timeZone) => {
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone
    });
};
exports.formatEventDate = formatEventDate;
const getEventTypeColor = (type) => {
    switch (type) {
        case 'sale':
            return 'bg-green-100 text-green-800 border-green-200';
        case 'installment':
            return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'reminder':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'custom':
            return 'bg-purple-100 text-purple-800 border-purple-200';
        default:
            return 'bg-gray-100 text-gray-800 border-gray-200';
    }
};
exports.getEventTypeColor = getEventTypeColor;
const getEventStatusColor = (status) => {
    switch (status) {
        case 'completed':
            return 'bg-green-100 text-green-800';
        case 'pending':
            return 'bg-yellow-100 text-yellow-800';
        case 'overdue':
            return 'bg-red-100 text-red-800';
        case 'cancelled':
            return 'bg-gray-100 text-gray-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};
exports.getEventStatusColor = getEventStatusColor;

