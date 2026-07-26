import React from 'react';
import { useNavigate } from 'react-router-dom';
import { myPlayer, startMatchmaking, insertCoin } from 'playroomkit';
export default function(){
    const navigate = useNavigate();

    const handleSoloPlay = () => {
        navigate('/game'); // Navigate to the game environment
    }
    const handleMultiplayerPlay = async () => {
        let hash = ''
        await startMatchmaking(); // Start matchmaking to find a game
        hash = window.location.hash
        navigate('/game'+hash); // Navigate to the game environment
    }

    return (
        <section className="choice-of-play">
            <button onClick={handleSoloPlay}>Solo</button>
            <button onClick={handleMultiplayerPlay}>Multiplayer</button>
        </section>
    );
}