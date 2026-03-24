
import { Student, StudentWithId, Course, ClassSchedule, RegistrationDay, Schedule } from '../types';

/**
 * Retrieves the effective schedule for a student for a specific course.
 * It checks if there is a specific schedule override for the course.
 * If not, it falls back to the student's global (default) registration schedule.
 */
export const getStudentSchedule = (student: Student | StudentWithId, course: Course | string, availableSchedules?: Schedule[]): ClassSchedule => {
    // 1. Check for specific schedule ID first
    if (availableSchedules && student.selectedScheduleIds && student.selectedScheduleIds[course]) {
        const scheduleId = student.selectedScheduleIds[course];
        const schedule = availableSchedules.find(s => s.id === scheduleId);
        if (schedule) {
            return {
                day: schedule.day,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                classGroup: schedule.classGroup // Add this to ClassSchedule type later or just return it
            } as any;
        }
    }

    // 2. Check for specific course schedule override (legacy)
    if (student.courseSchedules && student.courseSchedules[course]) {
        return student.courseSchedules[course];
    }

    // 3. Fallback to global default
    return {
        day: student.registrationDay,
        startTime: student.registrationStartTime,
        endTime: student.registrationEndTime
    };
};

/**
 * Formats a time slot string (e.g. "08:00 - 10:00") from a schedule object.
 */
export const formatTimeSlot = (schedule: ClassSchedule): string => {
    if (!schedule.startTime || !schedule.endTime) return '';
    return `${schedule.startTime} - ${schedule.endTime}`;
};

export const getGroupKeys = (student: StudentWithId, course?: Course | string, availableSchedules?: Schedule[]) => {
    const dept = student.department || '';
    const level = student.classLevel || '';
    
    let day = student.registrationDay;
    let startTime = student.registrationStartTime;
    let endTime = student.registrationEndTime;
    let classGroup = '';

    if (course) {
        const sched = getStudentSchedule(student, course, availableSchedules) as any;
        day = sched.day;
        startTime = sched.startTime;
        endTime = sched.endTime;
        classGroup = sched.classGroup || '';
    }

    const timeSlot = `${startTime} - ${endTime}`;
    
    // If we have a classGroup from the schedule, use it as the primary grouping key
    if (classGroup) {
        const baseKey = `GROUP|${classGroup}`;
        const fullKey = `GROUP|${classGroup}|${day}|${timeSlot}`;
        return { baseKey, fullKey, dept, level, day, timeSlot, startTime, endTime, classGroup };
    }

    const baseKey = `${dept}|${level}`;
    const fullKey = `${baseKey}|${day}|${timeSlot}`;

    return { baseKey, fullKey, dept, level, day, timeSlot, startTime, endTime, classGroup };
};

/**
 * Helper to determine if a student matches a set of filters, respecting per-course schedules.
 */
export const getCustomGroupOptions = (
    allStudents: StudentWithId[], 
    systemConfig: any, 
    course?: Course | string,
    availableSchedules?: Schedule[]
) => {
    const aliasMap = systemConfig?.classGroupAliases || {};
    const groupsMap = new Map<string, string>();

    // 1. Add all explicitly defined aliases first
    Object.entries(aliasMap).forEach(([key, name]) => {
        groupsMap.set(key, name as string);
    });

    // 2. Dynamically add groups for students in this course
    allStudents.forEach(s => {
        if (course) {
            const courses = s.courses || ((s as any).course ? [(s as any).course] : []);
            if (!courses.includes(course as Course)) return;
        }

        const { baseKey, fullKey, dept, level, day, startTime, endTime, classGroup } = getGroupKeys(s, course, availableSchedules);

        // If neither key is in the map yet, and we have valid data, add the full key dynamically
        if (!groupsMap.has(baseKey) && !groupsMap.has(fullKey)) {
            if (classGroup) {
                groupsMap.set(fullKey, `กลุ่ม ${classGroup} (${day} ${startTime}-${endTime})`);
            } else if (dept || level) {
                const nameParts = [];
                if (dept) nameParts.push(`แผนก ${dept}`);
                if (level) nameParts.push(`ปี ${level}`);
                if (day && day !== 'undefined') nameParts.push(`วัน${day}`);
                if (startTime && startTime !== 'undefined') nameParts.push(`เวลา ${startTime}-${endTime}`);
                groupsMap.set(fullKey, nameParts.join(' '));
            }
        }
    });

    return Array.from(groupsMap.entries())
        .map(([key, name]) => ({ key, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
};

export const filterStudentsByGroupKey = (
    students: StudentWithId[],
    groupKey: string,
    course: Course | string,
    availableSchedules?: Schedule[]
): StudentWithId[] => {
    if (!groupKey) return students;

    const parts = groupKey.split('|');
    
    if (parts[0] === 'GROUP') {
        const [, classGroup, day, time] = parts;
        return students.filter(s => {
            const sched = getStudentSchedule(s, course, availableSchedules) as any;
            if (sched.classGroup !== classGroup) return false;
            return studentMatchesScheduleFilter(s, course, day, time, availableSchedules);
        });
    } else {
        const [dept, level, day, time] = parts;
        return students.filter(s => {
            if (dept && s.department !== dept) return false;
            if (level && s.classLevel !== level) return false;
            return studentMatchesScheduleFilter(s, course, day, time, availableSchedules);
        });
    }
};

export const studentMatchesScheduleFilter = (
    student: StudentWithId, 
    course: Course | string, 
    filterDay: string,
    filterTimeSlot: string,
    availableSchedules?: Schedule[]
): boolean => {
    const schedule = getStudentSchedule(student, course, availableSchedules);
    
    if (filterDay && filterDay !== 'undefined' && schedule.day !== filterDay) {
        return false;
    }
    
    if (filterTimeSlot && filterTimeSlot !== 'undefined - undefined') {
        const scheduleTimeSlot = formatTimeSlot(schedule);
        if (scheduleTimeSlot !== filterTimeSlot) {
            return false;
        }
    }
    
    return true;
};
