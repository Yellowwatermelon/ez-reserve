import { bookingManager } from '@/lib/booking';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const bookingData = await request.json();
    
    // 예약 처리
    const result = await bookingManager.processBooking(bookingData);
    
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('예약 API 오류:', error);
    return NextResponse.json(
      { error: '예약 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
} 