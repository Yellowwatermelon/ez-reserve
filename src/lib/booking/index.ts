import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';
import { getSheets } from '@/utils/sheets';
import { standardizeDate, standardizeTime } from '@/utils/date';
import type { ScheduleItem } from '@/types/schedule';
import { encrypt } from '@/utils/crypto';

type Sheets = sheets_v4.Sheets;

export interface BookingStatus {
  isAvailable: boolean;
  message?: string;
}

export interface TransactionResult {
  success: boolean;
  message: string;
  data?: {
    date: string;
    time: string;
    status: string;
    timestamp: string;
  };
}

export interface BookingData {
  selectedDate: Date | null;
  selectedTime: string | null;
  region: string;
}

export interface BookingResult {
  success: boolean;
  error?: string;
  data?: {
    encryptedDate: string;
    encryptedTime: string;
    encryptedTimestamp: string;
  };
}

class BookingManager {
  private static instance: BookingManager;
  private sheets: sheets_v4.Sheets | null = null;
  private readonly LOCK_TIMEOUT = 30000; // 30초
  private readonly SHEET_NAME = '예약현황';  // 시트 이름
  private readonly COLUMN_RANGE = 'A:F';    // 열 범위
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  private constructor() {}

  public static getInstance(): BookingManager {
    if (!BookingManager.instance) {
      BookingManager.instance = new BookingManager();
    }
    return BookingManager.instance;
  }

  private async initSheets() {
    try {
      if (!this.sheets) {
        // 환경변수 확인 로그
        console.log('📊 [DEBUG] 환경변수 확인:', {
          sheetId: process.env.GOOGLE_SHEET_ID ? '설정됨' : '미설정',
          clientEmail: process.env.GOOGLE_CLIENT_EMAIL ? '설정됨' : '미설정',
          privateKey: process.env.GOOGLE_PRIVATE_KEY ? '설정됨' : '미설정'
        });

        this.sheets = await getSheets();
      }
      return this.sheets;
    } catch (error) {
      console.error('🚨 [ERROR] Sheets 초기화 실패:', error);
      throw error;
    }
  }

  private async getSheetData(retryCount = 0): Promise<any[]> {
    try {
      console.log(`📊 [DEBUG] 시트 데이터 조회 시도 (${retryCount + 1}회차)`);
      const sheets = await this.initSheets();
      
      if (!sheets) {
        throw new Error('Google Sheets 클라이언트 초기화 실패');
      }

      // 시트 정보 조회
      const sheetInfo = await sheets.spreadsheets.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
      });

      // 시트 ID 찾기
      const targetSheet = sheetInfo.data.sheets?.find(
        sheet => sheet.properties?.title === this.SHEET_NAME
      );

      if (!targetSheet?.properties?.sheetId) {
        throw new Error(`시트를 찾을 수 없습니다: ${this.SHEET_NAME}`);
      }

