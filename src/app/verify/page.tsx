"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaUser, FaPhone } from "react-icons/fa";
import Layout from "@/components/common/Layout";
import Button from "@/components/ui/Button";
import LoadingScreen from "@/components/common/LoadingScreen";
import "@/styles/globals.css";
import { encrypt } from '@/utils/crypto';
import { delay } from '@/utils/delay';

interface ApiError {
  message: string;
}

interface UserData {
  name: string;
  phone: string;
  confirmation: string;
  region: string;
}

const ERROR_MESSAGES = {
  NO_USER: "등록된 계약자 정보가 없습니다",
  ALREADY_BOOKED: "이미 예약이 되어있습니다",
  FETCH_ERROR: "데이터를 가져오는데 실패했습니다",
} as const satisfies Record<string, string>;

const ERROR_DISPLAY_DURATION = 2000;

export default function Verify() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    const storedPhone = localStorage.getItem("userPhone");
    if (storedName) setName(storedName);
    if (storedPhone) setPhone(storedPhone);
  }, []);

  const validatePhone = (phone: string) =>
    /^01[0-9]{8,9}$/.test(phone.replace(/-/g, ""));

  const validateName = (name: string) => name.trim().length >= 2;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, "");
    let formattedPhone = input;

    if (input.length > 3 && input.length <= 7) {
      formattedPhone = `${input.slice(0, 3)}-${input.slice(3)}`;
    } else if (input.length > 7) {
      formattedPhone = `${input.slice(0, 3)}-${input.slice(3, 7)}-${input.slice(7)}`;
    }

    setPhone(formattedPhone);
  };

  const validateForm = (name: string, phone: string): { isValid: boolean; error?: string } => {
    if (!validateName(name)) {
      return { isValid: false, error: ERROR_MESSAGES.NO_USER };
    }
    if (!validatePhone(phone)) {
      return { isValid: false, error: ERROR_MESSAGES.NO_USER };
    }
    return { isValid: true };
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await delay(1000);
      const validation = validateForm(name, phone);
      if (!validation.isValid && validation.error) {
        setShowErrorMessage(validation.error);
        setTimeout(() => setShowErrorMessage(null), ERROR_DISPLAY_DURATION);
        setLoading(false);
        return;
      }

      const cleanPhone = phone.replace(/-/g, "");
      
      const response = await fetch("/api/user-data", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || ''
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('🚨 [ERROR] API 호출 실패:', errorData);
        setShowErrorMessage(ERROR_MESSAGES.FETCH_ERROR);
        setTimeout(() => setShowErrorMessage(null), ERROR_DISPLAY_DURATION);
        setLoading(false);
        return;
      }

      const { data: userData } = await response.json();
      if (!userData || !Array.isArray(userData)) {
        console.error('🚨 [ERROR] 잘못된 데이터 형식:', userData);
        setShowErrorMessage(ERROR_MESSAGES.FETCH_ERROR);
        setTimeout(() => setShowErrorMessage(null), ERROR_DISPLAY_DURATION);
        setLoading(false);
        return;
      }

      console.log('📡 [DEBUG] 사용자 데이터:', userData);

      const user = userData.find((row) => row.phone === cleanPhone);
      console.log('🔍 [DEBUG] Found user:', user);

      if (!user || user.name !== name) {
        setShowErrorMessage(ERROR_MESSAGES.NO_USER);
        setTimeout(() => setShowErrorMessage(null), ERROR_DISPLAY_DURATION);
        setLoading(false);
        return;
      }

      localStorage.setItem("userName", encrypt(name));
      localStorage.setItem("userPhone", encrypt(cleanPhone));
      localStorage.setItem("userRegion", encrypt(user.region));

      if (user.confirmation === "OK") {
        setShowErrorMessage(ERROR_MESSAGES.ALREADY_BOOKED);
        setTimeout(() => setShowErrorMessage(null), ERROR_DISPLAY_DURATION);
        setLoading(false);
        return;
      }

      setLoading(false);
      router.push("/booking");
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다";
      setShowErrorMessage(errorMessage);
      setTimeout(() => setShowErrorMessage(null), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Layout>
        <div className="flex flex-col justify-between min-h-screen relative">
          <div className="relative flex-grow">
            {loading && <LoadingScreen message="계약자 정보 확인 중" blur={true} />}
            <div className="flex-grow p-4 space-y-6">
              <div className="h-20"></div>
              <div className="space-y-4">
                <div className="text-lg bg-gray-100 p-4 rounded-lg">
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center">
                      <FaUser
                        className="text-blue-500 mr-2"
                        style={{ width: "24px", height: "24px" }}
                      />
                      <label className="font-semibold">계약자 성명</label>
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-500 rounded focus:outline-none focus:border-blue-500 placeholder:text-base placeholder:font-normal"
                      placeholder="계약자 성명을 입력하세요"
                    />
                    <div className="flex items-center mt-4">
                      <FaPhone
                        className="text-blue-500 mr-2"
                        style={{ width: "24px", height: "24px" }}
                      />
                      <label className="font-semibold">계약자 전화번호</label>
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      className="w-full px-3 py-2 border border-gray-500 rounded focus:outline-none focus:border-blue-500 placeholder:text-base placeholder:font-normal"
                      placeholder="계약자 전화번호를 입력하세요 (숫자만)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {showErrorMessage && (
            <div
              className="absolute bg-red-500 text-white text-center py-2 rounded"
              style={{
                width: "calc(100% - 32px)",
                margin: "0 auto",
                top: "calc(50% + 40px)",
                left: "16px",
                right: "16px",
              }}
            >
              {showErrorMessage}
            </div>
          )}

          <div className="fixed bottom-0 left-0 w-full bg-white p-4">
            <Button
              onClick={handleSubmit}
              className={`w-full text-lg py-4 transition-all ${
                loading
                  ? "bg-secondary text-white opacity-50 cursor-not-allowed"
                  : "bg-selected text-white font-bold hover:opacity-90"
              }`}
              disabled={loading}
            >
              {loading ? "확인 중..." : "확인"}
            </Button>
          </div>
        </div>
      </Layout>
    </>
  );
}
