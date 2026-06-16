import React from "react";

function ServerWakeScreen({ errorCount }) {
  return (
    <div className="relative min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center overflow-hidden font-sans">
      {/* Soft Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-fuchsia-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-md w-full px-6 text-center flex flex-col items-center font-sans">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-2xl blur-xl opacity-40 animate-pulse" />
          <div className="relative bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex items-center justify-center shadow-2xl">
            <svg className="w-12 h-12 text-violet-400 animate-spin [animation-duration:8s]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          AlpayParty
        </h1>
        <p className="mt-3 text-sm text-zinc-400 font-medium">Oyun Platformu</p>

        <div className="mt-12 p-6 w-full rounded-2xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-md">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
            </span>
            <span className="text-sm font-semibold text-zinc-300">Sunucu Uyandırılıyor...</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Arka plan sunucusuyla bağlantı kuruluyor. Bu işlem ilk açılışta veya sunucu uyku modundaysa birkaç saniye sürebilir.
          </p>
          {errorCount > 0 && (
            <div className="mt-4 pt-3 border-t border-zinc-800/50 text-[10px] text-zinc-500 flex justify-between items-center">
              <span>Bağlantı denemesi: {errorCount}</span>
              <span className="animate-pulse">Yanıt bekleniyor...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ServerWakeScreen;
