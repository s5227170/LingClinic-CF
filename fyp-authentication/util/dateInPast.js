const dateInPast = (date) => {
    let formattedDate = new Date(date)
    let tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0);
    return formattedDate < tomorrow;
  };

module.exports = dateInPast;