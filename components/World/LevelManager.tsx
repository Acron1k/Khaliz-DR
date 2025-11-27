/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text3D, Center } from '@react-three/drei';
import { v4 as uuidv4 } from 'uuid';
import { useStore, GEMINI_TARGET } from '../../store';
import { GameObject, ObjectType, LANE_WIDTH, SPAWN_DISTANCE, REMOVE_DISTANCE, GameStatus, GEMINI_COLORS } from '../../types';
import { audio } from '../System/Audio';

// Geometry Constants
const TREE_BODY = new THREE.ConeGeometry(0.9, 2.8, 8);
const TREE_STUMP = new THREE.CylinderGeometry(0.22, 0.22, 0.6);

const SNOW_SPHERE_L = new THREE.SphereGeometry(0.65, 16, 16);
const SNOW_SPHERE_M = new THREE.SphereGeometry(0.48, 16, 16);
const SNOW_SPHERE_S = new THREE.SphereGeometry(0.32, 16, 16);

const RAMP_GEO = new THREE.BoxGeometry(2.8, 0.25, 2.5);

const CASH_GEO = new THREE.BoxGeometry(0.7, 0.25, 0.45);
const CASH_STRAP = new THREE.BoxGeometry(0.72, 0.27, 0.12);

const SHADOW_LETTER_GEO = new THREE.PlaneGeometry(3.5, 1);
const SHADOW_CIRCLE_GEO = new THREE.CircleGeometry(0.9, 16);
const SHADOW_RECT_GEO = new THREE.PlaneGeometry(0.8, 0.5);
const SHADOW_RAMP_GEO = new THREE.PlaneGeometry(2.8, 2.5);

const PARTICLE_COUNT = 400;
const MIN_GAP = 15;

const FONT_URL = "https://cdn.jsdelivr.net/npm/three/examples/fonts/helvetiker_bold.typeface.json";

// Birthday colors for particles
const BIRTHDAY_COLORS = ['#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444'];

// --- Particle System ---
const ParticleSystem: React.FC = () => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => new Array(PARTICLE_COUNT).fill(0).map(() => ({
    life: 0,
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    color: new THREE.Color()
  })), []);

  useEffect(() => {
    const handleExplosion = (e: CustomEvent) => {
      const { position, color } = e.detail;
      let spawned = 0;
      const burstAmount = 40;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        if (p.life <= 0) {
          p.life = 0.9 + Math.random() * 0.5;
          p.pos.set(position[0], position[1], position[2]);
          
          p.vel.set(
            (Math.random() - 0.5) * 10,
            (Math.random() * 6) + 3,
            (Math.random() - 0.5) * 10
          );
          
          // Use birthday colors for burst
          const useColor = Math.random() > 0.5 ? color : BIRTHDAY_COLORS[Math.floor(Math.random() * BIRTHDAY_COLORS.length)];
          p.color.set(useColor);
          spawned++;
          if (spawned >= burstAmount) break;
        }
      }
    };
    
    window.addEventListener('particle-burst', handleExplosion as any);
    return () => window.removeEventListener('particle-burst', handleExplosion as any);
  }, [particles]);

  useFrame((state, delta) => {
    if (!mesh.current) return;
    const safeDelta = Math.min(delta, 0.1);

    particles.forEach((p, i) => {
      if (p.life > 0) {
        p.life -= safeDelta;
        p.pos.addScaledVector(p.vel, safeDelta);
        p.vel.y -= safeDelta * 18;
        
        dummy.position.copy(p.pos);
        const scale = p.life * 0.35;
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        
        mesh.current!.setMatrixAt(i, dummy.matrix);
        mesh.current!.setColorAt(i, p.color);
      } else {
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.current!.setMatrixAt(i, dummy.matrix);
      }
    });
    
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, PARTICLE_COUNT]}>
      <boxGeometry args={[0.2, 0.2, 0.2]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
};

const getRandomLane = (laneCount: number) => {
  const max = Math.floor(laneCount / 2);
  return Math.floor(Math.random() * (max * 2 + 1)) - max;
};

