import { NextResponse } from "next/server";
import type { BookingRequestData, BookingResponseData } from "@/types/booking";
import { getSheets } from "@/utils/sheets";
import { delay } from "@/utils/delay";
import { standardizeDate, standardizeTime } from "@/utils/date";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MAX_RETRIES = 3;
const LOCK_TIMEOUT = 30000; // 30초
const LOCK_CHECK_INTERVAL = 2000; // 2초

// 한국 시간 포맷 함수
const formatToKoreanTimestamp = (date: string | Date): string => {
  const koreanDate = new Date(date);
  koreanDate.setHours(koreanDate.getHours() + 9);
  return koreanDate.toISOString().replace('T', ' ').substring(0, 19);
};

// 메모리 기반 락 맵
const lockMap = new Map<string, { timestamp: number }>();

// 재시도 로직을 포함한 API 호출 래퍼 함수
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        console.log(`✅ [DEBUG] ${operationName} 성공 (시도: ${attempt}회)`);
      }
      return result;
    } catch (error) {
      console.error(`🚨 [ERROR] ${operationName} 실패 (시도: ${attempt}/${MAX_RETRIES}):`, error);
      
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      
      await delay(LOCK_CHECK_INTERVAL * attempt);
    }
  }
  throw new Error(`${operationName} failed after ${MAX_RETRIES} attempts`);
}

// 락 획득 함수
const acquireLock = async (key: string): Promise<boolean> => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const lockInfo = lockMap.get(key);
    const currentTime = Date.now();

    // 락이 없거나 만료된 경우
    if (!lockInfo || (currentTime - lockInfo.timestamp > LOCK_TIMEOUT)) {
      lockMap.set(key, { timestamp: currentTime });
      console.log(`🔒 [DEBUG] 락 획득 성공: ${key} (시도: ${attempt}/${MAX_RETRIES})`);
      return true;
    }

    console.log(`⌛ [DEBUG] 락 대기 중: ${key} (시도: ${attempt}/${MAX_RETRIES})`);
    await delay(LOCK_CHECK_INTERVAL);
  }

  console.log(`❌ [DEBUG] 락 획득 실패: ${key} (최대 시도 횟수 초과)`);
  return false;
};

// 락 해제 함수
const releaseLock = (key: string): void => {
  lockMap.delete(key);
  console.log(`🔓 [DEBUG] 락 해제 완료: ${key}`);
};

