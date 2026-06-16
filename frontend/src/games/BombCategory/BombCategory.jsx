import React, { useState, useEffect, useRef } from "react";
import { socket } from "../../socket/socket";
import { bombCategories } from "../../data/bombCategories";

function BombCategory({
  room,
  isInRoom,
  playerName,
  setPlayerName,
  onLeave,
  activeError,
  setActiveError,
  handleJoinGame
}) {
  const [durationRange, setDurationRange] = useState("15-50");
  const [selectedPool, setSelectedPool] = useState("genel");
  
  // Local state to keep track of sound effects triggers
  const lastStatusRef = useRef(null);
  const lastTimerRef = useRef(null);
  const lastActivePlayerIdRef = useRef(null);

  const gameState = room?.gameState;
  const isMeHost = room?.hostId === socket?.id;
  const myInfo = room?.players.find((p) => p.id === socket?.id);
  const myScore = myInfo ? myInfo.score : 0;

  const currentPool = gameState?.pool || selectedPool || "genel";
  const activePrompts = currentPool === "hepsi"
    ? [...(bombCategories.genel || []), ...(bombCategories.kpss || [])]
    : (currentPool === "kpss" ? (bombCategories.kpss || []) : (bombCategories.genel || []));

  // Audio configuration states (load from localStorage, default is on/0.8)
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("bomb_volume");
    return saved !== null ? parseFloat(saved) : 0.8;
  });
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem("bomb_muted");
    return saved !== null ? saved === "true" : false;
  });

  const [showSlider, setShowSlider] = useState(false);
  const sliderTimerRef = useRef(null);
  const longPressTimerRef = useRef(null);

  const audioContextRef = useRef(null);

  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    volumeRef.current = volume;
    localStorage.setItem("bomb_volume", volume.toString());
  }, [volume]);

  useEffect(() => {
    isMutedRef.current = isMuted;
    localStorage.setItem("bomb_muted", isMuted.toString());
  }, [isMuted]);

  // Audio Context unlocker helper
  const initAudio = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      return ctx;
    } catch (e) {
      console.warn("AudioContext init error:", e);
      return null;
    }
  };

  // Auto-close volume slider on inactivity
  const resetSliderTimer = () => {
    if (sliderTimerRef.current) clearTimeout(sliderTimerRef.current);
    sliderTimerRef.current = setTimeout(() => {
      setShowSlider(false);
    }, 3000);
  };

  useEffect(() => {
    if (showSlider) {
      resetSliderTimer();
    }
    return () => {
      if (sliderTimerRef.current) clearTimeout(sliderTimerRef.current);
    };
  }, [showSlider, volume, isMuted]);

  // Unlock audio on initial interaction
  useEffect(() => {
    const unlock = () => {
      initAudio();
    };
    window.addEventListener("click", unlock);
    window.addEventListener("touchstart", unlock, { passive: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // Tick-tock sound interval during gameplay
  useEffect(() => {
    if (!gameState || gameState.status !== "playing") return;

    let tickCount = 0;
    // Play immediately on start
    playTickSound(false);

    const tickInterval = setInterval(() => {
      tickCount++;
      playTickSound(tickCount % 2 === 1);
    }, 1000);

    return () => {
      clearInterval(tickInterval);
    };
  }, [gameState?.status]);

  const renderVolumeWidget = () => {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center select-none">
        {showSlider && (
          <div 
            className="h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center px-3 mr-2 shadow-2xl space-x-2 animate-fade-in"
            onMouseEnter={resetSliderTimer}
            onTouchStart={resetSliderTimer}
          >
            <span className="text-[10px] font-bold text-zinc-500">SES</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVolume(val);
                if (val > 0 && isMuted) {
                  setIsMuted(false);
                } else if (val === 0 && !isMuted) {
                  setIsMuted(true);
                }
                resetSliderTimer();
              }}
              className="w-20 sm:w-24 h-1 bg-zinc-800 accent-red-500 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[10px] font-mono font-bold text-zinc-350 min-w-[28px] text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        )}

        <button
          onMouseDown={() => {
            longPressTimerRef.current = setTimeout(() => {
              setShowSlider(true);
            }, 300);
          }}
          onMouseUp={() => {
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
              if (!showSlider) {
                setIsMuted(!isMuted);
              }
            }
          }}
          onMouseLeave={() => {
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            initAudio();
            longPressTimerRef.current = setTimeout(() => {
              setShowSlider(true);
            }, 300);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
              if (!showSlider) {
                setIsMuted(prev => !prev);
              }
            }
          }}
          className={`w-12 h-12 rounded-full flex items-center justify-center border shadow-lg transition-all active:scale-95 cursor-pointer ${
            isMuted 
              ? "bg-zinc-950/90 border-zinc-800 text-zinc-500 hover:text-zinc-400" 
              : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-red-400"
          }`}
          title="Sesi aç/kapa (Ayar için basılı tutun)"
        >
          {isMuted ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>
      </div>
    );
  };

  // Sync admin settings from server to local state in lobby
  useEffect(() => {
    if (gameState && gameState.status === "preparing") {
      const currentSyncPool = gameState.pool || "genel";
      setSelectedPool(currentSyncPool);
      
      if (gameState.durationRange) {
        setDurationRange(gameState.durationRange);
      }
    }
  }, [gameState?.status, gameState?.durationRange, gameState?.pool]);

  // Handle playing sound effects based on game state changes
  useEffect(() => {
    if (!gameState) return;

    // 1. Play beep during countdown when timer decreases
    if (gameState.status === "countdown" && gameState.timer !== lastTimerRef.current) {
      if (gameState.timer > 0) {
        playCountdownBeep();
      }
      lastTimerRef.current = gameState.timer;
    }

    // 2. Play turn transition beep (Disabled since active player turn tracking is removed)
    /*
    if (gameState.status === "playing" && gameState.activePlayerId !== lastActivePlayerIdRef.current) {
      if (lastActivePlayerIdRef.current !== null) {
        playTurnBeep();
      }
      lastActivePlayerIdRef.current = gameState.activePlayerId;
    }
    */

    // 3. Play explosion when moving to result status
    if (gameState.status === "result" && lastStatusRef.current !== "result") {
      playExplosionSound();
    }

    // Reset last active player when not playing
    if (gameState.status !== "playing") {
      lastActivePlayerIdRef.current = null;
    }

    lastStatusRef.current = gameState.status;
  }, [gameState]);

  // Synthesis of sound effects using Web Audio API
  const playCountdownBeep = () => {
    try {
      if (isMutedRef.current) return;
      const ctx = initAudio();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(500, ctx.currentTime); // 500Hz beep
      gain.gain.setValueAtTime(0.08 * volumeRef.current, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio error:", e);
    }
  };

  const playTurnBeep = () => {
    try {
      if (isMutedRef.current) return;
      const ctx = initAudio();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(700, ctx.currentTime); // Short high pitch beep
      gain.gain.setValueAtTime(0.04 * volumeRef.current, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  };

  const playExplosionSound = () => {
    try {
      if (isMutedRef.current) return;
      const ctx = initAudio();
      if (!ctx) return;
      
      const now = ctx.currentTime;

      // 1. Lowpass filtered noise for rumble (gür patlama gürültüsü)
      const bufferSize = ctx.sampleRate * 2.5; // 2.5 seconds
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const lpFilter = ctx.createBiquadFilter();
      lpFilter.type = "lowpass";
      lpFilter.frequency.setValueAtTime(1000, now);
      lpFilter.frequency.exponentialRampToValueAtTime(10, now + 2.0);
      
      const noiseGain = ctx.createGain();
      // Increase gain to 1.0 for a gür sound
      noiseGain.gain.setValueAtTime(1.0 * volumeRef.current, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
      
      noise.connect(lpFilter);
      lpFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start();
      
      // 2. Sub-bass boom (sweeping oscillator)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      
      subOsc.type = "triangle";
      subOsc.frequency.setValueAtTime(120, now);
      subOsc.frequency.linearRampToValueAtTime(10, now + 1.5);
      
      subGain.gain.setValueAtTime(0.9 * volumeRef.current, now);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
      
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      
      subOsc.start();
      subOsc.stop(now + 1.7);

      // 3. High-frequency crackle/debris for texture
      const crackle = ctx.createBufferSource();
      crackle.buffer = buffer;

      const bpFilter = ctx.createBiquadFilter();
      bpFilter.type = "bandpass";
      bpFilter.frequency.setValueAtTime(2000, now);
      bpFilter.frequency.exponentialRampToValueAtTime(200, now + 0.8);
      bpFilter.Q.setValueAtTime(2, now);

      const crackleGain = ctx.createGain();
      crackleGain.gain.setValueAtTime(0.4 * volumeRef.current, now);
      crackleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

      crackle.connect(bpFilter);
      bpFilter.connect(crackleGain);
      crackleGain.connect(ctx.destination);
      crackle.start();

    } catch (e) {
      console.warn("Explosion audio error:", e);
    }
  };

  const playTickSound = (isTock = false) => {
    try {
      if (isMutedRef.current) return;
      const ctx = initAudio();
      if (!ctx) return;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(isTock ? 1200 : 1600, ctx.currentTime);
      filter.Q.setValueAtTime(3, ctx.currentTime);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(isTock ? 800 : 1100, ctx.currentTime);
      
      // Much louder (0.2 * master volume) and very fast decay
      gain.gain.setValueAtTime(0.2 * volumeRef.current, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      console.warn("Tick audio error:", e);
    }
  };

  // Admin Actions
  const handleUpdateSettings = (updatedRange, updatedPool) => {
    if (socket && room && isMeHost) {
      socket.emit("bomba-kategori-update-settings", {
        category: "",
        durationRange: updatedRange,
        pool: updatedPool || currentPool
      });
    }
  };

  const handlePoolChange = (pool) => {
    setSelectedPool(pool);
    handleUpdateSettings(durationRange, pool);
  };

  const handleStartGame = () => {
    if (room.players.length < 2) {
      setActiveError("Oyunu başlatmak için en az 2 oyuncu gereklidir.");
      return;
    }
    setActiveError("");

    if (socket && room && isMeHost) {
      const askedIds = room.askedQuestionIds?.["Bomba Kategori"] || [];
      let eligibleCategories = activePrompts.filter(cat => !askedIds.includes(cat));
      if (eligibleCategories.length === 0) {
        eligibleCategories = activePrompts;
      }
      const randomCat = eligibleCategories[Math.floor(Math.random() * eligibleCategories.length)];

      socket.emit("bomba-kategori-start", {
        category: randomCat,
        durationRange: durationRange,
        pool: currentPool
      });
    }
  };

  const handleNextPlayer = () => {
    if (socket && room) {
      socket.emit("bomba-kategori-next-player");
    }
  };

  const handleNewRound = () => {
    if (socket && room && isMeHost) {
      socket.emit("bomba-kategori-new-round");
    }
  };

  const handleTransferAdmin = (targetPlayerId) => {
    if (socket && room && isMeHost) {
      socket.emit("transfer-admin", { targetPlayerId });
    }
  };

  // Lobby Portal (Nickname Entry)
  if (!isInRoom) {
    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col items-center justify-center font-sans">
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-red-950/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-zinc-900/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-sm w-full px-6 py-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 items-center justify-center font-bold text-lg text-red-500 shadow-xl mb-4 animate-pulse">
              💥
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Bomba Kategori
            </h1>
            <p className="mt-2 text-xs text-zinc-400 font-medium">
              Süre gizli! Sırayla kategoriye uygun kelime söyleyin. Süre bitince kaybeden elenir!
            </p>
          </div>

          {/* Lobby Card */}
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
            {activeError && (
              <div className="mb-4 px-4 py-2.5 bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400 rounded-xl flex items-center space-x-2">
                <span>⚠️</span>
                <span>{activeError}</span>
              </div>
            )}

            {/* Name Input */}
            <div className="mb-6">
              <label htmlFor="pname" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Takma Adınız (Nickname)
              </label>
              <input
                id="pname"
                type="text"
                maxLength={12}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Örn: Aslan"
                className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-red-500/50 text-sm transition-colors"
                autoFocus
              />
            </div>

            {/* Enter Game Button */}
            <button
              onClick={() => handleJoinGame("Bomba Kategori")}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-xs font-bold text-white shadow-lg transition-all duration-250 cursor-pointer"
            >
              Oyuna Giriş Yap
            </button>
          </div>

          {/* Go Back */}
          <div className="text-center mt-6">
            <button
              onClick={onLeave}
              className="text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              ← Ana Sayfaya Geri Dön
            </button>
          </div>
        </div>
        {renderVolumeWidget()}
      </div>
    );
  }

  // 2. Lobby / Preparing Stage
  if (gameState.status === "preparing") {
    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
        <header className="relative z-10 border-b border-zinc-900/50 bg-[#09090b]/60 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-bold text-zinc-400">Bomba Kategori Lobisi</span>
            </div>
            <button
              onClick={onLeave}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-[10px] font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Oyundan Çık
            </button>
          </div>
        </header>

        <main className="relative z-10 flex-grow max-w-5xl w-full mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Players list */}
          <div className="lg:col-span-5 bg-[#0e0e11]/60 border border-zinc-900 p-5 rounded-2xl backdrop-blur-sm">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-800/45">
              <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Oyuncular ({room.players.length}/12)</h2>
              {isMeHost && <span className="text-[9px] text-red-500 font-bold uppercase">Yönetici 👑</span>}
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {room.players.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    player.id === socket?.id ? "bg-red-950/10 border-red-900/30" : "bg-zinc-950/40 border-zinc-900"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-2 h-2 rounded-full ${player.isHost ? "bg-red-500 animate-pulse" : "bg-zinc-650"}`} />
                    <span className="text-xs font-semibold text-zinc-200">{player.name}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-zinc-400 mr-2">{player.score} Puan</span>
                    {player.isHost && (
                      <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20">
                        ADM
                      </span>
                    )}
                    
                    {/* Host Transfer */}
                    {isMeHost && !player.isHost && (
                      <button
                        onClick={() => handleTransferAdmin(player.id)}
                        className="px-2 py-0.5 text-[9px] font-bold uppercase bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white rounded text-zinc-450 transition-colors cursor-pointer"
                      >
                        Admin Yap
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Admin panel / Waiting panel */}
          <div className="lg:col-span-7">
            {isMeHost ? (
              <div className="bg-[#0e0e11]/60 border border-zinc-900 p-6 rounded-2xl backdrop-blur-sm space-y-6">
                <div className="pb-2 border-b border-zinc-850">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">OYUN KURULUMU</h3>
                </div>

                {activeError && (
                  <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-400 rounded-lg">
                    {activeError}
                  </div>
                )}

                {/* Pool Selector */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-zinc-450 uppercase tracking-widest">Soru Havuzu Seçimi</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: "genel", label: "Genel" },
                      { key: "kpss", label: "KPSS" },
                      { key: "hepsi", label: "Hepsi" }
                    ].map((poolItem) => (
                      <button
                        key={poolItem.key}
                        type="button"
                        onClick={() => handlePoolChange(poolItem.key)}
                        className={`py-2 px-3 text-[11px] font-semibold rounded-xl border transition-all cursor-pointer ${
                          currentPool === poolItem.key
                            ? "bg-red-600/15 border-red-500 text-red-400 font-bold"
                            : "bg-zinc-950/50 border-zinc-900 text-zinc-400 hover:border-zinc-800"
                        }`}
                      >
                        {poolItem.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration Range Selector */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-zinc-450 uppercase tracking-widest">Süre Aralığı (Gizli)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: "5-50", label: "5 - 50 Saniye" },
                      { key: "15-50", label: "15 - 50 Saniye" },
                      { key: "20-60", label: "20 - 60 Saniye" }
                    ].map((range) => (
                      <button
                        key={range.key}
                        type="button"
                        onClick={() => {
                          setDurationRange(range.key);
                          handleUpdateSettings(range.key, currentPool);
                        }}
                        className={`py-2 px-3 text-[11px] font-semibold rounded-xl border transition-all cursor-pointer ${
                          durationRange === range.key
                            ? "bg-red-600/15 border-red-500 text-red-400 font-bold"
                            : "bg-zinc-950/50 border-zinc-900 text-zinc-400 hover:border-zinc-800"
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Button */}
                <button
                  onClick={handleStartGame}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-xs font-bold text-white shadow-lg shadow-red-500/10 transition-all cursor-pointer"
                >
                  Oyunu & Turu Başlat
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 rounded-3xl border border-dashed border-zinc-800 bg-[#0e0e11]/20 backdrop-blur-sm min-h-[300px]">
                <div className="w-12 h-12 rounded-full bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-center mb-5 animate-pulse text-lg">
                  💣
                </div>
                <h3 className="text-sm font-bold text-zinc-200">Ayarlar Bekleniyor...</h3>
                <p className="text-xs text-zinc-550 max-w-xs mx-auto mt-2 leading-relaxed">
                  Yöneticinin (Admin) kategori ve süre aralığını belirleyip oyunu başlatması bekleniyor. Lütfen bekleyin...
                </p>

                <div className="mt-6 p-4 rounded-xl border border-zinc-900 bg-zinc-950/50 max-w-xs w-full space-y-2.5">
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 pb-1.5 border-b border-zinc-900">
                    <span className="font-bold uppercase tracking-wider">Soru Havuzu:</span>
                    <span className="font-extrabold text-red-400 uppercase tracking-widest">{currentPool === "hepsi" ? "Hepsi" : (currentPool === "kpss" ? "KPSS" : "Genel")}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-zinc-550 pt-2 border-t border-zinc-900">
                    <span>Süre Limit Aralığı:</span>
                    <span className="font-mono text-zinc-350 font-bold">{durationRange}s</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
        {renderVolumeWidget()}
      </div>
    );
  }

  // 3. Countdown Stage (3, 2, 1)
  if (gameState.status === "countdown") {
    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col items-center justify-center font-sans overflow-hidden">
        <div className="absolute inset-0 bg-radial-at-c from-red-950/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 text-center max-w-md w-full px-6 space-y-8 animate-fade-in">
          {/* Header */}
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">HAZIRLANIN</span>
            <div className="text-[11px] font-bold text-red-500/80 uppercase tracking-wider bg-red-950/15 border border-red-950/40 rounded-full px-4 py-1.5 inline-block">
              Kategori: {gameState.category}
            </div>
          </div>

          {/* Large Countdown */}
          <div className="flex flex-col items-center justify-center h-48">
            <div className="text-8xl font-black text-white tracking-tighter animate-ping duration-1000">
              {gameState.timer}
            </div>
          </div>

          {/* Subtext info */}
          <div className="space-y-2">
            <p className="text-xs text-zinc-400">Sırayla kelimeleri söylemeye hazır olun!</p>
            <div className="inline-flex items-center space-x-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-bold text-white">
                Bomba Her An Patlayabilir!
              </span>
            </div>
          </div>
        </div>
        {renderVolumeWidget()}
      </div>
    );
  }

  // 4. Playing Stage
  if (gameState.status === "playing") {
    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[140px] bg-red-950/5 pointer-events-none" />

        <header className="relative z-10 border-b border-zinc-900/50 bg-[#09090b]/60 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-400">Bomba Arenası</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {myInfo && (
                <span className="text-[10px] font-bold bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full text-zinc-350">
                  Sen: <span className="text-red-400">{myInfo.name}</span> ({myScore} P)
                </span>
              )}
            </div>
          </div>
        </header>

        <main className="relative z-10 flex-grow max-w-lg w-full mx-auto px-6 py-6 flex flex-col justify-center items-center my-auto space-y-6">
          
          {/* Merged Bomb & Category Card */}
          <div className="w-full max-w-sm rounded-3xl p-8 text-center border bg-gradient-to-b from-[#180d0d] to-[#0e0e11]/80 border-red-950/20 shadow-[0_0_50px_-5px_rgba(239,68,68,0.15)] relative overflow-hidden mx-auto space-y-6">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/5 rounded-full blur-2xl animate-pulse" />
            
            {/* Category / Question Header */}
            <div className="space-y-1 pb-2 border-b border-zinc-900/60">
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block">
                KATEGORİ
              </span>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-wide leading-tight">
                {gameState.category}
              </h2>
            </div>

            {/* Bomb Emoji with scale-up-down breathing animation */}
            <div className="relative text-7xl my-4 select-none animate-[pulse_1s_infinite]">
              💣
            </div>

            <h1 className="text-xl font-extrabold tracking-tight text-red-500 animate-pulse">
              BOMBA AKTİF!
            </h1>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Kelimenizi hızlıca söyleyin ve sırayı arkadaşınıza geçirin!
            </p>

            {/* Fuse animation indicator */}
            <div className="pt-2 max-w-[150px] mx-auto flex items-center justify-center space-x-2.5">
              <span className="text-xs text-zinc-500">Süre Gizli</span>
              <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden relative">
                <div className="absolute top-0 right-0 h-full w-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full animate-[pulse_1.5s_infinite]" />
              </div>
              <span className="text-xs animate-[bounce_1.2s_infinite]">🔥</span>
            </div>
          </div>

          {/* Players in Room Grid */}
          <div className="bg-[#0e0e11]/25 border border-zinc-900/60 rounded-2xl p-4 max-w-md w-full mx-auto">
            <h3 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-3 text-center">
              ODADAKİ OYUNCULAR
            </h3>
            <div className="flex items-center justify-center flex-wrap gap-2 text-xs">
              {room.players.map((player) => (
                <div
                  key={player.id}
                  className="px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 transition-all bg-zinc-950/40 border-zinc-900 text-zinc-400"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-550" />
                  <span className="truncate max-w-[80px] font-semibold">{player.name}</span>
                </div>
              ))}
            </div>
          </div>

        </main>
        {renderVolumeWidget()}
      </div>
    );
  }

  // 5. Result Stage
  if (gameState.status === "result") {
    const loser = room.players.find(p => p.id === gameState.loserId);
    const isMeLoser = gameState.loserId === socket?.id;

    const handleSelectLoser = (playerId) => {
      if (socket && room && isMeHost) {
        socket.emit("bomba-kategori-set-loser", { loserId: playerId });
      }
    };

    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
        {/* Flash Background Effect */}
        <div className="absolute inset-0 bg-red-950/10 pointer-events-none animate-[pulse_2s_infinite]" />
        
        <header className="relative z-10 border-b border-zinc-900/50 bg-[#09090b]/60 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-bold text-zinc-400">Patlama Sonuçları</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {myInfo && (
                <span className="text-[10px] font-bold bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full text-zinc-350">
                  Sen: <span className="text-red-400">{myInfo.name}</span> ({myScore} P)
                </span>
              )}
            </div>
          </div>
        </header>

        <main className="relative z-10 flex-grow max-w-3xl w-full mx-auto px-6 py-6 flex flex-col justify-between my-auto">
          
          {/* Bomb Exploded Title */}
          <div className="text-center py-6 space-y-4">
            <div className="inline-flex w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 items-center justify-center text-3xl animate-bounce">
              💥
            </div>
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-amber-500 tracking-tighter drop-shadow-md">
              BOMBA PATLADI!
            </h1>
            <div className="text-xs text-zinc-400">
              Kategori: <span className="font-bold text-zinc-350">"{gameState.category}"</span>
            </div>
          </div>

          {gameState.loserId === null ? (
            /* Loser Selection Panel */
            <div className="bg-zinc-950/40 border border-zinc-900/60 rounded-3xl p-6 md:p-8 backdrop-blur-sm max-w-md w-full mx-auto text-center space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-red-950/40" />
              
              {isMeHost ? (
                <>
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block">
                      YÖNETİCİ SEÇİMİ
                    </span>
                    <h2 className="text-xl font-extrabold text-white">
                      Bomba kimin elindeydi?
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Süre bittiğinde bombanın elinde olduğu (kaybeden) oyuncuyu seçin:
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {room.players.map((player) => (
                      <button
                        key={player.id}
                        onClick={() => handleSelectLoser(player.id)}
                        className="py-3 px-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-red-500/55 hover:bg-red-950/10 text-xs font-bold text-zinc-200 hover:text-white transition-all cursor-pointer truncate"
                      >
                        {player.name}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-8 space-y-4">
                  <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-zinc-300">
                      Seçim Bekleniyor...
                    </h2>
                    <p className="text-xs text-zinc-505 leading-relaxed max-w-xs mx-auto">
                      Yöneticinin (Admin) bombanın kimin elinde patladığını seçmesi bekleniyor. Lütfen bekleyin...
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Loser Display Card & Scoreboard */
            <>
              <div className="bg-zinc-950/40 border border-zinc-900/60 rounded-3xl p-6 md:p-8 backdrop-blur-sm max-w-md w-full mx-auto text-center space-y-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-red-500/40" />
                
                <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest block">
                  ELENEN OYUNCU
                </span>

                <h2 className="text-3xl font-extrabold text-white truncate px-3">
                  {loser ? loser.name : "Bilinmeyen"}
                </h2>

                <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
                  {isMeLoser 
                    ? "Süre bittiğinde bomba senin elindeydi! Dikkat et, bir dahaki sefere daha hızlı ol." 
                    : "Bomba elindeyken süre bitti ve patladı!"
                  }
                </p>
              </div>

              {/* Survival Scores Board */}
              <div className="bg-[#0e0e11]/60 border border-zinc-900 p-5 md:p-6 rounded-3xl max-w-md w-full mx-auto mt-6 space-y-4">
                <h3 className="text-xs font-bold text-zinc-450 uppercase tracking-widest pb-2 border-b border-zinc-900">
                  Puan Durumu (Hayatta Kalanlar +1, Kaybeden -1)
                </h3>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {room.players
                    .slice()
                    .sort((a, b) => b.score - a.score)
                    .map((player) => {
                      const isLoser = player.id === gameState.loserId;
                      return (
                        <div
                          key={player.id}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            isLoser 
                              ? "bg-red-950/10 border-red-500/20" 
                              : "bg-zinc-950/40 border-zinc-900"
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <span className="text-sm">{isLoser ? "💀" : "🛡️"}</span>
                            <span className={`text-xs font-semibold ${isLoser ? "text-red-400 line-through" : "text-zinc-200"}`}>
                              {player.name}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-mono font-bold text-zinc-150">
                              {player.score} Puan
                            </span>
                            {isLoser ? (
                              <span className="text-[9px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">
                                -1
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                +1
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}

          {/* Action Button Controls (Admin Only) */}
          <div className="max-w-md w-full mx-auto mt-6 space-y-3">
            {gameState.loserId !== null && (
              isMeHost ? (
                <button
                  onClick={handleNewRound}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-xs font-bold text-white shadow-lg shadow-red-500/10 transition-all cursor-pointer"
                >
                  Yeni Tur (Ayarlara Dön)
                </button>
              ) : (
                <div className="text-center py-3 rounded-xl bg-zinc-950/40 border border-zinc-900/60 animate-pulse">
                  <p className="text-xs font-semibold text-zinc-500">
                    Yöneticinin (Admin) yeni turu başlatması bekleniyor...
                  </p>
                </div>
              )
            )}

            <div className="text-center pt-2">
              <button
                onClick={onLeave}
                className="text-[10px] font-bold text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
              >
                {isMeHost ? "Oyundan Ayrıl & Lobiyi Kapat" : "Oyundan Ayrıl"}
              </button>
            </div>
          </div>

        </main>
        {renderVolumeWidget()}
      </div>
    );
  }

  return null;
}

export default BombCategory;
