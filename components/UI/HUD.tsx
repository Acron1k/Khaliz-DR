
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect } from 'react';
import { Heart, Zap, Trophy, DollarSign, Rocket, ArrowUpCircle, Shield, Activity, PlusCircle, Play } from 'lucide-react';
import { useStore, GEMINI_TARGET } from '../../store';
import { GameStatus, GEMINI_COLORS, ShopItem, RUN_SPEED_BASE } from '../../types';
import { audio } from '../System/Audio';

// Available Shop Items
const SHOP_ITEMS: ShopItem[] = [
    {
        id: 'DOUBLE_JUMP',
        name: 'DOUBLE TRICK',
        description: 'Jump again in mid-air to dodge tall trees.',
        cost: 1000,
        icon: ArrowUpCircle,
        oneTime: true
    },
    {
        id: 'MAX_LIFE',
        name: 'WARM COAT',
        description: 'Permanently adds a heart slot.',
        cost: 1500,
        icon: Activity
    },
    {
        id: 'HEAL',
        name: 'HOT TEA',
        description: 'Restores 1 Life point instantly.',
        cost: 1000,
        icon: PlusCircle
    },
    {
        id: 'IMMORTAL',
        name: 'RAGE MODE',
        description: 'Press Space to smash through obstacles (5s).',
        cost: 3000,
        icon: Shield,
        oneTime: true
    }
];

const ShopScreen: React.FC = () => {
    const { score, buyItem, closeShop, hasDoubleJump, hasImmortality } = useStore();
    const [items, setItems] = useState<ShopItem[]>([]);

    useEffect(() => {
        let pool = SHOP_ITEMS.filter(item => {
            if (item.id === 'DOUBLE_JUMP' && hasDoubleJump) return false;
            if (item.id === 'IMMORTAL' && hasImmortality) return false;
            return true;
        });
        pool = pool.sort(() => 0.5 - Math.random());
        setItems(pool.slice(0, 3));
    }, []);

    return (
        <div className="absolute inset-0 bg-slate-900/90 z-[100] text-white pointer-events-auto backdrop-blur-md overflow-y-auto">
             <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
                 <h2 className="text-3xl md:text-4xl font-black text-cyan-300 mb-2 font-cyber tracking-widest text-center">ЛЫЖНЫЙ МАГАЗИН</h2>
                 <div className="flex items-center text-green-400 mb-6 md:mb-8">
                     <span className="text-base md:text-lg mr-2">CASH:</span>
                     <span className="text-xl md:text-2xl font-bold">${score.toLocaleString()}</span>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl w-full mb-8">
                     {items.map(item => {
                         const Icon = item.icon;
                         const canAfford = score >= item.cost;
                         return (
                             <div key={item.id} className="bg-slate-800/80 border border-slate-600 p-4 md:p-6 rounded-xl flex flex-col items-center text-center hover:border-cyan-500 transition-colors">
                                 <div className="bg-slate-700 p-3 md:p-4 rounded-full mb-3 md:mb-4">
                                     <Icon className="w-6 h-6 md:w-8 md:h-8 text-cyan-300" />
                                 </div>
                                 <h3 className="text-lg md:text-xl font-bold mb-2">{item.name}</h3>
                                 <p className="text-gray-300 text-xs md:text-sm mb-4 h-10 md:h-12 flex items-center justify-center">{item.description}</p>
                                 <button 
                                    onClick={() => buyItem(item.id as any, item.cost)}
                                    disabled={!canAfford}
                                    className={`px-4 md:px-6 py-2 rounded font-bold w-full text-sm md:text-base ${canAfford ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110' : 'bg-gray-600 cursor-not-allowed opacity-50'}`}
                                 >
                                     ${item.cost}
                                 </button>
                             </div>
                         );
                     })}
                 </div>

                 <button 
                    onClick={closeShop}
                    className="flex items-center px-8 md:px-10 py-3 md:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-lg md:text-xl rounded hover:scale-105 transition-all shadow-lg"
                 >
                     НА ТРАССУ <Play className="ml-2 w-5 h-5" fill="white" />
                 </button>
             </div>
        </div>
    );
};

