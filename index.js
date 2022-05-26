const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express')
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.krbqjaa.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try{
        await client.connect();
        
        const serviceCollection = client.db('go-car-mechanic').collection('services');
        const orderCollection = client.db('go-car-mechanic').collection('orders');
        const reviewCollection = client.db('go-car-mechanic').collection('review');
        const userCollection = client.db('go-car-mechanic').collection('users');




        // load all my data 
        app.get('/service', async(req,res) =>{
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        })

        // post my order 
        app.post('/order', async(req,res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })

        // load my orders
        app.get('/order', async(req,res) => {
            const orderEmail = req.query.orderEmail;
            const query = {orderEmail: orderEmail};
            const orders = await orderCollection.find(query).toArray();
            res.send(orders); 
        })


          // POST API for review
          app.post('/review', async (req, res) => {
            const service = req.body;
            console.log('hit the post api', service);

            const result = await reviewCollection.insertOne(service);
            console.log(result);
            res.json(result)
        });


        // GET API for review
        app.get('/review', async (req, res) => {
            const cursor = reviewCollection.find({});
            const services = await cursor.toArray();
            res.send(services);
        });


        // for set user in database
        app.put('/user/:email', async(req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })


    }
    finally{

    }
}

run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Hello car mechanics')
})

app.listen(port, () => {
    console.log(`Car Mechanics app listening on port ${port}`)
})