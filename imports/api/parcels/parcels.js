import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Fraction } from 'fractional';
import { Tracker } from 'meteor/tracker';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { Log } from '/imports/utils/log.js';
import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { allowedOptions } from '/imports/utils/autoform.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { FreeFields } from '/imports/api/behaviours/free-fields.js';
import { Relations } from '/imports/api/core/relations.js';
import { Communities } from '/imports/api/communities/communities.js';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { ParcelRefFormat } from '/imports/comtypes/condominium/parcelref-format.js';
import { Meters } from '/imports/api/meters/meters.js';
import { ActiveTimeMachine } from '../behaviours/active-time-machine';

export const Parcels = new Mongo.Collection('parcels');

Parcels.categoryValues = ['@property', '@common', '@group', '#tag'];

Parcels.baseSchema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  category: { type: String, allowedValues: Parcels.categoryValues, autoform: { omit: true } },
  approved: { type: Boolean, autoform: { omit: true }, defaultValue: true },
  ref: { type: String,    // 1. unique reference within a community (readable by the user)
                          // 2. can be used to identify a parcel, which is not a true parcel, just a sub-part of a parcel
    autoValue() {
      if (!this.isSet) {
        const community = Meteor.isClient ? getActiveCommunity() : Communities.findOne(this.field('communityId').value);
        if (!community || !community.settings.parcelRefFormat) return undefined;
        const doc = { type: this.field('type').value, building: this.field('building').value, floor: this.field('floor').value, door: this.field('door').value };
        return ParcelRefFormat.createRefFromFields(community.settings.parcelRefFormat, doc);
      } else return undefined;
    },
  },
  code: { type: String, optional: true,
    autoValue() {
      if (this.isInsert && !this.isSet) {
        return this.field('category').value.charAt(0) + this.field('ref').value;
      } else if (this.isInsert && this.value.charAt(0) !== this.field('category').value.charAt(0)) {
        return this.field('category').value.charAt(0) + this.value;
      } else return undefined;
    },
  },
});

Parcels.physicalSchema = new SimpleSchema({
  type: { type: String, max: 25, optional: true },
  building: { type: String, max: 25, optional: true },
  floor: { type: String, max: 25, optional: true },
  door: { type: String, max: 25, optional: true },
  lot: { type: String, max: 100, optional: true },
  /* autoValue() {
        if (this.isInsert) return community().lot + '/A/' + serial;
        return undefined;
  */
});

Parcels.propertySchema = new SimpleSchema({
  serial: { type: Number, optional: true },
  units: { type: Number, optional: true },
  group: { type: String, max: 25, optional: true },
  // cost calculation purposes
  area: { type: Number, decimal: true, optional: true },
  volume: { type: Number, decimal: true, optional: true },
});

Parcels.publicFields = {
  // fields come from behaviours
};

Parcels.idSet = ['communityId', 'ref'];

Meteor.startup(function indexParcels() {
  Parcels.ensureIndex({ communityId: 1, ref: 1 });
  if (Meteor.isServer) {
    Parcels._ensureIndex({ communityId: 1, code: 1 });
    Parcels._ensureIndex({ lot: 1 });
  }
});

