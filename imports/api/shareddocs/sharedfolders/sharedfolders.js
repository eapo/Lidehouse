import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';

import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';

// Declare store collection
export const Sharedfolders = new Mongo.Collection('sharedfolders');

// Setting up collection permissions
Sharedfolders.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

Sharedfolders.schema = new SimpleSchema({
  _id: { type: String, optional: true, /* using the folder name */ autoform: { omit: true } },
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { type: 'hidden' } },
  name: { type: String },
  externalUrl: { type: String, optional: true },
});

Sharedfolders.attachSchema(Sharedfolders.schema);
Sharedfolders.attachBehaviour(Timestamped);

Sharedfolders.simpleSchema().i18n('schemaSharedfolders');

Factory.define('sharedfolder', Sharedfolders, {
  name: () => faker.random.word(),
});
