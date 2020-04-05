var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');
//TODO: Review https://mongoosejs.com/docs/validation.html

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB, { useNewUrlParser: true } );
mongoose.set('useCreateIndex', true);

// Actor Schema
var ActorSchema = new Schema({
    name: {type: String, required: true},
    character_name: {type: String, required: true}
})

// Movie schema
var MovieScema = new Schema({
    title: {type: String, required: true},
    year_released: {type: Number, required: true},
    genre: {
        type: String, 
        required: true,
        enum: ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Thriller", "Western"]
    },
    actors: [ActorSchema]
});

// return the model
module.exports = mongoose.model('Movie', MovieScema);