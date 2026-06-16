import React, { useState, useEffect } from "react";
import { socket } from "../../socket/socket";
import { knowFriendQuestions } from "../../data/knowFriendQuestions";

const getGenitiveSuffix = (name) => {
  if (!name) return "";
  const vowels = ['a', 'e', 'ı', 'i', 'o', 'ö', 'u', 'ü'];
  const nameLower = name.toLowerCase();
  
  let lastVowel = null;
  for (let i = nameLower.length - 1; i >= 0; i--) {
    if (vowels.includes(nameLower[i])) {
      lastVowel = nameLower[i];
      break;
    }
  }

  const endsWithVowel = vowels.includes(nameLower[nameLower.length - 1]);

  let suffix = "";
  if (lastVowel === 'a' || lastVowel === 'ı') {
    suffix = endsWithVowel ? "nın" : "ın";
  } else if (lastVowel === 'e' || lastVowel === 'i') {
    suffix = endsWithVowel ? "nin" : "in";
  } else if (lastVowel === 'o' || lastVowel === 'u') {
    suffix = endsWithVowel ? "nun" : "un";
  } else if (lastVowel === 'ö' || lastVowel === 'ü') {
    suffix = endsWithVowel ? "nün" : "ün";
  } else {
    suffix = "in";
  }

  return `${name}'${suffix}`;
};

