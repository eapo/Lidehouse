import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';
import { Topics } from '/imports/api/topics/topics.js';
import { feedbackColumns } from '/imports/api/topics/feedbacks/tables.js';
import './feedbacks.html';

Template.Feedbacks.onCreated(function onCreated() {
  this.subscribe('feedbacks.listing');
});

Template.Feedbacks.helpers({
  feedbacks() {
    return Topics.find({ category: 'feedback' });
  },
  reactiveTableDataFn() {
    function getTableData() {
      return Topics.find({ category: 'feedback' }).fetch();
    }
    return getTableData;
  },
  optionsFn() {
    function getOptions() {
      return {
        columns: feedbackColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    }
    return getOptions;
  },
});

Template.Feedbacks.events({
  'click .js-view'(event) {
    const id = $(event.target).data('id');
    const modalContext = {
      title: 'Feedback',
      body: 'Chatbox',
      bodyContext: Topics.findOne(id),
    };
    Modal.show('Modal', modalContext);
  },
});