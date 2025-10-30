import React, { useState, useEffect, useMemo } from 'react';
import { getStudentByStudentId, getCourseGradingConfig, getScoresForStudent } from '../../services/googleSheetService';
import { StudentWithId, CourseConfig, StudentScores, Activity } from '../../types';
import LoadingSpinner from '../LoadingSpinner';
import StudentActivitiesView from './StudentActivitiesView';

interface StudentDashboardPageProps {
  studentId: string;
  onLogout: () => void;
}

// --- NEW UI COMPONENTS for the Redesign ---

const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <li className="flex items-start py-2">
    <div className="flex-shrink-0 w-6 h-6 pt-0.5" style={{color: 'var(--text-muted)'}}>{icon}</div>
    <div className="ml-3">
      <strong className="font-medium" style={{color: 'var(--text-primary)'}}>{label}:</strong>
      <span className="ml-2" style={{color: 'var(--text-secondary)'}}>{value}</span>
    </div>
  </li>
);

interface DisplayScoreItem {
    key: string;
    label: string;
    score: number;
    max: number;
    level: number;
}

const ScoreAccordion: React.FC<{
  mainItem: DisplayScoreItem;
  descendants: DisplayScoreItem[];
  isOpen: boolean;
  onToggle: () => void;
}> = ({ mainItem, descendants, isOpen, onToggle }) => {
  return (
    <div className="glass-card rounded-2xl overflow-hidden transition-all duration-300">
      <button
        onClick={onToggle}
        className="flex justify-between items-center w-full p-4 hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent"
        aria-expanded={isOpen}
      >
        <h5 className="font-bold text-shadow text-left" style={{color: 'var(--text-primary)'}}>{mainItem.label}</h5>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <span className="font-bold text-lg text-shadow" style={{color: 'var(--text-primary)'}}>{mainItem.score.toFixed(0)}</span>
            <span className="text-sm text-shadow" style={{color: 'var(--text-muted)'}}> / {mainItem.max}</span>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            style={{color: 'var(--text-muted)'}}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </button>
      {isOpen && (
        <div className="px-4 py-2 space-y-1">
          {descendants.length > 0 ? (
            descendants.map(descendantItem => {
              const isParent = descendants.some(d => d.level === descendantItem.level + 1 && d.key.startsWith(descendantItem.key + '.'));
              return (
                <div
                  key={descendantItem.key}
                  className="flex justify-between items-center text-sm py-1.5 px-2 rounded-md"
                  style={{ paddingLeft: `${(descendantItem.level - mainItem.level) * 1.5}rem` }}
                >
                  <span className={isParent ? 'font-semibold' : ''} style={{color: isParent ? 'var(--text-primary)' : 'var(--text-secondary)'}}>
                    {descendantItem.label}
                  </span>
                  <span className="font-medium whitespace-nowrap pl-4" style={{color: 'var(--text-secondary)'}}>
                    {descendantItem.score.toFixed(0)} / {descendantItem.max}
                  </span>
                </div>
              );
            })
          ) : (
             <p className="text-center text-sm py-3" style={{color: 'var(--text-muted)'}}>ไม่มีหัวข้อย่อย</p>
          )}
        </div>
      )}
    </div>
  );
};


// --- Main Dashboard Component ---

