'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    z: number;
    originX: number;
    originY: number;
    originZ: number;
    length: number;
    color: string;
    opacity: number;
}

export const ParticleField = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Mouse position (target)
    const mouseRef = useRef({ x: 0, y: 0 });
    // Current center position of the field (interpolated)
    const timeRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;

        // Initialize mouse off-screen so it doesn't bunch up initially
        mouseRef.current = { x: -1000, y: -1000 };

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const particles: Particle[] = [];
        const particleCount = 2000;

        // Google Antigravity-like palette (Blue dominant)
        const colors = [
            '#2563eb', // Blue 600
            '#3b82f6', // Blue 500
            '#60a5fa', // Blue 400
            '#93c5fd', // Blue 300
            '#1d4ed8', // Blue 700
        ];

        // Initialize particles in a wide volume covering the screen
        for (let i = 0; i < particleCount; i++) {
            const x = (Math.random() - 0.5) * width * 2.5;
            const y = (Math.random() - 0.5) * height * 2.5;
            const z = Math.random() * 2000; // Depth

            particles.push({
                x: x,
                y: y,
                z: z,
                originX: x,
                originY: y,
                originZ: z,
                length: Math.random() * 4 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                opacity: Math.random() * 0.6 + 0.2
            });
        }

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current.x = e.clientX;
            mouseRef.current.y = e.clientY;
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            timeRef.current += 0.01; // Wave speed

            const cx = width / 2;
            const cy = height / 2;

            // Mouse position relative to center (for 3D calculation context)
            const mx = mouseRef.current.x - cx;
            const my = mouseRef.current.y - cy;

            particles.forEach(p => {
                // 1. Wave Motion (Floating)
                // Use sine waves based on position and time to create organic "water" feel
                const waveX = Math.sin(timeRef.current + p.originY * 0.002) * 20;
                const waveY = Math.cos(timeRef.current + p.originX * 0.002) * 20;
                const waveZ = Math.sin(timeRef.current * 0.5 + p.originX * 0.002) * 50;

                let currentX = p.originX + waveX;
                let currentY = p.originY + waveY;
                let currentZ = p.originZ + waveZ;

                // 2. Magnetic Mouse Effect (Density Increase)
                // Calculate distance from particle to mouse (in 2D projection approximation or 3D)
                // We'll do it in "world space" relative to camera center
                const dx = mx - currentX;
                const dy = my - currentY;
                // We ignore Z distance for the "magnet" to make it feel like a 2D interaction on the screen plane
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Interaction Radius
                const radius = 400;

                if (dist < radius) {
                    // Calculate pull factor (0 to 1, stronger when closer)
                    // Using a smooth curve (ease-in-out like)
                    const force = (radius - dist) / radius;
                    const ease = force * force; // Non-linear pull

                    // Pull particle towards mouse
                    // "Dense" means they get closer to the mouse
                    currentX += dx * ease * 0.6; // 0.6 is strength
                    currentY += dy * ease * 0.6;
                }

                // Project 3D to 2D
                const focalLength = 800;
                // Infinite depth loop for Z
                currentZ -= 0; // No forward movement, just floating

                const scale = focalLength / (focalLength + currentZ);

                const x2d = cx + currentX * scale;
                const y2d = cy + currentY * scale;

                // Orientation: Point towards the flow or just radial?
                // For "wave" feel, maybe align with the wave vector? 
                // Or just keep them radial to center for clean look. 
                // Let's try aligning slightly with the mouse attraction if active.

                let angle = Math.atan2(y2d - cy, x2d - cx); // Default radial

                // Dimensions
                const drawLength = p.length * scale * 1.5;
                const thickness = 5 * scale;

                // Draw
                ctx.save();
                ctx.translate(x2d, y2d);
                ctx.rotate(angle);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.opacity;

                ctx.beginPath();
                ctx.roundRect(-drawLength / 2, -thickness / 2, drawLength, thickness, thickness);
                ctx.fill();

                ctx.restore();
            });

            requestAnimationFrame(animate);
        };

        const animationId = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationId);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
};
