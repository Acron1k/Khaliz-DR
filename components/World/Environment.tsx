/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { LANE_WIDTH } from '../../types';

// Праздничные цвета дня рождения
const BIRTHDAY_COLORS = ['#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444'];

// --- Конфетти ---
const Confetti: React.FC = () => {
  const count = 800;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    return Array(count).fill(0).map(() => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * 100,
        Math.random() * 40 + 10,
        (Math.random() - 0.5) * 150 - 30
      ),
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        -2 - Math.random() * 2,
        0
      ),
      rot: new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      ),
      rotSpeed: (Math.random() - 0.5) * 5,
      color: new THREE.Color(BIRTHDAY_COLORS[Math.floor(Math.random() * BIRTHDAY_COLORS.length)]),
      scale: 0.15 + Math.random() * 0.15
    }));
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    particles.forEach((p, i) => {
      p.pos.add(p.vel.clone().multiplyScalar(delta));
      p.rot.x += p.rotSpeed * delta;
      p.rot.z += p.rotSpeed * 0.7 * delta;
      
      // Сброс позиции
      if (p.pos.y < 0) {
        p.pos.y = 40 + Math.random() * 20;
        p.pos.x = (Math.random() - 0.5) * 100;
      }
      
      dummy.position.copy(p.pos);
      dummy.rotation.copy(p.rot);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, p.color);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <planeGeometry args={[1, 0.6]} />
      <meshStandardMaterial side={THREE.DoubleSide} />
    </instancedMesh>
  );
};

