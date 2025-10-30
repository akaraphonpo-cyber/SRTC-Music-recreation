import React from 'react';
import { Student } from '../types';
import { PREFIX_OPTIONS, CLASS_LEVEL_OPTIONS, DEPARTMENT_OPTIONS, COURSE_OPTIONS, FORM_FIELDS_TH, REGISTRATION_DAY_OPTIONS, TIME_OPTIONS } from '../constants';

interface StudentFormFieldsProps {
  formData: Partial<Student>;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  isSubmitting?: boolean;
}

const StudentFormFields: React.FC<StudentFormFieldsProps> = ({ formData, onFormChange, isSubmitting }) => {
  const commonInputClass = "mt-1 block w-full px-3 py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 disabled:opacity-50 transition-all text-sm";
  const commonLabelClass = "block text-sm font-medium";

  // FIX: Explicitly type the 'style' object as React.CSSProperties to resolve type error with WebkitAppearance.
  const style: React.CSSProperties = {
    color: 'var(--text-primary)',
    backgroundColor: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    WebkitAppearance: 'none',
  };
  
  const focusStyle = {
      borderColor: 'var(--input-focus-border)',
      boxShadow: `0 0 0 2px rgba(var(--accent-color), 0.3)`,
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    Object.assign(e.target.style, focusStyle);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
     e.target.style.borderColor = 'var(--input-border)';
     e.target.style.boxShadow = 'none';
  };
  

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-shadow" style={{color: 'var(--text-secondary)'}}>
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
          className={commonInputClass}
          style={style}
          onFocus={handleFocus}
          onBlur={handleBlur}
          required
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="prefix" className={commonLabelClass}>{FORM_FIELDS_TH.prefix}</label>
        <select
          name="prefix"
          id="prefix"
          value={formData.prefix || ''}
          onChange={onFormChange}
          className={commonInputClass}
          style={style}
          onFocus={handleFocus}
          onBlur={handleBlur}
          required
          disabled={isSubmitting}
        >
          <option value="">เลือกคำนำหน้า</option>
          {PREFIX_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>

      <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <div>
          <label htmlFor="firstName" className={commonLabelClass}>{FORM_FIELDS_TH.firstName}</label>
          <input
            type="text"
            name="firstName"
            id="firstName"
            value={formData.firstName || ''}
            onChange={onFormChange}
            className={commonInputClass}
            style={style}
            onFocus={handleFocus}
            onBlur={handleBlur}
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="lastName" className={commonLabelClass}>{FORM_FIELDS_TH.lastName}</label>
          <input
            type="text"
            name="lastName"
            id="lastName"
            value={formData.lastName || ''}
            onChange={onFormChange}
            className={commonInputClass}
            style={style}
            onFocus={handleFocus}
            onBlur={handleBlur}
            required
            disabled={isSubmitting}
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="classLevel" className={commonLabelClass}>{FORM_FIELDS_TH.classLevel}</label>
        <select
          name="classLevel"
          id="classLevel"
          value={formData.classLevel || ''}
          onChange={onFormChange}
          className={commonInputClass}
          style={style}
          onFocus={handleFocus}
          onBlur={handleBlur}
          required
          disabled={isSubmitting}
        >
          <option value="">เลือกระดับชั้น</option>
          {CLASS_LEVEL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="department" className={commonLabelClass}>{FORM_FIELDS_TH.department}</label>
        <select
          name="department"
          id="department"
          value={formData.department || ''}
          onChange={onFormChange}
          className={commonInputClass}
          style={style}
          onFocus={handleFocus}
          onBlur={handleBlur}
          required
          disabled={isSubmitting}
        >
          <option value="">เลือกแผนกวิชา</option>
          {DEPARTMENT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>

      <div className="md:col-span-2">
        <label htmlFor="course" className={commonLabelClass}>{FORM_FIELDS_TH.course}</label>
        <select
          name="course"
          id="course"
          value={formData.course || ''}
          onChange={onFormChange}
          className={commonInputClass}
          style={style}
          onFocus={handleFocus}
          onBlur={handleBlur}
          required
          disabled={isSubmitting}
        >
          <option value="">เลือกวิชาที่ลงทะเบียน</option>
          {COURSE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="registrationDay" className={commonLabelClass}>{FORM_FIELDS_TH.registrationDay}</label>
        <select
          name="registrationDay"
          id="registrationDay"
          value={formData.registrationDay || ''}
          onChange={onFormChange}
          className={commonInputClass}
          style={style}
          onFocus={handleFocus}
          onBlur={handleBlur}
          required
          disabled={isSubmitting}
        >
          <option value="">เลือกวัน</option>
          {REGISTRATION_DAY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="registrationStartTime" className={commonLabelClass}>{FORM_FIELDS_TH.registrationStartTime}</label>
          <select
            name="registrationStartTime"
            id="registrationStartTime"
            value={formData.registrationStartTime || ''}
            onChange={onFormChange}
            className={commonInputClass}
            style={style}
            onFocus={handleFocus}
            onBlur={handleBlur}
            required
            disabled={isSubmitting}
          >
            <option value="">เลือกเวลา</option>
            {TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="registrationEndTime" className={commonLabelClass}>{FORM_FIELDS_TH.registrationEndTime}</label>
          <select
            name="registrationEndTime"
            id="registrationEndTime"
            value={formData.registrationEndTime || ''}
            onChange={onFormChange}
            className={commonInputClass}
            style={style}
            onFocus={handleFocus}
            onBlur={handleBlur}
            required
            disabled={isSubmitting}
          >
            <option value="">เลือกเวลา</option>
            {TIME_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
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
          className={commonInputClass}
          style={style}
          onFocus={handleFocus}
          onBlur={handleBlur}
          required
          pattern="[0-9]{9,10}"
          title="กรุณากรอกเบอร์โทรศัพท์ 9-10 หลัก"
          disabled={isSubmitting}
        />
      </div>
    </div>
  );
};

export default StudentFormFields;
