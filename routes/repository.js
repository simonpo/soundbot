var DocumentDBClient = require('documentdb').DocumentClient;
var async = require('async');

function Users(ItemManager) {
  this.ItemManager = ItemManager;
}

Users.prototype = {
  /* GET users listing. */
  get: function (req, res, next) {
    var self = this;

    var querySpec = {
      query: 'SELECT * FROM root r WHERE r.dataType=@dataType',
      parameters: [{
        name: '@dataType',
        value: req.params.type
      }]
    };

    self.ItemManager.find(querySpec, function (err, items) {
      if (err) {
        throw (err);
      }

      res.send(items);
    });
  },
  getItem: function (req, res, next) {
    var self = this;

    self.ItemManager.getItem(req.params.user_id, function (err, item) {
      if (err) {
        throw (err);
      }

      res.send(item);
    });
  },
  post: function (req, res, next) {
    var self = this;

    self.ItemManager.updateItem(req.params.user_id, req.body, function (err, item) {
      if (err) {
        throw (err);
      }

      res.send(item);
    });
  },
  put: function (req, res, next) {
    var self = this;

    self.ItemManager.addItem(req.body, req.params.type, function (err, item) {
      if (err) {
        throw (err);
      }

      res.send(item);
    });
  },
  delete: function (req, res, next) {
    var self = this;

    self.ItemManager.deleteItem(req.params.user_id, function (err, item) {
      if (err) {
        throw (err);
      }

      res.send(item);
    });
  }
}

module.exports = Users;