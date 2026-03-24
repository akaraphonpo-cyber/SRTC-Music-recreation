import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Copy, 
  Archive, 
  Users, 
  Settings, 
  AlertCircle,
  CheckCircle,
  TrendingUp,
  ChevronDown,
  Loader
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { getSystemConfig, resetSystemForNewTerm, promoteStudents, rolloverCourses } from '../../services/googleSheetService';
import { getCourseCatalog } from '../../services/courseService';
import { CourseData, SystemConfig } from '../../types';

// Mock Data for demonstration of performance trend (since we don't have historical term data easily queryable yet)
const performanceData = [
  { term: '2566/1', avgScore: 72 },
  { term: '2566/2', avgScore: 75 },
  { term: '2567/1', avgScore: 78 },
  { term: '2567/2', avgScore: 82 },
];

const TermManagement: React.FC = () => {
  const [selectedTerm, setSelectedTerm] = useState('กำลังโหลด...');
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [configRes, coursesRes] = await Promise.all([
          getSystemConfig(),
          getCourseCatalog()
        ]);

        if (configRes.success && configRes.data) {
          setSelectedTerm(`${configRes.data.year}/${configRes.data.term}`);
        } else {
          setSelectedTerm('ไม่ทราบปีการศึกษา');
        }

        if (coursesRes.success && coursesRes.data) {
          setCourses(coursesRes.data);
        }
      } catch (error) {
        console.error("Error fetching term data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAction = async (actionName: string) => {
    setIsActionLoading(true);
    setActionMessage(null);
    
    try {
      if (actionName === 'คัดลอกรายวิชา') {
        const res = await rolloverCourses((msg) => console.log(msg));
        if (res.success) {
           setActionMessage({ type: 'success', text: `ดำเนินการ "${actionName}" สำเร็จ` });
           // Refresh courses
           const coursesRes = await getCourseCatalog();
           if (coursesRes.success && coursesRes.data) {
             setCourses(coursesRes.data);
           }
        } else {
           setActionMessage({ type: 'error', text: `เกิดข้อผิดพลาด: ${res.error}` });
        }
      } else if (actionName === 'เลื่อนชั้นผู้เรียน') {
        const res = await promoteStudents((msg) => console.log(msg));
        if (res.success) {
           setActionMessage({ type: 'success', text: `ดำเนินการ "${actionName}" สำเร็จ` });
        } else {
           setActionMessage({ type: 'error', text: `เกิดข้อผิดพลาด: ${res.error}` });
        }
      } else if (actionName === 'จัดเก็บถาวร') {
        const res = await resetSystemForNewTerm((msg) => console.log(msg));
        if (res.success) {
           setActionMessage({ type: 'success', text: `ดำเนินการ "${actionName}" สำเร็จ` });
           // Refresh courses
           const coursesRes = await getCourseCatalog();
           if (coursesRes.success && coursesRes.data) {
             setCourses(coursesRes.data);
           }
        } else {
           setActionMessage({ type: 'error', text: `เกิดข้อผิดพลาด: ${res.error}` });
        }
      }
    } catch (error: any) {
      setActionMessage({ type: 'error', text: `เกิดข้อผิดพลาด: ${error.message}` });
    } finally {
      setIsActionLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>จัดการปีการศึกษา (Term Management)</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>จัดการข้อมูลรายวิชาและผู้เรียนข้ามปีการศึกษา</p>
        </div>
        
        <div className="relative">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors font-medium shadow-sm"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--glass-border)', color: 'var(--text-primary)' }}>
            <Calendar className="w-4 h-4" style={{ color: 'rgb(var(--accent-color))' }} />
            ปีการศึกษา {selectedTerm}
            <ChevronDown className="w-4 h-4 opacity-50 ml-2" />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          actionMessage.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-500' : 
          'bg-red-500/10 border border-red-500/20 text-red-500'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="font-medium">{actionMessage.text}</p>
        </div>
      )}

      {/* Transition Tools Section */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Settings className="w-5 h-5" style={{ color: 'rgb(var(--accent-color))' }} />
          เครื่องมือเปลี่ยนผ่านภาคเรียน
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {/* Tool 1: Course Rollover */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-blue-500/10 text-blue-500">
              <Copy className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>คัดลอกรายวิชา (Rollover)</h4>
            <p className="text-sm mt-2 mb-6 min-h-[60px]" style={{ color: 'var(--text-secondary)' }}>
              คัดลอกโครงสร้างเนื้อหา สื่อการสอน และแบบทดสอบจากเทอมที่แล้ว โดยไม่ดึงข้อมูลนักเรียนเก่ามาด้วย
            </p>
            <button 
              onClick={() => handleAction('คัดลอกรายวิชา')}
              disabled={isActionLoading}
              className="w-full py-2.5 font-medium rounded-xl transition-colors bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isActionLoading && <Loader className="w-4 h-4 animate-spin" />}
              เริ่มคัดลอกรายวิชา
            </button>
          </div>

          {/* Tool 2: Bulk Promotion */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-emerald-500/10 text-emerald-500">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>เลื่อนชั้นผู้เรียน (Promotion)</h4>
            <p className="text-sm mt-2 mb-6 min-h-[60px]" style={{ color: 'var(--text-secondary)' }}>
              เลื่อนระดับชั้นนักเรียนทั้งกลุ่มแบบอัตโนมัติ หรือจัดการสถานะนักเรียนที่จบการศึกษา (Alumni)
            </p>
            <button 
              onClick={() => handleAction('เลื่อนชั้นผู้เรียน')}
              disabled={isActionLoading}
              className="w-full py-2.5 font-medium rounded-xl transition-colors bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isActionLoading && <Loader className="w-4 h-4 animate-spin" />}
              จัดการเลื่อนชั้น
            </button>
          </div>

          {/* Tool 3: Archiving */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-amber-500/10 text-amber-500">
              <Archive className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>จัดเก็บถาวร (Archive)</h4>
            <p className="text-sm mt-2 mb-6 min-h-[60px]" style={{ color: 'var(--text-secondary)' }}>
              ล็อครายวิชาและการส่งงานของเทอมเก่าทั้งหมดเป็น Read-only เพื่อป้องกันการแก้ไขข้อมูลย้อนหลัง
            </p>
            <button 
              onClick={() => handleAction('จัดเก็บถาวร')}
              disabled={isActionLoading}
              className="w-full py-2.5 font-medium rounded-xl transition-colors bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isActionLoading && <Loader className="w-4 h-4 animate-spin" />}
              จัดเก็บเทอมที่แล้ว
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course List */}
        <section className="lg:col-span-2 glass-card rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>รายวิชาในภาคเรียนนี้ ({courses.length})</h3>
            <button className="text-sm font-medium hover:underline" style={{ color: 'rgb(var(--accent-color))' }}>ดูทั้งหมด</button>
          </div>
          <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
            {courses.length > 0 ? courses.map(course => (
              <div key={course.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${
                    course.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                  }`}>
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>{course.name}</h4>
                    <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/10">{course.code}</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {course.credits?.credit || 0} หน่วยกิต</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1.5 ${
                    course.isActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                  }`}>
                    {course.isActive ? 'กำลังสอน' : 'ฉบับร่าง'}
                  </span>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                ไม่มีข้อมูลรายวิชาในระบบ
              </div>
            )}
          </div>
        </section>

        {/* Analytics Widget */}
        <section className="glass-card rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <TrendingUp className="w-5 h-5" style={{ color: 'rgb(var(--accent-color))' }} />
            แนวโน้มผลสัมฤทธิ์ข้ามปี
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="term" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} domain={[0, 100]} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' 
                  }}
                />
                <Bar dataKey="avgScore" fill="rgb(var(--accent-color))" radius={[4, 4, 0, 0]} barSize={32} name="คะแนนเฉลี่ย (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 p-4 rounded-xl border flex gap-3" style={{ backgroundColor: 'rgba(var(--accent-color), 0.1)', borderColor: 'rgba(var(--accent-color), 0.2)' }}>
            <AlertCircle className="w-5 h-5 shrink-0" style={{ color: 'rgb(var(--accent-color))' }} />
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
              คะแนนเฉลี่ยรวมในภาคเรียนนี้เพิ่มขึ้น <strong className="font-semibold" style={{ color: 'rgb(var(--accent-color))' }}>4%</strong> เมื่อเทียบกับภาคเรียนที่แล้ว
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TermManagement;
