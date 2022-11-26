const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app=express();

const { MongoClient, ServerApiVersion } = require('mongodb');
const port=process.env.PORT||5000;


app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cez8utx.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run(){
    try{
        const mobilesCollection = client.db('ssh-mobile').collection('mobiles');
       

        app.get('/mobiles', async (req, res) => {
          
           
        const query = {};
       
      
            const result =await mobilesCollection.find(query,).toArray();
            res.send(result)
         
           
        });

    }
    finally{

    }
}



run().catch(console.log)



app.get('/',(req,res)=>{
    res.send('SSH-MOBILE SERVER IS RUNNING');
});


app.listen(port,()=>{
    console.log(`SSH-MOBILE server running on Port ${port}`)
})