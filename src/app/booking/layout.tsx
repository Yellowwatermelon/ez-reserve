import { Metadata } from "next"

export const metadata: Metadata = {
  title: '예약하기',
  description: '원하시는 날짜와 시간을 선택하여 예약을 진행하세요',
}

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 