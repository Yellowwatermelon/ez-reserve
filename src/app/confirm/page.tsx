'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';
import Lottie from 'react-lottie-player';
import successAnimation from '@/animations/success.json';
import loadingAnimation from '@/animations/loading.json';
import {
  FaUser,
  FaPhone,
  FaCalendarAlt,
  FaClock,
} from 'react-icons/fa';
import Button from '@/components/ui/Button';
import Layout from '@/components/common/Layout';
import { CacheManager } from '@/lib/cache/cache-manager';
import '@/styles/globals.css';
import LoadingScreen from '@/components/common/LoadingScreen';
import { decrypt } from '@/utils/crypto';
import { delay } from '@/utils/delay';
import { standardizeDate, standardizeTime } from '@/utils/date';

interface BookingRecord {
  name: string;
  phone: string;
  region: string;
  date: string;
  time: string;
  timestamp: string;
}

const formatPhone = (phone: string) => {
  return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
};

const formatTime = (time: string): string => {
  const standardTime = standardizeTime(time);
  const [hours, minutes] = standardTime.split(":");
  const hour = parseInt(hours, 10);
  return `${hour < 12 ? "오전" : "오후"} ${hour <= 12 ? hour : hour - 12}:${minutes}`;
};

const ERROR_MESSAGES = {
  BOOKING_FAILED: "예약 처리에 실패했습니다",
  TIME_SLOT_TAKEN: "선택하신 시간대가 이미 예약되었습니다",
  INVALID_DATA: "잘못된 예약 정보입니다",
  API_ERROR: "서버 오류가 발생했습니다"
} as const;

