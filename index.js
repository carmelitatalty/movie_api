const express = require("express"),
  morgan = require("morgan"),
  fs = require("fs"),
  path = require("path");

const mongoose = require("mongoose");
const Models = require("./models.js");
const { check, validationResult } = require("express-validator");

const {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { S3 } = require("@aws-sdk/client-s3");
const fileUpload = require("express-fileupload");

const { v4: uuidv4 } = require("uuid");

const BUCKET_NAME = '2-6-images';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const cors = require("cors");
// app.use(cors());
let allowedOrigins = ['2-6-frontend.s3-website-us-west-2.amazonaws.com'];
app.use(cors({
  origin: (origin, callback) =>{
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      let message = 'The CORS policy for this application doesn\'t allow access from origin' + origin;
      return callback(new Error(message ), false);
    }
    return callback(null, true);
  }
}));

app.use(
  fileUpload({
    debug: true,
  })
);

let auth = require("./auth.js")(app);
const passport = require("passport");
require("./passport.js");

// mongoose.connect('mongodb://localhost:27017/movieflix', { useNewUrlParser: true, useUnifiedTopology: true });
const CONNECTION_URI = 'mongodb://10.0.0.105/movieflix'

mongoose
  .connect(CONNECTION_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .catch((error) => console.log(error));

const accessLogStream = fs.createWriteStream(path.join(__dirname, "log.txt"), {
  flags: "a",
});

app.use(morgan("combined", { stream: accessLogStream }));

//Make express serve up everything in public folder
app.use("/public", express.static("public"));

const Movies = Models.Movie;
const Users = Models.User;

/**
 * Sets up endpoint that get's all movies that are 'Featured'
 * Requires user to be logged in.
 * @async
 * @function topMovies
 * @returns {*} movies
 */
app.get(
  "/topMovies",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Movies.find({ Featured: true })
      .then((movies) => {
        res.send(movies);
      })
      .catch((err) => {
        res.status(401).send();
      });
  }
);

/**
 * Set's up endpoint that gets all movies
 * Requires user to be logged in.
 * @async
 * @function getMovies
 * @returns {*} movies
 */
app.get(
  "/movies",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Movies.find({})
      .then((movies) => {
        res.send(movies);
      })
      .catch((err) => {
        res.status(401).send();
      });
  }
);

/**
 * Set's up endpoint to get a single movie
 * Requires user to be logged in.
 * @async
 * @function getMoviesByTitle
 * @param {string} title of movie
 * @returns {*} movie
 */
app.get(
  "/movies/:title",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Movies.find({ Title: req.params.title })
      .then((movies) => {
        res.send(movies);
      })
      .catch((err) => {
        res.status(401).send();
      });
  }
);

app.post(
  "/movies",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    console.log(`Adding movie ${JSON.stringify(req.body)}`)
    Movies.create(req.body)
      .then(() => {
        res.status(200).send();
      })
      .catch((err) => {
        res.status(401).send();
      });
  }
);

/**
 * Sets up endpoint to get a Genre
 * Requires user to be logged in.
 * @async
 * @function getGenre
 * @param {string} Genre name
 * @returns {*} information about Genre
 */
app.get(
  "/genre/:genre",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Movies.find({ "Genre.Name": req.params.genre })
      .then((movies) => {
        res.send(movies);
      })
      .catch((err) => {
        res.status(401).send();
      });
  }
);

/**
 * Set's up a registration endpoint to create new users.
 * @async
 * @function registerUser
 * @param {*} user
 * @returns {*} user
 */
