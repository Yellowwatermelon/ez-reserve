"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';

const Header = () => {
  const pathname = usePathname() || '';
  const isCompleted = pathname === '/confirm' && localStorage.getItem('captureCompleted') === 'true';

  // 현재 페이지에 따른 예약 탭 텍스트 결정
  const getReservationText = () => {
    switch (pathname) {
      case '/':
        return '예약 시작';
      case '/verify':
        return '계약자 정보 입력';
      case '/booking':
        return '날짜,시간 선택';
      case '/confirm':
        return '예약 확정';
      default:
        return '예약';
    }
  };

  // 로딩 애니메이션이 필요한 페이지인지 확인
  const needsLoadingAnimation = ['/', '/verify', '/booking'].includes(pathname);

  return (
    <header className="bg-white px-4 pt-4">
      <div className="flex shadow-lg border border-gray-100">
        {/* 예약 탭 */}
        <div 
          className={`flex-1 py-4 text-center transition-all rounded-tl-xl rounded-tr-xl ${
            isCompleted 
              ? 'bg-white text-gray-500'  // 완료 후 비활성화 상태
              : 'bg-selected text-white font-bold'  // 모든 활성화 상태에서 동일한 색상 사용
          }`}
        >
          <span className="relative inline-flex items-center">
            {getReservationText()}
            {needsLoadingAnimation && (
              <span className="ml-1 inline-flex tracking-wider">
                <span className="animate-dot-1">.</span>
                <span className="animate-dot-2">.</span>
                <span className="animate-dot-3">.</span>
              </span>
            )}
          </span>
        </div>

        {/* 프로모션 탭 */}
        <div 
          className={`flex-1 py-4 text-center transition-all border-l border-gray-100 rounded-tl-xl rounded-tr-xl ${
            isCompleted
              ? 'bg-selected text-white font-bold cursor-pointer'  // 활성화 상태
              : 'bg-secondary/50 text-white cursor-not-allowed'  // 비활성화 상태 (50% 투명도)
          }`}
        >
          나의혜택
        </div>
      </div>
    </header>
  );
};

export default Header;
