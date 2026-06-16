import React, { useState, useEffect } from "react";
import { socket } from "../../socket/socket";
import { presetQuestions } from "../../data/closestQuestions";

function ClosestGuess({
  room,
  isInRoom,
  playerName,
  setPlayerName,
  onLeave,
  activeError,
  setActiveError,
  handleJoinGame
}) {
  const [kdyMode, setKdyMode] = useState("ready-made"); // "ready-made" | "custom"
  const [kdyCategory, setKdyCategory] = useState("nufus");
  const [kdyDuration, setKdyDuration] = useState(15);
  const [kdyCustomQuestion, setKdyCustomQuestion] = useState("");
  const [kdyCustomAnswer, setKdyCustomAnswer] = useState("");
  const [kdyCustomUnit, setKdyCustomUnit] = useState("");
  const [kdyGuessInput, setKdyGuessInput] = useState("");
  const [kdySubmitted, setKdySubmitted] = useState(false);

  const [lastQuestion, setLastQuestion] = useState(null);

  const myInfo = room?.players.find((p) => p.id === socket?.id);
  const myTruncName = myInfo ? (myInfo.name.length > 5 ? myInfo.name.substring(0, 5) + "." : myInfo.name) : "";
  const myScore = myInfo ? myInfo.score : 0;

  useEffect(() => {
    if (room && room.gameState) {
      const status = room.gameState.status;
      const currentQuestionText = room.gameState.currentQuestion?.question;

      if (status === "preparing") {
        setKdyGuessInput("");
        setKdySubmitted(false);
        setLastQuestion(null);
      } else if (status === "playing" && currentQuestionText) {
        if (lastQuestion !== currentQuestionText) {
          setKdySubmitted(false);
          setKdyGuessInput("");
          setLastQuestion(currentQuestionText);
        }
      }
    }
  }, [room, lastQuestion]);

  const getCategoryQuestions = (category) => {
    if (category === "hepsi") {
      return [
        ...(presetQuestions.nufus || []),
        ...(presetQuestions.yil || []),
        ...(presetQuestions.kilometre || []),
        ...(presetQuestions.yas || []),
        ...(presetQuestions.rekor || [])
      ];
    } else if (category === "kpss_hepsi") {
      return [
        ...(presetQuestions.kpss_tarih || []),
        ...(presetQuestions.kpss_cografya || [])
      ];
    } else {
      return presetQuestions[category] || presetQuestions.nufus;
    }
  };

  const handleStartKdyPreset = () => {
    if (socket && room) {
      const categoryQuestions = getCategoryQuestions(kdyCategory);
      const askedIds = room.askedQuestionIds?.["Kim Daha Yakın"] || [];
      let eligibleQuestions = categoryQuestions.filter(q => !askedIds.includes(q.id));
      if (eligibleQuestions.length === 0) {
        eligibleQuestions = categoryQuestions;
      }
      const randomQuestion = eligibleQuestions[Math.floor(Math.random() * eligibleQuestions.length)];
      
      socket.emit("kim-daha-yakin-start-preset", {
        category: kdyCategory,
        duration: kdyDuration,
        question: randomQuestion
      });
    }
  };

  const handleStartKdyCustom = () => {
    if (!kdyCustomQuestion.trim()) {
      setActiveError("Lütfen soru metnini yazın.");
      return;
    }
    if (!kdyCustomAnswer.trim() || isNaN(Number(kdyCustomAnswer))) {
      setActiveError("Lütfen doğru sayısal cevabı girin.");
      return;
    }
    setActiveError("");

    socket.emit("kim-daha-yakin-start-custom", {
      question: kdyCustomQuestion.trim(),
      answer: kdyCustomAnswer.trim(),
      unit: kdyCustomUnit.trim(),
      duration: kdyDuration
    });
  };

  const handleKdySubmitGuess = (e) => {
    e.preventDefault();
    if (!kdyGuessInput.trim() || isNaN(Number(kdyGuessInput))) {
      setActiveError("Lütfen geçerli bir tahmin sayısı girin.");
      return;
    }
    setActiveError("");

    socket.emit("kim-daha-yakin-submit-guess", { guess: kdyGuessInput }, (res) => {
      if (res.success) {
        setKdySubmitted(true);
        setActiveError("");
      } else {
        setActiveError(res.message || "Tahmin iletilemedi.");
      }
    });
  };

  const handleKdyNextRound = () => {
    if (socket && room) {
      if (gameState && gameState.status === "result" && gameState.mode === "ready-made") {
        const activeCategory = gameState.category || kdyCategory || "nufus";
        const activeDuration = gameState.duration || kdyDuration || 15;
        const categoryQuestions = getCategoryQuestions(activeCategory);
        const askedIds = room.askedQuestionIds?.["Kim Daha Yakın"] || [];
        let eligibleQuestions = categoryQuestions.filter(q => !askedIds.includes(q.id));
        if (eligibleQuestions.length === 0) {
          eligibleQuestions = categoryQuestions;
        }
        const randomQuestion = eligibleQuestions[Math.floor(Math.random() * eligibleQuestions.length)];
        
        socket.emit("kim-daha-yakin-start-preset", {
          category: activeCategory,
          duration: activeDuration,
          question: randomQuestion
        });
      } else {
        socket.emit("kim-daha-yakin-next-round");
      }
    }
  };

  const handleTransferAdmin = (targetPlayerId) => {
    if (socket && room) {
      socket.emit("transfer-admin", { targetPlayerId });
    }
  };

  const isMeHost = room?.hostId === socket?.id;

  // 1. Nickname Lobby Portal
  if (!isInRoom) {
    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col items-center justify-center font-sans">
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-violet-900/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-fuchsia-900/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-sm w-full px-6 py-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 items-center justify-center font-bold text-lg text-violet-400 shadow-xl mb-4">
              🎯
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Kim Daha Yakın
            </h1>
            <p className="mt-2 text-xs text-zinc-400 font-medium">
              Bu oyun grup tahmin oyunudur. Takma adınızı girerek katılın.
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
                placeholder="Örn: Kuzey"
                className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-violet-500/50 text-sm transition-colors"
                autoFocus
              />
            </div>

            {/* Enter Game Button */}
            <button
              onClick={() => handleJoinGame("Kim Daha Yakın")}
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

  const gameState = room.gameState;

  // 2. Preparing Lobby Screen
  if (gameState.status === "preparing") {
    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
        {/* Navbar */}
        <header className="relative z-10 border-b border-zinc-900/50 bg-[#09090b]/60 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-400">Kim Daha Yakın Lobisi</span>
            </div>
            <button
              onClick={onLeave}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-[10px] font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Oyundan Çık
            </button>
          </div>
        </header>

        {/* Lobby grid layout */}
        <main className="relative z-10 flex-grow max-w-5xl w-full mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Players list */}
          <div className="lg:col-span-5 bg-[#0e0e11]/60 border border-zinc-900 p-5 rounded-2xl backdrop-blur-sm">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-800/40">
              <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Oyuncular ({room.players.length}/8)</h2>
              {isMeHost && <span className="text-[9px] text-amber-500 font-bold uppercase">Yönetici 👑</span>}
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
                    
                    {/* Host Transfer Button */}
                    {isMeHost && !player.isHost && (
                      <button
                        onClick={() => handleTransferAdmin(player.id)}
                        className="px-2 py-0.5 text-[9px] font-bold uppercase bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white rounded text-zinc-400 transition-colors cursor-pointer"
                      >
                        Admin Yap
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Admin setup board / Player waiting board */}
          <div className="lg:col-span-7">
            {isMeHost ? (
              <div className="bg-[#0e0e11]/60 border border-zinc-900 p-6 rounded-2xl backdrop-blur-sm space-y-6">
                {/* Mode selector tab */}
                <div className="flex bg-zinc-950 border border-zinc-900 rounded-xl p-1">
                  <button
                    onClick={() => { setKdyMode("ready-made"); setActiveError(""); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      kdyMode === "ready-made" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Hazır Sorular
                  </button>
                  <button
                    onClick={() => { setKdyMode("custom"); setActiveError(""); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      kdyMode === "custom" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Kendi Oyununu Yarat
                  </button>
                </div>

                {activeError && (
                  <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-400 rounded-lg">
                    {activeError}
                  </div>
                )}

                {/* Mode 1: Ready-Made */}
                {kdyMode === "ready-made" && (
                  <div className="space-y-5">
                    {/* Category */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">KATEGORİ SEÇİN</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { key: "hepsi", label: "Hepsi" },
                          { key: "nufus", label: "Nüfus" },
                          { key: "yil", label: "Yıl" },
                          { key: "kilometre", label: "Kilometre" },
                          { key: "yas", label: "Yaş" },
                          { key: "rekor", label: "Rekor" },
                          { key: "kpss_hepsi", label: "KPSS Hepsi" },
                          { key: "kpss_tarih", label: "KPSS Tarih" },
                          { key: "kpss_cografya", label: "KPSS Coğrafya" }
                        ].map((cat) => (
                          <button
                            key={cat.key}
                            onClick={() => setKdyCategory(cat.key)}
                            className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                              kdyCategory === cat.key
                                ? "bg-violet-600/15 border-violet-500 text-violet-400 font-bold"
                                : "bg-zinc-950/50 border-zinc-900 text-zinc-400 hover:border-zinc-800"
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Time limit */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">SÜRE LİMİTİ</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[15, 20, 25, 30].map((sec) => (
                          <button
                            key={sec}
                            onClick={() => setKdyDuration(sec)}
                            className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                              kdyDuration === sec
                                ? "bg-fuchsia-600/15 border-fuchsia-500 text-fuchsia-400 font-bold"
                                : "bg-zinc-950/50 border-zinc-900 text-zinc-400 hover:border-zinc-800"
                            }`}
                          >
                            {sec}sn
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleStartKdyPreset}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-xs font-bold text-white shadow-lg shadow-violet-500/10 transition-all cursor-pointer"
                    >
                      Soruyu & Oyunu Başlat
                    </button>
                  </div>
                )}

                {/* Mode 2: Custom Game Editor */}
                {kdyMode === "custom" && (
                  <div className="space-y-4">
                    {/* Soru */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">SORU METNİ</label>
                      <input
                        type="text"
                        maxLength={100}
                        value={kdyCustomQuestion}
                        onChange={(e) => setKdyCustomQuestion(e.target.value)}
                        placeholder="Örn: Eyfel Kulesi'nin yüksekliği kaç metredir?"
                        className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500/50"
                      />
                    </div>

                    {/* Correct answer & Unit */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">DOĞRU CEVAP (SAYI)</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={kdyCustomAnswer}
                          onChange={(e) => setKdyCustomAnswer(e.target.value)}
                          placeholder="Örn: 330"
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">BİRİM (OPSİYONEL)</label>
                        <input
                          type="text"
                          maxLength={15}
                          value={kdyCustomUnit}
                          onChange={(e) => setKdyCustomUnit(e.target.value)}
                          placeholder="Örn: metre"
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500/50"
                        />
                      </div>
                    </div>

                    {/* Timer limit */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">SÜRE LİMİTİ</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[15, 20, 25, 30].map((sec) => (
                          <button
                            key={sec}
                            onClick={() => setKdyDuration(sec)}
                            className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                              kdyDuration === sec
                                ? "bg-fuchsia-600/15 border-fuchsia-500 text-fuchsia-400 font-bold"
                                : "bg-zinc-950/50 border-zinc-900 text-zinc-400 hover:border-zinc-800"
                            }`}
                          >
                            {sec}sn
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleStartKdyCustom}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-xs font-bold text-white shadow-lg shadow-violet-500/10 transition-all cursor-pointer"
                    >
                      Özel Soruyu Yayınla & Başlat
                    </button>
                  </div>
                )}

                <p className="text-[10px] text-zinc-505 text-center leading-relaxed">
                  * Özel sorularda yönetici (admin) cevap vermez, sadece izler ve otomatik hesaplamayı yönetir.
                </p>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/10 backdrop-blur-sm min-h-[300px]">
                <div className="w-12 h-12 rounded-full bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-center mb-5 animate-pulse text-lg">
                  🎯
                </div>
                <h3 className="text-sm font-bold text-zinc-200">Admin Soru Seçiyor...</h3>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-2 leading-relaxed">
                  Yöneticinin (Admin) soru kategorisini seçip süre limitini belirleyerek oyunu başlatması bekleniyor. Lütfen bekleyin...
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // 3. Playing State (Guessing and Timer Countdown)
  if (gameState.status === "playing") {
    const isEligibleToGuess = gameState.mode === "ready-made" || !isMeHost;
    const totalGuessed = Object.keys(gameState.answers).length;
    
    let totalToGuess = room.players.length;
    if (gameState.mode === "custom") {
      totalToGuess = room.players.filter((p) => p.id !== room.hostId).length;
    }

    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
        {/* Header */}
        <header className="relative z-10 border-b border-zinc-900/50 bg-[#09090b]/60 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-400">Kim Daha Yakın Arenası</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {myInfo && (
                <span className="text-[10px] font-bold bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full text-zinc-350">
                  Sen: <span className="text-violet-400">{myTruncName}</span> ({myScore} P)
                </span>
              )}
              <span className="text-[10px] font-bold tracking-widest uppercase bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full text-zinc-450 flex items-center">
                {gameState.mode === "ready-made" ? "Hazır Soru" : "Özel Soru"}
                {isMeHost && (
                  <button
                    onClick={() => socket.emit("kim-daha-yakin-next-round")}
                    className="px-2 py-0.5 bg-zinc-850 hover:bg-zinc-800 text-[8px] font-extrabold uppercase rounded border border-zinc-700 text-zinc-300 transition-colors ml-2 cursor-pointer"
                    title="Kategori Seçimine Dön"
                  >
                    ⚙️ DÖN
                  </button>
                )}
              </span>
            </div>
          </div>
        </header>

        {/* Core Panel */}
        <main className="relative z-10 flex-grow max-w-3xl w-full mx-auto px-6 py-8 flex flex-col justify-between my-auto">
          
          {/* Top Panel Count Indicator */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2 bg-zinc-900/40 border border-zinc-850 px-3 py-1.5 rounded-xl">
              <span className="text-xs text-zinc-450">Cevaplar:</span>
              <span className="text-xs font-mono font-bold text-violet-400">{totalGuessed} / {totalToGuess}</span>
            </div>
          </div>

          {/* Question Card */}
          {gameState.currentQuestion && (
            <div className="bg-[#0e0e11]/60 border border-zinc-900 rounded-3xl p-6 md:p-8 text-center shadow-xl mb-8 relative">
              <div className="absolute top-3 right-3 text-xs opacity-20 select-none">❔</div>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">
                {gameState.mode === "ready-made" ? `Kategori: ${gameState.category.toUpperCase()}` : "Özel Soru"}
              </span>
              <h2 className="text-lg md:text-xl font-extrabold text-zinc-100 leading-relaxed max-w-xl mx-auto">
                {gameState.currentQuestion.question}
              </h2>
            </div>
          )}

          {/* Answer Input Panel */}
          <div className="bg-zinc-950/40 border border-zinc-900/60 rounded-3xl p-6 backdrop-blur-sm max-w-md w-full mx-auto mb-8">
            {/* Timer countdown right above answer area */}
            <div className="flex flex-col items-center mb-4 pb-3 border-b border-zinc-900/40">
              <span className={`text-3xl font-mono font-black tracking-tight ${
                gameState.timer <= 5 ? "text-rose-500 animate-pulse" : "text-white"
              }`}>
                {gameState.timer}sn
              </span>
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Kalan Süre</span>
            </div>

            {isEligibleToGuess ? (
              <>
                {!kdySubmitted ? (
                  <form onSubmit={handleKdySubmitGuess} className="space-y-4">
                    {activeError && (
                      <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400 rounded-lg">
                        {activeError}
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 text-center">
                        Tahmin Sayınızı Girin
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={kdyGuessInput}
                          onChange={(e) => setKdyGuessInput(e.target.value)}
                          placeholder="Tahmininiz..."
                          className="flex-grow px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-850 text-xs font-bold text-zinc-100 focus:outline-none focus:border-violet-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white shadow-lg transition-all cursor-pointer"
                        >
                          Gönder
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-4 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 text-xs">✔</div>
                    <h4 className="text-xs font-bold text-zinc-200">Tahmininiz Gönderildi!</h4>
                    <p className="text-[10px] text-zinc-500 mt-1">Cevabınız: <span className="font-bold text-zinc-300 font-mono">{kdyGuessInput}</span></p>
                    <p className="text-[9px] text-zinc-605 mt-3 animate-pulse">Diğer oyuncuların tahmin girmesi bekleniyor...</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center mb-3 mx-auto text-xs">👁️</div>
                <h4 className="text-xs font-bold text-zinc-300">Yönetici Modu (Admin)</h4>
                <p className="text-[10px] text-zinc-500 mt-1">Bu özel soruda tahmin girmesiniz. Oyuncuların tahminlerini buradan takip edin.</p>
              </div>
            )}
          </div>

          {/* Connected players estimate status list */}
          <div className="bg-[#0e0e11]/20 border border-zinc-900/60 rounded-2xl p-4 max-w-md w-full mx-auto">
            <h3 className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest mb-3">OYUNCU DURUMLARI</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {room.players.map((p) => {
                if (gameState.mode === "custom" && p.isHost) return null;
                
                const didGuess = gameState.answers[p.id] !== undefined;
                return (
                  <div key={p.id} className="flex items-center space-x-2 bg-zinc-950/20 px-2 py-1.5 rounded-lg border border-zinc-900">
                    <span className={`w-1.5 h-1.5 rounded-full ${didGuess ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                    <span className="text-[11px] text-zinc-300 truncate max-w-[100px]">{p.name}</span>
                    <span className="text-[9px] text-zinc-600 ml-auto">{didGuess ? "Girdi" : "Düşünüyor"}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </main>
      </div>
    );
  }

  // 4. Result State (Results List and Winners Panel)
  if (gameState.status === "result") {
    const results = gameState.results || [];
    const winnerPlayer = room.players.find((p) => p.id === gameState.winnerId);

    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
        {/* Header */}
        <header className="relative z-10 border-b border-zinc-900/50 bg-[#09090b]/60 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs font-bold text-zinc-400">Tur Sonuçları</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {myInfo && (
                <span className="text-[10px] font-bold bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full text-zinc-350">
                  Sen: <span className="text-violet-400">{myTruncName}</span> ({myScore} P)
                </span>
              )}
              <span className="text-[10px] font-bold bg-zinc-900 border border-zinc-850 px-3 py-1 rounded-full text-zinc-450 flex items-center">
                Lider: <span className="font-bold text-white ml-1">{room.players.length > 0 ? room.players.reduce((a, b) => (a.score > b.score ? a : b)).name : ""}</span>
                {isMeHost && (
                  <button
                    onClick={() => socket.emit("kim-daha-yakin-next-round")}
                    className="px-2 py-0.5 bg-zinc-850 hover:bg-zinc-800 text-[8px] font-extrabold uppercase rounded border border-zinc-700 text-zinc-300 transition-colors ml-2 cursor-pointer"
                    title="Kategori Seçimine Dön"
                  >
                    ⚙️ DÖN
                  </button>
                )}
              </span>
            </div>
          </div>
        </header>

        <main className="relative z-10 flex-grow max-w-3xl w-full mx-auto px-6 py-6 flex flex-col justify-between my-auto">
          
          {/* Correct answer display */}
          {gameState.currentQuestion && (
            <div className="bg-[#0e0e11]/60 border border-zinc-900 rounded-3xl p-6 text-center shadow-xl mb-6">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">DOĞRU CEVAP</span>
              <h2 className="text-4xl font-black text-amber-400 drop-shadow-md">
                {gameState.currentQuestion.answer.toLocaleString("tr-TR")}{" "}
                <span className="text-lg font-medium text-amber-500/80">{gameState.currentQuestion.unit}</span>
              </h2>
              <p className="mt-3 text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                "{gameState.currentQuestion.question}"
              </p>
            </div>
          )}

          {/* Results Table (Estimates sorted by difference) */}
          <div className="bg-zinc-950/40 border border-zinc-900/60 rounded-3xl p-5 md:p-6 backdrop-blur-sm space-y-4 max-w-lg w-full mx-auto mb-6">
            <h3 className="text-xs font-bold text-zinc-450 uppercase tracking-widest pb-2 border-b border-zinc-900">
              Oyuncu Tahminleri (En Yakından Uzağa)
            </h3>

            {results.length > 0 ? (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {results.map((res, index) => {
                  const isWinner = res.playerId === gameState.winnerId;
                  return (
                    <div
                      key={res.playerId}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isWinner 
                          ? "bg-gradient-to-r from-emerald-950/20 to-zinc-950/25 border-emerald-500/30 shadow-md shadow-emerald-500/5" 
                          : "bg-zinc-900/30 border-zinc-900"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isWinner ? "bg-emerald-500 text-zinc-950" : "bg-zinc-800 text-zinc-400"
                        }`}>
                          #{index + 1}
                        </span>
                        <span className={`text-xs font-semibold ${isWinner ? "text-emerald-400" : "text-zinc-200"}`}>
                          {res.playerName} {isWinner && "🏆"}
                        </span>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-zinc-200">{res.guess.toLocaleString("tr-TR")}</span>
                          <span className="block text-[9px] text-zinc-500 font-sans">Tahmin</span>
                        </div>
                        <div className="text-right w-16 md:w-20">
                          <span className={`text-xs font-mono font-bold ${isWinner ? "text-emerald-400" : "text-zinc-400"}`}>
                            {res.difference === 0 ? "Tam İsabet" : `+${res.difference.toLocaleString("tr-TR")}`}
                          </span>
                          <span className="block text-[9px] text-zinc-550 font-sans">Fark</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-zinc-500">Hiçbir oyuncu tahminde bulunmadı.</div>
            )}
          </div>

          {/* Scoreboard and Action control */}
          <div className="bg-zinc-950/40 border border-zinc-900/60 rounded-3xl p-5 max-w-lg w-full mx-auto space-y-4">
            
            {winnerPlayer && (
              <div className="text-center">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Tebrikler! <strong className="text-emerald-400">{winnerPlayer.name}</strong> doğru cevaba en yakın tahmini vererek <strong className="text-white">1 puan</strong> kazandı.
                </p>
              </div>
            )}

            {/* Next Round Control (Admin Only) */}
            {isMeHost ? (
              <div className="max-w-xs mx-auto">
                <button
                  onClick={handleKdyNextRound}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-xs font-bold text-white shadow-lg transition-all cursor-pointer"
                >
                  {gameState.mode === "custom" ? "Yeni Özel Soru Hazırla" : "Sonraki Soruya Geç"}
                </button>
              </div>
            ) : (
              <div className="text-center py-2 animate-pulse">
                <p className="text-xs font-semibold text-zinc-500">Yöneticinin (Admin) yeni soruyu hazırlaması bekleniyor...</p>
              </div>
            )}

            <div className="text-center pt-1">
              <button
                onClick={onLeave}
                className="text-[10px] font-bold text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
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

export default ClosestGuess;
