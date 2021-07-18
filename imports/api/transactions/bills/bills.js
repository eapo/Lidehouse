import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { __ } from '/imports/localization/i18n.js';
import { Clock } from '/imports/utils/clock.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { debugAssert } from '/imports/utils/assert.js';
import { chooseConteerAccount } from '/imports/api/transactions/txdefs/txdefs.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { LocationTagsSchema } from '/imports/api/transactions/account-specification.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Parcels, chooseParcel } from '/imports/api/parcels/parcels.js';
import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';
import { Relations } from '/imports/api/core/relations.js';
import { Contracts } from '/imports/api/contracts/contracts.js';

export const Bills = {};

export const choosePayment = {
  options() {
    const communityId = ModalStack.getVar('communityId');
    const payments = Transactions.find({ communityId, category: 'payment', outstanding: { $ne: 0 } });
    const options = payments.map(function option(payment) {
      return { label: `${payment.partner()} ${moment(payment.valueDate).format('L')} ${payment.amount} ${payment.note || ''}`, value: payment._id };
    });
    return options;
  },
  firstOption: () => __('(Select one)'),
};

const readingSchema = new SimpleSchema({
  date: { type: Date },
  value: { type: Number, decimal: true },
});

const meteringSchema = new SimpleSchema({
  id: { type: String, regEx: SimpleSchema.RegEx.Id },
  start: { type: readingSchema },
  end: { type: readingSchema },
});

const billingSchema = new SimpleSchema({
  id: { type: String, regEx: SimpleSchema.RegEx.Id },
  period: { type: String, optional: true },
});

const lineSchema = {
  title: { type: String },
  details: { type: String, optional: true },
  uom: { type: String, optional: true },  // unit of measurment
  quantity: { type: Number, decimal: true, autoform: { defaultValue: 1 } },
  unitPrice: { type: Number, decimal: true },
  discoPct: { type: Number, decimal: true, optional: true },
  disco: { type: Number, decimal: true, optional: true, autoform: { omit: true, readonly: true } },
  taxPct: { type: Number, decimal: true, optional: true, defaultValue: 0 },
  tax: { type: Number, decimal: true, optional: true, autoform: { omit: true, readonly: true } },
  amount: { type: Number, decimal: true, optional: true, autoform: { omit: true, readonly: true } },
  // autoValue() {
  //  return this.siblingField('quantity').value * this.siblingField('unitPrice').value;
  //} },
  billing: { type: billingSchema, optional: true, autoform: { type: 'hidden' } },
  metering: { type: meteringSchema, optional: true, autoform: { type: 'hidden' } },
  account: { type: String, optional: true, autoform: chooseConteerAccount() },
  localizer: { type: String, optional: true, autoform: chooseParcel() },
};
_.each(lineSchema, val => val.autoform = _.extend({}, val.autoform, { afFormGroup: { label: false } }));
Bills.lineSchema = new SimpleSchema([lineSchema, LocationTagsSchema]);

/*
const simpleLineSchema = {
  title: { type: String },
  amount: { type: Number, decimal: true },
  account: { type: String, optional: true, autoform: chooseConteerAccount() },
  localizer: { type: String, optional: true, autoform: chooseParcel() },
};
*/

Bills.receiptSchema = new SimpleSchema({
  // amount overrides non-optional value of transactions, with optional & calculated value
  amount: { type: Number, decimal: true, optional: true },
  tax: { type: Number, decimal: true, optional: true, autoform: { omit: true, readonly: true } },
  disco: { type: Number, decimal: true, optional: true, autoform: { omit: true, readonly: true } },
//  simple: { type: simpleLineSchema, optional: true }, // used if there is only one simplified line
  lines: { type: Array, optional: true },             // used if there multiple complex line
  'lines.$': { type: Bills.lineSchema },
});

Bills.paymentSchema = new SimpleSchema({
  id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...choosePayment } },
  amount: { type: Number, decimal: true },
});

