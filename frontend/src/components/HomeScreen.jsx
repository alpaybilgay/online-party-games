import React from "react";
import GameCard from "./GameCard";

function HomeScreen({ games, onGameSelect, onToast, toastMessage }) {
  return (
    <div className="relative min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans overflow-x-hidden">
      {/* Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-950/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-fuchsia-950/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-zinc-900/50 bg-[#09090b]/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center font-black text-xs text-white shadow-md">
              M
            </div>
            <span className="font-extrabold tracking-tight text-sm text-zinc-200">
              ALPAY
            </span>
          </div>
          
          <div className="flex items-center space-x-1.5 bg-emerald-500/5 border border-emerald-500/15 px-2.5 py-0.5 rounded-full">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
              Sunucu Aktif
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-grow max-w-6xl w-full mx-auto px-6 py-8 flex flex-col justify-center">
        
        {toastMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-violet-400 shadow-2xl flex items-center space-x-2 animate-bounce">
            <span>⚙️</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {games.map((game, index) => (
            <GameCard
              key={game.id}
              game={game}
              index={index}
              onClick={onGameSelect}
              onToast={onToast}
            />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900/50 bg-[#09090b]/30 py-4 text-center text-[10px] text-zinc-600">
        <p>© {new Date().getFullYear()} Alpay Bilgay kaydettttt.</p>
      </footer>
    </div>
  );
}

export default HomeScreen;
