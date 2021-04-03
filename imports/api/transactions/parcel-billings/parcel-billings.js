import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Noted } from '/imports/api/behaviours/noted.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { ActivePeriod } from '/imports/api/behaviours/active-period.js';
import { Communities } from '/imports/api/communities/communities.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Meters } from '/imports/api/meters/meters.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { allowedOptions } from '/imports/utils/autoform.js';
import { displayMoney } from '/imports/ui_3/helpers/utils.js';

export const ParcelBillings = new Mongo.Collection('parcelBillings');

ParcelBillings.projectionBaseValues = ['absolute', 'area', 'volume', 'habitants'];
//ParcelBillings.monthValues = ['allMonths', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

const chooseFromExistingParcelTypes = {
  options() {
    const communityId = getActiveCommunityId();
    const parcelTypes = Communities.findOne(communityId).parcelTypeValues();
    return parcelTypes?.map(pt => ({ label: pt, value: pt })) || [];
  },
  type: 'select-checkbox',
};

const chooseFromExistingGroups = {
  options() {
    const parcels = Parcels.find({ communityId: getActiveCommunityId() }).fetch();
    const groups = _.without(_.uniq(_.pluck(parcels, 'group')), undefined);
    return groups?.map(g => ({ label: g, value: g })) || [];
  },
  firstOption: () => __('All'),
};

const chooseFromExistingServiceValues = {
  options() {
    const meters = Meters.find({ communityId: getActiveCommunityId() }).fetch();
    const serviceValues = _.without(_.uniq(_.pluck(meters, 'service')), undefined);
    return serviceValues?.map(s => ({ label: s, value: s })) || [];
  },
  firstOption: () => __('(Select one)'),
};

//----------------------------------------

ParcelBillings.chargeSchema = new SimpleSchema({
  uom: { type: String, max: 15 },
  unitPrice: { type: Number, decimal: true },
//  decimals: { type: Number, defaultValue: 3, max: 10 }, // how many decimals the readings accept and display
});

ParcelBillings.consumptionSchema = new SimpleSchema({
  service: { type: String, autoform: { ...chooseFromExistingServiceValues } },
  charges: { type: [ParcelBillings.chargeSchema] },
});

ParcelBillings.projectionSchema = new SimpleSchema({
  base: { type: String, allowedValues: ParcelBillings.projectionBaseValues, autoform: allowedOptions() },
  unitPrice: { type: Number, decimal: true },
});

ParcelBillings.appliedAtSchema = new SimpleSchema({
  date: { type: Date },
  period: { type: String, max: 7 /* TODO: check period format */ },
});

ParcelBillings.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  title: { type: String, max: 100 },
  consumption: { type: ParcelBillings.consumptionSchema, optional: true }, // if consumption based
  projection: { type: ParcelBillings.projectionSchema, optional: true },  // if projection based
  digit: { type: String, autoform: { ...Accounts.choosePayinType } },
  localizer: { type: String, autoform: { ...Parcels.choosePhysical } },
  type: { type: [String], autoform: { ...chooseFromExistingParcelTypes } },
  group: { type: String, optional: true, autoform: { ...chooseFromExistingGroups } },
  appliedAt: { type: [ParcelBillings.appliedAtSchema], defaultValue: [], autoform: { omit: true } },
});

const chooseParcelBilling = {
  options() {
    const communityId = ModalStack.getVar('communityId');
    const activeParcelBillingId = ModalStack.getVar('parcelBillingId');
    const parcelBillings = activeParcelBillingId
      ? ParcelBillings.find(activeParcelBillingId)
      : ParcelBillings.findActive({ communityId });
    const options = parcelBillings.map(function option(pb) {
      return { label: pb.toString(), value: pb._id };
    });
    const sortedOptions = _.sortBy(options, o => o.label.toLowerCase());
    return sortedOptions;
  },
};

