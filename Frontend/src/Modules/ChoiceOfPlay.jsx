import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { myPlayer, startMatchmaking, insertCoin, getState, setState } from 'playroomkit';
import '../css/ChoiceOfPlay.css';
export default function(){
    const navigate = useNavigate();
    const location = useLocation();
    const [isMatching, setIsMatching] = useState(false);
    const hasStartedAutoMatch = useRef(false);

    const startMultiplayer = async () => {
        if (isMatching) return;

        setIsMatching(true);
        localStorage.setItem('gameMode', 'multiplayer');
        try {
            await startMatchmaking();
            navigate(`/game${window.location.hash}`);
        } catch (error) {
            console.error('Failed to start multiplayer matchmaking:', error);
            setIsMatching(false);
        }
    };

    useEffect(() => {
        if (location.state?.autoMatch && !hasStartedAutoMatch.current) {
            hasStartedAutoMatch.current = true;
            startMultiplayer();
        }
    }, [location.state]);

    const handleSoloPlay = () => {
        localStorage.setItem('gameMode', 'solo');
        setState('clock', 0); 
        navigate('/game');
    }
    const handleMultiplayerPlay = async () => {
        await startMultiplayer();
    }

    return (
        <section className="choice-of-play">
            <button onClick={handleSoloPlay} disabled={isMatching}>Solo</button>
            <button onClick={handleMultiplayerPlay} disabled={isMatching} aria-busy={isMatching}>
                Multiplayer
            </button>
            {isMatching && (
                <div className="matchmaking-status">
                    <span className="loading-spinner" aria-hidden="true" />
                    <span>Finding match...</span>
                </div>
            )}
        </section>
    );
}