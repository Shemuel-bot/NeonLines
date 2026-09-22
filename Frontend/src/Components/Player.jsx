import {React, useEffect} from 'react';
import PlayerBall from "./PlayerBall.jsx";
import Brush from "./Brush.jsx";
import { getState, onPlayerJoin, myPlayer } from "playroomkit"

export default function Player({ player, color, resetSearch }) {
    useEffect(() => {
        onPlayerJoin(async (newPlayer) => {
            if (getState('clock') === 0) {
                await resetSearch();
            }
        });
    }, []);
    return (
        <>
            <PlayerBall player={player} color={color}/>
            <Brush player={player} color={color} />
        </>
    );
}