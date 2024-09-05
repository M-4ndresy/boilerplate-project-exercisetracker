const express = require('express')
const app = express()
const cors = require('cors')
const mongoose  = require('mongoose')
const bodyParser = require("body-parser")
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
////////////////////////////////////////////////////
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const exerciseSchema = new mongoose.Schema({
  username: {
    type: String
  },
  description: {
    type: String
  },
  duration: {
    type: Number
  },
  date: {
    type: Date
  }
});

const userSchema = new mongoose.Schema({
  username: {
    type: String
  }
});

const collections = {
  exercise: mongoose.model('Exercise', exerciseSchema),
  user: mongoose.model('User', userSchema),
};

const { exercise, user } = collections;

app.post("/api/users",(req,res)=>{
  const {username} = req.body
  const data = new user({username:username})
  user.find({username:username}).then((result)=>{
   if(result.length){
    return res.json({ message: "User already exists" });
   }
   data.save((err,data)=>{
     if(!err){
       res.json({_id:data._id,username:data.username})
     }else{
       console.log("----error---- : ",err)
     }
   })
  })
})

app.get("/api/users",(req,res)=>{
  user.find().sort({_id:1,username:1}).select("username").then((resultat)=>{
   res.send(resultat)
  })
})

app.post("/api/users/:_id/exercises", (req, res) => {
  let { description, duration, date } = req.body;
  const _id = req.params._id;
  
  function formatDate(date) {
   return  new Date(date).toDateString()
  }

  user.findById(_id).then(user => {
    if (!user) {
      return res.status(404).json({ message: "User does not exist" });
    }
    
    if (!date) {
      date = new Date().toDateString();
    }

  
    const formattedDate = formatDate(date);

    const data = new exercise({
      username: user.username,
      description,
      duration: parseInt(duration),
      date: formattedDate
    });

    data.save((err, savedData) => {
      if (err) {
        return res.status(500).json({ message: "Error saving exercise" });
      }
      
      res.json({
         _id:_id,
        username: user.username,
        date: formatDate(savedData.date).toString(),
        duration: parseInt(savedData.duration),
        description: savedData.description,
      });
    });
  })
});




app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;
  
  try {
    const User = await user.findById(_id).exec();
    if (!User) {
      return res.status(404).json({ message: "User not found" });
    }
    
    let query = exercise.find({ username: User.username });
    
    if (from || to) {
      let fromDate = from ? new Date(from) : new Date(0); 
      let toDate = to ? new Date(to) : new Date();  
      query.where('date').gte(fromDate).lte(toDate);
    }
    
    if (limit) {
      query.limit(parseInt(limit));
    }
    
    const Exercise = await query.exec();
    const log = Exercise.map(v => ({
      description: v.description,
      duration: v.duration,
      date: new Date(v.date).toDateString()
    }));
    
    res.json({ _id: _id, username: User.username, count: log.length, log });
  } catch (err) {
    res.status(500).json({ message: "Error retrieving logs" });
  }
});


////////////////////////////////////////////////////
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
