import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Engine, Runner, Bodies, Composite, Events, Body, Query } from 'matter-js'; 
import { usePlayersList, isHost, transferHost, myPlayer, usePlayerState, useMultiplayerState, getState, onPlayerJoin, onDisconnect} from 'playroomkit';
import useSound from 'use-sound'

import Player from '../Components/Player';
import EndGameManager from '../Components/EndGameManager';
import { ExplosionsRenderer, ProjectilesRenderer } from '../Components/explosiveBall';
import Countdown from '../Components/Countdown';
import resetGame from '../assets/helpers/resetGame';

import bounce from '../assets/SFX/bounce.mp3'
import bloop from '../assets/SFX/bloop.mp3'

const gunIconUrl = 'https://img.icons8.com/?size=100&id=UJ77tSjc1Hhv&format=png&color=000000';
const playerColors = ['#ff4757', '#2ed573', '#1e90ff'];


export default function GameEnv() {
    const players = usePlayersList();
    const [turretAngle] = usePlayerState(myPlayer(), 'turretAngle');
    const [isAlive] = usePlayerState(myPlayer(), 'alive');
    const [clock] = useMultiplayerState('clock', 5, { persist: true });
    const [play] = useSound(bounce)
    const [playDeath] = useSound(bloop)
    const bounceSound = new Audio(bounce)
    const [aliveTime, setAliveTime] = useState(0)
    const [gameResetKey, setGameResetKey] = useState(0)

    const playersRef = useRef(players); 
    const engineRef = useRef(null);
    const runnerRef = useRef(null);
    const bodiesRef = useRef({}); 
    const saberBodiesRef = useRef({});
    
    const projectilesRef = useRef([]); 
    const explosionsRef = useRef([]); // NEW: Tracks explosion coordinates
    const lastShotTimeRef = useRef(Date.now());
    const lastSyncTimeRef = useRef(Date.now()); 
    const lastPositionSyncRef = useRef(Date.now());
    const wasAliveRef = useRef(isAlive);
    const aliveStartedAtRef = useRef(null);

    const navigate = useNavigate();

    useEffect(() => {
        if (wasAliveRef.current === true && isAlive === false) {
            playDeath();
        }
        wasAliveRef.current = isAlive;
    }, [isAlive, playDeath]);

    useEffect(() => {
        const gameStarted = localStorage.getItem('gameMode') === 'solo' || clock === 0;
        if (aliveStartedAtRef.current === null && gameStarted && isAlive !== false) {
            aliveStartedAtRef.current = Date.now();
        }

        if (aliveStartedAtRef.current === null || !gameStarted || isAlive === false) return undefined;

        const updateAliveTime = () => {
            setAliveTime(Date.now() - aliveStartedAtRef.current);
        };

        updateAliveTime();
        const timer = setInterval(updateAliveTime, 1000);
        return () => clearInterval(timer);
    }, [clock, isAlive]);

    useEffect(() => {
        playersRef.current = players;
        
    }, [players]);

    useEffect(() => {
        const unsubscribe = onPlayerJoin((newPlayer) => {
            if (localStorage.getItem('gameMode') !== 'solo' && isHost() && getState('clock') === 0) {
                newPlayer.kick();
            }
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        const unsubscribe = onDisconnect((event) => {
            if (localStorage.getItem('gameMode') === 'solo') return;
            if (event.reason !== 'PLAYER_KICKED' && event.code !== 4999) return;

            window.setTimeout(() => {
                navigate('/choice-of-play?rematch=1', { replace: true });
            }, 0);
        });

        return unsubscribe;
    }, [navigate]);

    useEffect(() => {
        const alivePlayers = players.filter((player) => player.getState('alive') !== false);
        const isGameOver = players.length > 1
            ? clock === 0 && alivePlayers.length <= 1
            : alivePlayers.length === 0;
        const localPlayerWon = isGameOver && isAlive !== false;

        if (!localPlayerWon || !isHost()) return;

        const playerBody = bodiesRef.current[myPlayer().id];
        if (playerBody) {
            Body.setVelocity(playerBody, { x: 0, y: 0 });
            Body.setAngularVelocity(playerBody, 0);
            Body.setStatic(playerBody, true);
        }
    }, [players, clock, isAlive]);

    useEffect(() => {
        myPlayer().setState('ink', 50);
        myPlayer().setState('alive', true);
        
        const handleVisibilityChange = () => {
            if (document.hidden && isHost()) {
                const me = myPlayer();
                const nextHost = playersRef.current.find((p) => p.id !== me?.id);
                if (nextHost) {
                    transferHost(nextHost.id); 
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    const startPhysicsEngine = () => {
        engineRef.current = Engine.create();
        const engine = engineRef.current;
        const cw = window.innerWidth;
        const ch = window.innerHeight;
        const playerRadius = 25;
        const maxPlayerSpeed = 20;

        const turretBody = Bodies.rectangle(cw / 2, 50, 80, 80, { 
            isStatic: true, 
            label: 'Wall', 
            fillStyle: '#333' 
        });

        const walls = [
            turretBody,
            Bodies.rectangle(cw / 2, -50, cw, 100, { isStatic: true, label: 'Wall' }),
            Bodies.rectangle(-50, ch / 2, 100, ch, { isStatic: true, label: 'Wall' }),
            Bodies.rectangle(cw / 2, ch + 50, cw, 100, { isStatic: true, label: 'DeathFloor', fillStyle: 'red' }),
            Bodies.rectangle(cw + 50, ch / 2, 100, ch, { isStatic: true, label: 'Wall' })
        ];
        Composite.add(engine.world, walls);

        runnerRef.current = Runner.create();
        Runner.run(runnerRef.current, engine);

        Events.on(engine, 'collisionStart', (event) => {
            const pairs = event.pairs;
            pairs.forEach((pair) => {
                const { bodyA, bodyB } = pair;
                
                const isProjectileA = bodyA.label === 'Projectile';
                const isProjectileB = bodyB.label === 'Projectile';

                const isPlayer = bodyA.label === 'Player' || bodyB.label === 'Player' 
                if (isPlayer){
                    bounceSound.playbackRate = 3
                    bounceSound.play()
                }
                // FIX: If a projectile hits anything, flag it for instant explosion
                if (isProjectileA || isProjectileB) {
                    const projectileBody = isProjectileA ? bodyA : bodyB;
                    projectileBody.isExploding = true; 
                    
                    const otherBody = isProjectileA ? bodyB : bodyA;
                    if (otherBody.label !== 'DeathFloor') {
                        // It hit a player directly
                        const player = playersRef.current.find(p => p.id === otherBody.id);
                        if (player) player.setState('alive', false);
                    }
                } else if (bodyA.label === 'DeathFloor' || bodyB.label === 'DeathFloor') {
                    if (localStorage.getItem('gameMode') !== 'solo' && getState('clock') != 0) return
                    const otherBody = bodyA.label === 'DeathFloor' ? bodyB : bodyA;

                    
                    Composite.remove(engine.world, otherBody);
                    playersRef.current.find(p => p.id === otherBody.id)?.setState('alive', false);

                    
                }
            });
        });

        Events.on(engine, 'afterUpdate', () => {
            if (!bodiesRef.current) bodiesRef.current = {};

            const now = Date.now();
            const shouldSyncPositions = now - lastPositionSyncRef.current >= 1000 / 48;
            const alivePlayers = playersRef.current.filter((player) => player.getState('alive') !== false);
            const roundOver = playersRef.current.length > 1
                ? getState('clock') === 0 && alivePlayers.length <= 1
                : alivePlayers.length === 0;

            playersRef.current.forEach((p) => {
                const body = bodiesRef.current[p.id];
                const playerIsDead = p.getState('alive') === false;

                if (body && (playerIsDead || roundOver)) {
                    Body.setVelocity(body, { x: 0, y: 0 });
                    Body.setAngularVelocity(body, 0);
                    Body.setStatic(body, true);
                }

                if (body && !playerIsDead && !roundOver) {
                    const position = body.position;
                    const velocity = body.velocity;
                    const boundedPosition = {
                        x: Math.max(playerRadius, Math.min(cw - playerRadius, position.x)),
                        y: Math.max(playerRadius, Math.min(ch - playerRadius, position.y))
                    };
                    const crossedLeftOrRight = boundedPosition.x !== position.x;
                    const crossedTopOrBottom = boundedPosition.y !== position.y;
                    const crossedBoundary = crossedLeftOrRight || crossedTopOrBottom;

                    if (crossedBoundary) {
                        Body.setPosition(body, boundedPosition);
                        Body.setVelocity(body, {
                            x: crossedLeftOrRight && velocity.x * (position.x - boundedPosition.x) > 0 ? -velocity.x : velocity.x,
                            y: crossedTopOrBottom && velocity.y * (position.y - boundedPosition.y) > 0 ? -velocity.y : velocity.y
                        });
                    }
                }

                if (body && shouldSyncPositions) {
                    p.setState('pos', { x: body.position.x, y: body.position.y, angle: body.angle });
                }

                const saberState = p.getState('saber');
                const saberBody = saberBodiesRef.current[p.id];
                if (saberState?.active && !playerIsDead && !roundOver) {
                    const saberPosition = {
                        x: saberState.x,
                        y: saberState.y
                    };
                    const nextSaberBody = saberBody || Bodies.rectangle(saberPosition.x, saberPosition.y, 140, 14, {
                        label: 'Saber',
                        isStatic: true,
                        isSensor: true,
                        friction: 0
                    });
                    if (!saberBody) {
                        Composite.add(engine.world, nextSaberBody);
                        saberBodiesRef.current[p.id] = nextSaberBody;
                    }

                    const playerBodies = Object.values(bodiesRef.current);

                    Body.setPosition(nextSaberBody, saberPosition);
                    Body.setAngle(nextSaberBody, saberState.angle);

                    Query.collides(nextSaberBody, playerBodies).forEach((collision) => {
                        const playerBody = collision.bodyA.label === 'Player' ? collision.bodyA : collision.bodyB;
                        if (playerBody.label !== 'Player') return;

                        const dx = playerBody.position.x - saberPosition.x;
                        const dy = playerBody.position.y - saberPosition.y;
                        const length = Math.hypot(dx, dy) || 1;
                        const normal = { x: dx / length, y: dy / length };
                        const velocity = playerBody.velocity;
                        const velocityAlongNormal = velocity.x * normal.x + velocity.y * normal.y;
                        const reflectedVelocity = velocityAlongNormal < 0
                            ? {
                                x: velocity.x - 2 * velocityAlongNormal * normal.x,
                                y: velocity.y - 2 * velocityAlongNormal * normal.y
                            }
                            : velocity;
                        const push = Math.max(4, Math.hypot(velocity.x, velocity.y) * 0.35);

                        Body.setVelocity(playerBody, {
                            x: reflectedVelocity.x + normal.x * push,
                            y: reflectedVelocity.y + normal.y * push
                        });
                    });
                } else if (saberBody) {
                    Composite.remove(engine.world, saberBody);
                    delete saberBodiesRef.current[p.id];
                }
                
            });

            if (shouldSyncPositions) {
                lastPositionSyncRef.current = now;
            }

            if (!roundOver && now - lastShotTimeRef.current > 3000) { 
                lastShotTimeRef.current = now;
                
                const activePlayerIds = Object.keys(bodiesRef.current).filter(id => {
                    const p = playersRef.current.find(player => player.id === id);
                    return p && p.getState('alive') !== false;
                });

                if (activePlayerIds.length > 0) {
                    const projBody = Bodies.circle(cw / 2, 120, 15, { 
                        label: 'Projectile', 
                        restitution: 0.8, 
                        friction: 0.005,
                        density: 0.05 
                    });
                    
                    const targetId = activePlayerIds[Math.floor(Math.random() * activePlayerIds.length)];
                    const targetBody = bodiesRef.current[targetId];
                    
                    const dx = targetBody.position.x - projBody.position.x;
                    const dy = targetBody.position.y - projBody.position.y;
                    const angle = Math.atan2(dy, dx);

                    playersRef.current.forEach((player) => {
                        player.setState('turretAngle', angle);
                    });
                    
                    const speed = 12; 
                    Body.setVelocity(projBody, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
                    
                    Composite.add(engine.world, projBody);
                    projectilesRef.current.push({ id: Math.random().toString(), body: projBody });
                }
            }

            const activeProjectiles = [];
            const triggerRadius = 80;   
            const blastRadius = 250;    
            const blastForce = 0.15;    
            
            projectilesRef.current.forEach((proj) => {
                let exploded = false;

                // Explode if it hit an object (flagged in collisionStart)
                if (proj.body.isExploding) {
                    exploded = true;
                }

                Object.entries(bodiesRef.current).forEach(([pId, playerBody]) => {
                    if (exploded) return;
                    
                    const p = playersRef.current.find(player => player.id === pId);
                    if (!p || p.getState('alive') === false) return;

                    const dx = playerBody.position.x - proj.body.position.x;
                    const dy = playerBody.position.y - proj.body.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // Explode if proximity is triggered
                    if (dist < triggerRadius) {
                        exploded = true;
                    }
                });

                if (exploded) {
                    const explosionPosition = {
                        x: proj.body.position.x,
                        y: proj.body.position.y
                    };

                    // Apply shockwave forces
                    Object.entries(bodiesRef.current).forEach(([blastId, pb]) => {
                        const bp = playersRef.current.find(player => player.id === blastId);
                        if (!bp || bp.getState('alive') === false) return;

                        const pDx = pb.position.x - proj.body.position.x;
                        const pDy = pb.position.y - proj.body.position.y;
                        const pDist = Math.sqrt(pDx * pDx + pDy * pDy);
                        
                        if (pDist < blastRadius) {
                            const forceMagnitude = blastForce * (1 - (pDist / blastRadius));
                            const pAngle = Math.atan2(pDy, pDx);
                            
                            Body.applyForce(pb, pb.position, {
                                x: Math.cos(pAngle) * forceMagnitude,
                                y: Math.sin(pAngle) * forceMagnitude
                            });
                        }
                    });

                    // Remove body and record visual explosion coordinates
                    Composite.remove(engine.world, proj.body); 
                    explosionsRef.current.push({
                        id: proj.id,
                        x: explosionPosition.x,
                        y: explosionPosition.y,
                        timestamp: now
                    });
                } else {
                    activeProjectiles.push(proj); 
                }
            });
            
            projectilesRef.current = activeProjectiles;


            Object.entries(bodiesRef.current).forEach(([pId, playerBody]) => {
                const speed = Math.hypot(playerBody.velocity.x, playerBody.velocity.y);
                if (speed > maxPlayerSpeed){
                    Body.setVelocity(playerBody, {
                        x: (playerBody.velocity.x / speed) * maxPlayerSpeed,
                        y: (playerBody.velocity.y / speed) * maxPlayerSpeed
                    });
                }
            });

            // Clean up visual explosions older than 400ms
            explosionsRef.current = explosionsRef.current.filter(exp => now - exp.timestamp < 400);

            if (now - lastSyncTimeRef.current > 50) {
                myPlayer().setState('activeProjectiles', activeProjectiles.map(p => ({
                    id: p.id, x: p.body.position.x, y: p.body.position.y
                })));
                
                // Sync current visual explosions to all clients
                myPlayer().setState('explosions', explosionsRef.current.map(e => ({
                    id: e.id, x: e.x, y: e.y
                })));

                lastSyncTimeRef.current = now;
            }
        });
    };

    useEffect(() => {
        if (isHost() && !engineRef.current) {
            startPhysicsEngine();
        }

        if (!isHost() || !engineRef.current) return;
        if (!bodiesRef.current) bodiesRef.current = {};

        players.forEach((p) => {
            if (!bodiesRef.current[p.id]) {
                const startX = 100 + (Math.random() * Math.max(100, window.innerWidth - 200));
                const startY = 100 + (Math.random() * Math.max(100, window.innerHeight - 250));

                const ball = Bodies.circle(startX, startY, 25, {
                    label: 'Player',
                    id: p.id,
                    restitution: 1.1,
                    friction: 0.005
                });
                
                Composite.add(engineRef.current.world, ball);
                bodiesRef.current[p.id] = ball;

            }
        });
    }, [players, gameResetKey]);

    const handleNewMatch = async () => {
        const isMultiplayer = localStorage.getItem('gameMode') !== 'solo';

        resetGame({
            engineRef,
            runnerRef,
            bodiesRef,
            saberBodiesRef,
            projectilesRef,
            explosionsRef,
            lastShotTimeRef,
            lastSyncTimeRef,
            aliveStartedAtRef,
            wasAliveRef,
            setAliveTime,
            setGameResetKey,
            resetPlayerState: !isMultiplayer,
        });

        if (isMultiplayer) {
            await myPlayer().leaveRoom();
            navigate('/choice-of-play?rematch=1', { replace: true });
            return;
        }
    };

    const handleLeaveGame = async () => {
        const isMultiplayer = localStorage.getItem('gameMode') !== 'solo';
        resetGame({
            engineRef,
            runnerRef,
            bodiesRef,
            saberBodiesRef,
            projectilesRef,
            explosionsRef,
            lastShotTimeRef,
            lastSyncTimeRef,
            aliveStartedAtRef,
            wasAliveRef,
            setAliveTime,
            setGameResetKey,
            resetPlayerState: !isMultiplayer,
        });
        if (isMultiplayer){
            await myPlayer().leaveRoom();  
        }
        navigate('/')
        
    }

    useEffect(() => {
        const wasAlreadyInRoom = sessionStorage.getItem('inGameEnv');
        if (wasAlreadyInRoom) {
            myPlayer().leaveRoom();
            navigate('/');
            sessionStorage.removeItem('inGameEnv');
        } else {
            sessionStorage.setItem('inGameEnv', 'true');
        }
        return () => {
            if (!sessionStorage.getItem('refreshing')) {
                sessionStorage.removeItem('inGameEnv');
            }
        };
    }, [navigate]);

    const secondsAlive = Math.floor(aliveTime / 1000);
    const aliveMinutes = Math.floor(secondsAlive / 60).toString().padStart(2, '0');
    const aliveSeconds = (secondsAlive % 60).toString().padStart(2, '0');

    return (

        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
            <button onClick={handleLeaveGame} style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>
                    Leave Room
            </button>
            {
                localStorage.getItem('gameMode') === 'solo' ? (
                    <h1 style={{marginTop: '10%'}} className="clock">Solo Mode</h1>
                ) : (
                    <Countdown count={60} engine={engineRef.current}/>
                )
            }
            <EndGameManager key={gameResetKey} onNewMatch={handleNewMatch} />
            {isAlive !== false && (
                <div style={{
                    position: 'absolute',
                    top: '105px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: 'white',
                    fontSize: '24px',
                    zIndex: 10
                }}>
                    Time Alive: {aliveMinutes}:{aliveSeconds}
                </div>
            )}
            {/* Inline CSS for the shockwave animation */}
            <style>{`
                @keyframes shockwave {
                    0% { width: 0px; height: 0px; opacity: 1; border-width: 30px; }
                    100% { width: 500px; height: 500px; opacity: 0; border-width: 2px; }
                }
            `}</style>

            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '20px', backgroundColor: 'red', boxShadow: '0 0 10px red, 0 0 20px red' }} />
            
            <img
                src={gunIconUrl}
                alt="Turret"
                style={{
                    position: 'absolute',
                    top: '50px',
                    left: '50%',
                    width: '80px',
                    height: '80px',
                    objectFit: 'contain',
                    zIndex: 10,
                    transform: `translate(-50%, -50%) rotate(${turretAngle || 0}rad)`,
                    transformOrigin: 'center'
                }}
            />

            {players.map((player, index) => (
                <React.Fragment key={player.id}>
                    <ProjectilesRenderer player={player} />
                    {/* Render the explosions synced by the Host */}
                    <ExplosionsRenderer player={player} />
                    
                    {player.getState('alive') !== false ? (
                        <Player player={player} color={playerColors[index % playerColors.length]} />
                    ) : (
                        <div style={{position: 'absolute', top: 0, left: 0, color: 'white'}}>
                            Player {player.id} is out!
                        </div>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}