import { Metadata } from "next";

export const metadata: Metadata = {
  title: '계약자 확인',
  description: '계약자 정보를 입력하여 예약을 진행하세요',
};

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 