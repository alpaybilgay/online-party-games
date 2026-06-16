const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOrigin = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim()) 
  : "*";

// Middleware
app.use(cors({
  origin: corsOrigin,
  methods: ["GET", "POST"]
}));
app.use(express.json());

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"]
  }
});

// Single Global Room Configuration
const GLOBAL_ROOM_CODE = "MAIN_ROOM";
const rooms = {};
const roomIntervals = {};

// Presets Questions Database for Kim Daha Yakın
const presetQuestions = {
  nufus: [
    { id: 1, category: "nufus", question: "Türkiye'nin nüfusu yaklaşık kaçtır?", answer: 85372377, unit: "kişi" },
    { id: 2, category: "nufus", question: "İstanbul'un nüfusu yaklaşık kaçtır?", answer: 15655924, unit: "kişi" },
    { id: 3, category: "nufus", question: "Dünyanın toplam nüfusu yaklaşık kaçtır?", answer: 8000000000, unit: "kişi" }
  ],
  yil: [
    { id: 4, category: "yil", question: "Cumhuriyet hangi yılda ilan edilmiştir?", answer: 1923, unit: "yılında" },
    { id: 5, category: "yil", question: "Wright Kardeşler ilk motorlu uçuşu hangi yılda gerçekleştirmiştir?", answer: 1903, unit: "yılında" },
    { id: 6, category: "yil", question: "Titanik gemisi hangi yılda batmıştır?", answer: 1912, unit: "yılında" }
  ],
  kilometre: [
    { id: 7, category: "kilometre", question: "Dünya ile Ay arasındaki mesafe yaklaşık kaç kilometredir?", answer: 384400, unit: "km" },
    { id: 8, category: "kilometre", question: "Ekvatorun toplam uzunluğu yaklaşık kaç kilometredir?", answer: 40075, unit: "km" },
    { id: 9, category: "kilometre", question: "Türkiye'nin en uzun nehri Kızılırmak'ın uzunluğu kaç kilometredir?", answer: 1355, unit: "km" }
  ],
  yas: [
    { id: 10, category: "yas", question: "Dünyanın en yaşlı ağacı Metuşelah çamının yaklaşık yaşı kaçtır?", answer: 4850, unit: "yaşında" },
    { id: 11, category: "yas", question: "Dünyanın bilinen en yaşlı insanı Jeanne Calment öldüğünde kaç yaşındaydı?", answer: 122, unit: "yaşında" },
    { id: 12, category: "yas", question: "Türkiye'de seçme ve seçilme hakkı elde etmek için gereken asgari yaş kaçtır?", answer: 18, unit: "yaşında" }
  ],
  rekor: [
    { id: 13, category: "rekor", question: "Usain Bolt'un 100 metre dünya rekoru süresi kaç salisedir?", answer: 958, unit: "salise (9.58 saniye)" },
    { id: 14, category: "rekor", question: "Dünyanın en yüksek binası Burj Khalifa'nın yüksekliği kaç metredir?", answer: 828, unit: "metre" },
    { id: 15, category: "rekor", question: "Serbest dalışta Şahika Ercümen'in tatlı sudaki dünya rekoru derinliği kaç metredir?", answer: 100, unit: "metre" }
  ],
  kpss_tarih: [
    { id: 16, category: "kpss_tarih", question: "Malazgirt Meydan Muharebesi hangi yılda yapılmıştır?", answer: 1071, unit: "yılında" },
    { id: 17, category: "kpss_tarih", question: "İstanbul'un Fethi hangi yılda gerçekleşmiştir?", answer: 1453, unit: "yılında" },
    { id: 18, category: "kpss_tarih", question: "Lozan Barış Antlaşması hangi yılda imzalanmıştır?", answer: 1923, unit: "yılında" }
  ],
  kpss_cografya: [
    { id: 19, category: "kpss_cografya", question: "Türkiye'nin coğrafi bölge sayısı kaçtır?", answer: 7, unit: "bölge" },
    { id: 20, category: "kpss_cografya", question: "Türkiye'nin en yüksek noktası Ağrı Dağı'nın yüksekliği kaç metredir?", answer: 5137, unit: "metre" },
    { id: 21, category: "kpss_cografya", question: "Türkiye'nin en büyük gölü olan Van Gölü'nün yüzölçümü yaklaşık kaç kilometrekaredir?", answer: 3713, unit: "km²" }
  ]
};

// Helper: Clear active room timer interval
function clearRoomTimer(roomCode) {
  if (roomIntervals[roomCode]) {
    clearInterval(roomIntervals[roomCode]);
    delete roomIntervals[roomCode];
  }
}