Parcels.helpers({
  entityName() {
    return this.category;
  },
  community() {
    return Communities.findOne(this.communityId);
  },
  leadParcelId() {
    const Contracts = Mongo.Collection.get('contracts');
    const contract = Contracts.findOneActive({ parcelId: this._id });
    return contract?.leadParcelId || this._id; // if can't find your lead parcel, lead yourself
  },
  leadParcel() {
    const leadParcelId = this.leadParcelId();
    return leadParcelId === this._id ? this : Parcels.findOne(leadParcelId);
  },
  leadParcelRef() {
    const leadParcel = this.leadParcel();
    return leadParcel.ref === this.ref ? undefined : leadParcel.ref;
  },
  isLed() {
    return (this.leadParcelId() !== this._id);
  },
  followers() {
    const Contracts = Mongo.Collection.get('contracts');
    const followerParcelIds = Contracts.findActive({ leadParcelId: this._id }).map(c => c.parcelId);
    return Parcels.find({ _id: { $in: _.without(followerParcelIds, this._id) } });
  },
  withFollowers() {
    return [this].concat(this.followers().fetch());
  },
  location() {  // TODO: move this to the house package
    return (this.building ? this.building + '-' : '')
      + (this.floor ? this.floor + '/' : '')
      + (this.door ? this.door : '');
  },
  meters() {
    return Meters.findActive({ communityId: this.communityId, parcelId: this._id });
  },
  oldestReadMeter() {
    return _.sortBy(this.meters().fetch(), m => m.lastReadingDate().getTime())[0];
  },
  occupants(active = true) {
    const Memberships = Mongo.Collection.get('memberships');
    const selector = { communityId: this.communityId, approved: true, parcelId: this.leadParcelId() };
    return active ? Memberships.findActive(selector) : Memberships.find(selector);
  },
  owners(active = true) {
    const Memberships = Mongo.Collection.get('memberships');
    const selector = { communityId: this.communityId, approved: true, parcelId: this.leadParcelId(), role: 'owner' };
    return active ? Memberships.findActive(selector) : Memberships.find(selector);
  },
  representors(active = true) {
    const Memberships = Mongo.Collection.get('memberships');
    const selector = { communityId: this.communityId, approved: true, parcelId: this.leadParcelId(), role: 'owner', 'ownership.representor': true };
    return active ? Memberships.findActive(selector) : Memberships.find(selector);
  },
  representor() {
    let representor = this.representors().fetch()[0];
    if (!representor) {
      const owners = this.owners().fetch();
      if (owners.length === 1) representor = owners[0];
    }
    return representor;
  },
  representorOrFirstOwner() {
    return this.representor() || this.owners().fetch()[0];
  },
  _payerMembership() {
    const payer = this.representor() || this.owners().fetch()[0];
    return payer;
  },
  _contractSelector() {
    return { communityId: this.communityId, relation: 'member', parcelId: this._id };
  },
  contract() {
    if (this.category !== '@property') return undefined;
    const Contracts = Mongo.Collection.get('contracts');
    return Contracts.findOneActive({ communityId: this.communityId, relation: 'member', parcelId: this._id });
  },
  payerContract() {
    if (this.category !== '@property') return undefined;
    const Contracts = Mongo.Collection.get('contracts');
    const contractSelector = this._contractSelector();
    let payerContract = Contracts.findOneActive(contractSelector);
    payerContract = payerContract?.billingContract();
    if (!payerContract) { // Contract can be created on the fly, at first payment
      Log.debug('Did not find', contractSelector);
      if (Meteor.isServer) { // will be called from parcelbillings.apply
        const payerMembership = this._payerMembership();
        productionAssert(payerMembership, 'Unable to pay for parcel - no owner found', { parcel: this.ref });
        contractSelector.partnerId = payerMembership.partnerId;
        contractSelector.activeTime = payerMembership.activeTime;
        const contractId = Contracts.insert(contractSelector);
        payerContract = Contracts.findOne(contractId);
        Log.debug('So inserted', payerContract);
      }
    }
    return payerContract;
  },
  payerPartner() {
    return this.payerContract()?.partner();
  },
  partners(active = true) {
    const Partners = Mongo.Collection.get('partners');
    return this.occupants(active).fetch().map(o => Partners.findOne(o.partnerId));
  },
  balance() {
    const Balances = Mongo.Collection.get('balances');
    return -1 * Balances.get({ communityId: this.communityId, account: '`33', localizer: this.code, tag: 'T' }).total();
  },
  outstanding() {
    return this.balance() * Relations.sign('member') * -1;
  },
  display() {
    return `${this.ref || '?'} (${this.location()}) ${this.type}`;
  },
  displayName() {
    return this.location() || __(this.ref);
  },
  displayAccount() {
    return `${this.code}: ${this.displayName()}`;
  },
  toString() {
    return this.ref || this.location();
  },
  // Voting
  ledUnits() {
    let cumulatedUnits = 0;
    this.withFollowers().forEach(parcel => cumulatedUnits += parcel.units);
    return cumulatedUnits;
  },
  share() {
    return new Fraction(this.units, this.community().totalUnits());
  },
  ledShare() {
    return new Fraction(this.ledUnits(), this.community().totalUnits());
  },
  ownedShare() {
    let total = new Fraction(0);
    this.owners().forEach(o => total = total.add(o.ownership.share)); // owners are the lead's owners
    return total;
  },
  isLeaf() {
    return this.category !== '@group';
  },
  asOption() {
    return { label: this.displayAccount(), value: this.code };
  },
});

