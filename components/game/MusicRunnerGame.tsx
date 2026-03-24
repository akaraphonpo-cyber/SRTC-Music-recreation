import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { StudentWithId, Department } from '../../types';
import { updateStudentHighScore, getGameLeaderboard, grantGameXP, updateStudent } from '../../services/googleSheetService';
import { playSuccessSound, playErrorSound } from '../../utils/soundUtils';
import LoadingSpinner from '../common/LoadingSpinner';
import { useNotification } from '../../contexts/NotificationContext';

interface MusicRunnerGameProps {
    student: StudentWithId;
    onUpdateStudent: (student: StudentWithId) => void;
}

interface LeaderboardItem {
    id: string;
    name: string;
    score: number;
    dept: string;
}

// --- Game Assets & Config ---
const ASSETS = {
    [Department.IT]: { avatar: '👨‍💻', item: '💻', color: '#3b82f6' },
    [Department.AUTOMOTIVE]: { avatar: '🏍️', item: '🔧', color: '#ef4444' },
    [Department.ELECTRIC_VEHICLE]: { avatar: '🚗', item: '🔋', color: '#10b981' },
    [Department.ELECTRICAL_POWER]: { avatar: '⚡', item: '💡', color: '#f59e0b' },
    [Department.ELECTRONICS]: { avatar: '📟', item: '📼', color: '#8b5cf6' },
    [Department.CONSTRUCTION]: { avatar: '👷', item: '🧱', color: '#f97316' },
    [Department.ARCHITECTURE]: { avatar: '📐', item: '🏠', color: '#06b6d4' },
    [Department.WELDING]: { avatar: '👨‍🏭', item: '🔥', color: '#6366f1' },
    [Department.MECHATRONICS]: { avatar: '🤖', item: '⚙️', color: '#ec4899' },
    // Fallback
    'DEFAULT': { avatar: '🏃', item: '⭐', color: '#f97316' }
};

const POWERUPS = {
    SHIELD: { type: 'shield', icon: '⛑️', duration: 0, color: '#22c55e' }, // One-time hit protection
    BOOST: { type: 'boost', icon: '⚡', duration: 300, color: '#eab308' }, // Speed + Invincible
};

// --- Game Engine Config ---
const GRAVITY = 0.6;
const JUMP_FORCE = -13; // Increased slightly for 3D feel
const BASE_SPEED = 7;