// Helper: Mark question/category as asked
function markQuestionAsAsked(room, gameName, questionId) {
  if (!room) return;
  if (!room.askedQuestionIds) {
    room.askedQuestionIds = {};
  }
  if (!room.askedQuestionIds[gameName]) {
    room.askedQuestionIds[gameName] = [];
  }
  if (questionId !== undefined && questionId !== null) {
    if (!room.askedQuestionIds[gameName].includes(questionId)) {
      room.askedQuestionIds[gameName].push(questionId);
    }
  }
}

// Socket Connections
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join Game (Automatically places player in the single global room)
  socket.on('join-game', ({ playerName, gameName }, callback) => {
    let room = rooms[GLOBAL_ROOM_CODE];

    if (!room) {
      // Create global room if not exists
      rooms[GLOBAL_ROOM_CODE] = {
        code: GLOBAL_ROOM_CODE,
        hostId: socket.id,
        activeGame: gameName || "Kelime Merdiveni",
        players: [
          { id: socket.id, name: playerName, score: 0, isHost: true, ready: false, list: [] }
        ],
        gameState: gameName === "Kim Daha İyi Tanıyor?"
          ? { status: "preparing", askerId: null, targetId: null, currentQuestion: null, targetAnswer: null, answers: {}, askerQueue: [] }
          : (gameName === "Hızlı Şık"
            ? { status: "preparing", category: "all", duration: 15, timer: 0, isTimerActive: false, currentQuestion: null, answers: {}, submissions: [] }
            : (gameName === "Ortak Cevabı Bul"
              ? { status: "preparing", duration: 15, timer: 0, isTimerActive: false, currentQuestion: null, answers: {}, teams: { A: [], B: [] }, teamScores: { A: 0, B: 0 } }
              : (gameName === "Bomba Kategori"
                ? { status: "preparing", category: "", durationRange: "15-50", secretDuration: 0, timer: 0, activePlayerId: null, loserId: null, turnOrder: [] }
                : (gameName === "Kim Daha Yakın" 
                  ? { status: "preparing", mode: "ready-made", category: "nufus", duration: 15, timer: 0, isTimerActive: false, currentQuestion: null, answers: {}, winnerId: null, results: [] }
                  : { status: "preparing", winnerId: null }))))
      };
      room = rooms[GLOBAL_ROOM_CODE];
      console.log(`Global Room Created by Host: ${playerName} (${socket.id}) for game ${room.activeGame}`);
    } else {
      // Room exists, check max limit based on selected game
      const maxLimit = room.activeGame === "Kim Daha İyi Tanıyor?" ? 10 : (room.activeGame === "Hızlı Şık" ? 8 : (room.activeGame === "Ortak Cevabı Bul" ? 4 : (room.activeGame === "Bomba Kategori" ? 12 : (room.activeGame === "Kim Daha Yakın" ? 8 : 2))));
      if (room.players.length >= maxLimit) {
        if (callback) callback({ success: false, message: `Oda dolu! Bu oyun maksimum ${maxLimit} oyuncu destekler.` });
        return;
      }

      // Check if already in
      const alreadyIn = room.players.some(p => p.id === socket.id);
      if (!alreadyIn) {
        const isHost = room.players.length === 0;
        const newPlayer = {
          id: socket.id,
          name: playerName,
          score: 0,
          isHost: isHost,
          ready: false,
          list: []
        };

        if (isHost) {
          room.hostId = socket.id;
        }

        room.players.push(newPlayer);
        console.log(`User ${playerName} (${socket.id}) joined global room.`);
      }
    }

    socket.join(GLOBAL_ROOM_CODE);
    
    if (callback) callback({ success: true, room: room });
    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  // Transfer Admin (Host Devretme)
  socket.on('transfer-admin', ({ targetPlayerId }) => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || room.hostId !== socket.id) return;

    const targetPlayer = room.players.find(p => p.id === targetPlayerId);
    if (targetPlayer) {
      room.hostId = targetPlayerId;
      // Reset isHost status flag
      room.players.forEach(p => {
        p.isHost = (p.id === targetPlayerId);
      });
      console.log(`Admin transferred to ${targetPlayer.name}`);

      // If active game is Kim Daha Yakın, reset status back to preparing to prevent stuck states
      if (room.activeGame === "Kim Daha Yakın" && room.gameState.status === "playing") {
        clearRoomTimer(GLOBAL_ROOM_CODE);
        room.gameState.status = "preparing";
        room.gameState.answers = {};
        room.gameState.winnerId = null;
        room.gameState.results = [];
        room.gameState.currentQuestion = null;
        room.gameState.isTimerActive = false;
      }

      io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
    }
  });

  // ==========================================
  // KELİME MERDİVENİ GAME EVENTS
  // ==========================================

  // Kelime Merdiveni: Player Ready & Submit List
  socket.on('kelime-merdiveni-ready', ({ wordList }, callback) => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room) {
      if (callback) callback({ success: false, message: "Oda bulunamadı." });
      return;
    }

    const player = room.players.find(p => p.id === socket.id);
    if (!player) {
      if (callback) callback({ success: false, message: "Oyuncu odada bulunamadı." });
      return;
    }

    player.list = Array.isArray(wordList) ? wordList.slice(0, 10) : [];
    player.ready = true;

    const allReady = room.players.length === 2 && room.players.every(p => p.ready);
    if (allReady) {
      room.gameState.status = "playing";
      room.gameState.winnerId = null;
    }

    if (callback) callback({ success: true });
    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  // Kelime Merdiveni: Award Point to Winner (manual scoring)
  socket.on('kelime-merdiveni-award-point', ({ winnerId }) => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || room.hostId !== socket.id) return;

    const winningPlayer = room.players.find(p => p.id === winnerId);
    if (winningPlayer) {
      winningPlayer.score += 1;
      room.gameState.winnerId = winnerId;
      room.gameState.status = "result";
      io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
    }
  });

  // Kelime Merdiveni: Reset for New Round
  socket.on('kelime-merdiveni-new-round', () => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || room.hostId !== socket.id) return;

    room.players.forEach(p => {
      p.ready = false;
      p.list = [];
    });

    room.gameState = {
      status: "preparing",
      winnerId: null
    };

    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  // ==========================================
  // KİM DAHA YAKIN GAME EVENTS
  // ==========================================

  // Start Preset Question Mode
  socket.on('kim-daha-yakin-start-preset', ({ category, duration, question }) => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || room.hostId !== socket.id) return;

    let selectedQuestion = question;
    if (!selectedQuestion) {
      let questions;
      if (category === "hepsi") {
        questions = [
          ...(presetQuestions.nufus || []),
          ...(presetQuestions.yil || []),
          ...(presetQuestions.kilometre || []),
          ...(presetQuestions.yas || []),
          ...(presetQuestions.rekor || [])
        ];
      } else if (category === "kpss_hepsi") {
        questions = [
          ...(presetQuestions.kpss_tarih || []),
          ...(presetQuestions.kpss_cografya || [])
        ];
      } else {
        questions = presetQuestions[category] || presetQuestions.nufus;
      }
      selectedQuestion = questions[Math.floor(Math.random() * questions.length)];
    }

    markQuestionAsAsked(room, "Kim Daha Yakın", selectedQuestion?.id);

    room.gameState = {
      status: "playing",
      mode: "ready-made",
      category: category,
      duration: duration,
      timer: duration,
      isTimerActive: true,
      currentQuestion: selectedQuestion,
      answers: {},
      winnerId: null,
      results: []
    };

    startKimDahaYakinTimer(GLOBAL_ROOM_CODE);
    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  // Start Custom Question Mode
  socket.on('kim-daha-yakin-start-custom', ({ question, answer, unit, duration }) => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || room.hostId !== socket.id) return;

    room.gameState = {
      status: "playing",
      mode: "custom",
      duration: duration,
      timer: duration,
      isTimerActive: true,
      currentQuestion: {
        question: question.trim(),
        answer: Number(answer),
        unit: unit.trim()
      },
      answers: {},
      winnerId: null,
      results: []
    };

    startKimDahaYakinTimer(GLOBAL_ROOM_CODE);
    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  // Submit Guess Estimate
  socket.on('kim-daha-yakin-submit-guess', ({ guess }, callback) => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || room.gameState.status !== "playing") {
      if (callback) callback({ success: false, message: "Aktif soru bulunamadı veya süre doldu." });
      return;
    }

    const value = Number(guess);
    if (isNaN(value)) {
      if (callback) callback({ success: false, message: "Geçersiz tahmin değeri!" });
      return;
    }

    room.gameState.answers[socket.id] = value;
    if (callback) callback({ success: true });

    // Check if everyone has submitted to end early
    let eligiblePlayers = room.players;
    if (room.gameState.mode === "custom") {
      // In custom mode, host is excluded from guessing
      eligiblePlayers = room.players.filter(p => p.id !== room.hostId);
    }

    const allSubmitted = eligiblePlayers.every(p => room.gameState.answers[p.id] !== undefined);
    if (allSubmitted && eligiblePlayers.length > 0) {
      calculateKimDahaYakinWinner(GLOBAL_ROOM_CODE);
    } else {
      io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
    }
  });

  // Next Round Setup
  socket.on('kim-daha-yakin-next-round', () => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || room.hostId !== socket.id) return;

    clearRoomTimer(GLOBAL_ROOM_CODE);
    room.gameState = {
      status: "preparing",
      mode: room.gameState.mode,
      category: room.gameState.category || "nufus",
      duration: room.gameState.duration || 15,
      timer: 0,
      isTimerActive: false,
      currentQuestion: null,
      answers: {},
      winnerId: null,
      results: []
    };

    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  // ==========================================
  // BOMBA KATEGORİ GAME EVENTS
  // ==========================================

  socket.on('bomba-kategori-update-settings', ({ category, durationRange, pool }) => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || room.hostId !== socket.id) return;

    room.gameState.category = category;
    room.gameState.durationRange = durationRange;
    room.gameState.pool = pool || "genel";

    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  socket.on('bomba-kategori-start', ({ category, durationRange, pool }) => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || room.hostId !== socket.id) return;

    markQuestionAsAsked(room, "Bomba Kategori", category);

    let min = 15, max = 50;
    if (durationRange === "5-50") { min = 5; max = 50; }
    else if (durationRange === "20-60") { min = 20; max = 60; }
    
    const secretDuration = Math.floor(Math.random() * (max - min + 1)) + min;

    const playersList = room.players;
    if (playersList.length === 0) return;

    room.gameState = {
      status: "countdown",
      category: category,
      durationRange: durationRange,
      pool: pool || "genel",
      secretDuration: secretDuration,
      timer: 3,
      loserId: null
    };

    startBombaKategoriTimer(GLOBAL_ROOM_CODE);
    io.to(GLOBAL_ROOM_CODE).emit('room-updated', getMaskedRoom(room));
  });

  socket.on('bomba-kategori-set-loser', ({ loserId }) => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || room.hostId !== socket.id || room.activeGame !== "Bomba Kategori" || !room.gameState) return;

    const gameState = room.gameState;
    gameState.loserId = loserId;

    const loser = room.players.find(p => p.id === loserId);
    if (loser) {
      loser.score = Math.max(0, loser.score - 1);
    }

    room.players.forEach(p => {
      if (p.id !== loserId) {
        p.score += 1;
      }
    });

    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  socket.on('bomba-kategori-new-round', () => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || room.hostId !== socket.id) return;

    clearRoomTimer(GLOBAL_ROOM_CODE);
    room.gameState = {
      status: "preparing",
      category: room.gameState.category || "",
      durationRange: room.gameState.durationRange || "15-50",
      pool: room.gameState.pool || "genel",
      secretDuration: 0,
      timer: 0,
      loserId: null
    };

    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  // ==========================================
  // ORTAK CEVABI BUL GAME EVENTS
  // ==========================================

  socket.on('common-answer-update-settings', ({ duration }) => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || room.hostId !== socket.id) return;

    room.gameState.duration = duration;
    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  socket.on('common-answer-set-teams', ({ teams }) => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || room.hostId !== socket.id) return;

    room.gameState.teams = teams;
    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  socket.on('common-answer-start-question', ({ question }) => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || room.hostId !== socket.id) return;

    markQuestionAsAsked(room, "Ortak Cevabı Bul", question?.id);

    room.gameState.status = "playing";
    room.gameState.currentQuestion = question;
    room.gameState.answers = {};
    room.gameState.timer = room.gameState.duration;
    room.gameState.isTimerActive = true;

    startCommonAnswerTimer(GLOBAL_ROOM_CODE);
    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  socket.on('common-answer-submit-choice', ({ choice }, callback) => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || !room.gameState || room.gameState.status !== "playing") {
      if (callback) callback({ success: false, message: "Oyun aktif değil." });
      return;
    }

    room.gameState.answers[socket.id] = choice;
    if (callback) callback({ success: true });

    // Check if everyone has submitted to end early
    const totalPlayers = room.players.length;
    const answeredCount = Object.keys(room.gameState.answers).length;

    if (answeredCount >= totalPlayers) {
      calculateCommonAnswerResults(GLOBAL_ROOM_CODE);
    } else {
      io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
    }
  });

  socket.on('common-answer-next-round', () => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || room.hostId !== socket.id) return;

    clearRoomTimer(GLOBAL_ROOM_CODE);
    room.gameState.status = "preparing";
    room.gameState.currentQuestion = null;
    room.gameState.answers = {};
    room.gameState.isTimerActive = false;

    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  // ==========================================
  // HIZLI ŞIK GAME EVENTS
  // ==========================================

  socket.on('quick-choice-update-settings', ({ category, duration }) => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || room.hostId !== socket.id) return;

    room.gameState.category = category;
    room.gameState.duration = duration;
    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  socket.on('quick-choice-start-question', ({ question }) => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || room.hostId !== socket.id) return;

    markQuestionAsAsked(room, "Hızlı Şık", question?.id);

    room.gameState.status = "playing";
    room.gameState.currentQuestion = question;
    room.gameState.answers = {};
    room.gameState.submissions = [];
    room.gameState.timer = room.gameState.duration;
    room.gameState.isTimerActive = true;

    startQuickChoiceTimer(GLOBAL_ROOM_CODE);
    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  socket.on('quick-choice-submit-choice', ({ choice }, callback) => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || !room.gameState || room.gameState.status !== "playing") {
      if (callback) callback({ success: false, message: "Oyun aktif değil." });
      return;
    }

    room.gameState.answers[socket.id] = choice;
    room.gameState.submissions.push({
      playerId: socket.id,
      choice: choice,
      timestamp: Date.now()
    });
    
    if (callback) callback({ success: true });

    // Check if everyone has submitted to end early
    const totalPlayers = room.players.length;
    const answeredCount = Object.keys(room.gameState.answers).length;

    if (answeredCount >= totalPlayers) {
      calculateQuickChoiceResults(GLOBAL_ROOM_CODE);
    } else {
      io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
    }
  });

  socket.on('quick-choice-next-round', () => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || room.hostId !== socket.id) return;

    clearRoomTimer(GLOBAL_ROOM_CODE);
    room.gameState.status = "preparing";
    room.gameState.currentQuestion = null;
    room.gameState.answers = {};
    room.gameState.submissions = [];
    room.gameState.isTimerActive = false;

    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  // ==========================================
  // KIM DAHA İYİ TANIYOR? GAME EVENTS
  // ==========================================

  socket.on('know-friend-start-game', ({ mode, teams } = {}) => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || room.hostId !== socket.id) return;

    const playersList = room.players;
    const selectedMode = mode || "ffa";

    if (selectedMode === "team") {
      if (playersList.length !== 4) return;
    } else {
      if (playersList.length < 2) return;
    }

    if (selectedMode === "team" && teams) {
      room.players.forEach(p => {
        if (teams.A && teams.A.includes(p.id)) {
          p.team = "A";
        } else if (teams.B && teams.B.includes(p.id)) {
          p.team = "B";
        } else {
          p.team = null;
        }
      });
    } else {
      room.players.forEach(p => { p.team = null; });
    }

    room.gameState = {
      status: "selecting_target",
      mode: selectedMode,
      teams: selectedMode === "team" ? teams : null,
      teamScores: selectedMode === "team" ? { A: 0, B: 0 } : null,
      askerId: playersList[0].id,
      targetId: null,
      currentQuestion: null,
      targetAnswer: null,
      answers: {},
      askerQueue: playersList.map(p => p.id)
    };

    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  socket.on('know-friend-select-target', ({ targetId, question }) => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || !room.gameState || room.gameState.askerId !== socket.id) return;

    markQuestionAsAsked(room, "Kim Daha İyi Tanıyor?", question?.id);

    const gameState = room.gameState;
    gameState.currentQuestion = question;
    gameState.answers = {};
    gameState.status = "playing";

    if (gameState.mode === "team") {
      const askerAId = socket.id;
      const askerAPlayer = room.players.find(p => p.id === askerAId);
      const teamAName = askerAPlayer ? askerAPlayer.team : "A";
      const teamBName = teamAName === "A" ? "B" : "A";

      const teamAPlayers = room.players.filter(p => p.team === teamAName);
      const teamBPlayers = room.players.filter(p => p.team === teamBName);

      const targetAPlayer = teamAPlayers.find(p => p.id !== askerAId);
      const targetAId = targetAPlayer ? targetAPlayer.id : null;

      const randomTargetBPlayer = teamBPlayers[Math.floor(Math.random() * teamBPlayers.length)];
      const targetBId = randomTargetBPlayer ? randomTargetBPlayer.id : null;

      const askerBPlayer = teamBPlayers.find(p => p.id !== targetBId);
      const askerBId = askerBPlayer ? askerBPlayer.id : null;

      gameState.askerAId = askerAId;
      gameState.targetAId = targetAId;
      gameState.askerBId = askerBId;
      gameState.targetBId = targetBId;

      gameState.targetAAnswer = null;
      gameState.targetBAnswer = null;
      gameState.verifications = {};
    } else {
      gameState.targetId = targetId;
      gameState.targetAnswer = null;
      gameState.verifications = {};
    }

    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  socket.on('know-friend-submit-choice', ({ choice }, callback) => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || !room.gameState || room.gameState.status !== "playing") {
      if (callback) callback({ success: false, message: "Oyun aktif değil." });
      return;
    }

    const gameState = room.gameState;
    gameState.answers[socket.id] = choice;

    if (callback) callback({ success: true });

    const isQuestionOpenEnded = !gameState.currentQuestion.options || gameState.currentQuestion.options.length === 0 || gameState.currentQuestion.options.every(o => !o);

    if (gameState.mode === "team") {
      const requiredIds = [gameState.askerAId, gameState.targetAId, gameState.askerBId, gameState.targetBId].filter(id => id);
      const allSubmitted = requiredIds.every(id => gameState.answers[id] !== undefined);

      if (allSubmitted) {
        if (!isQuestionOpenEnded) {
          const guessA = gameState.answers[gameState.askerAId];
          const ansA = gameState.answers[gameState.targetAId];
          const guessB = gameState.answers[gameState.askerBId];
          const ansB = gameState.answers[gameState.targetBId];

          if (guessA === ansA && guessA !== undefined) {
            const askerAPlayer = room.players.find(p => p.id === gameState.askerAId);
            const targetAPlayer = room.players.find(p => p.id === gameState.targetAId);
            if (askerAPlayer) askerAPlayer.score += 1;
            if (targetAPlayer) targetAPlayer.score += 1;
            gameState.teamScores[askerAPlayer ? askerAPlayer.team : "A"] += 1;
          }
          if (guessB === ansB && guessB !== undefined) {
            const askerBPlayer = room.players.find(p => p.id === gameState.askerBId);
            const targetBPlayer = room.players.find(p => p.id === gameState.targetBId);
            if (askerBPlayer) askerBPlayer.score += 1;
            if (targetBPlayer) targetBPlayer.score += 1;
            gameState.teamScores[askerBPlayer ? askerBPlayer.team : "B"] += 1;
          }
          gameState.status = "result";
        } else {
          gameState.status = "evaluating";
        }
      }
    } else {
      const allSubmitted = room.players.every(p => gameState.answers[p.id] !== undefined);

      if (allSubmitted) {
        if (!isQuestionOpenEnded) {
          const targetAnswer = gameState.answers[gameState.targetId];
          gameState.targetAnswer = targetAnswer;

          const guessers = room.players.filter(p => p.id !== gameState.targetId);
          guessers.forEach(g => {
            if (gameState.answers[g.id] === targetAnswer) {
              g.score += 1;
            }
          });
          gameState.status = "result";
        } else {
          gameState.targetAnswer = gameState.answers[gameState.targetId];
          gameState.status = "evaluating";
        }
      }
    }

    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  socket.on('know-friend-verify-answer', ({ winners, correct }, callback) => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || !room.gameState || room.gameState.status !== "evaluating") {
      if (callback) callback({ success: false, message: "Değerlendirme yapılamaz." });
      return;
    }

    const gameState = room.gameState;

    if (callback) callback({ success: true });

    if (gameState.mode === "team") {
      if (!gameState.verifications) {
        gameState.verifications = {};
      }
      gameState.verifications[socket.id] = correct;

      if (correct) {
        if (socket.id === gameState.targetAId) {
          const askerAPlayer = room.players.find(p => p.id === gameState.askerAId);
          const targetAPlayer = room.players.find(p => p.id === gameState.targetAId);
          if (askerAPlayer) askerAPlayer.score += 1;
          if (targetAPlayer) targetAPlayer.score += 1;
          gameState.teamScores[askerAPlayer ? askerAPlayer.team : "A"] += 1;
        } else if (socket.id === gameState.targetBId) {
          const askerBPlayer = room.players.find(p => p.id === gameState.askerBId);
          const targetBPlayer = room.players.find(p => p.id === gameState.targetBId);
          if (askerBPlayer) askerBPlayer.score += 1;
          if (targetBPlayer) targetBPlayer.score += 1;
          gameState.teamScores[askerBPlayer ? askerBPlayer.team : "B"] += 1;
        }
      }

      const requiredTargets = [gameState.targetAId, gameState.targetBId].filter(id => id);
      const allVerified = requiredTargets.every(id => gameState.verifications[id] !== undefined);

      if (allVerified) {
        gameState.status = "result";
      }
    } else {
      if (socket.id === gameState.targetId) {
        if (Array.isArray(winners)) {
          winners.forEach(wId => {
            const player = room.players.find(p => p.id === wId);
            if (player) {
              player.score += 1;
            }
          });
          gameState.winners = winners;
        }
        gameState.status = "result";
      }
    }

    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  socket.on('know-friend-next-round', () => {
    const room = rooms[GLOBAL_ROOM_CODE];
    if (!room || !room.gameState) return;

    if (socket.id !== room.gameState.askerId && socket.id !== room.hostId) return;

    const gameState = room.gameState;
    const currentQueue = gameState.askerQueue || [];
    const currentIndex = currentQueue.indexOf(gameState.askerId);
    
    if (currentIndex !== -1 && currentQueue.length > 0) {
      const nextIndex = (currentIndex + 1) % currentQueue.length;
      gameState.askerId = currentQueue[nextIndex];
    }

    gameState.status = "selecting_target";
    gameState.targetId = null;
    gameState.targetAnswer = null;
    gameState.answers = {};
    gameState.currentQuestion = null;
    gameState.askerAId = null;
    gameState.targetAId = null;
    gameState.askerBId = null;
    gameState.targetBId = null;
    gameState.verifications = {};
    gameState.winners = null;

    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  });

  // Leave Room / Back to Lobby
  socket.on('leave-room', () => {
    handleUserLeaving(socket);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    handleUserLeaving(socket);
  });
});

