const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const stripe = require("stripe")(process.env.STRIPE_KEY);


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cez8utx.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access')
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_KEY, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}




async function run() {
    try {
        const mobilesCollection = client.db('ssh-mobile').collection('mobiles');
        const bookingsCollection = client.db('ssh-mobile').collection('bookings');
        const usersCollection = client.db('ssh-mobile').collection('users');
        const paymentsCollection = client.db('ssh-mobile').collection('payments');


        app.get('/mobiles', async (req, res) => {
            const query = {};
            const allPhones = await mobilesCollection.find(query).toArray();
           

            const bookingQuery = {};
            const alreadyBook = await bookingsCollection.find(bookingQuery).toArray();

            const resultAllPhone = allPhones.filter(({ model: model }) => !alreadyBook.some(({ mobileModel: mobileModel }) => model === mobileModel));
           
    
            res.send(resultAllPhone)
        });
        app.get('/mobiles/:brand', async (req, res) => {
            const query = {};
           
            
            const allPhones = await mobilesCollection.find(query).toArray();

            const bookingQuery = {};
            const alreadyBook = await bookingsCollection.find(bookingQuery).toArray();

            const resultAllPhone = allPhones.filter(({ model: model }) => !alreadyBook.some(({ mobileModel: mobileModel }) => model === mobileModel));


            const brand = req.params.brand;

            if (brand === "other") {


                const result = resultAllPhone.filter(otherMobile => otherMobile.brandName !== 'samsung' && otherMobile.brandName !== 'iphone');
                res.send(result)
            }
            else if (brand === "samsung") {

                const result = resultAllPhone.filter(otherMobile => otherMobile.brandName === 'samsung');
                res.send(result)
            }
            else {

                const result = resultAllPhone.filter(otherMobile => otherMobile.brandName === 'iphone');
                res.send(result)
            }

        });

        app.get('/mobiles/:brand/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await mobilesCollection.findOne(query);
            res.send(result)
        });


        app.get('/advertise', async(req, res) => {
            
            const query = {};
            const advertises = await mobilesCollection.find(query).toArray();
            const result=advertises.filter(advertise=>advertise.isAdvertise==='advertise');
            res.send(result)
        });

        app.get('/reported', async(req, res) => {
            
            const query = {};
            const advertises = await mobilesCollection.find(query).toArray();
            const result=advertises.filter(advertise=>advertise.isReported==='report');
            res.send(result)
        });

       

       


        app.get('/bookings', async (req, res) => {
            const email = req.query.email;

            const query = {

                buyersEmail: email
            }
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings)
        });


        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await bookingsCollection.findOne(query);
            res.send(result);
        });



        app.get('/mobiles/dashboard/myProduct/:email', async(req,res)=>{
            const email=req.params.email;
        
            const query = {

                sellerEmail: email
            }
            const result = await mobilesCollection.find(query).toArray();
            res.send(result)

        })


        app.get('/users', async (req, res) => {
            const query = {};
            
            const allUsers = await usersCollection.find(query).toArray();
            const result=allUsers.filter(oneUser=>oneUser.userType==='User');
            res.send(result);
        });
        app.get('/seller', async (req, res) => {
            const query = {};
            
            const allUsers = await usersCollection.find(query).toArray();
            const result=allUsers.filter(oneUser=>oneUser.userType==='Seller');
            res.send(result);
        });

    app.get('/user/:email', async(req,res)=>{
        const email=req.params.email;
       
        const query={
            userEmail:email
        }
        const result=await usersCollection.findOne(query);
        res.send(result)
    });


    app.get('/users/dashboard/:email', async(req,res)=>{
        const email=req.params.email;
       
        const query={
            userEmail:email
        }
        const result=await usersCollection.findOne(query);
        res.send(result)
    });

    app.get('/jwt', async (req, res) => {
        const email = req.query.email;
       
        const query = {
            userEmail: email
        }
        const user = await usersCollection.findOne(query);
        if (user) {
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_KEY, { expiresIn: '1d' })
            return res.send({ accessToken: token })
        }
        res.status(403).send({ accessToken: '' })
    });

        app.post('/mobiles',verifyJWT, async (req, res) => {
            const mobile = req.body;
            const result = await mobilesCollection.insertOne(mobile);
            res.send(result)
        });


        app.post("/create-payment-intent", async (req, res) => {
            const order=req.body
            console.log(order)
            const price=order.mobilePrice
            const amount=price*100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency:'usd',
                amount:amount,
                "payment_method_types":[
                    'card'
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
              });
           
        })

        app.post('/payments', async(req,res)=>{
            const payment=req.body;
            const result= await paymentsCollection.insertOne(payment);
            const id=payment.bookingId;
            const filter={_id:ObjectId(id)}

            const updateDoc={
                $set:{
                    paid:true,
                    transactionId:payment.transactionId,
                }
            }
            const updatedResult=await bookingsCollection.updateOne(filter,updateDoc)
            res.send(result)
        })


        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result)
        });

         app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result)
        });

        app.put('/mobile/:id',  async (req, res) => {

            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    isReported: 'report'
                }
            }
            const result = await mobilesCollection.updateOne(filter, updateDoc, options)

            res.send(result)
        });


        app.put('/mobiles/:id',  async (req, res) => {

            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    isAdvertise: 'advertise'
                }
            }
            const result = await mobilesCollection.updateOne(filter, updateDoc, options)

            res.send(result)
        });


        app.put('/user/:id',verifyJWT,  async (req, res) => {

            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    isVerify: 'verify'
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options)

            res.send(result)
        });

        app.delete('/mobiles/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await mobilesCollection.deleteOne(query)
            res.send(result)
        })
        app.delete('/bookings/:id',verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bookingsCollection.deleteOne(query)
            res.send(result)
        })
        app.delete('/users/:id',verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query)
            res.send(result)
        })

    }
    finally {

    }
}



run().catch(console.log)



app.get('/', (req, res) => {
    res.send('SSH-MOBILE SERVER IS RUNNING');
});


app.listen(port, () => {
    console.log(`SSH-MOBILE server running on Port ${port}`)
})