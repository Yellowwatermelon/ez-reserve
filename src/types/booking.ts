export interface BookingRequestData {
  name: string;
  phone: string;
  time: string;
  date: string;
  region: string;
}

export interface BookingResponseData {
  success: boolean;
  message?: string;
  error?: string;
  details?: string;
  requestStartTime?: string;
  requestEndTime?: string;
  timestamp?: string;
  data?: {
    name: string;
    phone: string;
    formattedDateTime: string;
    formattedTimestamp: string;
  };
}