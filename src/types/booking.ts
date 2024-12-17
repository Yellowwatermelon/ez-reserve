export interface BookingRequestData {
  name: string;
  phone: string;
  region: string;
  date: string;
  time: string;
}

export interface BookingResponseData {
  success: boolean;
  error?: string;
  message?: string;
  timestamp?: string;
  requestStartTime?: string;
  requestEndTime?: string;
  data?: {
    name: string;
    phone: string;
    formattedDateTime: string;
    formattedTimestamp: string;
  };
}