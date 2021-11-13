/* eslint-disable consistent-return */

import express from 'express';
import methodOverride from 'method-override';
import moment from 'moment';
import cookieParser from 'cookie-parser';
import {
  read, add, edit, write,
} from './jsonFileStorage.js';
import {
  SORT_FUNC, getShapesArr, formatSighting, updateCookies,
} from './helper.js';

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(express.static('public'));
app.use(cookieParser());

moment.defaultFormat = 'DD.MM.YY HH:mm';

// main page - list of all sightings
app.get('/', (req, res) => {
  read('data.json', (readErr, content) => {
    if (readErr) return `read error: ${readErr}`;

    // cookies related
    const {
      favourites, userIndex, updatedUserVisits, currDate, totalVisits,
    } = updateCookies(req.cookies, content.visits);

    res.cookie('userID', userIndex);
    res.cookie('visits', updatedUserVisits);
    res.cookie('lastVisited', currDate);

    write('data.json', content, (writeErr) => {
      if (writeErr) return `writeErr: ${writeErr}`;

      // add index as a property (to create url to view that sighting)
      const { sightings } = content;
      sightings.forEach((sighting, index) => {
        sighting.index = index;
        sighting.isFav = favourites.includes(index);
      });

      // sort
      const { sort, order } = req.query;
      const page = req.query.page || 1;
      const show = req.query.show || 5;
      sightings.sort(SORT_FUNC[sort]);
      if (order === 'desc') {
        sightings.reverse();
      }

      res.render('index', {
        sightings, totalVisits, sort, order, page, show,
      });
    });
  });
});

// create new sighting
app.post('/sightings', (req, res) => {
  // clean up new sighting object
  const content = formatSighting(req.body, 'create');
  // if invalid fields, render 'new' form with previous fields and validation remarks
  if (!content) {
    read('data.json', (readErr, data) => {
      if (readErr) return `read error: ${readErr}`;

      // cookies related
      const {
        favourites, userIndex, updatedUserVisits, currDate, totalVisits,
      } = updateCookies(req.cookies, data.visits);

      res.cookie('userID', userIndex);
      res.cookie('visits', updatedUserVisits);
      res.cookie('lastVisited', currDate);

      write('data.json', data, (writeErr) => {
        if (writeErr) return `writeErr: ${writeErr}`;

        res.render('amend-new-sighting', { content: req.body, shapes: getShapesArr(data.sightings), totalVisits });
      });
    });
    return;
  }
  // redirect to that sighting if success
  add('data.json', 'sightings', content, (writeErr) => {
    if (writeErr) {
      res.status(500).send('DB Write Error');
      return;
    }
    read('data.json', (readErr, { sightings }) => {
      res.redirect(`/sightings/${sightings.length - 1}`);
    });
  });
});

// render form to create new sighting
app.get('/sightings', (req, res) => {
  read('data.json', (readErr, content) => {
    if (readErr) return `read error: ${readErr}`;

    // cookies related
    const {
      favourites, userIndex, updatedUserVisits, currDate, totalVisits,
    } = updateCookies(req.cookies, content.visits);

    res.cookie('userID', userIndex);
    res.cookie('visits', updatedUserVisits);
    res.cookie('lastVisited', currDate);

    write('data.json', content, (writeErr) => {
      if (writeErr) return `writeErr: ${writeErr}`;

      res.render('new-sighting', {
        shapes: getShapesArr(content.sightings), totalVisits,
      });
    });
  });
});

// render ONE sighting
app.get('/sightings/:index', (req, res) => {
  read('data.json', (readErr, content) => {
    if (readErr) return `read error: ${readErr}`;

    // cookies related
    const {
      favourites, userIndex, updatedUserVisits, currDate, totalVisits,
    } = updateCookies(req.cookies, content.visits);

    res.cookie('userID', userIndex);
    res.cookie('visits', updatedUserVisits);
    res.cookie('lastVisited', currDate);

    write('data.json', content, (writeErr) => {
      if (writeErr) return `writeErr: ${writeErr}`;

      const { index } = req.params;
      const { sightings } = content;

      // check if favourite
      const isFav = favourites.includes(Number(index));

      // format dates using moment
      const date = moment(sightings[index].date_time, moment.defaultFormat).format('dddd, MMMM Do YYYY, HH:mm');
      const sighted = moment(sightings[index].date_time, moment.defaultFormat).fromNow();
      const created = sightings[index].time_created ? moment(sightings[index].time_created, moment.defaultFormat).fromNow() : 'unknown';
      const edited = sightings[index].time_edited ? moment(sightings[index].time_edited, moment.defaultFormat).fromNow() : 'unknown';

      res.render('sightings', {
        // eslint-disable-next-line max-len
        sighting: sightings[index], date, sighted, created, edited, index, totalVisits, isFav, index,
      });
    });
  });
});

// edit ONE sighting
app.put('/sightings/:index', (req, res) => {
  const { index } = req.params;
  edit('data.json', (readErr, { sightings }) => {
    if (readErr) return `read error: ${readErr}`;
    const content = formatSighting(req.body, 'edit');
    if (content) {
      sightings[index] = content;
    }
  }, (writeErr) => {
    if (writeErr) return `write error: ${writeErr}`;
    res.redirect(`/sightings/${index}`);
  });
});