// 지역별일정 시트에서 예약 상태 업데이트
const updateScheduleStatus = async (
  sheets: any,
  spreadsheetId: string,
  data: BookingRequestData
): Promise<void> => {
  try {
    // 1. 지역별일정 시트에서 해당 시간대 찾기
    const scheduleResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "지역별일정!A:E",  // E열까지 범위 확장
    });

    const rows = scheduleResponse.data.values;
    const rowIndex = rows.findIndex((row: string[]) => {
      try {
        return row[0] === data.region &&
          standardizeDate(row[1]) === standardizeDate(data.date) &&
          standardizeTime(row[2]) === standardizeTime(data.time);
      } catch (error) {
        console.error(`🚨 [ERROR] 행 데이터 처리 중 오류:`, { row, error });
        return false;
      }
    });

    const scheduleRowIndex = rowIndex + 1;

    // 2. D열이 이미 '예약완료'인지 확인
    if (rows[rowIndex][3] === '예약완료') {
      throw new Error("이미 예약된 시간입니다");
    }

    // 3. D열 상태 업데이트
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `지역별일정!D${scheduleRowIndex}:E${scheduleRowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [["예약완료", `${data.name} (${data.phone})`]]
      }
    });

  } catch (error) {
    console.error(`🚨 [ERROR] 예약 상태 업데이트 실패:`, error);
    throw error;
  }
};

// 전화번호 형식 통일 함수 추가
const formatPhoneNumber = (phone: string): string => {
  // 숫자만 추출
  const numbers = phone.replace(/[^0-9]/g, '');
  // 11자리가 아니면 원본 반환
  if (numbers.length !== 11) return phone;
  // 010-1234-5678 형식으로 변환
  return numbers.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
};

// 예약확정 시트에 예약 정보 기록
const recordBookingInfo = async (
  sheets: any,
  spreadsheetId: string,
  data: BookingRequestData,
  timestamp: string
): Promise<void> => {
  const formattedPhone = formatPhoneNumber(data.phone);
  console.log(`📝 [DEBUG] 예약 정보 기록 시작 - 이름: ${data.name}, 전화번호: ${formattedPhone}`);
  
  // 1. 예약확정 시트에서 사용자 정보 확인
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "예약확정!A:F",
  });

  if (!response.data || !response.data.values) {
    throw new Error("시트 데이터를 읽을 수 없습니다");
  }

  const rows = response.data.values;
  
  // 2. 전화번호(B열)와 이름(A열) 모두 일치하는 행 찾기
  const rowIndex = rows.findIndex((row: string[]) => {
    const rowFormattedPhone = formatPhoneNumber(row[1] || '');
    return row && rowFormattedPhone === formattedPhone && row[0] === data.name;
  });

  // 3. 사용자 정보가 없는 경우
  if (rowIndex === -1) {
    console.log(`⚠️ [ERROR] 계약자 정보를 찾을 수 없음:`, {
      name: data.name,
      phone: formattedPhone
    });
    throw new Error("계약자 정보를 찾을 수 없습니다");
  }

  // 4. 이미 예약이 있는지 확인 (E열)
  if (rows[rowIndex][4]) {
    console.log(`⚠️ [ERROR] 이미 예약이 존재함:`, {
      name: data.name,
      phone: formattedPhone,
      existingBooking: rows[rowIndex][4]
    });
    throw new Error("이미 예약이 존재합니다");
  }

  // 5. 예약 정보 기록 (E열: 예약 날짜/시간, F열: 기록 시간)
  const actualRowIndex = rowIndex + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `예약확정!E${actualRowIndex}:F${actualRowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        `${data.date} ${data.time}`,
        timestamp
      ]]
    }
  });

  // 6. 기록 확인
  const verifyResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `예약확정!E${actualRowIndex}:F${actualRowIndex}`,
  });

  if (!verifyResponse.data?.values?.[0]?.[0]) {
    throw new Error("예약 정보 기록 실패");
  }

  console.log(`✅ [DEBUG] 예약 정보 기록 완료:`, {
    rowIndex: actualRowIndex,
    bookingDateTime: `${data.date} ${data.time}`,
    recordedAt: timestamp
  });
};

export async function POST(request: Request): Promise<NextResponse<BookingResponseData>> {
  const requestStartTime = formatToKoreanTimestamp(new Date());
  
  try {
    const data: BookingRequestData = await request.json();
    const { name, phone, date, time, region } = data;

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      throw new Error("GOOGLE_SHEET_ID is not defined");
    }

    const sheets = await getSheets();
    
    // 1. 먼저 지역별일정 시트 업데이트
    console.log(`📝 [DEBUG] 지역별일정 시트 업데이트 시작`);
    await updateScheduleStatus(sheets, spreadsheetId, data);
    console.log(`✅ [DEBUG] 지역별일정 시트 업데이트 완료`);

    // 2. 그 다음 예약확정 시트에 기록
    console.log(`📝 [DEBUG] 예약확정 시트 기록 시작`);
    const timestamp = formatToKoreanTimestamp(new Date());
    await recordBookingInfo(sheets, spreadsheetId, data, timestamp);
    console.log(`✅ [DEBUG] 예약확정 시트 기록 완료`);

    const response: BookingResponseData = {
      success: true,
      message: "예약이 완료되었습니다.",
      timestamp,
      requestStartTime,
      requestEndTime: formatToKoreanTimestamp(new Date()),
      data: {
        name,
        phone,
        formattedDateTime: `${date} ${time}`,
        formattedTimestamp: timestamp
      }
    };

    return NextResponse.json(response);
    
  } catch (error: any) {
    if (error.message === "Failed to acquire lock") {
      return NextResponse.json({
        success: false,
        error: "현재 다른 예약이 처리중입니다. 잠시 후 다시 시도해주세요.",
        requestStartTime,
        requestEndTime: formatToKoreanTimestamp(new Date())
      });
    }

    if (error.message === "Time slot already booked") {
      return NextResponse.json({
        success: false,
        error: "죄송합니다. 이미 예약된 시간입니다.",
        requestStartTime,
        requestEndTime: formatToKoreanTimestamp(new Date())
      });
    }

    console.error("🚨 [ERROR] 예약 처리 중 오류 발생:", error);
    return NextResponse.json({
      success: false,
      error: "예약 처리 중 오류가 발생했습니다.",
      details: error instanceof Error ? error.message : "Unknown error",
      requestStartTime,
      requestEndTime: formatToKoreanTimestamp(new Date())
    });
  }
}