import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { $ } from 'meteor/jquery';

import '/imports/ui_3/views/modals/modal.js';
import { __ } from '/imports/localization/i18n.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Period, PeriodBreakdown } from '/imports/api/transactions/breakdowns/period';
import { Parcels } from '/imports/api/parcels/parcels';
import { Accounts } from '/imports/api/transactions/accounts/accounts';
import '/imports/ui_3/views/components/ledger-report.js';
import '/imports/ui_3/views/components/account-history.js';
import '/imports/ui_3/views/components/journals-table.js';
import '/imports/ui_3/views/components/income-statement.js';
import './accounting-ledger.html';

Template.Accounting_ledger.viewmodel({
  periodSelected: PeriodBreakdown.currentYearTag(),
  onCreated(instance) {
    instance.autorun(() => {
      instance.subscribe('balances.ofAccounts', { communityId: this.communityId() });
    });
  },
  communityId() {
    return getActiveCommunityId();
  },
  accounts() {
    return Accounts.all(this.communityId());
  },
  accountOptions() {
    return Accounts.coa(this.communityId()).nodeOptions();
  },
  localizerOptions() {
    return Parcels.nodeOptionsOf(this.communityId(), '');
  },
  totalTag() {
    return ['T'];
  },
  yearMonthTag() {
    return this.periodSelected();
  },
  yearMonthTags() {
//    return PeriodBreakdown.currentYearMonths().concat('T');
    return PeriodBreakdown.nodesOf(this.periodSelected()).map(l => l.code);
  },
  periodOptions() {
    return PeriodBreakdown.nodeOptions(false);
  },
});

Template.Accounting_ledger.events({
  'click .cell,.row-header'(event, instance) {
    const communityId = instance.viewmodel.communityId();
    if (!Meteor.user().hasPermission('transactions.inCommunity', { communityId })) return;
    const accountCode = $(event.target).closest('[data-account]').data('account');
    const periodTag = $(event.target).closest('[data-tag]').data('tag');
    const period = Period.fromTag(periodTag);
    Modal.show('Modal', {
      title: __('Account history'),
      body: 'Account_history',
      bodyContext: {
        beginDate: period.begin(),
        endDate: period.end(),
        accountOptions: instance.viewmodel.accountOptions(),
        accountSelected: '' + accountCode,
        localizerOptions: instance.viewmodel.localizerOptions(),
//        localizerSelected: '',
      },
      size: 'lg',
    });
  },
  'click .js-journals'(event, instance) {
    const communityId = instance.viewmodel.communityId();
    // ModalStack.setVar('parcelId', doc._id);
    Modal.show('Modal', {
      title: 'Full journal list',
      body: 'Journals_table',
      bodyContext: { communityId },
      size: 'lg',
    });
  },
  'click .js-income-statement'(event, instance) {
    const communityId = instance.viewmodel.communityId();
    // ModalStack.setVar('parcelId', doc._id);
    Modal.show('Modal', {
      title: 'Income statement',
      body: 'Income_statement',
      bodyContext: { communityId },
      size: 'lg',
    });
  },
});
