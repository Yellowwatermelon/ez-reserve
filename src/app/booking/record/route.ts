import { NextResponse } from "next/server";
import type { BookingRequestData, BookingResponseData } from "@/types/booking";
import { getSheets } from "@/utils/sheets";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 한국 시간 포맷 함수
const formatToKoreanTimestamp = (date: string | Date): string => {
  const koreanDate = new Date(date);
  koreanDate.setHours(koreanDate.getHours() + 9);
  return koreanDate.toISOString().replace('T', ' ').substring(0, 19);
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// 예약 가능 여부 확인 함수
const checkAvailability = async (
  spreadsheetId: string,
  date: string,
  time: string
): Promise<number> => {
  const sheets = await getSheets();
  const scheduleResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "예약확정!A:F",
  });

  const rows = scheduleResponse.data.values || [];
  const bookedCount = rows.filter((row: string[]) => 
    row[4] && 
    row[4].includes(`${date} ${time}`) &&
    row[6] === "예약완료"
  ).length;

  return bookedCount;
};

// 예약 기록 함수
const recordBooking = async (
  sheets: any,
  spreadsheetId: string,
  data: BookingRequestData,
  timestamp: string
): Promise<boolean> => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "예약확정!A:G",
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: {
          values: [[
            data.name,
            data.phone,
            data.region,
            timestamp,
            `${data.date} ${data.time}`,
            "접수완료",
            "예약완료"
          ]],
        },
      });
      console.log(`✅ [DEBUG] 예약 기록 성공 (시도: ${attempt})`);
      return true;
    } catch (error) {
      console.error(`🚨 [ERROR] 예약 기록 실패 (시도: ${attempt}):`, error);
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  return false;
};

export async function POST(request: Request) {
  console.log("📡 [DEBUG] /api/booking/record 호출됨");
  try {
    const sheets = await getSheets();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      throw new Error("GOOGLE_SHEET_ID is not defined");
    }

    const data: BookingRequestData = await request.json();
    const { name, phone, time, date, region } = data;

    // 필수 필드 검증
    if (!name || !phone || !time || !date || !region) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 예약 대상자 확인
    const userResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "문자발송!A:E",
    });

    const rows = userResponse.data.values || [];
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No user data found" },
        { status: 404 }
      );
    }

    const rowIndex = rows.findIndex((row: string[]) => row[1] === phone);
    if (rowIndex === -1) {
      console.error("🚨 [ERROR] 예약 대상자를 시트에서 찾을 수 없음:", {
        phone,
        name,
      });
      return NextResponse.json(
        { error: "Invalid user" },
        { status: 400 }
      );
    }

    // 예약 시간대 중복 확인
    const checkResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "예약확정!A:G",
    });

    const isTimeSlotTaken = (checkResponse.data.values || [])
      .slice(1)
      .some((row: string[]) => 
        row[4] && 
        row[4].includes(`${date} ${time}`) &&
        row[6] === "예약완료"
      );

    if (isTimeSlotTaken) {
      return NextResponse.json(
        { error: "Time slot already taken" },
        { status: 409 }
      );
    }

    // 예약 가능 인원 확인
    const bookedCount = await checkAvailability(spreadsheetId, date, time);
    if (bookedCount >= 2) {
      return NextResponse.json(
        { error: "Time slot is full" },
        { status: 409 }
      );
    }

    // 예약 기록
    const timestamp = formatToKoreanTimestamp(new Date());
    await recordBooking(sheets, spreadsheetId, data, timestamp);

    const response: BookingResponseData = {
      success: true,
      message: "Booking successful",
      timestamp,
      data: {
        name,
        phone,
        formattedDateTime: `${date} ${time}`,
        formattedTimestamp: timestamp
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("🚨 [ERROR] 예약 처리 중 오류 발생:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "알 수 없는 오류"
      },
      { status: 500 }
    );
  }
} 