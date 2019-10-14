import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';

import { getActiveCommunityId } from '/imports/api/communities/communities.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { chooseSubAccount } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { chooseAccountNode } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';

export const TxDefs = new Mongo.Collection('txdefs');

TxDefs.define = function define(doc) {
  TxDefs.upsert({ communityId: doc.communityId, name: doc.name }, { $set: doc });
};

TxDefs.clone = function clone(name, communityId) {
  const doc = TxDefs.findOne({ name, communityId: null });
  if (!doc) return undefined;
  delete doc._id;
  doc.communityId = communityId;
  return TxDefs.insert(doc);
};

TxDefs.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
  name: { type: String, max: 100 },
  debit: { type: String, max: 100, autoform: chooseAccountNode, optional: true },
  credit: { type: String, max: 100, autoform: chooseAccountNode, optional: true },
});

TxDefs.helpers({
  schema() {
    const schema = new SimpleSchema([
      _.clone(Transactions.baseSchema), {
        debit: { type: String, autoform: chooseSubAccount('COA', this.debit) },
        credit: { type: String, autoform: chooseSubAccount('COA', this.credit) },
      }, _.clone(Transactions.noteSchema),
    ]);
    schema.i18n('schemaTransactions');
    return schema;
  },
  transformToTransaction(doc) {
    doc.debit = [{ account: doc.debit }];
    doc.credit = [{ account: doc.credit }];
  },
  select() {
    const selector = {
      communityId: this.communityId,
      'debit.account': this.debit,
      'credit.account': this.credit,
    };
    const txs = Transactions.find(selector);
    return txs;
  },
  subscribe() {
    //??
  },
});

TxDefs.attachSchema(TxDefs.schema);
TxDefs.attachBehaviour(Timestamped);

Meteor.startup(function attach() {
  TxDefs.simpleSchema().i18n('schemaTxDefs');
});