Bills.extensionSchema = new SimpleSchema([
  Transactions.partnerSchema,
  Bills.receiptSchema, {
    valueDate: { type: Date, autoValue() { return this.field('deliveryDate').value; } },
    issueDate: { type: Date },
    deliveryDate: { type: Date },
    dueDate: { type: Date },
    paymentMethod: { type: String, optional: true, allowedValues: ['cash', 'bank'] },
    relationAccount: { type: String, optional: true, autoform: chooseConteerAccount(true) },
    payments: { type: [Bills.paymentSchema], defaultValue: [] },
    outstanding: { type: Number, decimal: true, optional: true },
  //  closed: { type: Boolean, optional: true },  // can use outstanding === 0 for now
  },
]);

Bills.modifiableFields = ['amount', 'issueDate', 'valueDate', 'dueDate', 'partnerId'];

Meteor.startup(function indexBills() {
  if (Meteor.isClient && MinimongoIndexing) {
  } else if (Meteor.isServer) {
    Transactions._ensureIndex({ communityId: 1, relation: 1, outstanding: -1 });
  }
});

export const BillAndReceiptHelpers = {
  getLines() {
    return (this.lines || []).filter(l => l); // nulls can be in the array, on the UI, when lines are deleted
  },
  isSimple() {
    return !this.lines?.length ||
      (this.lines?.length === 1 && this.lines[0].quantity === 1 && !this.lines[0].taxPct);
  },
  issuer() {
    if (this.relation === 'supplier') return { partner: this.partner(), contract: this.contract() };
    return this.community().asPartner();
  },
  receiver() {
    if (this.relation === 'customer' || this.relation === 'member') return { partner: this.partner(), contract: this.contract() };
    return this.community().asPartner();
  },
  lineCount() {
    return this.lines?.length;
  },
  matchingTxSide() {
    if (this.relation === 'supplier') return 'debit';
    else if (this.relation === 'customer' || this.relation === 'member') return 'credit';
    debugAssert(false, 'unknown relation');
    return undefined;
  },
  otherTxSide() {
    return Transactions.oppositeSide(this.matchingTxSide());
  },
  validate() {
    if (this.partnerId && !this.contractId) { // Auto default to default contract, and create it if not yet exists
      const selector = { communityId: this.communityId, relation: this.relation, partnerId: this.partnerId, title: { $exists: false } };
      this.contractId = Contracts.findOne(selector)?._id;
      if (!this.contractId) {
        delete selector.title;
        selector.accounting = {
          account: this.lines[0].account,
          localizer: this.lines[0].localizer,
        };
        this.contractId = Contracts.insert(selector);
      }
    }
  },
  validateForPost() {
    if (!this.hasConteerData()) throw new Meteor.Error('err_notAllowed', 'Transaction has to be account assigned first');
  },
  autoFill() {
    if (!this.lines) return;  // when the modifier doesn't touch the lines, should not autoFill
    let totalAmount = 0;
    let totalTax = 0;
    let totalDisco = 0;
    this.getLines().forEach(line => {
      line.amount = Math.round(line.unitPrice * line.quantity);
      if (line.discoPct) {
        line.disco = Math.round((line.amount * line.discoPct) / 100);
        line.amount -= line.disco;
        totalDisco += line.disco;
      }
      if (line.taxPct) {
        line.tax = Math.round((line.amount * line.taxPct) / 100);
        line.amount += line.tax;
        totalTax += line.tax;
      }
      totalAmount += line.amount;
    });
    if (this.rounding) totalAmount += this.rounding;
    this.amount = totalAmount;
    this.tax = totalTax;
    this.disco = totalDisco;
  },
};

