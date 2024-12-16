const dotenv = require('dotenv');
require('isomorphic-fetch');

dotenv.config({ path: '.env.local' });

/**
 * @typedef {Object} BookingResponse
 * @property {boolean} success
 * @property {string} [error]
 * @property {Object} [data]
 * @property {string} data.encryptedDate
 * @property {string} data.encryptedTime
 * @property {string} data.encryptedTimestamp
 */

async function testConcurrentBooking() {
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  console.log('📝 [DEBUG] API Key:', API_KEY ? '설정됨' : '미설정');

  const bookingRequests = [
    { selectedDate: new Date(), selectedTime: "09:30", region: "서울" },
    { selectedDate: new Date(), selectedTime: "09:30", region: "서울" },
    { selectedDate: new Date(), selectedTime: "09:30", region: "서울" }
  ];

  console.log('동시성 테스트 시작...');
  
  try {
    const results = await Promise.all(
      bookingRequests.map(async (data) => {
        const response = await fetch('http://localhost:3000/api/booking/test', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-api-key': API_KEY || 'ez-reserve-api-key-2023'
          },
          body: JSON.stringify(data)
        });
        
        const responseData = await response.json();
        console.log(`📝 [DEBUG] 응답 상태: ${response.status}`, responseData);
        return responseData;
      })
    );

    console.log('테스트 결과:', results);
  } catch (error) {
    console.error('🚨 [ERROR] 테스트 실행 중 오류:', error);
  }
}

testConcurrentBooking(); 