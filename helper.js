// function to sort date/time
export const SORT_FUNC = {
  date_time: (a, b) =>
  {
    const dateA = a.date_time.split(' ')[0].split('/');
    const dateB = b.date_time.split(' ')[0].split('/');
    if (dateA[2] - dateB[2] !== 0) return dateA[2] - dateB[2]; // year
    if (dateA[1] - dateB[1] !== 0) return dateA[1] - dateB[1]; // month
    if (dateA[0] - dateB[0] !== 0) return dateA[0] - dateB[0]; // day
    const timeA = a.date_time.split(' ')[1].split(':');
    const timeB = b.date_time.split(' ')[1].split(':');
    if (timeA[0] - timeB[0] !== 0) return timeA[0] - timeB[0]; // hour
    return timeA[1] - timeB[1]; // minutes
  },
  shape: (a, b) =>
  {
    if (a.shape < b.shape) return -1;
    if (a.shape > b.shape) return 1;
    return 0;
  },
  city: (a, b) =>
  {
    if (a.city < b.city) return -1;
    if (a.city > b.city) return 1;
    return 0;
  },
};

// get array of all shapes
export const getShapesArr = (allSightingsArr) => {
  const shapesArr = [];
  allSightingsArr.forEach((sighting) => {
    if (shapesArr.includes(sighting.shape)) return;
    shapesArr.push(sighting.shape);
  });
  return shapesArr;
};

// format form details before putting to JSON
export const formatSighting = (sighting, mode) => {
  const date = new Date();

  // data validation for back-end
  if (sighting.dd === 'Day' || sighting.mm === 'Month' || sighting.yy === 'Year') return null; // date
  if (sighting.hours === 'Hour' || sighting.minutes === 'Minutes') return null; // time
  if (!sighting.city || !sighting.state || !sighting.duration || !sighting.text) return null;
  if (!sighting.shape || (sighting.shape === 'others' && !sighting.other_shape)) return null; // shape
  if (Number.isNaN(Number(sighting.duration))) return null; // check duration is number

  // date validation
  // eslint-disable-next-line max-len
  if (sighting.yy === date.getFullYear().toString().slice(2) && (sighting.mm > date.getMonth() + 1 || (sighting.mm === date.getMonth() + 1 && sighting.dd > date.getDate()))) return null;

  // make summary property (text up to 100 char)
  sighting.summary = sighting.text;
  if (sighting.text.length > 100) {
    sighting.summary = sighting.text.slice(0, 100);
  }

  // city - capitalise
  sighting.city = sighting.city.charAt(0).toUpperCase() + sighting.city.slice(1);

  // shape - capitalise, format others
  if (sighting.shape === 'others') {
    sighting.shape = sighting.other_shape;
  }
  sighting.shape = sighting.shape.charAt(0).toUpperCase() + sighting.shape.slice(1);
  delete sighting.other_shape;

  // duration - append "minutes"
  sighting.duration = `${sighting.duration} minutes`;

  // date/time of sighting
  sighting.date_time = `${sighting.dd}/${sighting.mm}/${sighting.yy} ${sighting.hours}:${sighting.mins}`;
  delete sighting.dd;
  delete sighting.mm;
  delete sighting.yy;
  delete sighting.hours;
  delete sighting.mins;

  // date/time created/edited
  const currDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().slice(2)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  sighting.time_edited = currDate;
  if (mode === 'create') {
    sighting.time_created = currDate;
  }
  return sighting;
};

// visit counter for user
export const countUserVisits = (numUserVisits, lastVisitDate) => {
  const date = new Date();
  const currDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

  let updatedUserVisits = numUserVisits ? Number(numUserVisits) : 0;
  if (currDate !== lastVisitDate) {
    updatedUserVisits += 1;
  }
  return { updatedUserVisits, currDate };
};

export const updateCookies = (cookies, visits) => {
  // get favourites from cookies
  const favourites = cookies.favourites ? cookies.favourites : [];

  // get/create id
  const userIndex = cookies.userID ? Number(cookies.userID) : visits.length;

  // get no. of user visits, update number of visits in db
  const { updatedUserVisits, currDate } = countUserVisits(cookies.visits, cookies.lastVisited);

  // calculate total no. of visits (from all users)
  visits[userIndex] = updatedUserVisits;
  const totalVisits = visits.reduce((acc, curr) => acc + curr, 0);

  return {
    favourites, userIndex, updatedUserVisits, currDate, totalVisits,
  }; };
