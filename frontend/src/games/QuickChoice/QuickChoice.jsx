import React, { useState, useEffect } from "react";
import { socket } from "../../socket/socket";
import { quickChoiceQuestions } from "../../data/quickChoiceQuestions";

const getCategoryLabel = (catKey) => {
  const labels = {
    all: "Hepsi",
    bilim: "Bilim",
    sanat: "Sanat",
    kpss: "KPSS Hepsi",
    kpss_tarih: "KPSS Tarih",
    kpss_cografya: "KPSS Coğrafya",
    cografya: "Coğrafya"
  };
  return labels[catKey] || catKey;
};

function QuickChoice({
  room,
  isInRoom,
  playerName,
  setPlayerName,
  onLeave,
  activeError,
  setActiveError,
  handleJoinGame
}) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [myChoice, setMyChoice] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lastQuestionId, setLastQuestionId] = useState(null);

  const gameState = room?.gameState;
  const isMeHost = room?.hostId === socket?.id;
  const myInfo = room?.players.find((p) => p.id === socket?.id);
  const myScore = myInfo ? myInfo.score : 0;

  // Sync lobby settings from server in real time
  useEffect(() => {
    if (gameState && gameState.status === "preparing") {
      if (gameState.category) {
        setSelectedCategory(gameState.category);
      }
      if (gameState.duration) {
        setSelectedDuration(gameState.duration);
      }
    }
  }, [gameState?.status, gameState?.category, gameState?.duration]);

  // Reset choices when a new question starts
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

  // Admin actions
  const handleUpdateSettings = (cat, dur) => {
    if (socket && room && isMeHost) {
      socket.emit("quick-choice-update-settings", { category: cat, duration: dur });
    }
  };

  const handleStartQuestion = () => {
    if (quickChoiceQuestions.length === 0) return;

    // Filter questions by category
    let categoryQuestions = quickChoiceQuestions;
    if (selectedCategory !== "all") {
      if (selectedCategory === "kpss") {
        categoryQuestions = quickChoiceQuestions.filter(q => q.category === "kpss" || q.category === "kpss_tarih" || q.category === "kpss_cografya");
      } else {
        categoryQuestions = quickChoiceQuestions.filter(q => q.category === selectedCategory);
      }
    }

    if (categoryQuestions.length === 0) {
      setActiveError("Bu kategoriye ait soru bulunamadı.");
      return;
    }

    setActiveError("");

    const askedIds = room.askedQuestionIds?.["Hızlı Şık"] || [];
    let eligibleQuestions = categoryQuestions.filter(q => !askedIds.includes(q.id));
    if (eligibleQuestions.length === 0) {
      eligibleQuestions = categoryQuestions;
    }

    // Select a random question
    let randomQ = eligibleQuestions[Math.floor(Math.random() * eligibleQuestions.length)];

    // Avoid picking the same question consecutively if there are options
    if (gameState.currentQuestion && eligibleQuestions.length > 1) {
      let attempts = 0;
      while (randomQ.id === gameState.currentQuestion.id && attempts < 10) {
        randomQ = eligibleQuestions[Math.floor(Math.random() * eligibleQuestions.length)];
        attempts++;
      }
    }

    socket.emit("quick-choice-start-question", { question: randomQ });
  };

  const handleSubmitChoice = (choiceText) => {
    if (hasSubmitted) return;
    setMyChoice(choiceText);

    socket.emit("quick-choice-submit-choice", { choice: choiceText }, (res) => {
      if (res.success) {
        setHasSubmitted(true);
        setActiveError("");
      } else {
        setActiveError(res.message || "Cevap iletilemedi.");
      }
    });
  };

  const handleNextRound = () => {
    if (socket && room && isMeHost) {
      socket.emit("quick-choice-next-round");
    }
  };

  // Lobby Portal (Nickname Entry)
  if (!isInRoom) {
    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col items-center justify-center font-sans">
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-violet-900/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-fuchsia-900/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-sm w-full px-6 py-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 items-center justify-center font-bold text-lg text-violet-400 shadow-xl mb-4">
              ⚡
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Hızlı Şık
            </h1>
            <p className="mt-2 text-xs text-zinc-400 font-medium">
              Doğru cevabı diğer oyunculardan daha hızlı seçin, daha fazla puan kazanın!
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
                placeholder="Örn: Rüzgar"
                className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-violet-500/50 text-sm transition-colors"
                autoFocus
              />
            </div>

            {/* Enter Game Button */}
            <button
              onClick={() => handleJoinGame("Hızlı Şık")}
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

  // 2. Lobby / Preparing Stage
  if (gameState.status === "preparing") {
    const categoriesList = [
      { key: "all", label: "Hepsi" },
      { key: "bilim", label: "Bilim" },
      { key: "sanat", label: "Sanat" },
      { key: "kpss", label: "KPSS Hepsi" },
      { key: "kpss_tarih", label: "KPSS Tarih" },
      { key: "kpss_cografya", label: "KPSS Coğrafya" }
    ];

    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
        <header className="relative z-10 border-b border-zinc-900/50 bg-[#09090b]/60 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-400">Hızlı Şık Lobisi</span>
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
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-800/40">
              <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Oyuncular ({room.players.length}/8)</h2>
              {isMeHost && <span className="text-[9px] text-violet-400 font-bold uppercase">Yönetici 👑</span>}
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {room.players.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    player.id === socket?.id ? "bg-violet-950/15 border-violet-800/40" : "bg-zinc-950/40 border-zinc-900"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-2 h-2 rounded-full ${player.isHost ? "bg-amber-500 animate-pulse" : "bg-zinc-600"}`} />
                    <span className="text-xs font-semibold text-zinc-200">{player.name}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-zinc-400 mr-2">{player.score} Puan</span>
                    {player.isHost && (
                      <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        ADM
                      </span>
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
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">OYUN AYARLARI</h3>
                </div>

                {activeError && (
                  <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-400 rounded-lg">
                    {activeError}
                  </div>
                )}

                {/* Category Selection */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-zinc-450 uppercase tracking-widest">Kategori Seçimi</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categoriesList.map((cat) => (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.key);
                          handleUpdateSettings(cat.key, selectedDuration);
                        }}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          selectedCategory === cat.key
                            ? "bg-violet-600/15 border-violet-500 text-violet-400"
                            : "bg-zinc-950/50 border-zinc-900 text-zinc-400 hover:border-zinc-800"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

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
                          handleUpdateSettings(selectedCategory, sec);
                        }}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          selectedDuration === sec
                            ? "bg-fuchsia-600/15 border-fuchsia-500 text-fuchsia-400"
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
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-xs font-bold text-white shadow-lg shadow-violet-500/10 transition-all cursor-pointer"
                >
                  Soruyu & Oyunu Başlat
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 rounded-3xl border border-dashed border-zinc-800 bg-[#0e0e11]/25 backdrop-blur-sm min-h-[260px]">
                <div className="w-10 h-10 rounded-full bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-center mb-4 text-sm animate-pulse">
                  ⚡
                </div>
                <h3 className="text-sm font-bold text-zinc-200">Yöneticinin Oyunu Başlatması Bekleniyor</h3>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-2 leading-relaxed">
                  Lobi ayarları senkronizedir. Yönetici kategoriyi <strong className="text-zinc-350">"{categoriesList.find(c => c.key === selectedCategory)?.label}"</strong>, süreyi <strong className="text-zinc-350">{selectedDuration} saniye</strong> olarak belirledi.
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
              <span className="text-xs font-bold text-zinc-400">Hızlı Şık Arenası</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {myInfo && (
                <span className="text-[10px] font-bold bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full text-zinc-350">
                  Puanın: <span className="text-violet-400">{myScore} P</span>
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
                KATEGORİ: {getCategoryLabel(q.category).toUpperCase()}
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
                <h3 className="text-sm font-bold text-zinc-200">Cevabınız İletildi!</h3>
                <div className="inline-block px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-900 text-xs font-bold text-violet-400 font-mono">
                  {myChoice}
                </div>
                <p className="text-[10px] text-zinc-505 animate-pulse mt-4">
                  Diğer oyuncuların cevap vermesi bekleniyor...
                </p>
              </div>
            )}
          </div>

          {/* Active Submit Statuses List */}
          <div className="bg-[#0e0e11]/20 border border-zinc-900/60 rounded-2xl p-4 max-w-md w-full mx-auto">
            <h3 className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest mb-3 text-center">
              CEVAP DURUMLARI
            </h3>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              {room.players.map((p) => {
                const hasChosen = gameState.answers[p.id] !== undefined;
                return (
                  <div key={p.id} className="flex items-center space-x-2 bg-zinc-950/20 px-2.5 py-1.5 rounded-lg border border-zinc-900">
                    <span className={`w-1.5 h-1.5 rounded-full ${hasChosen ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                    <span className="text-[11px] text-zinc-300 truncate max-w-[100px]">{p.name}</span>
                    <span className="text-[9px] text-zinc-650 ml-auto">{hasChosen ? "Cevapladı" : "Düşünüyor"}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </main>
      </div>
    );
  }

  // 4. Result Stage
  if (gameState.status === "result") {
    const q = gameState.currentQuestion;
    const answers = gameState.answers || {};
    const submissions = gameState.submissions || [];
    const correctAnswer = q?.correctAnswer;

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

        <main className="relative z-10 flex-grow max-w-3xl w-full mx-auto px-6 py-6 flex flex-col justify-between my-auto space-y-6">
          
          {/* Correct Answer Display */}
          <div className="bg-[#0e0e11]/60 border border-zinc-900 rounded-3xl p-6 text-center shadow-xl">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
              DOĞRU CEVAP
            </span>
            <h2 className="text-3xl font-black text-emerald-400 drop-shadow-md">
              {correctAnswer}
            </h2>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
              "{q?.question}"
            </p>
          </div>

          {/* Submissions Order List (Cevap Verme Sırası) */}
          <div className="bg-zinc-950/40 border border-zinc-900/60 rounded-3xl p-5 md:p-6 backdrop-blur-sm max-w-lg w-full mx-auto shadow-lg">
            <h3 className="text-xs font-bold text-zinc-450 uppercase tracking-widest pb-2.5 border-b border-zinc-900 mb-4">
              CEVAP VERME SIRASI (HIZ BONUSU)
            </h3>

            {submissions.length > 0 ? (
              <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                {submissions.map((sub, index) => {
                  const player = room.players.find(p => p.id === sub.playerId);
                  if (!player) return null;

                  const isCorrect = sub.choice === correctAnswer;
                  const pts = sub.pointsAwarded;

                  return (
                    <div
                      key={sub.playerId}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isCorrect 
                          ? "bg-emerald-950/10 border-emerald-500/20" 
                          : "bg-red-950/10 border-rose-500/10"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isCorrect ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-400"
                        }`}>
                          #{index + 1}
                        </span>
                        <span className="text-xs font-semibold text-zinc-200">
                          {player.name}
                        </span>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <span className={`text-xs font-mono font-bold ${isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
                            {sub.choice}
                          </span>
                          <span className="block text-[8px] text-zinc-650">Seçim</span>
                        </div>
                        <div className="text-right w-24">
                          {isCorrect ? (
                            <span className="text-xs font-bold text-emerald-400 font-mono">
                              {pts === 3 ? "+3 Puan ⚡" : (pts === 2 ? "+2 Puan 🏃" : "+1 Puan")}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-rose-500/80 font-mono">
                              0 Puan ❌
                            </span>
                          )}
                          <span className="block text-[8px] text-zinc-650">Kazanılan</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-zinc-500">Hiçbir oyuncu cevap vermedi.</div>
            )}
          </div>

          {/* Scoreboard and Action control */}
          <div className="bg-[#0e0e11]/60 border border-zinc-900 rounded-3xl p-5 max-w-lg w-full mx-auto space-y-4">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">TOPLAM SKOR TABLOSU</h3>
            
            <div className="grid grid-cols-2 gap-2 text-xs max-h-40 overflow-y-auto pr-1">
              {room.players
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((player, idx) => (
                  <div key={player.id} className="flex justify-between items-center bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900">
                    <span className="text-zinc-300 font-semibold truncate max-w-[100px]">
                      #{idx + 1} {player.name}
                    </span>
                    <span className="font-mono font-bold text-white">{player.score} Puan</span>
                  </div>
                ))}
            </div>

            {/* Next Round Button (Admin only) */}
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

export default QuickChoice;
