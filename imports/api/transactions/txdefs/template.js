import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Templates } from '/imports/api/transactions/templates/templates.js';
//import { Txdefs } from './txdefs.js';

export function defineTxdefTemplates() {
// Kettős könyvelés verzió

  Templates.define({ _id: 'Condominium_Txdefs', txdefs: [{
    name: 'Supplier bill', // 'Bejövő számla',
    category: 'bill',
    data: { relation: 'supplier' },
    debit: ['`1', '`5', '`8'],
    credit: ['`46'],
/*
  }, {
    name: 'Recording inventory', // 'Készletrevétel',
    category: 'bill',
    data: { relation: 'supplier' },
    debit: ['`2'],
    credit: ['`46'],
  }, {
    name: 'Costing of inventory', // 'Készlet költség elszámolás',
    category: 'free',
    debit: ['`5'],
    credit: ['`2'],
*/
  }, {
    name: 'Supplier payment', // 'Bejövő számla kifizetése',
    category: 'payment',
    data: { relation: 'supplier' },
    debit: ['`46'],
    credit: ['`38'],
  }, {
    name: 'Supplier bill remission', // 'Bejövő számla elengedés',
    category: 'remission',
    data: { relation: 'supplier' },
    debit: ['`46'],
    credit: ['`969'],
  }, {
    name: 'Customer bill', // 'Kimenő számla',
    category: 'bill',
    data: { relation: 'customer' },
    debit: ['`31'],
    credit: ['`9'],
  }, {
    name: 'Customer payment', // 'Kimenő számla befolyás',
    category: 'payment',
    data: { relation: 'customer' },
    debit: ['`38'],
    credit: ['`31'],
  }, {
    name: 'Customer bill remission', // 'Kimenő számla elengedés',
    category: 'remission',
    data: { relation: 'customer' },
    debit: ['`9'],
    credit: ['`31'],
  }, {
    name: 'Parcel bill', // 'Albetét előírás',
    category: 'bill',
    data: { relation: 'member' },
    debit: ['`33'],
    credit: ['`95'],
  }, {
    name: 'Parcel payment', // 'Albetét befizetés',
    category: 'payment',
    data: { relation: 'member' },
    debit: ['`38'],
    credit: ['`33'],
  }, {
    name: 'Parcel bill remission', // 'Albetét előírás elengedés',
    category: 'remission',
    data: { relation: 'member' },
    debit: ['`95'],
    credit: ['`33'],
  }, {
/*
  // Nem azonosított bevételek kezelése 
  // Befolyás
    name: 'Non identified payment', // 'Nem azonosított befolyás',
    category: 'payment',
    debit: ['`38'],
    credit: ['`43'],
  }, {
  // Azonosítás - Identification
    name: 'Identification', // 'Azonosítás',
    debit: ['`43'],
    credit: ['`3'],
  }, {
*/
    name: 'Money transfer', // 'Átvezetés pénz számlák között',
    category: 'transfer',
    debit: ['`38'],
    credit: ['`38'],
  }, {
  /*
  // Készpénz felvétel bankszámláról
    name: 'Cash withdraw', // 'Készpénz felvétel',
    category: 'transfer',
    debit: ['`381'],
    credit: ['`38'],
  }, {
  // Készpénz befizetés bankszámlára pénztárból
    name: 'Cash deposit', // 'Készpénz befizetés',
    category: 'transfer',
    debit: ['`38'],
    credit: ['`381'],
  }, {
*/

// Single entry accouting

    name: 'Income receipt', // 'Bevétel',
    category: 'receipt',
    data: { relation: 'customer' },
    debit: ['`38'],
    credit: ['`9'],
  }, {
    name: 'Expense receipt', // 'Kiadás',
    category: 'receipt',
    data: { relation: 'supplier' },
    debit: ['`8'],
    credit: ['`38'],
  }, {
    name: 'Barter', // 'Albetét előírás elengedés',
    category: 'barter',
//    data: { relation: 'member' },
    debit: ['`46'],
    credit: ['`31', '`33'],
//    debit: ['`9'],
//    credit: ['`8', '`5'],
  }, {
    name: 'Opening asset',
    category: 'opening',
    data: { side: 'debit' },
    debit: ['`1', '`2', '`3', '`5', '`8'],
    credit: ['`491'],
  }, {
    name: 'Opening liability',
    category: 'opening',
    data: { side: 'credit' },
    debit: ['`491'],
    credit: ['`4', '`9'],
  }, {
    name: 'Closing asset',
    category: 'opening',
    data: { side: 'credit' },
    debit: ['`492'],
    credit: ['`1', '`2', '`3', '`5', '`8'],
  }, {
    name: 'Closing liability',
    category: 'opening',
    data: { side: 'debit' },
    debit: ['`4', '`9'],
    credit: ['`492'],
  }, {
    name: 'Accounting operation', // 'Könyvelési művelet',
    category: 'freeTx',
    debit: ['`'],
    credit: ['`'],
  }],
  });
}

if (Meteor.isServer) {
  Meteor.startup(defineTxdefTemplates);
}