// Helper: Handle user leaving
function handleUserLeaving(socket) {
  const room = rooms[GLOBAL_ROOM_CODE];
  if (!room) return;

  const isPlayer = room.players.some(p => p.id === socket.id);
  if (!isPlayer) return;

  socket.leave(GLOBAL_ROOM_CODE);
  room.players = room.players.filter(p => p.id !== socket.id);
  console.log(`User ${socket.id} left the global room.`);

  if (room.players.length === 0) {
    clearRoomTimer(GLOBAL_ROOM_CODE);
    delete rooms[GLOBAL_ROOM_CODE];
    console.log(`Global room deleted because it is empty.`);
  } else {
    // If Host left, assign new host
    if (room.hostId === socket.id) {
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
      console.log(`Global room host reassigned to ${room.players[0].name}`);
    }
    
    // Reset game state
    clearRoomTimer(GLOBAL_ROOM_CODE);
    if (room.activeGame === "Kim Daha İyi Tanıyor?") {
      room.gameState = {
        status: "preparing",
        askerId: null,
        targetId: null,
        currentQuestion: null,
        targetAnswer: null,
        answers: {},
        askerQueue: []
      };
    } else if (room.activeGame === "Hızlı Şık") {
      room.gameState = {
        status: "preparing",
        category: "all",
        duration: 15,
        timer: 0,
        isTimerActive: false,
        currentQuestion: null,
        answers: {},
        submissions: []
      };
    } else if (room.activeGame === "Ortak Cevabı Bul") {
      room.gameState = {
        status: "preparing",
        duration: 15,
        timer: 0,
        isTimerActive: false,
        currentQuestion: null,
        answers: {},
        teams: { A: [], B: [] },
        teamScores: { A: 0, B: 0 }
      };
    } else if (room.activeGame === "Bomba Kategori") {
      room.gameState = {
        status: "preparing",
        category: "",
        durationRange: "15-50",
        secretDuration: 0,
        timer: 0,
        activePlayerId: null,
        loserId: null,
        turnOrder: []
      };
    } else if (room.activeGame === "Kim Daha Yakın") {
      room.gameState = {
        status: "preparing",
        mode: "ready-made",
        category: "nufus",
        duration: 15,
        timer: 0,
        isTimerActive: false,
        currentQuestion: null,
        answers: {},
        winnerId: null,
        results: []
      };
    } else {
      room.gameState = {
        status: "preparing",
        winnerId: null
      };
      room.players.forEach(p => {
        p.ready = false;
        p.list = [];
      });
    }

    io.to(GLOBAL_ROOM_CODE).emit('room-updated', room);
  }
}

