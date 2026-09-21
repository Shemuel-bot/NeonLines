import { React, useRef } from 'react';
import { usePlayerState, myPlayer } from 'playroomkit';

export default function Brush({ player, color }) {
    const lastSaberSentAt = useRef(0);
    const [saber] = usePlayerState(player, 'saber');

    // FIX: Safely check if this player object belongs to the local user
    const isMe = myPlayer()?.id === player.id;

    const sendSaberPosition = (e) => {
        if (!isMe || !myPlayer().getState('alive')) return;
        const now = Date.now();
        if (now - lastSaberSentAt.current < 1000 / 48) return;

        lastSaberSentAt.current = now;
        const currentSaber = player.getState('saber');
        const angle = currentSaber?.angle ?? Math.atan2(
            e.clientY - window.innerHeight / 2,
            e.clientX - window.innerWidth / 2
        );

        player.setState('saber', {
            x: e.clientX / window.innerWidth,
            y: e.clientY / window.innerHeight,
            angle: e.ctrlKey ? angle + e.movementX * 0.02 : angle,
            active: true
        });
    };

    const handleMouseMove = (e) => {
        sendSaberPosition(e);
    };

    if (!myPlayer()?.getState('alive')) return null;


    return (
        <div
            onMouseMove={handleMouseMove}
            style={{ 
                width: '100vw', 
                height: '100vh', 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                zIndex: 1,
                pointerEvents: isMe ? 'auto' : 'none' 
            }}
        >
            {saber?.active && (
                <div
                    className="lightsaber"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '140px',
                        height: '14px',
                        background: `linear-gradient(90deg, #f3f3f3 0 12%, ${color || '#b3ff00'} 12% 100%)`,
                        boxShadow: `0 0 6px #fff, 0 0 14px ${color || '#b3ff00'}, 0 0 28px ${color || '#b3ff00'}`,
                        borderRadius: '999px',
                        pointerEvents: 'none',
                        zIndex: 6,
                        transform: `translate(${saber.x * window.innerWidth}px, ${saber.y * window.innerHeight}px) translate(-50%, -50%) rotate(${saber.angle}rad)`
                    }}
                >
                    <div style={{
                        position: 'absolute',
                        right: 0,
                        top: '3px',
                        width: '12px',
                        height: '8px',
                        borderRadius: '0 999px 999px 0',
                        backgroundColor: '#fff',
                        boxShadow: '0 0 5px #fff'
                    }} />
                </div>
            )}
        </div>
    );
}