
import { Prefix, ClassLevel, Department, Course, RegistrationDay, ActivityStatus } from './types';

export const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyRpd5P0HUgTBonMW7INRYRPYW8OTnylTuQqJJgNizwS8eedA8NYD8584_-hn1qn4BT/exec';
export const SRTC_LOGO_URL = 'https://www.srtc.ac.th/2020/images/%E0%B8%95%E0%B8%81%E0%B9%81%E0%B8%95%E0%B9%88%E0%B8%87/%E0%B8%AA%E0%B8%B3%E0%B9%80%E0%B8%99%E0%B8%B2%E0%B8%82%E0%B8%AD%E0%B8%87_393004-140.png';

export const PREFIX_OPTIONS = Object.values(Prefix);
export const CLASS_LEVEL_OPTIONS = Object.values(ClassLevel);
export const DEPARTMENT_OPTIONS = Object.values(Department);
export const COURSE_OPTIONS = Object.values(Course);
export const REGISTRATION_DAY_OPTIONS = Object.values(RegistrationDay);
export const ACTIVITY_STATUS_OPTIONS = Object.values(ActivityStatus);

// Generate time options from 8:00 to 19:00 in 30-minute intervals
export const TIME_OPTIONS: string[] = [];
for (let h = 8; h <= 19; h++) {
  for (let m = 0; m < 60; m += 30) {
    const hour = h.toString().padStart(2, '0');
    const minute = m.toString().padStart(2, '0');
    if (h === 19 && m > 0) continue; // Do not add times after 19:00
    TIME_OPTIONS.push(`${hour}:${minute}`);
  }
}


export const FORM_FIELDS_TH = {
  studentId: "รหัสประจำตัวนักศึกษา",
  prefix: "คำนำหน้า",
  firstName: "ชื่อ",
  lastName: "นามสกุล",
  classLevel: "ระดับชั้น",
  department: "แผนกวิชา",
  course: "วิชาที่ลงทะเบียน",
  phoneNumber: "เบอร์โทรศัพท์",
  registrationDay: "วันที่ลงทะเบียนเรียน",
  registrationStartTime: "เวลาเริ่มต้น",
  registrationEndTime: "เวลาสิ้นสุด"
};