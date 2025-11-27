/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  SHOP = 'SHOP',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export enum ObjectType {
  OBSTACLE = 'OBSTACLE',
  GEM = 'GEM', // Used for Cash Stacks now
  LETTER = 'LETTER',
  SHOP_PORTAL = 'SHOP_PORTAL',
  RAMP = 'RAMP', // Трамплин для прыжков
}

export interface GameObject {
  id: string;
  type: ObjectType;
  position: [number, number, number]; // x, y, z
  active: boolean;
  value?: string; // For letters (Years)
  color?: string;
  targetIndex?: number; // Index in the target array
  points?: number; 
}

export const LANE_WIDTH = 2.5; // Slightly wider for skiing
export const JUMP_HEIGHT = 2.5;
export const JUMP_DURATION = 0.6; // seconds
export const RUN_SPEED_BASE = 25.0; // Faster base speed for skiing
export const SPAWN_DISTANCE = 140;
export const REMOVE_DISTANCE = 20; // Behind player

// Colors for the years: 1995 - 2025
export const GEMINI_COLORS = [
    '#ff3333', // 1995 - Red
    '#ff8800', // 2000 - Orange
    '#ffcc00', // 2005 - Gold
    '#33cc33', // 2010 - Green
    '#0099ff', // 2015 - Blue
    '#3333ff', // 2020 - Indigo
    '#9900cc', // 2025 - Violet
];

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    icon: any; // Lucide icon component
    oneTime?: boolean; // If true, remove from pool after buying
}

// Global JSX augmentation for React Three Fiber elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      points: any;
      instancedMesh: any;
      primitive: any;
      
      // Geometries
      bufferGeometry: any;
      boxGeometry: any;
      sphereGeometry: any;
      cylinderGeometry: any;
      coneGeometry: any;
      planeGeometry: any;
      circleGeometry: any;
      
      // Materials
      meshBasicMaterial: any;
      meshStandardMaterial: any;
      meshPhysicalMaterial: any;
      pointsMaterial: any;
      
      // Lights
      ambientLight: any;
      directionalLight: any;
      pointLight: any;
      spotLight: any;
      
      // Others
      color: any;
      fog: any;
      bufferAttribute: any;
    }
  }
}
