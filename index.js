const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors())
app.use(express.static('public'))

const mongoose = require('mongoose')
const { Schema } = mongoose

mongoose.connect(process.env.MONGODB_URI)

const UserSchema = new Schema({
  username: { type: String, required: true }
})
const User = mongoose.model('User', UserSchema)

const ExerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
})
const Exercise = mongoose.model('Exercise', ExerciseSchema)

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

app.post('/api/users', async (req, res) => {
  try {
    const username = (req.body.username || '').toString().trim()
    if (!username) return res.status(400).json({ error: 'username is required' })

    const saved = await new User({ username }).save()
    return res.json({ username: saved.username, _id: saved._id })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id').lean()
    return res.json(users)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params
    const { description, duration } = req.body
    let { date } = req.body

    const user = await User.findById(_id)
    if (!user) return res.json({ error: "Couldn't find user" })

    if (!description || duration === undefined) {
      return res.status(400).json({ error: 'description and duration are required' })
    }

    const durNumber = Number(duration)
    if (Number.isNaN(durNumber)) {
      return res.status(400).json({ error: 'duration must be a number' })
    }

    let exerciseDate
    if (!date) {
      exerciseDate = new Date()
    } else {
      const parsed = new Date(date)
      exerciseDate = isNaN(parsed.getTime()) ? new Date() : parsed
    }

    const saved = await new Exercise({
      user_id: user._id.toString(),
      description: description.toString(),
      duration: durNumber,
      date: exerciseDate
    }).save()

    return res.json({
      _id: user._id,
      username: user.username,
      date: saved.date.toDateString(),
      duration: saved.duration,
      description: saved.description
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params
    const { from, to, limit } = req.query

    const user = await User.findById(_id)
    if (!user) return res.json({ error: "Couldn't find user" })

    const query = { user_id: _id }
    const dateFilter = {}

    if (from) {
      const d = new Date(from)
      if (!isNaN(d.getTime())) dateFilter.$gte = d
    }
    if (to) {
      const d = new Date(to)
      if (!isNaN(d.getTime())) dateFilter.$lte = d
    }
    if (Object.keys(dateFilter).length) query.date = dateFilter

    let cursor = Exercise.find(query).sort({ date: 1 })
    const lim = parseInt(limit, 10)
    if (!Number.isNaN(lim) && lim > 0) cursor = cursor.limit(lim)

    const exercises = await cursor.lean()

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: new Date(e.date).toDateString()
    }))

    return res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
