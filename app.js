const express = require('express')
const app = express()
app.use(express.json())

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

let db
const dbPath = path.join(__dirname, 'twitterClone.db')

const initializeDBserver = async () => {
  try {
    db = await open({filename: dbPath, driver: sqlite3.Database})
    app.listen(3000, () => {
      console.log('Running and scraping Skies')
    })
  } catch (err) {
    console.log(`message:${err.message}`)
    process.exit(1)
  }
}

app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body
  const getUserQuery = `SELECT * FROM user WHERE username='${username}'`
  const dbUser = await db.get(getUserQuery)

  if (dbUser === undefined) {
    if (password.length >= 6) {
      const hashedPassword = await bcrypt.hash(password, 10)
      const createUserQuery = `INSERT INTO user(username, password, name, gender)
                                  VALUES('${username}', '${hashedPassword}', '${name}', '${gender}')`
      response.status(200)
      response.send('User created successflly')
    } else {
      response.status(400)
      response.send('Password is too short')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const getUserQuery = `SELECT * FROM user WHERE username='${username}'`
  const dbUser = await db.get(getUserQuery)

  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswrdCorrect = await bcrypt.compare(password, dbUser.password)
    if (isPasswrdCorrect) {
      const payload = {username: username}
      const jwtToken = await jwt.sign(payload, 'My_Token')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

const authenticateToken = (request, response, next) => {
  let token
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    token = authHeader.split(' ')[1]
  }

  if (token !== undefined) {
    jwt.verify(token, 'My_Token', (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  } else {
    response.status(401)
    response.send('Invalid JWT Token')
  }
}

app.get('/user/tweets/feed/', authenticateToken, async (request, response) => {
  const {username} = request
  const userIdQuery = `SELECT user_id as userId from user Where username='${username}'`
  const userId = await db.get(userIdQuery)

  const followingUserQuery = `SELECT following_user_id from follower WHERE follower_id=${userId} ORDER BY following_user_id`

  const feedQuery = `SELECT tweet_id, tweet, date_time
                    FROM tweet WHERE user_id = ${userId}
                    LIMIT 4`
  const feed = await db.all(feedQuery)
  response.send({userId})
})

initializeDBserver()
module.exports = app 