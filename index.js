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
    const appointmentsCollection = client
      .db("dental_care")
      .collection("appointmentsCollection");
    console.log("Dental Care database connected");

    app.get("/", async (req, res) => {
      res.send("Dental Care server is running");
    });

    // Get Appointments
    // get service from db
    app.get("/appointments", async (req, res) => {
      const query = {};
      const cursor = appointmentsCollection.find(query);
      const appointments = await cursor.toArray();
      res.send(appointments);
    });
  } finally {
  }
};
run().catch(console.dir);

app.listen(port, () => {
  console.log("Listening to car repair port", port);
});