const normalizeString = (str) => {
  if (!str) return '';
  let normalized = str.toString().trim();
  const map = {
    'Ç': 'c', 'ç': 'c',
    'Ğ': 'g', 'ğ': 'g',
    'I': 'i', 'ı': 'i',
    'İ': 'i', 'i': 'i',
    'Ö': 'o', 'ö': 'o',
    'Ş': 's', 'ş': 's',
    'Ü': 'u', 'ü': 'u'
  };
  normalized = normalized.replace(/[ÇçĞğIıİiÖöŞşÜü]/g, (match) => map[match]);
  return normalized.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

function KnowFriend({
  room,
  isInRoom,
  playerName,
  setPlayerName,
  onLeave,
  activeError,
  setActiveError,
  handleJoinGame
}) {
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [questionMode, setQuestionMode] = useState("choose"); // "choose" | "custom"
  const [customQuestion, setCustomQuestion] = useState("");
  const [customOptions, setCustomOptions] = useState(["", "", "", ""]);
  
  const [myChoice, setMyChoice] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lastQuestionId, setLastQuestionId] = useState(null);

  // New States for Team Mode and Open-ended questions
  const [selectedMode, setSelectedMode] = useState("ffa"); // "ffa" | "team"
  const [teams, setTeams] = useState({ A: [], B: [] });
  const [typedChoice, setTypedChoice] = useState("");
  const [selectedWinners, setSelectedWinners] = useState([]); // Array of player IDs (for FFA open-ended evaluation)
  const [verificationSubmitted, setVerificationSubmitted] = useState(false);

  const gameState = room?.gameState;
  const isMeHost = room?.hostId === socket?.id;
  const myInfo = room?.players.find((p) => p.id === socket?.id);
  const myScore = myInfo ? myInfo.score : 0;

  const isTeamMode = gameState?.mode === "team";
  
  const isMeAskerA = isTeamMode && gameState?.askerAId === socket?.id;
  const isMeTargetA = isTeamMode && gameState?.targetAId === socket?.id;
  const isMeAskerB = isTeamMode && gameState?.askerBId === socket?.id;
  const isMeTargetB = isTeamMode && gameState?.targetBId === socket?.id;

  const isMeAsker = isTeamMode ? (isMeAskerA || isMeAskerB) : (gameState?.askerId === socket?.id);
  const isMeTarget = isTeamMode ? (isMeTargetA || isMeTargetB) : (gameState?.targetId === socket?.id);

  // Reset local submissions when a new question starts
  useEffect(() => {
    if (gameState) {
      if (gameState.status === "playing") {
        const qId = gameState.currentQuestion?.id || gameState.currentQuestion?.question;
        if (qId !== lastQuestionId) {
          setMyChoice("");
          setHasSubmitted(false);
          setTypedChoice("");
          setLastQuestionId(qId);
        }
      } else if (gameState.status === "selecting_target") {
        setMyChoice("");
        setHasSubmitted(false);
        setTypedChoice("");
        setLastQuestionId(null);
        setSelectedTargetId("");
        setQuestionMode("choose");
        setCustomQuestion("");
        setCustomOptions(["", "", "", ""]);
        setVerificationSubmitted(false);
        setSelectedWinners([]);
      } else if (gameState.status === "evaluating") {
        const myId = socket?.id;
        const alreadyVerified = gameState.verifications && gameState.verifications[myId] !== undefined;
        setVerificationSubmitted(alreadyVerified);
        
        if (!isTeamMode && isMeTarget) {
          const targetAns = gameState.targetAnswer;
          const preSelected = room.players
            .filter(p => p.id !== gameState.targetId)
            .filter(p => {
              const playerAns = gameState.answers?.[p.id];
              return playerAns && targetAns && normalizeString(playerAns) === normalizeString(targetAns);
            })
            .map(p => p.id);
          setSelectedWinners(preSelected);
        } else {
          setSelectedWinners([]);
        }
      }
    }
  }, [gameState?.status, gameState?.currentQuestion, lastQuestionId]);

  // Admin Actions
  const handleAssignTeam = (playerId, teamName) => {
    const nextTeams = {
      A: [...(teams.A || [])],
      B: [...(teams.B || [])]
    };
    nextTeams.A = nextTeams.A.filter(id => id !== playerId);
    nextTeams.B = nextTeams.B.filter(id => id !== playerId);
    if (teamName === "A") {
      nextTeams.A.push(playerId);
    } else if (teamName === "B") {
      nextTeams.B.push(playerId);
    }
    setTeams(nextTeams);
  };

  const handleStartGame = () => {
    if (selectedMode === "team") {
      if (room.players.length !== 4) {
        setActiveError("Takımlı mod en fazla ve en az 4 oyuncuyla oynanabilir.");
        return;
      }
      const allAssigned = room.players.every(p => teams.A.includes(p.id) || teams.B.includes(p.id));
      if (!allAssigned) {
        setActiveError("Lütfen tüm oyuncuları bir takıma dağıtın.");
        return;
      }
      if (teams.A.length !== 2 || teams.B.length !== 2) {
        setActiveError("Her takımda tam olarak 2 oyuncu olmalıdır.");
        return;
      }
      setActiveError("");
      socket.emit("know-friend-start-game", { mode: "team", teams });
    } else {
      if (room.players.length < 2) {
        setActiveError("Oyunu başlatmak için en az 2 oyuncu gereklidir.");
        return;
      }
      setActiveError("");
      socket.emit("know-friend-start-game", { mode: "ffa" });
    }
  };

  // Asker Selects Target & Question
  const handleSelectTargetPreset = (targetId) => {
    if (!isTeamMode && !targetId) {
      setActiveError("Lütfen soru soracağınız kişiyi seçin.");
      return;
    }
    setActiveError("");

    if (knowFriendQuestions.length > 0) {
      const askedIds = room.askedQuestionIds?.["Kim Daha İyi Tanıyor?"] || [];
      let eligibleQuestions = knowFriendQuestions.filter(q => !askedIds.includes(q.id));
      if (eligibleQuestions.length === 0) {
        eligibleQuestions = knowFriendQuestions;
      }
      const randomQ = eligibleQuestions[Math.floor(Math.random() * eligibleQuestions.length)];
      socket.emit("know-friend-select-target", {
        targetId: isTeamMode ? null : targetId,
        question: randomQ
      });
    }
  };

  const handleSelectTargetCustom = (targetId) => {
    if (!isTeamMode && !targetId) {
      setActiveError("Lütfen soru soracağınız kişiyi seçin.");
      return;
    }
    if (!customQuestion.trim()) {
      setActiveError("Lütfen soru metnini yazın.");
      return;
    }
    
    // Check if options are provided. If some are filled, all must be filled.
    // If all are empty, it's open-ended.
    const allEmpty = customOptions.every(opt => !opt.trim());
    const anyFilled = customOptions.some(opt => opt.trim());
    
    if (anyFilled && !allEmpty) {
      const emptyOptionIndex = customOptions.findIndex(opt => !opt.trim());
      setActiveError(`Lütfen Seçenek ${emptyOptionIndex + 1} metnini doldurun veya tüm seçenekleri boş bırakın (açık uçlu için).`);
      return;
    }
    setActiveError("");

    const customQ = {
      id: "custom_" + Date.now(),
      question: customQuestion.trim(),
      options: allEmpty ? [] : customOptions.map(opt => opt.trim())
    };

    socket.emit("know-friend-select-target", {
      targetId: isTeamMode ? null : targetId,
      question: customQ
    });
  };

  // Guess Verification for Open-ended Questions
  const handleVerifyAnswerFFA = () => {
    socket.emit("know-friend-verify-answer", { winners: selectedWinners });
  };

  const handleVerifyAnswerTeam = (correct) => {
    socket.emit("know-friend-verify-answer", { correct }, (res) => {
      if (res.success) {
        setVerificationSubmitted(true);
      }
    });
  };

  // Guess/Answer Submission
  const handleSubmitChoice = (choiceText) => {
    if (hasSubmitted) return;
    setMyChoice(choiceText);

    socket.emit("know-friend-submit-choice", { choice: choiceText }, (res) => {
      if (res.success) {
        setHasSubmitted(true);
        setActiveError("");
      } else {
        setActiveError(res.message || "Seçim iletilemedi.");
      }
    });
  };

  // Next round
  const handleNextRound = () => {
    socket.emit("know-friend-next-round");
  };

  // Override to take the next asker turn
  const handleTakeNextTurn = () => {
    socket.emit("know-friend-take-next-turn");
  };

  const handleCustomOptionChange = (index, value) => {
    const nextOpts = [...customOptions];
    nextOpts[index] = value;
    setCustomOptions(nextOpts);
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
              🧩
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Kim Daha İyi Tanıyor?
            </h1>
            <p className="mt-2 text-xs text-zinc-400 font-medium">
              Sırayla soru sorun, hedef kişinin vereceği cevabı tahmin ederek arkadaşlarınızı ne kadar iyi tanıdığınızı gösterin!
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
                placeholder="Örn: Toprak"
                className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-violet-500/50 text-sm transition-colors"
                autoFocus
              />
            </div>

            {/* Enter Game Button */}
            <button
              onClick={() => handleJoinGame("Kim Daha İyi Tanıyor?")}
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

  // 1. Lobby State
  if (gameState.status === "preparing") {
    const playerCount = room.players.length;
    const teamA = teams.A || [];
    const teamB = teams.B || [];

    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
        <header className="relative z-10 border-b border-zinc-900/50 bg-[#09090b]/60 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-400">Kim Daha İyi Tanıyor Lobisi</span>
            </div>
            <button
              onClick={onLeave}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-[10px] font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Oyundan Çık
            </button>
          </div>
        </header>

        <main className="relative z-10 flex-grow max-w-5xl w-full mx-auto px-6 py-8 flex flex-col justify-center items-center">
          <div className="max-w-md w-full bg-[#0e0e11]/60 border border-zinc-900 p-6 rounded-3xl backdrop-blur-sm space-y-6 shadow-2xl">
            <div className="text-center">
              <span className="text-3xl">🧩</span>
              <h2 className="text-lg font-bold text-white mt-2">Arkadaş Tanıma Odası</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Her turda bir kişi soru sorar, bir kişi hedef olur. Diğerleri onun cevabını tahmin eder!
              </p>
            </div>

            {activeError && (
              <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400 rounded-lg text-center">
                {activeError}
              </div>
            )}

            {/* Mode selection for Admin */}
            {isMeHost && (
              <div className="space-y-2.5">
                <label className="block text-[10px] font-bold text-zinc-450 uppercase tracking-widest">
                  Oyun Modu Seçin
                </label>
                <div className="flex bg-zinc-950 border border-zinc-900 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => { setSelectedMode("ffa"); setActiveError(""); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      selectedMode === "ffa" ? "bg-zinc-900 text-white" : "text-zinc-550 hover:text-zinc-350"
                    }`}
                  >
                    Herkes Tek (FFA)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedMode("team"); setActiveError(""); }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      selectedMode === "team" ? "bg-zinc-900 text-white" : "text-zinc-550 hover:text-zinc-350"
                    }`}
                  >
                    Takımlı Oyna (4 Kişi)
                  </button>
                </div>
              </div>
            )}

            {/* Team Distribution UI for Admin */}
            {isMeHost && selectedMode === "team" && (
              <div className="space-y-4 pt-3 border-t border-zinc-900">
                <div className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest">
                  Takım Dağıtımı (A ve B Takımları)
                </div>
                
                <div className="space-y-3">
                  {room.players.map(p => {
                    const assignedTeam = teamA.includes(p.id) ? "A" : (teamB.includes(p.id) ? "B" : null);
                    return (
                      <div key={p.id} className="flex justify-between items-center p-2 bg-zinc-950/40 border border-zinc-900 rounded-xl">
                        <span className="text-xs font-semibold text-zinc-300 pl-1">{p.name}</span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleAssignTeam(p.id, "A")}
                            className={`px-2 py-1 text-[9px] rounded-lg border transition-all cursor-pointer ${
                              assignedTeam === "A"
                                ? "bg-violet-600/20 border-violet-500 text-violet-400 font-bold"
                                : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            A Takımı
                          </button>
                          <button
                            onClick={() => handleAssignTeam(p.id, "B")}
                            className={`px-2 py-1 text-[9px] rounded-lg border transition-all cursor-pointer ${
                              assignedTeam === "B"
                                ? "bg-fuchsia-600/20 border-fuchsia-500 text-fuchsia-400 font-bold"
                                : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            B Takımı
                          </button>
                          <button
                            onClick={() => handleAssignTeam(p.id, "none")}
                            className={`px-1.5 py-1 text-[9px] rounded-lg border transition-all cursor-pointer bg-zinc-950 border-zinc-900 text-zinc-550 hover:text-zinc-300 ${
                              !assignedTeam ? "opacity-30" : ""
                            }`}
                          >
                            Çıkar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div className="bg-violet-950/10 border border-violet-900/30 p-3 rounded-xl space-y-1">
                    <div className="font-bold text-violet-400 border-b border-violet-900/30 pb-1 mb-1.5">💜 A Takımı ({teamA.length}/2)</div>
                    {teamA.length > 0 ? (
                      teamA.map(id => {
                        const p = room.players.find(x => x.id === id);
                        return <div key={id} className="text-zinc-350 truncate">{p ? p.name : "..."}</div>;
                      })
                    ) : (
                      <div className="text-[10px] text-zinc-600 italic">Boş</div>
                    )}
                  </div>
                  <div className="bg-fuchsia-950/10 border border-fuchsia-900/30 p-3 rounded-xl space-y-1">
                    <div className="font-bold text-fuchsia-400 border-b border-fuchsia-900/30 pb-1 mb-1.5">💖 B Takımı ({teamB.length}/2)</div>
                    {teamB.length > 0 ? (
                      teamB.map(id => {
                        const p = room.players.find(x => x.id === id);
                        return <div key={id} className="text-zinc-350 truncate">{p ? p.name : "..."}</div>;
                      })
                    ) : (
                      <div className="text-[10px] text-zinc-600 italic">Boş</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Players list */}
            {(!isMeHost || selectedMode !== "team") && (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                <div className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest pb-1 border-b border-zinc-900">
                  Bağlı Oyuncular ({playerCount}/10)
                </div>
                {room.players.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-2.5 bg-zinc-950/40 border border-zinc-900 rounded-xl text-xs font-semibold">
                    <span className="text-zinc-200">{p.name}</span>
                    {p.isHost && <span className="text-[8px] bg-amber-500/10 border border-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded uppercase">Kurucu</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Start Button */}
            {isMeHost ? (
              <button
                onClick={handleStartGame}
                disabled={selectedMode === "team" ? (playerCount !== 4) : (playerCount < 2)}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-650 text-xs font-bold text-white shadow-lg transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {selectedMode === "team"
                  ? (playerCount === 4 ? "Oyunu Başlat (Takımlı)" : "Takımlı Mod İçin Tam 4 Kişi Gerekli")
                  : (playerCount >= 2 ? "Oyunu Başlat" : "En Az 2 Oyuncu Gerekli")}
              </button>
            ) : (
              <div className="text-center py-3 rounded-xl bg-zinc-950/40 border border-zinc-900/60 animate-pulse">
                <p className="text-xs font-semibold text-zinc-500">
                  Yöneticinin (Admin) oyunu başlatması bekleniyor...
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // 2. Selecting Target/Question Stage
  if (gameState.status === "selecting_target") {
    const asker = room.players.find(p => p.id === gameState.askerId);
    const otherPlayers = room.players.filter(p => p.id !== gameState.askerId);

    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
        <header className="relative z-10 border-b border-zinc-900/50 bg-[#09090b]/60 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-400">Kim Daha İyi Tanıyor?</span>
            </div>
            <button
              onClick={onLeave}
              className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-[10px] font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Oyundan Çık
            </button>
          </div>
        </header>

        <main className="relative z-10 flex-grow max-w-3xl w-full mx-auto px-6 py-6 flex flex-col justify-center items-center my-auto">
          {isMeAsker ? (
            <div className="w-full max-w-lg bg-[#0e0e11]/60 border border-zinc-900 p-6 md:p-8 rounded-3xl backdrop-blur-sm space-y-6 shadow-2xl">
              
              <div className="text-center pb-2 border-b border-zinc-900">
                <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest block">SIRA SENDE 👑</span>
                <h2 className="text-base font-bold text-zinc-200 mt-1">Soru Hazırlama Sırası Sende!</h2>
              </div>

              {activeError && (
                <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400 rounded-lg text-center">
                  {activeError}
                </div>
              )}

              {/* Step 1: Select Target Player (FFA Only) */}
              {!isTeamMode && (
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-zinc-450 uppercase tracking-widest">
                    1. Soru Sorulacak Kişiyi (Hedef) Seç
                  </label>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {otherPlayers.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => {
                          setSelectedTargetId(player.id);
                          setActiveError("");
                        }}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer truncate ${
                          selectedTargetId === player.id
                            ? "bg-violet-600/15 border-violet-500 text-violet-400"
                            : "bg-zinc-950/50 border-zinc-900 text-zinc-450 hover:border-zinc-800"
                        }`}
                      >
                        {player.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Choose Question Mode */}
              {(isTeamMode || selectedTargetId) && (
                <div className="space-y-4 pt-4 border-t border-zinc-900">
                  <label className="block text-[10px] font-bold text-zinc-450 uppercase tracking-widest">
                    {isTeamMode ? "Soru Türü Seçin" : "2. Soru Türü Seçin"}
                  </label>

                  <div className="flex bg-zinc-950 border border-zinc-900 rounded-xl p-1 mb-4">
                    <button
                      type="button"
                      onClick={() => { setQuestionMode("choose"); setActiveError(""); }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        questionMode === "choose" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Hazır Soru Kullan
                    </button>
                    <button
                      type="button"
                      onClick={() => { setQuestionMode("custom"); setActiveError(""); }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        questionMode === "custom" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Kendi Sorunu Yarat
                    </button>
                  </div>

                  {/* Mode 1: Preset Choice */}
                  {questionMode === "choose" && (
                    <button
                      onClick={() => handleSelectTargetPreset(selectedTargetId)}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-xs font-bold text-white shadow-lg cursor-pointer"
                    >
                      {isTeamMode ? "Rastgele Hazır Soru Gönder & Turu Başlat" : "Rastgele Hazır Soru Gönder & Oyunu Başlat"}
                    </button>
                  )}

                  {/* Mode 2: Custom Question Form */}
                  {questionMode === "custom" && (
                    <div className="space-y-3.5">
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1.5">SORU METNİ</label>
                        <input
                          type="text"
                          maxLength={70}
                          value={customQuestion}
                          onChange={(e) => setCustomQuestion(e.target.value)}
                          placeholder="Örn: Hangisini yapmayı daha çok seviyor?"
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-900 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-zinc-500 uppercase">SEÇENEKLER (İSTEĞE BAĞLI)</label>
                        <p className="text-[9px] text-zinc-550 mb-2 leading-none">Seçenekleri doldurmazsanız soru açık uçlu (şıksız) olarak sorulur.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {customOptions.map((opt, idx) => (
                            <div key={idx}>
                              <label className="block text-[8px] font-bold text-zinc-650 mb-1">SEÇENEK {idx + 1}</label>
                              <input
                                type="text"
                                maxLength={30}
                                value={opt}
                                onChange={(e) => handleCustomOptionChange(idx, e.target.value)}
                                placeholder={`Boş (Açık uçlu için)`}
                                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-900 text-xs text-zinc-200 placeholder-zinc-850 focus:outline-none focus:border-violet-500/40"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => handleSelectTargetCustom(selectedTargetId)}
                        className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-xs font-bold text-white shadow-lg cursor-pointer"
                      >
                        Özel Soruyu Yayınla & Oyunu Başlat
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 rounded-3xl border border-dashed border-zinc-800 bg-[#0e0e11]/20 backdrop-blur-sm min-h-[260px] max-w-sm">
              <div className="w-12 h-12 rounded-full bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-center mb-5 animate-pulse text-lg">
                🤔
              </div>
              <h3 className="text-sm font-bold text-zinc-200">Soru Seçiliyor...</h3>
              <p className="text-xs text-zinc-550 max-w-xs mx-auto mt-2 leading-relaxed">
                Sıradaki oyuncu <strong>{asker ? asker.name : "Bilinmeyen"}</strong>, soru sorulacak hedef arkadaşımızı seçip soruyu hazırlıyor. Lütfen bekleyin...
              </p>
            </div>
          )}
        </main>
      </div>
    );
  }

  // 3. Playing Stage
  if (gameState.status === "playing") {
    const q = gameState.currentQuestion;
    const targetPlayer = room.players.find(p => p.id === gameState.targetId);
    const isQuestionOpenEnded = !q?.options || q.options.length === 0 || q.options.every(o => !o);
    
    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-900/5 rounded-full blur-[100px] pointer-events-none" />

        <header className="relative z-10 border-b border-zinc-900/50 bg-[#09090b]/60 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-400">Tanıma Arenası</span>
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

        <main className="relative z-10 flex-grow max-w-2xl w-full mx-auto px-6 py-6 flex flex-col justify-between my-auto space-y-6">
          
          {/* Target Title Board */}
          <div className="w-full bg-[#0e0e11]/60 border border-zinc-900 rounded-3xl p-5 md:p-6 text-center shadow-xl relative overflow-hidden">
            {isTeamMode ? (
              <>
                <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest block mb-1">
                  TAKIMLI MÜCADELE 👥
                </span>
                <div className="flex justify-center items-center space-x-4 mt-2">
                  <div className="text-right">
                    <span className="block text-[8px] text-zinc-500 font-bold">A TAKIMI</span>
                    <span className="text-xs font-semibold text-zinc-300">
                      {room.players.find(p => p.id === gameState.askerAId)?.name} ➜ {room.players.find(p => p.id === gameState.targetAId)?.name}
                    </span>
                  </div>
                  <span className="text-zinc-700 text-xs font-bold">VS</span>
                  <div className="text-left">
                    <span className="block text-[8px] text-zinc-500 font-bold">B TAKIMI</span>
                    <span className="text-xs font-semibold text-zinc-300">
                      {room.players.find(p => p.id === gameState.askerBId)?.name} ➜ {room.players.find(p => p.id === gameState.targetBId)?.name}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest block mb-1">
                  HEDEF ARKADAŞIMIZ
                </span>
                <h1 className="text-2xl font-black text-white tracking-wide truncate px-2">
                  🎯 {targetPlayer ? targetPlayer.name : "Bilinmeyen"}
                </h1>
                <p className="text-[10px] text-zinc-500 mt-1 leading-none">
                  Bu soruda hedef kişinin neyi seçeceğini tahmin edin!
                </p>
              </>
            )}
          </div>

          {/* Question Text */}
          {q && (
            <div className="bg-zinc-950/40 border border-zinc-900/60 p-5 rounded-2xl text-center">
              <h2 className="text-base font-bold text-zinc-200">
                {q.question}
              </h2>
            </div>
          )}

          {/* Options Buttons or Custom input selection */}
          <div className="space-y-3">
            {activeError && (
              <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-400 rounded-lg text-center">
                {activeError}
              </div>
            )}

            {!hasSubmitted ? (
              isQuestionOpenEnded ? (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (typedChoice.trim()) {
                    handleSubmitChoice(typedChoice.trim());
                  }
                }} className="space-y-3 max-w-sm w-full mx-auto">
                  <input
                    type="text"
                    maxLength={50}
                    value={typedChoice}
                    onChange={(e) => setTypedChoice(e.target.value)}
                    placeholder={isMeTarget ? "Kendi gerçek cevabınızı yazın..." : "Tahmininizi yazın..."}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500/50 text-xs text-center"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!typedChoice.trim()}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-xs font-bold text-white shadow-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isMeTarget ? "Cevabı Kaydet" : "Tahmini Gönder"}
                  </button>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              )
            ) : (
              <div className="bg-[#0e0e11]/60 border border-zinc-900 p-6 rounded-3xl text-center space-y-3 shadow-lg max-w-sm w-full mx-auto">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 mx-auto text-xs">✓</div>
                <h3 className="text-xs font-bold text-zinc-200">
                  {isMeTarget ? "Cevabınız İletildi!" : "Tahmininiz İletildi!"}
                </h3>
                <div className="inline-block px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-900 text-xs font-bold text-violet-400 font-mono">
                  {myChoice}
                </div>
                <p className="text-[10px] text-zinc-505 animate-pulse mt-4">
                  Diğer oyuncuların seçim yapması bekleniyor...
                </p>
              </div>
            )}
          </div>

          {/* Connection Players voting status list */}
          <div className="bg-[#0e0e11]/25 border border-zinc-900/60 rounded-2xl p-4 max-w-md w-full mx-auto">
            <h3 className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest mb-3 text-center">
              KATILIMCI SEÇİM DURUMLARI
            </h3>
            
            {isTeamMode ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: gameState.askerAId, label: "A Takımı Tahminci" },
                  { id: gameState.targetAId, label: "A Takımı Hedef 🎯" },
                  { id: gameState.askerBId, label: "B Takımı Tahminci" },
                  { id: gameState.targetBId, label: "B Takımı Hedef 🎯" }
                ].map((role) => {
                  if (!role.id) return null;
                  const player = room.players.find(p => p.id === role.id);
                  const hasChosen = gameState.answers[role.id] !== undefined;
                  return (
                    <div key={role.id} className="flex items-center space-x-2 bg-zinc-950/20 px-2.5 py-1.5 rounded-lg border border-zinc-900">
                      <span className={`w-1.5 h-1.5 rounded-full ${hasChosen ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                      <span className="text-[11px] text-zinc-350 truncate max-w-[90px]">{player ? player.name : "..."}</span>
                      <span className="text-[8px] font-bold text-zinc-550 ml-auto">
                        {role.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {room.players.map((p) => {
                  const isTarget = p.id === gameState.targetId;
                  const hasChosen = isTarget 
                    ? (gameState.targetAnswer !== null && gameState.targetAnswer !== undefined) 
                    : (gameState.answers[p.id] !== undefined);
                    
                  return (
                    <div key={p.id} className="flex items-center space-x-2 bg-zinc-950/20 px-2.5 py-1.5 rounded-lg border border-zinc-900">
                      <span className={`w-1.5 h-1.5 rounded-full ${hasChosen ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                      <span className="text-[11px] text-zinc-350 truncate max-w-[90px]">{p.name}</span>
                      <span className="text-[8px] font-bold text-zinc-605 ml-auto">
                        {isTarget ? "Hedef 🎯" : (hasChosen ? "Seçti" : "Düşünüyor")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </main>
      </div>
    );
  }

  // 3.5 Evaluating Stage (Open-ended evaluations)
  if (gameState.status === "evaluating") {
    const q = gameState.currentQuestion;
    const answers = gameState.answers || {};
    const targetPlayer = room.players.find(p => p.id === gameState.targetId);

    return (
      <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-900/5 rounded-full blur-[100px] pointer-events-none" />

        <header className="relative z-10 border-b border-zinc-900/50 bg-[#09090b]/60 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-400">Cevap Değerlendirme</span>
            </div>
            {myInfo && (
              <span className="text-[10px] font-bold bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full text-zinc-350">
                Sen: <span className="text-violet-400">{myInfo.name}</span> ({myScore} P)
              </span>
            )}
          </div>
        </header>

        <main className="relative z-10 flex-grow max-w-lg w-full mx-auto px-6 py-6 flex flex-col justify-center items-center my-auto space-y-6">
          {isTeamMode ? (
            // Team Mode Evaluation
            (isMeTargetA || isMeTargetB) ? (
              // Targets verify
              <div className="w-full bg-[#0e0e11]/60 border border-zinc-900 p-6 md:p-8 rounded-3xl backdrop-blur-sm space-y-6 shadow-2xl text-center">
                <div>
                  <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest block">DEĞERLENDİRME SIRASI SENDE</span>
                  <h2 className="text-base font-bold text-zinc-200 mt-1">Takım Arkadaşının Tahminini Değerlendir</h2>
                </div>

                <div className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-2xl text-xs space-y-3 text-left">
                  <div>
                    <span className="text-zinc-550 block text-[9px] uppercase tracking-wider">Soru</span>
                    <span className="text-zinc-300 font-semibold">{q.question}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-900/60">
                    <div>
                      <span className="text-zinc-550 block text-[9px] uppercase tracking-wider">Kendi Cevabın</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {isMeTargetA ? answers[gameState.targetAId] : answers[gameState.targetBId]}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-550 block text-[9px] uppercase tracking-wider">Partnerinin Tahmini</span>
                      <span className="text-violet-400 font-bold text-sm">
                        {isMeTargetA ? answers[gameState.askerAId] : answers[gameState.askerBId]}
                      </span>
                    </div>
                  </div>
                </div>

                {!verificationSubmitted ? (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleVerifyAnswerTeam(true)}
                      className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all cursor-pointer"
                    >
                      Doğru / Kabul Et
                    </button>
                    <button
                      onClick={() => handleVerifyAnswerTeam(false)}
                      className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-350 transition-all cursor-pointer border border-zinc-700"
                    >
                      Yanlış / Reddet
                    </button>
                  </div>
                ) : (
                  <div className="w-full py-2.5 rounded-xl bg-zinc-950/40 border border-zinc-900 text-xs font-bold text-emerald-400 animate-pulse text-center">
                    Değerlendirmeniz İletildi. Diğer takım bekleniyor...
                  </div>
                )}
              </div>
            ) : (
              // Askers wait
              <div className="w-full text-center p-8 rounded-3xl border border-dashed border-zinc-800 bg-[#0e0e11]/20 backdrop-blur-sm space-y-4 max-w-sm">
                <div className="w-12 h-12 rounded-full bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-center mb-2 mx-auto animate-pulse text-lg">
                  ⚖️
                </div>
                <h3 className="text-sm font-bold text-zinc-200">Tahminler Değerlendiriliyor...</h3>
                <p className="text-xs text-zinc-550 max-w-xs mx-auto">
                  Takımlardaki hedef oyuncuların (partnerlerinizin) tahminlerinizi değerlendirmesi bekleniyor...
                </p>
              </div>
            )
          ) : (
            // FFA Mode Evaluation
            isMeTarget ? (
              // Target selects winners
              <div className="w-full bg-[#0e0e11]/60 border border-zinc-900 p-6 md:p-8 rounded-3xl backdrop-blur-sm space-y-6 shadow-2xl">
                <div className="text-center pb-2 border-b border-zinc-900">
                  <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest block">DEĞERLENDİRME AŞAMASI 🎯</span>
                  <h2 className="text-base font-bold text-zinc-200 mt-1">Hangi Cevaplar Doğru?</h2>
                  <p className="text-[10px] text-zinc-500 mt-1">Kendi yazdığın cevaba göre doğru tahmin eden arkadaşları işaretle.</p>
                </div>

                <div className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-xl text-center space-y-1">
                  <span className="text-zinc-550 block text-[9px] uppercase tracking-wider">Senin Gerçek Cevabın</span>
                  <span className="text-emerald-400 font-bold text-base">{gameState.targetAnswer}</span>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  <span className="block text-[10px] font-bold text-zinc-550 uppercase tracking-widest pb-1">Arkadaşların Cevapları</span>
                  {room.players.map(p => {
                    if (p.id === gameState.targetId) return null;
                    const isSelected = selectedWinners.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedWinners(prev => prev.filter(id => id !== p.id));
                          } else {
                            setSelectedWinners(prev => [...prev, p.id]);
                          }
                        }}
                        className={`w-full flex justify-between items-center p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-950/15 border-emerald-500 text-emerald-400"
                            : "bg-zinc-950/40 border-zinc-900 text-zinc-350 hover:border-zinc-800"
                        }`}
                      >
                        <span>{p.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-zinc-250 bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded text-[10px]">
                            {answers[p.id] || "(Cevap yok)"}
                          </span>
                          <span className="text-sm">{isSelected ? "✔️" : "⬜"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleVerifyAnswerFFA}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-xs font-bold text-white shadow-lg cursor-pointer"
                >
                  Değerlendirmeyi Kaydet & Sonuçları Açıkla
                </button>
              </div>
            ) : (
              // Guesser waits
              <div className="w-full text-center p-8 rounded-3xl border border-dashed border-zinc-800 bg-[#0e0e11]/20 backdrop-blur-sm space-y-4 max-w-sm">
                <div className="w-12 h-12 rounded-full bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-center mb-2 mx-auto animate-pulse text-lg">
                  🤔
                </div>
                <h3 className="text-sm font-bold text-zinc-200">Değerlendirme Bekleniyor...</h3>
                <p className="text-xs text-zinc-550 max-w-xs mx-auto leading-relaxed">
                  Hedef arkadaşınız <strong>{targetPlayer ? targetPlayer.name : "Bilinmeyen"}</strong>, yazdığınız tahminleri kendi cevabına göre değerlendiriyor. Lütfen bekleyin...
                </p>
              </div>
            )
          )}
        </main>
      </div>
    );
  }

  // 4. Result Stage
  if (gameState.status === "result") {
    const q = gameState.currentQuestion;
    const answers = gameState.answers || {};
    const targetAnswer = gameState.targetAnswer;
    const targetPlayer = room.players.find(p => p.id === gameState.targetId);
    const isQuestionOpenEnded = !q?.options || q.options.length === 0 || q.options.every(o => !o);

    // For FFA
    const isMeTargetResult = gameState.targetId === socket?.id;
    const isMyGuessCorrect = !isMeTargetResult && (isQuestionOpenEnded 
      ? (gameState.winners && gameState.winners.includes(socket.id))
      : (answers[socket.id] !== undefined && targetAnswer !== undefined && normalizeString(answers[socket.id]) === normalizeString(targetAnswer)));

    // For Team Mode
    const isTeamAMatched = isTeamMode && (isQuestionOpenEnded
      ? (gameState.verifications && gameState.verifications[gameState.targetAId] === true)
      : (answers[gameState.askerAId] !== undefined && answers[gameState.targetAId] !== undefined && normalizeString(answers[gameState.askerAId]) === normalizeString(answers[gameState.targetAId])));
    const isTeamBMatched = isTeamMode && (isQuestionOpenEnded
      ? (gameState.verifications && gameState.verifications[gameState.targetBId] === true)
      : (answers[gameState.askerBId] !== undefined && answers[gameState.targetBId] !== undefined && normalizeString(answers[gameState.askerBId]) === normalizeString(answers[gameState.targetBId])));

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

          {isTeamMode ? (
            // Team Mode Results Display
            <div className="space-y-6 max-w-xl w-full mx-auto mb-6">
              {/* Team Scores Card */}
              <div className="bg-zinc-950/40 border border-zinc-900/60 rounded-3xl p-6 shadow-xl text-center">
                <span className="text-[9px] font-bold text-zinc-550 tracking-widest block mb-2">TAKIM PUANLARI</span>
                <div className="flex justify-center items-center space-x-8">
                  <div>
                    <span className="block text-[10px] text-violet-400 font-bold">A TAKIMI</span>
                    <span className="text-3xl font-black text-white">{gameState.teamScores?.A || 0}</span>
                  </div>
                  <span className="text-zinc-650 text-xl font-bold"> - </span>
                  <div>
                    <span className="block text-[10px] text-fuchsia-400 font-bold">B TAKIMI</span>
                    <span className="text-3xl font-black text-white">{gameState.teamScores?.B || 0}</span>
                  </div>
                </div>
              </div>

              {/* Detailed Team Guesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Team A Details */}
                <div className={`p-5 rounded-2xl border ${isTeamAMatched ? "bg-emerald-950/10 border-emerald-500/20" : "bg-red-950/5 border-rose-500/10"} space-y-3`}>
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                    <span className="text-xs font-bold text-violet-400">💜 A Takımı</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isTeamAMatched ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                      {isTeamAMatched ? "✓ Eşleşti (+1 Puan)" : "✗ Uyuşmadı"}
                    </span>
                  </div>
                  <div className="text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-zinc-550">Hedef ({room.players.find(x => x.id === gameState.targetAId)?.name}):</span>
                      <span className="font-bold text-zinc-200">{answers[gameState.targetAId]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-550">Tahmin ({room.players.find(x => x.id === gameState.askerAId)?.name}):</span>
                      <span className="font-bold text-zinc-200">{answers[gameState.askerAId]}</span>
                    </div>
                  </div>
                </div>

                {/* Team B Details */}
                <div className={`p-5 rounded-2xl border ${isTeamBMatched ? "bg-emerald-950/10 border-emerald-500/20" : "bg-red-950/5 border-rose-500/10"} space-y-3`}>
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                    <span className="text-xs font-bold text-fuchsia-400">💖 B Takımı</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isTeamBMatched ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                      {isTeamBMatched ? "✓ Eşleşti (+1 Puan)" : "✗ Uyuşmadı"}
                    </span>
                  </div>
                  <div className="text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-zinc-550">Hedef ({room.players.find(x => x.id === gameState.targetBId)?.name}):</span>
                      <span className="font-bold text-zinc-200">{answers[gameState.targetBId]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-550">Tahmin ({room.players.find(x => x.id === gameState.askerBId)?.name}):</span>
                      <span className="font-bold text-zinc-200">{answers[gameState.askerBId]}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // FFA Mode Results Display
            <>
              {/* Correct Answer Display */}
              <div className="bg-zinc-950/40 border border-zinc-900/60 rounded-3xl p-6 text-center max-w-md w-full mx-auto shadow-xl mb-6">
                <span className="text-[9px] font-bold text-zinc-550 tracking-widest block mb-1">
                  {targetPlayer ? `${getGenitiveSuffix(targetPlayer.name)} Cevabı` : "Hedef Kişinin Cevabı"}
                </span>
                <h2 className="text-3xl font-black text-emerald-400 drop-shadow-md">
                  {targetAnswer}
                </h2>
                
                {/* Visual Feedback Message */}
                {!isMeTargetResult && (
                  <p className={`mt-3 text-xs font-bold ${isMyGuessCorrect ? "text-emerald-400" : "text-zinc-500"}`}>
                    {isMyGuessCorrect ? "🎉 Doğru Tahmin! +1 Puan Kazandın!" : "❌ Yanlış Tahmin! Puan alamadın."}
                  </p>
                )}
              </div>

              {/* Guesses list */}
              <div className="bg-zinc-950/40 border border-zinc-900/60 rounded-3xl p-5 md:p-6 backdrop-blur-sm max-w-lg w-full mx-auto mb-6">
                <h3 className="text-xs font-bold text-zinc-450 uppercase tracking-widest pb-2.5 border-b border-zinc-900 mb-4">
                  OYUNCULARIN TAHMİNLERİ
                </h3>

                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {room.players.map(p => {
                    if (p.id === gameState.targetId) return null; // Skip target player

                    const guess = answers[p.id];
                    const isCorrect = isQuestionOpenEnded 
                      ? (gameState.winners && gameState.winners.includes(p.id))
                      : (guess !== undefined && targetAnswer !== undefined && normalizeString(guess) === normalizeString(targetAnswer));

                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isCorrect 
                            ? "bg-emerald-950/10 border-emerald-500/20" 
                            : "bg-red-950/10 border-rose-500/10"
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className="text-sm">{isCorrect ? "✔️" : "❌"}</span>
                          <span className="text-xs font-semibold text-zinc-200">
                            {p.name}
                          </span>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <span className={`text-xs font-mono font-bold ${isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
                              {guess || "Seçmedi"}
                            </span>
                            <span className="block text-[8px] text-zinc-650">Tahmin</span>
                          </div>
                          <div className="text-right w-16">
                            <span className={`text-xs font-bold ${isCorrect ? "text-emerald-400" : "text-zinc-500"}`}>
                              {isCorrect ? "+1 Puan" : "0 Puan"}
                            </span>
                            <span className="block text-[8px] text-zinc-650">Kazanılan</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Scores Board and Action Buttons */}
          <div className="bg-[#0e0e11]/60 border border-zinc-900 rounded-3xl p-5 max-w-lg w-full mx-auto space-y-4">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">SKOR TABLOSU</h3>
            
            <div className="grid grid-cols-2 gap-2 text-xs max-h-40 overflow-y-auto pr-1">
              {room.players
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((player, idx) => (
                  <div key={player.id} className="flex justify-between items-center bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900">
                    <span className="text-zinc-300 font-semibold truncate max-w-[100px]">
                      #{idx + 1} {player.name} {(!isTeamMode && player.id === gameState.targetId) && "🎯"} {isTeamMode && (player.team ? `(${player.team} Takımı)` : "")}
                    </span>
                    <span className="font-mono font-bold text-white">{player.score} Puan</span>
                  </div>
                ))}
            </div>

            {/* Next Round Control (Admin or Asker) */}
            {(isMeAsker || isMeHost) ? (
              <div className="max-w-xs mx-auto pt-2 space-y-2">
                <button
                  onClick={handleNextRound}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-xs font-bold text-white shadow-lg transition-all cursor-pointer"
                >
                  Sonraki Soruya Geç (Turn Rotasyonu)
                </button>
              </div>
            ) : (
              <div className="text-center py-2 animate-pulse mt-2">
                <p className="text-xs font-semibold text-zinc-500">
                  Yöneticinin veya Soru Soran Kişinin yeni turu başlatması bekleniyor...
                </p>
              </div>
            )}

            {/* "Bir sonraki soruyu sen sor" button override */}
            {!isMeAsker && !isTeamMode && (
              <div className="max-w-xs mx-auto pt-1">
                <button
                  onClick={handleTakeNextTurn}
                  className="w-full py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-white rounded-xl text-[10px] font-bold text-zinc-400 transition-colors cursor-pointer"
                  title="Turn sırasını beklemeden sonraki soruyu kendin hazırlamak için bas!"
                >
                  ✍️ Bir sonraki soruyu sen sor (Özel Soru Yarat)
                </button>
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

export default KnowFriend;
