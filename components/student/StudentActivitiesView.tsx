import React, { useState, useMemo } from 'react';
import { Activity, ActivityStatus, CourseConfig } from '../../types';

interface StudentActivitiesViewProps {
    activities: Activity[];
    courseConfig: CourseConfig;
}

const StudentActivitiesView: React.FC<StudentActivitiesViewProps> = ({ activities, courseConfig }) => {
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

    const toggleSection = (key: string) => {
        setOpenSections(prev => ({...prev, [key]: !prev[key]}));
    };

    const groupedActivities = useMemo(() => {
        const groups: Record<string, { label: string, activities: Activity[] }> = {};
        courseConfig.gradingConfigOrder.forEach(key => {
            const component = courseConfig.gradingConfig[key];
            if (component) {
                groups[key] = { label: component.label, activities: [] };
            }
        });

        activities.forEach(activity => {
            const topLevelKey = activity.gradingComponentKey.split('.')[0];
            if (groups[topLevelKey]) {
                groups[topLevelKey].activities.push(activity);
            }
        });

        return Object.entries(groups).filter(([key, group]) => group.activities.length > 0);
    }, [activities, courseConfig]);
    
    const getStatusBadgeColor = (status: ActivityStatus) => {
      switch(status) {
          case ActivityStatus.COMPLETED: return 'bg-green-500/20 text-green-300';
          case ActivityStatus.IN_PROGRESS: return 'bg-blue-500/20 text-blue-300';
          case ActivityStatus.NOT_STARTED:
          default:
              return 'bg-slate-500/20 text-slate-300';
      }
    };

    if (activities.length === 0) {
        return null; // Don't render anything if there are no activities
    }

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-shadow px-2" style={{color: 'var(--text-primary)'}}>
                งานและกิจกรรม
            </h3>
            {groupedActivities.map(([key, group]) => (
                <div key={key} className="glass-card rounded-2xl overflow-hidden">
                    <button 
                        onClick={() => toggleSection(key)}
                        className="flex justify-between items-center w-full p-4 hover:bg-black/10"
                        aria-expanded={!!openSections[key]}
                    >
                        <h4 className="font-bold text-shadow" style={{color: 'var(--text-primary)'}}>{group.label}</h4>
                        <div className="flex items-center space-x-2">
                             <span className="text-sm font-semibold py-1 px-2.5 rounded-full" style={{backgroundColor: 'rgba(var(--accent-color), 0.2)', color: 'rgba(var(--accent-color), 1)'}}>{group.activities.length}</span>
                             <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className={`h-5 w-5 transition-transform duration-300 ${openSections[key] ? 'rotate-180' : ''}`}
                                style={{color: 'var(--text-muted)'}}
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden="true"
                            >
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </button>
                    {openSections[key] && (
                        <div className="px-4 pb-4 space-y-4">
                            {group.activities.map(activity => (
                                <div key={activity.id} className="p-4 rounded-lg" style={{backgroundColor: 'rgba(0,0,0,0.1)'}}>
                                    <div className="flex justify-between items-start gap-2">
                                        <h5 className="font-semibold" style={{color: 'var(--text-primary)'}}>{activity.title}</h5>
                                        <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${getStatusBadgeColor(activity.status)}`}>
                                            {activity.status}
                                        </span>
                                    </div>
                                    {activity.dueDate && (
                                        <p className="text-xs mt-1" style={{color: 'var(--text-muted)'}}>
                                            กำหนดส่ง: {new Date(activity.dueDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    )}
                                    <p className="text-sm mt-2" style={{color: 'var(--text-secondary)'}}>
                                        {activity.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default StudentActivitiesView;
