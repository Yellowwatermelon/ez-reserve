// 날짜를 YYYY-MM-DD 형식으로 표준화
export const standardizeDate = (date: string): string => {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      throw new Error("Invalid date");
    }
    return d.toISOString().split('T')[0];
  } catch (error) {
    console.error(`🚨 [ERROR] 날짜 변환 실패:`, { date, error });
    throw new Error(`Invalid date format: ${date}`);
  }
};

// 시간을 HH:mm 24시간 형식으로 표준화
export const standardizeTime = (time: string): string => {
  try {
    // 시간 문자열에서 숫자만 추출
    const numbers = time.replace(/[^0-9]/g, '');
    
    // 시간과 분을 추출
    let hours: number;
    let minutes: number;
    
    if (numbers.length === 4) {
      hours = parseInt(numbers.slice(0, 2));
      minutes = parseInt(numbers.slice(2));
    } else if (numbers.length === 3) {
      hours = parseInt(numbers.slice(0, 1));
      minutes = parseInt(numbers.slice(1));
    } else {
      throw new Error("Invalid time format");
    }

    // 12시간제 처리
    if ((time.includes('오후') || time.toLowerCase().includes('pm')) && hours < 12) {
      hours += 12;
    }
    if ((time.includes('오전') || time.toLowerCase().includes('am')) && hours === 12) {
      hours = 0;
    }

    // 유효성 검사
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error("Invalid time values");
    }

    // HH:mm 형식으로 반환
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error(`🚨 [ERROR] 시간 변환 실패:`, { time, error });
    throw new Error(`Invalid time format: ${time}`);
  }
};
