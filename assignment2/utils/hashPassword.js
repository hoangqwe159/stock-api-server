const bcryt = require('bcrypt')

/**
 * Hash a password
 * @param {string} password - Password from request body
 * @returns {string}  A hashed password
 */
exports.hashPassword = (password) => {
  const saltRounds = 10
  const hash = bcryt.hashSync(password, saltRounds)
  return hash
}

exports.isValid = (password, hash) => {
  return bcryt.compareSync(password,hash)
}