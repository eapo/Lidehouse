import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';
import { Journals } from './journals.js';
import { AccountSpecification } from './account-specification.js';

if (Meteor.isClient) {
  export const JournalEntries = new Mongo.Collection(null);

  JournalEntries.helpers({
    effectiveAmount() {
      let effectiveSign = 0;
      if (this.side === 'credit') effectiveSign = -1;
      if (this.side === 'debit') effectiveSign = +1;
      return this.amount * effectiveSign;
    },
    journal() {
      return Journals.findOne(this.txId);
    },
    contra() {
      function otherSide(side) {
        if (side === 'credit') return 'debit';
        if (side === 'debit') return 'credit';
        debugAssert(false); return undefined;
      }
      const contraEntries = this.journal()[otherSide(this.side)];
//      debugger;
      if (!contraEntries) return '';
      const contraAccount = AccountSpecification.fromDoc(contraEntries[0]);
      return contraAccount;
    },
  });

  Meteor.startup(function syncEntriesWithJournals() {
    const callbacks = {
      added(doc) {
        doc.journalEntries().forEach(entry => {
          JournalEntries.insert(_.extend(entry, { txId: doc._id }));
        });
      },
      changed(newDoc, oldDoc) {
        console.log("Changed journal noticed:", oldDoc);
      },
      removed(doc) {
        JournalEntries.remove({ txId: doc._id });
      },
    };
    Journals.find().observe(callbacks);
  });
}