_.extend(Parcels, {
  // Almost a duplicate of Accounts functions, to use Parcels as localizer
  checkExists(communityId, code) {
    if (!code || !Parcels.findOne({ communityId, code })) {
      throw new Meteor.Error('err_notExists', 'No such parcel', { code });
    }
  },
  all(communityId) {
    return Parcels.find({ communityId }, { sort: { code: 1 } });
  },
  getByCode(code, communityId = getActiveCommunityId()) {
    return Parcels.findOne({ communityId, code });
  },
  getByRef(ref, communityId = getActiveCommunityId()) {
    return Parcels.findOne({ communityId, ref });
  },
  nodesOf(communityId, code, leafsOnly = false) {
    const regexp = new RegExp('^' + code + (leafsOnly ? '.+' : ''));
    return Parcels.find({ communityId, code: regexp }, { sort: { code: 1 } });
  },
  nodeOptionsOf(communityId, codeS, leafsOnly, addRootNode = false) {
    const codes = (codeS instanceof Array) ? codeS : [codeS];
    const nodeOptions = codes.map(code => {
      const nodes = Parcels.nodesOf(communityId, code, leafsOnly);
      return nodes.map(node => node.asOption());
    }).flat(1);
    if (codeS === '') return [{ value: '', label: __('All') }].concat(nodeOptions);
    return nodeOptions;
  },
  chooseSubNode(code, leafsOnly) {
    return {
      options() {
        const communityId = ModalStack.getVar('communityId');
        return Parcels.nodeOptionsOf(communityId, code, leafsOnly);
      },
      firstOption: false,
    };
  },
  choosePhysical: {
    options() {
      const communityId = ModalStack.getVar('communityId');
      return Parcels.nodeOptionsOf(communityId, '@', false);
    },
    firstOption: () => __('(Select one)'),
  },
  chooseNode: {
    options() {
      const communityId = ModalStack.getVar('communityId');
      return Parcels.nodeOptionsOf(communityId, '', false);
    },
    firstOption: () => __('(Select one)'),
  },
});

Parcels.attachBaseSchema(Parcels.baseSchema);
// Parcels.attachBehaviour(FreeFields);
Parcels.attachBehaviour(Timestamped);

Parcels.attachVariantSchema(Parcels.physicalSchema, { selector: { category: '@property' } });
Parcels.attachVariantSchema(Parcels.propertySchema, { selector: { category: '@property' } });
Parcels.attachVariantSchema(Parcels.physicalSchema, { selector: { category: '@common' } });
Parcels.attachVariantSchema(undefined, { selector: { category: '@group' } });
Parcels.attachVariantSchema(undefined, { selector: { category: '#tag' } });

Parcels.simpleSchema({ category: '@property' }).i18n('schemaParcels');
Parcels.simpleSchema({ category: '@common' }).i18n('schemaParcels');
Parcels.simpleSchema({ category: '@group' }).i18n('schemaParcels');
Parcels.simpleSchema({ category: '#tag' }).i18n('schemaParcels');

// --- Before/after actions ---

function updateCommunity(parcel, revertSign = 1) {
  if (!parcel.type) return;
  const community = Communities.findOne(parcel.communityId);
  const modifier = {};
  if (community.parcels[parcel.type] === -1 * revertSign) {
    modifier.$unset = {};
    modifier.$unset[`parcels.${parcel.type}`] = '';
  } else {
    modifier.$inc = modifier.$inc || {};
    modifier.$inc[`parcels.${parcel.type}`] = revertSign;
  }
  if (parcel.units) {
    modifier.$inc = modifier.$inc || {};
    modifier.$inc.registeredUnits = revertSign * parcel.units;
  }
  Communities.update(parcel.communityId, modifier);
}

if (Meteor.isServer) {
  Parcels.after.insert(function (userId, doc) {
    updateCommunity(doc, 1);
  });

  Parcels.before.update(function (userId, doc, fieldNames, modifier, options) {
    updateCommunity(doc, -1);
  });

  Parcels.after.update(function (userId, doc, fieldNames, modifier, options) {
    updateCommunity(doc, 1);
  });

  Parcels.after.remove(function (userId, doc) {
    updateCommunity(doc, -1);
  });
}

// --- Factory ---

Factory.define('parcel', Parcels, {
});

Factory.define('@property', Parcels, {
  category: '@property',
  // serial
  // ref
  // leadRef
  units: 0,
  type: 'flat',
  building: 'A',
  floor: () => faker.random.number(10).toString(),
  door: () => faker.random.number(10).toString(),
  lot: '123456/1234/1',
  area: () => faker.random.number(150),
});

Factory.define('@common', Parcels, {
  category: '@common',
});

Factory.define('@group', Parcels, {
  category: '@group',
});

Factory.define('#tag', Parcels, {
  category: '#tag',
});

// ------------------------------------

export const chooseParcel = function (code = '') {
  return {
    relation: '#tag',
    value() {
      const selfId = AutoForm.getFormId();
      const value = ModalStack.readResult(selfId, 'af.#tag.create');
      return value;
    },
    options() {
      const communityId = ModalStack.getVar('communityId');
      const parcels = Parcels.nodesOf(communityId, code);
      const options = parcels.map(function option(p) {
        return { label: p.displayAccount(), value: p.code };
      });
      const sortedOptions = _.sortBy(options, o => o.label.toLowerCase());
      return sortedOptions;
    },
    firstOption: () => __('Localizers'),
  };
};

export const chooseProperty = {
  relation: '@property',
  options() {
    const communityId = ModalStack.getVar('communityId');
    const parcels = Parcels.find({ communityId, category: '@property' }, { sort: { ref: 1 } });
    const options = parcels.map(function option(p) {
      return { label: p.ref, value: p._id };
    });
    return options;
  },
  firstOption: () => __('(Select one)'),
};
