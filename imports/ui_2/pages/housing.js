import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { TAPi18n } from 'meteor/tap:i18n';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { $ } from 'meteor/jquery';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { Accounts } from 'meteor/accounts-base';

import { Memberships } from '/imports/api/memberships/memberships.js';
import { roleshipColumns } from '/imports/api/memberships/tables.js';
import { update as updateMembership, remove as removeMembership } from '/imports/api/memberships/methods.js';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';
import '/imports/api/users/users.js';
import '../modals/confirmation.js';
import '../modals/autoform-edit.js';
import './housing.html';

Template.Housing_page.onCreated(function () {
});

Template.Housing_page.helpers({
  reactiveTableDataFn() {
    return () => {
      const communityId = Session.get('activeCommunityId');
      return Memberships.find({ communityId, role: { $not: { $in: ['owner', 'benefactor', 'guest'] } } }).fetch();
    };
  },
  optionsFn() {
    return () => {
      return {
        columns: roleshipColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    };
  },
});

Template.Housing_page.events({
  'click .js-new'() {
    Modal.show('Autoform_edit', {
      id: 'af.roleship.insert',
      collection: Memberships,
      omitFields: ['communityId', 'parcelId', 'ownership', 'benefactorship', 'idCard'],
      type: 'method',
      meteormethod: 'memberships.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click .js-edit'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.roleship.update',
      collection: Memberships,
      omitFields: ['communityId', 'parcelId', 'ownership', 'benefactorship', 'idCard'],
      doc: Memberships.findOne(id),
      type: 'method-update',
      meteormethod: 'memberships.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    });
  },
  'click .js-view'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.roleship.view',
      collection: Memberships,
      omitFields: ['communityId', 'parcelId', 'ownership', 'benefactorship', 'idCard'],
      doc: Memberships.findOne(id),
      type: 'readonly',
      template: 'bootstrap3-inline',
    });
  },
  'click .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(removeMembership, { _id: id }, {
      action: 'delete roleship',
    });
  },
});

AutoForm.addModalHooks('af.roleship.insert');
AutoForm.addModalHooks('af.roleship.update');
AutoForm.addHooks('af.roleship.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});

/*   sortables() {
     $( "ul.droptrue" ).sortable({
      connectWith: ".js-sort-list"
     });
	
    // $( "#sortable1" ).disableSelection();
	
*/

/*/ https://stackoverflow.com/questions/17030845/how-does-one-actually-use-markdown-with-meteor

Template.Housing.rendered = function() {
  setPageTitle("*your* ~~markdown~~ _data_");
};

Template.Housing.markdown_data = function() {return Session.get("markdown_data")});

function setPageTitle(titleName) {
  var prefix = "## Welcome";

  if ($('section').hasClass('single')) {
	Session.set("markdown_data",prefix + titleName);
  }
}
*/