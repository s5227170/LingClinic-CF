const dateInPast = (date: Date) => {
  let formattedDate = new Date(date);
  let tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return formattedDate < tomorrow;
};

export default dateInPast;
