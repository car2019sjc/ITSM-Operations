import { parseISO, format, isWithinInterval, set } from 'date-fns';
import { SHIFTS } from '../types/analyst';

export const getShiftFromTime = (dateStr: string): keyof typeof SHIFTS => {
  try {
    const date = parseISO(dateStr);
    const time = format(date, 'HH:mm');

    // Check if time falls within each shift
    if (isTimeInShift(time, SHIFTS.MORNING.startTime, SHIFTS.MORNING.endTime)) {
      return 'MORNING';
    }
    if (isTimeInShift(time, SHIFTS.AFTERNOON.startTime, SHIFTS.AFTERNOON.endTime)) {
      return 'AFTERNOON';
    }
    return 'NIGHT';
  } catch (error) {
    return 'MORNING'; // Default to morning shift if parsing fails
  }
};

const isTimeInShift = (time: string, shiftStart: string, shiftEnd: string): boolean => {
  const [timeHours, timeMinutes] = time.split(':').map(Number);
  const [startHours, startMinutes] = shiftStart.split(':').map(Number);
  const [endHours, endMinutes] = shiftEnd.split(':').map(Number);

  const timeInMinutes = timeHours * 60 + timeMinutes;
  const startInMinutes = startHours * 60 + startMinutes;
  const endInMinutes = endHours * 60 + endMinutes;

  if (startInMinutes < endInMinutes) {
    // Normal shift (e.g., 06:00-14:00)
    return timeInMinutes >= startInMinutes && timeInMinutes < endInMinutes;
  } else {
    // Night shift that crosses midnight (e.g., 22:00-06:00)
    return timeInMinutes >= startInMinutes || timeInMinutes < endInMinutes;
  }
};

export const getShiftName = (shift: keyof typeof SHIFTS): string => {
  return SHIFTS[shift].name;
};

export const getShiftTimes = (shift: keyof typeof SHIFTS): { start: string; end: string } => {
  return {
    start: SHIFTS[shift].startTime,
    end: SHIFTS[shift].endTime
  };
};