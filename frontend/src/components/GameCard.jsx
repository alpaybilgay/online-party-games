import React from "react";

function GameCard({ game, index, onClick, onToast }) {
  return (
    <div
      onClick={() => {
        if (game.active) {
          onClick(game.name);
        } else {
          onToast(`${game.name} hazırlanıyor...`);
        }
      }}
      className={`group relative cursor-pointer rounded-2xl border border-zinc-900 bg-[#0e0e11]/60 p-5 hover:border-zinc-800 hover:bg-[#121215] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between shadow-md hover:shadow-xl ${
        index >= 6 ? "hidden sm:flex" : "flex"
      }`}
    >
      {game.active && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/0 via-transparent to-transparent group-hover:from-violet-500/5 transition-all duration-300 pointer-events-none" />
      )}

      <div>
        <div className="flex justify-between items-start mb-4">
          <span className={`px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded-full ${
            game.active 
              ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" 
              : "bg-zinc-800/40 text-zinc-500 border border-zinc-800/60"
          }`}>
            {game.category}
          </span>
          <span className="text-xl group-hover:scale-110 transition-transform duration-200">{game.icon}</span>
        </div>

        <h3 className="text-sm md:text-base font-bold text-zinc-200 group-hover:text-white transition-colors duration-200">
          {game.name}
        </h3>
        
        <p className="mt-2 text-xs text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors duration-200">
          {game.desc}
        </p>
      </div>

      <div className="mt-6 pt-3 border-t border-zinc-900/80 flex items-center justify-between text-[10px] font-semibold text-zinc-600 group-hover:text-zinc-400 transition-colors duration-300">
        {game.active ? (
          <>
            <span>Giriş Yap</span>
            <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </>
        ) : (
          <>
            <span>Geliştiriliyor</span>
            <span>🔒</span>
          </>
        )}
      </div>
    </div>
  );
}

export default GameCard;
