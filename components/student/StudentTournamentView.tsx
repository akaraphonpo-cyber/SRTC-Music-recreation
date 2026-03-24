
import React, { useState, useMemo } from 'react';
import { TournamentWithId, StudentWithId, Team, Match } from '../../types';
import { useNotification } from '../../contexts/NotificationContext';
import Modal from '../common/Modal';

interface StudentTournamentViewProps {
    studentId: string;
    tournaments: TournamentWithId[];
    onRefresh: () => Promise<void>;
}

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
    const iconStyle = { textShadow: '0 1px 2px rgba(0,0,0,0.3)' };
    if (rank === 1) return <span style={{ color: `rgb(var(--color-gold-rgb))`, ...iconStyle }}>🥇 {rank}</span>;
    if (rank === 2) return <span style={{ color: `rgb(var(--color-silver-rgb))`, ...iconStyle }}>🥈 {rank}</span>;
    if (rank === 3) return <span style={{ color: `rgb(var(--color-bronze-rgb))`, ...iconStyle }}>🥉 {rank}</span>;
    return <span style={{color: 'var(--text-secondary)'}}>{rank}</span>;
};

const StatDisplay: React.FC<{ label: string; value: string | number; colorClass?: string; isPrimary?: boolean; }> = ({ label, value, colorClass = 'text-primary', isPrimary = false }) => (
    <div className="glass-card text-center p-2 rounded-lg flex-1 min-w-[60px]">
        <div className={`text-xs uppercase ${isPrimary ? 'font-semibold' : ''}`} style={{color: 'var(--text-secondary)'}}>{label}</div>
        <div className={`font-bold ${isPrimary ? 'text-2xl' : 'text-xl'} ${colorClass}`}>{value}</div>
    </div>
);


