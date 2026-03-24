
import React, { useState, useEffect, useMemo } from 'react';
import { playSuccessSound, playErrorSound } from '../../utils/soundUtils';
import { grantGameXP } from '../../services/googleSheetService';
import { useNotification } from '../../contexts/NotificationContext';

// โจทย์เพลง (สามารถเพิ่มลดได้ตามใจชอบ)
const QUIZ_DATA = [
    { id: 1, question: '🌧️👨‍🦲🌧️', answer: 'ฝนตกไหม', choices: ['ฝนตกไหม', 'ฤดูที่ฉันเหงา', 'เล่าสู่กันฟัง', 'ฝน'] },
    { id: 2, question: '🐢🧗‍♂️🏔️', answer: 'เต่างอย', choices: ['เต่างอย', 'ปูหนีบอีปิ', 'ไก่ย่าง', 'แมงมุม'] },
    { id: 3, question: '🤏🧠', answer: 'ทรงอย่างแบด', choices: ['ทรงอย่างแบด', 'นะหน้าทอง', 'เลือดกรุ๊ปบี', 'ธาตุทองซาวด์'] },
    { id: 4, question: '🍬🍭👀', answer: 'มองนานๆ', choices: ['มองนานๆ', 'รักแรก', 'โต๊ะริม', 'ฉลามชอบงับคุณ'] },
    { id: 5, question: '🩸🅰️🅱️', answer: 'เลือดกรุ๊ปบี', choices: ['เลือดกรุ๊ปบี', 'คนมีเสน่ห์', 'แพ้ทาง', 'คู่ชีวิต'] },
    { id: 6, question: '🌊🛶😭', answer: 'พายเรือพายไป', choices: ['พายเรือพายไป', 'ล่องเรือ', 'ทะเลสีดำ', 'หนุ่มบาวสาวปาน'] },
    { id: 7, question: '🚫🥣🍜', answer: 'ไม่กินเส้น', choices: ['ไม่กินเส้น', 'กินข้าวยัง', 'ก๋วยเตี๋ยว', 'ส้มตำ'] },
    { id: 8, question: '🗣️🤫🤐', answer: 'อย่าบอกให้ใครรู้', choices: ['อย่าบอกให้ใครรู้', 'ความลับ', 'พูดไม่ค่อยเก่ง', 'เงียบๆคนเดียว'] },
    { id: 9, question: '🙅‍♂️💊', answer: 'ยาพิษ', choices: ['ยาพิษ', 'ยาใจคนจน', 'หมอ', 'ป่วย'] },
    { id: 10, question: '👑🦁', answer: 'บัวลอย', choices: ['บัวลอย', 'ทะเลใจ', 'วณิพก', 'ราชาเงินผ่อน'] },
];

const EmojiSongGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15);
    const [gameState, setGameState] = useState<'PLAYING' | 'FINISHED'>('PLAYING');
    const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    
    // Fake ID needed for XP service
    const studentId = sessionStorage.getItem('srtc_student_auth_id') || 'guest';
    const notification = useNotification();

    // Shuffle choices helper (optional logic to randomize choice position could go here)
    const currentQuestion = QUIZ_DATA[currentQuestionIndex];

    const finishGame = useCallback(async () => {
        setGameState('FINISHED');
        // Grant XP
        if (studentId !== 'guest') {
            // Calculate XP (e.g., 20% of score)
            // Since we can't reliably get `score` inside this closure updated by previous `setScore`,
            // we will grant XP in a separate useEffect that watches gameState='FINISHED'
        }
    }, [studentId]);

    const handleAnswer = useCallback((choice: string) => {
        if (selectedChoice !== null) return; // Prevent double clicking

        setSelectedChoice(choice);
        const correct = choice === currentQuestion.answer;
        setIsCorrect(correct);

        if (correct) {
            setScore(prev => prev + 10 + Math.ceil(timeLeft / 2)); // Bonus for speed
            playSuccessSound();
        } else {
            playErrorSound();
        }

        // Wait a bit then move to next question
        setTimeout(() => {
            if (currentQuestionIndex < QUIZ_DATA.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setTimeLeft(15);
                setSelectedChoice(null);
                setIsCorrect(null);
            } else {
                finishGame();
            }
        }, 1500);
    }, [selectedChoice, currentQuestion.answer, timeLeft, playSuccessSound, playErrorSound, currentQuestionIndex, finishGame]);

    useEffect(() => {
        if (gameState === 'FINISHED') return;

        if (timeLeft <= 0) {
            void Promise.resolve().then(() => handleAnswer('')); // Timeout counts as wrong
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, gameState, handleAnswer]);
    
    useEffect(() => {
        if (gameState === 'FINISHED' && studentId !== 'guest' && score > 0) {
            const earnedXP = Math.floor(score / 5); // 20%
            if (earnedXP > 0) {
                grantGameXP(studentId, earnedXP, 'Emoji Quiz').then(res => {
                    if(res.success) {
                        notification.addToast({type: 'success', title: 'Level Up Progress', message: res.message});
                    }
                });
            }
        }
    }, [gameState, score, studentId, notification]);

    const restartGame = () => {
        setCurrentQuestionIndex(0);
        setScore(0);
        setTimeLeft(15);
        setGameState('PLAYING');
        setSelectedChoice(null);
        setIsCorrect(null);
    };

    if (gameState === 'FINISHED') {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                <div className="glass-card p-8 rounded-3xl border-4 border-white/20 shadow-2xl bg-white/10 w-full max-w-md">
                    <h2 className="text-3xl font-bold mb-4 text-shadow" style={{color: 'var(--text-primary)'}}>จบเกม!</h2>
                    <p className="text-lg mb-2" style={{color: 'var(--text-secondary)'}}>คะแนนของคุณ</p>
                    <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-6">
                        {score}
                    </div>
                    
                    <div className="space-y-3">
                        <button 
                            onClick={restartGame}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold shadow-lg hover:scale-105 transition-transform"
                        >
                            เล่นอีกครั้ง 🔄
                        </button>
                        <button 
                            onClick={onBack}
                            className="w-full py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold transition-colors"
                        >
                            กลับหน้ารวมเกม 🏠
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center w-full max-w-md mx-auto animate-fade-in pb-10">
            {/* Header */}
            <div className="flex justify-between items-center w-full mb-6 glass-card p-3 rounded-2xl">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-black/10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-xs uppercase tracking-wider opacity-70">ข้อที่ {currentQuestionIndex + 1} / {QUIZ_DATA.length}</span>
                    <span className="font-bold text-xl">Score: {score}</span>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${timeLeft <= 5 ? 'border-red-500 text-red-500 animate-pulse' : 'border-blue-500 text-blue-500'}`}>
                    {timeLeft}
                </div>
            </div>

            {/* Question Card */}
            <div className="w-full aspect-video glass-card rounded-3xl flex items-center justify-center mb-6 shadow-lg bg-gradient-to-br from-indigo-900/50 to-purple-900/50 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none text-9xl">🎵</div>
                <div className="text-6xl sm:text-8xl animate-bounce" style={{textShadow: '0 10px 20px rgba(0,0,0,0.5)'}}>
                    {currentQuestion.question}
                </div>
            </div>

            {/* Choices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {currentQuestion.choices.map((choice, index) => {
                    let btnClass = "glass-card p-4 rounded-xl text-lg font-semibold transition-all duration-200 transform active:scale-95 hover:bg-white/20";
                    
                    if (selectedChoice) {
                        if (choice === currentQuestion.answer) {
                            btnClass = "bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.6)] border-green-400";
                        } else if (choice === selectedChoice) {
                            btnClass = "bg-red-500 text-white border-red-400 opacity-80";
                        } else {
                            btnClass = "opacity-50 grayscale";
                        }
                    }

                    return (
                        <button
                            key={index}
                            onClick={() => handleAnswer(choice)}
                            disabled={selectedChoice !== null}
                            className={btnClass}
                            style={selectedChoice && choice === currentQuestion.answer ? {backgroundColor: '#22c55e'} : selectedChoice === choice ? {backgroundColor: '#ef4444'} : {}}
                        >
                            {choice}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default EmojiSongGame;
