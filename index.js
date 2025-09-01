const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors())
app.use(express.static('public'))
const mongoose = require('mongoose')
const {Schema} = mongoose;
mongoose.connect(process.env.DB_URL)

const UserSchema = new Schema({
  username: String,
});

const User = mongoose.model('User', UserSchema)

const ExerciseSchema = new Schema({
  user_id : {type: String, required: true},
  description: String, 
  duration: Number, 
  date: Date, 


}); 

const Exercise = mongoose.model('Exercise', ExerciseSchema);







app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {

  try{
    const username = req.body.username
    if (await User.findOne({username})){
      return res.json({error:"Username taken or user exists"})
    }
     const newUser = new User({username})
     const savedUser = await newUser.save()


    res.json({
      username:savedUser.username,
      _id: savedUser._id
    });


  } catch(err){
    console.log(err)
    res.status(500).json({error: 'Server error'})
  }

})

app.get('/api/users', async (req,res)=>{

  try {
    const allUsers = await User.find({}, 'username _id');
    
    res.json(allUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


app.post('/api/users/:_id/exercises', async (req,res)=>{

  try{
    const description = req.body.description
    const duration = req.body.duration
    const date = req.body?.date
    const { _id } = req.params;;

    if (!date){
      const date = new Date()
    }
    const user = await User.findById(_id)

    if (!user){
      return res.json({error:"Couldn't find user"})
    }

    const exercise = new Exercise({
      user_id: user._id,
      description,
      duration: Number(duration),
      date: date ? new Date(date) : new Date()


    })
    const savedExercise = await exercise.save()

    if (!savedExercise){
      return res.status(500).json({ error: 'Error saving exercise ' });

    }


    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
      _id: user._id

    });

  }
  catch(err){
    console.log(err)
    res.status(500).json({ error: 'Server error' });
  }

})


app.get('/api/users/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to, limit } = req.query;

    const user = await User.findById(id);
    if (!user) return res.json({ error: "Couldn't find user" });

    const query = { user_id: id };
    const dateFilter = {};

    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) dateFilter.$gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) dateFilter.$lte = toDate;
    }
    if (Object.keys(dateFilter).length) query.date = dateFilter;

    const lim = Number.isInteger(parseInt(limit, 10)) && parseInt(limit, 10) > 0
      ? parseInt(limit, 10)
      : 0;

    const exercises = await Exercise.find(query)
      .sort({ date: 1 })
      .limit(lim);

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date ? e.date.toDateString() : new Date().toDateString(),
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});






const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
