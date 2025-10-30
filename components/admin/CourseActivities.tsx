import React, { useState, useMemo, useCallback } from 'react';
import { Course, CourseConfig, Activity, ActivityStatus } from '../../types';
import { addActivity, updateActivity, deleteActivity } from '../../services/googleSheetService';
import { ACTIVITY_STATUS_OPTIONS } from '../../constants';
import LoadingSpinner from '../LoadingSpinner';
import Modal from '../Modal';
// @ts-ignore
import Swal from 'sweetalert2';

interface CourseActivitiesProps {
  courseName: Course;
  courseConfig: CourseConfig;
  onDataRefresh: () => void;
}

interface FlatGradingItem {
  key: string;
  label: string;
}

const swalCustomClass = {
  popup: 'glass-card rounded-2xl',
  title: 'text-shadow',
  htmlContainer: 'text-shadow',
};

const emptyActivity: Omit<Activity, 'id' | 'createdAt'> = {
  gradingComponentKey: '',
  title: '',
  description: '',
  status: ActivityStatus.NOT_STARTED,
  dueDate: '',
};

const CourseActivities: React.FC<CourseActivitiesProps> = ({ courseName, courseConfig, onDataRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<Partial<Activity>>(emptyActivity);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activities = useMemo(() => {
    // FIX: Explicitly type `a` and `b` as `Activity` to resolve TypeScript error.
    return Object.values(courseConfig.activities || {}).sort((a: Activity, b: Activity) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [courseConfig.activities]);
  
  const flattenedGradingItems = useMemo((): FlatGradingItem[] => {
    if (!courseConfig.gradingConfig || !courseConfig.gradingConfigOrder) return [];
    
    const flatten = (config: any, order: string[], parentPath = '', parentLabel = ''): FlatGradingItem[] => {
      let list: FlatGradingItem[] = [];
      order.forEach(key => {
        const component = config[key];
        if (!component) return;
        const currentPath = parentPath ? `${parentPath}.${key}` : key;
        const currentLabel = parentLabel ? `${parentLabel} > ${component.label}` : component.label;
        list.push({ key: currentPath, label: currentLabel });
        if (component.subComponents && component.subComponentsOrder) {
          list = list.concat(flatten(component.subComponents, component.subComponentsOrder, currentPath, currentLabel));
        }
      });
      return list;
    };
    
    return flatten(courseConfig.gradingConfig, courseConfig.gradingConfigOrder);
  }, [courseConfig]);

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentActivity({ ...emptyActivity });
    setIsModalOpen(true);
  };

  const openEditModal = (activity: Activity) => {
    setIsEditing(true);
    setCurrentActivity({
      ...activity,
      dueDate: activity.dueDate ? activity.dueDate.split('T')[0] : '', // Format for date input
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentActivity(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentActivity.title || !currentActivity.gradingComponentKey) {
      Swal.fire({ title: 'ข้อมูลไม่ครบถ้วน', text: 'กรุณากรอกหัวข้อและเลือกหมวดหมู่คะแนน', icon: 'warning', customClass: swalCustomClass });
      return;
    }
    
    setIsSubmitting(true);
    
    // Create a mutable copy and sanitize it to prevent sending `undefined`.
    const activityPayload: Partial<Activity> = { ...currentActivity };

    if (activityPayload.dueDate) {
        // Format from date input was YYYY-MM-DD. Convert to ISO string.
        activityPayload.dueDate = new Date(activityPayload.dueDate).toISOString();
    } else {
        // If the date is empty ('') or null, remove the key entirely to avoid Firestore errors.
        delete activityPayload.dueDate;
    }
    
    let response;
    if (isEditing) {
      response = await updateActivity(courseName, activityPayload as Activity);
    } else {
      const { id, ...dataToAdd } = activityPayload;
      response = await addActivity(courseName, dataToAdd as Omit<Activity, 'id'|'createdAt'>);
    }

    if (response.success) {
      onDataRefresh();
      closeModal();
      Swal.fire({ icon: 'success', title: 'สำเร็จ', text: response.message, timer: 1500, showConfirmButton: false, customClass: swalCustomClass });
    } else {
      Swal.fire({ title: 'เกิดข้อผิดพลาด', text: response.message, icon: 'error', customClass: swalCustomClass });
    }
    setIsSubmitting(false);
  };
  
  const handleDelete = (activity: Activity) => {
      Swal.fire({
          title: 'ยืนยันการลบ?',
          text: `คุณต้องการลบกิจกรรม "${activity.title}" ใช่หรือไม่?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: 'rgb(var(--text-danger-rgb))',
          cancelButtonText: 'ยกเลิก',
          confirmButtonText: 'ใช่, ลบเลย',
          customClass: swalCustomClass
      }).then(async (result) => {
          if (result.isConfirmed) {
              const res = await deleteActivity(courseName, activity.id);
              if (res.success) {
                  onDataRefresh();
                  Swal.fire({title: 'ลบสำเร็จ!', icon: 'success', timer: 1500, showConfirmButton: false, customClass: swalCustomClass});
              } else {
                  Swal.fire({title: 'เกิดข้อผิดพลาด', text: res.message, icon: 'error', customClass: swalCustomClass});
              }
          }
      });
  };

  const groupedActivities = useMemo(() => {
    const groups: Record<string, { label: string, activities: Activity[] }> = {};
    courseConfig.gradingConfigOrder.forEach(key => {
      groups[key] = { label: courseConfig.gradingConfig[key]?.label || key, activities: [] };
    });

    activities.forEach(activity => {
      const topLevelKey = activity.gradingComponentKey.split('.')[0];
      if (groups[topLevelKey]) {
        groups[topLevelKey].activities.push(activity);
      }
    });

    return Object.values(groups).filter(group => group.activities.length > 0);
  }, [activities, courseConfig]);
  
  const getGradingComponentLabel = (key: string) => {
      return flattenedGradingItems.find(item => item.key === key)?.label || key;
  };
  
  const getStatusBadgeColor = (status: ActivityStatus) => {
      switch(status) {
          case ActivityStatus.COMPLETED: return 'bg-green-500/20 text-green-300';
          case ActivityStatus.IN_PROGRESS: return 'bg-blue-500/20 text-blue-300';
          case ActivityStatus.NOT_STARTED:
          default:
              return 'bg-slate-500/20 text-slate-300';
      }
  };

  return (
    <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-shadow" style={{color: 'var(--text-primary)'}}>จัดการกิจกรรมและงาน</h2>
            <button onClick={openAddModal} className="btn-accent font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:scale-105">
                + เพิ่มกิจกรรมใหม่
            </button>
        </div>

        {activities.length > 0 ? (
            <div className="space-y-8">
            {groupedActivities.map(group => (
                <div key={group.label}>
                <h3 className="text-xl font-bold mb-4 pb-2 border-b" style={{color: `rgb(var(--accent-color))`, borderColor: 'var(--glass-border)'}}>{group.label}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {group.activities.map(activity => (
                    <div key={activity.id} className="glass-card p-5 rounded-xl flex flex-col justify-between">
                        <div>
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-lg mb-2 pr-2" style={{color: 'var(--text-primary)'}}>{activity.title}</h4>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${getStatusBadgeColor(activity.status)}`}>
                            {activity.status}
                            </span>
                        </div>
                        <p className="text-sm mb-1" style={{color: 'var(--text-secondary)'}}>
                            <span className="font-semibold">หมวดหมู่:</span> {getGradingComponentLabel(activity.gradingComponentKey)}
                        </p>
                        {activity.dueDate && <p className="text-sm mb-3" style={{color: 'var(--text-secondary)'}}><span className="font-semibold">กำหนดส่ง:</span> {new Date(activity.dueDate).toLocaleDateString('th-TH')}</p>}
                        <p className="text-sm mb-4" style={{color: 'var(--text-muted)'}}>{activity.description}</p>
                        </div>
                        <div className="flex justify-end space-x-2 border-t pt-3 mt-auto" style={{borderColor: 'var(--glass-border)'}}>
                        <button onClick={() => openEditModal(activity)} className="text-sm font-medium" style={{color: 'rgb(var(--accent-color))'}}>แก้ไข</button>
                        <button onClick={() => handleDelete(activity)} className="text-sm font-medium" style={{color: 'rgb(var(--text-danger-rgb))'}}>ลบ</button>
                        </div>
                    </div>
                    ))}
                </div>
                </div>
            ))}
            </div>
        ) : (
            <div className="text-center py-12 glass-card rounded-2xl">
                <p className="text-lg font-semibold" style={{color: 'var(--text-secondary)'}}>ยังไม่มีกิจกรรม</p>
                <p style={{color: 'var(--text-muted)'}}>คลิก "เพิ่มกิจกรรมใหม่" เพื่อเริ่มต้น</p>
            </div>
        )}

        <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditing ? 'แก้ไขกิจกรรม' : 'เพิ่มกิจกรรมใหม่'}>
            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="title" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>หัวข้อ</label>
                <input type="text" name="title" id="title" value={currentActivity.title || ''} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2.5 rounded-lg shadow-sm" style={{color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)'}}/>
            </div>
            <div>
                <label htmlFor="gradingComponentKey" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>หมวดหมู่คะแนน</label>
                <select name="gradingComponentKey" id="gradingComponentKey" value={currentActivity.gradingComponentKey || ''} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2.5 rounded-lg shadow-sm" style={{color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)'}}>
                    <option value="">-- เลือกหมวดหมู่ --</option>
                    {flattenedGradingItems.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="description" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>รายละเอียด</label>
                <textarea name="description" id="description" value={currentActivity.description || ''} onChange={handleInputChange} rows={4} className="mt-1 block w-full px-3 py-2.5 rounded-lg shadow-sm" style={{color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)'}}></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                <label htmlFor="dueDate" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>กำหนดส่ง (ถ้ามี)</label>
                <input type="date" name="dueDate" id="dueDate" value={currentActivity.dueDate || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 rounded-lg shadow-sm" style={{color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)'}}/>
                </div>
                <div>
                <label htmlFor="status" className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>สถานะ</label>
                <select name="status" id="status" value={currentActivity.status || ''} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2.5 rounded-lg shadow-sm" style={{color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)'}}>
                    {ACTIVITY_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                </div>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={closeModal} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium rounded-lg shadow-sm" style={{backgroundColor: 'var(--glass-border)', color: 'var(--text-primary)'}}>ยกเลิก</button>
                <button type="submit" disabled={isSubmitting} className="btn-accent px-4 py-2 text-sm font-medium rounded-lg shadow-sm disabled:opacity-50">{isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}</button>
            </div>
            </form>
        </Modal>
    </div>
  );
};

export default CourseActivities;