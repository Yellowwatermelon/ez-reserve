import { google } from 'googleapis';
import { getSheets } from '@/utils/sheets';

interface BookingStatus {
  isAvailable: boolean;
  message?: string;
}

interface TransactionResult {
  success: boolean;
  message: string;
  data?: {
    date: string;
    time: string;
    status: string;
    timestamp: string;
  };
}

export class BookingTransaction {
  private sheets: any = null;
  private spreadsheetId: string;
  private static BOOKING_RANGE = '예약현황!A:F';
  private static MAX_RETRIES = 3;
  private static RETRY_DELAY = 1000;

  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID || '';
    this.initSheets();
  }

  private async initSheets() {
    if (!this.sheets) {
      this.sheets = await getSheets();
    }
    return this.sheets;
  }

  private async getSheetData(retryCount = 0): Promise<any[]> {
    try {
      const sheets = await this.initSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: BookingTransaction.BOOKING_RANGE,
      });

      return response.data.values || [];
    } catch (error) {
      if (retryCount < BookingTransaction.MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, BookingTransaction.RETRY_DELAY));
        return this.getSheetData(retryCount + 1);
      }
      throw error;
    }
  }

  private async updateCell(range: string, value: any, retryCount = 0): Promise<void> {
    try {
      const sheets = await this.initSheets();
      await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[value]]
        }
      });
    } catch (error) {
      if (retryCount < BookingTransaction.MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, BookingTransaction.RETRY_DELAY));
        return this.updateCell(range, value, retryCount + 1);
      }
      throw error;
    }
  }

  private findRowIndex(data: any[], date: string, time: string): number {
    return data.findIndex((row) => 
      row[0] === date && row[1] === time
    );
  }

  public async checkAvailability(date: string, time: string): Promise<BookingStatus> {
    try {
      const data = await this.getSheetData();
      const rowIndex = this.findRowIndex(data, date, time);

      if (rowIndex === -1) {
        return { isAvailable: false, message: '예약 가능한 시간이 아닙니다' };
      }

      const status = data[rowIndex][2];
      if (status === '예약완료') {
        return { isAvailable: false, message: '이미 예약된 시간입니다' };
      }

      return { isAvailable: true };
    } catch (error) {
      throw new Error('예약 가능 여부 확인 중 오류가 발생했습니다');
    }
  }

  public async processBooking(date: string, time: string): Promise<TransactionResult> {
    try {
      // 1. 예약 가능 여부 확인
      const availability = await this.checkAvailability(date, time);
      if (!availability.isAvailable) {
        return { success: false, message: availability.message || '예약할 수 없는 시간��니다' };
      }

      const data = await this.getSheetData();
      const rowIndex = this.findRowIndex(data, date, time);
      const actualRow = rowIndex + 1;

      // 2. 예약 처리
      await this.updateCell(
        `예약현황!C${actualRow}`,
        '예약완료'
      );

      const timestamp = new Date().toISOString();
      return { 
        success: true, 
        message: '예약이 완료되었습니다',
        data: {
          date,
          time,
          status: '예약완료',
          timestamp
        }
      };
    } catch (error) {
      throw new Error('예약 처리 중 오류가 발생했습니다');
    }
  }
} 