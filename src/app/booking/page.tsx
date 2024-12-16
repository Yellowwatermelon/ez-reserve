"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/common/Layout";
import Calendar from "@/components/ui/Calendar";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "@/styles/globals.css";
import type { ScheduleItem } from '@/types/schedule';
import LoadingScreen from "@/components/common/LoadingScreen";
import { decrypt, encrypt } from '@/utils/crypto';
import { delay } from '@/utils/delay';
import { standardizeDate, standardizeTime } from '@/utils/date';

interface LoadingScreenProps {
  message: string;
}

interface APIResponse {
  data?: ScheduleItem[];
  error?: string;
}

export default function Booking() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearScheduleCache = () => {
    // 스케줄 관련 캐시 데이터 초기화
    localStorage.removeItem("scheduleData");
    sessionStorage.removeItem("scheduleData");
    
    // 브라우저 캐시 초기화 시도
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
  };

  const fetchSchedule = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 캐시 초기화
      clearScheduleCache();
      
      await delay(1000);
      
      const userRegion = decrypt(localStorage.getItem("userRegion") || "");
      if (!userRegion) {
        setError("지역 정보를 찾을 수 없습니다");
        return;
      }

      const response = await fetch(`/api/schedule?region=${encodeURIComponent(userRegion)}&t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('🚨 [ERROR] API 호출 실패:', errorData);
        throw new Error(errorData.error || "스케줄 데이터를 불러올 수 없습니다.");
      }

      const { data, error }: APIResponse = await response.json();
      if (error) {
        throw new Error(error);
      }
      if (!data || !Array.isArray(data)) {
        throw new Error("스케줄 데이터가 없습니다");
      }

      console.log('📊 [DEBUG] 원본 스케줄 데이터:', data);

      // 서버 간 기준으로 필터링 (KST)
      const now = new Date();
      now.setHours(now.getHours() + 9); // KST로 변환

      const filteredData = data.filter((item: ScheduleItem) => {
        try {
          const [year, month, day] = item.날짜.split('-').map(Number);
          const [hour, minute] = item.시간.split(':').map(Number);
          const itemDate = new Date(year, month - 1, day, hour, minute);
          return itemDate > now;
        } catch (error) {
          console.error('🚨 [ERROR] 날짜 처리 중 오류:', { item, error });
          return false;
        }
      });

      console.log('📊 [DEBUG] 필터링된 스케줄 데이터:', filteredData);

      const normalizedData = filteredData.map((item: ScheduleItem) => {
        try {
          return {
            ...item,
            날짜: standardizeDate(item.날짜),
            시간: standardizeTime(item.시간)
          };
        } catch (error) {
          console.error('🚨 [ERROR] 데이터 정규화 중 오류:', { item, error });
          return item;
        }
      });

      console.log('📊 [DEBUG] 정규화된 스케줄 데이터:', normalizedData);

      setScheduleData(normalizedData);

      if (normalizedData.length > 0) {
        const earliestDate = normalizedData[0].날짜;
        const timesForEarliestDate = normalizedData
          .filter((item: ScheduleItem) => item.날짜 === earliestDate)
          .map((item: ScheduleItem) => item.시간)
          .sort((a, b) => {
            // 24시간 형식으로 변환하여 비교
            const [aHour, aMin] = a.split(':').map(Number);
            const [bHour, bMin] = b.split(':').map(Number);
            return (aHour * 60 + aMin) - (bHour * 60 + bMin);
          });

        console.log('정렬된 시간대:', timesForEarliestDate); // 디버깅용

        setSelectedDate(new Date(earliestDate));
        setSelectedTimes(timesForEarliestDate);
        if (timesForEarliestDate.length > 0) {
          setSelectedTime(timesForEarliestDate[0]);
        }
        setCurrentDate(new Date(earliestDate));
      }
    } catch (error) {
      console.error("스케줄 데이터를 가져오는 중 오류 발생:", error);
      setError(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const formatModalDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      year: "2-digit",
      month: "long",
      day: "numeric",
      weekday: "short",
    };
    const formatted = new Intl.DateTimeFormat("ko-KR", options).format(date);
    return formatted.replace(/(\d+년 \d+월 \d+일) (\(.*?\)|[월화수목금토일])/, '$1 ($2)');
  };

  const formatTime = (time: string): string => {
    try {
      const standardTime = standardizeTime(time);
      const [hours, minutes] = standardTime.split(":");
      const hour = parseInt(hours, 10);
      return `${hour < 12 ? "오전" : "오후"} ${hour <= 12 ? hour : hour - 12}:${minutes}`;
    } catch (error) {
      console.error('시간 포맷 변환 중 오류:', error);
      return time;
    }
  };

  const handleDateSelect = async (date: Date) => {
    try {
      setSelectedDate(date);
      setSelectedTime(null);
      
      const standardizedDate = standardizeDate(date.toISOString());
      const times = scheduleData
        .filter((row) => row.날짜 === standardizedDate)
        .map((row) => row.시간)
        .sort((a, b) => {
          const [aHour, aMin] = a.split(':').map(Number);
          const [bHour, bMin] = b.split(':').map(Number);
          return (aHour * 60 + aMin) - (bHour * 60 + bMin);
        });
      
      console.log('선택된 날짜의 시간대:', times);
      
      setSelectedTimes(times);
      if (times.length > 0) {
        setSelectedTime(times[0]);
      }
    } catch (error) {
      console.error('날짜 선택 처리 중 오류:', error);
      setError('날짜 선택 중 오류가 발생했습니다');
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime((prev) => (prev === time ? null : time));
  };

  const handlePrevWeek = () => {
    const prevWeek = new Date(currentDate);
    prevWeek.setDate(currentDate.getDate() - 7);
    setCurrentDate(prevWeek);
  };

  const handleNextWeek = () => {
    const nextWeek = new Date(currentDate);
    nextWeek.setDate(currentDate.getDate() + 7);
    setCurrentDate(nextWeek);
  };

  const handleBooking = () => setIsModalOpen(true);

  const confirmBooking = () => {
    try {
      if (!selectedDate || !selectedTime) {
        setError('날짜와 시간을 선택해주세요');
        return;
      }

      setIsLoading(true);
      const isoDate = selectedDate.toISOString();
      const bookingTimestamp = new Date().toISOString();

      // 데이터 저장 전 유효성 검사
      const standardizedDate = standardizeDate(isoDate);
      const standardizedTime = standardizeTime(selectedTime);
      
      if (!standardizedDate || !standardizedTime) {
        throw new Error('날짜 또는 시간 형식이 올바르지 않습니다');
      }

      // 예약 데이터 저장
      localStorage.setItem("bookingDate", encrypt(standardizedDate));
      localStorage.setItem("bookingTime", encrypt(standardizedTime));
      localStorage.setItem("bookingTimestamp", encrypt(bookingTimestamp));
      
      console.log('📝 [DEBUG] 예약 데이터 저장:', {
        date: standardizedDate,
        time: standardizedTime,
        timestamp: bookingTimestamp
      });

      router.push("/confirm");
    } catch (error) {
      console.error('예약 확인 중 오류:', error);
      setError('예약 처리 중 오류가 발생했습니다');
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex flex-col">
        <div className="relative flex-grow">
          {isLoading && <LoadingScreen message="예약 정보를 처리하고 있습니다" blur={true} />}
          {error && (
            <div className="fixed top-24 left-0 right-0 mx-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
              <p>{error}</p>
            </div>
          )}
          <div className="flex-grow overflow-y-auto p-4">
            <div className="h-20"></div>
            <div className="flex justify-between items-center mb-4">
              <button onClick={handlePrevWeek} className="text-blue-500 w-12 flex justify-center">
                <FaChevronLeft size={24} />
              </button>
              <h3 className="text-xl font-bold flex-1 text-center">{`${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`}</h3>
              <button onClick={handleNextWeek} className="text-blue-500 w-12 flex justify-center">
                <FaChevronRight size={24} />
              </button>
            </div>
            <Calendar
              scheduleData={scheduleData}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              currentDate={currentDate}
            />
            {selectedTimes.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-bold mb-2">가능 시간대</h2>
                <div className="grid grid-cols-3 gap-2">
                  {selectedTimes.map((time, index) => (
                    <button
                      key={index}
                      className={`${
                        selectedTime === time
                          ? "bg-selected text-white font-bold"
                          : "bg-secondary text-white hover:bg-selected hover:font-bold"
                      } p-2 rounded transition-all`}
                      onClick={() => handleTimeSelect(time)}
                    >
                      {formatTime(time)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="fixed bottom-0 left-0 w-full bg-white p-4">
          <Button
            onClick={handleBooking}
            className={`w-full text-lg py-4 transition-all ${
              selectedDate && selectedTime
                ? "bg-selected text-white font-bold hover:opacity-90"
                : "bg-secondary text-white opacity-50 cursor-not-allowed"
            }`}
            disabled={!selectedDate || !selectedTime}
          >
            {selectedDate && selectedTime ? "예약하기" : "날짜와 시간을 선택하세요"}
          </Button>
        </div>
        {isModalOpen && (
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="예약 확인"
          >
            <div className="p-4">
              <p className="mb-4 text-xl font-bold">선택 예약일 확인</p>
              <div className="mb-6 space-y-2">
                <p>날짜: {selectedDate ? 
                  `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 (${['일', '월', '화', '수', '목', '금', '토'][selectedDate.getDay()]})` 
                  : ""}
                </p>
                <p>시간: {selectedTime ? 
                  new Date(`2000-01-01T${selectedTime}`).toLocaleTimeString('ko-KR', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  }) 
                  : ""}
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-500 text-white px-4 py-2"
                >
                  취소
                </Button>
                <Button 
                  onClick={confirmBooking}
                  className="bg-selected text-white px-6 py-3 text-lg hover:opacity-90"
                >
                  예약하기
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
}
