import { Meteor } from 'meteor/meteor';
import { debugAssert } from '/imports/utils/assert.js';
import { EmailTemplateHelpers } from './email-template-helpers.js';
import { Bill_Email } from './bill-email.js';
import { Log } from '/imports/utils/log.js';

export function sendBillEmail(bill) {
  debugAssert(Meteor.isServer);
  import { EmailSender } from '/imports/startup/server/email-sender.js';

  const community = bill.community();
  const partner = bill.partner();
  const emailAddress = partner.primaryEmail();
  if (!emailAddress) {
    Log.warning(`Missing email address for partner ${partner.displayName(community.settings.language)} ${partner._id}. Unable to send bill.`);
    return;
  }
  const user = partner.user();

  if (!user || user.settings.getBillEmail) {
    EmailSender.send({
      to: emailAddress,
      subject: EmailTemplateHelpers.subject('New bill', user, community),
      template: 'Bill_Email',
      data: {
        user,
        community,
        bill,
        ...Bill_Email.layoutData,
      },
    });
  }
}
