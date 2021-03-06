import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';

import { insertDemoFixture } from '/imports/api/fixtures.js';

// if the database is empty on server start, create some sample data.
Meteor.startup(() => {
  const languages = TAPi18n.getLanguages();
  Object.keys(languages).forEach((lang) => {
    insertDemoFixture(lang);
  });
});
