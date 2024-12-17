// Dynamic route configuration
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getSheets } from "@/utils/sheets";
import { ScheduleItem, ScheduleResponse } from "@/types/schedule";

interface BookedSlot {
  date: string;
  time: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<ScheduleResponse>> {
  try {
    const sheets = await getSheets();
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');

    if (!region) {
      return NextResponse.json(
        { error: "Region is required" },
        { status: 400 }
      );
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      throw new Error("GOOGLE_SHEET_ID is not defined");
    }

    console.log(`🔍 [DEBUG] 스케줄 조회 시작 - 지역: ${region}`);

    // 1. 지역별 일정 조회 (전체 데이터)
    const scheduleResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'지역별일정'!A2:D",
    });

    const scheduleRows = scheduleResponse.data.values || [];
    console.log(`📊 [DEBUG] 전체 일정 수: ${scheduleRows.length}`);

    // 2. 현재 시간 기준 설정 (KST)
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000; // 9시간을 밀리초로 변환
    const kstNow = new Date(now.getTime() + kstOffset);
    
    // 내일 자정 계산 (KST 기준)
    const tomorrow = new Date(kstNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const tomorrowKST = new Date(tomorrow.getTime());

    console.log(`🕒 [DEBUG] 현재 시간 (KST):`, kstNow.toISOString());
    console.log(`🕒 [DEBUG] 필터링 기준일 (KST):`, tomorrowKST.toISOString());

    // 3. 필터링 로직
    const availableRows = scheduleRows
      // 1) 지역 필터링 - 정확한 매칭만 허용
      .filter((row: string[]) => row[0] === region)
      
      // 2) 예약완료 제외
      .filter((row: string[]) => row[3] !== "예약완료")
      
      // 3) 시간 필터링
      .filter((row: string[]) => {
        if (!row[1] || !row[2]) return false;
        
        const [year, month, day] = row[1].split('-').map(Number);
        const [hour, minute] = row[2].split(':').map(Number);
        
        if (!year || !month || !day || isNaN(hour) || isNaN(minute)) return false;
        
        // KST 기준으로 날짜/시간 생성
        const rowDateTime = new Date(year, month - 1, day, hour, minute);
        return rowDateTime >= tomorrowKST;
      })
      
      // 4) 날짜/시간 정렬
      .sort((a: string[], b: string[]) => {
        const [_, dateA, timeA] = a;
        const [__, dateB, timeB] = b;
        const dateTimeA = new Date(`${dateA}T${timeA}:00+09:00`);
        const dateTimeB = new Date(`${dateB}T${timeB}:00+09:00`);
        return dateTimeA.getTime() - dateTimeB.getTime();
      });

    console.log(`📊 [DEBUG] 필터링 후 사용 가능한 시간대: ${availableRows.length}`);

    // 4. 변환 및 반환
    const formattedSchedule = availableRows.map(([지역, 날짜, 시간, 상태]) => ({
      지역,
      날짜,
      시간,
      상태: 상태 || ''
    }));

    if (formattedSchedule.length > 0) {
      console.log(`📝 [DEBUG] 첫 번째 시간대:`, formattedSchedule[0]);
      console.log(`📝 [DEBUG] 마지막 시간대:`, formattedSchedule[formattedSchedule.length - 1]);
    }

    return NextResponse.json({ data: formattedSchedule });
  } catch (error) {
    console.error('🚨 [ERROR] Google Sheets API Error:', error);
    return NextResponse.json(
      { error: "Failed to fetch schedule data" },
      { status: 500 }
    );
  }
} 