// Helper: Start Kim Daha Yakın timer countdown
function startKimDahaYakinTimer(roomCode) {
  clearRoomTimer(roomCode);

  roomIntervals[roomCode] = setInterval(() => {
    const room = rooms[roomCode];
    if (!room || room.activeGame !== "Kim Daha Yakın" || !room.gameState || !room.gameState.isTimerActive) {
      clearRoomTimer(roomCode);
      return;
    }

    room.gameState.timer--;

    if (room.gameState.timer <= 0) {
      calculateKimDahaYakinWinner(roomCode);
    } else {
      io.to(roomCode).emit('room-updated', room);
    }
  }, 1000);
}

// Helper: Calculate the player closest to the correct answer
function calculateKimDahaYakinWinner(roomCode) {
  clearRoomTimer(roomCode);
  const room = rooms[roomCode];
  if (!room || !room.gameState) return;

  const gameState = room.gameState;
  gameState.isTimerActive = false;

  const answers = gameState.answers || {};
  const correctAnswer = gameState.currentQuestion.answer;

  const resultList = Object.entries(answers).map(([playerId, guess]) => {
    const player = room.players.find(p => p.id === playerId);
    const difference = Math.abs(guess - correctAnswer);
    return {
      playerId,
      playerName: player ? player.name : "Bilinmeyen",
      guess,
      difference
    };
  });

  // Sort by difference ascending (closest guess on top)
  resultList.sort((a, b) => a.difference - b.difference);

  if (resultList.length > 0) {
    // The winner is the first element
    const winnerId = resultList[0].playerId;
    const winningPlayer = room.players.find(p => p.id === winnerId);
    if (winningPlayer) {
      winningPlayer.score += 1;
    }
    gameState.winnerId = winnerId;
  } else {
    gameState.winnerId = null;
  }

  gameState.results = resultList;
  gameState.status = "result";

  io.to(roomCode).emit('room-updated', room);
}

