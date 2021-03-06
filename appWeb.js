var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var DocumentDBClient = require('documentdb').DocumentClient;
var config = require('./config');
var TaskList = require('./routes/tasklist');
var TaskDao = require('./models/taskDao');
var ItemManager = require('./models/ItemManager');

var index = require('./routes/index');
var ItemRepository = require('./routes/repository');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var docDbClient = new DocumentDBClient(config.host, {
    masterKey: config.authKey
});
var itemManager = new ItemManager(docDbClient, config.databaseId, config.collectionId);
var taskDao = new TaskDao(docDbClient, config.databaseId, config.collectionId);
var taskList = new TaskList(taskDao);
taskDao.init();
itemManager.init();
var itemRepository = new ItemRepository(itemManager);

app.get('/', taskList.showTasks.bind(taskList));
app.post('/addtask', taskList.addTask.bind(taskList));
app.post('/completetask', taskList.completeTask.bind(taskList));

app.get('/api/:type/get', itemRepository.get.bind(itemRepository));
app.get('/api/:type/:user_id', itemRepository.getItem.bind(itemRepository));
app.put('/api/:type', itemRepository.put.bind(itemRepository));
app.post('/api/:type/:user_id', itemRepository.post.bind(itemRepository));
app.delete('/api/:type/:user_id', itemRepository.delete.bind(itemRepository));

app.set('view engine', 'jade');

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;