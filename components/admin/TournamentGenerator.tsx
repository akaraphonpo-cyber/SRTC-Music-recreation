
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { StudentWithId, Course, Department, ClassLevel, RegistrationDay, Team, Match, Tournament, TournamentWithId, TournamentStatus, StudentScores, CourseConfig } from '../../types';
import { useNotification } from '../../contexts/NotificationContext';
import { getTournaments, addTournament, deleteTournament, updateTournament, getCourseGradingConfig, getScoresForCourse, setStudentScores, getSystemConfig } from '../../services/googleSheetService';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import { produce } from 'immer';
import { flattenGradingConfig } from '../../utils/grades';
import { getCustomGroupOptions, filterStudentsByGroupKey } from '../../utils/schedule';


// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

interface TournamentManagementProps {
  allStudents: StudentWithId[];
  availableSchedules?: any[];
}

const TournamentManagement: React.FC<TournamentManagementProps> = ({ allStudents, availableSchedules }) => {
  const [tournaments, setTournaments] = useState<TournamentWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState<'create' | 'details'>('create');
  const [selectedTournament, setSelectedTournament] = useState<TournamentWithId | null>(null);
  const [detailsActiveTab, setDetailsActiveTab] = useState<'ranking' | 'scores' | 'teams' | 'gradebook' | 'teamScoring'>('ranking');
  const [systemConfig, setSystemConfig] = useState<any>({});
  
  const notification = useNotification();

  // Create form state
  const [formState, setFormState] = useState({
    name: '',
    course: '' as Course | '',
    groupKey: '',
  });
  
  // State for generated preview data
  const [previewData, setPreviewData] = useState<{ teams: Team[], schedule: Match[], leftovers: StudentWithId[] } | null>(null);
  const [createStep, setCreateStep] = useState(1);
  
  // State for managing scores in details view
  const [editableSchedule, setEditableSchedule] = useState<Match[]>([]);
  const [gradebookConfig, setGradebookConfig] = useState({
    gradingComponentKey: '',
    pointsForWin: 3,
    pointsForTie: 1,
    pointsForLoss: 0
  });

  // State for team scoring tab
  const [teamScoringStudentId, setTeamScoringStudentId] = useState('');
  const [foundTeam, setFoundTeam] = useState<Team | null>(null);
  const [teamScoreValue, setTeamScoreValue] = useState('');
  const [teamScoreComponentKey, setTeamScoreComponentKey] = useState('');


  const [courseGradingConfig, setCourseGradingConfig] = useState<CourseConfig | null>(null);

  // State for editing a team
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);


  const fetchTournaments = useCallback(async () => {
    setIsLoading(true);
    const res = await getTournaments();
    if (res.success && res.data) {
      setTournaments(res.data);
    } else {
      notification.addToast({ type: 'error', title: 'Error', message: 'Could not fetch tournaments.' });
    }
    setIsLoading(false);
  }, [notification]);

  useEffect(() => {
    fetchTournaments();
    const fetchConfig = async () => {
        const res = await getSystemConfig();
        if (res.success && res.data) {
            setSystemConfig(res.data);
        }
    };
    fetchConfig();
  }, [fetchTournaments]);
  
  useEffect(() => {
    if (selectedTournament) {
      // Use structuredClone instead of JSON.stringify to handle deep cloning safely
      // This prevents "Converting circular structure to JSON" errors if data contains non-serializable refs
      try {
          setEditableSchedule(structuredClone(selectedTournament.schedule));
      } catch (e) {
          console.error("Clone error", e);
          // Fallback if structuredClone fails (though unlikely for POJO from firebase)
          setEditableSchedule(selectedTournament.schedule);
      }

      setGradebookConfig({
          gradingComponentKey: selectedTournament.gradingComponentKey || '',
          pointsForWin: selectedTournament.pointsForWin ?? 3,
          pointsForTie: selectedTournament.pointsForTie ?? 1,
          pointsForLoss: selectedTournament.pointsForLoss ?? 0
      });
      // Fetch grading config for the selected tournament's course
      const fetchGradingConfig = async () => {
          const res = await getCourseGradingConfig(selectedTournament.course);
          if(res.success && res.data) {
              setCourseGradingConfig(res.data);
          } else {
              setCourseGradingConfig(null);
          }
      };
      fetchGradingConfig();
    }
  }, [selectedTournament]);

  const filterOptions = useMemo(() => {
    const data = {
      courses: new Set<Course>(),
    };
    allStudents.forEach(s => {
      const studentCourses: Course[] = (s.courses && Array.isArray(s.courses)) ? s.courses : ((s as any).course ? [(s as any).course] : []);
      studentCourses.forEach(c => data.courses.add(c));
    });
    return {
      courses: Array.from(data.courses).sort(),
    };
  }, [allStudents]);

  const customGroupOptions = useMemo(() => {
      return getCustomGroupOptions(allStudents, systemConfig, formState.course, availableSchedules);
  }, [allStudents, systemConfig, formState.course, availableSchedules]);

  const filteredStudentsForCreate = useMemo(() => {
    let filtered = allStudents;
    if (formState.course) {
        filtered = filtered.filter(s => {
            const studentCourses: Course[] = (s.courses && Array.isArray(s.courses)) ? s.courses : ((s as any).course ? [(s as any).course] : []);
            return studentCourses.includes(formState.course as Course);
        });
    }
    
    if (formState.groupKey) {
        filtered = filterStudentsByGroupKey(filtered, formState.groupKey, formState.course, availableSchedules);
    }
    
    return filtered;
  }, [allStudents, formState.course, formState.groupKey, availableSchedules]);


  const resetCreateForm = () => {
    setFormState({ name: '', course: '', groupKey: '' });
    setCreateStep(1);
    setPreviewData(null);
  };
  
  const handleOpenCreateModal = () => {
      resetCreateForm();
      setModalView('create');
      setIsModalOpen(true);
  };
  
  const handleOpenDetailsModal = (tournament: TournamentWithId) => {
      setSelectedTournament(tournament);
      setDetailsActiveTab('ranking'); // Reset tab to ranking on open
      setModalView('details');
      setIsModalOpen(true);
      // Reset team scoring states
      setTeamScoringStudentId('');
      setFoundTeam(null);
      setTeamScoreValue('');
      setTeamScoreComponentKey('');
  };
  
  const closeModal = () => {
      setIsModalOpen(false);
      setSelectedTournament(null);
      setCourseGradingConfig(null);
  };
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormState(prev => ({...prev, [name]: value}));
  };
  
  const handleGeneratePreview = () => {
      if (filteredStudentsForCreate.length < 5) {
          notification.addToast({ type: 'warning', title: 'จำนวนนักศึกษาไม่เพียงพอ', message: 'ต้องมีนักศึกษาอย่างน้อย 5 คนเพื่อสร้างอย่างน้อย 1 ทีม' });
          return;
      }
      // FIX: Add explicit type annotation to `shuffled` to prevent incorrect type inference down the chain.
      const shuffled: StudentWithId[] = shuffleArray(filteredStudentsForCreate);
      const numTeams = Math.floor(shuffled.length / 5);

      if (numTeams === 0) {
          notification.addToast({ type: 'warning', title: 'จำนวนนักศึกษาไม่เพียงพอ', message: 'ไม่สามารถสร้างทีมได้' });
          return;
      }

      const newTeams: Team[] = Array.from({ length: numTeams }, (_, i): Team => ({
          id: i + 1,
          name: `ทีม ${i + 1}`,
          members: shuffled.slice(i * 5, (i * 5) + 5),
      }));

      let leftovers: StudentWithId[] = shuffled.slice(numTeams * 5);
      
      // Assign leftovers as substitutes
      if (newTeams.length > 0) {
        leftovers.forEach((student: StudentWithId, index) => {
            const teamIndex = index % newTeams.length;
            newTeams[teamIndex].members.push(student);
        });
        leftovers = []; // Clear the leftovers array after assignment
      }
      
      const newSchedule = newTeams.length < 2 ? [] : (() => {
          let schedule: Match[] = [];
          let localTeams: (Team | { id: -1; name: 'BYE' })[] = [...newTeams];
          if (localTeams.length % 2 !== 0) localTeams.push({ id: -1, name: 'BYE' });
          const numRounds = localTeams.length - 1;
          const numTeamsInSchedule = localTeams.length;
          
          for (let round = 0; round < numRounds; round++) {
              for (let i = 0; i < numTeamsInSchedule / 2; i++) {
                  const team1 = localTeams[i];
                  const team2 = localTeams[numTeamsInSchedule - 1 - i];
                  schedule.push({ round: round + 1, team1: team1 as Team, team2: team2 });
              }
              // Correctly rotate teams for the next round (fix one, rotate rest)
              const lastTeam = localTeams.pop();
              if (lastTeam) {
                localTeams.splice(1, 0, lastTeam);
              }
          }
          return schedule;
      })();
      
      setPreviewData({ teams: newTeams, schedule: newSchedule, leftovers: leftovers });
      setCreateStep(2);
  };
  
  const handleSaveTournament = async () => {
    if (!previewData || !formState.name.trim()) {
        notification.addToast({ type: 'warning', title: 'ข้อมูลไม่ครบถ้วน', message: 'กรุณาตั้งชื่อทัวร์นาเมนต์' });
        return;
    }
    const newTournament: Omit<Tournament, 'createdAt'> = {
        name: formState.name.trim(),
        course: formState.course as Course,
        departments: [], // deprecated
        classLevel: '' as ClassLevel, // deprecated
        registrationDay: '' as RegistrationDay, // deprecated
        timeSlot: '', // deprecated
        status: TournamentStatus.PENDING,
        teams: previewData.teams,
        schedule: previewData.schedule,
        leftoverStudents: previewData.leftovers,
        scoresPosted: false,
    };
    const res = await addTournament(newTournament);
    if (res.success) {
        notification.addToast({ type: 'success', title: 'สำเร็จ', message: 'สร้างทัวร์นาเมนต์เรียบร้อยแล้ว' });
        closeModal();
        fetchTournaments();
    } else {
        notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: res.message });
    }
  };

  const handleDeleteTournament = (tournament: TournamentWithId) => {
    notification.showConfirmation({
        title: 'ยืนยันการลบ?',
        message: `คุณต้องการลบทัวร์นาเมนต์ "${tournament.name}" ใช่หรือไม่?`,
        onConfirm: async () => {
            const res = await deleteTournament(tournament.id);
            if(res.success) {
                notification.addToast({ type: 'success', title: 'ลบสำเร็จ' });
                fetchTournaments();
            } else {
                notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: res.message });
            }
        }
    });
  };
  
  const handleScoreChange = (round: number, team1Id: number, teamKey: 'team1Score' | 'team2Score', value: string) => {
    setEditableSchedule(produce(draft => {
        const match = draft.find(m => m.round === round && m.team1.id === team1Id);
        if (match) {
            const score = value === '' ? undefined : parseInt(value, 10);
            // FIX: Delete the property if score is invalid/empty to avoid undefined value in state
            if (score === undefined || isNaN(score)) {
                delete match[teamKey];
            } else {
                match[teamKey] = score;
            }
        }
    }));
  };
  
  const handleSaveScores = async () => {
    if (!selectedTournament) return;
    
    // Determine winner for each match and ensure no `undefined` values are sent
    const finalSchedule = editableSchedule.map(match => {
        const newMatchData = { ...match }; // Create a mutable copy
        
        const { team1Score, team2Score } = newMatchData;
        
        // Only set winnerId if both scores are present
        if (typeof team1Score === 'number' && typeof team2Score === 'number') {
            if (team1Score > team2Score) {
                newMatchData.winnerId = newMatchData.team1.id;
            } else if (team2Score > team1Score) {
                 if (newMatchData.team2.name !== 'BYE') {
                   newMatchData.winnerId = (newMatchData.team2 as Team).id;
                }
            } else {
                newMatchData.winnerId = null; // A tie
            }
        } else {
            // If scores are incomplete, remove the winnerId key
            delete (newMatchData as any).winnerId;
        }
        return newMatchData;
    });
    
    // Sanitize payload to remove any 'undefined' values which Firestore rejects
    const sanitizedSchedule = JSON.parse(JSON.stringify(finalSchedule));

    const res = await updateTournament(selectedTournament.id, { schedule: sanitizedSchedule });
    if(res.success) {
        notification.addToast({ type: 'success', title: 'บันทึกคะแนนสำเร็จ' });

        const updatedTournament = produce(selectedTournament, draft => {
            draft.schedule = sanitizedSchedule;
        });

        // Optimistically update both the selected tournament for the modal...
        setSelectedTournament(updatedTournament);
        
        // ...and the tournament in the main list to prevent race conditions.
        setTournaments(prevTournaments => 
            prevTournaments.map(t => t.id === selectedTournament.id ? updatedTournament : t)
        );
    } else {
        notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: res.message });
    }
  };

    const handlePostToGradebook = async () => {
    if (!selectedTournament || !gradebookConfig.gradingComponentKey) {
        notification.addToast({ type: 'warning', title: 'ข้อมูลไม่ครบถ้วน', message: 'กรุณาเลือกหัวข้อคะแนน' });
        return;
    }
    if (selectedTournament.scoresPosted) {
        notification.addToast({ type: 'warning', title: 'คะแนนถูกส่งแล้ว', message: 'คะแนนของทัวร์นาเมนต์นี้ได้ถูกส่งเข้าระบบแล้ว' });
        return;
    }

    notification.showLoading('กำลังส่งคะแนนเข้าระบบ...');

    try {
        const studentIds = selectedTournament.teams.flatMap(t => t.members.map(m => m.studentId));
        const scoresRes = await getScoresForCourse(selectedTournament.course);
        if (!scoresRes.success) throw new Error('Could not fetch existing scores.');

        const existingScores = scoresRes.data || {};
        const studentStats: Record<string, { wins: number, ties: number, losses: number }> = {};
        studentIds.forEach(id => { studentStats[id] = { wins: 0, ties: 0, losses: 0 } });

        selectedTournament.schedule.forEach(match => {
            if (match.team2.name === 'BYE' || typeof match.winnerId === 'undefined') return;
            const winner = match.winnerId;
            if (winner === null) { // Tie
                match.team1.members.forEach(m => studentStats[m.studentId].ties++);
                (match.team2 as Team).members.forEach(m => studentStats[m.studentId].ties++);
            } else if (winner === match.team1.id) {
                match.team1.members.forEach(m => studentStats[m.studentId].wins++);
                (match.team2 as Team).members.forEach(m => studentStats[m.studentId].losses++);
            } else {
                (match.team2 as Team).members.forEach(m => studentStats[m.studentId].wins++);
                match.team1.members.forEach(m => studentStats[m.studentId].losses++);
            }
        });

        const scoresToUpdate: StudentScores[] = studentIds.map(studentId => {
            const currentStudentScores = existingScores[studentId]?.scores || {};
            const stats = studentStats[studentId];
            const tournamentPoints = (stats.wins * gradebookConfig.pointsForWin) + (stats.ties * gradebookConfig.pointsForTie) + (stats.losses * gradebookConfig.pointsForLoss);
            
            return {
                studentId,
                course: selectedTournament.course,
                scores: {
                    ...currentStudentScores,
                    [gradebookConfig.gradingComponentKey]: tournamentPoints
                }
            };
        });

        const setScoresRes = await setStudentScores(scoresToUpdate);
        if (!setScoresRes.success) throw new Error(setScoresRes.message || 'Failed to update scores.');
        
        await updateTournament(selectedTournament.id, {
            ...gradebookConfig,
            scoresPosted: true
        });
        
        notification.addToast({type: 'success', title: 'สำเร็จ', message: 'ส่งคะแนนเข้าระบบเรียบร้อยแล้ว'});
        closeModal();
        fetchTournaments();

    } catch (err: any) {
        notification.addToast({type: 'error', title: 'เกิดข้อผิดพลาด', message: err.message});
    } finally {
        notification.hideLoading();
    }
  };

  const handleFindTeam = () => {
    if (!selectedTournament || !teamScoringStudentId.trim()) {
        setFoundTeam(null);
        return;
    }
    for (const team of selectedTournament.teams) {
        if (team.members.some(m => m.studentId === teamScoringStudentId.trim())) {
            setFoundTeam(team);
            return;
        }
    }
    notification.addToast({type: 'warning', title: 'ไม่พบทีม', message: `ไม่พบนักศึกษา ID ${teamScoringStudentId} ในทัวร์นาเมนต์นี้`});
    setFoundTeam(null);
  };
  
  const handleGiveTeamScore = async () => {
      if (!foundTeam || !teamScoreComponentKey || !teamScoreValue.trim() || !selectedTournament) {
          notification.addToast({type: 'warning', title: 'ข้อมูลไม่ครบถ้วน', message: 'กรุณากรอกข้อมูลให้ครบเพื่อให้คะแนน'});
          return;
      }
      
      const scoreNumber = parseFloat(teamScoreValue);
      if (isNaN(scoreNumber)) {
          notification.addToast({type: 'error', title: 'คะแนนไม่ถูกต้อง', message: 'กรุณากรอกคะแนนเป็นตัวเลข'});
          return;
      }

      notification.showLoading('กำลังบันทึกคะแนน...');

      const updates: StudentScores[] = foundTeam.members.map(member => ({
          studentId: member.studentId,
          course: selectedTournament.course,
          scores: {
              [teamScoreComponentKey]: scoreNumber
          }
      }));

      const res = await setStudentScores(updates);
      notification.hideLoading();

      if (res.success) {
          notification.addToast({type: 'success', title: 'ให้คะแนนสำเร็จ!', message: `ให้คะแนนทีม ${foundTeam.name} เรียบร้อยแล้ว`});
          setTeamScoringStudentId('');
          setFoundTeam(null);
          setTeamScoreValue('');
          setTeamScoreComponentKey('');
      } else {
           notification.addToast({type: 'error', title: 'เกิดข้อผิดพลาด', message: res.message});
      }
  };
  
  const flattenedGradingItems = useMemo((): { key: string; label: string; }[] => {
    if (!courseGradingConfig?.gradingConfig || !courseGradingConfig?.gradingConfigOrder) return [];
    return flattenGradingConfig(courseGradingConfig.gradingConfig, courseGradingConfig.gradingConfigOrder);
  }, [courseGradingConfig]);
  
  const getStatusChip = (status: TournamentStatus) => {
      const styles = {
          [TournamentStatus.PENDING]: 'bg-slate-500/20 text-slate-300',
          [TournamentStatus.IN_PROGRESS]: 'bg-blue-500/20 text-blue-300',
          [TournamentStatus.COMPLETED]: 'bg-green-500/20 text-green-300',
      };
      return <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${styles[status]}`}>{status}</span>
  }
  
    const rankingData = useMemo(() => {
    if (!selectedTournament) return [];

    const stats = new Map<number, { team: Team, played: number, wins: number, ties: number, losses: number, points: number }>();
    selectedTournament.teams.forEach(team => {
        stats.set(team.id, { team, played: 0, wins: 0, ties: 0, losses: 0, points: 0 });
    });

    selectedTournament.schedule.forEach(match => {
        // More robust check for BYE team to prevent crashes
        const isByeMatch = !('members' in match.team2);
        if (typeof match.winnerId === 'undefined' || isByeMatch) {
            return; // Match not played yet or it's a bye week
        }

        const team1Stats = stats.get(match.team1.id);
        const team2Stats = stats.get((match.team2 as Team).id);
        
        if (!team1Stats || !team2Stats) return; // Defensive check

        team1Stats.played++;
        team2Stats.played++;

        if (match.winnerId === null) { // Tie
            team1Stats.ties++;
            team2Stats.ties++;
            team1Stats.points += gradebookConfig.pointsForTie;
            team2Stats.points += gradebookConfig.pointsForTie;
        } else if (match.winnerId === match.team1.id) { // Team 1 wins
            team1Stats.wins++;
            team2Stats.losses++;
            team1Stats.points += gradebookConfig.pointsForWin;
            team2Stats.points += gradebookConfig.pointsForLoss;
        } else { // Team 2 wins
            team2Stats.wins++;
            team1Stats.losses++;
            team2Stats.points += gradebookConfig.pointsForWin;
            team1Stats.points += gradebookConfig.pointsForLoss;
        }
    });

    return Array.from(stats.values()).sort((a, b) => b.points - a.points);
  }, [selectedTournament, gradebookConfig]);

  // --- Team Editing Logic ---
  const handleOpenEditTeamModal = (team: Team) => {
    try {
        setEditingTeam(structuredClone(team)); 
    } catch {
        setEditingTeam(JSON.parse(JSON.stringify(team))); // Fallback
    }
    setIsEditTeamModalOpen(true);
  };

  const handleCloseEditTeamModal = () => {
    setIsEditTeamModalOpen(false);
    setEditingTeam(null);
  };

  const availableStudentsForEditing = useMemo(() => {
    if (!selectedTournament) return [];
    const studentIdsInTournament = new Set(
        selectedTournament.teams.flatMap(team => team.members.map(member => member.studentId))
    );
    return allStudents.filter(student => {
        const studentCourses = student.courses || ((student as any).course ? [(student as any).course] : []);
        const isEligible = studentCourses.includes(selectedTournament.course);
        return isEligible && !studentIdsInTournament.has(student.studentId);
    });
  }, [selectedTournament, allStudents]);

  const handleEditTeamName = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (editingTeam) {
          setEditingTeam(produce(editingTeam, draft => {
              draft.name = e.target.value;
          }));
      }
  };

  const handleRemoveMemberFromTeam = (studentId: string) => {
      if (editingTeam) {
          setEditingTeam(produce(editingTeam, draft => {
              draft.members = draft.members.filter(m => m.studentId !== studentId);
          }));
      }
  };

  const handleAddMemberToTeam = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const studentIdToAdd = e.target.value;
    if (!studentIdToAdd || !editingTeam) return;

    const student = allStudents.find(s => s.studentId === studentIdToAdd);
    if (student && !editingTeam.members.some(m => m.studentId === studentIdToAdd)) {
        setEditingTeam(produce(editingTeam, draft => {
            draft.members.push(student);
        }));
    }
    e.target.value = ""; // Reset dropdown
  };

  const handleSaveEditedTeam = async () => {
      if (!selectedTournament || !editingTeam) return;

      const updatedTeams = produce(selectedTournament.teams, draft => {
          const index = draft.findIndex(t => t.id === editingTeam.id);
          if (index !== -1) {
              draft[index] = editingTeam;
          }
      });
      
      // Sanitize teams data to remove undefined values
      const sanitizedTeams = JSON.parse(JSON.stringify(updatedTeams));

      const res = await updateTournament(selectedTournament.id, { teams: sanitizedTeams });
      
      if (res.success) {
          notification.addToast({ type: 'success', title: 'อัปเดตทีมสำเร็จ!' });
          handleCloseEditTeamModal();
          fetchTournaments(); 
          setSelectedTournament(produce(selectedTournament, draft => {
              draft.teams = sanitizedTeams;
          }));
      } else {
          notification.addToast({ type: 'error', title: 'เกิดข้อผิดพลาด', message: res.message });
      }
  };


  const selectClass = "block w-full pl-3 pr-10 py-2.5 text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent sm:text-sm";
  const labelClass = "block text-sm font-medium mb-1 text-shadow";
  const inputClass = "block w-full px-3 py-2.5 text-base rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent sm:text-sm";
  const formStyle = { color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)' };

  const renderCreateModal = () => {
      const isAnyFilterApplied = Object.entries(formState).some(([key, value]) => key !== 'name' && !!value);
      return (
        <div className="space-y-6">
        {createStep === 1 && (
            <div className="animate-fade-in">
            <h3 className="text-xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>ขั้นตอนที่ 1: เลือกกลุ่มนักศึกษา</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="course" className={labelClass} style={{color: 'var(--text-secondary)'}}>รายวิชา</label>
                    <select name="course" value={formState.course} onChange={handleFormChange} className={selectClass} style={formStyle}>
                        <option value="">-- เลือก --</option>
                        {filterOptions.courses.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="groupKey" className={labelClass} style={{color: 'var(--text-secondary)'}}>กลุ่มนักศึกษา</label>
                    <select name="groupKey" value={formState.groupKey} onChange={handleFormChange} className={selectClass} style={formStyle} disabled={!formState.course}>
                        <option value="">-- เลือกกลุ่ม (ทั้งหมด) --</option>
                        {customGroupOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.name}</option>)}
                    </select>
                </div>
            </div>
            <div className="mt-6">
                <div className="flex justify-between items-center glass-card p-4 rounded-lg">
                    <p className="font-semibold text-lg" style={{color: 'var(--text-primary)'}}>
                        พบนักศึกษา:
                    </p>
                    <span className="text-3xl font-bold" style={{color: 'rgb(var(--accent-color))'}}>
                        {filteredStudentsForCreate.length} คน
                    </span>
                </div>
        
                {filteredStudentsForCreate.length > 0 && (
                    <div className="mt-4 p-4 glass-card rounded-lg max-h-60 overflow-y-auto">
                        <h4 className="font-semibold mb-2" style={{color: 'var(--text-secondary)'}}>รายชื่อ:</h4>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-sm" style={{color: 'var(--text-primary)'}}>
                            {filteredStudentsForCreate.map((student, index) => (
                                <li key={`${student.id}-${index}`} className="truncate" title={`${student.studentId} - ${student.prefix}${student.firstName} ${student.lastName}`}>
                                   - {student.prefix}{student.firstName} {student.lastName}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                <div className="flex justify-end mt-4">
                     <button onClick={handleGeneratePreview} disabled={!isAnyFilterApplied || filteredStudentsForCreate.length < 5} className="btn-accent font-bold py-2 px-6 rounded-lg shadow-md transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                        ขั้นตอนต่อไป
                    </button>
                </div>
            </div>

            </div>
        )}
        {createStep === 2 && previewData && (
            <div className="animate-fade-in">
                 <h3 className="text-xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>ขั้นตอนที่ 2: ตั้งชื่อและบันทึก</h3>
                 <div>
                     <label htmlFor="name" className={labelClass} style={{color: 'var(--text-secondary)'}}>ชื่อทัวร์นาเมนต์</label>
                     <input name="name" type="text" value={formState.name} onChange={handleFormChange} placeholder="เช่น Esport League PVS.1 IT" className={inputClass} style={formStyle}/>
                 </div>
                 <div className="mt-4 p-4 glass-card rounded-lg">
                    <h4 className="font-semibold mb-2">สรุปผลการสุ่ม:</h4>
                    <p>จำนวนทีม: {previewData.teams.length}</p>
                    <p>จำนวนนักศึกษาที่ไม่มีทีม: {previewData.leftovers.length}</p>
                    <p>จำนวนรอบการแข่งขัน: {previewData.schedule.length > 0 ? Math.max(...previewData.schedule.map(m => m.round)) : 0}</p>
                 </div>
                 <div className="flex justify-between mt-6">
                    <button onClick={() => setCreateStep(1)} className="font-semibold py-2 px-4 rounded-lg" style={{backgroundColor: 'var(--glass-border)'}}>ย้อนกลับ</button>
                    <button onClick={handleSaveTournament} className="btn-accent font-bold py-2 px-6 rounded-lg shadow-md transition-transform hover:scale-105">บันทึกทัวร์นาเมนต์</button>
                 </div>
            </div>
        )}
        </div>
      );
  };
  
  const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
    const iconStyle = { textShadow: '0 1px 2px rgba(0,0,0,0.3)' };
    if (rank === 1) return <span style={{ color: `rgb(var(--color-gold-rgb))`, ...iconStyle }}>🥇 {rank}</span>;
    if (rank === 2) return <span style={{ color: `rgb(var(--color-silver-rgb))`, ...iconStyle }}>🥈 {rank}</span>;
    if (rank === 3) return <span style={{ color: `rgb(var(--color-bronze-rgb))`, ...iconStyle }}>🥉 {rank}</span>;
    return <span style={{color: 'var(--text-secondary)'}}>{rank}</span>;
  };

  
  const renderDetailsModal = () => {
    if(!selectedTournament) return null;

    return (
    <div className="space-y-4">
        <div className="border-b" style={{borderColor: 'var(--glass-border)'}}>
            <nav className="-mb-px flex space-x-4 overflow-x-auto">
                <button onClick={() => setDetailsActiveTab('ranking')} className={`px-3 py-2 font-medium text-sm rounded-t-lg border-b-2 ${detailsActiveTab === 'ranking' ? 'border-accent text-accent' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>อันดับคะแนน</button>
                <button onClick={() => setDetailsActiveTab('scores')} className={`px-3 py-2 font-medium text-sm rounded-t-lg border-b-2 ${detailsActiveTab === 'scores' ? 'border-accent text-accent' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>ผลการแข่งขัน</button>
                <button onClick={() => setDetailsActiveTab('teams')} className={`px-3 py-2 font-medium text-sm rounded-t-lg border-b-2 ${detailsActiveTab === 'teams' ? 'border-accent text-accent' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>จัดการทีม</button>
                <button onClick={() => setDetailsActiveTab('gradebook')} className={`px-3 py-2 font-medium text-sm rounded-t-lg border-b-2 ${detailsActiveTab === 'gradebook' ? 'border-accent text-accent' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>ส่งคะแนน</button>
                <button onClick={() => setDetailsActiveTab('teamScoring')} className={`px-3 py-2 font-medium text-sm rounded-t-lg border-b-2 ${detailsActiveTab === 'teamScoring' ? 'border-accent text-accent' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>ให้คะแนนทีม</button>
            </nav>
        </div>
        <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-2 -mr-2">
        {detailsActiveTab === 'ranking' && (
            <div className="animate-fade-in overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-b" style={{borderColor: 'var(--glass-border)'}}>
                        <tr>
                            {['อันดับ', 'ชื่อทีม', 'แข่ง', 'ชนะ', 'เสมอ', 'แพ้', 'คะแนน'].map(header => (
                                <th key={header} className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-shadow whitespace-nowrap" style={{color: 'var(--text-secondary)', textAlign: header === 'ชื่อทีม' ? 'left' : 'center'}}>{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y" style={{borderColor: 'var(--glass-border)'}}>
                        {rankingData.map((data, index) => (
                            <tr key={data.team.id} className="hover:bg-black/10">
                                <td className="px-3 py-2 text-center font-bold"><RankBadge rank={index + 1} /></td>
                                <td className="px-3 py-2 text-sm font-semibold" style={{color: 'var(--text-primary)'}}>{data.team.name}</td>
                                <td className="px-3 py-2 text-sm text-center" style={{color: 'var(--text-secondary)'}}>{data.played}</td>
                                <td className="px-3 py-2 text-sm text-center" style={{color: 'rgb(var(--text-success-rgb))'}}>{data.wins}</td>
                                <td className="px-3 py-2 text-sm text-center" style={{color: 'rgb(var(--color-highlight-rgb))'}}>{data.ties}</td>
                                <td className="px-3 py-2 text-sm text-center" style={{color: 'rgb(var(--text-danger-rgb))'}}>{data.losses}</td>
                                <td className="px-3 py-2 text-sm text-center font-bold" style={{color: 'rgb(var(--accent-color))'}}>{data.points}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
        {detailsActiveTab === 'scores' && (
            <div className="space-y-4 animate-fade-in">
            {editableSchedule.map((match, index) => (
                <div key={`${match.round}-${match.team1.id}-${match.team2.id}-${index}`} className="glass-card flex items-center justify-between p-3 rounded-lg">
                    <span className="font-semibold w-2/5 truncate text-right pr-2" style={{color: 'var(--text-primary)'}}>{match.team1.name}</span>
                    <div className="flex items-center gap-2">
                        <input type="number" min="0" value={match.team1Score ?? ''} onChange={e => handleScoreChange(match.round, match.team1.id, 'team1Score', e.target.value)} className="w-16 text-center p-1 rounded-md" style={formStyle} />
                        <span>-</span>
                        <input type="number" min="0" value={match.team2Score ?? ''} onChange={e => handleScoreChange(match.round, match.team1.id, 'team2Score', e.target.value)} className="w-16 text-center p-1 rounded-md" style={formStyle} disabled={match.team2.name === 'BYE'} />
                    </div>
                    <span className={`font-semibold w-2/5 truncate text-left pl-2 ${match.team2.name === 'BYE' ? 'text-slate-500' : ''}`} style={{color: match.team2.name !== 'BYE' ? 'var(--text-primary)' : undefined }}>{match.team2.name}</span>
                </div>
            ))}
            <div className="flex justify-end pt-4"><button onClick={handleSaveScores} className="btn-accent font-semibold py-2 px-4 rounded-lg">บันทึกคะแนน</button></div>
            </div>
        )}
        {detailsActiveTab === 'teams' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                {selectedTournament.teams.map(team => (
                    <div key={team.id} className="glass-card p-4 rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                            <h5 className="font-bold" style={{color: 'rgb(var(--accent-color))'}}>{team.name} ({team.members.length} คน)</h5>
                            <button onClick={() => handleOpenEditTeamModal(team)} className="text-xs font-semibold py-1 px-2 rounded-md hover:opacity-80" style={{backgroundColor: 'rgba(var(--accent-color), 0.2)', color: 'rgb(var(--accent-color))'}}>แก้ไข</button>
                        </div>
                        <ul className="space-y-1 text-xs">{team.members.map((member, idx) => <li key={`${member.id}-${idx}`}>{member.studentId} - {member.prefix}{member.firstName} {member.lastName}</li>)}</ul>
                    </div>
                ))}
            </div>
        )}
        {detailsActiveTab === 'gradebook' && (
            <div className="space-y-4 animate-fade-in">
                <h4 className="text-lg font-bold">ส่งคะแนนเข้าสู่ระบบ</h4>
                {selectedTournament.scoresPosted ? (
                    <div className="p-4 rounded-lg text-center" style={{backgroundColor: 'rgba(var(--text-success-rgb),0.1)', color: 'rgb(var(--text-success-rgb))'}}>
                        <p className="font-bold">คะแนนของทัวร์นาเมนต์นี้ถูกส่งเข้าระบบแล้ว</p>
                    </div>
                ) : (
                <>
                <div>
                    <label className={labelClass} style={{color: 'var(--text-secondary)'}}>เลือกหัวข้อคะแนน</label>
                    <select value={gradebookConfig.gradingComponentKey} onChange={e => setGradebookConfig(p => ({...p, gradingComponentKey: e.target.value}))} className={selectClass} style={formStyle}>
                        <option value="">-- เลือก --</option>
                        {flattenedGradingItems.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className={labelClass} style={{color: 'var(--text-secondary)'}}>คะแนน (ชนะ)</label>
                        <input type="number" value={gradebookConfig.pointsForWin} onChange={e => setGradebookConfig(p => ({...p, pointsForWin: Number(e.target.value)}))} className={inputClass} style={formStyle} />
                    </div>
                    <div>
                        <label className={labelClass} style={{color: 'var(--text-secondary)'}}>คะแนน (เสมอ)</label>
                        <input type="number" value={gradebookConfig.pointsForTie} onChange={e => setGradebookConfig(p => ({...p, pointsForTie: Number(e.target.value)}))} className={inputClass} style={formStyle} />
                    </div>
                    <div>
                        <label className={labelClass} style={{color: 'var(--text-secondary)'}}>คะแนน (แพ้)</label>
                        <input type="number" value={gradebookConfig.pointsForLoss} onChange={e => setGradebookConfig(p => ({...p, pointsForLoss: Number(e.target.value)}))} className={inputClass} style={formStyle} />
                    </div>
                </div>
                 <div className="flex justify-end pt-4"><button onClick={handlePostToGradebook} className="font-semibold py-2 px-4 rounded-lg" style={{backgroundColor: 'rgb(var(--text-success-rgb))', color: 'white'}}>ยืนยันและส่งคะแนน</button></div>
                </>
                )}
            </div>
        )}
        {detailsActiveTab === 'teamScoring' && (
             <div className="space-y-4 animate-fade-in">
                <h4 className="text-lg font-bold">ให้คะแนนทีมโดยตรง</h4>
                 <div className="p-4 glass-card rounded-lg space-y-4">
                    <div>
                        <label htmlFor="team-scoring-id" className={labelClass} style={{color: 'var(--text-secondary)'}}>1. ค้นหาทีมโดยใช้รหัสนักศึกษา</label>
                        <div className="flex gap-2">
                        <input id="team-scoring-id" type="text" placeholder="รหัสนักศึกษา 11 หลัก" value={teamScoringStudentId} onChange={e => setTeamScoringStudentId(e.target.value)} className={inputClass} style={formStyle} />
                        <button onClick={handleFindTeam} className="font-semibold py-2 px-4 rounded-lg" style={{backgroundColor: `rgba(var(--text-link-rgb), 1)`, color: `var(--text-inverted)`}}>ค้นหา</button>
                        </div>
                    </div>
                    {foundTeam && (
                        <div className="p-3 rounded-lg animate-fade-in" style={{backgroundColor: 'rgba(var(--text-success-rgb), 0.1)'}}>
                            <h5 className="font-bold" style={{color: 'rgb(var(--text-success-rgb))'}}>พบทีม: {foundTeam.name}</h5>
                            <ul className="text-xs list-disc list-inside pl-2" style={{color: 'rgba(var(--text-success-rgb), 0.8)'}}>
                                {foundTeam.members.map((m, idx) => <li key={`${m.id}-${idx}`}>{m.firstName} {m.lastName}</li>)}
                            </ul>
                        </div>
                    )}
                     <div>
                        <label htmlFor="team-score-component" className={labelClass} style={{color: 'var(--text-secondary)'}}>2. เลือกหัวข้อคะแนน</label>
                        <select id="team-score-component" value={teamScoreComponentKey} onChange={e => setTeamScoreComponentKey(e.target.value)} className={selectClass} style={formStyle} disabled={!foundTeam}>
                            <option value="">-- เลือก --</option>
                            {flattenedGradingItems.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="team-score-value" className={labelClass} style={{color: 'var(--text-secondary)'}}>3. กรอกคะแนนที่จะให้</label>
                        <input id="team-score-value" type="number" placeholder="คะแนน" value={teamScoreValue} onChange={e => setTeamScoreValue(e.target.value)} className={inputClass} style={formStyle} disabled={!foundTeam || !teamScoreComponentKey}/>
                    </div>
                 </div>
                 <div className="flex justify-end pt-4">
                    <button onClick={handleGiveTeamScore} disabled={!foundTeam || !teamScoreComponentKey || !teamScoreValue} className="font-semibold py-2 px-4 rounded-lg disabled:opacity-50" style={{backgroundColor: 'rgb(var(--text-success-rgb))', color: 'white'}}>ยืนยันการให้คะแนน</button>
                </div>
            </div>
        )}
        </div>
    </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 glass-card rounded-2xl">
          <h2 className="text-3xl font-bold text-shadow" style={{ color: 'var(--text-primary)' }}>
            จัดการทัวร์นาเมนต์
          </h2>
          <button onClick={handleOpenCreateModal} className="w-full sm:w-auto btn-accent text-white font-bold py-2 px-5 rounded-lg shadow-md transition-transform hover:scale-105">
            + สร้างทัวร์นาเมนต์ใหม่
          </button>
      </div>
      
      {isLoading ? <LoadingSpinner size="lg" /> : (
        <div className="space-y-4">
        {tournaments.length > 0 ? tournaments.map(t => (
            <div key={t.id} className="glass-card p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex-grow text-center sm:text-left">
                    <h3 className="font-bold text-lg" style={{color: 'var(--text-primary)'}}>{t.name}</h3>
                    <p className="text-sm" style={{color: 'var(--text-secondary)'}}>{t.course} / {t.classLevel} / {t.departments.join(' & ')}</p>
                    <p className="text-xs mt-1" style={{color: 'var(--text-muted)'}}>สร้างเมื่อ: {new Date(t.createdAt).toLocaleDateString('th-TH')}</p>
                </div>
                <div className="flex items-center gap-4">
                    {getStatusChip(t.status)}
                    <button onClick={() => handleOpenDetailsModal(t)} className="font-semibold py-2 px-4 rounded-lg" style={{backgroundColor: `rgba(var(--text-link-rgb), 1)`, color: `var(--text-inverted)`}}>จัดการ</button>
                    <button onClick={() => handleDeleteTournament(t)} className="p-2 rounded-lg hover:bg-red-500/20" style={{color: `rgb(var(--text-danger-rgb))`}}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                </div>
            </div>
        )) : (
            <div className="text-center py-12 glass-card rounded-2xl">
                <p className="text-lg font-semibold" style={{color: 'var(--text-secondary)'}}>ยังไม่มีทัวร์นาเมนต์ที่สร้างไว้</p>
            </div>
        )}
        </div>
      )}
      
      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={modalView === 'create' ? 'สร้างทัวร์นาเมนต์ใหม่' : (selectedTournament?.name || 'จัดการทัวร์นาเมนต์')}
        size="fullscreen"
      >
        {modalView === 'create' ? renderCreateModal() : renderDetailsModal()}
      </Modal>
      
      <Modal isOpen={isEditTeamModalOpen} onClose={handleCloseEditTeamModal} title={`แก้ไขทีม: ${editingTeam?.name}`} size="fullscreen">
          {editingTeam && (
              <div className="space-y-4">
                  <div>
                      <label htmlFor="team-name-edit" className={labelClass}>ชื่อทีม</label>
                      <input id="team-name-edit" type="text" value={editingTeam.name} onChange={handleEditTeamName} className={inputClass} style={formStyle} />
                  </div>
                  <div>
                      <h4 className={labelClass}>สมาชิกปัจจุบัน ({editingTeam.members.length})</h4>
                      <div className="space-y-2 p-2 glass-card rounded-lg max-h-60 overflow-y-auto">
                          {editingTeam.members.map((member, idx) => (
                              <div key={`${member.id}-${idx}`} className="flex justify-between items-center p-2 hover:bg-black/10 rounded-md">
                                  <p className="text-sm">{member.prefix}{member.firstName} {member.lastName}</p>
                                  <button onClick={() => handleRemoveMemberFromTeam(member.studentId)} className="text-xs font-semibold" style={{color: 'rgb(var(--text-danger-rgb))'}}>ลบ</button>
                              </div>
                          ))}
                      </div>
                  </div>
                   <div>
                      <label htmlFor="add-member-select" className={labelClass}>เพิ่มสมาชิกใหม่</label>
                      <select id="add-member-select" onChange={handleAddMemberToTeam} className={selectClass} style={formStyle} disabled={availableStudentsForEditing.length === 0}>
                          <option value="">{availableStudentsForEditing.length > 0 ? '-- เลือกนักศึกษา --' : 'ไม่พบนักศึกษาที่สามารถเพิ่มได้'}</option>
                          {availableStudentsForEditing.map((student, idx) => (
                              <option key={`${student.id}-${idx}`} value={student.studentId}>{student.studentId} - {student.prefix}{student.firstName} {student.lastName}</option>
                          ))}
                      </select>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4 border-t" style={{borderColor: 'var(--glass-border)'}}>
                      <button onClick={handleCloseEditTeamModal} className="font-semibold py-2 px-4 rounded-lg" style={{backgroundColor: 'var(--glass-border)'}}>ยกเลิก</button>
                      <button onClick={handleSaveEditedTeam} className="btn-accent font-bold py-2 px-6 rounded-lg shadow-md">บันทึกการเปลี่ยนแปลง</button>
                  </div>
              </div>
          )}
      </Modal>
      
    </div>
  );
};

export default TournamentManagement;
