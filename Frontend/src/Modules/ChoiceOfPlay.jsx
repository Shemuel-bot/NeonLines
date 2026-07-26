import React from 'react';
import { useNavigate } from 'react-router-dom';
import { myPlayer, startMatchmaking, insertCoin, getState, setState } from 'playroomkit';
export default function(){
    const navigate = useNavigate();

    const handleSoloPlay = () => {
        localStorage.setItem('gameMode', 'solo');
        setState('clock', 0); 
        navigate('/game');
    }
    const handleMultiplayerPlay = async () => {
        localStorage.setItem('gameMode', 'multiplayer');
        let hash = ''
        await startMatchmaking(); 
        hash = window.location.hash
        navigate('/game'+hash); 
    }

    return (
        <section className="choice-of-play">
            <button onClick={handleSoloPlay}>Solo</button>
            <button onClick={handleMultiplayerPlay}>Multiplayer</button>
        </section>
    );
}