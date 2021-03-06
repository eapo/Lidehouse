import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

export const Roles = new Mongo.Collection('roles');

Roles.schema = new SimpleSchema({
  name: { type: String, max: 100 },
  protected: { type: Boolean, optional: true },
});

Roles.attachSchema(Roles.schema);

// Deny all client-side updates since we will be using methods to manage this collection
Roles.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