Transactions.categoryHelpers('bill', {
  ...BillAndReceiptHelpers,
  getPayments() {
    return (this.payments || []);
  },
  getPaymentTransactions() {
    return this.getPayments().map(payment => Transactions.findOne(payment.id));
  },
  paymentCount() {
    return this.getPayments().length;
  },
  hasPayments() {
    return this.getPayments().reduce((sum, p) => sum + p.amount, 0);
  },
  hadPayments() {
    return this.getPayments().find(p => p.amount);  // Zero amount payments, are removed payments
  },
  paymentDate() {
    const payment = _.last(this.getPayments());
    const paymentTx = payment && Transactions.findOne(payment.id);
    return paymentTx && paymentTx.valueDate;
  },
  net() {
    return this.amount - this.tax;
  },
  lineRelationAccount(line) {
    let account = line.relationAccount || this.relationAccount;
    if (!line.relationAccount && line.billing) account += ParcelBillings.findOne(line.billing.id).digit;
    return account;
  },
  fillFromStatementEntry(entry) {
    this.amount = entry.amount * Relations.sign(this.relation);
    this.issueDate = entry.valueDate;
    this.deliveryDate = entry.valueDate;
    this.dueDate = entry.valueDate;
    if (!this.lines) {
      const title =  entry.note || __(this.txdef().name);
      this.lines = [{ title, quantity: 1, unitPrice: Math.abs(entry.amount) }];
    }
  },
  makeJournalEntries(accountingMethod) {
//    const communityId = this.communityId;
//    const cat = Txdefs.findOne({ communityId, category: 'bill', 'data.relation': this.relation });
    this.debit = [];
    this.credit = [];
    this.getLines().forEach(line => {
      const newEntry = { amount: line.amount, localizer: line.localizer, parcelId: line.parcelId };
      if (accountingMethod === 'accrual') {
        this.makeEntry(this.conteerSide(), _.extend({ account: line.account }, newEntry));
      } else if (accountingMethod === 'cash') {
        const technicalAccount = Accounts.toTechnical(line.account);
        this.makeEntry(this.conteerSide(), _.extend({ account: technicalAccount }, newEntry));
      }
      const relationAccount = this.lineRelationAccount(line);
      this.makeEntry(this.relationSide(), _.extend({ account: relationAccount }, newEntry));
    });
    return { debit: this.debit, credit: this.credit };
  },
  makePartnerEntries() {
    this.pEntries = [{
      partner: this.partnerContractCode(),
      side: this.conteerSide(),
      amount: this.amount,
    }];
    return { pEntries: this.pEntries };
  },
  hasConteerData() {
    let result = true;
    this.getLines().forEach(line => { if (line) {
      if (!line.account || (!line.relationAccount && !this.relationAccount)) result = false;
    } });
    return result;
  },
  calculateOutstanding() {
    let paid = 0;
    this.getPayments().forEach(p => paid += p.amount);
    return this.amount - paid;
  },
  displayInSelect() {
    return `${this.serialId} (${this.partner()} ${Date.formatUTC(this.valueDate, 'YYYY.MM.DD')} ${this.outstanding}/${this.amount})`;
  },
  displayInHistory() {
    const generic = Transactions._helpers.prototype.displayInHistory.call(this);
    return generic + (this.lineCount() ? ` (${this.lineCount()} ${__('item')})` : '');
  },
  overdueDays() {
    const diff = moment().diff(this.dueDate, 'days');
    if (diff < 0) return 0;
    return diff;
  },
});

Transactions.attachVariantSchema(Bills.extensionSchema, { selector: { category: 'bill' } });

Transactions.simpleSchema({ category: 'bill' }).i18n('schemaTransactions');
Transactions.simpleSchema({ category: 'bill' }).i18n('schemaBills');

// --- Factory ---

Factory.define('bill', Transactions, {
  category: 'bill',
  relation: 'supplier',
  partnerId: () => Factory.get('supplier'),
  issueDate: () => Clock.currentDate(),
  deliveryDate: () => Clock.currentDate(),
  dueDate: () => Clock.currentDate(),
  lines: () => [{
    title: faker.random.word(),
    uom: 'piece',
    quantity: 1,
    unitPrice: faker.random.number(10000),
    account: '`861',
    localizer: '@',
  }],
});

export const chooseBill = {
  options() {
    const communityId = ModalStack.getVar('communityId');
    const bills = Transactions.find({ communityId, category: 'bill', outstanding: { $ne: 0 } });
    const options = bills.map(function option(bill) {
      return { label: `${bill.serialId} ${bill.partner()} ${moment(bill.valueDate).format('L')} ${bill.outstanding}`, value: bill._id };
    });
    return options;
  },
  firstOption: () => __('(Select one)'),
};
