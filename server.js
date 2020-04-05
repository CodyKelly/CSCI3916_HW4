var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authJwtController = require('./auth_jwt');
var User = require('./Users');
var Movie = require('./Movies')
var jwt = require('jsonwebtoken');
var cors = require('cors');

var app = express();
module.exports = app; // for testing
app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

router.route('/postjwt')
    .post(authJwtController.isAuthenticated, function (req, res) {
            console.log(req.body);
            res = res.status(200);
            if (req.get('Content-Type')) {
                console.log("Content-Type: " + req.get('Content-Type'));
                res = res.type(req.get('Content-Type'));
            }
            res.send(req.body);
        }
    );

router.route('/users/:userId')
    .get(authJwtController.isAuthenticated, function (req, res) {
        var id = req.params.userId;
        User.findById(id, function(err, user) {
            if (err) res.send(err);

            var userJson = JSON.stringify(user);
            // return that user
            res.json(user);
        });
    });

router.route('/users')
    .get(authJwtController.isAuthenticated, function (req, res) {
        User.find(function (err, users) {
            if (err) res.send(err);
            // return the users
            res.json(users);
        });
    });

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, message: 'Please pass username and password.'});
    }
    else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;
        // save the user
        user.save(function(err) {
            if (err) {
                // duplicate entry
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists. '});
                else
                    return res.send(err);
            }

            res.json({ success: true, message: 'User created!' });
        });
    }
});

router.post('/signin', function(req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) res.send(err);

        user.comparePassword(userNew.password, function(isMatch){
            if (isMatch) {
                var userToken = {id: user._id, username: user.username};
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, message: 'Authentication failed.'});
            }
        });


    });
});

router.route('/movies')
    .post(authJwtController.isAuthenticated, function(req, res) {
    if (!req.body.title) {
        res.json({success: false, message: 'Please pass movie title.'});
    } else if (!req.body.year_released) {
        res.json({success: false, message: 'Please pass movie release year.'})
    } else if (!req.body.genre) {
        res.json({success: false, message: 'Please pass movie genre.'})
    } else if (!req.body.actors || req.body.actors.length < 3) {
        res.json({success: false, message: 'Please pass at least three actors in movie.'})
    } else {
        var newMovie = new Movie();
        newMovie.title = req.body.title;
        newMovie.year_released = req.body.year_released;
        newMovie.genre = req.body.genre;
        newMovie.actors = req.body.actors;

        newMovie.save(function(err) {
            if (err) {
                res.send({
                    success: false,
                    err
                })
            }

            res.send({
                success: true,
                message: `"${newMovie.title}" created!`
            })
        })
    }
})

router.route('/movies/:movieID')
    .post(authJwtController.isAuthenticated, function(req, res) {
        const id = req.params.movieID
        Movie.findByIdAndUpdate(id, req.body, function(err, result) {
            if (err) {
                res.send({
                    success: false,
                    err
                })
            }
            else if (result === null) {
                res.send({
                    success: false,
                    message: "Movie not found."
                })
            }
            res.send({
                success: true,
                message: "Movie updated"
            })
        })
    })

router.route('/movies')
    .get(function (req, res) {
        Movie.find(function (err, movies) {
            if (err) res.send(err);
            // return the movies
            res.json(movies);
        });
});

router.route('/movies/:movieID')
    .get(function (req, res) {
        var id = req.params.movieID
        Movie.findById(id, function (err, movie) {
            if (err) res.send(err);
            // return the movie
            res.json(movie);
        });
    });

router.route('/movies/:movieID')
    .delete(authJwtController.isAuthenticated, function (req, res) {
        const id = req.params.movieID
        Movie.findByIdAndDelete(id, function(err, movie) {
            if (err) res.send(err)
            else if (!movie) {
                res.send({
                    success: false,
                    message: `ID#${id} could not be found`
                })
            } else {
                res.send({
                    success: true,
                    message: `${movie.title} has been deleted.`
                })
            }
        })
    })

app.use('/', router);
app.listen(process.env.PORT || 8080);
