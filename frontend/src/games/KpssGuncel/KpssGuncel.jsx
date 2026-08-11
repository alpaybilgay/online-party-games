import React, { useState, useEffect } from "react";
import { socket } from "../../socket/socket";
import kpssData from "../../data/kpss_2026_guncel_bilgiler_200_soru.json";

// Safe category labeling
const allQuestions = kpssData.questions || [];
const allUniqueCategories = Array.from(new Set(allQuestions.map(q => q.category))).filter(Boolean);

function KpssGuncel({
  room,
  isInRoom,
  playerName,
  setPlayerName,
  onLeave,
  activeError,
  setActiveError,
  handleJoinGame
}) {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [myChoice, setMyChoice] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lastQuestionId, setLastQuestionId] = useState(null);
  const [outOfQuestions, setOutOfQuestions] = useState(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState(5);

  const gameState = room?.gameState;
  const isMeHost = room?.hostId === socket?.id;
  const myInfo = room?.players.find((p) => p.id === socket?.id);
  const myScore = myInfo ? myInfo.score : 0;

  // Sync lobby settings from server
  useEffect(() => {
    if (gameState && gameState.status === "preparing") {
      if (gameState.categories) {
        setSelectedCategories(gameState.categories);
      }
      if (gameState.duration) {
        setSelectedDuration(gameState.duration);
      }
      if (typeof gameState.autoAdvance !== "undefined") {
        setAutoAdvance(gameState.autoAdvance);
      }
      setOutOfQuestions(false);
    }
  }, [gameState?.status, gameState?.categories, gameState?.duration, gameState?.autoAdvance]);

  // Reset local answer status when a new question starts
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

  // Auto Advance countdown on results
  useEffect(() => {
    if (gameState && gameState.status === "result" && autoAdvance) {
      setAutoAdvanceTimer(5);
      const timerId = setInterval(() => {
        setAutoAdvanceTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerId);
            if (isMeHost) {
              handleStartQuestion();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timerId);
    }
  }, [gameState?.status, autoAdvance, isMeHost, selectedCategories, selectedDuration]);

  // Admin updates lobby settings
  const handleToggleCategory = (cat) => {
    if (!isMeHost) return;
    let newCats = [...selectedCategories];
    if (newCats.includes(cat)) {
      newCats = newCats.filter((c) => c !== cat);
    } else {
      newCats.push(cat);
    }
    setSelectedCategories(newCats);
    handleUpdateSettings(newCats, selectedDuration, autoAdvance);
  };

  const handleUpdateSettings = (cats, dur, autoAdv) => {
    if (socket && room && isMeHost) {
      socket.emit("kpss-guncel-update-settings", {
        categories: cats,
        duration: dur,
        autoAdvance: autoAdv
      });
    }
  };

  // Start question
  const handleStartQuestion = () => {
    if (allQuestions.length === 0) return;

    // Filter questions by categories
    let categoryQuestions = allQuestions;
    if (selectedCategories.length > 0) {
      categoryQuestions = allQuestions.filter(q => selectedCategories.includes(q.category));
    }

    if (categoryQuestions.length === 0) {
      setActiveError("Seçilen kategorilere ait soru bulunamadı.");
      return;
    }

    setActiveError("");

    const askedIds = room.askedQuestionIds?.["KPSS GÜNCEL"] || [];
    let eligibleQuestions = categoryQuestions.filter(q => !askedIds.includes(q.id));

    if (eligibleQuestions.length === 0) {
      setOutOfQuestions(true);
      return;
    }

    setOutOfQuestions(false);

    // Pick a random question
    let randomQ = eligibleQuestions[Math.floor(Math.random() * eligibleQuestions.length)];

    // Avoid consecutive duplicates if possible
    if (gameState?.currentQuestion && eligibleQuestions.length > 1) {
      let attempts = 0;
      while (randomQ.id === gameState.currentQuestion.id && attempts < 10) {
        randomQ = eligibleQuestions[Math.floor(Math.random() * eligibleQuestions.length)];
        attempts++;
      }
    }

    socket.emit("kpss-guncel-start-question", { question: randomQ });
  };

  // Submit response
  const handleSubmitChoice = (choiceText) => {
    if (hasSubmitted || gameState?.status !== "playing") return;
    setMyChoice(choiceText);

    socket.emit("kpss-guncel-submit-choice", { choice: choiceText }, (res) => {
      if (res.success) {
        setHasSubmitted(true);
        setActiveError("");
      } else {
        setActiveError(res.message || "Cevap gönderilemedi.");
      }
    });
  };

  const handleNextRound = () => {
    if (socket && room && isMeHost) {
      socket.emit("kpss-guncel-next-round");
    }
  };

  const handleResetPool = () => {
    if (socket && room && isMeHost) {
      socket.emit("kpss-guncel-reset-pool");
      setOutOfQuestions(false);
      setActiveError("");
    }
  };

  // 1. Nickname / Login screen
  if (!isInRoom) {
    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col items-center justify-center font-sans px-4">
        {/* Glow Effects */}
        <div className="absolute top-1/4 right-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-yellow-600/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md z-10">
          <div className="text-center mb-8">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-extrabold uppercase tracking-widest text-amber-500 mb-3">
              👑 KPSS 2026 GÜNCEL BİLGİLER
            </span>
            <h1 className="text-3xl font-black bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent tracking-tight">
              KPSS GÜNCEL
            </h1>
            <p className="mt-2 text-xs text-zinc-400 font-medium leading-relaxed">
              Kategorileri seçin, en hızlı doğru cevabı verin, puanları toplayın!
            </p>
          </div>

          <div className="bg-[#0e0e11]/80 border border-zinc-900 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
            {activeError && (
              <div className="mb-4 px-4 py-2.5 bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-450 rounded-xl flex items-center space-x-2">
                <span>⚠️</span>
                <span>{activeError}</span>
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="pname" className="block text-xs font-bold text-zinc-450 uppercase tracking-wider mb-2">
                Takma Adınız (Nickname)
              </label>
              <input
                id="pname"
                type="text"
                maxLength={12}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Örn: Ahmet"
                className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-amber-500/40 text-sm transition-colors"
                autoFocus
              />
            </div>

            <button
              onClick={() => handleJoinGame("KPSS GÜNCEL")}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-xs font-bold text-black shadow-lg transition-all duration-250 cursor-pointer"
            >
              Oyuna Giriş Yap
            </button>
          </div>

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

  // 2. Lobby / Selection screen
  if (gameState.status === "preparing") {
    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
        <header className="relative z-10 border-b border-zinc-900/50 bg-[#09090b]/60 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-400">KPSS Güncel Lobisi</span>
            </div>
            <button
              onClick={onLeave}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-[10px] font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Oyundan Çık
            </button>
          </div>
        </header>

        <main className="relative z-10 flex-grow max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Players list */}
          <div className="lg:col-span-5 bg-[#0e0e11]/60 border border-zinc-900 p-5 rounded-2xl backdrop-blur-sm">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-800/45">
              <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Oyuncular ({room.players.length}/12)</h2>
              {isMeHost && <span className="text-[9px] text-amber-500 font-bold uppercase">Yönetici 👑</span>}
            </div>

            <div className="space-y-2 max-h-64 sm:max-h-72 overflow-y-auto pr-1">
              {room.players.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    player.id === socket?.id ? "bg-amber-950/10 border-amber-800/30" : "bg-zinc-950/40 border-zinc-900"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-2 h-2 rounded-full ${player.isHost ? "bg-amber-500" : "bg-zinc-600"}`} />
                    <span className="text-xs font-semibold text-zinc-200">{player.name}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-zinc-400 mr-2">{player.score} XP</span>
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

          {/* Admin panel / Lobby Settings */}
          <div className="lg:col-span-7">
            {isMeHost ? (
              <div className="bg-[#0e0e11]/60 border border-zinc-900 p-6 rounded-2xl backdrop-blur-sm space-y-6">
                <div className="pb-2 border-b border-zinc-850">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">OYUN MODU VE AYARLAR</h3>
                </div>

                {activeError && (
                  <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-400 rounded-lg">
                    {activeError}
                  </div>
                )}

                {/* Multiple Category Selection */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      Kategoriler (İstediğiniz Kadar Seçin)
                    </label>
                    <span className="text-[9px] text-zinc-500 font-semibold">
                      {selectedCategories.length === 0 ? "Hepsi Aktif" : `${selectedCategories.length} Seçili`}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto border border-zinc-900/80 bg-zinc-950/30 p-2.5 rounded-xl">
                    {allUniqueCategories.map((cat) => {
                      const isSelected = selectedCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleToggleCategory(cat)}
                          className={`py-1.5 px-3 text-[10.5px] font-semibold rounded-full border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-amber-500/15 border-amber-500 text-amber-400 shadow-sm"
                              : "bg-zinc-950/40 border-zinc-900 text-zinc-400 hover:border-zinc-800"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Soru Başına Süre</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 15, 20, 25].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => {
                          setSelectedDuration(dur);
                          handleUpdateSettings(selectedCategories, dur, autoAdvance);
                        }}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          selectedDuration === dur
                            ? "bg-amber-500/15 border-amber-500 text-amber-400"
                            : "bg-zinc-950/50 border-zinc-900 text-zinc-400 hover:border-zinc-800"
                        }`}
                      >
                        {dur} sn
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transition mode */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Soru Geçiş Modu</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAutoAdvance(true);
                        handleUpdateSettings(selectedCategories, selectedDuration, true);
                      }}
                      className={`py-2.5 px-3 text-left text-xs rounded-xl border transition-all flex flex-col cursor-pointer ${
                        autoAdvance
                          ? "bg-amber-500/10 border-amber-500/80 text-amber-400"
                          : "bg-zinc-950/50 border-zinc-900 text-zinc-400 hover:border-zinc-800"
                      }`}
                    >
                      <span className="font-bold">Otomatik Geçiş</span>
                      <span className="text-[9px] text-zinc-500 mt-0.5 font-medium leading-tight">Cevaplama bitince 5 sn sonra sıradaki soruya geçilir.</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAutoAdvance(false);
                        handleUpdateSettings(selectedCategories, selectedDuration, false);
                      }}
                      className={`py-2.5 px-3 text-left text-xs rounded-xl border transition-all flex flex-col cursor-pointer ${
                        !autoAdvance
                          ? "bg-amber-500/10 border-amber-500/80 text-amber-400"
                          : "bg-zinc-950/50 border-zinc-900 text-zinc-400 hover:border-zinc-800"
                      }`}
                    >
                      <span className="font-bold">Manuel Geçiş</span>
                      <span className="text-[9px] text-zinc-500 mt-0.5 font-medium leading-tight">Her sorudan sonra adminin butona basması istenir.</span>
                    </button>
                  </div>
                </div>

                {outOfQuestions ? (
                  <div className="bg-amber-500/5 border border-amber-500/15 p-4 rounded-xl text-center space-y-3">
                    <p className="text-xs text-amber-400 font-bold">Seçilen kategorilerdeki tüm soruları çözdünüz!</p>
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={handleResetPool}
                        className="py-1.5 px-3 bg-amber-500 text-black font-extrabold text-[10px] rounded-lg hover:bg-amber-400 cursor-pointer"
                      >
                        Soruları Sıfırla ve Başlat
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleStartQuestion}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 font-extrabold text-xs text-black uppercase tracking-wider shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                  >
                    Oyunu Başlat 🚀
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-[#0e0e11]/60 border border-zinc-900 p-6 rounded-2xl backdrop-blur-sm flex flex-col items-center justify-center text-center space-y-5 min-h-[300px]">
                <div className="w-10 h-10 rounded-full border border-amber-500/20 bg-amber-500/5 flex items-center justify-center text-lg animate-bounce">
                  ⏳
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">YÖNETİCİ BEKLENİYOR</h4>
                  <p className="text-[10px] text-zinc-505 mt-1 max-w-xs leading-relaxed">
                    Yönetici oyun ayarlarını ve kategorileri güncelliyor. Hazır olunca oyun başlayacaktır.
                  </p>
                </div>

                {/* Read only settings preview */}
                <div className="w-full max-w-xs bg-zinc-950/50 border border-zinc-900 rounded-xl p-3 text-left space-y-2">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-500 font-semibold">Soru Süresi:</span>
                    <span className="text-zinc-300 font-bold">{selectedDuration} saniye</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-500 font-semibold">Geçiş Modu:</span>
                    <span className="text-zinc-300 font-bold">{autoAdvance ? "Otomatik" : "Manuel (Admin Butonu)"}</span>
                  </div>
                  <div className="flex flex-col text-[10px] pt-1.5 border-t border-zinc-900">
                    <span className="text-zinc-500 font-semibold mb-1">Seçilen Kategoriler:</span>
                    <span className="text-zinc-300 font-bold line-clamp-2">
                      {selectedCategories.length === 0 ? "Tüm Kategoriler" : selectedCategories.join(", ")}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // 3. Question solved out (Reset pool screen)
  if (outOfQuestions) {
    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col items-center justify-center font-sans px-6">
        <div className="w-full max-w-md bg-[#0e0e11] border border-zinc-900 rounded-3xl p-6 text-center space-y-6 shadow-2xl">
          <div className="text-3xl">🏁</div>
          <div>
            <h2 className="text-base font-extrabold text-amber-500 uppercase tracking-wider">TEBRİKLER!</h2>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Seçtiğiniz kategorilerdeki tüm güncel bilgileri ve soruları başarıyla tamamladınız.
            </p>
          </div>

          {isMeHost ? (
            <div className="space-y-2 pt-2">
              <button
                onClick={handleResetPool}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-extrabold text-xs text-black cursor-pointer shadow-lg transition-all"
              >
                Soruları Sıfırla ve Devam Et
              </button>
              <button
                onClick={() => {
                  setOutOfQuestions(false);
                  handleNextRound(); // back to preparing
                }}
                className="w-full py-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 font-bold text-xs text-zinc-300 cursor-pointer transition-all"
              >
                Ayarları Değiştir
              </button>
            </div>
          ) : (
            <div className="text-xs font-semibold text-zinc-505 animate-pulse bg-zinc-950/60 p-4 border border-zinc-900 rounded-xl">
              Yöneticinin soruları sıfırlaması veya yeni kategoriler seçmesi bekleniyor...
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. Playing Stage (Quiz Card Screen)
  const isPlaying = gameState?.status === "playing";
  const isResult = gameState?.status === "result";

  if (isPlaying || isResult) {
    const currentQuestion = gameState.currentQuestion;
    const choices = currentQuestion?.choices || currentQuestion?.options || [];
    const rightAnswer = currentQuestion?.correctAnswer || currentQuestion?.answer;

    // Decaying progress timer calculation
    const timerValue = gameState.timer;
    const totalDuration = gameState.duration || 15;
    const timerPercentage = Math.max(0, Math.min(100, (timerValue / totalDuration) * 100));

    // Get color based on time remaining
    const timerColor =
      timerValue > totalDuration * 0.4
        ? "bg-amber-500"
        : timerValue > totalDuration * 0.15
        ? "bg-yellow-500 animate-pulse"
        : "bg-red-500 animate-ping";

    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
        {/* Compact Header for Active Phase */}
        <header className="relative z-10 border-b border-zinc-900/60 bg-[#09090b]/80 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-500">
              {currentQuestion?.category || "Güncel"}
            </span>

            <div className="flex items-center space-x-3">
              <span className="text-[10px] font-mono text-zinc-400">
                Senin Skorun: <strong className="text-amber-400">{myScore} XP</strong>
              </span>
            </div>
          </div>
        </header>

        {/* Progress Countdown Bar */}
        {isPlaying && (
          <div className="w-full h-1 bg-zinc-950 overflow-hidden relative z-10">
            <div
              className={`h-full ${timerColor} transition-all duration-1000 ease-linear`}
              style={{ width: `${timerPercentage}%` }}
            />
          </div>
        )}

        <main className="relative z-10 flex-grow w-full max-w-3xl mx-auto px-4 py-4 flex flex-col justify-center items-center animate-fade-in">
          {/* Card Flip Container */}
          <div className="w-full perspective-1000 my-auto">
            <div
              className={`relative w-full transition-transform duration-700 preserve-3d ${
                isResult ? "rotate-y-180" : ""
              }`}
            >
              
              {/* FRONT SIDE (ACTIVE QUESTION CARD) */}
              <div className="w-full bg-[#0e0e11] border border-zinc-900 rounded-3xl p-5 shadow-2xl flex flex-col justify-between backface-hidden">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                      Kategori: {currentQuestion?.category}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xs font-mono text-amber-400">
                      {timerValue}
                    </div>
                  </div>

                  {/* Question Text */}
                  <h2 className="text-sm sm:text-base font-extrabold text-zinc-200 leading-relaxed mb-6 text-center select-none">
                    {currentQuestion?.question}
                  </h2>
                </div>

                {/* Choices (Responsive, Stacked for Mobile) */}
                <div className="grid grid-cols-1 gap-2.5 w-full">
                  {choices.map((choice, i) => {
                    const isMyChoice = myChoice === choice;
                    return (
                      <button
                        key={i}
                        disabled={hasSubmitted || !isPlaying}
                        onClick={() => handleSubmitChoice(choice)}
                        className={`w-full py-3.5 px-4 rounded-xl text-xs text-left font-bold border transition-all duration-150 select-none flex items-center justify-between cursor-pointer ${
                          isMyChoice
                            ? "bg-amber-500/10 border-amber-500 text-amber-400 shadow-lg animate-pulse"
                            : hasSubmitted
                            ? "bg-zinc-950/30 border-zinc-900/60 text-zinc-650"
                            : "bg-[#121215] border-zinc-850 text-zinc-300 hover:border-zinc-700 hover:bg-[#151518]"
                        }`}
                      >
                        <span className="flex-grow pr-3">{choice}</span>
                        {isMyChoice && <span className="text-[10px] text-amber-500 font-extrabold">✓</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Status Bar */}
                <div className="mt-5 pt-3 border-t border-zinc-900/80 flex items-center justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                  <span>
                    {Object.keys(gameState.answers || {}).length} / {room.players.length} Oyuncu Cevapladı
                  </span>
                  <span>
                    {hasSubmitted ? "Cevap Kaydedildi" : "Cevabınız Bekleniyor"}
                  </span>
                </div>
              </div>

              {/* BACK SIDE (RESOLUTION & EXPLANATION CARD) */}
              <div className="absolute top-0 left-0 w-full min-h-full bg-[#0e0e11] border border-zinc-900 rounded-3xl p-5 shadow-2xl flex flex-col justify-between rotate-y-180 backface-hidden">
                <div>
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-zinc-900/60">
                    <span className="text-[9px] font-extrabold text-emerald-500 uppercase tracking-widest flex items-center space-x-1">
                      <span>✓</span> <span>DOĞRU CEVAP</span>
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500">ID: #{currentQuestion?.id}</span>
                  </div>

                  {/* Correct Answer Highlighted */}
                  <div className="mb-4 p-3.5 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl text-center">
                    <span className="text-xs text-zinc-400 block font-semibold mb-1">Doğru Şık: {currentQuestion?.correctOption}</span>
                    <h3 className="text-sm font-extrabold text-emerald-400">{rightAnswer}</h3>
                  </div>

                  {/* Explanation Block */}
                  <div className="space-y-1.5 mb-4">
                    <h4 className="text-[9.5px] font-bold text-zinc-450 uppercase tracking-wider">AÇIKLAMA:</h4>
                    <p className="text-xs text-zinc-300 font-medium leading-relaxed bg-zinc-950/60 p-3 border border-zinc-900 rounded-xl select-none">
                      {currentQuestion?.explanation || "Bu soru için ek bir açıklama bulunmamaktadır."}
                    </p>
                    {currentQuestion?.source && (
                      <span className="block text-[9px] text-zinc-600 font-bold uppercase tracking-wider text-right">
                        Kaynak: {currentQuestion.source}
                      </span>
                    )}
                  </div>
                </div>

                {/* Score and Award Notification inside Card */}
                <div className="space-y-4">
                  {/* Round Submissions Feedback */}
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-3">
                    <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2 border-b border-zinc-900 pb-1">
                      Bu Tur Kim Kaç Puan Aldı?
                    </h4>
                    <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                      {room.players.map((p) => {
                        const sub = (gameState.submissions || []).find((s) => s.playerId === p.id);
                        const isCorrect = sub?.choice === rightAnswer;
                        const points = sub?.pointsAwarded || 0;
                        return (
                          <div key={p.id} className="flex justify-between items-center text-[10px]">
                            <span className="font-semibold text-zinc-400">{p.name}</span>
                            {isCorrect ? (
                              <span className="font-bold text-emerald-400">+{points} XP ({sub?.remainingTime}sn)</span>
                            ) : (
                              <span className="font-bold text-zinc-600">0 XP (Yanlış/Cevapsız)</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer control buttons inside card */}
                  <div className="pt-1.5 flex items-center justify-between border-t border-zinc-900/60">
                    <div>
                      {autoAdvance ? (
                        <div className="inline-flex items-center space-x-1.5 text-[10px] font-extrabold uppercase text-amber-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                          <span>Sıradaki Soruya Geçiliyor... ({autoAdvanceTimer})</span>
                        </div>
                      ) : (
                        <span className="text-[9px] font-semibold text-zinc-500 uppercase">
                          {isMeHost ? "Devam etmek için butona basın" : "Yöneticinin sıradaki soruya geçmesi bekleniyor..."}
                        </span>
                      )}
                    </div>

                    {!autoAdvance && isMeHost && (
                      <button
                        onClick={handleStartQuestion}
                        className="py-1.5 px-4 bg-amber-500 hover:bg-amber-400 font-extrabold text-[10px] text-black rounded-lg shadow cursor-pointer transition-all uppercase tracking-wider"
                      >
                        Sıradaki Soru →
                      </button>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* Leaderboard Section */}
          <div className="w-full mt-6 bg-[#0e0e11]/50 border border-zinc-900 rounded-3xl p-4">
            <h4 className="text-[9px] font-bold text-zinc-505 uppercase tracking-widest mb-3 border-b border-zinc-900 pb-1.5">
              Genel Sıralama (Skor Tablosu)
            </h4>
            <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto pr-1">
              {[...room.players]
                .sort((a, b) => b.score - a.score)
                .map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center bg-zinc-950/30 border border-zinc-900/60 px-3 py-1.5 rounded-xl text-[10.5px] font-semibold text-zinc-350"
                  >
                    <span className="flex items-center space-x-1.5">
                      <span className="text-[9px] font-bold text-zinc-550">#{idx + 1}</span>
                      <span className="truncate max-w-[80px]">{p.name}</span>
                    </span>
                    <span className="font-bold text-amber-500 font-mono">{p.score} XP</span>
                  </div>
                ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}

export default KpssGuncel;
