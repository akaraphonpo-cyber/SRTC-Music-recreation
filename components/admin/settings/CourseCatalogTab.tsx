import React, { useState, useEffect } from 'react';
import { CourseData } from '../../../types';
import { addCourseToCatalog, updateCourseInCatalog, deleteCourseFromCatalog, getCourseCatalog } from '../../../services/courseService';
import LoadingSpinner from '../../common/LoadingSpinner';
import Modal from '../../common/Modal';

const CourseCatalogTab: React.FC = () => {
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state
    const [isEditing, setIsEditing] = useState(false);
    const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
    const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<CourseData, 'id'>>({
        code: '',
        name: '',
        credits: { theory: 0, practice: 0, credit: 0 },
        description: '',
        room: '',
        isActive: true
    });

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        setIsLoading(true);
        const res = await getCourseCatalog();
        if (res.success && res.data) {
            setCourses(res.data);
        }
        setIsLoading(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (name.startsWith('credit_')) {
            const field = name.split('_')[1];
            setFormData(prev => ({
                ...prev,
                credits: {
                    ...prev.credits,
                    [field]: Number(value)
                }
            }));
        } else if (type === 'checkbox') {
            setFormData(prev => ({
                ...prev,
                [name]: (e.target as HTMLInputElement).checked
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        if (isEditing && currentCourseId) {
            await updateCourseInCatalog(currentCourseId, formData);
        } else {
            await addCourseToCatalog(formData);
        }
        
        await fetchCourses();
        resetForm();
        setIsSaving(false);
    };

    const handleEdit = (course: CourseData) => {
        setIsEditing(true);
        setCurrentCourseId(course.id);
        setFormData({
            code: course.code,
            name: course.name,
            credits: course.credits,
            description: course.description || '',
            room: course.room || '',
            isActive: course.isActive
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = (id: string) => {
        setCourseToDelete(id);
    };

    const confirmDelete = async () => {
        if (courseToDelete) {
            setIsLoading(true);
            await deleteCourseFromCatalog(courseToDelete);
            setCourseToDelete(null);
            await fetchCourses();
        }
    };

    const resetForm = () => {
        setIsEditing(false);
        setCurrentCourseId(null);
        setFormData({
            code: '',
            name: '',
            credits: { theory: 0, practice: 0, credit: 0 },
            description: '',
            room: '',
            isActive: true
        });
    };

    if (isLoading && courses.length === 0) {
        return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">จัดการรายวิชาหลัก (Course Catalog)</h3>
                    <p className="text-sm text-gray-400">เพิ่ม ลบ หรือแก้ไขรายวิชาที่เปิดสอนในวิทยาลัย</p>
                </div>
            </div>

            {/* Form Section */}
            <div className="bg-black/20 p-6 rounded-xl border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-4">
                    {isEditing ? 'แก้ไขรายวิชา' : 'เพิ่มรายวิชาใหม่'}
                </h4>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">รหัสวิชา</label>
                            <input
                                type="text"
                                name="code"
                                value={formData.code}
                                onChange={handleInputChange}
                                required
                                placeholder="เช่น 30000-1604"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">ชื่อวิชา</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                placeholder="เช่น นันทนาการเพื่อพัฒนาคุณภาพชีวิต"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">ท. (ทฤษฎี)</label>
                            <input
                                type="number"
                                name="credit_theory"
                                value={formData.credits.theory}
                                onChange={handleInputChange}
                                min="0"
                                required
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">ป. (ปฏิบัติ)</label>
                            <input
                                type="number"
                                name="credit_practice"
                                value={formData.credits.practice}
                                onChange={handleInputChange}
                                min="0"
                                required
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">น. (หน่วยกิต)</label>
                            <input
                                type="number"
                                name="credit_credit"
                                value={formData.credits.credit}
                                onChange={handleInputChange}
                                min="0"
                                required
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">ห้องเรียน (ค่าเริ่มต้น)</label>
                            <input
                                type="text"
                                name="room"
                                value={formData.room || ''}
                                onChange={handleInputChange}
                                placeholder="เช่น 622"
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">คำอธิบายรายวิชา (ถ้ามี)</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={2}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="isActive"
                                checked={formData.isActive}
                                onChange={handleInputChange}
                                className="w-4 h-4 text-indigo-500 bg-black/20 border-white/10 rounded focus:ring-indigo-500 focus:ring-2"
                            />
                            <span className="text-sm font-medium text-gray-300">เปิดใช้งานรายวิชานี้</span>
                        </label>
                        
                        <div className="flex space-x-3">
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    ยกเลิก
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSaving && <LoadingSpinner size="sm" color="border-white" />}
                                {isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มรายวิชา'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* List Section */}
            <div>
                <h4 className="text-lg font-semibold text-white mb-4">รายวิชาทั้งหมดในระบบ</h4>
                {courses.length === 0 ? (
                    <div className="text-center py-8 bg-black/20 rounded-xl border border-white/5">
                        <p className="text-gray-500">ยังไม่มีรายวิชาในระบบ</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {courses.map(course => (
                            <div key={course.id} className={`bg-black/20 p-4 rounded-xl border ${course.isActive ? 'border-white/10' : 'border-red-500/20 opacity-70'} flex flex-col justify-between`}>
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">{course.code}</span>
                                            {!course.isActive && <span className="ml-2 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">ปิดใช้งาน</span>}
                                        </div>
                                        <div className="flex space-x-1">
                                            <button 
                                                onClick={() => handleEdit(course)}
                                                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                                                title="แก้ไข"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(course.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                title="ลบ"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <h5 className="text-white font-medium mb-1">{course.name}</h5>
                                    {course.description && (
                                        <p className="text-sm text-gray-400 line-clamp-2 mb-3">{course.description}</p>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-white/5 flex justify-between">
                                    <span>หน่วยกิต: {course.credits.theory}-{course.credits.practice}-{course.credits.credit}</span>
                                    {course.room && <span>ห้อง: {course.room}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal isOpen={!!courseToDelete} onClose={() => setCourseToDelete(null)} title="ยืนยันการลบ" size="sm">
                <div className="p-4">
                    <p className="text-gray-300 mb-6">คุณแน่ใจหรือไม่ว่าต้องการลบรายวิชานี้? การกระทำนี้ไม่สามารถเรียกคืนได้</p>
                    <div className="flex justify-end space-x-3">
                        <button 
                            onClick={() => setCourseToDelete(null)}
                            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button 
                            onClick={confirmDelete}
                            className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 font-medium transition-colors"
                        >
                            ลบรายวิชา
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CourseCatalogTab;
