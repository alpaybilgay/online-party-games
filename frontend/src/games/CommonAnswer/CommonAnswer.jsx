import React, { useState, useEffect } from "react";
import { socket } from "../../socket/socket";
import { commonAnswerQuestions } from "../../data/commonAnswerQuestions";

function CommonAnswer({
  room,
  isInRoom,
  playerName,
  setPlayerName,
  onLeave,
  activeError,
  setActiveError,
  handleJoinGame
}) {
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [myChoice, setMyChoice] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lastQuestionId, setLastQuestionId] = useState(null);

  const gameState = room?.gameState;
  const isMeHost = room?.hostId === socket?.id;
  const myInfo = room?.players.find((p) => p.id === socket?.id);
  const myScore = myInfo ? myInfo.score : 0;

  // Sync duration setting in lobby
  useEffect(() => {
    if (gameState && gameState.status === "preparing") {
      if (gameState.duration) {
        setSelectedDuration(gameState.duration);
      }
    }
  }, [gameState?.status, gameState?.duration]);

  // Reset local submission states when a new question starts
  useEffect(() => {
    if (gameState && gameState.status === "playing") {
      const qId = gameState.currentQuestion?.id;
      if (qId !== lastQuestionId) {
        setMyChoice("");
        setHasSubmitted(false);
        setLastQuestionId(qId);
      }
    } else if (gameState && gameState.status === "preparing") {
      setMyChoice("");
      setHasSubmitted(false);
      setLastQuestionId(null);
    }
  }, [gameState?.status, gameState?.currentQuestion?.id, lastQuestionId]);

  // Admin Actions
  const handleUpdateDuration = (duration) => {
    if (socket && room && isMeHost) {
      socket.emit("common-answer-update-settings", { duration });
    }
  };

  const handleAssignTeam = (playerId, teamName) => {
    if (!socket || !room || !isMeHost) return;

    const currentTeams = {
      A: gameState.teams?.A ? [...gameState.teams.A] : [],
      B: gameState.teams?.B ? [...gameState.teams.B] : []
    };

    // Remove player from both teams first
    currentTeams.A = currentTeams.A.filter(id => id !== playerId);
    currentTeams.B = currentTeams.B.filter(id => id !== playerId);

    if (teamName === "A") {
      if (currentTeams.A.length >= 2) {
        setActiveError("A Takımı maksimum 2 oyuncu alabilir.");
        return;
      }
      currentTeams.A.push(playerId);
      setActiveError("");
    } else if (teamName === "B") {
      if (currentTeams.B.length >= 2) {
        setActiveError("B Takımı maksimum 2 oyuncu alabilir.");
        return;
      }
      currentTeams.B.push(playerId);
      setActiveError("");
    } else {
      setActiveError("");
    }

    socket.emit("common-answer-set-teams", { teams: currentTeams });
  };

  const handleStartQuestion = () => {
    const playerCount = room.players.length;
    if (playerCount !== 2 && playerCount !== 4) {
      setActiveError("Bu oyun tam olarak 2 veya 4 kişi ile oynanabilir.");
      return;
    }

    if (playerCount === 4) {
      const teamA = gameState.teams?.A || [];
      const teamB = gameState.teams?.B || [];
      if (teamA.length !== 2 || teamB.length !== 2) {
        setActiveError("Lütfen takımları 2'şer kişi olacak şekilde ayarlayın.");
        return;
      }
    }

    setActiveError("");

    // Choose a random question
    if (commonAnswerQuestions.length > 0) {
      let randomQ = commonAnswerQuestions[Math.floor(Math.random() * commonAnswerQuestions.length)];
      
      // Attempt to avoid repeating the last question if possible
      if (gameState.currentQuestion && commonAnswerQuestions.length > 1) {
        while (randomQ.id === gameState.currentQuestion.id) {
          randomQ = commonAnswerQuestions[Math.floor(Math.random() * commonAnswerQuestions.length)];
        }
      }

      socket.emit("common-answer-start-question", { question: randomQ });
    }
  };

  const handleSubmitChoice = (choiceText) => {
    if (hasSubmitted) return;
    setMyChoice(choiceText);

    socket.emit("common-answer-submit-choice", { choice: choiceText }, (res) => {
      if (res.success) {
        setHasSubmitted(true);
        setActiveError("");
      } else {
        setActiveError(res.message || "Seçim iletilemedi.");
      }
    });
  };

  const handleNextRound = () => {
    if (socket && room && isMeHost) {
      socket.emit("common-answer-next-round");
    }
  };

  // Lobby Portal (Nickname Entry)
  if (!isInRoom) {
    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col items-center justify-center font-sans">
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-violet-950/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-fuchsia-950/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-sm w-full px-6 py-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 items-center justify-center font-bold text-lg text-violet-400 shadow-xl mb-4">
              🤝
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Ortak Cevabı Bul
            </h1>
            <p className="mt-2 text-xs text-zinc-400 font-medium">
              Arkadaşlarınızla aynı seçeneği seçmeye çalışın. Takım arkadaşınızla ortak karara varın!
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
                placeholder="Örn: Güneş"
                className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-violet-500/50 text-sm transition-colors"
                autoFocus
              />
            </div>

            {/* Enter Game Button */}
            <button
              onClick={() => handleJoinGame("Ortak Cevabı Bul")}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-xs font-bold text-white shadow-lg transition-all duration-250 cursor-pointer"
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
      </div>
    );
  }

  const playerCount = room.players.length;
  const isCountValid = playerCount === 2 || playerCount === 4;

  // 2. Lobby / Preparing Stage
  if (gameState.status === "preparing") {
    const teamA = gameState.teams?.A || [];
    const teamB = gameState.teams?.B || [];

    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
        <header className="relative z-10 border-b border-zinc-900/50 bg-[#09090b]/60 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-400">Ortak Cevap Lobisi</span>
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
          
          {/* Players pool column */}
          <div className="lg:col-span-5 bg-[#0e0e11]/60 border border-zinc-900 p-5 rounded-2xl backdrop-blur-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800/40">
              <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Oyuncular ({playerCount}/4)</h2>
              {isMeHost && <span className="text-[9px] text-violet-400 font-bold uppercase">Yönetici 👑</span>}
            </div>

            {/* Warning Message if counts are not 2 or 4 */}
            {!isCountValid && (
              <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 rounded-xl">
                ⚠️ Bu oyun tam olarak <strong>2 veya 4 kişi</strong> ile oynanır. Şu an {playerCount} kişi odada.
              </div>
            )}

            <div className="space-y-2">
              {room.players.map((player) => {
                const assignedTeam = teamA.includes(player.id) ? "A" : (teamB.includes(player.id) ? "B" : null);
                
                return (
                  <div
                    key={player.id}
                    className={`flex flex-col p-3 rounded-xl border ${
                      player.id === socket?.id ? "bg-violet-950/15 border-violet-850" : "bg-zinc-950/40 border-zinc-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${player.isHost ? "bg-amber-500 animate-pulse" : "bg-zinc-500"}`} />
                        <span className="text-xs font-semibold text-zinc-200">{player.name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {assignedTeam ? (
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                            assignedTeam === "A" 
                              ? "bg-violet-600/10 text-violet-400 border-violet-500/20" 
                              : "bg-fuchsia-600/10 text-fuchsia-400 border-fuchsia-500/20"
                          }`}>
                            {assignedTeam} Takımı
                          </span>
                        ) : (
                          playerCount === 4 && (
                            <span className="text-[8px] text-zinc-500 font-bold uppercase bg-zinc-900 px-1 py-0.5 rounded">
                              Boşta
                            </span>
                          )
                        )}
                      </div>
                    </div>

                    {/* Admin Team Assigning buttons for 4-player games */}
                    {isMeHost && playerCount === 4 && (
                      <div className="flex items-center space-x-1.5 mt-3 pt-2.5 border-t border-zinc-900/60">
                        <button
                          onClick={() => handleAssignTeam(player.id, "A")}
                          className={`flex-1 py-1 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                            assignedTeam === "A"
                              ? "bg-violet-600 border-violet-500 text-white"
                              : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                          }`}
                        >
                          A Takımı
                        </button>
                        <button
                          onClick={() => handleAssignTeam(player.id, "B")}
                          className={`flex-1 py-1 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                            assignedTeam === "B"
                              ? "bg-fuchsia-600 border-fuchsia-500 text-white"
                              : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                          }`}
                        >
                          B Takımı
                        </button>
                        <button
                          onClick={() => handleAssignTeam(player.id, "none")}
                          className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 rounded text-[9px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                        >
                          Kaldır
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Setup / Settings board */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Show team visual distribution for 4 players */}
            {playerCount === 4 && (
              <div className="grid grid-cols-2 gap-4">
                {/* Team A Card */}
                <div className="bg-[#0e0e11]/60 border border-zinc-900 p-4 rounded-2xl">
                  <h3 className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-3 pb-1 border-b border-zinc-900">
                    💜 A TAKIMI ({teamA.length}/2)
                  </h3>
                  <div className="space-y-1.5 min-h-[60px] flex flex-col justify-center">
                    {teamA.length > 0 ? (
                      teamA.map(id => {
                        const p = room.players.find(x => x.id === id);
                        return (
                          <div key={id} className="text-xs font-semibold text-zinc-300 py-1 bg-zinc-950/20 px-2 rounded border border-zinc-900/60">
                            {p ? p.name : "..."}
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-[10px] text-zinc-650 text-center block">Oyuncu atanmadı</span>
                    )}
                  </div>
                </div>

                {/* Team B Card */}
                <div className="bg-[#0e0e11]/60 border border-zinc-900 p-4 rounded-2xl">
                  <h3 className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-wider mb-3 pb-1 border-b border-zinc-900">
                    💖 B TAKIMI ({teamB.length}/2)
                  </h3>
                  <div className="space-y-1.5 min-h-[60px] flex flex-col justify-center">
                    {teamB.length > 0 ? (
                      teamB.map(id => {
                        const p = room.players.find(x => x.id === id);
                        return (
                          <div key={id} className="text-xs font-semibold text-zinc-300 py-1 bg-zinc-950/20 px-2 rounded border border-zinc-900/60">
                            {p ? p.name : "..."}
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-[10px] text-zinc-650 text-center block">Oyuncu atanmadı</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isMeHost ? (
              <div className="bg-[#0e0e11]/60 border border-zinc-900 p-6 rounded-2xl backdrop-blur-sm space-y-6">
                <div className="pb-2 border-b border-zinc-850">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">OYUN AYARLARI</h3>
                </div>

                {activeError && (
                  <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-400 rounded-lg">
                    {activeError}
                  </div>
                )}

                {/* Duration Limit selector */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-zinc-450 uppercase tracking-widest">Süre Limiti</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 15, 20].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => {
                          setSelectedDuration(sec);
                          handleUpdateDuration(sec);
                        }}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          selectedDuration === sec
                            ? "bg-violet-600/15 border-violet-500 text-violet-400"
                            : "bg-zinc-950/50 border-zinc-900 text-zinc-400 hover:border-zinc-800"
                        }`}
                      >
                        {sec} Saniye
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Game Button */}
                <button
                  onClick={handleStartQuestion}
                  disabled={!isCountValid}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-xs font-bold text-white shadow-lg shadow-violet-500/10 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {isCountValid ? "Soruyu & Oyunu Başlat" : "Oyuncu Sayısı 2 veya 4 Olunca Başlatılabilir"}
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 rounded-3xl border border-dashed border-zinc-800 bg-[#0e0e11]/25 backdrop-blur-sm min-h-[220px]">
                <div className="w-10 h-10 rounded-full bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-center mb-4 text-sm">
                  🤝
                </div>
                <h3 className="text-sm font-bold text-zinc-200 font-sans">Yöneticinin Soruyu Başlatması Bekleniyor</h3>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-2 leading-relaxed">
                  Lobi ayarları senkronizedir. Yönetici süreyi {selectedDuration} saniye olarak seçti.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // 3. Playing Stage
  if (gameState.status === "playing") {
    const q = gameState.currentQuestion;
    const answeredCount = Object.keys(gameState.answers).length;
    const totalPlayers = room.players.length;

    // Calculate percentage of timer remaining for progressive progress bar
    const duration = gameState.duration || 15;
    const timerPercent = Math.max(0, Math.min(100, (gameState.timer / duration) * 100));

    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-900/5 rounded-full blur-[100px] pointer-events-none" />

        <header className="relative z-10 border-b border-zinc-900/50 bg-[#09090b]/60 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-400">Ortak Cevap Arenası</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {myInfo && (
                <span className="text-[10px] font-bold bg-zinc-900 border border-zinc-850 px-3 py-1 rounded-full text-zinc-350">
                  Mod: <span className="text-violet-400">{playerCount === 2 ? "2 Oyuncu" : "Takım Oyunu (4P)"}</span>
                </span>
              )}
            </div>
          </div>
        </header>

        <main className="relative z-10 flex-grow max-w-2xl w-full mx-auto px-6 py-6 flex flex-col justify-between my-auto space-y-6">
          
          {/* Question Card */}
          {q && (
            <div className="bg-[#0e0e11]/60 border border-zinc-900 rounded-3xl p-6 md:p-8 text-center shadow-xl relative overflow-hidden">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">
                ORTAK SORU
              </span>
              <h2 className="text-lg md:text-xl font-extrabold text-zinc-100 leading-relaxed max-w-xl mx-auto">
                {q.question}
              </h2>

              {/* Progress timer bar */}
              <div className="w-full bg-zinc-950 h-1.5 mt-6 rounded-full overflow-hidden border border-zinc-900/40 relative">
                <div 
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 h-full transition-all duration-1000 ease-linear rounded-full" 
                  style={{ width: `${timerPercent}%` }}
                />
              </div>
              
              <div className="flex justify-between items-center mt-2 text-[10px] font-mono text-zinc-500">
                <span>Cevaplar: {answeredCount} / {totalPlayers}</span>
                <span>Kalan Süre: {gameState.timer}sn</span>
              </div>
            </div>
          )}

          {/* Option Buttons Panel */}
          <div className="space-y-3">
            {activeError && (
              <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400 rounded-lg text-center">
                {activeError}
              </div>
            )}

            {!hasSubmitted ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {q?.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSubmitChoice(opt)}
                    className="py-4.5 px-6 rounded-2xl bg-[#0e0e11]/60 border border-zinc-900 hover:border-violet-500/50 hover:bg-[#121216] text-xs sm:text-sm font-bold text-zinc-200 active:scale-[0.98] transition-all text-center cursor-pointer shadow-md shadow-zinc-950/20"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-[#0e0e11]/60 border border-zinc-900 p-8 rounded-3xl text-center space-y-4 shadow-lg max-w-md w-full mx-auto">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 mx-auto text-xs">✓</div>
                <h3 className="text-sm font-bold text-zinc-200">Seçiminiz Gönderildi!</h3>
                <div className="inline-block px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-900 text-xs font-bold text-violet-400 font-mono">
                  {myChoice}
                </div>
                <p className="text-[10px] text-zinc-505 animate-pulse mt-4">
                  Diğer oyuncuların seçimlerini yapması bekleniyor...
                </p>
              </div>
            )}
          </div>

          {/* Active Submit Statuses List */}
          <div className="bg-[#0e0e11]/20 border border-zinc-900/60 rounded-2xl p-4 max-w-md w-full mx-auto">
            <h3 className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest mb-3 text-center">
              OYUNCULARIN SEÇİM DURUMLARI
            </h3>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              {room.players.map((p) => {
                const hasChosen = gameState.answers[p.id] !== undefined;
                return (
                  <div key={p.id} className="flex items-center space-x-2 bg-zinc-950/20 px-2.5 py-1.5 rounded-lg border border-zinc-900">
                    <span className={`w-1.5 h-1.5 rounded-full ${hasChosen ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                    <span className="text-[11px] text-zinc-300 truncate max-w-[100px]">{p.name}</span>
                    <span className="text-[9px] text-zinc-600 ml-auto">{hasChosen ? "Seçti" : "Düşünüyor"}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </main>
      </div>
    );
  }

  // 4. Result / Matching Stage
  if (gameState.status === "result") {
    const q = gameState.currentQuestion;
    const answers = gameState.answers || {};
    const teamA = gameState.teams?.A || [];
    const teamB = gameState.teams?.B || [];

    // Check matches for displaying visual feedback
    let isMatchA = false;
    let isMatchB = false;
    let isMatch2P = false;

    if (playerCount === 2) {
      const p1 = room.players[0];
      const p2 = room.players[1];
      const a1 = answers[p1.id];
      const a2 = answers[p2.id];
      if (a1 !== undefined && a2 !== undefined && a1 === a2) {
        isMatch2P = true;
      }
    } else if (playerCount === 4) {
      if (teamA.length === 2) {
        const a1 = answers[teamA[0]];
        const a2 = answers[teamA[1]];
        if (a1 !== undefined && a2 !== undefined && a1 === a2) {
          isMatchA = true;
        }
      }
      if (teamB.length === 2) {
        const a1 = answers[teamB[0]];
        const a2 = answers[teamB[1]];
        if (a1 !== undefined && a2 !== undefined && a1 === a2) {
          isMatchB = true;
        }
      }
    }

    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-900/5 rounded-full blur-[100px] pointer-events-none" />

        <header className="relative z-10 border-b border-zinc-900/50 bg-[#09090b]/60 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-zinc-400">Tur Sonuçları</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {myInfo && (
                <span className="text-[10px] font-bold bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full text-zinc-350">
                  Sen: <span className="text-violet-400">{myInfo.name}</span> ({myScore} P)
                </span>
              )}
            </div>
          </div>
        </header>

        <main className="relative z-10 flex-grow max-w-3xl w-full mx-auto px-6 py-6 flex flex-col justify-between my-auto">
          
          {/* Question Summary */}
          {q && (
            <div className="bg-[#0e0e11]/60 border border-zinc-900 rounded-3xl p-5 text-center shadow-md mb-6">
              <span className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest block mb-1">
                SORULAN SORU
              </span>
              <p className="text-sm font-bold text-zinc-200">
                "{q.question}"
              </p>
            </div>
          )}

          {/* Matches Alerts */}
          {(isMatch2P || isMatchA || isMatchB) ? (
            <div className="max-w-md w-full mx-auto mb-6 space-y-2">
              {isMatch2P && (
                <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-center text-xs font-bold text-emerald-400 animate-bounce">
                  🎉 HARİKA! İki oyuncu da aynı cevabı seçti ve +1 puan kazandı!
                </div>
              )}
              {isMatchA && (
                <div className="px-4 py-2 bg-violet-600/10 border border-violet-500/20 rounded-xl text-center text-xs font-bold text-violet-400">
                  💜 A TAKIMI eşleşti ve +1 puan kazandı!
                </div>
              )}
              {isMatchB && (
                <div className="px-4 py-2 bg-fuchsia-600/10 border border-fuchsia-500/20 rounded-xl text-center text-xs font-bold text-fuchsia-400">
                  💖 B TAKIMI eşleşti ve +1 puan kazandı!
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-md w-full mx-auto mb-6 px-4 py-3 bg-zinc-900/30 border border-zinc-900 rounded-2xl text-center text-xs font-bold text-zinc-500">
              😔 Maalesef hiçbir eşleşme sağlanamadı!
            </div>
          )}

          {/* Options side-by-side with player votes */}
          <div className="bg-zinc-950/40 border border-zinc-900/60 rounded-3xl p-5 md:p-6 backdrop-blur-sm max-w-lg w-full mx-auto mb-6">
            <h3 className="text-xs font-bold text-zinc-450 uppercase tracking-widest pb-2.5 border-b border-zinc-900 mb-4">
              OYUNCULARIN SEÇİMLERİ
            </h3>

            <div className="space-y-3">
              {q?.options.map((opt, index) => {
                // Find players who voted for this option
                const voters = room.players.filter(p => answers[p.id] === opt);
                
                // Determine matches in 4-player team mode for highlights
                let hasTeamMatchHighlight = false;
                if (playerCount === 4) {
                  const votersIds = voters.map(v => v.id);
                  const isTeamAvoting = teamA.every(id => votersIds.includes(id));
                  const isTeamBvoting = teamB.every(id => votersIds.includes(id));
                  if (isTeamAvoting || isTeamBvoting) {
                    hasTeamMatchHighlight = true;
                  }
                }
                
                // Highlight condition for 2 players
                const has2PMatchHighlight = playerCount === 2 && voters.length === 2;
                const isOptionGlow = hasTeamMatchHighlight || has2PMatchHighlight;

                return (
                  <div
                    key={index}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isOptionGlow
                        ? "bg-gradient-to-r from-emerald-950/20 to-zinc-950/25 border-emerald-500/40 shadow-lg shadow-emerald-500/5"
                        : "bg-zinc-900/30 border-zinc-900"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-xs sm:text-sm font-bold ${isOptionGlow ? "text-emerald-400" : "text-zinc-350"}`}>
                        {opt}
                      </span>
                      {isOptionGlow && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                          Eşleşti ✅
                        </span>
                      )}
                    </div>

                    {/* Voters list */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {voters.length > 0 ? (
                        voters.map(v => {
                          const isPlayerA = teamA.includes(v.id);
                          const isPlayerB = teamB.includes(v.id);
                          
                          return (
                            <span 
                              key={v.id} 
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                                isPlayerA 
                                  ? "bg-violet-600/10 text-violet-400 border-violet-500/20" 
                                  : (isPlayerB 
                                    ? "bg-fuchsia-600/10 text-fuchsia-400 border-fuchsia-500/20" 
                                    : "bg-zinc-900 text-zinc-400 border-zinc-800")
                              }`}
                            >
                              {v.name}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[9px] text-zinc-650 font-medium">Hiçbir oyuncu seçmedi</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Leaderboard Scoreboard */}
          <div className="bg-zinc-950/40 border border-zinc-900/60 rounded-3xl p-5 max-w-lg w-full mx-auto space-y-4">
            
            {playerCount === 2 ? (
              <div>
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center mb-3">SKOR TABLOSU</h3>
                <div className="grid grid-cols-2 gap-3">
                  {room.players.map(p => (
                    <div key={p.id} className="p-3 bg-zinc-950/30 border border-zinc-900 rounded-xl text-center">
                      <span className="block text-[10px] text-zinc-500 font-bold uppercase truncate">{p.name}</span>
                      <span className="text-xl font-black text-white font-mono">{p.score} Puan</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center mb-3">TAKIM SKORLARI</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-zinc-950/30 border border-zinc-900 rounded-xl text-center">
                    <span className="block text-[10px] text-violet-400 font-bold uppercase">💜 A TAKIMI</span>
                    <span className="text-xl font-black text-white font-mono">{gameState.teamScores?.A || 0} Puan</span>
                    <span className="block text-[8px] text-zinc-600 mt-1">
                      {teamA.map(id => room.players.find(x => x.id === id)?.name).join(" & ")}
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-950/30 border border-zinc-900 rounded-xl text-center">
                    <span className="block text-[10px] text-fuchsia-400 font-bold uppercase">💖 B TAKIMI</span>
                    <span className="text-xl font-black text-white font-mono">{gameState.teamScores?.B || 0} Puan</span>
                    <span className="block text-[8px] text-zinc-600 mt-1">
                      {teamB.map(id => room.players.find(x => x.id === id)?.name).join(" & ")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Next Round Control (Admin Only) */}
            {isMeHost ? (
              <div className="max-w-xs mx-auto pt-2 space-y-2">
                <button
                  onClick={handleStartQuestion}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-xs font-bold text-white shadow-lg transition-all cursor-pointer"
                >
                  Sonraki Soruya Geç
                </button>
                <button
                  onClick={handleNextRound}
                  className="w-full py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-bold text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Oyun Ayarlarına Dön
                </button>
              </div>
            ) : (
              <div className="text-center py-2 animate-pulse mt-2">
                <p className="text-xs font-semibold text-zinc-500">
                  Yöneticinin (Admin) yeni soruyu başlatması bekleniyor...
                </p>
              </div>
            )}

            <div className="text-center pt-2">
              <button
                onClick={onLeave}
                className="text-[10px] font-bold text-zinc-650 hover:text-zinc-500 transition-colors cursor-pointer"
              >
                {isMeHost ? "Oyundan Ayrıl & Lobiyi Kapat" : "Oyundan Ayrıl"}
              </button>
            </div>
          </div>

        </main>
      </div>
    );
  }

  return null;
}

export default CommonAnswer;
