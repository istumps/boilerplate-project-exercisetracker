const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true })); 
app.use(express.json());
app.use(express.static('public'));


const { Schema } = mongoose;
mongoose.connect(process.env.MONGODB_URI, {
});

const UserSchema = new Schema({
  username: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

const ExerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});
const Exercise = mongoose.model('Exercise', ExerciseSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', async (req, res) => {
  try {
    const username = (req.body.username || '').toString().trim();
    if (!username) return res.json({ error: 'username is required' });

    const saved = await new User({ username }).save();
    return res.json({ username: saved.username, _id: saved._id });
  } catch (err) {
    console.error('POST /api/users error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id').lean();
    return res.json(users);
  } catch (err) {
    console.error('GET /api/users error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params;
    const user = await User.findById(_id).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const description = (req.body.description ?? '').toString().trim();
    const durationNum = Number(req.body.duration);
    let dateStr = (req.body.date ?? '').toString().trim();

    if (!description || Number.isNaN(durationNum)) {
      return res
        .status(400)
        .json({ error: 'description (string) and duration (number) are required' });
    }

    let exerciseDate;
    if (!dateStr) {
      exerciseDate = new Date();
    } else {
      const parsed = new Date(dateStr);
      exerciseDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    }

    const saved = await new Exercise({
      user_id: user._id.toString(),
      description,
      duration: durationNum,
      date: exerciseDate
    }).save();

    return res.json({
      _id: user._id,
      username: user.username,
      date: saved.date.toDateString(), 
      duration: saved.duration,       
      description: saved.description
    });
  } catch (err) {
    console.error('POST /api/users/:_id/exercises error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    const user = await User.findById(_id).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const query = { user_id: _id };
    const dateFilter = {};
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) dateFilter.$gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) dateFilter.$lte = d;
    }
    if (Object.keys(dateFilter).length > 0) {
      query.date = dateFilter;
    }

    let q = Exercise.find(query).sort({ date: 1 });
    const lim = parseInt(limit, 10);
    if (!Number.isNaN(lim) && lim > 0) q = q.limit(lim);

    const exercises = await q.lean();

    const log = exercises.map(e => ({
      description: e.description,
      duration: Number(e.duration), 
      date: new Date(e.date).toDateString()
    }));

    return res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log
    });
  } catch (err) {
    console.error('GET /api/users/:_id/logs error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

mongoose.connection.once('open', () => {
  const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port);
  });
});