// Helper: Start Bomba Kategori timer countdown
function startBombaKategoriTimer(roomCode) {
  clearRoomTimer(roomCode);

  roomIntervals[roomCode] = setInterval(() => {
    const room = rooms[roomCode];
    if (!room || room.activeGame !== "Bomba Kategori" || !room.gameState) {
      clearRoomTimer(roomCode);
      return;
    }

    const gameState = room.gameState;

    if (gameState.status === "countdown") {
      gameState.timer--;
      if (gameState.timer <= 0) {
        gameState.status = "playing";
        gameState.timer = gameState.secretDuration;
      }
      io.to(roomCode).emit('room-updated', getMaskedRoom(room));
    } else if (gameState.status === "playing") {
      gameState.timer--;
      if (gameState.timer <= 0) {
        clearRoomTimer(roomCode);
        gameState.status = "result";
        gameState.loserId = null;

        io.to(roomCode).emit('room-updated', room);
      } else {
        io.to(roomCode).emit('room-updated', getMaskedRoom(room));
      }
    }
  }, 1000);
}

// Helper: Mask timer and secret duration for Bomba Kategori clients to prevent cheating
function getMaskedRoom(room) {
  if (!room) return null;
  if (room.activeGame !== "Bomba Kategori" || !room.gameState) return room;
  if (room.gameState.status !== "playing") return room;

  return {
    ...room,
    gameState: {
      ...room.gameState,
      timer: -1,
      secretDuration: -1
    }
  };
}

