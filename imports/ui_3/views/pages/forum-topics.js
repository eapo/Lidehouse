import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { AutoForm } from 'meteor/aldeed:autoform';
import { $ } from 'meteor/jquery';

import { handleError } from '/imports/ui_3/lib/errors';
import { Topics } from '/imports/api/topics/topics.js';
//import '/imports/ui_3/stylesheets/animatecss/animate.css';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '/imports/ui_3/views/modals/voting-edit.js';
import '/imports/ui_3/views/components/new-forum-topic.js';
import '../common/page-heading.js';
import '../components/topic-vote-box.js';
import '../components/voting-list.html';
import './vote-topics.html';
import './forum-topics.html';

Template.Forum_topics.onCreated(function boardOnCreated() {
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('topics.list', { communityId, category: 'forum' });
  });
});

Template.Forum_topics.helpers({
  forumTopics() {
    const communityId = Session.get('activeCommunityId');
    const topics = Topics.find(
      { communityId, category: 'forum' },
      { sort: { closed: 1, updatedAt: -1 } }
//    { sort: { createdAt: -1 } }
    );
//  .fetch().sort((t1, t2) => t2.likesCount() - t1.likesCount());
    return topics;
  },
});

Template.Forum_topics.events({
  'click .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.forumtopic.insert',
      collection: Topics,
      schema: Topics.schema,
      omitFields: ['communityId', 'userId', 'category', 'agendaId', 'sticky'],
      type: 'method',
      meteormethod: 'topics.insert',
    });
  },
  'click .js-like'(event) {
    const id = $(event.target).closest('div.vote-item').data('id');
    Topics.methods.like.call({ id }, handleError);
  },
  'click .js-show' (event) {
    $('.new-topic').toggleClass("hidden");
    $('.js-show').toggleClass("m-b");
  },
  'click .js-send' (event) {
    $('.new-topic').toggleClass("hidden");
    $('.js-show').toggleClass("m-b");
  },
});

AutoForm.addModalHooks('af.forumtopic.insert');
AutoForm.addHooks('af.forumtopic.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.category = 'forum';
    doc.status = Topics._transform(doc).startStatus().name;
    if (!doc.title && doc.text) {
      doc.title = (doc.text).substring(0, 25) + '...';
    }
    return doc;
  },
});
