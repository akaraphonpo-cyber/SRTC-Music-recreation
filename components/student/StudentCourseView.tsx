
import React, { useMemo } from 'react';
import { StudentScores, CourseConfig, GradingConfig, Activity, Course } from '../../types';
import { calculateTotal, calculateGrade, flattenGradingConfig, FlatGradingItem } from '../../utils/grades';
import StudentActivitiesView from './StudentActivitiesView';

interface StudentCourseViewProps {
    courseData: {
        scores: StudentScores | null;
        config: CourseConfig | null;
    };
    courseName: Course;
}

const ScoreBreakdownRow: React.FC<{ item: FlatGradingItem; score?: number }> = ({ item, score }) => {
    const indentStyle = { paddingLeft: `${item.level * 1.5}rem` };
    
    if (item.isHeader) {
        return (
            <div className={`flex justify-between items-center py-2 font-semibold ${item.level > 0 ? '' : 'mt-3 border-t pt-3'}`} style={{ ...indentStyle, borderColor: 'var(--glass-border)'}}>
                <span style={{color: 'var(--text-primary)'}}>{item.label}</span>
            </div>
        );
    }
    
    return (
        <div className="flex justify-between items-center py-2" style={indentStyle}>
            <span style={{color: 'var(--text-secondary)'}}>{item.label}</span>
            <span style={{color: 'var(--text-primary)'}}>{typeof score === 'number' ? score : '-'} / {item.max}</span>
        </div>
    );
};


const StudentCourseView: React.FC<StudentCourseViewProps> = ({ courseData, courseName }) => {
    const { scores, config } = courseData;

    const totalScore = useMemo(() => calculateTotal(scores?.scores, config), [scores, config]);
    const grade = useMemo(() => calculateGrade(totalScore), [totalScore]);
    
    const totalMaxScore = useMemo(() => {
        if (!config?.gradingConfig || !config?.gradingConfigOrder) return 100;
        return config.gradingConfigOrder.reduce((sum, key) => sum + (Number(config.gradingConfig[key]?.max) || 0), 0);
    }, [config]);

    const flattenedScoreItems = useMemo((): (FlatGradingItem & { score?: number })[] => {
        if (!config?.gradingConfig || !config.gradingConfigOrder) return [];
        const items = flattenGradingConfig(config.gradingConfig, config.gradingConfigOrder);
        const studentScores = scores?.scores || {};
        
        return items.map(item => ({
            ...item,
            score: studentScores[item.key]
        }));
    }, [config, scores]);

    const activities = useMemo((): Activity[] => {
        if (!config || !config.activities) return [];
        return Object.values(config.activities);
    }, [config]);

    if (!config) {
        return <div className="text-center p-8" style={{color: 'var(--text-muted)'}}>ไม่พบข้อมูลการตั้งค่าคะแนนสำหรับวิชานี้</div>;
    }

    return (
        <div className="space-y-8 animate-fade-in">
             <h3 className="text-2xl font-bold text-shadow px-2" style={{ color: 'var(--text-primary)' }}>
                ผลการเรียน: {courseName}
            </h3>
            <div className="glass-card p-6 rounded-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-center">
                    <div>
                        <h4 className="text-sm font-semibold" style={{color: 'var(--text-secondary)'}}>คะแนนรวม</h4>
                        <p className="text-4xl font-bold my-1" style={{color: 'rgb(var(--accent-color))'}}>{totalScore.toFixed(0)} / {totalMaxScore}</p>
                    </div>
                     <div>
                        <h4 className="text-sm font-semibold" style={{color: 'var(--text-secondary)'}}>เกรด</h4>
                        <p className="text-4xl font-bold my-1" style={{color: 'rgb(var(--text-success-rgb))'}}>{grade.toFixed(1)}</p>
                    </div>
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <h4 className="text-xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>รายละเอียดคะแนน</h4>
                 <div className="divide-y" style={{borderColor: 'var(--glass-border)'}}>
                    {flattenedScoreItems.map(item => <ScoreBreakdownRow key={item.key} item={item} score={item.score} />)}
                </div>
            </div>

            <StudentActivitiesView
                activities={activities}
                courseConfig={config}
            />
        </div>
    );
};

export default StudentCourseView;
