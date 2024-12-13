import { Metadata } from "next"

export const metadata: Metadata = {
  title: '예약 확정',
  description: '예약이 완료되었습니다',
}

export default function ConfirmLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 