function chooseParcelBillingLocalizer() {
  return _.extend(Parcels.chooseSubNode('@'), {
    value: () => {
      const activeParcelBillingId = ModalStack.getVar('parcelBillingId');
      const localizer = activeParcelBillingId
        ? ParcelBillings.findOne(activeParcelBillingId).localizer
        : '@';
      return localizer;
    },
  });
}

ParcelBillings.applySchema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  date: { type: Date, autoform: { value: new Date() } },
  ids: { type: [String], optional: true, regEx: SimpleSchema.RegEx.Id, autoform: _.extend({ type: 'select-checkbox', checked: true }, chooseParcelBilling) },
  localizer: { type: String, optional: true, autoform: chooseParcelBillingLocalizer() },
  withFollowers: { type: Boolean, optional: true, autoform: { disabled() { const loc = AutoForm.getFieldValue('localizer'); return !loc || loc === '@'; } } },
});

Meteor.startup(function indexParcelBillings() {
  ParcelBillings.ensureIndex({ communityId: 1 });
});

ParcelBillings.filterParcels = function filterParcels(communityId, localizer, withFollowers) {
  const selector = { communityId, category: '@property' };
  if (localizer) selector.code = new RegExp('^' + localizer);
  let parcels = Parcels.find(selector).fetch();
  if (withFollowers) parcels = parcels.map(p => p.withFollowers()).flat(1);
  return parcels;
};

ParcelBillings.helpers({
  community() {
    return Communities.findOne(this.communityId);
  },
  parcelsToBill() {
    const selector = { communityId: this.communityId, category: '@property' };
    if (this.localizer) selector.code = new RegExp('^' + this.localizer);
    if (this.type) selector.type = { $in: this.type };
    if (this.group) selector.group = this.group;
    const parcels = Parcels.find(selector).fetch();
    return parcels;
  },
  projectionUom() {
    switch (this.projection.base) {
      case 'absolute': return 'piece';
      case 'area': return 'm2';
      case 'volume': return 'm3';
      case 'habitants': return 'person';
      default: debugAssert(false, 'No such projection base'); return undefined;
    }
  },
  projectionQuantityOf(parcel) {
    switch (this.projection.base) {
      case 'absolute': return 1;
      case 'area': return (parcel.area || 0);
      case 'volume': return (parcel.volume || 0);
      case 'habitants': return (parcel.contract()?.habitants || 0);
      default: debugAssert(false, 'No such projection base'); return undefined;
    }
  },
  applyCount() {
//  return Transactions.find({ ref: this._id }).count();
    return this.appliedAt.length;
  },
  lastAppliedAt() {
    return _.last(this.appliedAt) || {};
  },
  alreadyAppliedAt(period) {
    const found = this.appliedAt.find(a => a.period === period);
    return found ? found.valueDate : undefined;
  },
  toString() {
    debugAssert(Meteor.isClient, 'Needs the active locale to display');
    const consumptionPart = this.consumption ? `${displayMoney(this.consumption.charges[0].unitPrice)}/${__('consumed')} ${this.consumption.charges[0].uom}` : '';
    const connectionPart = (this.consumption && this.projection) ? ` ${__('or')} ` : '';
    const projectionPart = this.projection ? `${displayMoney(this.projection.unitPrice)}/${__(this.projectionUom())})` : '';
    return `${this.title} (${consumptionPart}${connectionPart}${projectionPart})`;
  },
});

ParcelBillings.attachSchema(ParcelBillings.schema);
ParcelBillings.attachBehaviour(Noted);
ParcelBillings.attachBehaviour(ActivePeriod);
ParcelBillings.attachBehaviour(Timestamped);

ParcelBillings.simpleSchema().i18n('schemaParcelBillings');
ParcelBillings.applySchema.i18n('schemaParcelBillings');

Factory.define('parcelBilling', ParcelBillings, {
  title: faker.random.word(),
  projection: {
    base: 'absolute',
    unitPrice: faker.random.number(),
  },
  digit: '1',
  localizer: '@',
  notes: faker.random.word(),
});
