"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import LoadingScreen from "@/components/common/LoadingScreen";
import Header from "@/components/common/Header";
import "@/styles/globals.css";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.clear();
    console.log("Storage and cache initialized");

    const preloadData = async () => {
      setIsLoading(false);
    };

    preloadData();
  }, []);

  const handleStart = () => {
    const storedName = localStorage.getItem("userName");
    const storedPhone = localStorage.getItem("userPhone");

    if (storedName && storedPhone) {
      router.push("/booking");
    } else {
      router.push("/verify");
    }
  };

  return (
    <>
      <div className="flex flex-col min-h-screen">
        {isLoading && <LoadingScreen />}
        <Header />
        <div className="flex flex-1 items-start justify-center pt-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-black mb-10">
              {process.env.NEXT_PUBLIC_SERVICE_TITLE}
            </h1>
            <CalendarDaysIcon className="w-32 h-32 text-blue-600 mb-10 mx-auto" />
            <h2 className="text-xl font-bold text-black mb-4">
              빠르고 쉬운 정기점검 예약
            </h2>
            <h2 className="text-xl font-bold text-black mt-2">
              시작하기를 누르세요
            </h2>
            {error && (
              <p className="mt-4 text-red-500">{error}</p>
            )}
          </div>
        </div>
        <div className="fixed bottom-0 left-0 w-full bg-white p-4">
          <Button
            onClick={handleStart}
            className={`w-full text-lg py-4 transition-all ${
              isLoading || !!error
                ? "bg-secondary/50 text-white cursor-not-allowed"
                : "bg-selected text-white font-bold hover:opacity-90"
            }`}
            disabled={isLoading || !!error}
          >
            {isLoading
              ? "데이터 로딩중..."
              : error
                ? "데이터 로딩 실패"
                : "시작하기"}
          </Button>
        </div>
      </div>
    </>
  );
}