export const LevelManager: React.FC = () => {
  const { 
    status, 
    speed, 
    collectGem, 
    collectLetter, 
    collectedLetters,
    laneCount,
    setDistance
  } = useStore();
  
  const objectsRef = useRef<GameObject[]>([]);
  const [renderTrigger, setRenderTrigger] = useState(0);
  const prevStatus = useRef(status);

  const playerObjRef = useRef<THREE.Object3D | null>(null);
  const distanceTraveled = useRef(0);
  
  const nextYearIndexToSpawn = useRef(0);
  const activeLetterOnTrack = useRef(false);
  const distanceSinceLastYear = useRef(0);
  
  // УВЕЛИЧЕНО В 2 РАЗА - игра длится дольше
  const YEAR_SPAWN_INTERVAL = 160;

  useEffect(() => {
    const isRestart = status === GameStatus.PLAYING && prevStatus.current === GameStatus.GAME_OVER;
    const isMenuReset = status === GameStatus.MENU;
    const isVictoryReset = status === GameStatus.PLAYING && prevStatus.current === GameStatus.VICTORY;

    if (isMenuReset || isRestart || isVictoryReset) {
      objectsRef.current = [];
      setRenderTrigger(t => t + 1);
      distanceTraveled.current = 0;
      activeLetterOnTrack.current = false;
      nextYearIndexToSpawn.current = 0;
      distanceSinceLastYear.current = 0;
    } else if (status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) {
      setDistance(Math.floor(distanceTraveled.current));
    }
    prevStatus.current = status;
  }, [status, setDistance]);

  useFrame((state) => {
    if (!playerObjRef.current) {
      const group = state.scene.getObjectByName('PlayerGroup');
      if (group && group.children.length > 0) {
        playerObjRef.current = group.children[0];
      }
    }
  });

  useFrame((state, delta) => {
    if (status !== GameStatus.PLAYING) return;

    const safeDelta = Math.min(delta, 0.05);
    const dist = speed * safeDelta;
    
    distanceTraveled.current += dist;
    distanceSinceLastYear.current += dist;

    let hasChanges = false;
    let playerPos = new THREE.Vector3(0, 0, 0);
    if (playerObjRef.current) playerObjRef.current.getWorldPosition(playerPos);

    const currentObjects = objectsRef.current;
    const keptObjects: GameObject[] = [];

    for (const obj of currentObjects) {
      obj.position[2] += dist;

      let keep = true;
      if (obj.active) {
        const zThreshold = 1.2;
        const inZZone = Math.abs(obj.position[2] - playerPos.z) < zThreshold;
        
        if (inZZone) {
          const dx = Math.abs(obj.position[0] - playerPos.x);
          
          if (dx < 1.0) {
            if (obj.type === ObjectType.OBSTACLE) {
              const playerBottom = playerPos.y;
              const obstacleHeight = 1.8;
              
              if (playerBottom < obstacleHeight) {
                window.dispatchEvent(new Event('player-hit'));
                obj.active = false;
                hasChanges = true;
                window.dispatchEvent(new CustomEvent('particle-burst', { 
                  detail: { position: obj.position, color: '#ffffff' } 
                }));
              }
            } else if (obj.type === ObjectType.RAMP) {
              // АВТОПРЫЖОК С ТРАМПЛИНА
              if (playerPos.y < 0.5) {
                window.dispatchEvent(new Event('player-ramp'));
                obj.active = false;
                hasChanges = true;
              }
            } else {
              const dy = Math.abs(obj.position[1] - playerPos.y);
              if (dy < 2.8) {
                if (obj.type === ObjectType.GEM) {
                  collectGem(obj.points || 100);
                  audio.playGemCollect();
                }
                if (obj.type === ObjectType.LETTER && obj.targetIndex !== undefined) {
                  collectLetter(obj.targetIndex);
                  audio.playLetterCollect();
                  activeLetterOnTrack.current = false;
                }
                
                window.dispatchEvent(new CustomEvent('particle-burst', { 
                  detail: { 
                    position: obj.position, 
                    color: obj.color || '#fbbf24' 
                  } 
                }));

                obj.active = false;
                hasChanges = true;
              }
            }
          }
        }
      }

      if (obj.position[2] > REMOVE_DISTANCE) {
        keep = false;
        hasChanges = true;
        if (obj.type === ObjectType.LETTER) {
          activeLetterOnTrack.current = false;
        }
      }

      if (keep) keptObjects.push(obj);
    }

    // Spawning
    let furthestZ = -20;
    if (keptObjects.length > 0) {
      furthestZ = Math.min(...keptObjects.map(o => o.position[2]));
    }
    
    const dynamicGap = MIN_GAP + (speed * 0.25);

    if (furthestZ > -SPAWN_DISTANCE + dynamicGap) {
      const spawnZ = -SPAWN_DISTANCE - Math.random() * 20;
      
      const allYearsSpawned = nextYearIndexToSpawn.current >= GEMINI_TARGET.length;
      const shouldSpawnYear = !allYearsSpawned && 
                              !activeLetterOnTrack.current && 
                              distanceSinceLastYear.current >= YEAR_SPAWN_INTERVAL;
      
      if (shouldSpawnYear) {
        const idx = nextYearIndexToSpawn.current;
        const lane = getRandomLane(laneCount);
        const val = GEMINI_TARGET[idx];
        const color = GEMINI_COLORS[idx];

        keptObjects.push({
          id: uuidv4(),
          type: ObjectType.LETTER,
          position: [lane * LANE_WIDTH, 1.2, spawnZ],
          active: true,
          color: color,
          value: val,
          targetIndex: idx
        });
        
        activeLetterOnTrack.current = true;
        nextYearIndexToSpawn.current++;
        distanceSinceLastYear.current = 0;
        hasChanges = true;

      } else {
        const roll = Math.random();
        const maxLane = Math.floor(laneCount / 2);
        
        if (roll < 0.55) {
          // OBSTACLES (55%)
          const availableLanes = [];
          for (let i = -maxLane; i <= maxLane; i++) availableLanes.push(i);
          availableLanes.sort(() => Math.random() - 0.5);
          
          let countToSpawn = Math.floor(Math.random() * 3) + 1;
          if (countToSpawn >= laneCount) countToSpawn = laneCount - 1;

          const obstacleTypes = ['tree', 'snowman', 'rock', 'cone'];
          
          for (let i = 0; i < countToSpawn; i++) {
            const lane = availableLanes[i];
            keptObjects.push({
              id: uuidv4(),
              type: ObjectType.OBSTACLE,
              position: [lane * LANE_WIDTH, 0, spawnZ],
              active: true,
              color: obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)]
            });
          }
          hasChanges = true;
          
        } else if (roll < 0.78) {
          // RAMP + MONEY (23%)
          const lane = getRandomLane(laneCount);
          const laneX = lane * LANE_WIDTH;
          
          keptObjects.push({
            id: uuidv4(),
            type: ObjectType.RAMP,
            position: [laneX, 0, spawnZ],
            active: true,
            color: '#ec4899'
          });
          
          // Money above ramp
          keptObjects.push({
            id: uuidv4(),
            type: ObjectType.GEM,
            position: [laneX, 4.0, spawnZ + 3],
            active: true,
            color: '#fbbf24',
            points: 300
          });
          hasChanges = true;
          
        } else {
          // MONEY LINE (22%)
          const lane = getRandomLane(laneCount);
          const count = Math.floor(Math.random() * 4) + 2;
          
          for (let i = 0; i < count; i++) {
            keptObjects.push({
              id: uuidv4(),
              type: ObjectType.GEM,
              position: [lane * LANE_WIDTH, 1.0, spawnZ - (i * 6)],
              active: true,
              color: '#10b981',
              points: 100
            });
          }
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      objectsRef.current = keptObjects;
      setRenderTrigger(t => t + 1);
    }
  });

  return (
    <group>
      <ParticleSystem />
      {objectsRef.current.map(obj => {
        if (!obj.active) return null;
        return <GameEntity key={obj.id} data={obj} />;
      })}
    </group>
  );
};

