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

const verifyJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log(authHeader);
  if (!authHeader) {
    res.status(401).send({ message: "UNauthorized access" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }

    req.decoded = decoded;
    next();
  });
};

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
    //post - will use when login and signup
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;

      const filter = { email };
      const options = { upsert: true };

      const updateDoc = {
        $set: user,
      };

      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ result, token });
    });

    // will use when make a admin route
    app.put("/users/admin/:email", verifyJwt, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    });

    // check user is admin or not return- true or false
    app.get("/admin/:email", verifyJwt, async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    // to get all the user
    app.get("/users", verifyJwt, async (req, res) => {
      const query = {};
      const cursor = userCollection.find(query);
      const users = await cursor.toArray();
      res.send(users);
    });

    // Appointments
    // get - to get all the appointments or services
    app.get("/appointments", async (req, res) => {
      const query = {};
      const cursor = appointmentsCollection.find(query);
      const appointments = await cursor.toArray();
      res.send(appointments);
    });

    // to get Available slots - this will be the main appointments get route
    app.get("/available", async (req, res) => {
      const date = req.query.date;

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
        appointment.slots = available;
      });

      res.send(appointments);
    });

    // Booking
    //get - to get all the booking
    app.get("/booking", verifyJwt, async (req, res) => {
      const patient = req.query.patient;
      const decodedEmail = req.decoded.email;

      if (patient === decodedEmail) {
        const query = { patientEmail: patient };
        const cursor = bookingCollection.find(query);
        const bookings = await cursor.toArray();
        return res.send(bookings);
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    });

    //post
    // to post a booking in the database
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
