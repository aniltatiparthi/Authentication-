const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'userData.db')
let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Success')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()
const validatePassword = password => {
  return password.length > 4
}

// API 1 User Register
app.post('/register/', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  const hashedPassword = await bcrypt.hash(request.body.password, 10)
  const selectUserQuery = `SELECT * FROM user WHERE username= '${username}'`
  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    const createUserQuery = `
            INSERT INTO 
                user (username, name, password, gender, location) 
            VALUES (
                '${username}', 
                '${name}',
                '${hashedPassword}', 
                '${gender}',
                '${location}'
            )`
    if (validatePassword(password)) {
      await db.run(createUserQuery)
      response.send('User created successfully')
    } else {
      response.status(400)
      response.send('Password is too short')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

// API 2 Login
app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      response.send('Login success!')
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

// API 3 Change Password
app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  const checkForUserQuery = `SELECT * FROM user WHERE username= '${username}'`
  const dbUser = await db.get(checkForUserQuery)

  if (dbUser === undefined) {
    response.status(400)
    response.send('User not registered')
  } else {
    const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password)
    if (isPasswordMatched === true) {
      if (validatePassword(newPassword)) {
        const encryptedPassword = await bcrypt.hash(newPassword, 10)
        const updatePasswordQuery = `
          UPDATE
            user
          SET 
            password= '${encryptedPassword}'
          WHERE
            username= '${username}'`
        await db.run(updatePasswordQuery)
        response.send('Password updated')
      } else {
        response.status(400)
        response.send('Password is too short')
      }
    } else {
      response.status(400)
      response.send('Invalid current password')
    }
  }
})

module.exports = app;