// --- Снег (лёгкий) ---
const SnowFall: React.FC = () => {
  const count = 2000;
  const meshRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 150;
      pos[i * 3 + 1] = Math.random() * 60;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 150 - 50;
    }
    return pos;
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
    const speed = 4.0;

    for (let i = 0; i < count; i++) {
      let y = positions[i * 3 + 1];
      y -= speed * delta;
      
      if (y < 0) {
        y = 60;
        positions[i * 3] = (Math.random() - 0.5) * 150;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 150 - 50;
      }
      positions[i * 3 + 1] = y;
      positions[i * 3] -= delta * 0.8;
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        color="#ffffff"
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// --- Воздушные шары вдоль трассы ---
const BirthdayBalloons: React.FC = () => {
  const { laneCount } = useStore();
  const speed = useStore(s => s.speed);
  const groupRef = useRef<THREE.Group>(null);
  
  const balloonGroups = useMemo(() => {
    const positions = [];
    const roadWidth = laneCount * LANE_WIDTH;
    
    for (let z = -150; z < 20; z += 20) {
      positions.push({ x: -roadWidth / 2 - 4, z, side: 'left' });
      positions.push({ x: roadWidth / 2 + 4, z, side: 'right' });
    }
    return positions;
  }, [laneCount]);
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const activeSpeed = speed > 0 ? speed : 0;
    
    groupRef.current.children.forEach(child => {
      if (child.userData.isBalloon) {
        child.position.z += activeSpeed * delta;
        if (child.position.z > 20) {
          child.position.z = -150;
        }
        // Покачивание
        child.rotation.z = Math.sin(state.clock.elapsedTime * 2 + child.position.x) * 0.1;
      }
    });
  });
  
  return (
    <group ref={groupRef}>
      {balloonGroups.map((pos, idx) => (
        <group key={idx} position={[pos.x, 0, pos.z]} userData={{ isBalloon: true }}>
          {/* Связка из 3 шаров */}
          {[0, 1, 2].map((i) => {
            const color = BIRTHDAY_COLORS[(idx + i) % BIRTHDAY_COLORS.length];
            const offsetX = (i - 1) * 0.6;
            const offsetY = 4 + i * 0.8 + Math.sin(i * 2) * 0.3;
            
            return (
              <group key={i} position={[offsetX, offsetY, 0]}>
                {/* Шар */}
                <mesh>
                  <sphereGeometry args={[0.5, 16, 16]} />
                  <meshStandardMaterial 
                    color={color} 
                    roughness={0.3}
                    metalness={0.1}
                  />
                </mesh>
                {/* Блик */}
                <mesh position={[0.15, 0.2, 0.35]}>
                  <sphereGeometry args={[0.12, 8, 8]} />
                  <meshStandardMaterial 
                    color="#ffffff" 
                    transparent 
                    opacity={0.6}
                  />
                </mesh>
                {/* Узелок */}
                <mesh position={[0, -0.55, 0]}>
                  <coneGeometry args={[0.08, 0.15, 8]} />
                  <meshStandardMaterial color={color} />
                </mesh>
                {/* Ниточка */}
                <mesh position={[0, -1.5, 0]}>
                  <cylinderGeometry args={[0.01, 0.01, 2]} />
                  <meshStandardMaterial color="#94a3b8" />
                </mesh>
              </group>
            );
          })}
          
          {/* Грузик внизу */}
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color="#fbbf24" />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// --- Баннеры "Happy Birthday" ---
const BirthdayBanners: React.FC = () => {
  const speed = useStore(s => s.speed);
  const groupRef = useRef<THREE.Group>(null);
  
  const bannerPositions = useMemo(() => {
    return [-120, -60, 0].map(z => ({ z }));
  }, []);
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const activeSpeed = speed > 0 ? speed : 0;
    
    groupRef.current.children.forEach(child => {
      if (child.userData.isBanner) {
        child.position.z += activeSpeed * delta;
        if (child.position.z > 30) {
          child.position.z = -130;
        }
      }
    });
  });
  
  return (
    <group ref={groupRef}>
      {bannerPositions.map((pos, idx) => (
        <group key={idx} position={[0, 12, pos.z]} userData={{ isBanner: true }}>
          {/* Баннер растяжка */}
          <mesh>
            <planeGeometry args={[18, 3]} />
            <meshStandardMaterial 
              color="#ec4899" 
              side={THREE.DoubleSide}
              transparent
              opacity={0.9}
            />
          </mesh>
          {/* Флажки-гирлянды */}
          {Array(12).fill(0).map((_, i) => (
            <mesh 
              key={i} 
              position={[(i - 5.5) * 1.4, -2, 0]}
              rotation={[0, 0, Math.PI]}
            >
              <coneGeometry args={[0.4, 0.8, 3]} />
              <meshStandardMaterial 
                color={BIRTHDAY_COLORS[i % BIRTHDAY_COLORS.length]}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

// --- Лыжная трасса с текстурой ---
const SkiTrack: React.FC = () => {
  const { laneCount } = useStore();
  const speed = useStore(s => s.speed);
  const tracksRef = useRef<THREE.Group>(null);
  
  // Создаём несколько сегментов трассы для бесконечного скролла
  const trackSegments = useMemo(() => {
    return Array(8).fill(0).map((_, i) => ({ z: -i * 30 - 10 }));
  }, []);
  
  useFrame((state, delta) => {
    if (!tracksRef.current) return;
    const activeSpeed = speed > 0 ? speed : 0;
    
    tracksRef.current.children.forEach(child => {
      if (child.userData.isTrackSegment) {
        child.position.z += activeSpeed * delta;
        if (child.position.z > 30) {
          child.position.z -= 240;
        }
      }
    });
  });
  
  const roadWidth = laneCount * LANE_WIDTH;
  
  return (
    <group ref={tracksRef}>
      {trackSegments.map((seg, idx) => (
        <group key={idx} position={[0, 0.02, seg.z]} userData={{ isTrackSegment: true }}>
          {/* Основа трассы - утрамбованный снег */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[roadWidth + 2, 30]} />
            <meshStandardMaterial 
              color="#dbeafe" 
              roughness={0.4}
              metalness={0.05}
            />
          </mesh>
          
          {/* Следы от лыж - бороздки */}
          {Array(laneCount).fill(0).map((_, laneIdx) => {
            const laneX = (laneIdx - Math.floor(laneCount / 2)) * LANE_WIDTH;
            return (
              <group key={laneIdx} position={[laneX, 0.01, 0]}>
                {/* Левый след */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.3, 0, 0]}>
                  <planeGeometry args={[0.15, 30]} />
                  <meshStandardMaterial 
                    color="#94a3b8" 
                    roughness={0.6}
                    transparent
                    opacity={0.4}
                  />
                </mesh>
                {/* Правый след */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.3, 0, 0]}>
                  <planeGeometry args={[0.15, 30]} />
                  <meshStandardMaterial 
                    color="#94a3b8" 
                    roughness={0.6}
                    transparent
                    opacity={0.4}
                  />
                </mesh>
              </group>
            );
          })}
          
          {/* Разметка полос */}
          {Array(laneCount + 1).fill(0).map((_, i) => {
            const x = (i - laneCount / 2) * LANE_WIDTH;
            return (
              <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 0]}>
                <planeGeometry args={[0.08, 30]} />
                <meshStandardMaterial 
                  color="#f59e0b" 
                  transparent
                  opacity={0.6}
                />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
};

// --- Ландшафт ---
const Landscape: React.FC = () => {
  const { laneCount } = useStore();
  const speed = useStore(s => s.speed);
  
  const mountains = useMemo(() => {
    return [...Array(10)].map((_, i) => ({
      pos: [
        (Math.random() - 0.5) * 500, 
        -10, 
        -200 - Math.random() * 150
      ],
      scale: [50 + Math.random() * 50, 40 + Math.random() * 60, 35],
      color: i % 2 === 0 ? '#334155' : '#1e293b'
    }));
  }, []);

  const trees = useMemo(() => {
    const items = [];
    const roadWidth = laneCount * LANE_WIDTH + 12;
    
    for (let z = -180; z < 30; z += 12) {
      for(let i = 0; i < 2; i++) {
        items.push({ 
          x: -roadWidth/2 - 6 - Math.random() * 35, 
          z: z + Math.random() * 10, 
          scale: 0.9 + Math.random() * 0.7, 
          type: Math.random() > 0.3 ? 'pine' : 'birch',
          rot: Math.random() * Math.PI 
        });
        items.push({ 
          x: roadWidth/2 + 6 + Math.random() * 35, 
          z: z + Math.random() * 10, 
          scale: 0.9 + Math.random() * 0.7, 
          type: Math.random() > 0.3 ? 'pine' : 'birch',
          rot: Math.random() * Math.PI 
        });
      }
    }
    return items;
  }, [laneCount]);
  
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      const activeSpeed = speed > 0 ? speed : 0;
      groupRef.current.children.forEach(child => {
        if (child.userData.isTree) {
          child.position.z += activeSpeed * delta;
          if (child.position.z > 30) {
            child.position.z = -180;
          }
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* Основная земля - снежное поле */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, -50]}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial 
          color="#f1f5f9" 
          roughness={0.3} 
          metalness={0.05}
        />
      </mesh>

      {/* Горы */}
      {mountains.map((m, i) => (
        <group key={`mtn-${i}`}>
          <mesh position={m.pos as any} scale={m.scale as any}>
            <coneGeometry args={[1, 1.2, 5]} />
            <meshStandardMaterial color={m.color} roughness={0.9} />
          </mesh>
          {/* Снежная шапка */}
          <mesh 
            position={[m.pos[0], m.pos[1] + m.scale[1] * 0.4, m.pos[2]]} 
            scale={[m.scale[0] * 0.5, m.scale[1] * 0.3, m.scale[2] * 0.5]}
          >
            <coneGeometry args={[1, 0.8, 5]} />
            <meshStandardMaterial color="#ffffff" roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* Деревья */}
      {trees.map((t, i) => (
        <group key={`tree-${i}`} position={[t.x, 0, t.z]} rotation={[0, t.rot, 0]} scale={[t.scale, t.scale, t.scale]} userData={{ isTree: true }}>
          {t.type === 'pine' ? (
            <>
              <mesh position={[0, 1.5, 0]}>
                <coneGeometry args={[1.2, 3.5, 7]} />
                <meshStandardMaterial color="#064e3b" roughness={0.8} />
              </mesh>
              <mesh position={[0, 3.5, 0]} scale={[0.8, 0.8, 0.8]}>
                <coneGeometry args={[1.2, 3.5, 7]} />
                <meshStandardMaterial color="#065f46" roughness={0.8} />
              </mesh>
              <mesh position={[0, 1.6, 0]} scale={[1.2, 0.35, 1.2]}>
                <coneGeometry args={[1, 2, 7]} />
                <meshStandardMaterial color="#ffffff" roughness={0.4} />
              </mesh>
              <mesh position={[0, 3.6, 0]} scale={[0.85, 0.35, 0.85]}>
                <coneGeometry args={[1, 2, 7]} />
                <meshStandardMaterial color="#ffffff" roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.25, 0.35, 1.2]} />
                <meshStandardMaterial color="#3f2e22" roughness={0.9} />
              </mesh>
            </>
          ) : (
            <>
              <mesh position={[0, 2.5, 0]} rotation={[0.03, 0, 0.03]}>
                <cylinderGeometry args={[0.18, 0.22, 5]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.5} />
              </mesh>
              {[...Array(6)].map((_, j) => (
                <mesh key={j} position={[0.12 * (j%2===0?1:-1), 0.8 + j * 0.7, 0.08]}>
                  <boxGeometry args={[0.08, 0.12, 0.04]} />
                  <meshStandardMaterial color="#1e293b" />
                </mesh>
              ))}
            </>
          )}
        </group>
      ))}
    </group>
  );
};

// --- Небо с градиентом заката ---
const SkyDome: React.FC = () => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Градиент заката/рассвета - тёплые тона для дня рождения
    const gradient = ctx.createLinearGradient(0, 256, 0, 0);
    gradient.addColorStop(0, '#fef3c7');    // Тёплый жёлтый внизу
    gradient.addColorStop(0.3, '#fcd34d');   // Золотой
    gradient.addColorStop(0.5, '#f97316');   // Оранжевый
    gradient.addColorStop(0.7, '#ec4899');   // Розовый
    gradient.addColorStop(1, '#7c3aed');     // Фиолетовый вверху
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    return new THREE.CanvasTexture(canvas);
  }, []);
  
  return (
    <mesh>
      <sphereGeometry args={[450, 32, 32]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
};

export const Environment: React.FC = () => {
  return (
    <>
      <color attach="background" args={['#fef3c7']} />
      <fog attach="fog" args={['#fcd34d', 60, 180]} />
      
      {/* Солнечный свет */}
      <directionalLight 
        position={[30, 80, 50]} 
        intensity={1.5} 
        color="#fff7ed" 
        castShadow 
        shadow-mapSize={[2048, 2048]}
      />
      
      {/* Мягкий ambient */}
      <ambientLight intensity={0.7} color="#fef3c7" />
      
      {/* Тёплые акценты */}
      <pointLight position={[0, 15, -50]} intensity={1.5} color="#f97316" distance={100} decay={2} />
      <pointLight position={[-25, 10, -80]} intensity={1.0} color="#ec4899" distance={80} decay={2} />
      <pointLight position={[25, 10, -60]} intensity={1.0} color="#8b5cf6" distance={80} decay={2} />

      <SkyDome />
      <Landscape />
      <SkiTrack />
      <SnowFall />
      <Confetti />
      <BirthdayBalloons />
      <BirthdayBanners />
    </>
  );
};
