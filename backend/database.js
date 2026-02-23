import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

class ContactListConnector {
  constructor() {
    this.contactSchema = this.makeSchema();
    this.Contact = this.makeModel();
  }

  async connect() {
    try {
      await mongoose.connect(process.env.MONGO_STRING);
      console.log(">>Connected to ContactList database...");
    } catch (error) {
      console.log(`Connection to db failed: ${error}`);
    }
  }

  async closeConnection() {
    await mongoose.connection.close();
    console.log('>>ContactList connection closed');
  }

  makeSchema() {
    return new mongoose.Schema(
      {
        name: {type: String, required: true},
        number: {
          type: String,
          validate: {
            validator: function(num) {
              return /\d{3}-\d{3}-\d{4}/.test(num);
            },
            message: props => `${props.value} is not a valid phone number!`
          },
          required: [true, 'User phone number required']
        },
        resourceId: { type: Number, unique: true, required: true }
      });
  }

  makeModel() {
    return mongoose.model('Contact', this.contactSchema);
  }

  createContact(contactInfo) {
    return new this.Contact(contactInfo);
  }

  async saveContact(contactDocument) {
    try {
      await contactDocument.save();
      console.log(`Contact saved to database!`);
    } catch (error) {
      console.log(`Failed to save contact: ${error}`);
    }
  }

  getAllContacts() {
    return this.Contact.find({});
  }

  updateContact(contactDocument) {
    return contactDocument.save();
  }

  deleteContact(contactDocument) {
    return this.Contact.deleteOne(contactDocument);
  }
}

export default ContactListConnector;