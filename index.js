const express = require('express'),
  morgan = require('morgan'),
  fs = require('fs'), 
  path = require('path');

  

const mongoose = require('mongoose');
const Models = require('./models.js');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
let auth = require('./auth.js')(app);
const passport = require('passport');
require('./passport.js');

mongoose.connect('mongodb://127.0.0.1:27017/movieflix', { useNewUrlParser: true, useUnifiedTopology: true });

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'log.txt'), {flags: 'a'})

app.use(morgan('combined', {stream: accessLogStream}));

app.use('/public', express.static('public'));

const Movies = Models.Movie;
const Users = Models.User;

app.get('/topMovies'
    , passport.authenticate('jwt', { session: false })
    , (req, res) => {
  Movies.find({ 'Featured':true})
        .then((movies) => {
            res.send(movies);
        })
        .catch((err) => {
            res.status(401).send();
        });
});
    
app.get('/movies'
, passport.authenticate('jwt', { session: false })
, (req, res) => {
  Movies.find({ })
  .then((movies) => {
      res.send(movies);
  })
  .catch((err) => {
      res.status(401).send();
  });
});

app.get('/movies/:title'
, passport.authenticate('jwt', { session: false })
, (req, res) => {
  Movies.find({ 'Title':req.params.title})
  .then((movies) => {
      res.send(movies);
  })
  .catch((err) => {
      res.status(401).send();
  });
});

app.get('/genre/:genre'
, passport.authenticate('jwt', { session: false })
, (req, res) => {
    Movies.find({ 'Genre.Name':req.params.genre})
        .then((movies) => {
            res.send(movies);
        })
        .catch((err) => {
            res.status(401).send();
        });
});


    app.post('/users'
    , async (req, res) => {
        await Users.findOne({ Username: req.body.Username })
          .then((user) => {
            if (user) {
              return res.status(400).send(req.body.Username + 'already exists');
            } else {
              Users
                .create({
                  Username: req.body.Username,
                  Password: req.body.Password,
                  Email: req.body.Email,
                  Birthday: req.body.Birthday
                })
                .then((user) =>{res.status(201).json(user) })
              .catch((error) => {
                console.error(error);
                res.status(500).send('Error: ' + error);
              })
            }
          })
          .catch((error) => {
            console.error(error);
            res.status(500).send('Error: ' + error);
          });
      });
    


    app.put('/users/:Username'
    , passport.authenticate('jwt', { session: false })
    , async (req, res) => {
      if (req.user.Username != req.params.Username) {
        return res.status(400).send("Permission Denied")
      }
        await Users.findOneAndUpdate({ Username: req.params.Username }, { $set:
          {
            Username: req.body.Username,
            Password: req.body.Password,
            Email: req.body.Email,
            Birthday: req.body.Birthday
          }
        },
        { new: true }) 
        .then((updatedUser) => {
          res.json(updatedUser);
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send('Error: ' + err);
        })
      
      });



    app.post('/users/:Username/movies/:MovieID'
    , passport.authenticate('jwt', { session: false })
    , async (req, res) => {
      if (req.user.Username != req.params.Username) {
        return res.status(400).send("Permission Denied")
      }
        await Users.findOneAndUpdate({ Username: req.params.Username }, {
           $push: { FavoriteMovies: req.params.MovieID }
         },
         { new: true }) 
        .then((updatedUser) => {
          res.json(updatedUser);
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send('Error: ' + err);
        });
      });
      app.get('/movies', passport.authenticate('jwt', { session: false }), async (req, res) => {
        await Movies.find()
          .then((movies) => {
            res.status(201).json(movies);
          })
          .catch((error) => {
            console.error(error);
            res.status(500).send('Error: ' + error);
          });
      });


app.delete('/user/favorites/:Username/:MovieId'
, passport.authenticate('jwt', { session: false })
, async (req, res) => {
  if (req.user.Username != req.params.Username) {
    return res.status(400).send("Permission Denied")
  }
  await Users.findOneAndUpdate({ Username: req.params.Username}, {
    $pullAll: {
      FavoriteMovies: [req.params.MovieId],
    }
  })
  .then((user) => {
    if (!user) {
      res.status(400).send(req.params.Username + ' was not found');
    } 
    else if (user.FavoriteMovies.includes(req.params.FavoriteMovies))
      {
        res.status(400).send(req.params.MovieId + ' was not removed');
      }
    else {
      res.status(200).send(req.params.MovieId + ' was removed.');
    }
  })
  .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' + err);
  });


  // await Users.findOneAndRemove({ Username: req.params.Username.FavoriteMovies })
  // .then((user) => {
  //   if (!user) {
  //     res.status(400).send(req.params.Username.FavoriteMovies + ' was not found');
  //   } else {
  //     res.status(200).send(req.params.Username.FavoriteMovies + ' was deleted.');
  //   }
  // })
  // .catch((err) => {
  //   console.error(err);
  //   res.status(500).send('Error: ' + err);
  // });
});

    app.delete('/users/:Username'
    , passport.authenticate('jwt', { session: false })
    , async (req, res) => {
      if (req.user.Username != req.params.Username) {
        return res.status(400).send("Permission Denied")
      }
        await Users.findOneAndDelete({ Username: req.params.Username })
          .then((user) => {
            if (!user) {
              res.status(400).send(req.params.Username + ' was not found');
            } else {
              res.status(200).send(req.params.Username + ' was deleted.');
            }
          })
          .catch((err) => {
            console.error(err);
            res.status(500).send('Error: ' + err);
          });
      });


app.get('/', (req, res) => {
    res.send('Nice try.')
})

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });

app.listen(8080, () => {
  console.log('Your app is listening on port 8080.');
});