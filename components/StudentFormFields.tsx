
import React, { useState, useEffect } from 'react';
import { Student, Course, RegistrationDay, Schedule } from '../types';
import { PREFIX_OPTIONS, CLASS_LEVEL_OPTIONS, DEPARTMENT_OPTIONS, COURSE_OPTIONS, FORM_FIELDS_TH, REGISTRATION_DAY_OPTIONS, TIME_OPTIONS } from '../constants';

interface StudentFormFieldsProps {
  formData: Partial<Student>;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onCourseChange: (course: Course, checked: boolean) => void;
  // New prop to handle schedule updates
  onScheduleChange?: (course: Course, field: keyof typeof initialSchedule, value: string) => void; 
  onScheduleIdChange?: (course: Course, scheduleId: string) => void;
  availableSchedules?: Schedule[];
  isSubmitting?: boolean;
  errors: Record<string, string>;
}

const initialSchedule = { day: RegistrationDay.MONDAY, startTime: '08:00', endTime: '08:30' };

const StudentFormFields: React.FC<StudentFormFieldsProps> = ({ 
  formData, 
  onFormChange, 
  onCourseChange, 
  onScheduleChange, 
  onScheduleIdChange,
  availableSchedules = [],
  isSubmitting, 
  errors 
}) => {
  const commonLabelClass = "block text-sm font-medium mb-1 ml-1";
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});

  const hasError = (fieldName: keyof Student | 'courses') => !!errors[fieldName];

  // Mobile font-size fix: text-base (16px) on mobile prevents iOS zoom, text-sm (14px) on desktop
  const getInputClass = (fieldName: keyof Student) => {
    return `mt-1 block w-full px-4 py-3 rounded-xl shadow-sm focus:outline-none transition-all duration-300 text-base sm:text-sm backdrop-blur-md border-0 ring-1 ${
        hasError(fieldName) 
        ? 'ring-red-500 bg-red-50/20 focus:ring-red-500' 
        : 'ring-white/30 bg-white/40 focus:bg-white/60 focus:ring-2 focus:ring-orange-500/70'
    } disabled:opacity-50`;
  };

  const inputStyle = {
    color: 'var(--text-primary)',
  };

  const toggleCourseSchedule = (course: string) => {
      setExpandedCourses(prev => ({...prev, [course]: !prev[course]}));
  };

  const availableCourses = Array.from(new Set(availableSchedules.map(s => s.course)));
  const coursesToDisplay = availableCourses.length > 0 ? availableCourses : COURSE_OPTIONS;

  const getCourseSchedule = (course: Course) => {
      if (formData.courseSchedules && formData.courseSchedules[course]) {
          return formData.courseSchedules[course];
      }
      // Fallback to global if not specific, or just empty strings if pure UI
      return {
          day: formData.registrationDay || RegistrationDay.MONDAY,
          startTime: formData.registrationStartTime || '08:00',
          endTime: formData.registrationEndTime || '08:30'
      };
  };

  const handleLocalScheduleChange = (course: Course, field: 'day' | 'startTime' | 'endTime', value: string) => {
      if (onScheduleChange) {
          onScheduleChange(course, field, value);
      }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 text-shadow" style={{color: 'var(--text-secondary)'}}>
      <div className="md:col-span-2">
        <label htmlFor="studentId" className={commonLabelClass}>{FORM_FIELDS_TH.studentId} (11 หลัก)</label>
        <input
          type="text"
          name="studentId"
          id="studentId"
          value={formData.studentId || ''}
          onChange={onFormChange}
          maxLength={11}
          pattern="\d{11}"
          title="กรุณากรอกรหัสประจำตัวนักศึกษา 11 หลัก"
          className={getInputClass('studentId')}
          style={inputStyle}
          required
          disabled={isSubmitting}
          placeholder="xxxxxxxxxxx"
          aria-invalid={hasError('studentId')}
          aria-describedby={hasError('studentId') ? 'studentId-error' : undefined}
        />
        {hasError('studentId') && <p id="studentId-error" className="mt-1.5 text-xs ml-1" style={{color: `rgb(var(--text-danger-rgb))`}}>{errors.studentId}</p>}
      </div>

      <div>
        <label htmlFor="prefix" className={commonLabelClass}>{FORM_FIELDS_TH.prefix}</label>
        <select
          name="prefix"
          id="prefix"
          value={formData.prefix || ''}
          onChange={onFormChange}
          className={getInputClass('prefix')}
          style={inputStyle}
          required
          disabled={isSubmitting}
          aria-invalid={hasError('prefix')}
          aria-describedby={hasError('prefix') ? 'prefix-error' : undefined}
        >
          <option value="">เลือกคำนำหน้า</option>
          {PREFIX_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        {hasError('prefix') && <p id="prefix-error" className="mt-1.5 text-xs ml-1" style={{color: `rgb(var(--text-danger-rgb))`}}>{errors.prefix}</p>}
      </div>

      <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
        <div>
          <label htmlFor="firstName" className={commonLabelClass}>{FORM_FIELDS_TH.firstName}</label>
          <input
            type="text"
            name="firstName"
            id="firstName"
            value={formData.firstName || ''}
            onChange={onFormChange}
            className={getInputClass('firstName')}
            style={inputStyle}
            required
            disabled={isSubmitting}
            aria-invalid={hasError('firstName')}
            aria-describedby={hasError('firstName') ? 'firstName-error' : undefined}
          />
          {hasError('firstName') && <p id="firstName-error" className="mt-1.5 text-xs ml-1" style={{color: `rgb(var(--text-danger-rgb))`}}>{errors.firstName}</p>}
        </div>

        <div>
          <label htmlFor="lastName" className={commonLabelClass}>{FORM_FIELDS_TH.lastName}</label>
          <input
            type="text"
            name="lastName"
            id="lastName"
            value={formData.lastName || ''}
            onChange={onFormChange}
            className={getInputClass('lastName')}
            style={inputStyle}
            required
            disabled={isSubmitting}
             aria-invalid={hasError('lastName')}
            aria-describedby={hasError('lastName') ? 'lastName-error' : undefined}
          />
          {hasError('lastName') && <p id="lastName-error" className="mt-1.5 text-xs ml-1" style={{color: `rgb(var(--text-danger-rgb))`}}>{errors.lastName}</p>}
        </div>
      </div>
      
      <div>
        <label htmlFor="classLevel" className={commonLabelClass}>{FORM_FIELDS_TH.classLevel}</label>
        <select
          name="classLevel"
          id="classLevel"
          value={formData.classLevel || ''}
          onChange={onFormChange}
          className={getInputClass('classLevel')}
          style={inputStyle}
          required
          disabled={isSubmitting}
          aria-invalid={hasError('classLevel')}
          aria-describedby={hasError('classLevel') ? 'classLevel-error' : undefined}
        >
          <option value="">เลือกระดับชั้น</option>
          {CLASS_LEVEL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        {hasError('classLevel') && <p id="classLevel-error" className="mt-1.5 text-xs ml-1" style={{color: `rgb(var(--text-danger-rgb))`}}>{errors.classLevel}</p>}
      </div>

      <div>
        <label htmlFor="department" className={commonLabelClass}>{FORM_FIELDS_TH.department}</label>
        <select
          name="department"
          id="department"
          value={formData.department || ''}
          onChange={onFormChange}
          className={getInputClass('department')}
          style={inputStyle}
          required
          disabled={isSubmitting}
          aria-invalid={hasError('department')}
          aria-describedby={hasError('department') ? 'department-error' : undefined}
        >
          <option value="">เลือกแผนกวิชา</option>
          {DEPARTMENT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        {hasError('department') && <p id="department-error" className="mt-1.5 text-xs ml-1" style={{color: `rgb(var(--text-danger-rgb))`}}>{errors.department}</p>}
      </div>

      <div className="md:col-span-2">
        <label className={commonLabelClass}>{FORM_FIELDS_TH.courses} (เลือกได้มากกว่า 1 วิชา)</label>
        <div 
          className={`mt-2 p-3 rounded-xl backdrop-blur-md transition-all duration-300 border-0 ring-1 ${hasError('courses') ? 'ring-red-500 bg-red-50/20' : 'ring-white/30 bg-white/40'}`} 
          role="group"
          aria-labelledby="courses-label"
        >
            {coursesToDisplay.length === 0 ? (
                <div className="text-sm opacity-60 p-2 text-center" style={{color: 'var(--text-secondary)'}}>ไม่มีรายวิชาที่เปิดสอนในขณะนี้</div>
            ) : coursesToDisplay.map(opt => {
                const isChecked = formData.courses?.includes(opt) || false;
                const hasSpecificSchedule = formData.courseSchedules && formData.courseSchedules[opt];
                const schedule = getCourseSchedule(opt);
                
                // Get schedules for this course
                const courseSchedules = availableSchedules.filter(s => s.course === opt);
                const selectedScheduleId = formData.selectedScheduleIds?.[opt];

                return (
                <div key={opt} className="mb-2 last:mb-0">
                    <div className={`flex items-center p-2 rounded-lg transition-colors cursor-pointer ${isChecked ? 'bg-white/20' : 'hover:bg-white/10'}`} onClick={() => !isSubmitting && onCourseChange(opt, !isChecked)}>
                        <input
                            type="checkbox"
                            id={`course-${opt}`}
                            name="courses"
                            value={opt}
                            checked={isChecked}
                            onChange={(e) => onCourseChange(opt, e.target.checked)}
                            disabled={isSubmitting}
                            className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                            style={{accentColor: 'rgb(var(--accent-color))'}}
                            onClick={(e) => e.stopPropagation()} 
                        />
                        <label htmlFor={`course-${opt}`} className="ml-3 text-sm font-medium cursor-pointer select-none flex-grow" style={{color: 'var(--text-primary)'}}>
                            {opt}
                        </label>
                        {isChecked && (
                            <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleCourseSchedule(opt); }}
                                className="text-xs px-2 py-1 rounded bg-white/30 hover:bg-white/50 transition-colors"
                                style={{color: 'var(--text-primary)'}}
                            >
                                {courseSchedules.length > 0 ? 'เลือกตารางเรียน' : (hasSpecificSchedule ? 'แก้ไขเวลา' : 'กำหนดเวลาเฉพาะ')} {expandedCourses[opt] ? '▲' : '▼'}
                            </button>
                        )}
                    </div>
                    
                    {/* Schedule Selection */}
                    {isChecked && (expandedCourses[opt] || (courseSchedules.length > 0 && !selectedScheduleId)) && (
                        <div className="ml-8 mt-2 p-3 rounded-lg bg-black/5 border border-white/10 space-y-2 animate-fade-in">
                            {courseSchedules.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-wider">เลือกกลุ่มเรียนที่ต้องการ</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        {courseSchedules.map(s => {
                                            const isFull = s.currentStudents >= s.maxStudents;
                                            const isSelected = selectedScheduleId === s.id;
                                            
                                            return (
                                                <div 
                                                    key={s.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!isFull && onScheduleIdChange) onScheduleIdChange(opt, s.id);
                                                    }}
                                                    className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                                                        isSelected 
                                                            ? 'bg-orange-500/20 border-orange-500/50 ring-1 ring-orange-500/50' 
                                                            : isFull 
                                                                ? 'bg-gray-100/50 border-gray-200 opacity-50 cursor-not-allowed' 
                                                                : 'bg-white/40 border-white/30 hover:bg-white/60'
                                                    }`}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold">วัน{s.day} {s.startTime} - {s.endTime} น.</span>
                                                        <span className="text-[10px] opacity-70">
                                                            {s.classGroup && <span className="font-bold text-orange-600 mr-1">[{s.classGroup}]</span>}
                                                            ห้อง {s.room} | ผู้สอน: {s.teacherName}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`text-[10px] font-bold ${isFull ? 'text-red-500' : 'text-green-600'}`}>
                                                            {isFull ? 'เต็มแล้ว' : `ว่าง ${s.maxStudents - s.currentStudents} ที่`}
                                                        </div>
                                                        {isSelected && (
                                                            <div className="text-orange-600">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : onScheduleChange && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-[10px] block text-muted mb-1">วันเรียน</label>
                                        <select 
                                            value={schedule.day} 
                                            onChange={(e) => handleLocalScheduleChange(opt, 'day', e.target.value)}
                                            className="w-full text-xs p-1.5 rounded border border-gray-300/50 bg-white/50"
                                        >
                                            {REGISTRATION_DAY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] block text-muted mb-1">เริ่ม</label>
                                        <select 
                                            value={schedule.startTime} 
                                            onChange={(e) => handleLocalScheduleChange(opt, 'startTime', e.target.value)}
                                            className="w-full text-xs p-1.5 rounded border border-gray-300/50 bg-white/50"
                                        >
                                            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] block text-muted mb-1">สิ้นสุด</label>
                                        <select 
                                            value={schedule.endTime} 
                                            onChange={(e) => handleLocalScheduleChange(opt, 'endTime', e.target.value)}
                                            className="w-full text-xs p-1.5 rounded border border-gray-300/50 bg-white/50"
                                        >
                                            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )})}
        </div>
        {hasError('courses') && <p id="courses-error" className="mt-1.5 text-xs ml-1" style={{color: `rgb(var(--text-danger-rgb))`}}>{errors.courses}</p>}
      </div>

      <div className="md:col-span-2 border-t border-white/20 pt-4 mt-2">
        <p className="text-sm font-bold mb-3" style={{color: 'var(--text-primary)'}}>เวลาเรียนหลัก (Default Schedule)</p>
        <p className="text-xs mb-3 opacity-70" style={{color: 'var(--text-secondary)'}}>
            * เวลาที่เลือกด้านล่างนี้ จะถูกใช้เป็นค่าเริ่มต้นสำหรับทุกวิชาที่ไม่ได้กำหนดเวลาเฉพาะ
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="registrationDay" className={commonLabelClass}>{FORM_FIELDS_TH.registrationDay}</label>
                <select
                name="registrationDay"
                id="registrationDay"
                value={formData.registrationDay || ''}
                onChange={onFormChange}
                className={getInputClass('registrationDay')}
                style={inputStyle}
                required
                disabled={isSubmitting}
                aria-invalid={hasError('registrationDay')}
                aria-describedby={hasError('registrationDay') ? 'registrationDay-error' : undefined}
                >
                <option value="">เลือกวัน</option>
                {REGISTRATION_DAY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                {hasError('registrationDay') && <p id="registrationDay-error" className="mt-1.5 text-xs ml-1" style={{color: `rgb(var(--text-danger-rgb))`}}>{errors.registrationDay}</p>}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                <label htmlFor="registrationStartTime" className={commonLabelClass}>{FORM_FIELDS_TH.registrationStartTime}</label>
                <select
                    name="registrationStartTime"
                    id="registrationStartTime"
                    value={formData.registrationStartTime || ''}
                    onChange={onFormChange}
                    className={getInputClass('registrationStartTime')}
                    style={inputStyle}
                    required
                    disabled={isSubmitting}
                    aria-invalid={hasError('registrationStartTime')}
                    aria-describedby={hasError('registrationStartTime') ? 'registrationStartTime-error' : undefined}
                >
                    <option value="">เลือกเวลา</option>
                    {TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                {hasError('registrationStartTime') && <p id="registrationStartTime-error" className="mt-1.5 text-xs ml-1" style={{color: `rgb(var(--text-danger-rgb))`}}>{errors.registrationStartTime}</p>}
                </div>
                <div>
                <label htmlFor="registrationEndTime" className={commonLabelClass}>{FORM_FIELDS_TH.registrationEndTime}</label>
                <select
                    name="registrationEndTime"
                    id="registrationEndTime"
                    value={formData.registrationEndTime || ''}
                    onChange={onFormChange}
                    className={getInputClass('registrationEndTime')}
                    style={inputStyle}
                    required
                    disabled={isSubmitting}
                    aria-invalid={hasError('registrationEndTime')}
                    aria-describedby={hasError('registrationEndTime') ? 'registrationEndTime-error' : undefined}
                >
                    <option value="">เลือกเวลา</option>
                    {TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                {hasError('registrationEndTime') && <p id="registrationEndTime-error" className="mt-1.5 text-xs ml-1" style={{color: `rgb(var(--text-danger-rgb))`}}>{errors.registrationEndTime}</p>}
                </div>
            </div>
        </div>
      </div>
      
      <div className="md:col-span-2">
        <label htmlFor="phoneNumber" className={commonLabelClass}>{FORM_FIELDS_TH.phoneNumber}</label>
        <input
          type="tel"
          name="phoneNumber"
          id="phoneNumber"
          value={formData.phoneNumber || ''}
          onChange={onFormChange}
          className={getInputClass('phoneNumber')}
          style={inputStyle}
          required
          pattern="[0-9]{9,10}"
          title="กรุณากรอกเบอร์โทรศัพท์ 9-10 หลัก"
          disabled={isSubmitting}
          placeholder="0xxxxxxxxx"
          aria-invalid={hasError('phoneNumber')}
          aria-describedby={hasError('phoneNumber') ? 'phoneNumber-error' : undefined}
        />
        {hasError('phoneNumber') && <p id="phoneNumber-error" className="mt-1.5 text-xs ml-1" style={{color: `rgb(var(--text-danger-rgb))`}}>{errors.phoneNumber}</p>}
      </div>
    </div>
  );
};

export default StudentFormFields;
