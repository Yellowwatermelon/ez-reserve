import { NextResponse } from "next/server";
import type { SheetApiResponse } from "@/types/api";
import { getSheets } from "@/utils/sheets";

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
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      throw new Error("GOOGLE_SHEET_ID is not defined");
    }

    const sheets = await getSheets();
    const response = await fetchUserDataWithRetry(sheets, spreadsheetId);

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "No data found" }, 
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

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Google Sheets API Error:', error);
    return NextResponse.json(
      { error: "Failed to fetch Google Sheet data" },
      { status: 500 }
    );
  }
} 