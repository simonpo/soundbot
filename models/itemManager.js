 var DocumentDBClient = require('documentdb').DocumentClient;
 var docdbUtils = require('./docdbUtils');

 function ItemManager(documentDBClient, databaseId, collectionId) {
     this.client = documentDBClient;
     this.databaseId = databaseId;
     this.collectionId = collectionId;

     this.database = null;
     this.collection = null;
 }

 ItemManager.prototype = {
     init: function (callback) {
         var self = this;

         docdbUtils.getOrCreateDatabase(self.client, self.databaseId, function (err, db) {
             if (err) {
                 callback(err);
             } else {
                 self.database = db;
                 docdbUtils.getOrCreateCollection(self.client, self.database._self, self.collectionId, function (err, coll) {
                     if (err) {
                         callback(err);

                     } else {
                         self.collection = coll;
                     }
                 });
             }
         });
     },

     find: function (querySpec, callback) {
         var self = this;

         self.client.queryDocuments(self.collection._self, querySpec).toArray(function (err, results) {
             if (err) {
                 callback(err);

             } else {
                 callback(null, results);
             }
         });
     },

     addItem: function (item, type, callback) {
         var self = this;

         item.date = Date.now();
         item.dataType = type;
         self.client.createDocument(self.collection._self, item, function (err, doc) {
             if (err) {
                 callback(err);

             } else {
                 callback(null, doc);
             }
         });
     },

     deleteItem: function (itemId, callback) {
         var self = this;

         var querySpec = {
             query: 'DELEMTE FROM root r WHERE r.id = @id',
             parameters: [{
                 name: '@id',
                 value: itemId
             }]
         };

         self.client.queryDocuments(self.collection._self, querySpec).toArray(function (err, results) {
             if (err) {
                 callback(err);

             } else {
                 callback(null, results[0]);
             }
         });
     },

     updateItem: function (itemId, item, callback) {
         var self = this;

         self.getItem(itemId, function (err, doc) {
             if (err) {
                 callback(err);

             } else {
                 doc = Object.assign(doc, item);
                 self.client.replaceDocument(doc._self, doc, function (err, replaced) {
                     if (err) {
                         callback(err);

                     } else {
                         callback(null, replaced);
                     }
                 });
             }
         });
     },

     getItem: function (itemId, callback) {
         var self = this;

         var querySpec = {
             query: 'SELECT * FROM root r WHERE r.id = @id',
             parameters: [{
                 name: '@id',
                 value: itemId
             }]
         };

         self.client.queryDocuments(self.collection._self, querySpec).toArray(function (err, results) {
             if (err) {
                 callback(err);

             } else {
                 callback(null, results[0]);
             }
         });
     }
 };

 module.exports = ItemManager;