require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(express.json());
app.use(cors());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xtia1kx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const classCollection = client.db('tutorSageDB').collection('classes');
    const userCollection = client.db('tutorSageDB').collection('users');
    const teacherRequestCollection = client.db('tutorSageDB').collection('teacherRequests');

    // admin related apis
    app.get('/teacherRequests/admin', async (req, res) => {
      const result = await teacherRequestCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/admin', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get('/classes/admin', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      let id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: data.role
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result)
    });

    app.patch('/teacherRequests/admin/:id', async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: data.status
        }
      }
      const result = await teacherRequestCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch('/classes/admin/:id', async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: data.status
        }
      }
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // teachers related apis
    app.post('/classes', async(req, res) => {
      const classData = req.body;
      const result = await classCollection.insertOne(classData);
      res.send(result);
    });

    app.get('/myClasses/:email', async(req, res) => {
      const email = req.params.email;
      const query = {email: email};
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    // users related apis
    app.get('/classes', async (req, res) => {
      const query = { status: 'Accepted' };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/classes/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.findOne(query);
      res.send(result);
    });

    app.get('/users/:email', async(req, res) => {
      const email = req.params.email;
      const query = {email: email};
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (user.email === existingUser?.email) {
        return res.send('User already exist');
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // teacher related api
    app.post('/teacherRequests', async (req, res) => {
      const requestData = req.body;
      const result = await teacherRequestCollection.insertOne(requestData);
      res.send(result);
      // console.log(requestData);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Tutor Sage Server is Running');
});

app.listen(port, () => {
  console.log(`Tutor Sage Server is Running on PORT ${port}`)
})
