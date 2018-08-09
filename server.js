const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI, { useNewUrlParser: true });

app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

var userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  count   : { type: Number, default: 0 },
  log     : { type: [{
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: { type: Date, default: new Date().toDateString() }
  }],
             default: []
            }
});

var User = mongoose.model('User', userSchema);

var createUser = function(arrayOfUsers, response) {
  User.create(arrayOfUsers, function(err, data) {
    if(err)
      console.log(err);
    else {
      User.findOne({ username: arrayOfUsers[0].username }, function(err, data) {
        if(err)
          console.log(err);
        else
          response.send({
            username: data.username,
            userId: data._id
          });
      });
    }
  });
};

var findUserByIdAndDisplay = function(id, request, response) {
  User.findById(id, function(err, data) {
    if(err)
      console.log(err);
    else {
      if(data===null)
        response.send("userId not found");
      else {
        var log = [];
        for(let i=0; i<data.log.length; i++) {
          if(request.query.from===undefined) {
            var obj = { 
              description: data.log[i].description, 
              duration: data.log[i].duration, 
              date: new Date(data.log[i].date).toDateString()
            };
            if(request.query.limit===undefined)
              log.push(obj);
            else {
              if(request.query.limit==log.length)
                break;
              else
                log.push(obj);
          }
          }else {
            if(request.query.to===undefined) {
              if(new Date(data.log[i].date)>=new Date(request.query.from)) {
                var obj = { 
                  description: data.log[i].description, 
                  duration: data.log[i].duration, 
                  date: new Date(data.log[i].date).toDateString()
                };
                if(request.query.limit===undefined)
                  log.push(obj);
                else {
                  if(request.query.limit==log.length)
                    break;
                else
                  log.push(obj);
                }
              }
            }else {
              if(new Date(data.log[i].date)>=new Date(request.query.from) && new Date(data.log[i].date)<=new Date(request.query.to)) {
                var obj = { 
                  description: data.log[i].description, 
                  duration: data.log[i].duration, 
                  date: new Date(data.log[i].date).toDateString()
                };
                if(request.query.limit===undefined)
                  log.push(obj);
                else {
                  if(request.query.limit==log.length)
                    break;
                  else
                    log.push(obj);
                }
              }
            }
          }
        }
        response.send({
          username: data.username,
          userId: data._id,
          count: log.length,
          log: log
        });
      }
    }
  });
};

var findUserByUsername = function(username, response) {
  User.findOne({ username: username }, function(err, data) {
    if(err)
      console.log(err);
    else {
      if(data===null) {
        if(username==="")
          response.send("username cannot be blank");
        else
          createUser([{ username: username }], response);
      }
      else {
        response.send("username already taken");
      }
    }
  });
};

var updateLog = function(id, log, response) {
  User.findById(id, function(err, data) {
    if(err)
      response.send("invalid user");
    else {
      console.log(data);
      data.log.push(log);
      data.count += 1;
      data.save(function(err, redata) {
        if(err)
          console.log(err);
        else {
          response.send({
            username: redata.username,
            userId: redata._id,
            description: log.description,
            duration: log.duration,
            date: log.date
          });
        }
      });
    }
  });
}

app.post('/api/exercise/new-user/', function(req, res) {
  findUserByUsername(req.body.username, res);
});

app.post('/api/exercise/add/', function(req, res) {
  var description = req.body.description;
  var duration = req.body.duration;
  var date = req.body.date;
  var flag = false;
  
  if(req.body.userId==="")
    res.send("userId cannot to blank");
  if(description==="")
    res.send("description field is required");
  else if(duration==="")
    res.send("duration field is required");
  else if(!isNaN(parseFloat(duration)) && isFinite(duration)) {
    if(duration<=0)
      res.send("duration too short");
    else
      flag = true;
  }
  else
    res.send("duration should be a number(in mins)");
  
  if(date==="")
    date = new Date().toDateString();
  else
    date = new Date(date).toDateString();
  
  if(flag)
    updateLog(req.body.userId, { description: description, duration: duration, date: date }, res);
});

app.get('/api/exercise/log', function(req, res) {
  findUserByIdAndDisplay(req.query.userId, req, res);
});

app.get('/test', function(req, res) {
  alert("Yes");
  res.redirect('/');
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