const MusicRunnerGame: React.FC<MusicRunnerGameProps> = ({ student, onUpdateStudent }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const notification = useNotification();
    
    // Game States
    const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'GAME_OVER'>('MENU');
    const gameStateRef = useRef<'MENU' | 'PLAYING' | 'GAME_OVER'>('MENU'); // Ref for loop access
    
    // Stats
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(student.highScore || 0);
    const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
    
    // Visuals
    const myTheme = useMemo(() => ASSETS[student.department] || ASSETS['DEFAULT'], [student.department]);
    const [activePowerUp, setActivePowerUp] = useState<string | null>(null);

    // Character Selection
    const CHARACTERS = useMemo(() => [
        { name: 'ตัวแทนแผนก', avatar: myTheme.avatar },
        { name: 'นักวิ่ง', avatar: '🏃' },
        { name: 'นินจา', avatar: '🥷' },
        { name: 'ซูเปอร์ฮีโร่', avatar: '🦸' },
        { name: 'หุ่นยนต์', avatar: '🤖' },
        { name: 'เอเลี่ยน', avatar: '👽' },
        { name: 'แมวเหมียว', avatar: '🐱' },
        { name: 'น้องหมา', avatar: '🐶' },
        { name: 'ไดโนเสาร์', avatar: '🦖' },
        { name: 'ผีน้อย', avatar: '👻' },
        { name: 'ซอมบี้', avatar: '🧟' },
        { name: 'พ่อมด', avatar: '🧙' },
        { name: 'ตำรวจ', avatar: '👮' },
        { name: 'นักบินอวกาศ', avatar: '👩‍🚀' },
    ], [myTheme]);

    const [selectedCharIndex, setSelectedCharIndex] = useState(0);
    const selectedCharacter = CHARACTERS[selectedCharIndex];

    // --- Optimization Logic ---
    // Fetch leaderboard only on mount and game over to save Reads
    const fetchLeaderboard = useCallback(async () => {
        await Promise.resolve();
        setLoadingLeaderboard(true);
        const res = await getGameLeaderboard();
        if (res.success && res.data) {
            setLeaderboard(res.data.map(s => ({
                id: s.studentId,
                name: `${s.firstName} ${s.lastName}`,
                score: s.highScore || 0,
                dept: s.department
            })));
        }
        setLoadingLeaderboard(false);
    }, []);

    useEffect(() => {
        void fetchLeaderboard();
    }, [fetchLeaderboard]);

    // --- Game Engine Logic ---
    
    const gameRef = useRef({
        player: { x: 80, y: 0, width: 40, height: 40, dy: 0, grounded: false, rotation: 0, shield: false, avatar: '' },
        obstacles: [] as { x: number; y: number; width: number; height: number; type: 'box' | 'fly' | 'ground'; label: string; color: string }[],
        items: [] as { x: number; y: number; width: number; height: number; type: 'score' | 'shield' | 'boost'; label: string; collected: boolean; z: number }[],
        particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; gravity: number }[],
        score: 0,
        speed: BASE_SPEED,
        boostTimer: 0,
        frameId: 0,
        bgOffset: 0
    });

    const createParticles = useCallback((x: number, y: number, count: number, color: string, burst = false) => {
        for (let i = 0; i < count; i++) {
            gameRef.current.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * (burst ? 15 : 6),
                vy: (Math.random() - 0.5) * (burst ? 15 : 6),
                life: 1.0,
                color,
                size: Math.random() * 6 + 2,
                gravity: 0.2
            });
        }
    }, []);

    const jump = useCallback(() => {
        const { player } = gameRef.current;
        if (player.grounded) {
            player.dy = JUMP_FORCE;
            player.grounded = false;
            // Jump Dust
            createParticles(player.x + 20, player.y + 40, 8, '#cbd5e1');
            playSuccessSound();
        }
    }, [createParticles]);

    const draw3DCube = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, depth: number, color: string) => {
        // Simple darkening for shading
        ctx.save();
        
        // Front Face
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);

        // Top Face (Perspective: Up and Right)
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; // Highlight
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + depth, y - depth);
        ctx.lineTo(x + w + depth, y - depth);
        ctx.lineTo(x + w, y);
        ctx.fill();
        
        // Side Face (Perspective: Right)
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; // Shadow
        ctx.beginPath();
        ctx.moveTo(x + w, y);
        ctx.lineTo(x + w + depth, y - depth);
        ctx.lineTo(x + w + depth, y + h - depth);
        ctx.lineTo(x + w, y + h);
        ctx.fill();

        // Stroke for cartoon 3D look
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        ctx.restore();
    }, []);

    const drawShadow = useCallback((ctx: CanvasRenderingContext2D, x: number, groundY: number, width: number, scale: number) => {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.translate(x + width/2, groundY);
        ctx.scale(1 - scale, 0.3); // Scale shadow based on jump height
        ctx.beginPath();
        ctx.arc(0, 0, width/1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }, []);

    const drawCloud = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.arc(x + size * 0.6, y - size * 0.3, size * 0.8, 0, Math.PI * 2);
        ctx.arc(x + size * 1.2, y, size * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }, []);

    const drawStar = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, size: number, opacity: number) => {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }, []);

    const handleGameOver = useCallback(async () => {
        setGameState('GAME_OVER');
        gameStateRef.current = 'GAME_OVER';
        playErrorSound();
        const finalScore = Math.floor(gameRef.current.score);
        
        if (gameRef.current.frameId) cancelAnimationFrame(gameRef.current.frameId);

        // 1. Grant XP (10% of Score)
        const xpEarned = Math.floor(finalScore / 10);
        if (xpEarned > 0) {
            grantGameXP(student.studentId, xpEarned, 'Tech Runner').then(res => {
                if (res.success) {
                    notification.addToast({type:'success', title:'Level Up', message: res.message});
                }
            });
        }

        // 2. Grant Coins (1 Coin per 10 points)
        const coinsEarned = Math.floor(finalScore / 10);
        if (coinsEarned > 0) {
            const currentCoins = student.coins || 0;
            const updatedStudent = { ...student, coins: currentCoins + coinsEarned };
            await updateStudent(updatedStudent);
            onUpdateStudent(updatedStudent); // Update UI immediately
            notification.addToast({type:'success', title:'Rewards', message: `คุณได้รับ ${coinsEarned} Coins 🪙`});
        }

        // 3. Update High Score
        if (finalScore > highScore) {
            setHighScore(finalScore);
            updateStudentHighScore(student.studentId, finalScore).then(() => {
                fetchLeaderboard();
            });
        } else {
            fetchLeaderboard();
        }
    }, [student, highScore, onUpdateStudent, notification, fetchLeaderboard]);

    const gameLoop = useCallback(function loop() {
        if (gameStateRef.current !== 'PLAYING') return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize handling
        if (containerRef.current) {
            canvas.width = containerRef.current.clientWidth;
            canvas.height = 360; // Slightly taller for 3D perspective
        }

        const state = gameRef.current;
        const width = canvas.width;
        const height = canvas.height;
        const groundY = height - 60; // Lower ground for perspective
        const depthOffset = 30; // Amount of 3D depth shift

        // --- Logic Update ---

        // Boost Logic
        if (state.boostTimer > 0) {
            state.boostTimer--;
            state.speed = BASE_SPEED * 2.5; // Super speed
            if (state.boostTimer <= 0) {
                state.speed = BASE_SPEED;
                setActivePowerUp(state.player.shield ? 'SHIELD' : null);
            }
        } else {
            // Gradual Speed Increase
            state.speed = BASE_SPEED + (state.score * 0.005);
        }

        // Score
        state.score += 0.15;
        setScore(Math.floor(state.score));

        // Background Scroll
        state.bgOffset -= state.speed;
        if (state.bgOffset <= -width) state.bgOffset = 0;

        // Player Physics
        state.player.dy += GRAVITY;
        state.player.y += state.player.dy;

        // Ground Collision
        if (state.player.y + state.player.height > groundY) {
            state.player.y = groundY - state.player.height;
            state.player.dy = 0;
            state.player.grounded = true;
            state.player.rotation = 0;
        } else {
            // Air rotation effect
            state.player.rotation = Math.sin(Date.now() / 100) * 0.1;
        }

        // --- Spawning ---
        // Obstacles
        if (Math.random() < 0.015 && (state.obstacles.length === 0 || width - state.obstacles[state.obstacles.length - 1].x > 350)) {
            const rand = Math.random();
            let type: 'box' | 'fly' | 'ground';
            let label: string;
            let yPos: number;
            let h: number;
            let color: string;

            if (rand > 0.7) {
                type = 'fly'; // Flying obstacle
                label = '🛸'; // Drone/UFO
                yPos = groundY - 140;
                color = '#6366f1';
                h = 40;
            } else if (rand > 0.4) {
                type = 'box'; // Standard box
                label = ''; // Use 3D cube rendering instead of emoji
                yPos = groundY - 50;
                h = 50;
                color = '#f59e0b'; // Amber box
            } else {
                type = 'ground'; // Spikes
                label = '⚠️';
                yPos = groundY - 30;
                h = 30;
                color = '#ef4444';
            }

            state.obstacles.push({
                x: width + 50,
                y: yPos,
                width: 50,
                height: h,
                type,
                label,
                color
            });
        }

        // Items
        if (Math.random() < 0.03 && (state.items.length === 0 || width - state.items[state.items.length - 1].x > 200)) {
            const rand = Math.random();
            let type: 'score' | 'shield' | 'boost';
            let label: string;
            
            if (rand > 0.97) {
                type = 'boost';
                label = POWERUPS.BOOST.icon;
            } else if (rand > 0.94 && !state.player.shield) {
                type = 'shield';
                label = POWERUPS.SHIELD.icon;
            } else {
                type = 'score';
                label = myTheme.item;
            }

            state.items.push({
                x: width + 50,
                y: groundY - 50 - (Math.random() * 120),
                width: 40,
                height: 40,
                type,
                label,
                collected: false,
                z: 0
            });
        }

        // --- Collision & Updates ---

        // Items
        for (let i = state.items.length - 1; i >= 0; i--) {
            const item = state.items[i];
            item.x -= state.speed;

            if (item.x + item.width < -100 || item.collected) {
                state.items.splice(i, 1);
                continue;
            }

            // Simple Collision
            if (
                state.player.x < item.x + item.width &&
                state.player.x + state.player.width > item.x &&
                state.player.y < item.y + item.height &&
                state.player.y + state.player.height > item.y
            ) {
                item.collected = true;
                playSuccessSound();
                
                if (item.type === 'score') {
                    state.score += 20;
                    createParticles(item.x, item.y, 8, '#fbbf24');
                } else if (item.type === 'shield') {
                    state.player.shield = true;
                    setActivePowerUp('SHIELD');
                    createParticles(item.x, item.y, 12, POWERUPS.SHIELD.color, true);
                } else if (item.type === 'boost') {
                    state.boostTimer = POWERUPS.BOOST.duration;
                    setActivePowerUp('BOOST');
                    createParticles(item.x, item.y, 20, POWERUPS.BOOST.color, true);
                }
            }
        }

        // Obstacles
        for (let i = state.obstacles.length - 1; i >= 0; i--) {
            const obs = state.obstacles[i];
            obs.x -= state.speed;

            if (obs.x + obs.width < -100) {
                state.obstacles.splice(i, 1);
                continue;
            }

            // Hitbox adjustment
            const pHitbox = { x: state.player.x + 10, y: state.player.y + 10, w: state.player.width - 20, h: state.player.height - 20 };
            
            if (
                pHitbox.x < obs.x + obs.width &&
                pHitbox.x + pHitbox.w > obs.x &&
                pHitbox.y < obs.y + obs.height &&
                pHitbox.y + pHitbox.h > obs.y
            ) {
                if (state.boostTimer > 0) {
                    createParticles(obs.x, obs.y, 10, '#ef4444', true);
                    state.obstacles.splice(i, 1);
                    state.score += 10;
                    continue;
                }

                if (state.player.shield) {
                    state.player.shield = false;
                    setActivePowerUp(null);
                    createParticles(state.player.x, state.player.y, 15, '#22c55e', true);
                    playErrorSound();
                    state.obstacles.splice(i, 1);
                    continue;
                }

                handleGameOver();
                return;
            }
        }

        // Particles Physics
        for (let i = state.particles.length - 1; i >= 0; i--) {
            const p = state.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity; // Gravity
            p.life -= 0.03;
            if (p.life <= 0) state.particles.splice(i, 1);
        }

        // --- 3D RENDERING ---

        ctx.clearRect(0, 0, width, height);

        // 1. Sky Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#020617'); // Dark Blue space
        gradient.addColorStop(1, '#1e1b4b'); // Purple horizon
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Distant Elements (Clouds/Stars)
        for(let i=0; i<5; i++) {
            const x = (i * 300 + state.bgOffset * 0.2) % (width + 200);
            drawCloud(ctx, x, 50 + i * 20, 30);
        }
        for(let i=0; i<20; i++) {
            const x = (i * 150 + state.bgOffset * 0.1) % width;
            const y = (i * 77) % (groundY - 100);
            drawStar(ctx, x, y, 1, 0.5 + Math.sin(Date.now()/500 + i)*0.5);
        }

        // 2. 3D Grid Floor (Retro Synthwave Style)
        ctx.save();
        ctx.beginPath();
        // Create clipping area for floor
        ctx.rect(0, groundY, width, height - groundY);
        ctx.clip();
        
        // Floor Color
        const floorGrad = ctx.createLinearGradient(0, groundY, 0, height);
        floorGrad.addColorStop(0, '#312e81');
        floorGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, groundY, width, height - groundY);

        // Moving Vertical Lines (Perspective)
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)'; // Indigo glow
        ctx.lineWidth = 2;
        const perspectiveOffset = (state.bgOffset % 100);
        
        // Draw vertical lines that move left
        for (let i = -200; i < width + 200; i += 80) {
            const x = i + perspectiveOffset;
            // Slant lines to fake 3D
            ctx.beginPath();
            ctx.moveTo(x + 100, groundY); // Top of floor (far)
            ctx.lineTo(x - 50, height);   // Bottom of floor (near)
            ctx.stroke();
        }

        // Horizontal Lines (Perspective - get closer together as they go up)
        for (let i = 0; i < height - groundY; i += 10 + (i * 0.1)) {
            const y = height - i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        ctx.restore();

        // 3. City Background (Parallax)
        ctx.fillStyle = '#0f172a';
        const buildingWidth = 80;
        const totalBuildings = Math.ceil(width / buildingWidth) + 2;
        const startBuildingIndex = Math.floor(-state.bgOffset * 0.5 / buildingWidth);
        
        for (let i = 0; i < totalBuildings; i++) {
            const idx = startBuildingIndex + i;
            const h = 80 + (Math.sin(idx * 999) * 40 + 40); 
            // Draw building with slight 3D side
            const x = (idx * buildingWidth) + (state.bgOffset * 0.5);
            
            ctx.fillStyle = '#1e293b'; // Front
            ctx.fillRect(x, groundY - h, buildingWidth, h);
            ctx.fillStyle = '#0f172a'; // Side
            ctx.fillRect(x + buildingWidth, groundY - h - 10, 10, h);
            
            // Windows
            ctx.fillStyle = Math.random() > 0.9 ? '#fbbf24' : '#334155';
            if (idx % 2 === 0) ctx.fillRect(x + 10, groundY - h + 10, 10, 10);
        }

        // 4. Ground Line Neon
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#818cf8';
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(width, groundY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 5. Shadows for everything (Fake 3D Shadow Plane)
        state.items.forEach(item => drawShadow(ctx, item.x, groundY, item.width, (groundY - (item.y + item.height))/200));
        state.obstacles.forEach(obs => drawShadow(ctx, obs.x, groundY, obs.width, 0));
        drawShadow(ctx, state.player.x, groundY, state.player.width, (groundY - (state.player.y + state.player.height))/200);

        // 6. Draw Items (Floating 3D)
        state.items.forEach(item => {
            const bob = Math.sin(Date.now() / 200) * 8;
            
            // Glow
            ctx.save();
            ctx.shadowBlur = 20;
            ctx.shadowColor = item.type === 'shield' ? '#22c55e' : '#eab308';
            
            ctx.font = '32px Arial';
            ctx.fillText(item.label, item.x, item.y + 20 + bob);
            ctx.restore();
        });

        // 7. Draw Obstacles (3D Cubes)
        state.obstacles.forEach(obs => {
            if (obs.type === 'box') {
                draw3DCube(ctx, obs.x, obs.y, obs.width, obs.height, depthOffset, obs.color);
            } else {
                // Flying / Ground emojies with slight 3D offset
                ctx.font = '36px Arial';
                ctx.fillText(obs.label, obs.x, obs.y + obs.height);
            }
        });

        // 8. Draw Player (With tilt)
        ctx.save();
        ctx.translate(state.player.x + state.player.width / 2, state.player.y + state.player.height / 2);
        
        // Tilt forward when running, rotate when jumping
        const tilt = !state.player.grounded ? state.player.rotation : (0.1 + Math.sin(Date.now()/100)*0.05);
        ctx.rotate(tilt);
        
        // Boost Effect Trail (Speed lines)
        if (state.boostTimer > 0) {
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#eab308';
            ctx.globalAlpha = 0.5;
            ctx.font = '40px Arial';
            ctx.fillText(state.player.avatar || '🏃', -20, 0); // After image
            ctx.globalAlpha = 1;
        }
        
        ctx.font = '48px Arial'; // Bigger avatar
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(state.player.avatar || '🏃', 0, 0);
        
        // Shield Bubble
        if (state.player.shield) {
            ctx.beginPath();
            ctx.arc(0, 0, 35, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
            ctx.fill();
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Shine
            ctx.beginPath();
            ctx.arc(-15, -15, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fill();
        }
        
        ctx.restore();

        // 9. Particles (Glowing)
        state.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // 10. Foreground Overlay (Speed Lines)
        if (state.boostTimer > 0) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 2;
            for(let i=0; i<5; i++) {
                const y = Math.random() * height;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
        }

        state.frameId = requestAnimationFrame(loop);
    }, [myTheme, createParticles, draw3DCube, drawShadow, drawCloud, drawStar, handleGameOver]);

    const startGame = useCallback(() => {
        setGameState('PLAYING');
        gameStateRef.current = 'PLAYING';
        setScore(0);
        setActivePowerUp(null);
        
        // Reset Game Data
        gameRef.current = {
            player: { x: 80, y: 0, width: 40, height: 40, dy: 0, grounded: true, rotation: 0, shield: false, avatar: selectedCharacter.avatar },
            obstacles: [],
            items: [],
            particles: [],
            score: 0,
            speed: BASE_SPEED,
            boostTimer: 0,
            frameId: 0,
            bgOffset: 0
        };
        
        if (gameRef.current.frameId) cancelAnimationFrame(gameRef.current.frameId);
        gameRef.current.frameId = requestAnimationFrame(gameLoop);
    }, [selectedCharacter, gameLoop]);




    // Update player avatar in ref when selection changes
    useEffect(() => {
        gameRef.current.player = { ...gameRef.current.player, avatar: selectedCharacter.avatar } as any;
    }, [selectedCharacter]);


    const changeCharacter = (direction: 'prev' | 'next') => {
        if (direction === 'prev') {
            setSelectedCharIndex(prev => (prev === 0 ? CHARACTERS.length - 1 : prev - 1));
        } else {
            setSelectedCharIndex(prev => (prev === CHARACTERS.length - 1 ? 0 : prev + 1));
        }
    };

    // Input Handler
    useEffect(() => {
        const handleInput = (e: Event) => {
            if (gameStateRef.current !== 'PLAYING') return;

            // Prevent default behavior for game controls
            if (e.type === 'keydown') {
                const code = (e as KeyboardEvent).code;
                if (code === 'Space' || code === 'ArrowUp') {
                    e.preventDefault();
                    jump();
                }
            } else if (e.type === 'touchstart' || e.type === 'mousedown') {
                if ((e.target as HTMLElement).tagName === 'BUTTON') return;
                // e.preventDefault(); // Sometimes needed, but can block UI interaction
                jump();
            }
        };

        window.addEventListener('keydown', handleInput);
        window.addEventListener('touchstart', handleInput, { passive: false });
        window.addEventListener('mousedown', handleInput);

        return () => {
            window.removeEventListener('keydown', handleInput);
            window.removeEventListener('touchstart', handleInput);
            window.removeEventListener('mousedown', handleInput);
            if (gameRef.current.frameId) cancelAnimationFrame(gameRef.current.frameId);
        };
    }, [jump]);

    return (
        <div className="flex flex-col items-center gap-6 animate-fade-in pb-10 w-full" ref={containerRef}>
            <div className="flex items-center justify-between w-full max-w-2xl px-4 mb-2">
                <h2 className="text-2xl font-bold text-shadow italic" style={{color: 'rgb(var(--accent-color))'}}>SRTC Tech Runner 3D</h2>
                <div className="flex items-center gap-4">
                    <div className="glass-card px-3 py-1 rounded-full text-xs font-semibold text-gray-500">
                        High Score: <span className="text-primary text-base">{highScore}</span>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-3xl glass-card p-1 rounded-2xl relative overflow-hidden select-none border-4 border-slate-700/50 shadow-2xl">
                <canvas 
                    ref={canvasRef} 
                    className="w-full h-auto rounded-xl bg-black cursor-pointer block"
                    style={{ touchAction: 'none', minHeight: '360px' }} 
                />
                
                {/* HUD */}
                {gameState === 'PLAYING' && (
                    <>
                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full font-mono font-bold text-white shadow-lg border border-white/10 text-xl">
                            {score}
                        </div>
                        {activePowerUp && (
                            <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-sm font-bold text-white border border-white/20 animate-pulse flex items-center gap-2">
                                <span>{POWERUPS[activePowerUp as keyof typeof POWERUPS].icon}</span>
                                <span>ACTIVE</span>
                            </div>
                        )}
                    </>
                )}
                
                {/* Menu Overlay */}
                {gameState === 'MENU' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm text-white text-center p-4 z-10">
                        
                        {/* Character Selector */}
                        <div className="flex items-center gap-4 mb-6 bg-black/40 p-4 rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(99,102,241,0.2)]">
                            <button 
                                onClick={(e) => { e.stopPropagation(); changeCharacter('prev'); }} 
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-2xl"
                            >
                                ◀️
                            </button>
                            <div className="flex flex-col items-center w-24">
                                <div className="text-6xl mb-2 animate-bounce cursor-pointer hover:scale-110 transition-transform filter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                                    {selectedCharacter.avatar}
                                </div>
                                <span className="text-xs font-bold text-slate-300 whitespace-nowrap">{selectedCharacter.name}</span>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); changeCharacter('next'); }} 
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-2xl"
                            >
                                ▶️
                            </button>
                        </div>

                        <h2 className="text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 drop-shadow-sm tracking-wide italic">NEON RUNNER</h2>
                        
                        <div className="grid grid-cols-2 gap-4 mb-8 text-sm opacity-80">
                            <div className="bg-white/10 p-2 rounded-lg border border-white/5">แตะ / Spacebar<br/>กระโดด</div>
                            <div className="bg-white/10 p-2 rounded-lg border border-white/5">เก็บ {myTheme.item}<br/>รับคะแนน</div>
                        </div>

                        <button onClick={(e) => { e.stopPropagation(); startGame(); }} className="btn-accent px-8 py-3 rounded-full font-bold text-xl shadow-[0_0_20px_rgba(99,102,241,0.6)] hover:scale-105 transition-transform bg-gradient-to-r from-indigo-500 to-purple-600 border border-white/20">
                            START GAME
                        </button>
                    </div>
                )}

                {/* Game Over Overlay */}
                {gameState === 'GAME_OVER' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md text-white text-center p-4 z-10 animate-fade-in">
                        <h2 className="text-4xl font-bold mb-4 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">GAME OVER</h2>
                        <div className="bg-white/10 p-6 rounded-2xl border border-white/10 mb-6 w-64 backdrop-blur-xl">
                            <p className="text-sm text-slate-400 mb-1">SCORE</p>
                            <p className="text-5xl font-mono font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">{score}</p>
                            
                            <p className="text-xs text-yellow-400">Earned: {Math.floor(score/10)} Coins</p>

                            {score >= highScore && score > 0 && (
                                <div className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold inline-block border border-yellow-500/50 animate-pulse mt-2 shadow-[0_0_10px_rgba(234,179,8,0.3)]">
                                    🏆 NEW HIGH SCORE!
                                </div>
                            )}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); startGame(); }} className="bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform">
                            เล่นอีกครั้ง 🔄
                        </button>
                    </div>
                )}
            </div>

            {/* Leaderboard Section */}
            <div className="w-full max-w-2xl mt-4">
                <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-shadow flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
                            <span>🏆</span> อันดับยอดฝีมือ (Top 10)
                        </h3>
                        <button onClick={fetchLeaderboard} disabled={loadingLeaderboard} className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-lg transition-colors">
                            {loadingLeaderboard ? 'Loading...' : 'รีเฟรช'}
                        </button>
                    </div>
                    
                    <div className="overflow-hidden rounded-xl border border-gray-200/50">
                        <table className="w-full text-sm">
                            <thead className="bg-black/5">
                                <tr>
                                    <th className="px-4 py-3 text-center w-12 text-slate-500">#</th>
                                    <th className="px-4 py-3 text-left text-slate-600">เด็กช่าง</th>
                                    <th className="px-4 py-3 text-right text-slate-600">คะแนน</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white/50">
                                {loadingLeaderboard ? (
                                    <tr><td colSpan={3} className="text-center py-8"><LoadingSpinner size="sm"/></td></tr>
                                ) : leaderboard.length > 0 ? leaderboard.map((item, index) => {
                                    const isMe = item.id === student.studentId;
                                    const asset = ASSETS[item.dept as Department] || ASSETS['DEFAULT'];
                                    return (
                                        <tr key={item.id} className={`${isMe ? 'bg-orange-50' : 'hover:bg-white/80'} transition-colors`}>
                                            <td className="px-4 py-3 font-bold text-center text-slate-700">
                                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg" role="img" aria-label="avatar">{asset.avatar}</span>
                                                    <div className="flex flex-col">
                                                        <span className={`font-semibold ${isMe ? 'text-orange-700' : 'text-slate-700'}`}>
                                                            {item.name} {isMe && '(ฉัน)'}
                                                        </span>
                                                        <span className="text-sm text-slate-400">{item.dept}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-lg text-slate-800">
                                                {item.score.toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan={3} className="text-center py-6 text-slate-400">ยังไม่มีผู้ท้าชิง</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MusicRunnerGame;