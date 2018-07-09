import fs from 'fs';
import { Meteor } from 'meteor/meteor';
import { SSR } from 'meteor/meteorhacks:ssr';
import { Email } from 'meteor/email';

export function templateToHTML(name, data) {
  try {
    SSR.compileTemplate(
      name,
      // Use native Node read here as Assets.getText doesn't work consistently. The path here is
      // relative to .meteor/local/build/programs/server.
      fs.readFileSync(`assets/app/email/${name}.html`, 'utf8')
    );
    return SSR.render(name, data);
  } catch (exception) {
    throw new Meteor.Error('500', exception);
  }
}

export const EmailSender = {
  send(templateName, options, context) {        
    Email.send({
      to: options.to,
      from: 'Honline <noreply@honline.net>',
      subject: options.subject,
      html: templateToHTML(templateName, context),
    });
  },
};