// Helper: Start Ortak Cevabı Bul timer countdown
function startCommonAnswerTimer(roomCode) {
  clearRoomTimer(roomCode);

  roomIntervals[roomCode] = setInterval(() => {
    const room = rooms[roomCode];
    if (!room || room.activeGame !== "Ortak Cevabı Bul" || !room.gameState || !room.gameState.isTimerActive) {
      clearRoomTimer(roomCode);
      return;
    }

    const gameState = room.gameState;
    gameState.timer--;

    if (gameState.timer <= 0) {
      calculateCommonAnswerResults(roomCode);
    } else {
      io.to(roomCode).emit('room-updated', room);
    }
  }, 1000);
}

// Helper: Calculate results for Ortak Cevabı Bul
function calculateCommonAnswerResults(roomCode) {
  clearRoomTimer(roomCode);
  const room = rooms[roomCode];
  if (!room || !room.gameState) return;

  const gameState = room.gameState;
  gameState.isTimerActive = false;
  gameState.status = "result";

  const players = room.players;
  const answers = gameState.answers || {};

  if (players.length === 2) {
    const p1 = players[0];
    const p2 = players[1];
    const a1 = answers[p1.id];
    const a2 = answers[p2.id];

    if (a1 !== undefined && a2 !== undefined && a1 === a2) {
      p1.score += 1;
      p2.score += 1;
    }
  } else if (players.length === 4) {
    const teamA = gameState.teams?.A || [];
    const teamB = gameState.teams?.B || [];

    if (teamA.length === 2) {
      const p1 = teamA[0];
      const p2 = teamA[1];
      const a1 = answers[p1];
      const a2 = answers[p2];
      if (a1 !== undefined && a2 !== undefined && a1 === a2) {
        gameState.teamScores.A += 1;
      }
    }

    if (teamB.length === 2) {
      const p1 = teamB[0];
      const p2 = teamB[1];
      const a1 = answers[p1];
      const a2 = answers[p2];
      if (a1 !== undefined && a2 !== undefined && a1 === a2) {
        gameState.teamScores.B += 1;
      }
    }
  }

  io.to(roomCode).emit('room-updated', room);
}

