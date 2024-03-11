const express = require("express");
const app = express();
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { MongoClient } = require("mongodb");

const uri =
  "mongodb+srv://eyagargah:mypassword@cluster0.s98m2ta.mongodb.net/test";

/*******Cors********/
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:4200");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, HEAD, POST, PUT, DELETE, OPTIONS"
  );
  next();
});

app.use(express.json({limit: '20mb'}));

app.get("/", (req, res) => {
  res.json("hello to my app");
});

/*********User Methods*******/

//get user
app.get("/user", async (req, res) => {
  const client = new MongoClient(uri);
  const userId = req.query.userId;

  try {
    await client.connect();
    const db = client.db("app-data");

    const users = db.collection("users");
    const query = { user_id: userId };

    const user = await users.findOne(query);
    res.send(user);
  } finally {
    await client.close();
  }
});

//update user profile

app.put("/user", async (req, res) => {
  const client = new MongoClient(uri);
  const formData = req.body.formData;
  try {
    await client.connect();
    const db = client.db("app-data");
    const users = db.collection("users");

    const query = { user_id: formData.user_id };

    const updateDocument = {
      $set: {
        first_name: formData.first_name,
        dob_day: formData.dob_day,
        dob_month: formData.dob_month,
        dob_year: formData.dob_year,
        show_gender: formData.show_gender,
        gender_identity: formData.gender_identity,
        gender_interest: formData.gender_interest,
        url: formData.url,
        about: formData.about,
        matches: formData.matches,
      },
    };

    const insertedUser = await users.updateOne(query, updateDocument);
    res.send(insertedUser);
  } finally {
    await client.close();
  }
});

/**********Account Management**************/
//sign up
app.post("/signup", async (req, res) => {
  const client = new MongoClient(uri);
  const { email, password } = req.body;

  const generatedUserId = uuidv4();
  const hashed_password = await bcrypt.hash(password, 10);

  try {
    await client.connect();
    const db = client.db("app-data");
    const users = db.collection("users");

    const existingUser = await users.findOne({ email });

    if (existingUser) {
      return res.status(409).send("User already exists.please sign in");
    }

    const sanitizedEmail = email.toLowerCase();

    const data = {
      user_id: generatedUserId,
      email: sanitizedEmail,
      hashed_password: hashed_password,
    };

    const insertedUser = await users.insertOne(data);

    const token = jwt.sign(insertedUser, sanitizedEmail, {
      //expires in 24 hrs
      expiresIn: 60 * 24,
    });

    res
      .status(201)
      .json({ token, userId: generatedUserId, email: sanitizedEmail });
  } catch (err) {
    console.log(err);
  }
});

//Log in
app.post("/login", async (req, res) => {
  const client = new MongoClient(uri);
  const { email, password } = req.body;

  try {
    await client.connect();
    const db = client.db("app-data");
    const users = db.collection("users");

    const existingUser = await users.findOne({ email });

    const correctPassword = await bcrypt.compare(
      password,
      existingUser.hashed_password
    );
    if (existingUser && correctPassword) {
      const token = jwt.sign(existingUser, email, {
        expiresIn: 60 * 24,
      });
      return res.status(201).json({ token, userId: existingUser.user_id });
    }
    return res.status(400).send("Invalid credentials");
  } catch (err) {
    console.log(err);
  }
});

// Get all Users by userIds in the Database
app.get('/users', async (req, res) => {
  const client = new MongoClient(uri)
  const userIds = JSON.parse(req.query.userIds)

  try {
      await client.connect()
      const database = client.db('app-data')
      const users = database.collection('users')

      const pipeline =
          [
              {
                  '$match': {
                      'user_id': {
                          '$in': userIds
                      }
                  }
              }
          ]

      const foundUsers = await users.aggregate(pipeline).toArray()

      res.json(foundUsers)

  } finally {
      await client.close()
  }
})




//get users by gender
app.get('/gendered-users', async (req, res) => {
  const client = new MongoClient(uri)
  const gender = req.query.gender

  try {
      await client.connect()
      const database = client.db('app-data')
      const users = database.collection('users')
      const query = {gender_identity: {$eq: gender}}
      const foundUsers = await users.find(query).toArray()
      res.json(foundUsers)

  } finally {
      await client.close()
  }
})

// Update User with a match
app.put('/addmatch', async (req, res) => {
  const client = new MongoClient(uri)
  const {userId, matchedUser} = req.body

  try {
      await client.connect()
      const database = client.db('app-data')
      const users = database.collection('users')

      const query = {user_id: userId}
      const updateDocument = {
          $push: {matches: {user: matchedUser}}
      }
      const user = await users.updateOne(query, updateDocument)
      res.send(user)
  } finally {
      await client.close()
  }
})

// Get Messages by from_userId and to_userId
app.get('/messages', async (req, res) => {
  const {userId, correspondingUserId} = req.query
  const client = new MongoClient(uri)
  try {
      await client.connect()
      const database = client.db('app-data')
      const messages = database.collection('messages')

      const query = {
          from_userId: userId, to_userId: correspondingUserId
      }
      const foundMessages = await messages.find(query).toArray()
      res.json(foundMessages)
      
  } finally {
      await client.close()
  }
})

// Add a Message to our Database
app.post('/message', async (req, res) => {
  const client = new MongoClient(uri)
  const message = req.body.message

  try {
      await client.connect()
      const database = client.db('app-data')
      const messages = database.collection('messages')

      const insertedMessage = await messages.insertOne(message)
      res.send(insertedMessage)
  } finally {
      await client.close()
  }
})


app.listen(8000, () => console.log(`Server Started at ${8000}`));
