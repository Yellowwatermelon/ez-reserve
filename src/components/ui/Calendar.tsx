"use client";

import React from "react";

interface CalendarProps {
  scheduleData: ScheduleItem[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  currentDate: Date;
  availableDates: string[];
}

const daysOfWeek = ["일", "월", "화", "수", "목", "금", "토"];

const Calendar: React.FC<CalendarProps> = ({
  scheduleData,
  selectedDate,
  onDateSelect,
  currentDate,
  availableDates,
}) => {
  const startOfWeek = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
  };

  const hasSchedule = (date: Date): boolean => {
    const standardizedDate = standardizeDate(date.toISOString());
    return availableDates.includes(standardizedDate);
  };

  const getAvailableDates = (): number[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return availableDates
      .map(dateStr => new Date(dateStr))
      .filter(date => date >= today)
      .sort((a, b) => a.getTime() - b.getTime())
      .slice(0, 3)
      .map(date => date.getDate());
  };

  const renderWeek = (startDate: Date) => {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      const isAvailable = hasSchedule(currentDate);
      const isSelected = selectedDate?.toDateString() === currentDate.toDateString();
      const isPast = currentDate < new Date();

      const dateClass = isSelected
        ? "bg-selected text-white font-bold"
        : isAvailable && !isPast
          ? "bg-secondary text-white cursor-pointer hover:bg-selected hover:font-bold"
          : "bg-muted/50 text-black cursor-not-allowed";

      week.push(
        <div
          key={i}
          className={`flex flex-col items-center justify-center p-2 rounded ${dateClass}`}
          onClick={() => isAvailable && !isPast && onDateSelect(currentDate)}
          style={{
            minWidth: "45px",
            maxWidth: "45px",
            height: "52px",
          }}
        >
          <span className="font-bold">{daysOfWeek[i]}</span>
          <span className="font-bold">{currentDate.getDate()}</span>
        </div>
      );
    }
    return week;
  };

  const startDate = startOfWeek(currentDate);
  const availableDates = getAvailableDates();

  return (
    <div className="calendar w-full max-w-screen-sm mx-auto">
      <div className="text-center mb-4 p-2 bg-white rounded-md shadow-sm">
        {availableDates.length > 0 ? (
          <>
            <span className="text-black font-bold text-lg">· 예약 가능일:</span>{" "}
            <span className="text-selected font-bold text-lg">
              {availableDates.map((date, index) => (
                <React.Fragment key={date}>
                  {index > 0 && <span className="text-gray-400 mx-2">·</span>}
                  {date}일
                </React.Fragment>
              ))}
            </span>
          </>
        ) : (
          <span className="text-black font-bold text-lg">예약 가능한 시간대가 없습니다.</span>
        )}
      </div>
      <div className="grid grid-cols-7 gap-2 text-center">
        {renderWeek(startDate)}
      </div>
    </div>
  );
};

export default Calendar; 