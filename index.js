const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
        const myProfileCollection = client.db('go-car-mechanic').collection('myProfile');
        const myPortfolioCollection = client.db('go-car-mechanic').collection('myPortfolio');
        const paymentCollection = client.db('go-car-mechanic').collection('payments');



        // POST API for added products/tools
        app.post('/service', async (req, res) => {
            const service = req.body;
            console.log('hit the post api', service);

            const result = await serviceCollection.insertOne(service);
            console.log(result);
            res.json(result)
        });


        // load all my data 
        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        })


        //  delete products or tools
        app.delete('/service/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            console.log('query: ',query);
            const result = await serviceCollection.deleteOne(query);
            console.log('result: ',result);
            res.json(result);
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
                return res.status(403).send({ message: 'forbidden access' })
            }
        })



        //  specific order details load by order id  for payment 
        app.get('/order/:id', async(req,res)=> {
            const id = req.params.id;
            const query = { _id: ObjectId(id)}
            const order = await orderCollection.findOne(query);
            res.send(order);
        })


        // for save payment details in db 
        app.patch('/order/:id', async(req, res) =>{
            const id  = req.params.id;
            const payment = req.body;
            const filter = {_id: ObjectId(id)};
            const updatedDoc = {
              $set: {
                paid: true,
                transactionId: payment.transactionId
              }
            }
      
            const result = await paymentCollection.insertOne(payment);
            const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
            res.send(updatedOrder);
          })


        // payment system 
        app.post('/create-payment-intent', async(req,res)=> {
            const service = req.body;
            const price = service.orderPrice;
            const amount = price*100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types:['card']
            });
            res.send({clientSecret: paymentIntent.client_secret})
        });




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


        // make user in admin
        app.put('/user/admin/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })


        // ----------------
        // app.put('/user/admin/:email', async (req, res) => {
        //     const email = req.params.email;
        //     const requester = req.decoded.email;
        //     const requesterAccount = await userCollection.findOne({ email: requester });
        //     if (requesterAccount.role === 'admin') {
        //         const filter = { email: email };
        //         const updateDoc = {
        //             $set: { role: 'admin' },
        //         };
        //         const result = await userCollection.updateOne(filter, updateDoc);
        //         res.send(result);
        //     }
        //     else {
        //         res.status(403).send({message: 'forbidden'});
        //     }

        // })
        // ----------------


        // get user 
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })


        //  Show All myProfile in Dashboard
        app.get('/showAllProfile', async (req, res) => {
            const cursor = myProfileCollection.find({});
            const services = await cursor.toArray();
            res.send(services);
        });


        // load single specific (only login user) myProfile       
        app.get('/myProfile', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const orders = await myProfileCollection.find(query).toArray();
            return res.send(orders);

        })




        // POST API for myProfile
        app.post('/myProfile', async (req, res) => {
            const service = req.body;
            console.log('hit the post api', service);

            const result = await myProfileCollection.insertOne(service);
            console.log(result);
            res.json(result)
        });



        // POST API for myPortfolio
        app.post('/myPortfolio', async (req, res) => {
            const service = req.body;
            console.log('hit the post api', service);

            const result = await myPortfolioCollection.insertOne(service);
            console.log(result);
            res.json(result)
        });


         // load single specific (only login user) myPortfolio       
         app.get('/myPortfolio', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const orders = await myPortfolioCollection.find(query).toArray();
            return res.send(orders);

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