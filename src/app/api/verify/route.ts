import { NextResponse } from "next/server";
import { getSheets } from "@/utils/sheets";

const LOG_SHEET_NAME = '조회이력';

async function logVerification(sheets: any, userData: any) {
  try {
    const now = new Date();
    const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));

    const logData = [
      kstNow.toISOString(),
      userData.name,
      userData.phone,
      userData.region,
      'VERIFY',
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${LOG_SHEET_NAME}!A:E`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [logData]
      }
    });

    console.log('✅ [DEBUG] 조회 이력 저장 완료:', logData);
  } catch (error) {
    console.error('🚨 [ERROR] 조회 이력 저장 실패:', error);
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.NEXT_PUBLIC_API_KEY) {
      console.error('🚨 [ERROR] 잘못된 API 키:', apiKey);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, phone } = await request.json();
    
    const sheets = await getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "문자발송!A:E",
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { error: "등록된 계약자 정보가 없습니다" },
        { status: 404 }
      );
    }

    // 1. 전화번호로 먼저 사용자 찾기
    const userByPhone = rows.find((row: any[]) => 
      row[1] === phone
    );

    // 2. 찾은 사용자의 이름이 일치하는지 확인
    if (!userByPhone) {
      return NextResponse.json(
        { error: "등록된 계약자 정보가 없습니다" },
        { status: 404 }
      );
    }

    if (userByPhone[0] !== name) {
      return NextResponse.json(
        { error: "등록된 계약자 정보가 없습니다" },
        { status: 404 }
      );
    }

    if (userByPhone[4] === "OK") {
      return NextResponse.json(
        { error: "이미 예약이 되어있습니다" },
        { status: 400 }
      );
    }

    await logVerification(sheets, {
      name,
      phone,
      region: userByPhone[3],
    });

    return NextResponse.json({
      success: true,
      data: {
        region: userByPhone[3]
      }
    });
  } catch (error) {
    console.error('🚨 [ERROR] 사용자 확인 실패:', error);
    return NextResponse.json(
      { error: '사용자 확인 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}