app.post(
  "/users",
  [
    check("Username", "Username is required").isLength({ min: 5 }),
    check(
      "Username",
      "Username contains non alphanumric characters - not allowed."
    ).isAlphanumeric(),
    check("Password", "Password is required").not().isEmpty(),
    check("Email", "Email does not appear to be valid").isEmail(),
  ],
  async (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    let hashPassword = Users.hashPassword(req.body.Password);
    await Users.findOne({ Username: req.body.Username })
      .then((user) => {
        if (user) {
          return res.status(400).send(req.body.Username + "already exists");
        } else {
          Users.create({
            Username: req.body.Username,
            Password: hashPassword,
            Email: req.body.Email,
            Birthday: req.body.Birthday,
          })
            .then((user) => {
              res.status(201).json(user);
            })
            .catch((error) => {
              console.error(error);
              res.status(500).send("Error: " + error);
            });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Error: " + error);
      });
  }
);

/**
 * Sets up endpoint to update a single user
 * Requires user to be logged in.
 * @async
 * @function updateUser
 * @param {string} Username
 * @returns {*} user
 */
app.put(
  "/users/:Username",
  [
    check("Username", "Username is required").isLength({ min: 5 }),
    check(
      "Username",
      "Username contains non alphanumric characters - not allowed."
    ).isAlphanumeric(),
    check("Password", "Password is required").not().isEmpty(),
    check("Email", "Email does not appear to be valid").isEmail(),
  ],
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let hashPassword = Users.hashPassword(req.body.Password);
    if (req.user.Username != req.params.Username) {
      return res.status(400).send("Permission Denied");
    }
    await Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $set: {
          Username: req.body.Username,
          Password: hashPassword,
          Email: req.body.Email,
          Birthday: req.body.Birthday,
        },
      },
      { new: true }
    )
      .then((updatedUser) => {
        res.json(updatedUser);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

/**
 * Set's up endpoint to add movie to users favorites.
 * Requires user to be logged in.
 * @async
 * @function addUserFavorite
 * @param {string} Username
 * @param {string} MovieID
 * @returns {*} user
 */
app.post(
  "/users/:Username/movies/:MovieID",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    if (req.user.Username != req.params.Username) {
      return res.status(400).send("Permission Denied");
    }
    await Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $push: { FavoriteMovies: req.params.MovieID },
      },
      { new: true }
    )
      .then((updatedUser) => {
        res.json(updatedUser);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

/**
 * Set's up endpoint to get all movies
 *
 * Requires user to be logged in.
 * @async
 * @function getAllMovies
 * @returns {*} movies
 */
app.get(
  "/movies",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    await Movies.find()
      .then((movies) => {
        res.status(201).json(movies);
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send("Error: " + error);
      });
  }
);

/**
 * Set's up endpoint to remove a movie from a user's favorite list
 * Requires user to be logged in.
 * @async
 * @function deleteUserFavorite
 * @param {string} Username
 * @param {string} MovieId
 */
app.delete(
  "/user/favorites/:Username/:MovieId",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    if (req.user.Username != req.params.Username) {
      return res.status(400).send("Permission Denied");
    }
    await Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $pullAll: {
          FavoriteMovies: [req.params.MovieId],
        },
      }
    )
      .then((user) => {
        if (!user) {
          res.status(400).send(req.params.Username + " was not found");
        } else if (user.FavoriteMovies.includes(req.params.FavoriteMovies)) {
          res.status(400).send(req.params.MovieId + " was not removed");
        } else {
          res.status(200).send(req.params.MovieId + " was removed.");
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
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
  }
);

/**
 * Sets up endpoint to delete user
 * Requires user to be logged in.
 * @async
 * @function deleteUser
 * @param {string} Username
 */
app.delete(
  "/users/:Username",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    if (req.user.Username != req.params.Username) {
      return res.status(400).send("Permission Denied");
    }
    await Users.findOneAndDelete({ Username: req.params.Username })
      .then((user) => {
        if (!user) {
          res.status(400).send(req.params.Username + " was not found");
        } else {
          res.status(200).send(req.params.Username + " was deleted.");
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Error: " + err);
      });
  }
);

/**
 * Set's up a default endpoint to return "Nice try"
 * @async
 * @function root
 */
app.get("/", (req, res) => {
  res.send("Nice try.");
});

const s3Client = new S3Client({
  region: "us-west-2",
});

const listObjectsParams = {
  Bucket: BUCKET_NAME,
};

app.get("/images", (req, res) => {
  s3Client
    .send(new ListObjectsV2Command(listObjectsParams))
    .then((listObjectsResponse) => {
      res.send(listObjectsResponse);
    }).catch((e) => {
      console.log(e);
      console.log(BUCKET_NAME)
      res.status(400).send({message: e.message, bucket: BUCKET_NAME})
    });
});

app.post(
  "/images",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const file = req.files.image;
    const fileName = req.files.image.name;
    const tempPath = `/tmp/${fileName}`;
    if (!fileName.endsWith(".jpg")) {
      res.body("JPG files only").status(500);
      return;
    }

    const key = uuidv4() + ".jpg";

    console.log(`Uploading file: ${tempPath}`);
    file.mv(tempPath, (err) => {
      if (err) {
        console.log(err);
        res.status(500);
        return;
      }
      console.log(`File uploaded to temp location ${tempPath}`);

      const fileContent = fs.readFileSync(tempPath);
      console.log(
        `Uploading file ${tempPath} with size ${fileContent.length} to ${BUCKET_NAME} as key ${key}`
      );
      s3Client
        .send(
          new PutObjectCommand({
            Body: fileContent,
            Bucket: BUCKET_NAME,
            Key: key,
          })
        )
        .then((putObjectResponse) => {
          res.send({ s3Response: putObjectResponse, key: key });
        });
    });
  }
);

app.get("/image/:fileName", (req, response) => {
  s3Client
    .send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: req.params.fileName,
      })
    )
    .then((getObjectCommandOutput) => {
      getObjectCommandOutput.Body.transformToByteArray().then((result) => {
        // console.log(result)
        if (req.params.fileName.endsWith(".jpg")) {
          response.contentType("image/jpeg");
          response.send(Buffer.from(result));
          return;
        }
        response.send(Buffer.from(result));
      });
    });
});

/**
 * Set's up error handler
 * @async
 * @function setupErrorHandler
 */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log("Listening on Port " + port);
});
