import React, { useState } from 'react';
import PortfolioManagement from './PortfolioManagement';
import VideoManagement from './VideoManagement';

const MediaAndPortfolioManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState('portfolio');

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-shadow" style={{color: 'var(--text-primary)'}}>จัดการผลงานและสื่อ (Portfolio & Media)</h2>
            </div>
            
            <div className="flex space-x-2 pb-2 border-b" style={{borderColor: 'var(--glass-border)'}}>
                <button
                    onClick={() => setActiveTab('portfolio')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === 'portfolio' 
                            ? 'bg-accent text-white shadow-md' 
                            : 'bg-white/10 text-gray-600 hover:bg-white/20'
                    }`}
                    style={activeTab === 'portfolio' ? { backgroundColor: 'rgb(var(--accent-color))' } : {}}
                >
                    ผลงาน (Portfolio)
                </button>
                <button
                    onClick={() => setActiveTab('videos')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeTab === 'videos' 
                            ? 'bg-accent text-white shadow-md' 
                            : 'bg-white/10 text-gray-600 hover:bg-white/20'
                    }`}
                    style={activeTab === 'videos' ? { backgroundColor: 'rgb(var(--accent-color))' } : {}}
                >
                    วิดีโอ (Videos)
                </button>
            </div>

            <div className="mt-4">
                {activeTab === 'portfolio' && <PortfolioManagement />}
                {activeTab === 'videos' && <VideoManagement />}
            </div>
        </div>
    );
};

export default MediaAndPortfolioManagement;