const GameEntity: React.FC<{ data: GameObject }> = React.memo(({ data }) => {
  const groupRef = useRef<THREE.Group>(null);
  const visualRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.position.set(data.position[0], 0, data.position[2]);
    }

    if (visualRef.current) {
      const baseHeight = data.position[1];
      
      if (data.type === ObjectType.GEM) {
        visualRef.current.rotation.y += delta * 4;
        visualRef.current.position.y = baseHeight + Math.sin(state.clock.elapsedTime * 5) * 0.15;
      } else if (data.type === ObjectType.LETTER) {
        visualRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2.5) * 0.25;
        visualRef.current.position.y = baseHeight + Math.sin(state.clock.elapsedTime * 2.5) * 0.15;
      }
      
      if (data.type !== ObjectType.OBSTACLE && data.type !== ObjectType.RAMP && shadowRef.current) {
        shadowRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 5) * 0.12);
      }
    }
  });

  const shadowGeo = useMemo(() => {
    if (data.type === ObjectType.LETTER) return SHADOW_LETTER_GEO;
    if (data.type === ObjectType.GEM) return SHADOW_RECT_GEO;
    if (data.type === ObjectType.RAMP) return SHADOW_RAMP_GEO;
    return SHADOW_CIRCLE_GEO;
  }, [data.type]);

  return (
    <group ref={groupRef} position={[data.position[0], 0, data.position[2]]}>
      {shadowGeo && (
        <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} geometry={shadowGeo}>
          <meshBasicMaterial color="#000000" opacity={0.18} transparent />
        </mesh>
      )}

      <group ref={visualRef} position={[0, data.position[1], 0]}>
        
        {/* --- OBSTACLES --- */}
        {data.type === ObjectType.OBSTACLE && (
          <group>
            {data.color === 'snowman' ? (
              <group position={[0, 0.65, 0]}>
                <mesh geometry={SNOW_SPHERE_L} position={[0, 0, 0]} castShadow>
                  <meshStandardMaterial color="#f8fafc" roughness={0.4} />
                </mesh>
                <mesh geometry={SNOW_SPHERE_M} position={[0, 0.8, 0]} castShadow>
                  <meshStandardMaterial color="#f8fafc" roughness={0.4} />
                </mesh>
                <mesh geometry={SNOW_SPHERE_S} position={[0, 1.4, 0]} castShadow>
                  <meshStandardMaterial color="#f8fafc" roughness={0.4} />
                </mesh>
                {/* Nose */}
                <mesh position={[0, 1.4, 0.28]} rotation={[1.5, 0, 0]}>
                  <coneGeometry args={[0.07, 0.35, 8]} />
                  <meshStandardMaterial color="#f97316" />
                </mesh>
                {/* Eyes */}
                <mesh position={[0.1, 1.5, 0.24]}>
                  <sphereGeometry args={[0.045, 8, 8]} />
                  <meshStandardMaterial color="#0f172a" />
                </mesh>
                <mesh position={[-0.1, 1.5, 0.24]}>
                  <sphereGeometry args={[0.045, 8, 8]} />
                  <meshStandardMaterial color="#0f172a" />
                </mesh>
                {/* Arms */}
                <mesh position={[0.5, 0.9, 0]} rotation={[0, 0, -0.5]}>
                  <cylinderGeometry args={[0.03, 0.02, 0.6]} />
                  <meshStandardMaterial color="#78350f" />
                </mesh>
                <mesh position={[-0.5, 0.9, 0]} rotation={[0, 0, 0.5]}>
                  <cylinderGeometry args={[0.03, 0.02, 0.6]} />
                  <meshStandardMaterial color="#78350f" />
                </mesh>
              </group>
            ) : data.color === 'rock' ? (
              <group position={[0, 0.55, 0]}>
                <mesh castShadow>
                  <dodecahedronGeometry args={[0.85, 0]} />
                  <meshStandardMaterial color="#64748b" roughness={0.85} />
                </mesh>
                <mesh position={[0, 0.55, 0]} scale={[0.75, 0.35, 0.75]}>
                  <sphereGeometry args={[0.8, 8, 8]} />
                  <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
                </mesh>
              </group>
            ) : data.color === 'cone' ? (
              <group position={[0, 0, 0]}>
                {/* Traffic cone */}
                <mesh position={[0, 0.5, 0]}>
                  <coneGeometry args={[0.35, 1.0, 8]} />
                  <meshStandardMaterial color="#f97316" roughness={0.6} />
                </mesh>
                {/* White stripes */}
                <mesh position={[0, 0.35, 0]}>
                  <torusGeometry args={[0.28, 0.04, 8, 16]} />
                  <meshStandardMaterial color="#ffffff" />
                </mesh>
                <mesh position={[0, 0.55, 0]}>
                  <torusGeometry args={[0.22, 0.04, 8, 16]} />
                  <meshStandardMaterial color="#ffffff" />
                </mesh>
                {/* Base */}
                <mesh position={[0, 0.05, 0]}>
                  <boxGeometry args={[0.7, 0.1, 0.7]} />
                  <meshStandardMaterial color="#1e293b" />
                </mesh>
              </group>
            ) : (
              <group>
                {/* Pine Tree */}
                <mesh geometry={TREE_BODY} position={[0, 1.4, 0]} castShadow>
                  <meshStandardMaterial color="#065f46" roughness={0.75} />
                </mesh>
                <mesh geometry={TREE_STUMP} position={[0, 0.3, 0]}>
                  <meshStandardMaterial color="#422006" />
                </mesh>
                {/* Snow */}
                <mesh position={[0, 2.0, 0]} scale={[0.85, 0.4, 0.85]}>
                  <coneGeometry args={[0.9, 2.8, 8]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.35} />
                </mesh>
              </group>
            )}
          </group>
        )}
        
        {/* --- RAMP - РАЗВЁРНУТ ПРАВИЛЬНО --- */}
        {data.type === ObjectType.RAMP && (
          <group rotation={[0.35, 0, 0]} position={[0, 0.4, 0]}>
            {/* Main ramp */}
            <mesh geometry={RAMP_GEO} castShadow>
              <meshStandardMaterial color="#ec4899" roughness={0.35} metalness={0.4} />
            </mesh>
            {/* Side rails */}
            <mesh position={[-1.25, 0.2, 0]}>
              <boxGeometry args={[0.2, 0.6, 2.5]} />
              <meshStandardMaterial color="#be185d" />
            </mesh>
            <mesh position={[1.25, 0.2, 0]}>
              <boxGeometry args={[0.2, 0.6, 2.5]} />
              <meshStandardMaterial color="#be185d" />
            </mesh>
            {/* Arrow indicator */}
            <mesh position={[0, 0.2, -0.8]} rotation={[-Math.PI/2, 0, 0]}>
              <coneGeometry args={[0.35, 0.6, 3]} />
              <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.4} />
            </mesh>
            {/* Stripes */}
            {[-0.6, 0, 0.6].map((x, i) => (
              <mesh key={i} position={[x, 0.15, 0]}>
                <boxGeometry args={[0.15, 0.02, 2.4]} />
                <meshStandardMaterial color="#fbbf24" />
              </mesh>
            ))}
          </group>
        )}

        {/* --- CASH / GEM --- */}
        {data.type === ObjectType.GEM && (
          <group rotation={[0.4, 0, 0.2]}>
            <mesh geometry={CASH_GEO} castShadow>
              <meshStandardMaterial color="#10b981" roughness={0.4} />
            </mesh>
            <mesh geometry={CASH_STRAP}>
              <meshStandardMaterial color="#fef3c7" />
            </mesh>
            {/* Dollar sign impression */}
            <mesh position={[0, 0.02, 0.18]}>
              <boxGeometry args={[0.08, 0.2, 0.02]} />
              <meshStandardMaterial color="#065f46" />
            </mesh>
          </group>
        )}

        {/* --- YEAR LETTER --- */}
        {data.type === ObjectType.LETTER && (
          <group scale={[1.6, 1.6, 1.6]}>
            <Center>
              <Text3D 
                font={FONT_URL} 
                size={0.65}
                height={0.22}
                bevelEnabled
                bevelThickness={0.06}
                bevelSize={0.025}
                bevelSegments={5}
              >
                {data.value}
                <meshStandardMaterial 
                  color={data.color} 
                  emissive={data.color} 
                  emissiveIntensity={0.7}
                  roughness={0.3}
                  metalness={0.2}
                />
              </Text3D>
            </Center>
            {/* Glow effect */}
            <mesh position={[0, 0, -0.1]} scale={[2.5, 0.8, 0.1]}>
              <boxGeometry />
              <meshBasicMaterial color={data.color} transparent opacity={0.15} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
});
