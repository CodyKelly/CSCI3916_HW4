var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var bcrypt = require("bcrypt-nodejs");

// Review schema
var ReviewScema = new Schema({
  user: { type: String, required: true },
  body: { type: String, required: true },
  movie_id: { type: mongoose.Schema.ObjectId, required: true },
  rating: { type: Number, required: true, min: 0, max: 5 },
});

// return the model
module.exports = mongoose.model("Review", ReviewScema);
