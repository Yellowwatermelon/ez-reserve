import { bookingManager } from '@/lib/booking';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // API 키 확인
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.NEXT_PUBLIC_API_KEY) {
      console.error('🚨 [ERROR] 잘못된 API 키:', apiKey);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const bookingData = await request.json();
    
    // 테스트 로그
    console.log('📝 [TEST] 예약 요청 데이터:', bookingData);
    
    // 예약 처리
    const result = await bookingManager.handleBookingConfirmation(bookingData);
    
    // 결과 로그
    console.log('📝 [TEST] 예약 처리 결과:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('🚨 [TEST] 예약 처리 오류:', error);
    return NextResponse.json(
      { error: '테스트 중 오류 발생' },
      { status: 500 }
    );
  }
} 