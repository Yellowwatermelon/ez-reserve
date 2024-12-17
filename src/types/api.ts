export interface UserData {
  name: string;
  email: string;
  verified: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface SheetData {
  name: string;
  phone: string;
  region: string;
  confirmation: string;
}

export interface SheetApiResponse extends ApiResponse {
  data?: SheetData[];
}

export interface ScheduleApiResponse extends ApiResponse {
  data?: ScheduleItem[];
}

export interface VerifyApiResponse extends ApiResponse {
  data?: {
    region: string;
  };
} 