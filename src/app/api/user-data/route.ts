import { NextResponse } from "next/server";
import { getSheets } from "@/utils/sheets";
import type { SheetApiResponse } from "@/types/api";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const fetchUserDataWithRetry = async (sheets: any, spreadsheetId: string) => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "문자발송!A:E",
      });
      console.log(`✅ [DEBUG] 사용자 데이터 조회 성공 (시도: ${attempt})`);
      return response;
    } catch (error) {
      console.error(`🚨 [ERROR] 사용자 데이터 조회 실패 (시도: ${attempt}):`, error);
      if (attempt === MAX_RETRIES) throw error;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  return null;
};

export async function GET(request: Request): Promise<NextResponse<SheetApiResponse>> {
  try {
    // API 키 확인
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.NEXT_PUBLIC_API_KEY) {
      console.error('🚨 [ERROR] 잘못된 API 키:', apiKey);
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized',
          data: []
        },
        { status: 401 }
      );
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      throw new Error("GOOGLE_SHEET_ID is not defined");
    }

    const sheets = await getSheets();
    const response = await fetchUserDataWithRetry(sheets, spreadsheetId);

    if (!response) {
      throw new Error("Failed to fetch user data after retries");
    }

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: "No data found",
          data: []
        },
        { status: 404 }
      );
    }

    // 필요한 필드만 반환
    const data = rows.slice(1).map((row: string[]) => ({
      name: row[0],
      phone: row[1],
      region: row[3],
      confirmation: row[4] || "",
    }));

    return NextResponse.json({ 
      success: true,
      data,
      error: undefined
    });
  } catch (error) {
    console.error('🚨 [ERROR] 사용자 데이터 조회 실패:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '사용자 데이터를 불러오는데 실패했습니다',
        data: []
      },
      { status: 500 }
    );
  }
} 