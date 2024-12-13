export interface UserData {
  name: string;
  email: string;
  verified: boolean;
}

export interface ApiResponse {
  data?: UserData;
  error?: string;
}

export interface SheetData {
  name: string;
  phone: string;
  sentPhone: string;
  region: string;
  confirmation: string;
}

export interface SheetApiResponse {
  data?: SheetData[];
  error?: string;
} 