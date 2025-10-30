import React, { useState } from 'react';
import { Student, StudentWithId, Prefix, ClassLevel, Department, Course, RegistrationStatus, RegistrationDay } from '../../types';
import { addStudent, updateStudent, deleteStudent } from '../../services/googleSheetService';
// @ts-ignore
import Swal from 'sweetalert2';
import LoadingSpinner from '../LoadingSpinner';
import Modal from '../Modal';
import StudentFormFields from '../StudentFormFields';

const emptyStudent: Omit<Student, 'timestamp'> = {
  studentId: '',
  prefix: Prefix.MR,
  firstName: '',
  lastName: '',
  classLevel: ClassLevel.PVS1,
  department: Department.IT,
  course: Course.RECREATION,
  phoneNumber: '',
  registrationDay: RegistrationDay.MONDAY,
  registrationStartTime: '08:00',
  registrationEndTime: '08:30',
};

const swalCustomClass = {
  popup: 'glass-card rounded-2xl',
  title: 'text-shadow',
  htmlContainer: 'text-shadow',
};

interface StudentsManagementProps {
  students: StudentWithId[];
  isLoading: boolean;
  fetchStudentsData: () => Promise<void>;
  regStatus: 'LOADING' | RegistrationStatus;
  onStatusToggle: () => void;
}

