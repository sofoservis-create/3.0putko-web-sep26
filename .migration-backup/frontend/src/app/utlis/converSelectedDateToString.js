const converSelectedDateToString = ([startDate, endDate], language = 'en') => {
  const options = {
    month: 'long', // Use 'long' for full month names
    day: '2-digit'
  };

  const locale = language === 'sk' ? 'sk-SK' : 'en-US';

  const format = (date) => {
    if (!date) return "";
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d)) return ""; // prevent crash
    return d.toLocaleDateString(locale, options);
  };

  const start = format(startDate);
  const end = format(endDate);

  return end ? `${start} - ${end}` : start;
};

export default converSelectedDateToString;
