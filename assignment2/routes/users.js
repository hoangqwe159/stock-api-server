var express = require('express');
var router = express.Router();
const {hashPassword, isValid} = require('../utils/hashPassword');
const jwt = require('jsonwebtoken')

/**
 * @endpoint - /user/register
 * Register a new account
 */
const register = (req, res, next) => {
  const body = req.body
  // Check if missing password or email
  if(!body.email || !body.password)
  {        
    res.status(400).json({"error": true, "message": "Request body incomplete - email and password needed"})

  }else{
    //  Check if account has already created 
    const {email, password} = body
    req.db.from('users').select('*').where({email: email})
      .then((rows) => {
        // If account has already created
        if(rows.length > 0){
          res.status(409).json({"error": true, "message": 'User already exists!'})
        }
        // Create new account
        else{
          const hashed = hashPassword(password)
          req.db('users').insert({email: email, password: hashed})
            .then(() => {
              res.status(201).json({"success": true, "message": 'User created'})
            })          
        }
      })
      .catch((e) => {
        res.status(404).json({"error": true, "message": 'Error in MySQL database'})
      })
  }
}

/**
 * @endpoint - /user/login
 * Login to an account
 */
const login = (req, res, next) => {
  const body = req.body
  // Check if email or password is missing
  if(!body.email || !body.password)
  {     
      res.status(400).json({"error": true, "message": "Login info incomplete"})
  }else{
    req.db.from('users').select('*').where({email: body.email})
      .then((rows) => {
        // Check if the account exist
        if(rows.length === 0){
          res.status(401).json({error: true, message: "User email not found"})
        }
        else{
          const user = rows[0]
          // If the password is incorrect
          if(!isValid(body.password, user.password)){
            res.status(401).json({error: true, message: "Incorrect password"})
          }
          // If the password is correct
          else{ 
            // Create token
            const secretKey = process.env.SECRET_KEY
            const expires_in = 60 * 60 * 24 //1 day
            const exp = Math.floor(Date.now()/1000) + expires_in
            const token = jwt.sign({email: user.email, exp}, secretKey)
            res.status(200).json({
              token_type: "Bearer", token, expires_in
            })
          }
        }
      })
      .catch((err) => {        
        res.status(404).json({"error": true, "message": "Error in MySQL database"})
      })
  }
}

/**
 * @endpoint - /user/register
 */
router.post('/register', register)

/**
 * @endpoint - /user/login
 */
router.post('/login', login)



module.exports = router;
