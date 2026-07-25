import React from 'react';
import { useNavigate } from 'react-router-dom';
import { myPlayer, startMatchmaking, insertCoin } from 'playroomkit';
export default function(){
    const navigate = useNavigate();
    const handlePlay = async () => {
        let hash = ''
        await startMatchmaking(); // Start matchmaking to find a game
        hash = window.location.hash
        navigate('/game'+hash); // Navigate to the game environment
    }

    return (
        <section className="choice-of-play">
            <button>Solo</button>
            <button onClick={handlePlay}>Multiplayer</button>
        </section>
    );
}