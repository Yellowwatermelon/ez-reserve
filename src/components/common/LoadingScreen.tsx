"use client";

import React from 'react';

interface LoadingScreenProps {
  message?: string;
  blur?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "로딩 중...", 
  blur = true
}) => {
  return (
    <div className={`
      fixed inset-0 flex flex-col items-center justify-center
      ${blur ? 'backdrop-blur-sm bg-white/30' : 'bg-white/30'}
      z-[99999]
    `}>
      <div className="flex flex-col items-center justify-center">
        <div className="flex space-x-3">
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce"></div>
        </div>
        <p className="text-xl font-semibold mt-6 text-gray-800">{message}</p>
        <p className="text-lg text-gray-600 mt-2">
          잠시만 기다려주세요...
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
