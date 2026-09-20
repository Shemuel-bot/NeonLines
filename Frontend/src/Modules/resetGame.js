import { Composite, Engine, Runner } from 'matter-js';
import { myPlayer } from 'playroomkit';

export default function resetGame({
    engineRef,
    runnerRef,
    bodiesRef,
    brushBodiesRef,
    projectilesRef,
    explosionsRef,
    lastShotTimeRef,
    lastSyncTimeRef,
    lastBrushSyncRef,
    aliveStartedAtRef,
    wasAliveRef,
    setAliveTime,
    setGameResetKey,
    resetPlayerState = true,
}) {
    if (runnerRef.current) {
        Runner.stop(runnerRef.current);
    }

    if (engineRef.current) {
        Composite.clear(engineRef.current.world, false);
        Engine.clear(engineRef.current);
    }

    engineRef.current = null;
    runnerRef.current = null;
    bodiesRef.current = {};
    brushBodiesRef.current = {};
    projectilesRef.current = [];
    explosionsRef.current = [];
    lastShotTimeRef.current = Date.now();
    lastSyncTimeRef.current = Date.now();
    lastBrushSyncRef.current = {};
    aliveStartedAtRef.current = null;
    wasAliveRef.current = true;

    if (resetPlayerState) {
        const player = myPlayer();
        player.setState('alive', true);
        player.setState('ink', 50);
        player.setState('clearBrush', false);
        player.setState('clearOldBrush', false);
        player.setState('visualBrushes', []);
        player.setState('activeProjectiles', []);
        player.setState('explosions', []);
        player.setState('pos', null);
        player.setState('spawnBrush', null);
        player.setState('lastProcessedBrushId', null);
    }

    setAliveTime(0);
    setGameResetKey((currentKey) => currentKey + 1);
}