// render form to edit ONE sighting
app.get('/sightings/:index/edit', (req, res) => {
  read('data.json', (readErr, content) => {
    if (readErr) return `read error: ${readErr}`;

    // cookies related
    const {
      favourites, userIndex, updatedUserVisits, currDate, totalVisits,
    } = updateCookies(req.cookies, content.visits);

    res.cookie('userID', userIndex);
    res.cookie('visits', updatedUserVisits);
    res.cookie('lastVisited', currDate);

    write('data.json', content, (writeErr) => {
      if (writeErr) return `writeErr: ${writeErr}`;

      const { index } = req.params;
      const { sightings } = content;

      res.render('edit-sighting', { sighting: sightings[index], shapes: getShapesArr(sightings), totalVisits });
    });
  });
});

// delete ONE sighting
app.delete('/sightings/:index', (req, res) => {
  const { index } = req.params;
  edit('data.json', (readErr, { sightings }) => {
    if (readErr) return `read error: ${readErr}`;
    sightings.splice(index, 1);
    const favourites = req.cookies.favourites ? req.cookies.favourites : [];
    if (favourites.includes(Number(index))) {
      favourites.splice(favourites.indexOf(Number(index)), 1);
    }
    res.cookie('favourites', favourites);
  }, (writeErr) => {
    if (writeErr) return `write error: ${writeErr}`;
    if (req.get('Referer').match(/[0-9]$/)) {
      res.redirect('/');
      return;
    }
    res.redirect(req.get('Referer'));
  });
});

// render page with list of all shapes
app.get('/shapes', (req, res) => {
  read('data.json', (readErr, content) => {
    if (readErr) return `read error: ${readErr}`;

    // cookies related
    const {
      favourites, userIndex, updatedUserVisits, currDate, totalVisits,
    } = updateCookies(req.cookies, content.visits);

    res.cookie('userID', userIndex);
    res.cookie('visits', updatedUserVisits);
    res.cookie('lastVisited', currDate);

    write('data.json', content, (writeErr) => {
      if (writeErr) return `writeErr: ${writeErr}`;

      const { sightings } = content;

      res.render('shapes', { shapes: getShapesArr(sightings), totalVisits });
    });
  });
});

// render page with sightings of a specific shape
app.get('/shapes/:shape', (req, res) => {
  const { shape } = req.params;
  read('data.json', (readErr, content) => {
    if (readErr) return `read error: ${readErr}`;

    // cookies related
    const {
      favourites, userIndex, updatedUserVisits, currDate, totalVisits,
    } = updateCookies(req.cookies, content.visits);

    res.cookie('userID', userIndex);
    res.cookie('visits', updatedUserVisits);
    res.cookie('lastVisited', currDate);

    write('data.json', content, (writeErr) => {
      if (writeErr) return `writeErr: ${writeErr}`;

      const { sightings } = content;
      sightings.forEach((sighting, index) => {
        sighting.index = index;
        sighting.isFav = favourites.includes(index);
      });

      // get all sightings of specific shape
      const sightingsArr = [];
      sightings.forEach((sighting) => {
        if (sighting.shape.toLowerCase() === shape) {
          sightingsArr.push(sighting);
        }
      });

      // sort
      const { sort, order } = req.query;
      const page = req.query.page || 1;
      const show = req.query.show || 5;
      sightingsArr.sort(SORT_FUNC[sort]);
      if (order === 'desc') {
        sightingsArr.reverse();
      }

      res.render('shape', {
        sightings: sightingsArr, totalVisits, sort, order, page, show,
      });
    });
  });
});

// make favourite
app.get('/favourites/:index', (req, res) => {
  const { index } = req.params;

  const favourites = req.cookies.favourites ? req.cookies.favourites : [];
  if (favourites.includes(Number(index))) {
    favourites.splice(favourites.indexOf(Number(index)), 1);
  } else {
    favourites.push(Number(index));
  }

  res.cookie('favourites', favourites);
  res.redirect(req.get('Referer'));
});

// render list of favourites
app.get('/favourites', (req, res) => {
  read('data.json', (readErr, content) => {
    if (readErr) return `read error: ${readErr}`;

    // cookies related
    const {
      favourites, userIndex, updatedUserVisits, currDate, totalVisits,
    } = updateCookies(req.cookies, content.visits);

    res.cookie('userID', userIndex);
    res.cookie('visits', updatedUserVisits);
    res.cookie('lastVisited', currDate);

    write('data.json', content, (writeErr) => {
      if (writeErr) return `writeErr: ${writeErr}`;

      const { sightings } = content;
      sightings.forEach((sighting, index) => {
        sighting.index = index;
        sighting.isFav = favourites.includes(index);
      });

      // get all sightings favourited
      const favouritesArr = [];
      favourites.forEach((favIndex, currentIndex) => {
        const currentSighting = sightings[favIndex];
        if (!sightings[favIndex]) {
          favourites.splice(currentIndex, 1);
        } else {
          currentSighting.index = favIndex;
          favouritesArr.push(currentSighting);
        }
      });

      // sort
      const { sort, order } = req.query;
      const page = req.query.page || 1;
      const show = req.query.show || 5;
      favouritesArr.sort(SORT_FUNC[sort]);
      if (order === 'desc') {
        favouritesArr.reverse();
      }

      res.cookie('favourites', favourites);
      res.render('favourites', {
        sightings: favouritesArr, totalVisits, sort, order, page, show,
      });
    });
  });
});

app.listen(3004);
