import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { myPlayer, startMatchmaking, insertCoin, getState, setState } from 'playroomkit';
import '../css/ChoiceOfPlay.css';
export default function(){
    const navigate = useNavigate();
    const [isMatching, setIsMatching] = useState(false);

    const handleSoloPlay = () => {
        localStorage.setItem('gameMode', 'solo');
        setState('clock', 0); 
        navigate('/game');
    }
    const handleMultiplayerPlay = async () => {
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