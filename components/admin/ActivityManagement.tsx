import React, { useState } from 'react';
import WeeklyActivities from './WeeklyActivities';
import TournamentGenerator from './TournamentGenerator';
import RecreationLeaders from './RecreationLeaders';
import CreativeContent from './CreativeContent';
import SingingContest from './SingingContest';
import MusicProduction from './MusicProduction';
import { StudentWithId } from '../../types';

interface ActivityManagementProps {
    students: StudentWithId[];
    availableSchedules?: any[];
}

const ActivityManagement: React.FC<ActivityManagementProps> = ({ students, availableSchedules }) => {
    const [activeTab, setActiveTab] = useState('weekly');

    const tabs = [
        { id: 'weekly', label: 'กิจกรรมรายสัปดาห์' },
        { id: 'tournament', label: 'ทัวร์นาเมนต์ (ROV)' },
        { id: 'recreation', label: 'ผู้นำนันทนาการ' },
        { id: 'creative', label: 'คอนเทนต์สร้างสรรค์' },
        { id: 'singing', label: 'สอบร้องเพลง' },
        { id: 'music', label: 'Music Production' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-shadow" style={{color: 'var(--text-primary)'}}>จัดการกิจกรรม (Activity Management)</h2>
            </div>
            
            {/* Tabs */}
            <div className="flex space-x-2 overflow-x-auto pb-2 custom-scrollbar border-b" style={{borderColor: 'var(--glass-border)'}}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                            activeTab === tab.id 
                                ? 'bg-accent text-white shadow-md' 
                                : 'bg-white/10 text-gray-600 hover:bg-white/20'
                        }`}
                        style={activeTab === tab.id ? { backgroundColor: 'rgb(var(--accent-color))' } : {}}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="mt-4">
                {activeTab === 'weekly' && <WeeklyActivities />}
                {activeTab === 'tournament' && <TournamentGenerator allStudents={students} availableSchedules={availableSchedules} />}
                {activeTab === 'recreation' && <RecreationLeaders allStudents={students} availableSchedules={availableSchedules} />}
                {activeTab === 'creative' && <CreativeContent allStudents={students} availableSchedules={availableSchedules} />}
                {activeTab === 'singing' && <SingingContest allStudents={students} availableSchedules={availableSchedules} />}
                {activeTab === 'music' && <MusicProduction allStudents={students} availableSchedules={availableSchedules} />}
            </div>
        </div>
    );
};

export default ActivityManagement;
