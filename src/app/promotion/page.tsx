"use client";

import React from 'react';
import Layout from "@/components/common/Layout";
import "@/styles/globals.css";

export default function Promotion() {
  return (
    <Layout>
      <div className="min-h-screen flex flex-col">
        <main className="flex-grow p-4">
          <div className="h-20"></div>
          <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
            {/* 프로모션 컨텐츠 */}
            <div className="w-full bg-gray-100 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">
                SK매직 추천 상품
              </h2>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-lg font-bold text-blue-600 mb-2">
                    올클린 공기청정기
                  </h3>
                  <p className="text-gray-600 mb-2">
                    월 렌탈료 37,900원
                  </p>
                  <p className="text-sm text-gray-500">
                    첫 3개월 무료 + 의무사용 없음
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-lg font-bold text-blue-600 mb-2">
                    직수 정수기
                  </h3>
                  <p className="text-gray-600 mb-2">
                    월 렌탈료 29,900원
                  </p>
                  <p className="text-sm text-gray-500">
                    첫 1개월 무료 + 의무사용 없음
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-lg font-bold text-blue-600 mb-2">
                    식기세척기
                  </h3>
                  <p className="text-gray-600 mb-2">
                    월 렌탈료 43,900원
                  </p>
                  <p className="text-sm text-gray-500">
                    첫 2개월 무료 + 의무사용 없음
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-6 text-center">
                * 상기 프로모션은 예시이며, 실제와 다를 수 있습니다.
              </p>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
} 