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
      range: "'지역별일정'!A2:D",  // 헤더 제외하고 데이터만 조회
    });

    const scheduleRows = scheduleResponse.data.values || [];
    console.log(`📊 [DEBUG] 전체 일정 수: ${scheduleRows.length}`);

    // 1. 현재 시간 (KST) 기준으로 내일 날짜 구하기
    const now = new Date();
    now.setHours(now.getHours() + 9); // KST로 변환
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    console.log(`🕒 [DEBUG] 필터링 기준일:`, {
      tomorrow: tomorrow.toISOString(),
    });

    // 2. 필터링 로직
    const availableRows = scheduleRows.filter((row: string[]) => {
      const [rowRegion, rowDate, rowTime, rowStatus] = row;
      
      // 지역 필터링
      if (rowRegion !== region) return false;
      
      // 예약완료 상태 제외
      if (rowStatus === "예약완료") return false;
      
      // 내일 이후 날짜만 포함
      const rowDateTime = new Date(`${rowDate} ${rowTime}`);
      return rowDateTime >= tomorrow;
    });

    console.log(`📊 [DEBUG] 필터링 후 사용 가능한 시간대: ${availableRows.length}`);

    // 2. 날짜/시간 기준으로 정렬
    const sortedRows = availableRows.sort((a: string[], b: string[]) => {
      const dateTimeA = new Date(`${a[1]} ${a[2]}`);
      const dateTimeB = new Date(`${b[1]} ${b[2]}`);
      return dateTimeA.getTime() - dateTimeB.getTime();
    });

    // 4. ScheduleRecord 형식으로 변환
    const formattedSchedule: ScheduleItem[] = sortedRows.map(([지역, 날짜, 시간, 상태]: [string, string, string, string]) => ({
      지역,
      날짜,
      시간,
      상태: 상태 || ''
    }));

    console.log(`✅ [DEBUG] 스케줄 조회 완료 - 반환할 시간대: ${formattedSchedule.length}`);
    
    // 샘플 데이터 로깅
    if (formattedSchedule.length > 0) {
      console.log(`📝 [DEBUG] 첫 번째 시간대:`, formattedSchedule[0]);
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