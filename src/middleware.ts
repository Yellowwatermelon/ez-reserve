import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // API 경로에 대해서만 검증
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.NEXT_PUBLIC_API_KEY;
    
    // API 키가 없거나 일치하지 않는 경우
    if (!apiKey || apiKey !== validApiKey) {
      console.error('🚨 [ERROR] 잘못된 API 키:', apiKey);
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
}; 