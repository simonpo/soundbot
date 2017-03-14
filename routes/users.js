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
                 value: 'user'
             }]
         };

         self.ItemManager.find(querySpec, function (err, items) {
             if (err) {
                 throw (err);
             }

             res.send(items);
         });
  }
}

module.exports = Users;