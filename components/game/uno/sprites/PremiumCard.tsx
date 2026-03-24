
import React, { useRef, useState, useMemo, useEffect } from 'react';
// @ts-ignore - Ignore missing export error due to version mismatch in typings
import { Container, Sprite, useTick, useApp } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { HoloFilter } from './HoloFilter';
import { UnoCard } from '../types';

// Constants
const LERP_FACTOR = 0.15; // Smoothness factor (lower = smoother/slower)
const HOVER_SCALE = 1.15;
const SHADOW_OFFSET_X = 10;
const SHADOW_OFFSET_Y = 15;

interface PremiumCardProps {
    card: UnoCard; // Data model
    x: number;
    y: number;
    rotation?: number; // Base rotation
    interactive?: boolean;
    onClick?: () => void;
}

// Map Card Data to Image URLs (Using the URLs from previous context)
const FRONT_URL = "https://firebasestorage.googleapis.com/v0/b/srtc-student-registration.firebasestorage.app/o/GAMES%2FUNO%2FUNO%20%E0%B8%AB%E0%B8%99%E0%B9%89%E0%B8%B2.png?alt=media&token=1d533b0b-3d93-455a-9be6-bf56d66ebb15";

const PremiumCard: React.FC<PremiumCardProps> = ({ card, x, y, rotation = 0, interactive = true, onClick }) => {
    const app = useApp();
    const containerRef = useRef<PIXI.Container>(null);
    const filterRef = useRef<HoloFilter | null>(null);
    
    // Animation Targets
    const targetScale = useRef(1);
    const targetRotation = useRef(rotation);
    const targetZIndex = useRef(1);
    const targetShadowOffset = useRef({ x: 5, y: 5 });
    
    // Shader State
    const [isHovered, setIsHovered] = useState(false);

    // Initialize Filter
    const holoFilter = useMemo(() => new HoloFilter(), []);
    useEffect(() => {
        filterRef.current = holoFilter;
    }, [holoFilter]);

    // Color Tinting based on Card Type
    const tintColor = useMemo(() => {
        switch (card.color) {
            case 'RED': return 0xFF5555;
            case 'BLUE': return 0x5555FF;
            case 'GREEN': return 0x55AA55;
            case 'YELLOW': return 0xFFFF55;
            default: return 0xFFFFFF; // Black/Wild
        }
    }, [card.color]);

    // --- Interaction Handlers ---
    const onPointerOver = () => {
        if (!interactive) return;
        setIsHovered(true);
        targetScale.current = HOVER_SCALE;
        targetRotation.current = 0; // Straighten up
        targetZIndex.current = 100; // Bring to front
        
        // Cursor style
        if (app.view.style) app.view.style.cursor = 'pointer';
    };

    const onPointerOut = () => {
        if (!interactive) return;
        setIsHovered(false);
        targetScale.current = 1;
        targetRotation.current = rotation; // Return to original angle
        targetZIndex.current = 1;
        
        if (app.view.style) app.view.style.cursor = 'default';
    };

    const onPointerMove = (e: PIXI.FederatedPointerEvent) => {
        if (!isHovered || !containerRef.current) return;
        
        // Calculate mouse relative to card center for 3D effect calculation
        const local = containerRef.current.toLocal(e.global);
        
        // Update Shader Uniform
        // Normalize -1 to 1 based on card width approx 100px
        holoFilter.mouse.x = local.x / 50;
        holoFilter.mouse.y = local.y / 70;

        // Shadow moves opposite to light source (mouse)
        targetShadowOffset.current = {
            x: SHADOW_OFFSET_X + (local.x * -0.1),
            y: SHADOW_OFFSET_Y + (local.y * -0.1)
        };
    };

    // --- Game Loop (60 FPS) ---
    useTick((delta: any) => {
        if (!containerRef.current) return;

        // 1. Lerp Scale
        const currentScale = containerRef.current.scale.x;
        const nextScale = currentScale + (targetScale.current - currentScale) * LERP_FACTOR;
        containerRef.current.scale.set(nextScale);

        // 2. Lerp Rotation
        const currentRot = containerRef.current.rotation;
        const nextRot = currentRot + (targetRotation.current - currentRot) * LERP_FACTOR;
        containerRef.current.rotation = nextRot;

        // 3. Update Z-Index (Pixi SortableChildren)
        containerRef.current.zIndex = targetZIndex.current;

        // 4. Update Shader Time & Intensity
        if (filterRef.current) {
            filterRef.current.time += 0.01 * Number(delta);
            
            // Lerp intensity
            const currentIntensity = filterRef.current.intensity;
            const targetIntensity = isHovered ? 1.0 : 0.0;
            filterRef.current.intensity = currentIntensity + (targetIntensity - currentIntensity) * 0.05;
        }
    });

    return (
        <Container
            ref={containerRef}
            x={x}
            y={y}
            rotation={rotation}
            eventMode={interactive ? 'static' : 'none'}
            onPointerOver={onPointerOver}
            onPointerOut={onPointerOut}
            onPointerMove={onPointerMove}
            onPointerTap={onClick}
            sortableChildren={true}
        >
            {/* 1. Dynamic Shadow */}
            {/* We draw a black rounded rect for shadow instead of blurring a sprite for performance */}
            <Sprite
                image={FRONT_URL} // Use same shape
                tint={0x000000}
                alpha={isHovered ? 0.3 : 0.0} // Show shadow mainly on lift
                anchor={0.5}
                x={targetShadowOffset.current.x}
                y={targetShadowOffset.current.y}
                scale={0.95} // Shadow slightly smaller
            />

            {/* 2. Card Face */}
            <Sprite
                image={FRONT_URL}
                anchor={0.5}
                tint={tintColor}
                filters={[holoFilter]} // Apply custom shader
                width={100} // Standard Uno size approx
                height={150}
            />
            
            {/* 3. Text Overlay (Value) */}
            {/* Using simple Pixi Text for the number/icon */}
            {/* Note: In a real app, use BitmapText for performance or pre-rendered sprites */}
        </Container>
    );
};

export default PremiumCard;
