import React from 'react';

export const LoadingSplash: React.FC<{ label?: string }> = ({ label = 'Loading sovereign mail' }) => {
  return (
    <div
      id="mailoo-loading-splash"
      className="min-h-screen w-screen bg-[#0A0A0B] text-[#E4E4E7] flex flex-col items-center justify-center gap-5"
    >
      <div className="w-10 h-10 rounded-sm bg-white text-black font-bold flex items-center justify-center shadow-sm">
        M
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="h-1 w-40 rounded-full bg-[#18181B] overflow-hidden">
          <div className="h-full w-1/2 bg-white animate-pulse rounded-full" />
        </div>
        <p className="text-[11px] font-mono-code uppercase tracking-widest text-[#71717A]">{label}</p>
      </div>
    </div>
  );
};
