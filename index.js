const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.dymd9.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const run = async () => {
  try {
    await client.connect();
    console.log("Dental Care database connected");
    const appointmentsCollection = client
      .db("dental_care")
      .collection("appointmentsCollection");
    const bookingCollection = client.db("dental_care").collection("booking");
    const userCollection = client.db("dental_care").collection("users");

    app.get("/", async (req, res) => {
      res.send("Dental Care server is running");
    });

    // Users
    //post
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email };
      const options = { upsert: true };

      const updateDoc = {
        $set: user,
      };

      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const query = {};
      const cursor = userCollection.find(query);
      const users = await cursor.toArray();
      res.send(users);
    });

    // Appointments
    // get
    app.get("/appointments", async (req, res) => {
      const query = {};
      const cursor = appointmentsCollection.find(query);
      const appointments = await cursor.toArray();
      res.send(appointments);
    });

    // Available slots
    app.get("/available", async (req, res) => {
      const date = req.query.date;

      // get all appointments
      const appointments = await appointmentsCollection.find().toArray();

      // get the booking of that day
      const query = { date: date };
      const bookings = await bookingCollection.find(query).toArray();
      console.log(bookings);

      // for each appointment, find booking for that appointment
      appointments.forEach((appointment) => {
        const appointmentBooking = bookings.filter(
          (book) => book.treatment === appointment.name
        );
        const booked = appointmentBooking.map((app) => app.slot);
        const available = appointment.slots.filter((a) => !booked.includes(a));
        appointment.slots = available;
      });

      res.send(appointments);
    });

    // Booking
    //get
    app.get("/booking", async (req, res) => {
      const patient = req.query.patient;
      console.log(patient);
      const query = { patientEmail: patient };
      const cursor = bookingCollection.find(query);
      const bookings = await cursor.toArray();
      res.send(bookings);
    });

    //post
    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const query = {
        treatment: booking.treatment,
        date: booking.date,
        patientEmail: booking.patientEmail,
      };
      const exists = await bookingCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists });
      }
      const result = await bookingCollection.insertOne(booking);
      return res.send({ success: true, result });
    });
  } finally {
  }
};
run().catch(console.dir);

app.listen(port, () => {
  console.log("Listening to car repair port", port);
});
