var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
require('dotenv').config();
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var roomsRouter = require('./routes/rooms');
var messageRouter = require('./routes/message');
var languageRouter = require('./routes/language');
var userLanguageRouter = require('./routes/userLanguage');
var chatPageRouter = require('./routes/chat');

var app = express();
// aws 設定
aws.config.update({
  secretAccessKey: process.env.awsSecretKey,
  accessKeyId: process.env.awsAccessKeyId,
  region: 'us-east-2',
});
const awsS3 = new aws.S3();
const fileStorage = multerS3({
  s3: awsS3,
  bucket: 'ethangochat',
  acl: 'public-read',
  key: function (req, file, callback) {
    callback(null, `${Date.now()}_${file.originalname}`);
  },
  metadata: function (req, file, callback) {
    callback(null, {fieldName: file.fieldname});
  },
  contentType: multerS3.AUTO_CONTENT_TYPE,
});
app.use(
  multer({ storage: fileStorage }).fields([
    {
      name: 'userAvatar',
      maxCount: 1,
    }
  ]),
);
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/rooms', roomsRouter);
app.use('/messages', messageRouter);
app.use('/language', languageRouter);
app.use('/userLanguage', userLanguageRouter);
app.use('/chat', chatPageRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
