var express = require("express");
var bodyParser = require("body-parser");
var passport = require("passport");
var authJwtController = require("./auth_jwt");
var mongoose = require("mongoose");
var User = require("./Users");
var Movie = require("./Movies");
var Review = require("./Reviews");
var jwt = require("jsonwebtoken");
var cors = require("cors");

var app = express();
module.exports = app; // for testing
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true });
mongoose.set("useCreateIndex", true);

router
  .route("/postjwt")
  .post(authJwtController.isAuthenticated, function (req, res) {
    res = res.status(200);
    if (req.get("Content-Type")) {
      console.log("Content-Type: " + req.get("Content-Type"));
      res = res.type(req.get("Content-Type"));
    }
    res.send(req.body);
  });

router
  .route("/users/:userId")
  .get(authJwtController.isAuthenticated, function (req, res) {
    var id = req.params.userId;
    User.findById(id, function (err, user) {
      if (err) res.send(err);

      var userJson = JSON.stringify(user);
      // return that user
      res.json(user);
    });
  });

router
  .route("/users")
  .get(authJwtController.isAuthenticated, function (req, res) {
    User.find(function (err, users) {
      if (err) res.send(err);
      // return the users
      res.json(users);
    });
  });

router.post("/signup", function (req, res) {
  if (!req.body.username || !req.body.password) {
    res
      .status(400)
      .json({ success: false, message: "Please pass username and password." });
  } else {
    var user = new User(req.body);
    // save the user
    user.save(function (err) {
      if (err) {
        // duplicate entry
        if (err.code == 11000)
          return res.status(400).json({
            success: false,
            message: "A user with that username already exists. ",
          });
        else return res.status(400).send(err);
      }

      res.status(201).send({ success: true });
    });
  }
});

router.post("/signin", function (req, res) {
  var userNew = new User();
  userNew.username = req.body.username;
  userNew.password = req.body.password;

  User.findOne({ username: userNew.username })
    .select("name username password")
    .exec(function (err, user) {
      if (err) res.send(err);

      user.comparePassword(userNew.password, function (isMatch) {
        if (isMatch) {
          var userToken = { id: user._id, username: user.username };
          var token = jwt.sign(userToken, process.env.SECRET_KEY);
          res.status(202).json({ success: true, token: "JWT " + token });
        } else {
          res
            .status(401)
            .send({ success: false, message: "Authentication failed." });
        }
      });
    });
});

router
  .route("/reviews")
  .post(authJwtController.isAuthenticated, (req, res) => {
    newReview = new Review(req.body);
    newReview.save().then(
      () => {
        Movie.findById(req.body.movie_id, (movErr, movie) => {
          Review.aggregate(
            [
              {
                $match: {
                  movie_id: mongoose.Types.ObjectId(req.body.movie_id),
                },
              },
            ],
            (err, reviews) => {
              avgRating = 0;

              reviews.forEach((review) => {
                avgRating += review.rating;
              });

              avgRating /= reviews.length;

              movie.update({ avg_rating: avgRating }, (err, raw) => {
                if (err) {
                  console.log(err);
                }
                if (raw) {
                  console.log(raw);
                }
              });
            }
          );

          res.status(201).send({
            success: true,
            message: "Review created.",
          });
        });
      },
      () => {
        res.status(201).send({
          success: false,
          message: "Review not created.",
        });
      }
    );
  })
  .get((req, res) => {
    Review.find((err, reviewList) => {
      res.send(reviewList);
    });
  });

router
  .route("/movies")
  .post(authJwtController.isAuthenticated, function (req, res) {
    if (!req.body.actors || req.body.actors.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Please pass at least three actors in movie.",
      });
    }
    Movie.create(req.body, (error) => {
      if (error) {
        res.status(400).send({
          success: false,
          message: error,
        });
      } else {
        res.status(201).send({
          success: true,
          message: req.body.title + " created.",
        });
      }
    });
  })
  .get(function (req, res) {
    if (req.query.reviews === "true") {
      Movie.aggregate(
        [
          {
            $lookup: {
              from: "reviews",
              localField: "_id",
              foreignField: "movie_id",
              as: "review_list",
            },
          },
        ],
        (err, movies) => {
          if (err) {
            res.status(400).send({
              success: false,
              message: err,
            });
          } else {
            res.json(movies);
          }
        }
      );
    } else {
      Movie.find(function (err, movies) {
        if (err) {
          res.status(400).send({
            success: false,
            message: err,
          });
        } else {
          res.json(movies);
        }
      }).sort({});
    }
  });

router
  .route("/movies/:movieID")
  .post(authJwtController.isAuthenticated, function (req, res) {
    const id = req.params.movieID;
    Movie.findByIdAndUpdate(id, req.body, function (err, result) {
      if (err) {
        res.status(400).send({
          success: false,
          err,
        });
      } else if (result === null) {
        res.status(400).send({
          success: false,
          message: "Movie not found.",
        });
      }
      res.status(202).send({
        success: true,
        message: "Movie updated",
      });
    });
  });

router
  .route("/movies/:movieID")
  .get(function (req, res) {
    var id = req.params.movieID;
    const movie = Movie.findById(id, function (err, movie) {
      if (err) {
        res.status(400).send({
          success: false,
          message: err,
        });
      } else {
        if (movie != null) {
          if (req.query.reviews === "true") {
            returnAggregate(id);
          } else {
            res.send(movie);
          }
        } else {
          res.status(400).send({
            success: false,
            message: "No movie found with ID " + id,
          });
        }
      }
    });

    function returnAggregate(id) {
      Movie.aggregate(
        [
          {
            $match: {
              _id: mongoose.Types.ObjectId(id),
            },
          },
          {
            $lookup: {
              from: "reviews",
              localField: "_id",
              foreignField: "movie_id",
              as: "review_list",
            },
          },
        ],
        (error, movie) => {
          if (error) {
            res.status(400).send({
              success: false,
              message: error,
            });
          } else {
            res.send(movie);
          }
        }
      );
    }
  })
  .delete(authJwtController.isAuthenticated, function (req, res) {
    const id = req.params.movieID;
    Movie.findByIdAndDelete(id, function (err, movie) {
      if (err) res.send(err);
      else if (!movie) {
        res.status(400).send({
          success: false,
          message: `ID#${id} could not be found`,
        });
      } else {
        res.status(202).send({
          success: true,
          message: `${movie.title} has been deleted.`,
        });
      }
    });
  });

app.use("/", router);
app.listen(process.env.PORT || 8080);
