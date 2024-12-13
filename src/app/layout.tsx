import { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    template: '%s | SK매직 정기점검 예약',
    default: 'SK매직 정기점검 예약',
  },
  description: 'SK매직 정기점검 예약 시스템',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
