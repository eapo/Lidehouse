import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { __ } from '/imports/localization/i18n.js';
import { getActiveCommunity } from '/imports/ui_3/lib/active-community.js';

import './meters-widget.html';

Template.Meters_widget.viewmodel({
  autorun() {
    const communityId = ModalStack.getVar('communityId');
    this.templateInstance.subscribe('parcels.ofSelf', { communityId });
  },
  ownedParcels() {
    const user = Meteor.user();
    const communityId = ModalStack.getVar('communityId');
    if (!user || !communityId) return [];
    return user.ownedParcels(communityId);
  },
  oldestReadMeter() {
    const meter = _.sortBy(this.ownedParcels().map(p => p.oldestReadMeter()), m => m?.lastReadingDate().getTime())[0];
    return meter;
  },
  lastReadingDate() {
    const meter = this.oldestReadMeter();
    return meter && meter.lastReading().date;
  },
  colorClass() {
    const meter = this.oldestReadMeter();
    const color = meter && meter.lastReadingColor();
    return color ? 'bg-' + color : 'navy-bg';
  },
  icon() {
    return 'fa fa-tachometer';
  },
  message() {
    return 'Message';
  },
});

Template.Meters_widget.events({
  'click .js-meters'(event, instance) {
    const community = getActiveCommunity();
    const communityId = community._id;
    const user = Meteor.user();
    Modal.show('Modal', {
      title: __('meters'),
      body: 'Meters_box',
      bodyContext: { community },
      size: user.hasPermission('meters.update', { communityId }) ? 'lg' : 'md',
    });
  },
});