export default function Confirm() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingData, setBookingData] = useState<BookingRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const cache = CacheManager.getInstance();

  const recordBooking = useCallback(async (record: BookingRecord) => {
    try {
      console.log('📡 [DEBUG] 예약 기록 시작. 요청 데이터:', {
        name: record.name,
        phone: record.phone,
        region: record.region,
        date: record.date,
        time: record.time
      });
      
      // API 요청 데이터 준비
      const requestData = {
        name: record.name,
        phone: record.phone,
        region: record.region,
        date: record.date,
        time: record.time
      };

      console.log('🔍 [DEBUG] API 요청 전 데이터 확인:', {
        url: '/api/booking/record',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY ? '설정됨' : '미설정'
        },
        requestData
      });

      const response = await fetch('/api/booking/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || ''
        },
        body: JSON.stringify(requestData),
      });

      console.log('📥 [DEBUG] API 응답 상태:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      const result = await response.json();
      console.log('📦 [DEBUG] API 응답 데이터:', result);
      
      if (!response.ok) {
        console.error('🚨 [ERROR] API 호출 실패:', {
          status: response.status,
          result,
          requestData
        });
        if (response.status === 409) {
          throw new Error(ERROR_MESSAGES.TIME_SLOT_TAKEN);
        }
        throw new Error(result.error || ERROR_MESSAGES.BOOKING_FAILED);
      }

      if (!result.success || !result.data) {
        console.error('🚨 [ERROR] 잘못된 응답 데이터:', {
          success: result.success,
          data: result.data,
          fullResult: result
        });
        throw new Error(ERROR_MESSAGES.INVALID_DATA);
      }

      console.log('✅ [DEBUG] 예약 기록 성공:', {
        result,
        currentStep: currentStep,
        nextStep: 3
      });
      
      setCurrentStep(3);
      setLoading(false);

    } catch (error) {
      console.error('🚨 [ERROR] 예약 기록 중 오류 발생:', {
        error,
        errorMessage: error instanceof Error ? error.message : ERROR_MESSAGES.API_ERROR,
        requestData: record
      });
      
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.API_ERROR;
      setError(errorMessage);
      setLoading(false);
      
      if (errorMessage === ERROR_MESSAGES.TIME_SLOT_TAKEN) {
        console.log('⚠️ [DEBUG] 시간대 중복으로 예약 페이지로 리다이렉트');
        alert(errorMessage);
        router.push('/booking');
        return;
      }
    }
  }, [router]);

  useEffect(() => {
    const loadBookingData = async () => {
      try {
        console.log('🔄 [DEBUG] 예약 데이터 로딩 시작');
        setLoading(true);
        
        const name = decrypt(localStorage.getItem('userName') || '');
        const phone = decrypt(localStorage.getItem('userPhone') || '');
        const region = decrypt(localStorage.getItem('userRegion') || '');
        const date = decrypt(localStorage.getItem('bookingDate') || '');
        const time = decrypt(localStorage.getItem('bookingTime') || '');
        const timestamp = decrypt(localStorage.getItem('bookingTimestamp') || '');

        console.log('🔍 [DEBUG] localStorage 데이터 확인:', {
          name: name ? '설정됨' : '미설정',
          phone: phone ? '설정됨' : '미설정',
          region: region ? '설정됨' : '미설정',
          date: date ? '설정됨' : '미설정',
          time: time ? '설정됨' : '미설정',
          timestamp: timestamp ? '설정됨' : '미설정'
        });

        if (!name || !phone || !region || !date || !time || !timestamp) {
          console.error('🚨 [ERROR] 필수 예약 정보 누락:', {
            name: !name,
            phone: !phone,
            region: !region,
            date: !date,
            time: !time,
            timestamp: !timestamp
          });
          setLoading(false);
          throw new Error('예약 정보를 찾을 수 없습니다.');
        }

        const record: BookingRecord = {
          name,
          phone,
          region,
          date,
          time,
          timestamp
        };

        console.log('📋 [DEBUG] 예약 기록 데이터 준비 완료:', {
          recordData: {
            ...record,
            phone: '***' + record.phone.slice(-4)  // 전화번호 마스킹
          }
        });

        setBookingData(record);
        cache.set('booking_data', record, 60);
        console.log('💾 [DEBUG] 캐시 저장 완료');

        await recordBooking(record);
      } catch (error) {
        console.error('🚨 [ERROR] Confirm Page 데이터 로딩 오류:', {
          error,
          errorMessage: error instanceof Error ? error.message : '알 수 없는 오류'
        });
        setError(
          error instanceof Error ? error.message : '예약 정보 로딩 실패'
        );
        router.push('/verify');
      } finally {
        setLoading(false);
      }
    };

    loadBookingData();
  }, [router, cache, recordBooking]);

  useEffect(() => {
    if (currentStep === 1 && bookingData) {
      setTimeout(() => setCurrentStep(2), 2000);
    }
  }, [currentStep, bookingData]);

  const captureAutomatically = useCallback(async () => {
    if (!bookingData || loading || currentStep < 3) return;

    try {
      if (pageRef.current) {
        const canvas = await html2canvas(pageRef.current);
        const dataUrl = (canvas as unknown as HTMLCanvasElement).toDataURL('image/png');
        const blob = await fetch(dataUrl).then(res => res.blob());
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = '예약내역.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          localStorage.setItem('captureCompleted', 'true');
        }
      }
    } catch (error) {
      console.error('🚨 [ERROR] 자동 캡처 중 오류 발생:', error);
    }
  }, [bookingData, loading, currentStep]);

  useEffect(() => {
    captureAutomatically();
  }, [currentStep, bookingData, loading, captureAutomatically]);

  const getAnimation = () => {
    if (currentStep === 3) {
      return successAnimation;
    }
    return loadingAnimation;
  };

  const getMessage = () => {
    switch (currentStep) {
      case 1:
        return '데이터 확인 ���...';
      case 2:
        return '예약 기록 중...';
      case 3:
        return '예약이 성공적으로 완료되었습니다!';
      default:
        return '';
    }
  };

  const handleBooking = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const bookingDate = decrypt(localStorage.getItem("bookingDate") || "");
      const bookingTime = decrypt(localStorage.getItem("bookingTime") || "");
      const userRegion = decrypt(localStorage.getItem("userRegion") || "");
      const userName = decrypt(localStorage.getItem("userName") || "");
      const userPhone = decrypt(localStorage.getItem("userPhone") || "");

      if (!bookingDate || !bookingTime || !userRegion || !userName || !userPhone) {
        throw new Error("예약 정보가 유효하지 않습니다");
      }

      // 시간대 유효성 재확인
      const scheduleResponse = await fetch(`/api/schedule?region=${encodeURIComponent(userRegion)}&t=${Date.now()}`, {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
        }
      });

      if (!scheduleResponse.ok) {
        throw new Error("시간대 확인 중 오류가 발생했습니다");
      }

      const scheduleData = await scheduleResponse.json();
      const isTimeSlotAvailable = scheduleData.data?.some((slot: any) => 
        slot.날짜 === bookingDate && 
        slot.시간 === bookingTime && 
        slot.지역 === userRegion &&
        slot.상태 !== '예약완료'
      );

      if (!isTimeSlotAvailable) {
        throw new Error("선택하신 시간대는 이미 예약되었습니다");
      }

      // 예약 처리 진행
      const response = await fetch("/api/booking/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
        },
        body: JSON.stringify({
          date: bookingDate,
          time: bookingTime,
          region: userRegion,
          name: userName,
          phone: userPhone,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "예약 처리 중 오류가 발생했습니다");
      }

      router.push("/complete");
    } catch (error) {
      console.error("예약 처리 중 오류:", error);
      setError(error instanceof Error ? error.message : "예약 처리 중 오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = useCallback(() => {
    // 코드 내용
  }, []);

  const handlePrevious = useCallback(() => {
    // 코드 내용
  }, []);

  if (loading || currentStep < 3) {
    return (
      <LoadingScreen 
        message={getMessage()} 
        blur={true}
      />
    );
  }

  return (
    <Layout>
      <div className="min-h-screen flex flex-col" ref={pageRef}>
        <main className="flex-grow p-4">
          <div className="h-20"></div>
          <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
            <Button
              onClick={captureAutomatically}
              className={`w-full text-lg py-4 mb-6 transition-all ${
                currentStep === 3
                  ? "bg-selected text-white font-bold"  // 캡쳐 완료 상태
                  : "bg-secondary text-white"  // 진행 중 상태
              }`}
            >
              {currentStep === 3 ? "예약내역 기록 완료" : "예약내역 기록 중..."}
            </Button>
            <div className="space-y-4">
              {bookingData && (
                <div
                  className="text-lg mb-0 bg-gray-100 p-4 rounded-lg"
                  style={{ lineHeight: '1.5' }}
                >
                  <div className="grid grid-cols-1 gap-6">
                    <div className="flex items-center">
                      <FaUser
                        className="text-blue-500 mr-4"
                        style={{ width: '40px', height: '40px' }}
                      />
                      <div>
                        <p className="font-semibold">계약자 성명:</p>
                        <p>{bookingData.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <FaPhone
                        className="text-blue-500 mr-4"
                        style={{ width: '40px', height: '40px' }}
                      />
                      <div>
                        <p className="font-semibold">계약자 전화번호:</p>
                        <p>{formatPhone(bookingData.phone)}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <FaCalendarAlt
                        className="text-blue-500 mr-4"
                        style={{ width: '40px', height: '40px' }}
                      />
                      <div>
                        <p className="font-semibold">예약일:</p>
                        <p>{formatDate(bookingData.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <FaClock
                        className="text-blue-500 mr-4"
                        style={{ width: '40px', height: '40px' }}
                      />
                      <div>
                        <p className="font-semibold">예약시간:</p>
                        <p>{formatTime(bookingData.time)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}