const StudentDashboardPage: React.FC<StudentDashboardPageProps> = ({ studentId, onLogout }) => {
  const [studentData, setStudentData] = useState<StudentWithId | null>(null);
  const [courseConfig, setCourseConfig] = useState<CourseConfig | null>(null);
  const [studentScores, setStudentScores] = useState<StudentScores['scores'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const studentResponse = await getStudentByStudentId(studentId);
        if (!studentResponse.success || !studentResponse.data) throw new Error(studentResponse.message || "Could not find your data.");
        const student = studentResponse.data;
        setStudentData(student);

        const [configResponse, scoresResponse] = await Promise.all([
          getCourseGradingConfig(student.course),
          getScoresForStudent(student.studentId, student.course),
        ]);

        if (!configResponse.success || !configResponse.data) throw new Error(configResponse.message || "Could not load course configuration.");
        setCourseConfig(configResponse.data);

        if (!scoresResponse.success) throw new Error(scoresResponse.message || "Could not load scores.");
        setStudentScores(scoresResponse.data ? scoresResponse.data.scores : {});
        
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, [studentId]);

  const activities = useMemo(() => {
    if (!courseConfig || !courseConfig.activities) return [];
    return Object.values(courseConfig.activities);
  }, [courseConfig]);


  const scoreDetails = useMemo(() => {
    if (!studentScores || !courseConfig) return { totalScore: 0, totalMaxScore: 0, displayItems: [] };

    const displayItems: DisplayScoreItem[] = [];
    const buildDisplayList = (config: any, order: string[], path: string, level: number) => {
      order.forEach(key => {
        const component = config[key];
        if (!component) return;
        const fullKey = path ? `${path}.${key}` : key;
        displayItems.push({ key: fullKey, label: component.label, score: 0, max: component.max, level: level });
        if (component.subComponents && component.subComponentsOrder) {
          buildDisplayList(component.subComponents, component.subComponentsOrder, fullKey, level + 1);
        }
      });
    };
    buildDisplayList(courseConfig.gradingConfig, courseConfig.gradingConfigOrder, "", 0);

    for (let i = displayItems.length - 1; i >= 0; i--) {
        const item = displayItems[i];
        const children = displayItems.filter(child => child.key.startsWith(item.key + '.') && child.level === item.level + 1);
        const isParent = children.length > 0;
        
        if (isParent) {
            const childrenRawScoreSum = children.reduce((sum, child) => sum + child.score, 0);
            const childrenRawMaxSum = children.reduce((sum, child) => sum + child.max, 0);
            item.score = childrenRawMaxSum > 0 ? (childrenRawScoreSum / childrenRawMaxSum) * item.max : 0;
        } else {
            item.score = Number(studentScores[item.key]) || 0;
        }
    }
    
    const totalScore = displayItems.filter(item => item.level === 0).reduce((sum, item) => sum + item.score, 0);
    const totalMaxScore = displayItems.filter(item => item.level === 0).reduce((sum, item) => sum + item.max, 0);

    return { totalScore, totalMaxScore, displayItems };
  }, [studentScores, courseConfig]);

  const percentage = scoreDetails.totalMaxScore > 0 ? (scoreDetails.totalScore / scoreDetails.totalMaxScore) * 100 : 0;
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  useEffect(() => {
      const timer = setTimeout(() => setAnimatedPercentage(percentage), 100);
      return () => clearTimeout(timer);
  }, [percentage]);

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({...prev, [key]: !prev[key]}));
  };

  if (isLoading) return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  if (error) return <div className="text-center bg-red-500/10 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg relative" role="alert"><strong className="font-bold">Error: </strong><span className="block sm:inline">{error}</span></div>;
  if (!studentData) return <div className="text-center" style={{color: 'var(--text-muted)'}}>No student data available.</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b" style={{borderColor: 'var(--glass-border)'}}>
        <div>
          <h1 className="text-3xl font-bold text-shadow" style={{color: 'var(--text-primary)'}}>ยินดีต้อนรับ, {studentData.prefix}{studentData.firstName}</h1>
          <p className="mt-1 text-shadow" style={{color: 'var(--text-secondary)'}}>ภาพรวมการลงทะเบียนและผลการเรียนของคุณ</p>
        </div>
        <button onClick={onLogout} className="mt-4 sm:mt-0 font-semibold py-2 px-4 rounded-lg shadow-sm transition-all duration-300 whitespace-nowrap hover:bg-red-500/80 hover:text-white" style={{backgroundColor: 'var(--glass-border)', color: 'var(--text-primary)'}}>
            ออกจากระบบ
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        
        {/* --- Left Column: Score Details & Activities --- */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-shadow mb-4" style={{color: 'var(--text-primary)'}}>ความคืบหน้าของคะแนน</h3>
            <div className="text-center my-4">
              <span className="text-6xl font-bold tracking-tight" style={{color: `rgb(var(--accent-color))`}}>{scoreDetails.totalScore.toFixed(0)}</span>
              <span className="text-2xl font-medium" style={{color: 'var(--text-muted)'}}> / {scoreDetails.totalMaxScore}</span>
            </div>
            <div className="w-full bg-black/10 rounded-full h-6 relative mb-6 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-6 rounded-full transition-all duration-1000 ease-out" style={{ width: `${animatedPercentage}%`, backgroundColor: `rgb(var(--accent-color))` }}></div>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white drop-shadow">{percentage.toFixed(1)}%</span>
            </div>
          </div>
          <div className="space-y-4">
              <h4 className="font-semibold text-shadow mb-2 px-2" style={{color: 'var(--text-secondary)'}}>รายละเอียดคะแนน:</h4>
              {scoreDetails.displayItems.filter(item => item.level === 0).length > 0 ? (
                scoreDetails.displayItems.filter(item => item.level === 0).map(mainItem => (
                  <ScoreAccordion
                    key={mainItem.key}
                    mainItem={mainItem}
                    descendants={scoreDetails.displayItems.filter(desc => desc.level > mainItem.level && desc.key.startsWith(mainItem.key + '.'))}
                    isOpen={!!openSections[mainItem.key]}
                    onToggle={() => toggleSection(mainItem.key)}
                  />
                ))
              ) : (
                <p className="text-center py-4 glass-card rounded-2xl" style={{color: 'var(--text-muted)'}}>ยังไม่มีการกำหนดคะแนนสำหรับรายวิชานี้</p>
              )}
            </div>
             {courseConfig && (
                <StudentActivitiesView 
                    activities={activities}
                    courseConfig={courseConfig}
                />
            )}
        </div>

        {/* --- Right Column: Info Panel --- */}
        <div className="lg:col-span-1">
            <div className="glass-card p-6 rounded-2xl sticky top-24 text-shadow">
                <div className="space-y-6">
                    <div>
                        <h3 className="font-bold text-lg border-b pb-2 mb-3" style={{color: `rgb(var(--accent-color))`, borderColor: 'var(--glass-border)'}}>ข้อมูลส่วนตัว</h3>
                        <ul className="space-y-1">
                            <InfoItem icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>} label="ชื่อ-สกุล" value={`${studentData.prefix}${studentData.firstName} ${studentData.lastName}`} />
                            <InfoItem icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z" /></svg>} label="รหัสนักศึกษา" value={studentData.studentId} />
                            <InfoItem icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>} label="เบอร์โทรศัพท์" value={studentData.phoneNumber} />
                        </ul>
                    </div>
                     <div>
                        <h3 className="font-bold text-lg border-b pb-2 mb-3" style={{color: `rgb(var(--accent-color))`, borderColor: 'var(--glass-border)'}}>ข้อมูลการศึกษา</h3>
                        <ul className="space-y-1">
                           <InfoItem icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0l-.07.002z" /></svg>} label="ระดับชั้น" value={studentData.classLevel} />
                           <InfoItem icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18h16.5M2.25 12h17.25m-12.75 6h10.5M2.25 6h13.5m-13.5 12v-6m17.25-6v6m0 6v-6m0-6v6" /></svg>} label="แผนกวิชา" value={studentData.department} />
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg border-b pb-2 mb-3" style={{color: `rgb(var(--accent-color))`, borderColor: 'var(--glass-border)'}}>ข้อมูลรายวิชา</h3>
                        <ul className="space-y-1">
                           <InfoItem icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>} label="รายวิชา" value={studentData.course} />
                           <InfoItem icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18" /></svg>} label="เวลาเรียน" value={`${studentData.registrationDay}, ${studentData.registrationStartTime} - ${studentData.registrationEndTime}`} />
                           <InfoItem icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label="วันที่สมัคร" value={new Date(studentData.timestamp || '').toLocaleString('th-TH')} />
                        </ul>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default StudentDashboardPage;