export const HUD: React.FC = () => {
  const { score, lives, maxLives, collectedLetters, status, restartGame, startGame, gemsCollected, isImmortalityActive, speed } = useStore();
  
  const target = GEMINI_TARGET;
  const containerClass = "absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-8 z-50";

  if (status === GameStatus.SHOP) return <ShopScreen />;

  if (status === GameStatus.MENU) {
      return (
          <div className="absolute inset-0 flex items-center justify-center z-[100] bg-slate-900/80 backdrop-blur-sm p-4 pointer-events-auto">
              <div className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-500 bg-slate-800">
                <div className="relative w-full bg-slate-900 h-96 overflow-hidden">
                     {/* Placeholder for menu visuals */}
                     <div className="absolute inset-0 bg-gradient-to-b from-blue-900 to-slate-900 opacity-80"></div>
                     <div className="absolute inset-0 flex flex-col justify-center items-center p-6 text-center z-10">
                        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 mb-6 drop-shadow-lg font-cyber leading-tight">
                            ХАЛИЗ<br/>НА ПУТИ К МУДРОСТИ
                        </h1>
                        <button 
                          onClick={() => { audio.init(); startGame(); }}
                          className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xl rounded-xl transition-all shadow-lg flex items-center justify-center"
                        >
                            НАЧАТЬ СПУСК <Play className="ml-2 w-5 h-5 fill-white" />
                        </button>
                     </div>
                </div>
              </div>
          </div>
      );
  }

  if (status === GameStatus.GAME_OVER) {
      return (
          <div className="absolute inset-0 bg-slate-900/90 z-[100] text-white pointer-events-auto backdrop-blur-sm overflow-y-auto">
              <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
                <h1 className="text-4xl md:text-5xl font-black text-white mb-6 font-cyber text-center">НЕ УНЫВАЙ!</h1>
                
                <div className="grid grid-cols-1 gap-3 md:gap-4 text-center mb-8 w-full max-w-md">
                    <div className="bg-slate-800 p-4 rounded-lg flex items-center justify-between">
                        <div className="flex items-center text-green-400"><DollarSign className="mr-2 w-5 h-5"/> CASH</div>
                        <div className="text-2xl font-bold">${score.toLocaleString()}</div>
                    </div>
                </div>

                <button 
                  onClick={() => { audio.init(); restartGame(); }}
                  className="px-8 md:px-10 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-lg rounded hover:scale-105 transition-all shadow-lg"
                >
                    ПОПРОБОВАТЬ РОДИТЬСЯ СНОВА
                </button>
              </div>
          </div>
      );
  }

  if (status === GameStatus.VICTORY) {
    return (
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/95 to-slate-900/95 z-[100] text-white pointer-events-auto backdrop-blur-md overflow-y-auto">
            <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
                <Rocket className="w-16 h-16 text-yellow-400 mb-4 animate-bounce" />
                <h1 className="text-3xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-500 to-pink-500 mb-4 text-center leading-tight">
                    С ДНЁМ РОЖДЕНИЯ, САНЯ!
                </h1>
                <p className="text-cyan-300 text-lg md:text-2xl font-mono mb-8 text-center">
                    ТЫ ПРОШЕЛ ПУТЬ ДО 2025 ГОДА!<br/>МУДРОСТЬ ДОСТИГНУТА.
                </p>
                
                <div className="bg-slate-800/80 p-6 rounded-xl border border-yellow-500/30 mb-8 w-full max-w-md text-center">
                    <div className="text-sm text-gray-400 mb-1">ИТОГОВЫЙ КАПИТАЛ</div>
                    <div className="text-4xl font-bold text-green-400">${score.toLocaleString()}</div>
                </div>

                <button 
                  onClick={() => { audio.init(); restartGame(); }}
                  className="px-8 py-4 bg-white text-black font-black text-lg rounded hover:scale-105 transition-all"
                >
                    НАЧАТЬ ЗАНОВО
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className={containerClass}>
        {/* Top Bar */}
        <div className="flex justify-between items-start w-full">
            <div className="flex items-center bg-slate-900/50 p-2 rounded-lg backdrop-blur-md border border-slate-700">
                <DollarSign className="text-green-400 w-6 h-6 mr-1" />
                <div className="text-2xl md:text-4xl font-bold text-white font-mono">
                    {score.toLocaleString()}
                </div>
            </div>
            
            <div className="flex space-x-1">
                {[...Array(maxLives)].map((_, i) => (
                    <Heart 
                        key={i} 
                        className={`w-8 h-8 ${i < lives ? 'text-red-500 fill-red-500' : 'text-slate-600 fill-slate-600'}`} 
                    />
                ))}
            </div>
        </div>
        
        {/* Active Skill Indicator */}
        {isImmortalityActive && (
             <div className="absolute top-24 left-1/2 transform -translate-x-1/2 text-red-500 font-bold text-2xl animate-pulse flex items-center bg-black/50 px-4 py-2 rounded">
                 <Shield className="mr-2 fill-red-500" /> HULK SMASH!
             </div>
        )}

        {/* Collection Status - YEARS */}
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 flex space-x-1 md:space-x-2">
            {target.map((char, idx) => {
                const isCollected = collectedLetters.includes(idx);
                const color = GEMINI_COLORS[idx];

                return (
                    <div 
                        key={idx}
                        style={{
                            backgroundColor: isCollected ? color : 'rgba(0,0,0,0.5)',
                            borderColor: isCollected ? 'white' : 'rgba(255,255,255,0.2)',
                            color: isCollected ? 'black' : 'rgba(255,255,255,0.5)',
                        }}
                        className={`w-10 h-8 md:w-16 md:h-10 flex items-center justify-center border-2 font-black text-xs md:text-sm font-cyber rounded-lg transition-all duration-300`}
                    >
                        {char}
                    </div>
                );
            })}
        </div>

        {/* Speedometer */}
        <div className="w-full flex justify-end items-end">
             <div className="flex items-center space-x-2 text-cyan-400 bg-slate-900/50 px-3 py-1 rounded">
                 <Zap className="w-5 h-5" />
                 <span className="font-mono text-xl">{Math.round((speed / RUN_SPEED_BASE) * 100)} km/h</span>
             </div>
        </div>
    </div>
  );
};
