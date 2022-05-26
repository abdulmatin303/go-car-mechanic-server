const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.krbqjaa.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


// jwt function 
function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });

}


async function run() {
    try {
        await client.connect();

        const serviceCollection = client.db('go-car-mechanic').collection('services');
        const orderCollection = client.db('go-car-mechanic').collection('orders');
        const reviewCollection = client.db('go-car-mechanic').collection('review');
        const userCollection = client.db('go-car-mechanic').collection('users');




        // load all my data 
        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        })

        // post my order 
        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })


        // load my orders  with jwt      
        app.get('/order', verifyJWT, async (req, res) => {
            const orderEmail = req.query.orderEmail;
            const authorization = req.headers.authorization;
            const decodedEmail = req.decoded.email;
            if (orderEmail === decodedEmail) {
                const query = { orderEmail: orderEmail };
                const orders = await orderCollection.find(query).toArray();
                return res.send(orders);
            }
            else {
                return res.status(403).send({message : 'forbidden access'})
            }
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
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);

            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        })


    }
    finally {

    }
}

run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Hello car mechanics')
})

app.listen(port, () => {
    console.log(`Car Mechanics app listening on port ${port}`)
})