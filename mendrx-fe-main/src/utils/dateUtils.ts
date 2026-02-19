export const calculateAgeAsOnReportDate = (birthMonth: string, reportDate: string): number => {
  const [birthYear, birthMonthNum] = birthMonth.split('-').map(Number);
  const reportDateObj = new Date(reportDate);
  const reportYear = reportDateObj.getFullYear();
  const reportMonth = reportDateObj.getMonth() + 1; // getMonth() returns 0-11

  let age = reportYear - birthYear;

  // Adjust age if report month is before birth month
  if (reportMonth < birthMonthNum) {
    age--;
  }

  return age;
}; 