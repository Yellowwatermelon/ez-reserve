export interface ScheduleItem {
  지역: string;
  날짜: string;
  시간: string;
  상태?: string;
}

export interface ScheduleResponse {
  data?: ScheduleItem[];
  error?: string;
} 