const StudentTournamentView: React.FC<StudentTournamentViewProps> = ({ studentId, tournaments, onRefresh }) => {
    const [expandedTournamentId, setExpandedTournamentId] = useState<string | null>(tournaments.length > 0 ? tournaments[0].id : null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Share Modal State
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareMessage, setShareMessage] = useState('');

    const notification = useNotification();

    const toggleTournament = (id: string) => {
        setExpandedTournamentId(prev => (prev === id ? null : id));
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await onRefresh();
        setIsRefreshing(false);
        notification.addToast({ type: 'success', title: 'อัปเดตข้อมูลแล้ว', message: 'ผลการแข่งขันและคะแนนเป็นปัจจุบัน' });
    };
    
    const handleShareClick = (tournamentName: string, teamName: string, rank: number, points: number) => {
        const appUrl = window.location.href.split('#')[0];
        const message = `🏆 *ผลการแข่งขัน: ${tournamentName}*\n\nทีม: ${teamName}\n📌 อันดับที่: ${rank}\n⭐ คะแนน: ${points}\n\nดูผลการแข่งขันทั้งหมดได้ที่: ${appUrl}#/student-portal`;
        setShareMessage(message);
        setIsShareModalOpen(true);
    };

    const handleCopyShare = () => {
        navigator.clipboard.writeText(shareMessage).then(() => {
            notification.addToast({ type: 'success', title: 'คัดลอกแล้ว', message: 'นำไปวางใน LINE PC ได้เลย' });
        });
    };

    const handleConfirmShare = () => {
        const encodedMessage = encodeURIComponent(shareMessage);
        // Use modern share URL
        window.open(`https://line.me/R/share?text=${encodedMessage}`, '_blank');
        setIsShareModalOpen(false);
    };
    
    if (tournaments.length === 0) {
        return (
            <div className="text-center py-12 glass-card rounded-2xl animate-fade-in">
                <p className="text-lg font-semibold" style={{ color: 'var(--text-secondary)' }}>คุณยังไม่ได้เข้าร่วมทัวร์นาเมนต์ใดๆ</p>
                <p style={{ color: 'var(--text-muted)' }}>No tournaments found for you at this time.</p>
            </div>
        );
    }
    
    const getMatchResult = (match: Match, myTeamId: number): { text: string; color: string } => {
        if (typeof match.winnerId === 'undefined') return { text: 'ยังไม่แข่ง', color: 'text-slate-400' };
        if (match.winnerId === null) return { text: 'เสมอ', color: 'text-amber-400' };
        if (match.winnerId === myTeamId) return { text: 'ชนะ', color: 'text-green-400' };
        return { text: 'แพ้', color: 'text-red-400' };
    };


    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-shadow px-2" style={{ color: 'var(--text-primary)' }}>รายการแข่งขัน</h3>
                <button 
                    onClick={handleRefresh} 
                    disabled={isRefreshing}
                    className="flex items-center px-3 py-1.5 text-xs font-medium rounded-lg transition-all bg-white/10 hover:bg-white/20 text-accent disabled:opacity-50"
                    style={{color: 'rgb(var(--accent-color))'}}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {isRefreshing ? 'กำลังโหลด...' : 'อัปเดตผลล่าสุด'}
                </button>
            </div>

            {tournaments.map(tournament => {
                const myTeam = tournament.teams.find(team => team.members.some(member => member.studentId === studentId));
                if (!myTeam) return null;

                const myMatches = tournament.schedule.filter(match => 
                    match.team1.id === myTeam.id || (match.team2 as Team).id === myTeam.id
                );

                const rankingData = useMemo(() => {
                    const stats = new Map<number, { team: Team, played: number, wins: number, ties: number, losses: number, points: number }>();
                    tournament.teams.forEach(team => {
                        stats.set(team.id, { team, played: 0, wins: 0, ties: 0, losses: 0, points: 0 });
                    });

                    const pointsForWin = tournament.pointsForWin ?? 3;
                    const pointsForTie = tournament.pointsForTie ?? 1;
                    const pointsForLoss = tournament.pointsForLoss ?? 0;

                    tournament.schedule.forEach(match => {
                        const isByeMatch = !('members' in match.team2);
                        if (typeof match.winnerId === 'undefined' || isByeMatch) {
                            return;
                        }

                        const team1Stats = stats.get(match.team1.id);
                        const team2Stats = stats.get((match.team2 as Team).id);

                        if (!team1Stats || !team2Stats) return;

                        team1Stats.played++;
                        team2Stats.played++;

                        if (match.winnerId === null) { // Tie
                            team1Stats.ties++;
                            team2Stats.ties++;
                            team1Stats.points += pointsForTie;
                            team2Stats.points += pointsForTie;
                        } else if (match.winnerId === match.team1.id) { // Team 1 wins
                            team1Stats.wins++;
                            team2Stats.losses++;
                            team1Stats.points += pointsForWin;
                            team2Stats.points += pointsForLoss;
                        } else { // Team 2 wins
                            team2Stats.wins++;
                            team1Stats.losses++;
                            team2Stats.points += pointsForWin;
                            team1Stats.points += pointsForLoss;
                        }
                    });

                    return Array.from(stats.values()).sort((a, b) => b.points - a.points);
                }, [tournament]);

                const myRankData = rankingData.find(r => r.team.id === myTeam.id);
                const myRank = myRankData ? rankingData.indexOf(myRankData) + 1 : null;
                
                const isExpanded = expandedTournamentId === tournament.id;

                return (
                    <div key={tournament.id} className="glass-card rounded-2xl overflow-hidden transition-all duration-300">
                        <button
                            onClick={() => toggleTournament(tournament.id)}
                            className="flex justify-between items-center w-full p-4 hover:bg-black/10"
                            aria-expanded={isExpanded}
                        >
                            <div>
                                <h3 className="font-bold text-lg text-left" style={{ color: 'var(--text-primary)' }}>{tournament.name}</h3>
                                <p className="text-sm text-left" style={{ color: 'var(--text-secondary)' }}>ทีมของคุณ: <span className="font-semibold" style={{color: 'rgb(var(--accent-color))'}}>{myTeam.name}</span></p>
                            </div>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className={`h-6 w-6 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                style={{ color: 'var(--text-muted)' }}
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                        
                        {isExpanded && (
                            <div className="px-4 pb-4 space-y-4">
                                {myRankData && myRank && (
                                    <div className="mt-2 mb-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-semibold" style={{color: 'var(--text-primary)'}}>ผลงานของทีม:</h4>
                                            <button 
                                                onClick={() => handleShareClick(tournament.name, myTeam.name, myRank, myRankData.points)}
                                                className="flex items-center text-xs font-bold px-2 py-1 rounded-full bg-[#06C755] text-white shadow-sm opacity-90 hover:opacity-100 transition-transform hover:scale-105"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 mr-1">
                                                    <path d="M21.445 11.52c0-5.28-5.065-9.6-10.96-9.6-5.895 0-10.96 4.32-10.96 9.6 0 4.715 4.03 8.67 9.365 9.45a.577.577 0 00.3.075c.175 0 .345-.07.455-.205l1.315-1.66a.293.293 0 01.285-.105.288.288 0 01.23.15c.91 1.75 2.27 1.71 2.315 1.71.165 0 .32-.085.405-.225.085-.14.085-.315 0-.455-.34-.59-.51-1.16-.525-1.71-.005-.215.085-.42.24-.56 3.89-3.51 2.61-6.47 6.975-6.47z" />
                                                </svg>
                                                อวดผล
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-center">
                                            <div className="glass-card text-center p-2 rounded-lg flex-1 min-w-[60px]">
                                                <div className="text-xs uppercase font-semibold" style={{color: 'var(--text-secondary)'}}>อันดับ</div>
                                                <div className="font-bold text-2xl"><RankBadge rank={myRank} /></div>
                                            </div>
                                            <StatDisplay label="คะแนน" value={myRankData.points} colorClass="text-accent" isPrimary />
                                            <StatDisplay label="ชนะ" value={myRankData.wins} colorClass="text-green-400" />
                                            <StatDisplay label="เสมอ" value={myRankData.ties} colorClass="text-amber-400" />
                                            <StatDisplay label="แพ้" value={myRankData.losses} colorClass="text-red-400" />
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-semibold mb-2" style={{color: 'var(--text-primary)'}}>เพื่อนร่วมทีม:</h4>
                                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm list-disc list-inside" style={{ color: 'var(--text-secondary)' }}>
                                        {myTeam.members.map(member => (
                                            <li key={member.id} className="truncate" title={`${member.prefix}${member.firstName} ${member.lastName}`}>
                                                {member.prefix}{member.firstName} {member.lastName}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2" style={{color: 'var(--text-primary)'}}>ตารางการแข่งขัน:</h4>
                                    <div className="space-y-2">
                                        {myMatches.length > 0 ? myMatches.map(match => {
                                            const opponent = match.team1.id === myTeam.id ? match.team2 : match.team1;
                                            const result = getMatchResult(match, myTeam.id);
                                            const myScore = match.team1.id === myTeam.id ? match.team1Score : match.team2Score;
                                            const opponentScore = match.team1.id === myTeam.id ? match.team2Score : match.team1Score;
                                            
                                            return (
                                                <div key={`${match.round}-${opponent.id}`} className="flex justify-between items-center p-2 rounded-lg" style={{backgroundColor: 'rgba(0,0,0,0.1)'}}>
                                                    <div>
                                                        <p className="font-medium" style={{color: 'var(--text-secondary)'}}>รอบที่ {match.round}: <span style={{color: 'var(--text-primary)'}}>แข่งกับ {opponent.name}</span></p>
                                                        <p className={`text-xs font-bold ${result.color}`}>{result.text}</p>
                                                    </div>
                                                    <div className="font-mono text-sm" style={{color: 'var(--text-primary)'}}>
                                                        {typeof myScore !== 'undefined' ? `${myScore} - ${opponentScore}` : '-'}
                                                    </div>
                                                </div>
                                            );
                                        }) : <p className="text-sm text-center" style={{color: 'var(--text-muted)'}}>ไม่มีการแข่งขันสำหรับทีมนี้</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Share Preview Modal */}
            <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="แชร์ผลการแข่งขัน" size="md">
                <div className="space-y-4">
                    <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                        คุณสามารถแก้ไขข้อความด้านล่างก่อนที่จะแชร์ได้
                    </p>
                    <textarea 
                        value={shareMessage} 
                        onChange={(e) => setShareMessage(e.target.value)} 
                        rows={6}
                        className="w-full p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 border transition-all"
                        style={{
                            color: 'var(--text-primary)', 
                            backgroundColor: 'var(--input-bg)', 
                            borderColor: 'var(--input-border)'
                        }}
                    />
                    <div className="flex justify-end space-x-3 pt-2">
                        <button 
                            onClick={handleCopyShare} 
                            className="px-4 py-2 text-sm font-medium rounded-lg shadow-sm bg-gray-200 text-gray-700 hover:bg-gray-300" 
                        >
                            คัดลอก (Copy)
                        </button>
                        <button 
                            onClick={handleConfirmShare} 
                            className="flex items-center px-6 py-2 text-sm font-bold rounded-lg text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105 bg-[#06C755]"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
                                <path d="M21.445 11.52c0-5.28-5.065-9.6-10.96-9.6-5.895 0-10.96 4.32-10.96 9.6 0 4.715 4.03 8.67 9.365 9.45a.577.577 0 00.3.075c.175 0 .345-.07.455-.205l1.315-1.66a.293.293 0 01.285-.105.288.288 0 01.23.15c.91 1.75 2.27 1.71 2.315 1.71.165 0 .32-.085.405-.225.085-.14.085-.315 0-.455-.34-.59-.51-1.16-.525-1.71-.005-.215.085-.42.24-.56 3.89-3.51 2.61-6.47 6.975-6.47z" />
                            </svg>
                            ยืนยันการแชร์
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default StudentTournamentView;
