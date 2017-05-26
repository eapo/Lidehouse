import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';

import { Comments } from '../comments/comments.js';

class TopicsCollection extends Mongo.Collection {
  insert(topic, callback) {
    const ourTopic = topic;
    return super.insert(ourTopic, callback);
  }
  remove(selector, callback) {
    Comments.remove({ topicId: selector });
    return super.remove(selector, callback);
  }
}

export const Topics = new TopicsCollection('topics');

Topics.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id },
  category: { type: String, allowedValues: ['vote', 'forum', 'news'] },
  title: { type: String, max: 100 },
  text: { type: String },
  createdAt: { type: Date, denyUpdate: true, autoValue() { if (this.isInsert) { return new Date(); } } },
  unreadCount: { type: Number, defaultValue: 0 },
});

Topics.attachSchema(Topics.schema);

Topics.helpers({
  editableBy(userId) {
    if (!this.userId) { return true; }
    return this.userId === userId;
  },
  comments() {
    return Comments.find({ topicId: this._id }, { sort: { createdAt: -1 } });
  },
});

// Deny all client-side updates since we will be using methods to manage this collection
Topics.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

// This represents the keys from Topics objects that should be published to the client.
// If we add secret properties to Topic objects, don't list them here to keep them private to the server.
Topics.publicFields = {
  communityId: 1,
  userId: 1,
  category: 1,
  title: 1,
  text: 1,
  createdAt: 1,
  unreadCount: 1,
};

Factory.define('topic', Topics, {
  communityId: () => Factory.get('community'),
});
