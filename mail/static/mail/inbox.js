document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', () => compose_email());

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email(sender, subject, body, time_sent) {
  // compose_email takes 4 optional params
  // for the original sender, subject, body, and time_sent
  // used if the user is replying to an email

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields if none passed from a reply request
  if (subject === undefined) {
    document.querySelector('#compose-subject').value = '';
  }
  else {
    document.querySelector('#compose-subject').value = 'Re: '.concat(subject);
  }

  if (sender === undefined) {
    document.querySelector('#compose-recipients').value = '';
  }
  else {
    document.querySelector('#compose-recipients').value = sender;
  }

  if (body === undefined || time_sent === undefined) {
    document.querySelector('#compose-body').value = '';
  }
  else {
    reply_body = `On ${time_sent} ${sender} wrote: \n`;
    reply_body = reply_body.concat(body);
    document.querySelector('#compose-body').value = reply_body;
  }
  
  // submit the reply
  document.querySelector('#compose-form').onsubmit = function() {
    fetch('/emails', {
      method: 'POST',
      body: JSON.stringify({
          recipients: document.querySelector('#compose-recipients').value,
          subject: document.querySelector('#compose-subject').value,
          body: document.querySelector('#compose-body').value
      })
    })
    .then(response => response.json())
    .then(result => {
        // Print result
        console.log(result);
    });
  }
}

function load_email(email_id) {
  
  // show the email and hide the other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'block';

  // create an element to display the email and blank it out
  const email_view = document.querySelector('#email-view'); 
  email_view.innerHTML = '';

  // get the email from the server by it's id
  fetch(`/emails/${email_id}`)
  .then(response => response.json())
  .then(email => {

    // once retrieved, mark the email as read
    fetch(`/emails/${email.id}`, {
      method: 'PUT',
      body: JSON.stringify({
          read: true
      })
    })
    
    // create elements to display the email components
    const sender = document.createElement('div');
    const subject = document.createElement('div');
    const time_sent = document.createElement('div');
    const body = document.createElement('div');
    body.style.whiteSpace = 'pre';
    const horizontal_rule = document.createElement('hr')
    const line_break = document.createElement('br');
    const reply_button = document.createElement('button');
    reply_button.className = 'btn btn-sm btn-outline-primary';
    const archive_button = document.createElement('button');
    archive_button.className = 'btn btn-sm btn-outline-primary';

    sender.innerHTML = `<b>From</b>: ${email.sender}`;
    subject.innerHTML = `<b>Subject</b>: ${email.subject}`;
    time_sent.innerHTML = `<b>Sent</b>: ${email.timestamp}`;
    reply_button.innerHTML = 'Reply';
    reply_button.style.margin = '2px';

    // if the email is archived, show a different button
    if (email.archived === true) {
      archive_button.className = 'btn btn-sm btn-primary';
      archive_button.innerHTML = 'Unarchive';
    }
    else {
      archive_button.className = 'btn btn-sm btn-outline-primary';
      archive_button.innerHTML = 'Archive';
    }
    
    archive_button.style.margin = '2px';

    // seems like javascript innerHTML + chrome doesn't respect
    // newline characters
    // tried with textContent but still no luck
    // body.innerHTML = email.body.replace(/(\r\n|\n|\r)/gm, '<br>');
    body.innerHTML = email.body;

    // when the user hits the Reply button, take them to the componse form
    // and prepopulate the form from the original email
    reply_button.addEventListener('click', function() {
      compose_email(email.sender, email.subject, email.body, email.timestamp);
    });

    // when the user clicks the archive/unarchive button
    // set the state and redraw the button
    var archived_state = email.archived;
    archive_button.addEventListener('click', function() {
      archived_state = !archived_state;
      fetch(`/emails/${email.id}`, {
        method: 'PUT',
        body: JSON.stringify({
            archived: archived_state
        })
      })
      .then(function() {
        if (archived_state === true) {
          this.className = 'btn btn-sm btn-primary';
          this.innerHTML = 'Unarchive';
        }
        else {
          this.className = 'btn btn-sm btn-outline-primary';
          this.innerHTML = 'Archive';
        }
      })
      .then(function() {
        // reload the inbox
        load_mailbox('inbox');
      })
    });

    // add everything back to the DOM
    email_view.append(sender);
    email_view.append(subject);
    email_view.append(time_sent);
    if (email.user !== email.sender) {
      email_view.append(line_break);
      email_view.append(reply_button);
      email_view.append(archive_button);
    }
    email_view.append(horizontal_rule);
    email_view.append(body);
  });
}

function load_mailbox(mailbox) {
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';

  // access the div that will contain the list of emails
  // and clear it out
  const emails_list = document.querySelector('#emails-view-list');
  emails_list.innerHTML = '';
 
  // get the list of emails for the requested mailbox
  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {

    console.log(emails);

    // for each of the emails
    emails.forEach(function(email) {

      // create a row div and set some style properties
      const div_row = document.createElement('div');
      div_row.className = 'row email-row';
      div_row.style.border = 'thin solid #007bff';
      div_row.style.padding = '5px';
      div_row.style.margin = '5px';

      div_row.onclick = function() {
        load_email(email.id);
      }

      // read emails should have a grey background
      if (email.read === true) {
        div_row.style.backgroundColor = '#CECECE';
      }

      // create columns in the row for sender, subject, and sent time
      const sender = document.createElement('div');
      sender.className = 'col-sm';
      sender.style.textAlign = 'center';

      const subject = document.createElement('div');
      subject.className = 'col-sm';
      subject.style.textAlign = 'center';

      const sent_time = document.createElement('div');
      sent_time.className = 'col-sm';
      sent_time.style.textAlign = 'center';

      // add the content to the divs
      sender.innerHTML = email.sender;

      // if the email subject is greater than 40 characters
      // truncate to 40 chars and add '...' so the row
      // height remains constant
      if (email.subject.length > 40) {
        subject.innerHTML = email.subject.substring(0, 40).concat('...');
      }
      else {
        subject.innerHTML = email.subject;
      }
      
      sent_time.innerHTML = email.timestamp;

      // add the columns to the row
      div_row.append(sender);
      div_row.append(subject);
      div_row.append(sent_time);

      // add the row to the list container
      emails_list.append(div_row);
    });
  });

  // Show the mailbox name
  document.querySelector('#mailbox-header').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;
}