// MonthYearSelector.tsx
import React from "react";

interface MonthYearSelectorProps {
  value: string;
  onChange: (value: string) => void;
  maxDate?: Date;
  label: string;
  error?: string;
}

const MonthYearSelector = ({
  value,
  onChange,
  maxDate = new Date(),
  label,
  error,
}: MonthYearSelectorProps) => {
  const currentYear = maxDate.getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const [selectedYear, selectedMonth] = value
    ? value.split("-").map(Number)
    : [];

  const handleMonthChange = (monthIndex: number) => {
    const month = String(monthIndex + 1).padStart(2, "0");
    onChange(`${selectedYear || currentYear}-${month}`);
  };

  const handleYearChange = (year: number) => {
    const month = selectedMonth ? String(selectedMonth).padStart(2, "0") : "01";
    onChange(`${year}-${month}`);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        <select
          value={selectedYear || ""}
          onChange={(e) => handleYearChange(parseInt(e.target.value))}
          className="w-1/2 px-3 py-2 border rounded-md"
          required
        >
          <option value="">Year</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <select
          value={selectedMonth ? selectedMonth - 1 : ""}
          onChange={(e) => handleMonthChange(parseInt(e.target.value))}
          className="w-1/2 px-3 py-2 border rounded-md"
          required
        >
          <option value="">Month</option>
          {months.map((month, index) => (
            <option
              key={month}
              value={index}
              disabled={new Date(selectedYear || currentYear, index) > maxDate}
            >
              {month}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default MonthYearSelector;
