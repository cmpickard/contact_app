/* eslint-disable max-statements */
/* eslint-disable max-lines-per-function */
import express from 'express';
import cors from 'cors';
import ContactListConnector from './database.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const app = express();
const PORT = process.env['PORT'];
let contacts = [];
const dbConnection = new ContactListConnector();

function connect() {
  return dbConnection.connect();
}

function disconnect() {
  return dbConnection.closeConnection();
}

async function syncContacts(connected = false) {
  try {
    if (!connected) {
      await connect();
    }

    let data = await dbConnection.getAllContacts();
    contacts = data;
    console.log('Contacts synced to database.');

    if (!connected) {
      disconnect();
    }
  } catch (error) {
    console.log(`Failed to sync contacts: ${error}`);
  }
}

// initialSync
syncContacts();

// helper methods
function nextId() {
  return Math.max(...contacts.map(contacts => contacts.resourceId)) + 1;
}

function findIdxByName(name) {
  return contacts.findIndex(contact => contact.name === name);
}

function findIdxByID(id) {
  return contacts.findIndex(contact => contact.resourceId === id);
}

// middleware
app.use(express.static('dist'));
app.use(cors(), express.json());


// ROUTES

// get all contacts
app.get('/api/contacts', (_, res) => {
  res.json(contacts);
});

// get contact
app.get('/api/contacts/:id', (req, res) => {
  // contacts are synced locally, so i can just grab the requested resource
  // without interacting with the db
  let resourceId = Number(req.params['id']);
  let idx = findIdxByID(resourceId);
  if (idx) {
    console.log(idx, contacts[idx]);
    res.json(contacts[idx]);
  } else {
    res.status(404);
    res.send('<p>That contact does not exist</p>');
  }
});

// add new contact
app.post('/api/contacts', async (req, res) => {
  let idx = findIdxByName(req.body.name);
  let contactDoc;
  let newContact;
  if (idx === -1) {
    newContact = { resourceId: nextId(), ...req.body };
    contactDoc = new dbConnection.Contact(newContact);
  } else {
    contactDoc = contacts[idx];
    contactDoc.set('number', req.body.number);
  }

  try {
    await connect();
    await dbConnection.updateContact(contactDoc);
    await syncContacts(true);
    disconnect();

    res.send('Contact added');
  } catch (error) {
    console.log(`Error adding contact: ${error}`);
    res.status(500).send('Failed to add contact');
  }
});

// update contact
app.put('/api/contacts/:id', async (req, res) => {
  let idx = findIdxByID(Number(req.params["id"]));
  let contactDoc;

  if (idx === -1) {
    res.status(404);
    res.send("Contact could not be found");
  } else {
    contactDoc = contacts[idx];
    contactDoc.set('number', req.body.number);
  }

  try {
    await connect();
    await dbConnection.updateContact(contactDoc);
    await syncContacts(true);
    disconnect();

    res.send('Contact updated');
  } catch (error) {
    console.log(`Error updating contact: ${error}`);
    res.status(500).send('Failed to update contact');
  }
});

// delete contact
app.delete('/api/contacts/:id', async (req, res) => {
  let idx = findIdxByID(Number(req.params["id"]));

  if (idx === -1) {
    res.status(404);
    res.send('That resource id does not exist in the database');
  } else {
    try {
      await connect();
      await dbConnection.deleteContact(contacts[idx]);
      await syncContacts(true);
      disconnect();

      res.send('Contact successfully deleted');
    } catch (err) {
      console.log(`Error deleting contact: ${err}`);
      res.status(500).send('Failed to delete contact');
    }
  }
});


// start server
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});