      // 시트 ID를 사용하여 데이터 조회
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `'${this.SHEET_NAME}'!${this.COLUMN_RANGE}`,
      });

      console.log('📊 [DEBUG] 조회된 데이터:', response.data.values);
      return response.data.values || [];
    } catch (error) {
      console.error(`🚨 [ERROR] 시트 데이터 조회 실패 (${retryCount + 1}회차):`, error);
      if (retryCount < this.MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this.getSheetData(retryCount + 1);
      }
      throw error;
    }
  }

  private async updateCell(range: string, value: any, retryCount = 0): Promise<void> {
    try {
      const actualRange = `'${this.SHEET_NAME}'!${range.split('!')[1]}`;  // 시트 이름 처리
      console.log(`📝 [DEBUG] 셀 업데이트 시도 (${retryCount + 1}회차):`, {
        range: actualRange,
        value,
        timestamp: new Date().toISOString()
      });

      const sheets = await this.initSheets();
      
      if (!sheets) {
        throw new Error('Google Sheets 클라이언트 초기화 실패');
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: actualRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[value]]
        }
      });

      console.log(`✅ [DEBUG] 셀 업데이트 성공:`, { range: actualRange, value });
    } catch (error) {
      console.error(`🚨 [ERROR] 셀 업데이트 실패 (${retryCount + 1}회차):`, error);
      if (retryCount < this.MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this.updateCell(range, value, retryCount + 1);
      }
      throw error;
    }
  }

  private findBookingRow(data: any[], date: string, time: string, region: string): number {
    return data.findIndex((row) => 
      row[0] === date && 
      row[1] === time && 
      row[3] === region
    );
  }

  private isLockExpired(lockTimestamp: string): boolean {
    return Date.now() - new Date(lockTimestamp).getTime() > this.LOCK_TIMEOUT;
  }

  private validateBookingData(bookingData: BookingData): string | null {
    const { selectedDate, selectedTime } = bookingData;
    
    if (!selectedDate || !selectedTime) {
      return '날짜와 시간을 선택해주세요';
    }

    const standardizedDate = standardizeDate(selectedDate.toISOString());
    const standardizedTime = standardizeTime(selectedTime);

    if (!standardizedDate || !standardizedTime) {
      return '날짜 또는 시간 형식이 올바르지 않습니다';
    }

    return null;
  }

  public async checkAvailability(bookingData: BookingData): Promise<BookingStatus> {
    try {
      const validationError = this.validateBookingData(bookingData);
      if (validationError) {
        return { isAvailable: false, message: validationError };
      }

      const { selectedDate, selectedTime, region } = bookingData;
      const standardizedDate = standardizeDate(selectedDate!.toISOString());
      const standardizedTime = standardizeTime(selectedTime!);

      const data = await this.getSheetData();
      const rowIndex = this.findBookingRow(data, standardizedDate, standardizedTime, region);

      if (rowIndex === -1) {
        return { isAvailable: false, message: '예약 가능한 시간이 아닙니다' };
      }

      const row = data[rowIndex];
      const status = row[2]; // 예약상태
      const lockTimestamp = row[4]; // 잠금시간

      if (status === '예약완료') {
        return { isAvailable: false, message: '이미 예약된 시간입니다' };
      }

      if (status === '예약중' && lockTimestamp && !this.isLockExpired(lockTimestamp)) {
        return { isAvailable: false, message: '다른 사용자가 예약을 진행중입니다' };
      }

      return { isAvailable: true };
    } catch (error) {
      console.error('예약 가능 여부 확인 중 오류:', error);
      throw new Error('예약 가능 여부 확인 중 오류가 발생했습니다');
    }
  }

  public async processBooking(bookingData: BookingData): Promise<TransactionResult> {
    console.log('🔄 [DEBUG] 예약 처리 시작:', bookingData);
    try {
      const validationError = this.validateBookingData(bookingData);
      if (validationError) {
        return { success: false, message: validationError };
      }

      const { selectedDate, selectedTime, region } = bookingData;
      const standardizedDate = standardizeDate(selectedDate!.toISOString());
      const standardizedTime = standardizeTime(selectedTime!);
      const bookingTimestamp = new Date().toISOString();
      
      // 1. 예약 가능 여부 확인
      const availability = await this.checkAvailability(bookingData);
      if (!availability.isAvailable) {
        return { 
          success: false, 
          message: availability.message || '예약할 수 없는 시간입니다' 
        };
      }

      const data = await this.getSheetData();
      const rowIndex = this.findBookingRow(data, standardizedDate, standardizedTime, region);
      const actualRow = rowIndex + 1;

      // 2. 잠금 설정
      console.log('🔒 [DEBUG] 잠금 설정 시작');
      const lockTimestamp = new Date().toISOString();
      await this.updateCell(
        `예약현황!C${actualRow}`,
        '예약중'
      );
      await this.updateCell(
        `예약현황!E${actualRow}`,
        lockTimestamp
      );
      console.log('✅ [DEBUG] 잠금 설정 완료');

      // 3. 최종 예약 처리
      console.log('📝 [DEBUG] 최종 예약 처리 시작');
      await this.updateCell(
        `예약현황!C${actualRow}`,
        '예약완료'
      );
      await this.updateCell(
        `예약현황!E${actualRow}`,
        ''
      );
      console.log('✅ [DEBUG] 최종 예약 처리 완료');

      console.log('📝 [DEBUG] 예약 데이터 저장:', {
        date: standardizedDate,
        time: standardizedTime,
        timestamp: bookingTimestamp
      });

      return { 
        success: true, 
        message: '예약이 완료되었습니다',
        data: {
          date: standardizedDate,
          time: standardizedTime,
          status: '예약완료',
          timestamp: bookingTimestamp
        }
      };
    } catch (error) {
      console.error('🚨 [ERROR] 예약 ��리 중 오류:', error);
      // 롤백 처리
      console.log('↩️ [DEBUG] 롤백 처리 시작');
      try {
        const data = await this.getSheetData();
        const rowIndex = this.findBookingRow(
          data, 
          standardizeDate(bookingData.selectedDate!.toISOString()),
          standardizeTime(bookingData.selectedTime!),
          bookingData.region
        );
        const actualRow = rowIndex + 1;
        
        await this.updateCell(
          `예약현황!C${actualRow}`,
          '예약가능'
        );
        await this.updateCell(
          `예약현황!E${actualRow}`,
          ''
        );
        console.log('✅ [DEBUG] 롤백 처리 완료');
      } catch (rollbackError) {
        console.error('🚨 [ERROR] 롤백 처리 실패:', rollbackError);
      }

      throw new Error('예약 처리 중 오류가 발생했습니다');
    }
  }

  public async handleBookingConfirmation(bookingData: BookingData): Promise<BookingResult> {
    try {
      const result = await this.processBooking(bookingData);
      
      if (!result.success) {
        return {
          success: false,
          error: result.message
        };
      }

      if (!result.data) {
        throw new Error('예약 데이터가 없습니다');
      }

      // 암호화된 예약 데이터 ���환
      return {
        success: true,
        data: {
          encryptedDate: encrypt(result.data.date),
          encryptedTime: encrypt(result.data.time),
          encryptedTimestamp: encrypt(result.data.timestamp)
        }
      };
    } catch (error) {
      console.error('예약 확인  오류:', error);
      return {
        success: false,
        error: '예약 처리 중 오류가 발생했습니다'
      };
    }
  }
}

export const bookingManager = BookingManager.getInstance(); 