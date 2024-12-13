import { Metadata } from "next"

export const metadata: Metadata = {
  title: '나의 혜택',
  description: 'SK매직 추천 상품 및 프로모션',
}

export default function PromotionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 