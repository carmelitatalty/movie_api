const jwtSecret = 'your_jwt_secret';

const jwt = require('jsonwebtoken'),
  passport = require('passport');

require('passport');

/**
 * Signs in a user and generates a 7 day JWT token.
 * @param {*} user 
 * @returns {string} token
*/
let generateJWTToken = (user) => {
  return jwt.sign(user, jwtSecret, {
    subject: user.Username,
    expiresIn: '7d', 
    algorithm: 'HS256'
  });
}



/** Sets up the login endpoint.
 * @async
 * @function login
 * @param {*} router 
 * @returns {*} userToken
 */
module.exports = (router) => {
  router.post('/login', (req, res) => {
    // res.set('Access-Control-Allow-Origin', 'http://2-6-frontend.s3-website-us-west-2.amazonaws.com');
    passport.authenticate('local', { session: false }, (error, user, info) => {
      if (error || !user) {
        return res.status(400).json({
          message: 'Does not match our records. Please try again',
          user: user,
        });
      }
      req.login(user, { session: false }, (error) => {
        if (error) {
          res.send(error);
        }
        let token = generateJWTToken(user.toJSON());
        return res.json({ user, token });
      });
    })(req, res);
  });
}
