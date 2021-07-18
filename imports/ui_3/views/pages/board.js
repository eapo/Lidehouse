/* globals document */

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';

import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/methods.js';
import '/imports/api/topics/actions.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import '/imports/ui_3/views/components/collapse-section.js';
import '/imports/ui_3/views/components/new-forum-topic.js';
import '/imports/ui_3/views/components/attachments.js';
import '../components/topic-box.js';
import '../components/topic-vote-box.js';
import '../components/comments-section.js';
import '../components/balance-widget.js';
import './board.html';

Template.Board.onCreated(function boardOnCreated() {
  this.autorun(() => {
    const communityId = ModalStack.getVar('communityId');
    this.subscribe('topics.active', { communityId });
  });
});

Template.Board.helpers({
  activeVotingsTitle() {
    const communityId = ModalStack.getVar('communityId');
    const topicsCount = Topics.find({ communityId, category: 'vote', closed: false }).count();
    return `${__('Active votings')} (${topicsCount})`;
  },
  topics(category) {
    const communityId = ModalStack.getVar('communityId');
    return Topics.find({ communityId, category, closed: false }, { sort: { createdAt: -1 } });
  },
});

Template.News.helpers({
  topics(category, stickyVal) {
    const communityId = ModalStack.getVar('communityId');
    return Topics.find({ communityId, category, closed: false, sticky: stickyVal }, { sort: { createdAt: -1 } });
  },
});
