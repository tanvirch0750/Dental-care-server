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

    app.get("/", async (req, res) => {
      res.send("Dental Care server is running");
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
      const date = req.query.date || "May 14, 2022";

      // get all appointments
      const appointments = await appointmentsCollection.find().toArray();

      // get the booking of that day
      const query = { date: date };
      const bookings = await bookingCollection.find(query).toArray();

      // for each appointment, find booking for that appointment
      appointments.forEach((appointment) => {
        const appointmentBooking = bookings.filter(
          (book) => book.treatment === appointment.name
        );
        const booked = appointmentBooking.map((app) => app.slot);
        const available = appointment.slots.filter((a) => !booked.includes(a));
        // appointment.available = available;
        appointment.slots = available;
      });

      res.send(appointments);
    });

    // Booking
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
