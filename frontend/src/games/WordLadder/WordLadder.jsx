import React, { useState, useEffect } from "react";
import { socket } from "../../socket/socket";

function WordLadder({
  room,
  isInRoom,
  playerName,
  setPlayerName,
  onLeave,
  activeError,
  setActiveError,
  handleJoinGame
}) {
  const [myWordInputs, setMyWordInputs] = useState(Array(10).fill(""));
  const [isIReady, setIsIReady] = useState(false);

  useEffect(() => {
    if (room && socket) {
      const me = room.players.find((p) => p.id === socket.id);
      if (me) {
        setIsIReady(me.ready);
        if (room.gameState.status === "preparing" && !me.ready) {
          setMyWordInputs(Array(10).fill(""));
        }
      }
    }
  }, [room, socket?.id]);

  // Kelime Merdiveni Game Actions
  const handleSetReady = () => {
    const cleanList = myWordInputs.map((w) => w.trim()).filter((w) => w !== "");
    if (cleanList.length === 0) {
      setActiveError("Lütfen listenize en az bir kelime ekleyin.");
      return;
    }
    setActiveError("");

    socket.emit("kelime-merdiveni-ready", { wordList: cleanList }, (res) => {
      if (res.success) {
        setIsIReady(true);
      } else {
        setActiveError(res.message || "Hazır durumu iletilemedi.");
      }
    });
  };

  const handleAwardPoint = (winnerId) => {
    if (socket && room) {
      socket.emit("kelime-merdiveni-award-point", { winnerId });
    }
  };

  const handleNewRound = () => {
    if (socket && room) {
      socket.emit("kelime-merdiveni-new-round");
    }
  };

  const handleInputChange = (index, value) => {
    const nextInputs = [...myWordInputs];
    nextInputs[index] = value;
    setMyWordInputs(nextInputs);
  };

  const isMeHost = room?.hostId === socket?.id;

  // 1. Nickname Entry Lobby
  if (!isInRoom) {
    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col items-center justify-center font-sans">
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-violet-900/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-fuchsia-900/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-sm w-full px-6 py-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 items-center justify-center font-bold text-lg text-violet-400 shadow-xl mb-4">
              🪜
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Kelime Merdiveni
            </h1>
            <p className="mt-2 text-xs text-zinc-400 font-medium">
              Bu oyun 2 kişiliktir. Takma adınızı girerek oyuna katılın.
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
              onClick={() => handleJoinGame("Kelime Merdiveni")}
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

  // 2. Preparation State
  if (room.gameState.status === "preparing") {
    const secondPlayer = room.players.find((p) => p.id !== socket?.id);

    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
        <header className="relative z-10 border-b border-zinc-900/50 bg-[#09090b]/60 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-400">Kelime Merdiveni Lobisi</span>
            </div>
            <button
              onClick={onLeave}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-[10px] font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Oyundan Çık
            </button>
          </div>
        </header>

        <main className="relative z-10 flex-grow max-w-5xl w-full mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-4 space-y-4">
            <div className="bg-[#0e0e11]/60 border border-zinc-900 p-5 rounded-2xl backdrop-blur-sm">
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Lobi Odası</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-zinc-900">
                  <span className="text-xs font-bold text-zinc-200">{playerName} (Sen)</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    isIReady ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  }`}>
                    {isIReady ? "Hazır ✅" : "Hazırlıyor..."}
                  </span>
                </div>
                {secondPlayer ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/40 border border-zinc-900">
                    <span className="text-xs font-bold text-zinc-200">{secondPlayer.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      secondPlayer.ready ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    }`}>
                      {secondPlayer.ready ? "Hazır ✅" : "Hazırlıyor..."}
                    </span>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-zinc-800/80 bg-zinc-950/20 text-center animate-pulse">
                    <p className="text-[10px] text-zinc-500">İkinci oyuncu bekleniyor (1/2)</p>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-[#0e0e11]/60 border border-zinc-900 p-5 rounded-2xl backdrop-blur-sm text-xs text-zinc-400 leading-relaxed space-y-2">
              <h3 className="font-bold text-zinc-300">Nasıl Oynanır?</h3>
              <p>1. Sağdaki alana en fazla 10 adet harf veya kelime girin.</p>
              <p>2. Hazırlanınca "Kelimeleri Kaydet & Hazırım" deyin.</p>
              <p>3. İki oyuncu da hazır olunca yan yana listeler açılır.</p>
            </div>
          </div>

          <div className="md:col-span-8">
            <div className="bg-[#0e0e11]/60 border border-zinc-900 p-6 rounded-2xl backdrop-blur-sm">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-zinc-800/50">
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Kendi Kelime Merdivenini Doldur</h2>
              </div>
              {activeError && <div className="mb-4 px-3 py-2 bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-400 rounded-lg">{activeError}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {myWordInputs.map((val, idx) => (
                  <div key={idx} className="flex items-center space-x-2 bg-zinc-950/60 border border-zinc-900 px-3 py-1.5 rounded-xl">
                    <span className="text-[10px] font-mono font-bold text-zinc-700 w-4">{idx + 1}.</span>
                    <input
                      type="text"
                      maxLength={18}
                      value={val}
                      disabled={isIReady}
                      onChange={(e) => handleInputChange(idx, e.target.value)}
                      placeholder="Kelime / harf..."
                      className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-800 focus:outline-none disabled:text-zinc-600"
                    />
                  </div>
                ))}
              </div>
              {!isIReady ? (
                <button
                  onClick={handleSetReady}
                  disabled={!secondPlayer}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:from-zinc-800 disabled:to-zinc-800 text-xs font-bold text-white shadow-lg transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
                >
                  {secondPlayer ? "Kelimeleri Kaydet & Hazırım" : "Rakip Katılınca Hazır Butonu Aktifleşir"}
                </button>
              ) : (
                <div className="w-full py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 text-center flex items-center justify-center space-x-2">
                  <span>✔</span>
                  <span>Listeniz iletildi. Rakibin hazır olması bekleniyor...</span>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 3. Gameplay / Arena View
  const player1 = room.players[0];
  const player2 = room.players[1];
  const gameState = room.gameState;

  return (
    <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none" />
      <header className="relative z-10 border-b border-zinc-900/50 bg-[#09090b]/60 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-violet-400">Kelime Merdiveni Arenası</span>
          </div>
          {player1 && player2 && (
            <div className="flex items-center space-x-4 bg-zinc-900/50 border border-zinc-800/80 px-4 py-1.5 rounded-xl">
              <span className="text-xs font-bold text-zinc-300">Skor:</span>
              <span className="text-xs font-mono font-black text-white">
                {player1.name} <span className="text-violet-400">{player1.score}</span> - <span className="text-fuchsia-400">{player2.score}</span> {player2.name}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 flex-grow max-w-4xl w-full mx-auto px-4 py-4 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:gap-8 items-start my-auto">
          {player1 && (
            <div className="bg-[#0e0e11]/60 border border-zinc-900 rounded-2xl p-2.5 sm:p-4 md:p-6 backdrop-blur-sm flex flex-col items-center">
              <h3 className="text-[10px] sm:text-xs font-black text-violet-400 uppercase tracking-widest mb-3 pb-1.5 border-b border-zinc-800/50 w-full text-center truncate px-1">
                {player1.name} {player1.id === room.hostId && "👑"}
              </h3>
              <div className="w-full space-y-1.5 flex flex-col items-center">
                {player1.list.map((word, index) => (
                  <div
                    key={index}
                    className="w-full max-w-[220px] py-1.5 px-2 bg-zinc-950/60 border border-zinc-900 rounded-lg text-center text-[10px] sm:text-xs font-bold text-zinc-300 shadow-sm relative overflow-hidden flex items-center justify-center min-h-[32px]"
                  >
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] font-mono font-black text-zinc-700">
                      #{index + 1}
                    </span>
                    <span className="break-all block pl-3 w-full text-center">{word}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {player2 && (
            <div className="bg-[#0e0e11]/60 border border-zinc-900 rounded-2xl p-2.5 sm:p-4 md:p-6 backdrop-blur-sm flex flex-col items-center">
              <h3 className="text-[10px] sm:text-xs font-black text-fuchsia-400 uppercase tracking-widest mb-3 pb-1.5 border-b border-zinc-800/50 w-full text-center truncate px-1">
                {player2.name} {player2.id === room.hostId && "👑"}
              </h3>
              <div className="w-full space-y-1.5 flex flex-col items-center">
                {player2.list.map((word, index) => (
                  <div
                    key={index}
                    className="w-full max-w-[220px] py-1.5 px-2 bg-zinc-950/60 border border-zinc-900 rounded-lg text-center text-[10px] sm:text-xs font-bold text-zinc-300 shadow-sm relative overflow-hidden flex items-center justify-center min-h-[32px]"
                  >
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] font-mono font-black text-zinc-700">
                      #{index + 1}
                    </span>
                    <span className="break-all block pl-3 w-full text-center">{word}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-4 bg-zinc-950/40 border border-zinc-900/60 rounded-3xl p-5 backdrop-blur-md">
          {gameState.status === "playing" ? (
            <div>
              {isMeHost ? (
                <>
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center mb-3">Turu Kim Kazandı? (Puan Ekle)</h4>
                  <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                    {player1 && (
                      <button
                        onClick={() => handleAwardPoint(player1.id)}
                        className="py-2.5 rounded-xl bg-violet-600/10 hover:bg-violet-600 text-xs font-bold text-violet-400 hover:text-white border border-violet-500/20 hover:border-violet-500 transition-all cursor-pointer"
                      >
                        {player1.name} Kazandı
                      </button>
                    )}
                    {player2 && (
                      <button
                        onClick={() => handleAwardPoint(player2.id)}
                        className="py-2.5 rounded-xl bg-fuchsia-600/10 hover:bg-fuchsia-600 text-xs font-bold text-fuchsia-400 hover:text-white border border-fuchsia-500/20 hover:border-fuchsia-500 transition-all cursor-pointer"
                      >
                        {player2.name} Kazandı
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-xs font-bold text-zinc-500 animate-pulse">Yöneticinin (Admin) kazananı seçmesi bekleniyor...</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-3 inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-xl">
                <span className="text-xs font-bold text-emerald-400">
                  🎉 Tur Kazananı: {room.players.find((p) => p.id === gameState.winnerId)?.name} (+1 Puan)
                </span>
              </div>
              {isMeHost ? (
                <div className="max-w-xs mx-auto">
                  <button
                    onClick={handleNewRound}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-xs font-bold text-white shadow-lg transition-all cursor-pointer"
                  >
                    Yeni Tur Başlat (Kelimeleri Sıfırla)
                  </button>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-xs font-bold text-zinc-500 animate-pulse">Yöneticinin (Admin) yeni turu başlatması bekleniyor...</p>
                </div>
              )}
            </div>
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
    </div>
  );
}

export default WordLadder;
