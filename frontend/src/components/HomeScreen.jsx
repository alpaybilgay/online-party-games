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

        {/* Featured KPSS Games */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {(() => {
            const kpssGame = games.find(g => g.name === "KPSS GÜNCEL");
            if (!kpssGame) return null;
            return (
              <div
                onClick={() => {
                  if (kpssGame.active) {
                    onGameSelect(kpssGame.name);
                  } else {
                    onToast(`${kpssGame.name} hazırlanıyor...`);
                  }
                }}
                className="group relative cursor-pointer rounded-3xl border border-amber-500/35 bg-gradient-to-r from-[#1e1a15]/90 via-[#0e0e11]/90 to-[#0e0e11]/60 p-6 md:p-8 hover:border-amber-500/60 hover:bg-[#1e1a15]/75 transition-all duration-300 shadow-[0_0_25px_rgba(245,158,11,0.03)] hover:shadow-[0_0_35px_rgba(245,158,11,0.08)] flex flex-col justify-between overflow-hidden"
              >
                {/* Highlight Glow Effect */}
                <div className="absolute -right-16 -top-16 w-44 h-44 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/15 transition-all duration-300 pointer-events-none" />

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex space-x-2">
                      <span className="px-2.5 py-0.5 text-[9px] font-extrabold tracking-wider uppercase rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        Öne Çıkan Oyun 👑
                      </span>
                      <span className="px-2 py-0.5 text-[9px] font-extrabold tracking-wider uppercase rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 animate-pulse">
                        Yeni Mod 🔥
                      </span>
                    </div>
                    <span className="text-2xl group-hover:scale-110 transition-transform duration-250 select-none">👑</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-amber-400 group-hover:text-amber-300 transition-colors duration-200 tracking-tight">
                    {kpssGame.name}
                  </h2>
                  
                  <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors duration-200">
                    {kpssGame.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-900/80 flex items-center justify-between text-xs font-bold text-amber-500/80 group-hover:text-amber-450 transition-colors duration-300">
                  <span>Oyuna Giriş Yap (Mobil Uyumlu)</span>
                  <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </div>
            );
          })()}

          {(() => {
            const kpssVatGame = games.find(g => g.name === "KPSS VATANDAŞLIK");
            if (!kpssVatGame) return null;
            return (
              <div
                onClick={() => {
                  if (kpssVatGame.active) {
                    onGameSelect(kpssVatGame.name);
                  } else {
                    onToast(`${kpssVatGame.name} hazırlanıyor...`);
                  }
                }}
                className="group relative cursor-pointer rounded-3xl border border-indigo-500/35 bg-gradient-to-r from-[#171c26]/90 via-[#0e0e11]/90 to-[#0e0e11]/60 p-6 md:p-8 hover:border-indigo-500/60 hover:bg-[#171c26]/75 transition-all duration-300 shadow-[0_0_25px_rgba(99,102,241,0.03)] hover:shadow-[0_0_35px_rgba(99,102,241,0.08)] flex flex-col justify-between overflow-hidden"
              >
                {/* Highlight Glow Effect */}
                <div className="absolute -right-16 -top-16 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/15 transition-all duration-300 pointer-events-none" />

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex space-x-2">
                      <span className="px-2.5 py-0.5 text-[9px] font-extrabold tracking-wider uppercase rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        Öne Çıkan Oyun ⚖️
                      </span>
                      <span className="px-2 py-0.5 text-[9px] font-extrabold tracking-wider uppercase rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 animate-pulse">
                        Yeni Mod 🔥
                      </span>
                    </div>
                    <span className="text-2xl group-hover:scale-110 transition-transform duration-250 select-none">⚖️</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-indigo-400 group-hover:text-indigo-300 transition-colors duration-200 tracking-tight">
                    {kpssVatGame.name}
                  </h2>
                  
                  <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors duration-200">
                    {kpssVatGame.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-900/80 flex items-center justify-between text-xs font-bold text-indigo-400/80 group-hover:text-indigo-450 transition-colors duration-300">
                  <span>Oyuna Giriş Yap (Mobil Uyumlu)</span>
                  <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Other Games Header */}
        <div className="mb-4">
          <h3 className="text-[10px] font-extrabold text-zinc-550 uppercase tracking-widest">
            Diğer Parti Oyunları
          </h3>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {games
            .filter(game => game.name !== "KPSS GÜNCEL" && game.name !== "KPSS VATANDAŞLIK")
            .map((game, index) => (
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