const StudentsManagement: React.FC<StudentsManagementProps> = ({ students, isLoading, fetchStudentsData, regStatus, onStatusToggle }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<StudentWithId>>(emptyStudent);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentStudent(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setCurrentStudent(emptyStudent);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (student: StudentWithId) => {
    setCurrentStudent(student);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentStudent(emptyStudent);
    setIsSubmittingModal(false);
  };
  
  const swalConfig = (title: string, text: string) => ({
    title,
    text,
    icon: 'error' as const,
    customClass: swalCustomClass
  });

  const handleModalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!currentStudent.studentId || !/^\d{11}$/.test(currentStudent.studentId)) {
      Swal.fire(swalConfig('ข้อมูลไม่ถูกต้อง', 'รหัสนักศึกษาต้องมี 11 หลัก'));
      return;
    }
     if (!currentStudent.phoneNumber || !/^[0-9]{9,10}$/.test(currentStudent.phoneNumber)) {
      Swal.fire(swalConfig('ข้อมูลไม่ถูกต้อง', 'เบอร์โทรศัพท์ต้องมี 9-10 หลัก'));
      return;
    }
    if (currentStudent.registrationStartTime && currentStudent.registrationEndTime && currentStudent.registrationStartTime >= currentStudent.registrationEndTime) {
        Swal.fire(swalConfig('ข้อมูลไม่ถูกต้อง', 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น'));
        return;
    }

    setIsSubmittingModal(true);
    Swal.fire({ title: 'กำลังประมวลผล...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), customClass: swalCustomClass });

    try {
      let response;
      if (isEditing && currentStudent.id) {
        response = await updateStudent(currentStudent as StudentWithId);
      } else {
        response = await addStudent(currentStudent as Omit<Student, 'timestamp'>);
      }

      if (response.success) {
        Swal.fire({icon: 'success', title: 'สำเร็จ', text: `ข้อมูลนักศึกษาถูก${isEditing ? 'แก้ไข' : 'เพิ่ม'}เรียบร้อยแล้ว`, customClass: swalCustomClass});
        closeModal();
        fetchStudentsData();
      } else {
        Swal.fire(swalConfig('เกิดข้อผิดพลาด', response.message || `ไม่สามารถ${isEditing ? 'แก้ไข' : 'เพิ่ม'}ข้อมูลได้`));
      }
    } catch (error: any) {
      Swal.fire(swalConfig('เกิดข้อผิดพลาด', error.message || 'An unexpected error occurred.'));
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleDelete = (student: StudentWithId) => {
    Swal.fire({
      title: 'คุณแน่ใจหรือไม่?',
      text: `คุณต้องการลบข้อมูลของ ${student.firstName} ${student.lastName} (ID: ${student.studentId})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'rgb(var(--text-danger-rgb))',
      cancelButtonColor: 'rgb(var(--text-link-rgb))',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก',
      customClass: swalCustomClass,
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), customClass: swalCustomClass });
        try {
          const response = await deleteStudent(student.id);
          if (response.success) {
            Swal.fire({icon: 'success', title: 'ลบสำเร็จ!', text: 'ข้อมูลนักศึกษาถูกลบแล้ว', customClass: swalCustomClass});
            fetchStudentsData();
          } else {
            Swal.fire(swalConfig('เกิดข้อผิดพลาด', response.message || 'ไม่สามารถลบข้อมูลได้'));
          }
        } catch (error: any) {
          Swal.fire(swalConfig('เกิดข้อผิดพลาด', error.message || 'An unexpected error occurred during deletion.'));
        }
      }
    });
  };
  
  const filteredStudents = students.filter(student =>
    student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentId.includes(searchTerm) ||
    student.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="glass-card p-6 rounded-2xl">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-6 gap-4">
        <div className="flex-grow">
            <h2 className="text-2xl font-bold text-shadow" style={{color: 'var(--text-primary)'}}>จัดการข้อมูลนักศึกษา</h2>
            <div className="flex items-center space-x-3 mt-3 glass-card p-3 rounded-lg">
                <span className="font-medium text-shadow" style={{color: 'var(--text-secondary)'}}>สถานะการลงทะเบียน:</span>
                {regStatus === 'LOADING' ? (
                    <LoadingSpinner size="sm" />
                ) : (
                    <button
                    onClick={onStatusToggle}
                    className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent`}
                    style={{ backgroundColor: regStatus === 'OPEN' ? 'rgb(var(--text-success-rgb))' : 'var(--text-muted)' }}
                    role="switch"
                    aria-checked={regStatus === 'OPEN'}
                    >
                    <span
                        aria-hidden="true"
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow-lg transform ring-0 transition ease-in-out duration-200 ${
                        regStatus === 'OPEN' ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                    </button>
                )}
                <span className={`font-semibold`} style={{color: regStatus === 'OPEN' ? 'rgb(var(--text-success-rgb))' : 'var(--text-secondary)'}}>
                    {regStatus === 'OPEN' ? 'เปิด' : (regStatus === 'CLOSED' ? 'ปิด' : '...')}
                </span>
            </div>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto items-center self-start sm:self-center">
          <input
            type="text"
            placeholder="ค้นหา (ชื่อ, ID, แผนก)..."
            className="px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 w-full sm:w-auto"
            style={{color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', borderColor: 'var(--input-focus-border)'}}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            onClick={openAddModal}
            className="btn-accent font-semibold py-2 px-4 rounded-lg shadow-md transition-all whitespace-nowrap w-full sm:w-auto transform hover:scale-105"
          >
            เพิ่มนักศึกษาใหม่
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-10">
            <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          {filteredStudents.length === 0 && !isLoading ? (
             <p className="text-center py-4" style={{color: 'var(--text-muted)'}}>ไม่พบข้อมูลนักศึกษา หรือยังไม่มีการลงทะเบียน</p>
          ) : (
          <table className="min-w-full">
            <thead className="border-b" style={{borderColor: 'var(--glass-border)'}}>
              <tr>
                {['ID', 'ชื่อ-สกุล', 'ระดับชั้น', 'แผนก', 'วิชา', 'วัน', 'เวลาเรียน', 'เบอร์โทร', 'ดำเนินการ'].map(header => (
                  <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap text-shadow" style={{color: 'var(--text-secondary)'}}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{borderColor: 'var(--glass-border)'}}>
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-black/10 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{student.studentId}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{student.prefix}{student.firstName} {student.lastName}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{student.classLevel}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{student.department}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{student.course}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{student.registrationDay}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{student.registrationStartTime} - {student.registrationEndTime}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{student.phoneNumber}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => openEditModal(student)}
                      className="transition-colors"
                      style={{color: 'rgb(var(--accent-color))'}}
                      aria-label={`Edit ${student.firstName} ${student.lastName}`}
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(student)}
                      className="hover:opacity-80 transition-opacity"
                      style={{color: 'rgb(var(--text-danger-rgb))'}}
                      aria-label={`Delete ${student.firstName} ${student.lastName}`}
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditing ? 'แก้ไขข้อมูลนักศึกษา' : 'เพิ่มนักศึกษาใหม่'}>
        <form onSubmit={handleModalSubmit} className="space-y-4">
          <StudentFormFields formData={currentStudent} onFormChange={handleModalInputChange} isSubmitting={isSubmittingModal} />
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              disabled={isSubmittingModal}
              className="px-4 py-2 text-sm font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors"
              style={{backgroundColor: 'var(--glass-border)', color: 'var(--text-primary)'}}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmittingModal}
              className="px-4 py-2 text-sm font-medium btn-accent rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition-colors"
            >
              {isSubmittingModal ? 'กำลังบันทึก...' : (isEditing ? 'บันทึกการเปลี่ยนแปลง' : 'เพิ่มนักศึกษา')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StudentsManagement;