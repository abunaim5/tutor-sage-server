require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(express.json());
app.use(
  cors()
);

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
    // await client.connect();

    const classCollection = client.db('tutorSageDB').collection('classes');
    const userCollection = client.db('tutorSageDB').collection('users');
    const teacherRequestCollection = client.db('tutorSageDB').collection('teacherRequests');
    const enrollClassCollection = client.db('tutorSageDB').collection('enrollClasses');
    const feedbackCollection = client.db('tutorSageDB').collection('terFeedbacks');

    // jwt related apis
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    });

    // middlewares
    const verifyToken = (req, res, next) => {
      // console.log(req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'Admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    };

    const verifyTeacher = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isTeacher = user?.role === 'Teacher';
      if (!isTeacher) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    };

    const verifyStudent = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isStudent = user?.role === 'Student';
      if (!isStudent) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    };

    // normal users apis
    app.get('/professionals', async(req, res) => {
      const query = {role: 'Teacher'};
      const limit = 9;
      const professionals = await userCollection.find(query).limit(limit).toArray();
      res.send(professionals);
    });

    // admin related apis
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'Admin';
      }
      res.send({ admin });
    });

    app.get('/teacherRequests/admin', verifyToken, verifyAdmin, async (req, res) => {
      const result = await teacherRequestCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/admin', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get('/classes/admin', verifyToken, verifyAdmin, async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
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

    app.patch('/teacherRequests/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: data.status
        }
      };
      const result = await teacherRequestCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch('/classes/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: data.status
        }
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // teachers related apis
    app.get('/users/teacher/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let teacher = false;
      if (user) {
        teacher = user?.role === 'Teacher'
      }
      res.send({ teacher })
    })

    app.get('/myClasses/:email', verifyToken, verifyTeacher, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/classes', verifyToken, verifyTeacher, async (req, res) => {
      const classData = req.body;
      const result = await classCollection.insertOne(classData);
      res.send(result);
    });

    app.put('/classes/:id', verifyToken, verifyTeacher, async (req, res) => {
      const id = req.params.id;
      const newAssignment = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $push: {
          assignments: newAssignment
        }
      };
      const result = await classCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.patch('/classes/:id', verifyToken, verifyTeacher, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          ...data
        }
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete('/classes/:id', verifyToken, verifyTeacher, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.deleteOne(query);
      res.send(result);
    });

    // students related apis
    app.get('/user/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send(user);
    });

    app.get('/usersCount', async (req, res) => {
      const users = await userCollection.find().toArray();
      const totalUsers = { usersCount: users?.length }
      res.send(totalUsers);
    });

    app.get('/popularClasses', async (req, res) => {
      const query = { status: 'Accepted' };
      const sort = { total_enrolment: -1 };
      const limit = 6;
      const classes = await classCollection.find(query).sort(sort).limit(limit).toArray();
      res.send(classes);
    });

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

    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
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

    app.post('/teacherRequests', async (req, res) => {
      const requestData = req.body;
      const result = await teacherRequestCollection.insertOne(requestData);
      res.send(result);
    });

    app.get('/enrollClasses/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await enrollClassCollection.findOne(query);
      res.send(result);
    });

    app.get('/enrollClass/:email', async (req, res) => {
      const email = req.params.email;
      const query = { user_email: email };
      const result = await enrollClassCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/feedbacks', async (req, res) => {
      const feedbacks = await feedbackCollection.find().toArray();
      res.send(feedbacks);
    });

    app.get('/feedbacks/:id', async (req, res) => {
      const id = req.params.id;
      const query = { class_id: id };
      const result = await feedbackCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/enrollClasses', async (req, res) => {
      const enrollClassInfo = req.body;
      const result = await enrollClassCollection.insertOne(enrollClassInfo);
      res.send(result);
    });

    app.post('/terFeedbacks', async (req, res) => {
      const feedback = req.body;
      console.log(feedback);
      const result = await feedbackCollection.insertOne(feedback);
      res.send(result);
    });

    app.patch('/enrollClasses/:id', async (req, res) => {
      const id = req.params.id;
      const { total_enrolment } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          total_enrolment: total_enrolment
        }
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch('/classAssignment/:id', async (req, res) => {
      const id = req.params.id;
      const { submitCount } = req.body;
      console.log(submitCount)
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          assignment_submitted: submitCount
        }
      }
      const result = await classCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      });
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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
