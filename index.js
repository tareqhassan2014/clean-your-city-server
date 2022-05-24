const express = require("express");
const { MongoClient } = require("mongodb");
const app = express();
const ObjectId = require("mongodb").ObjectId;
const cors = require("cors");
const admin = require("firebase-admin");
const { json } = require("express");
const port = process.env.PORT || 5000;
require("dotenv").config();

// cleaning-services-project-firebase-adminsdk.json;

// const serviceAccount = require("./cleaning-services-project-firebase-adminsdk.json");

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tkswl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization) {
    const token = req.headers.authorization.split(" ")[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();

    const database = client.db("cleaning_services");
    const serviceCollection = database.collection("services");
    const orderCollection = database.collection("orders");
    const testimonialCollection = database.collection("testimonials");
    const userCollection = database.collection("users");
    console.log("connected");

    // service
    // get services
    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    // send service to database
    app.post("/services", async (req, res) => {
      const service = req.body;
      const result = await serviceCollection.insertOne(service);
      res.json(result);
    });

    // testimonial
    // get testimonials
    app.get("/testimonials", async (req, res) => {
      const cursor = testimonialCollection.find({});
      const result = await cursor.toArray();
      res.send(result);
    });

    // send testimonial to database
    app.post("/testimonials", async (req, res) => {
      const testimonial = req.body;
      const result = await testimonialCollection.insertOne(testimonial);
      res.json(result);
    });

    // order
    // get all orders
    app.get("/allorders", async (req, res) => {
      const cursor = orderCollection.find({});
      const result = await cursor.toArray();
      res.json(result);
    });

    // get order by filtering user
    app.get("/orders", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const cursor = orderCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // sending order info to the server
    app.post("/servicesOrder", verifyToken, async (req, res) => {
      const servicesOrder = req.body;
      const result = await orderCollection.insertOne(servicesOrder);
      res.json(result);
    });

    //user
    // sending user to databse
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.json(result);
    });

    // sending google user to database
    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.json(result);
    });

    // adding admin to userCollection
    // add role to database
    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await userCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === "admin") {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: "admin" } };
          const result = await userCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      } else {
        res.status(401).json({ message: "you do not have permission" });
      }
    });

    // get special one to make admin
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    // delete
    // delete one order
    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.json(result);
    });

    // delete one service
    app.delete("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await serviceCollection.deleteOne(query);
      res.json(result);
    });

    // update shipping status
    app.put("/orders/update/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = { $set: { status: "shipped" } };
      const result = await orderCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });
    // final
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to cleaning services world!");
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