// Helper: Start Hızlı Şık timer countdown
function startQuickChoiceTimer(roomCode) {
  clearRoomTimer(roomCode);

  roomIntervals[roomCode] = setInterval(() => {
    const room = rooms[roomCode];
    if (!room || room.activeGame !== "Hızlı Şık" || !room.gameState || !room.gameState.isTimerActive) {
      clearRoomTimer(roomCode);
      return;
    }

    const gameState = room.gameState;
    gameState.timer--;

    if (gameState.timer <= 0) {
      calculateQuickChoiceResults(roomCode);
    } else {
      io.to(roomCode).emit('room-updated', room);
    }
  }, 1000);
}

// Helper: Calculate results for Hızlı Şık
function calculateQuickChoiceResults(roomCode) {
  clearRoomTimer(roomCode);
  const room = rooms[roomCode];
  if (!room || !room.gameState) return;

  const gameState = room.gameState;
  gameState.isTimerActive = false;
  gameState.status = "result";

  const correctAnswer = gameState.currentQuestion?.correctAnswer;
  const submissions = gameState.submissions || [];

  const correctSubmissions = submissions.filter(sub => sub.choice === correctAnswer);

  correctSubmissions.forEach((sub, index) => {
    const player = room.players.find(p => p.id === sub.playerId);
    if (player) {
      let pointsAwarded = 1;
      if (index === 0) {
        pointsAwarded = 3;
      } else if (index === 1) {
        pointsAwarded = 2;
      }
      player.score += pointsAwarded;
      sub.pointsAwarded = pointsAwarded;
    }
  });

  submissions.forEach(sub => {
    if (sub.choice !== correctAnswer) {
      sub.pointsAwarded = 0;
    }
  });

  io.to(roomCode).emit('room-updated', room);
}

// Start Server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
