const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express')
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.krbqjaa.mongodb.net/?retryWrites=true&w=majority`;

console.log(uri);

app.get('/', (req, res) => {
    res.send('Hello car mechanics')
})

app.listen(port, () => {
    console.log(`Car Mechanics app listening on port ${port}`)
})