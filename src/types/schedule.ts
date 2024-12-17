export interface ScheduleItem {
  날짜: string;
  시간: string;
  상태: string;
  지역: string;
}

export interface ScheduleResponse {
  data?: ScheduleItem[];
  error?: string;
  timestamp?: string;
} 