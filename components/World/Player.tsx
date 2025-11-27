/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { LANE_WIDTH, GameStatus } from '../../types';
import { audio } from '../System/Audio';

// Physics Constants
const GRAVITY = 55;
const JUMP_FORCE = 18;
const RAMP_JUMP_FORCE = 24; // Более сильный прыжок с трамплина

// Geometry
const SPHERE_GEO = new THREE.SphereGeometry(1, 20, 20);
const CYLINDER_GEO = new THREE.CylinderGeometry(1, 1, 1, 20);

// SKI GEAR
const SKI_GEO = new THREE.BoxGeometry(0.16, 0.04, 2.4);
const SKI_TIP_GEO = new THREE.BoxGeometry(0.16, 0.04, 0.5);
const POLE_GEO = new THREE.CylinderGeometry(0.018, 0.012, 1.5);

const SHADOW_GEO = new THREE.CircleGeometry(1.0, 32);

export const Player: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  
  const { status, laneCount, takeDamage, hasDoubleJump, activateImmortality, isImmortalityActive } = useStore();
  
  const [lane, setLane] = React.useState(0);
  const targetX = useRef(0);
  
  // Physics State
  const isJumping = useRef(false);
  const velocityY = useRef(0);
  const jumpsPerformed = useRef(0);
  const spinRotation = useRef(0);
  const bankAngle = useRef(0);
  const isDoingFlip = useRef(false); // Для сальто с трамплина

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isInvincible = useRef(false);
  const lastDamageTime = useRef(0);

  // Materials - улучшенные для дня рождения
  const materials = useMemo(() => {
    const skinColor = isImmortalityActive ? '#84cc16' : '#16a34a';
    const skinColorDark = isImmortalityActive ? '#65a30d' : '#15803d';
    
    return {
      skinMaterial: new THREE.MeshStandardMaterial({ 
        color: skinColor, 
        roughness: 0.4, 
        metalness: 0.08,
      }),
      skinMaterialDark: new THREE.MeshStandardMaterial({ 
        color: skinColorDark, 
        roughness: 0.45, 
        metalness: 0.05,
      }),
      pantsMaterial: new THREE.MeshStandardMaterial({ 
        color: '#581c87',
        roughness: 0.65 
      }),
      bootsMaterial: new THREE.MeshStandardMaterial({ 
        color: '#1e3a8a',
        roughness: 0.4,
        metalness: 0.15 
      }),
      shadowMaterial: new THREE.MeshBasicMaterial({ 
        color: '#000000', 
        opacity: 0.35, 
        transparent: true 
      }),
      skiMaterial: new THREE.MeshStandardMaterial({ 
        color: '#dc2626',
        metalness: 0.75, 
        roughness: 0.12 
      }),
      poleMaterial: new THREE.MeshStandardMaterial({ 
        color: '#f1f5f9',
        metalness: 0.9,
        roughness: 0.08
      }),
      // Праздничный колпак (день рождения)
      partyHatMaterial: new THREE.MeshStandardMaterial({ 
        color: '#ec4899',
        roughness: 0.5,
        metalness: 0.1
      }),
      partyHatStripeMaterial: new THREE.MeshStandardMaterial({ 
        color: '#fbbf24',
        roughness: 0.4
      }),
      // Солнцезащитные очки
      sunglassesMaterial: new THREE.MeshStandardMaterial({ 
        color: '#0f172a',
        roughness: 0.15,
        metalness: 0.9
      }),
      glovesMaterial: new THREE.MeshStandardMaterial({ 
        color: '#1e293b',
        roughness: 0.6
      }),
    };
  }, [isImmortalityActive]);

  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      isJumping.current = false;
      jumpsPerformed.current = 0;
      velocityY.current = 0;
      spinRotation.current = 0;
      isDoingFlip.current = false;
      if (groupRef.current) groupRef.current.position.y = 0;
      if (bodyRef.current) bodyRef.current.rotation.x = 0;
    }
  }, [status]);
  
  useEffect(() => {
    const maxLane = Math.floor(laneCount / 2);
    if (Math.abs(lane) > maxLane) {
      setLane(l => Math.max(Math.min(l, maxLane), -maxLane));
    }
  }, [laneCount, lane]);

  // Обычный прыжок
  const triggerJump = (fromRamp = false) => {
    const maxJumps = hasDoubleJump ? 2 : 1;
    const force = fromRamp ? RAMP_JUMP_FORCE : JUMP_FORCE;
    
    if (!isJumping.current) {
      audio.playJump(false);
      isJumping.current = true;
      jumpsPerformed.current = 1;
      velocityY.current = force;
      isDoingFlip.current = fromRamp; // Сальто только с трамплина
    } else if (jumpsPerformed.current < maxJumps && !fromRamp) {
      audio.playJump(true);
      jumpsPerformed.current += 1;
      velocityY.current = JUMP_FORCE;
      spinRotation.current = 0;
    }
  };

  // Слушаем событие наезда на трамплин
  useEffect(() => {
    const handleRampHit = () => {
      if (!isJumping.current) {
        triggerJump(true);
      }
    };
    window.addEventListener('player-ramp', handleRampHit);
    return () => window.removeEventListener('player-ramp', handleRampHit);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== GameStatus.PLAYING) return;
      const maxLane = Math.floor(laneCount / 2);

      if (e.key === 'ArrowLeft') setLane(l => Math.max(l - 1, -maxLane));
      else if (e.key === 'ArrowRight') setLane(l => Math.min(l + 1, maxLane));
      else if (e.key === 'ArrowUp' || e.key === 'w') triggerJump(false);
      else if (e.key === ' ' || e.key === 'Enter') activateImmortality();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, laneCount, hasDoubleJump, activateImmortality]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (status !== GameStatus.PLAYING) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      const maxLane = Math.floor(laneCount / 2);

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
        if (deltaX > 0) setLane(l => Math.min(l + 1, maxLane));
        else setLane(l => Math.max(l - 1, -maxLane));
      } else if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY < -30) {
        triggerJump(false);
      } else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        activateImmortality();
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [status, laneCount, hasDoubleJump, activateImmortality]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    if (status !== GameStatus.PLAYING && status !== GameStatus.SHOP) return;

    // Position
    targetX.current = lane * LANE_WIDTH;
    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x, 
      targetX.current, 
      delta * 10
    );

    // Physics
    if (isJumping.current) {
      groupRef.current.position.y += velocityY.current * delta;
      velocityY.current -= GRAVITY * delta;

      if (groupRef.current.position.y <= 0) {
        groupRef.current.position.y = 0;
        isJumping.current = false;
        jumpsPerformed.current = 0;
        velocityY.current = 0;
        isDoingFlip.current = false;
        spinRotation.current = 0;
        if (bodyRef.current) bodyRef.current.rotation.x = 0;
      }

      // Сальто с трамплина - полный оборот
      if (isDoingFlip.current && bodyRef.current) {
        spinRotation.current -= delta * 10;
        bodyRef.current.rotation.x = spinRotation.current;
      }
      // Обычный двойной прыжок - полуоборот
      else if (jumpsPerformed.current === 2 && bodyRef.current) {
        spinRotation.current -= delta * 12;
        bodyRef.current.rotation.x = spinRotation.current;
      }
    }

    // Banking
    const xDiff = targetX.current - groupRef.current.position.x;
    const targetBank = -xDiff * 0.25;
    bankAngle.current = THREE.MathUtils.lerp(bankAngle.current, targetBank, delta * 12);
    groupRef.current.rotation.z = bankAngle.current;
    
    // Pose
    if (bodyRef.current && !isJumping.current) {
      bodyRef.current.rotation.x = 0.45;
      bodyRef.current.position.y = 0.7;
    } else if (bodyRef.current && !isDoingFlip.current && jumpsPerformed.current !== 2) {
      bodyRef.current.rotation.x = -0.25;
      bodyRef.current.position.y = 0.9;
    }

    // Shadow
    if (shadowRef.current) {
      const height = groupRef.current.position.y;
      const scale = Math.max(0.3, 1.0 - (height / 4) * 0.4);
      shadowRef.current.scale.set(scale, scale, scale);
      (shadowRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0.08, 0.35 - (height / 4) * 0.2);
    }

    // Invincibility
    const showFlicker = isInvincible.current || isImmortalityActive;
    if (showFlicker) {
      if (isInvincible.current) {
        if (Date.now() - lastDamageTime.current > 1500) {
          isInvincible.current = false;
          groupRef.current.visible = true;
        } else {
          groupRef.current.visible = Math.floor(Date.now() / 50) % 2 === 0;
        }
      }
      if (isImmortalityActive) groupRef.current.visible = true;
    } else {
      groupRef.current.visible = true;
    }
  });

  // Damage
  useEffect(() => {
    const checkHit = () => {
      if (isInvincible.current || isImmortalityActive) return;
      audio.playDamage();
      takeDamage();
      isInvincible.current = true;
      lastDamageTime.current = Date.now();
    };
    window.addEventListener('player-hit', checkHit);
    return () => window.removeEventListener('player-hit', checkHit);
  }, [takeDamage, isImmortalityActive]);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <group ref={bodyRef} position={[0, 1.1, 0]}>
        
        {/* SKIS */}
        <group position={[0, -0.65, 0]}>
          {/* Left ski */}
          <mesh position={[-0.28, 0, 0]} geometry={SKI_GEO} material={materials.skiMaterial} castShadow />
          <mesh position={[-0.28, 0.08, 1.3]} rotation={[-0.5, 0, 0]} geometry={SKI_TIP_GEO} material={materials.skiMaterial} />
          <mesh position={[-0.28, 0.04, 0.25]}>
            <boxGeometry args={[0.18, 0.06, 0.18]} />
            <meshStandardMaterial color="#0f172a" metalness={0.6} />
          </mesh>
          
          {/* Right ski */}
          <mesh position={[0.28, 0, 0]} geometry={SKI_GEO} material={materials.skiMaterial} castShadow />
          <mesh position={[0.28, 0.08, 1.3]} rotation={[-0.5, 0, 0]} geometry={SKI_TIP_GEO} material={materials.skiMaterial} />
          <mesh position={[0.28, 0.04, 0.25]}>
            <boxGeometry args={[0.18, 0.06, 0.18]} />
            <meshStandardMaterial color="#0f172a" metalness={0.6} />
          </mesh>
        </group>

        {/* HULK BODY */}
        <group position={[0, 0.1, 0]}>
          {/* Lower body */}
          <mesh position={[0, -0.1, 0]} scale={[0.5, 0.32, 0.38]} geometry={SPHERE_GEO} material={materials.pantsMaterial} />
          
          {/* Legs */}
          <mesh position={[-0.28, -0.4, 0.08]} rotation={[0.5, 0, -0.1]} scale={[0.16, 0.38, 0.16]} geometry={CYLINDER_GEO} material={materials.pantsMaterial} />
          <mesh position={[0.28, -0.4, 0.08]} rotation={[0.5, 0, 0.1]} scale={[0.16, 0.38, 0.16]} geometry={CYLINDER_GEO} material={materials.pantsMaterial} />
          
          {/* Boots */}
          <mesh position={[-0.28, -0.72, -0.08]} rotation={[-0.2, 0, -0.08]} scale={[0.15, 0.38, 0.15]} geometry={CYLINDER_GEO} material={materials.bootsMaterial} />
          <mesh position={[0.28, -0.72, -0.08]} rotation={[-0.2, 0, 0.08]} scale={[0.15, 0.38, 0.15]} geometry={CYLINDER_GEO} material={materials.bootsMaterial} />

          {/* Torso */}
          <mesh position={[0, 0.5, 0.03]} scale={[0.55, 0.48, 0.32]} geometry={CYLINDER_GEO} material={materials.skinMaterial} castShadow />
          
          {/* Pecs - more defined */}
          <mesh position={[-0.14, 0.58, 0.2]} scale={[0.16, 0.14, 0.1]} geometry={SPHERE_GEO} material={materials.skinMaterial} />
          <mesh position={[0.14, 0.58, 0.2]} scale={[0.16, 0.14, 0.1]} geometry={SPHERE_GEO} material={materials.skinMaterial} />
          
          {/* Abs */}
          <mesh position={[0, 0.18, 0.12]} scale={[0.35, 0.25, 0.18]} geometry={SPHERE_GEO} material={materials.skinMaterialDark} />
          {/* Six-pack detail */}
          {[[-0.08, 0.28], [0.08, 0.28], [-0.08, 0.12], [0.08, 0.12]].map(([x, y], i) => (
            <mesh key={i} position={[x, y, 0.2]} scale={[0.06, 0.06, 0.03]} geometry={SPHERE_GEO} material={materials.skinMaterial} />
          ))}
          
          {/* Shoulders */}
          <mesh position={[-0.55, 0.72, 0]} scale={[0.32, 0.32, 0.32]} geometry={SPHERE_GEO} material={materials.skinMaterial} />
          <mesh position={[0.55, 0.72, 0]} scale={[0.32, 0.32, 0.32]} geometry={SPHERE_GEO} material={materials.skinMaterial} />
          
          {/* Traps */}
          <mesh position={[-0.2, 0.85, 0]} scale={[0.15, 0.12, 0.12]} geometry={SPHERE_GEO} material={materials.skinMaterial} />
          <mesh position={[0.2, 0.85, 0]} scale={[0.15, 0.12, 0.12]} geometry={SPHERE_GEO} material={materials.skinMaterial} />

          {/* Neck */}
          <mesh position={[0, 0.92, 0]} scale={[0.1, 0.12, 0.1]} geometry={CYLINDER_GEO} material={materials.skinMaterialDark} />

          {/* Head */}
          <mesh position={[0, 1.1, 0]} scale={[0.2, 0.23, 0.2]} geometry={SPHERE_GEO} material={materials.skinMaterial} castShadow />
          {/* Brow */}
          <mesh position={[0, 1.18, 0.14]} scale={[0.18, 0.05, 0.07]} geometry={SPHERE_GEO} material={materials.skinMaterialDark} />
          {/* Jaw */}
          <mesh position={[0, 1.0, 0.06]} scale={[0.16, 0.09, 0.1]} geometry={SPHERE_GEO} material={materials.skinMaterial} />
          {/* Ears */}
          <mesh position={[-0.18, 1.1, 0]} scale={[0.04, 0.06, 0.03]} geometry={SPHERE_GEO} material={materials.skinMaterialDark} />
          <mesh position={[0.18, 1.1, 0]} scale={[0.04, 0.06, 0.03]} geometry={SPHERE_GEO} material={materials.skinMaterialDark} />
          
          {/* PARTY HAT - Праздничный колпак */}
          <group position={[0, 1.32, 0]}>
            <mesh rotation={[0.1, 0, 0]}>
              <coneGeometry args={[0.18, 0.45, 16]} />
              <meshStandardMaterial color="#ec4899" roughness={0.4} />
            </mesh>
            {/* Stripes */}
            {[0.1, 0.22, 0.34].map((y, i) => (
              <mesh key={i} position={[0, y - 0.15, 0]} rotation={[0.1, 0, 0]}>
                <torusGeometry args={[0.12 - i * 0.03, 0.02, 8, 16]} />
                <meshStandardMaterial color="#fbbf24" />
              </mesh>
            ))}
            {/* Pompom */}
            <mesh position={[0, 0.28, -0.05]}>
              <sphereGeometry args={[0.08, 12, 12]} />
              <meshStandardMaterial color="#8b5cf6" roughness={0.3} />
            </mesh>
            {/* Elastic string */}
            <mesh position={[0, -0.2, 0.08]} rotation={[0.3, 0, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.25]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
          </group>

          {/* SUNGLASSES - Крутые солнцезащитные очки */}
          <group position={[0, 1.14, 0.17]}>
            {/* Frame */}
            <mesh>
              <boxGeometry args={[0.3, 0.06, 0.02]} />
              <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Left lens */}
            <mesh position={[-0.08, 0, 0.01]}>
              <boxGeometry args={[0.11, 0.08, 0.01]} />
              <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Right lens */}
            <mesh position={[0.08, 0, 0.01]}>
              <boxGeometry args={[0.11, 0.08, 0.01]} />
              <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Temple arms */}
            <mesh position={[-0.15, 0, -0.06]} rotation={[0, 0.3, 0]}>
              <boxGeometry args={[0.12, 0.02, 0.02]} />
              <meshStandardMaterial color="#0f172a" metalness={0.8} />
            </mesh>
            <mesh position={[0.15, 0, -0.06]} rotation={[0, -0.3, 0]}>
              <boxGeometry args={[0.12, 0.02, 0.02]} />
              <meshStandardMaterial color="#0f172a" metalness={0.8} />
            </mesh>
          </group>

          {/* Arms */}
          <group position={[0.55, 0.72, 0]}>
            {/* Bicep */}
            <mesh position={[0.08, -0.18, 0]} rotation={[0, 0, -0.25]} scale={[0.16, 0.24, 0.16]} geometry={CYLINDER_GEO} material={materials.skinMaterial} />
            {/* Forearm */}
            <mesh position={[0.18, -0.48, 0.18]} rotation={[0.5, 0, -0.25]} scale={[0.13, 0.24, 0.13]} geometry={CYLINDER_GEO} material={materials.skinMaterial} />
            {/* Glove */}
            <mesh position={[0.2, -0.68, 0.32]} scale={[0.09, 0.09, 0.09]} geometry={SPHERE_GEO} material={materials.glovesMaterial} />
            {/* Pole */}
            <mesh position={[0.18, -0.78, 0.38]} rotation={[0.3, 0, 0]} geometry={POLE_GEO} material={materials.poleMaterial} />
            <mesh position={[0.18, -0.05, 0.08]}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          </group>

          <group position={[-0.55, 0.72, 0]}>
            {/* Bicep */}
            <mesh position={[-0.08, -0.18, 0]} rotation={[0, 0, 0.25]} scale={[0.16, 0.24, 0.16]} geometry={CYLINDER_GEO} material={materials.skinMaterial} />
            {/* Forearm */}
            <mesh position={[-0.18, -0.48, 0.18]} rotation={[0.5, 0, 0.25]} scale={[0.13, 0.24, 0.13]} geometry={CYLINDER_GEO} material={materials.skinMaterial} />
            {/* Glove */}
            <mesh position={[-0.2, -0.68, 0.32]} scale={[0.09, 0.09, 0.09]} geometry={SPHERE_GEO} material={materials.glovesMaterial} />
            {/* Pole */}
            <mesh position={[-0.18, -0.78, 0.38]} rotation={[0.3, 0, 0]} geometry={POLE_GEO} material={materials.poleMaterial} />
            <mesh position={[-0.18, -0.05, 0.08]}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          </group>
        </group>
      </group>
      
      <mesh ref={shadowRef} position={[0, 0.01, 0]} rotation={[-Math.PI/2, 0, 0]} geometry={SHADOW_GEO} material={materials.shadowMaterial} />
    </group>
  );
};
