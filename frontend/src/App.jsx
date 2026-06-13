import React, { useState, useEffect } from "react";
import { socket, SERVER_URL } from "./socket/socket";
import ServerWakeScreen from "./components/ServerWakeScreen";
import HomeScreen from "./components/HomeScreen";
import WordLadder from "./games/WordLadder/WordLadder";
import ClosestGuess from "./games/ClosestGuess/ClosestGuess";
import BombCategory from "./games/BombCategory/BombCategory";
import CommonAnswer from "./games/CommonAnswer/CommonAnswer";
import QuickChoice from "./games/QuickChoice/QuickChoice";
import KnowFriend from "./games/KnowFriend/KnowFriend";

function App() {
  const [serverStatus, setServerStatus] = useState("connecting"); // 'connecting' | 'online'
  const [errorCount, setErrorCount] = useState(0);
  const [toastMessage, setToastMessage] = useState("");

  // Global socket & room states
  const [room, setRoom] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [isInRoom, setIsInRoom] = useState(false);
  const [activeError, setActiveError] = useState("");

  // Game Selection Flow State
  const [activeGameFlow, setActiveGameFlow] = useState(null); // null | "Kelime Merdiveni" | "Kim Daha Yakın"

  // Check backend server status every 2 seconds
  useEffect(() => {
    let intervalId;

    const checkHealth = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/health`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === "ok") {
            setServerStatus("online");
            clearInterval(intervalId);
          }
        } else {
          setErrorCount((prev) => prev + 1);
        }
      } catch (error) {
        setErrorCount((prev) => prev + 1);
      }
    };

    checkHealth();
    intervalId = setInterval(checkHealth, 2000);

    return () => clearInterval(intervalId);
  }, []);

  // Initialize Socket Connection when server is online
  useEffect(() => {
    if (serverStatus === "online") {
      socket.connect();

      const onRoomUpdated = (updatedRoom) => {
        setRoom(updatedRoom);
        setIsInRoom(true);
      };

      const onConnectError = () => {
        console.log("Socket connection error");
      };

      socket.on("room-updated", onRoomUpdated);
      socket.on("connect_error", onConnectError);

      return () => {
        socket.off("room-updated", onRoomUpdated);
        socket.off("connect_error", onConnectError);
        socket.disconnect();
      };
    }
  }, [serverStatus]);

  // Show toast helper
  const showToast = (message) => {
    setToastMessage(message);
    const timer = setTimeout(() => {
      setToastMessage("");
    }, 2500);
    return () => clearTimeout(timer);
  };

  // Lobby leaving
  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit("leave-room");
      setRoom(null);
      setIsInRoom(false);
      setActiveGameFlow(null); // Back to homepage
      setActiveError("");
    }
  };

  // Join Game (unified for both games)
  const handleJoinGame = (gameName) => {
    if (!playerName.trim()) {
      setActiveError("Lütfen adınızı girin.");
      return;
    }
    setActiveError("");

    socket.emit("join-game", { playerName: playerName.trim(), gameName }, (response) => {
      if (response.success) {
        setRoom(response.room);
        setIsInRoom(true);
      } else {
        setActiveError(response.message || "Oyuna giriş yapılamadı.");
      }
    });
  };

  const games = [
    { id: 1, name: "Kelime Merdiveni", category: "2 Kişilik • Canlı Sıralı", icon: "🪜", active: true, desc: "Oyuncular kendi kelime listelerini hazırlar, canlı yarışırlar." },
    { id: 2, name: "Kim Daha Yakın", category: "Grup Oyunu • Sayı Tahmini", icon: "🎯", active: true, desc: "Sayısal sorulara en yakın tahmini veren kazanır. Süreli ve iki modlu." },
    { id: 3, name: "Bomba Kategori", category: "Grup Oyunu • Gizli Süre", icon: "💥", active: true, desc: "Kategoriye sırayla cevap verin. Süre bitince bomba kimin elindeyse elenir!" },
    { id: 4, name: "Ortak Cevabı Bul", category: "Grup Oyunu • Aynı Seçim", icon: "🤝", active: true, desc: "Aynı sorularda eşleşen cevapları seçin. Arkadaşınızla ortak karara varın!" },
    { id: 5, name: "Hızlı Şık", category: "Grup Oyunu • Hızlı Cevap", icon: "⚡", active: true, desc: "Sorunun doğru cevabını en hızlı bilen en çok puanı alır!" },
    { id: 6, name: "Kim Daha İyi Tanıyor?", category: "Grup Oyunu • Arkadaşlık", icon: "🧩", active: true, desc: "Bir arkadaşınızın sorulara vereceği cevabı tahmin edin. En iyi tanıyan kazansın!" },
    { id: 7, name: "Oyun 7", category: "Yakında", icon: "🔮", active: false, desc: "Yeni parti oyunu yakında eklenecek." },
    { id: 8, name: "Oyun 8", category: "Yakında", icon: "🃏", active: false, desc: "Yeni parti oyunu yakında eklenecek." },
    { id: 9, name: "Oyun 9", category: "Yakında", icon: "🎭", active: false, desc: "Yeni parti oyunu yakında eklenecek." },
    { id: 10, name: "Oyun 10", category: "Yakında", icon: "🎯", active: false, desc: "Yeni parti oyunu yakında eklenecek." },
    { id: 11, name: "Oyun 11", category: "Yakında", icon: "💡", active: false, desc: "Yeni parti oyunu yakında eklenecek." },
    { id: 12, name: "Oyun 12", category: "Yakında", icon: "💥", active: false, desc: "Yeni parti oyunu yakında eklenecek." }
  ];

  if (serverStatus === "connecting") {
    return <ServerWakeScreen errorCount={errorCount} />;
  }

  if (activeGameFlow === "Kelime Merdiveni") {
    return (
      <WordLadder
        room={room}
        isInRoom={isInRoom}
        playerName={playerName}
        setPlayerName={setPlayerName}
        onLeave={handleLeaveRoom}
        activeError={activeError}
        setActiveError={setActiveError}
        handleJoinGame={handleJoinGame}
      />
    );
  }

  if (activeGameFlow === "Bomba Kategori") {
    return (
      <BombCategory
        room={room}
        isInRoom={isInRoom}
        playerName={playerName}
        setPlayerName={setPlayerName}
        onLeave={handleLeaveRoom}
        activeError={activeError}
        setActiveError={setActiveError}
        handleJoinGame={handleJoinGame}
      />
    );
  }

  if (activeGameFlow === "Ortak Cevabı Bul") {
    return (
      <CommonAnswer
        room={room}
        isInRoom={isInRoom}
        playerName={playerName}
        setPlayerName={setPlayerName}
        onLeave={handleLeaveRoom}
        activeError={activeError}
        setActiveError={setActiveError}
        handleJoinGame={handleJoinGame}
      />
    );
  }

  if (activeGameFlow === "Hızlı Şık") {
    return (
      <QuickChoice
        room={room}
        isInRoom={isInRoom}
        playerName={playerName}
        setPlayerName={setPlayerName}
        onLeave={handleLeaveRoom}
        activeError={activeError}
        setActiveError={setActiveError}
        handleJoinGame={handleJoinGame}
      />
    );
  }

  if (activeGameFlow === "Kim Daha İyi Tanıyor?") {
    return (
      <KnowFriend
        room={room}
        isInRoom={isInRoom}
        playerName={playerName}
        setPlayerName={setPlayerName}
        onLeave={handleLeaveRoom}
        activeError={activeError}
        setActiveError={setActiveError}
        handleJoinGame={handleJoinGame}
      />
    );
  }

  if (activeGameFlow === "Kim Daha Yakın") {
    return (
      <ClosestGuess
        room={room}
        isInRoom={isInRoom}
        playerName={playerName}
        setPlayerName={setPlayerName}
        onLeave={handleLeaveRoom}
        activeError={activeError}
        setActiveError={setActiveError}
        handleJoinGame={handleJoinGame}
      />
    );
  }

  return (
    <HomeScreen
      games={games}
      onGameSelect={setActiveGameFlow}
      onToast={showToast}
      toastMessage={toastMessage}
    />
  );
}

export default App;