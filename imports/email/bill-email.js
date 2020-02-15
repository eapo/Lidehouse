import { Meteor } from 'meteor/meteor';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { __ } from '/imports/localization/i18n.js';
import '/imports/api/users/users.js';
import { Parcels } from '../api/parcels/parcels';

export const Bill_Email = {
  path: 'email/bill-email.html',    // Relative to the 'private' dir.
  // scss: 'email/style.css',             // Mail specific SCSS.

  layoutData: {
    type: 'New bill',
    alert: 'good',
  },

  helpers: {
    parcelRef(parcelId) {
      return Parcels.findOne(parcelId).ref;
    },
  },

  route: {
    path: '/bill-email/:bid',
    data: (params) => {
      const bill = Transactions.findOne(params.bid);
      return {
        user: bill.partner().user(),
        community: bill.community(),
        bill,
        ...Bill_Email.layoutData,
      };
    },
  },
};
