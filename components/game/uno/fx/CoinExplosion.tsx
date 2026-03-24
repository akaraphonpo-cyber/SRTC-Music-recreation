
import React, { useEffect, useRef, useMemo } from 'react';
// @ts-ignore - Ignore missing export error due to version mismatch in typings
import { Container, useTick, useApp } from '@pixi/react';
import * as PIXI from 'pixi.js';

interface CoinExplosionProps {
    active: boolean;
    startX?: number; // Defaults to screen center
    startY?: number; // Defaults to screen center
    targetX: number;
    targetY: number;
    onComplete?: () => void;
    count?: number;
}

interface Particle {
    sprite: PIXI.Sprite;
    vx: number;
    vy: number;
    life: number;
    phase: 'BURST' | 'GATHER';
    delay: number;
    spinSpeed: number;
}

const CoinExplosion: React.FC<CoinExplosionProps> = ({ 
    active, 
    startX, 
    startY, 
    targetX, 
    targetY, 
    onComplete, 
    count = 60 
}) => {
    const app = useApp();
    const containerRef = useRef<PIXI.Container>(null);
    const particlesRef = useRef<Particle[]>([]);
    
    // 1. Generate Coin Texture Once
    const coinTexture = useMemo(() => {
        const g = new PIXI.Graphics();
        // Outer Ring
        g.lineStyle(2, 0xB45309); // Dark Orange/Brown
        g.beginFill(0xF59E0B); // Gold
        g.drawCircle(0, 0, 12);
        g.endFill();
        // Inner Shine
        g.beginFill(0xFCD34D); // Light Gold
        g.drawCircle(-3, -3, 4);
        g.endFill();
        // Dollar Sign / Symbol approximation
        g.lineStyle(2, 0xB45309);
        g.moveTo(0, -6);
        g.lineTo(0, 6);
        
        return app.renderer.generateTexture(g);
    }, [app]);

    // 2. Spawn Logic
    useEffect(() => {
        if (active && containerRef.current) {
            // Clean up old particles if any
            particlesRef.current.forEach(p => p.sprite.destroy());
            particlesRef.current = [];

            const spawnX = startX ?? app.screen.width / 2;
            const spawnY = startY ?? app.screen.height / 2;

            for (let i = 0; i < count; i++) {
                const sprite = new PIXI.Sprite(coinTexture);
                sprite.anchor.set(0.5);
                sprite.x = spawnX;
                sprite.y = spawnY;
                sprite.scale.set(0); // Start invisible/small

                // Random Physics
                const angle = Math.random() * Math.PI * 2;
                const force = 10 + Math.random() * 15; // Burst power
                
                containerRef.current.addChild(sprite);

                particlesRef.current.push({
                    sprite,
                    vx: Math.cos(angle) * force,
                    vy: Math.sin(angle) * force,
                    life: 1.0,
                    phase: 'BURST',
                    delay: 30 + Math.random() * 30, // Frames before gathering (0.5s - 1s)
                    spinSpeed: 0.1 + Math.random() * 0.2
                });
            }
        }
    }, [active, startX, startY, count, coinTexture, app]);

    // 3. Animation Loop (60 FPS)
    useTick((delta: any) => {
        if (!active || particlesRef.current.length === 0) return;

        let completedCount = 0;
        const d = Number(delta);

        particlesRef.current.forEach(p => {
            const { sprite } = p;

            // --- ANIMATION: Spin ---
            sprite.rotation += p.spinSpeed * d;
            // Simulate 3D flip
            sprite.scale.x = Math.sin(sprite.rotation) * 1; 
            
            // Pop in effect
            if (sprite.scale.y < 1) sprite.scale.y += 0.1 * d;

            if (p.phase === 'BURST') {
                // --- PHYSICS: Explosion ---
                const nextX = sprite.x + p.vx * d;
                const nextY = sprite.y + p.vy * d;
                
                // Gravity
                p.vy += 0.8 * d;
                // Friction
                p.vx *= 0.95;
                p.vy *= 0.95;

                sprite.x = nextX;
                sprite.y = nextY;

                // Countdown to Gather
                p.delay -= d;
                if (p.delay <= 0) {
                    p.phase = 'GATHER';
                }

            } else {
                // --- PHYSICS: Magnetism (Lerp) ---
                // Calculate distance to target
                const dx = targetX - sprite.x;
                const dy = targetY - sprite.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist < 20) {
                    // Arrived
                    sprite.alpha = 0; // Hide
                    completedCount++;
                } else {
                    // Move towards target
                    // Non-linear lerp: gets faster as it gets closer or just smooth snap
                    const speed = 0.15 * d; 
                    sprite.x += dx * speed;
                    sprite.y += dy * speed;
                    
                    // Shrink slightly as it enters the target
                    if (dist < 100) {
                        sprite.scale.set(sprite.scale.y * 0.9);
                    }
                }
            }
        });

        // Cleanup if all done
        if (completedCount >= particlesRef.current.length) {
            if (onComplete) {
                // Only call once
                particlesRef.current = [];
                containerRef.current?.removeChildren();
                onComplete();
            }
        }
    });

    return <Container ref={containerRef} />;
};

export default CoinExplosion;
