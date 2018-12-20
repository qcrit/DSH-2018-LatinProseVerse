(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var NpmModuleMongodb = Package['npm-mongo'].NpmModuleMongodb;
var NpmModuleMongodbVersion = Package['npm-mongo'].NpmModuleMongodbVersion;
var AllowDeny = Package['allow-deny'].AllowDeny;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var DiffSequence = Package['diff-sequence'].DiffSequence;
var MongoID = Package['mongo-id'].MongoID;
var check = Package.check.check;
var Match = Package.check.Match;
var ECMAScript = Package.ecmascript.ECMAScript;
var _ = Package.underscore._;
var MaxHeap = Package['binary-heap'].MaxHeap;
var MinHeap = Package['binary-heap'].MinHeap;
var MinMaxHeap = Package['binary-heap'].MinMaxHeap;
var Hook = Package['callback-hook'].Hook;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var MongoInternals, MongoTest, MongoConnection, CursorDescription, Cursor, listenAll, forEachTrigger, OPLOG_COLLECTION, idForOp, OplogHandle, ObserveMultiplexer, ObserveHandle, DocFetcher, PollingObserveDriver, OplogObserveDriver, Mongo, selector, callback, options;

var require = meteorInstall({"node_modules":{"meteor":{"mongo":{"mongo_driver.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/mongo_driver.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * Provide a synchronous Collection API using fibers, backed by
 * MongoDB.  This is only for use on the server, and mostly identical
 * to the client API.
 *
 * NOTE: the public API methods must be run within a fiber. If you call
 * these outside of a fiber they will explode!
 */
var MongoDB = NpmModuleMongodb;

var Future = Npm.require('fibers/future');

MongoInternals = {};
MongoTest = {};
MongoInternals.NpmModules = {
  mongodb: {
    version: NpmModuleMongodbVersion,
    module: MongoDB
  }
}; // Older version of what is now available via
// MongoInternals.NpmModules.mongodb.module.  It was never documented, but
// people do use it.
// XXX COMPAT WITH 1.0.3.2

MongoInternals.NpmModule = MongoDB; // This is used to add or remove EJSON from the beginning of everything nested
// inside an EJSON custom type. It should only be called on pure JSON!

var replaceNames = function (filter, thing) {
  if (typeof thing === "object" && thing !== null) {
    if (_.isArray(thing)) {
      return _.map(thing, _.bind(replaceNames, null, filter));
    }

    var ret = {};

    _.each(thing, function (value, key) {
      ret[filter(key)] = replaceNames(filter, value);
    });

    return ret;
  }

  return thing;
}; // Ensure that EJSON.clone keeps a Timestamp as a Timestamp (instead of just
// doing a structural clone).
// XXX how ok is this? what if there are multiple copies of MongoDB loaded?


MongoDB.Timestamp.prototype.clone = function () {
  // Timestamps should be immutable.
  return this;
};

var makeMongoLegal = function (name) {
  return "EJSON" + name;
};

var unmakeMongoLegal = function (name) {
  return name.substr(5);
};

var replaceMongoAtomWithMeteor = function (document) {
  if (document instanceof MongoDB.Binary) {
    var buffer = document.value(true);
    return new Uint8Array(buffer);
  }

  if (document instanceof MongoDB.ObjectID) {
    return new Mongo.ObjectID(document.toHexString());
  }

  if (document["EJSON$type"] && document["EJSON$value"] && _.size(document) === 2) {
    return EJSON.fromJSONValue(replaceNames(unmakeMongoLegal, document));
  }

  if (document instanceof MongoDB.Timestamp) {
    // For now, the Meteor representation of a Mongo timestamp type (not a date!
    // this is a weird internal thing used in the oplog!) is the same as the
    // Mongo representation. We need to do this explicitly or else we would do a
    // structural clone and lose the prototype.
    return document;
  }

  return undefined;
};

var replaceMeteorAtomWithMongo = function (document) {
  if (EJSON.isBinary(document)) {
    // This does more copies than we'd like, but is necessary because
    // MongoDB.BSON only looks like it takes a Uint8Array (and doesn't actually
    // serialize it correctly).
    return new MongoDB.Binary(Buffer.from(document));
  }

  if (document instanceof Mongo.ObjectID) {
    return new MongoDB.ObjectID(document.toHexString());
  }

  if (document instanceof MongoDB.Timestamp) {
    // For now, the Meteor representation of a Mongo timestamp type (not a date!
    // this is a weird internal thing used in the oplog!) is the same as the
    // Mongo representation. We need to do this explicitly or else we would do a
    // structural clone and lose the prototype.
    return document;
  }

  if (EJSON._isCustomType(document)) {
    return replaceNames(makeMongoLegal, EJSON.toJSONValue(document));
  } // It is not ordinarily possible to stick dollar-sign keys into mongo
  // so we don't bother checking for things that need escaping at this time.


  return undefined;
};

var replaceTypes = function (document, atomTransformer) {
  if (typeof document !== 'object' || document === null) return document;
  var replacedTopLevelAtom = atomTransformer(document);
  if (replacedTopLevelAtom !== undefined) return replacedTopLevelAtom;
  var ret = document;

  _.each(document, function (val, key) {
    var valReplaced = replaceTypes(val, atomTransformer);

    if (val !== valReplaced) {
      // Lazy clone. Shallow copy.
      if (ret === document) ret = _.clone(document);
      ret[key] = valReplaced;
    }
  });

  return ret;
};

MongoConnection = function (url, options) {
  var self = this;
  options = options || {};
  self._observeMultiplexers = {};
  self._onFailoverHook = new Hook();
  var mongoOptions = Object.assign({
    // Reconnect on error.
    autoReconnect: true,
    // Try to reconnect forever, instead of stopping after 30 tries (the
    // default), with each attempt separated by 1000ms.
    reconnectTries: Infinity,
    ignoreUndefined: true
  }, Mongo._connectionOptions); // Disable the native parser by default, unless specifically enabled
  // in the mongo URL.
  // - The native driver can cause errors which normally would be
  //   thrown, caught, and handled into segfaults that take down the
  //   whole app.
  // - Binary modules don't yet work when you bundle and move the bundle
  //   to a different platform (aka deploy)
  // We should revisit this after binary npm module support lands.

  if (!/[\?&]native_?[pP]arser=/.test(url)) {
    mongoOptions.native_parser = false;
  } // Internally the oplog connections specify their own poolSize
  // which we don't want to overwrite with any user defined value


  if (_.has(options, 'poolSize')) {
    // If we just set this for "server", replSet will override it. If we just
    // set it for replSet, it will be ignored if we're not using a replSet.
    mongoOptions.poolSize = options.poolSize;
  }

  self.db = null; // We keep track of the ReplSet's primary, so that we can trigger hooks when
  // it changes.  The Node driver's joined callback seems to fire way too
  // often, which is why we need to track it ourselves.

  self._primary = null;
  self._oplogHandle = null;
  self._docFetcher = null;
  var connectFuture = new Future();
  MongoDB.connect(url, mongoOptions, Meteor.bindEnvironment(function (err, client) {
    if (err) {
      throw err;
    }

    var db = client.db(); // First, figure out what the current primary is, if any.

    if (db.serverConfig.isMasterDoc) {
      self._primary = db.serverConfig.isMasterDoc.primary;
    }

    db.serverConfig.on('joined', Meteor.bindEnvironment(function (kind, doc) {
      if (kind === 'primary') {
        if (doc.primary !== self._primary) {
          self._primary = doc.primary;

          self._onFailoverHook.each(function (callback) {
            callback();
            return true;
          });
        }
      } else if (doc.me === self._primary) {
        // The thing we thought was primary is now something other than
        // primary.  Forget that we thought it was primary.  (This means
        // that if a server stops being primary and then starts being
        // primary again without another server becoming primary in the
        // middle, we'll correctly count it as a failover.)
        self._primary = null;
      }
    })); // Allow the constructor to return.

    connectFuture['return']({
      client,
      db
    });
  }, connectFuture.resolver() // onException
  )); // Wait for the connection to be successful (throws on failure) and assign the
  // results (`client` and `db`) to `self`.

  Object.assign(self, connectFuture.wait());

  if (options.oplogUrl && !Package['disable-oplog']) {
    self._oplogHandle = new OplogHandle(options.oplogUrl, self.db.databaseName);
    self._docFetcher = new DocFetcher(self);
  }
};

MongoConnection.prototype.close = function () {
  var self = this;
  if (!self.db) throw Error("close called before Connection created?"); // XXX probably untested

  var oplogHandle = self._oplogHandle;
  self._oplogHandle = null;
  if (oplogHandle) oplogHandle.stop(); // Use Future.wrap so that errors get thrown. This happens to
  // work even outside a fiber since the 'close' method is not
  // actually asynchronous.

  Future.wrap(_.bind(self.client.close, self.client))(true).wait();
}; // Returns the Mongo Collection object; may yield.


MongoConnection.prototype.rawCollection = function (collectionName) {
  var self = this;
  if (!self.db) throw Error("rawCollection called before Connection created?");
  var future = new Future();
  self.db.collection(collectionName, future.resolver());
  return future.wait();
};

MongoConnection.prototype._createCappedCollection = function (collectionName, byteSize, maxDocuments) {
  var self = this;
  if (!self.db) throw Error("_createCappedCollection called before Connection created?");
  var future = new Future();
  self.db.createCollection(collectionName, {
    capped: true,
    size: byteSize,
    max: maxDocuments
  }, future.resolver());
  future.wait();
}; // This should be called synchronously with a write, to create a
// transaction on the current write fence, if any. After we can read
// the write, and after observers have been notified (or at least,
// after the observer notifiers have added themselves to the write
// fence), you should call 'committed()' on the object returned.


MongoConnection.prototype._maybeBeginWrite = function () {
  var fence = DDPServer._CurrentWriteFence.get();

  if (fence) {
    return fence.beginWrite();
  } else {
    return {
      committed: function () {}
    };
  }
}; // Internal interface: adds a callback which is called when the Mongo primary
// changes. Returns a stop handle.


MongoConnection.prototype._onFailover = function (callback) {
  return this._onFailoverHook.register(callback);
}; //////////// Public API //////////
// The write methods block until the database has confirmed the write (it may
// not be replicated or stable on disk, but one server has confirmed it) if no
// callback is provided. If a callback is provided, then they call the callback
// when the write is confirmed. They return nothing on success, and raise an
// exception on failure.
//
// After making a write (with insert, update, remove), observers are
// notified asynchronously. If you want to receive a callback once all
// of the observer notifications have landed for your write, do the
// writes inside a write fence (set DDPServer._CurrentWriteFence to a new
// _WriteFence, and then set a callback on the write fence.)
//
// Since our execution environment is single-threaded, this is
// well-defined -- a write "has been made" if it's returned, and an
// observer "has been notified" if its callback has returned.


var writeCallback = function (write, refresh, callback) {
  return function (err, result) {
    if (!err) {
      // XXX We don't have to run this on error, right?
      try {
        refresh();
      } catch (refreshErr) {
        if (callback) {
          callback(refreshErr);
          return;
        } else {
          throw refreshErr;
        }
      }
    }

    write.committed();

    if (callback) {
      callback(err, result);
    } else if (err) {
      throw err;
    }
  };
};

var bindEnvironmentForWrite = function (callback) {
  return Meteor.bindEnvironment(callback, "Mongo write");
};

MongoConnection.prototype._insert = function (collection_name, document, callback) {
  var self = this;

  var sendError = function (e) {
    if (callback) return callback(e);
    throw e;
  };

  if (collection_name === "___meteor_failure_test_collection") {
    var e = new Error("Failure test");
    e._expectedByTest = true;
    sendError(e);
    return;
  }

  if (!(LocalCollection._isPlainObject(document) && !EJSON._isCustomType(document))) {
    sendError(new Error("Only plain objects may be inserted into MongoDB"));
    return;
  }

  var write = self._maybeBeginWrite();

  var refresh = function () {
    Meteor.refresh({
      collection: collection_name,
      id: document._id
    });
  };

  callback = bindEnvironmentForWrite(writeCallback(write, refresh, callback));

  try {
    var collection = self.rawCollection(collection_name);
    collection.insert(replaceTypes(document, replaceMeteorAtomWithMongo), {
      safe: true
    }, callback);
  } catch (err) {
    write.committed();
    throw err;
  }
}; // Cause queries that may be affected by the selector to poll in this write
// fence.


MongoConnection.prototype._refresh = function (collectionName, selector) {
  var refreshKey = {
    collection: collectionName
  }; // If we know which documents we're removing, don't poll queries that are
  // specific to other documents. (Note that multiple notifications here should
  // not cause multiple polls, since all our listener is doing is enqueueing a
  // poll.)

  var specificIds = LocalCollection._idsMatchedBySelector(selector);

  if (specificIds) {
    _.each(specificIds, function (id) {
      Meteor.refresh(_.extend({
        id: id
      }, refreshKey));
    });
  } else {
    Meteor.refresh(refreshKey);
  }
};

MongoConnection.prototype._remove = function (collection_name, selector, callback) {
  var self = this;

  if (collection_name === "___meteor_failure_test_collection") {
    var e = new Error("Failure test");
    e._expectedByTest = true;

    if (callback) {
      return callback(e);
    } else {
      throw e;
    }
  }

  var write = self._maybeBeginWrite();

  var refresh = function () {
    self._refresh(collection_name, selector);
  };

  callback = bindEnvironmentForWrite(writeCallback(write, refresh, callback));

  try {
    var collection = self.rawCollection(collection_name);

    var wrappedCallback = function (err, driverResult) {
      callback(err, transformResult(driverResult).numberAffected);
    };

    collection.remove(replaceTypes(selector, replaceMeteorAtomWithMongo), {
      safe: true
    }, wrappedCallback);
  } catch (err) {
    write.committed();
    throw err;
  }
};

MongoConnection.prototype._dropCollection = function (collectionName, cb) {
  var self = this;

  var write = self._maybeBeginWrite();

  var refresh = function () {
    Meteor.refresh({
      collection: collectionName,
      id: null,
      dropCollection: true
    });
  };

  cb = bindEnvironmentForWrite(writeCallback(write, refresh, cb));

  try {
    var collection = self.rawCollection(collectionName);
    collection.drop(cb);
  } catch (e) {
    write.committed();
    throw e;
  }
}; // For testing only.  Slightly better than `c.rawDatabase().dropDatabase()`
// because it lets the test's fence wait for it to be complete.


MongoConnection.prototype._dropDatabase = function (cb) {
  var self = this;

  var write = self._maybeBeginWrite();

  var refresh = function () {
    Meteor.refresh({
      dropDatabase: true
    });
  };

  cb = bindEnvironmentForWrite(writeCallback(write, refresh, cb));

  try {
    self.db.dropDatabase(cb);
  } catch (e) {
    write.committed();
    throw e;
  }
};

MongoConnection.prototype._update = function (collection_name, selector, mod, options, callback) {
  var self = this;

  if (!callback && options instanceof Function) {
    callback = options;
    options = null;
  }

  if (collection_name === "___meteor_failure_test_collection") {
    var e = new Error("Failure test");
    e._expectedByTest = true;

    if (callback) {
      return callback(e);
    } else {
      throw e;
    }
  } // explicit safety check. null and undefined can crash the mongo
  // driver. Although the node driver and minimongo do 'support'
  // non-object modifier in that they don't crash, they are not
  // meaningful operations and do not do anything. Defensively throw an
  // error here.


  if (!mod || typeof mod !== 'object') throw new Error("Invalid modifier. Modifier must be an object.");

  if (!(LocalCollection._isPlainObject(mod) && !EJSON._isCustomType(mod))) {
    throw new Error("Only plain objects may be used as replacement" + " documents in MongoDB");
  }

  if (!options) options = {};

  var write = self._maybeBeginWrite();

  var refresh = function () {
    self._refresh(collection_name, selector);
  };

  callback = writeCallback(write, refresh, callback);

  try {
    var collection = self.rawCollection(collection_name);
    var mongoOpts = {
      safe: true
    }; // explictly enumerate options that minimongo supports

    if (options.upsert) mongoOpts.upsert = true;
    if (options.multi) mongoOpts.multi = true; // Lets you get a more more full result from MongoDB. Use with caution:
    // might not work with C.upsert (as opposed to C.update({upsert:true}) or
    // with simulated upsert.

    if (options.fullResult) mongoOpts.fullResult = true;
    var mongoSelector = replaceTypes(selector, replaceMeteorAtomWithMongo);
    var mongoMod = replaceTypes(mod, replaceMeteorAtomWithMongo);

    var isModify = LocalCollection._isModificationMod(mongoMod);

    if (options._forbidReplace && !isModify) {
      var err = new Error("Invalid modifier. Replacements are forbidden.");

      if (callback) {
        return callback(err);
      } else {
        throw err;
      }
    } // We've already run replaceTypes/replaceMeteorAtomWithMongo on
    // selector and mod.  We assume it doesn't matter, as far as
    // the behavior of modifiers is concerned, whether `_modify`
    // is run on EJSON or on mongo-converted EJSON.
    // Run this code up front so that it fails fast if someone uses
    // a Mongo update operator we don't support.


    let knownId;

    if (options.upsert) {
      try {
        let newDoc = LocalCollection._createUpsertDocument(selector, mod);

        knownId = newDoc._id;
      } catch (err) {
        if (callback) {
          return callback(err);
        } else {
          throw err;
        }
      }
    }

    if (options.upsert && !isModify && !knownId && options.insertedId && !(options.insertedId instanceof Mongo.ObjectID && options.generatedId)) {
      // In case of an upsert with a replacement, where there is no _id defined
      // in either the query or the replacement doc, mongo will generate an id itself.
      // Therefore we need this special strategy if we want to control the id ourselves.
      // We don't need to do this when:
      // - This is not a replacement, so we can add an _id to $setOnInsert
      // - The id is defined by query or mod we can just add it to the replacement doc
      // - The user did not specify any id preference and the id is a Mongo ObjectId,
      //     then we can just let Mongo generate the id
      simulateUpsertWithInsertedId(collection, mongoSelector, mongoMod, options, // This callback does not need to be bindEnvironment'ed because
      // simulateUpsertWithInsertedId() wraps it and then passes it through
      // bindEnvironmentForWrite.
      function (error, result) {
        // If we got here via a upsert() call, then options._returnObject will
        // be set and we should return the whole object. Otherwise, we should
        // just return the number of affected docs to match the mongo API.
        if (result && !options._returnObject) {
          callback(error, result.numberAffected);
        } else {
          callback(error, result);
        }
      });
    } else {
      if (options.upsert && !knownId && options.insertedId && isModify) {
        if (!mongoMod.hasOwnProperty('$setOnInsert')) {
          mongoMod.$setOnInsert = {};
        }

        knownId = options.insertedId;
        Object.assign(mongoMod.$setOnInsert, replaceTypes({
          _id: options.insertedId
        }, replaceMeteorAtomWithMongo));
      }

      collection.update(mongoSelector, mongoMod, mongoOpts, bindEnvironmentForWrite(function (err, result) {
        if (!err) {
          var meteorResult = transformResult(result);

          if (meteorResult && options._returnObject) {
            // If this was an upsert() call, and we ended up
            // inserting a new doc and we know its id, then
            // return that id as well.
            if (options.upsert && meteorResult.insertedId) {
              if (knownId) {
                meteorResult.insertedId = knownId;
              } else if (meteorResult.insertedId instanceof MongoDB.ObjectID) {
                meteorResult.insertedId = new Mongo.ObjectID(meteorResult.insertedId.toHexString());
              }
            }

            callback(err, meteorResult);
          } else {
            callback(err, meteorResult.numberAffected);
          }
        } else {
          callback(err);
        }
      }));
    }
  } catch (e) {
    write.committed();
    throw e;
  }
};

var transformResult = function (driverResult) {
  var meteorResult = {
    numberAffected: 0
  };

  if (driverResult) {
    var mongoResult = driverResult.result; // On updates with upsert:true, the inserted values come as a list of
    // upserted values -- even with options.multi, when the upsert does insert,
    // it only inserts one element.

    if (mongoResult.upserted) {
      meteorResult.numberAffected += mongoResult.upserted.length;

      if (mongoResult.upserted.length == 1) {
        meteorResult.insertedId = mongoResult.upserted[0]._id;
      }
    } else {
      meteorResult.numberAffected = mongoResult.n;
    }
  }

  return meteorResult;
};

var NUM_OPTIMISTIC_TRIES = 3; // exposed for testing

MongoConnection._isCannotChangeIdError = function (err) {
  // Mongo 3.2.* returns error as next Object:
  // {name: String, code: Number, errmsg: String}
  // Older Mongo returns:
  // {name: String, code: Number, err: String}
  var error = err.errmsg || err.err; // We don't use the error code here
  // because the error code we observed it producing (16837) appears to be
  // a far more generic error code based on examining the source.

  if (error.indexOf('The _id field cannot be changed') === 0 || error.indexOf("the (immutable) field '_id' was found to have been altered to _id") !== -1) {
    return true;
  }

  return false;
};

var simulateUpsertWithInsertedId = function (collection, selector, mod, options, callback) {
  // STRATEGY: First try doing an upsert with a generated ID.
  // If this throws an error about changing the ID on an existing document
  // then without affecting the database, we know we should probably try
  // an update without the generated ID. If it affected 0 documents,
  // then without affecting the database, we the document that first
  // gave the error is probably removed and we need to try an insert again
  // We go back to step one and repeat.
  // Like all "optimistic write" schemes, we rely on the fact that it's
  // unlikely our writes will continue to be interfered with under normal
  // circumstances (though sufficiently heavy contention with writers
  // disagreeing on the existence of an object will cause writes to fail
  // in theory).
  var insertedId = options.insertedId; // must exist

  var mongoOptsForUpdate = {
    safe: true,
    multi: options.multi
  };
  var mongoOptsForInsert = {
    safe: true,
    upsert: true
  };
  var replacementWithId = Object.assign(replaceTypes({
    _id: insertedId
  }, replaceMeteorAtomWithMongo), mod);
  var tries = NUM_OPTIMISTIC_TRIES;

  var doUpdate = function () {
    tries--;

    if (!tries) {
      callback(new Error("Upsert failed after " + NUM_OPTIMISTIC_TRIES + " tries."));
    } else {
      collection.update(selector, mod, mongoOptsForUpdate, bindEnvironmentForWrite(function (err, result) {
        if (err) {
          callback(err);
        } else if (result && result.result.n != 0) {
          callback(null, {
            numberAffected: result.result.n
          });
        } else {
          doConditionalInsert();
        }
      }));
    }
  };

  var doConditionalInsert = function () {
    collection.update(selector, replacementWithId, mongoOptsForInsert, bindEnvironmentForWrite(function (err, result) {
      if (err) {
        // figure out if this is a
        // "cannot change _id of document" error, and
        // if so, try doUpdate() again, up to 3 times.
        if (MongoConnection._isCannotChangeIdError(err)) {
          doUpdate();
        } else {
          callback(err);
        }
      } else {
        callback(null, {
          numberAffected: result.result.upserted.length,
          insertedId: insertedId
        });
      }
    }));
  };

  doUpdate();
};

_.each(["insert", "update", "remove", "dropCollection", "dropDatabase"], function (method) {
  MongoConnection.prototype[method] = function ()
  /* arguments */
  {
    var self = this;
    return Meteor.wrapAsync(self["_" + method]).apply(self, arguments);
  };
}); // XXX MongoConnection.upsert() does not return the id of the inserted document
// unless you set it explicitly in the selector or modifier (as a replacement
// doc).


MongoConnection.prototype.upsert = function (collectionName, selector, mod, options, callback) {
  var self = this;

  if (typeof options === "function" && !callback) {
    callback = options;
    options = {};
  }

  return self.update(collectionName, selector, mod, _.extend({}, options, {
    upsert: true,
    _returnObject: true
  }), callback);
};

MongoConnection.prototype.find = function (collectionName, selector, options) {
  var self = this;
  if (arguments.length === 1) selector = {};
  return new Cursor(self, new CursorDescription(collectionName, selector, options));
};

MongoConnection.prototype.findOne = function (collection_name, selector, options) {
  var self = this;
  if (arguments.length === 1) selector = {};
  options = options || {};
  options.limit = 1;
  return self.find(collection_name, selector, options).fetch()[0];
}; // We'll actually design an index API later. For now, we just pass through to
// Mongo's, but make it synchronous.


MongoConnection.prototype._ensureIndex = function (collectionName, index, options) {
  var self = this; // We expect this function to be called at startup, not from within a method,
  // so we don't interact with the write fence.

  var collection = self.rawCollection(collectionName);
  var future = new Future();
  var indexName = collection.ensureIndex(index, options, future.resolver());
  future.wait();
};

MongoConnection.prototype._dropIndex = function (collectionName, index) {
  var self = this; // This function is only used by test code, not within a method, so we don't
  // interact with the write fence.

  var collection = self.rawCollection(collectionName);
  var future = new Future();
  var indexName = collection.dropIndex(index, future.resolver());
  future.wait();
}; // CURSORS
// There are several classes which relate to cursors:
//
// CursorDescription represents the arguments used to construct a cursor:
// collectionName, selector, and (find) options.  Because it is used as a key
// for cursor de-dup, everything in it should either be JSON-stringifiable or
// not affect observeChanges output (eg, options.transform functions are not
// stringifiable but do not affect observeChanges).
//
// SynchronousCursor is a wrapper around a MongoDB cursor
// which includes fully-synchronous versions of forEach, etc.
//
// Cursor is the cursor object returned from find(), which implements the
// documented Mongo.Collection cursor API.  It wraps a CursorDescription and a
// SynchronousCursor (lazily: it doesn't contact Mongo until you call a method
// like fetch or forEach on it).
//
// ObserveHandle is the "observe handle" returned from observeChanges. It has a
// reference to an ObserveMultiplexer.
//
// ObserveMultiplexer allows multiple identical ObserveHandles to be driven by a
// single observe driver.
//
// There are two "observe drivers" which drive ObserveMultiplexers:
//   - PollingObserveDriver caches the results of a query and reruns it when
//     necessary.
//   - OplogObserveDriver follows the Mongo operation log to directly observe
//     database changes.
// Both implementations follow the same simple interface: when you create them,
// they start sending observeChanges callbacks (and a ready() invocation) to
// their ObserveMultiplexer, and you stop them by calling their stop() method.


CursorDescription = function (collectionName, selector, options) {
  var self = this;
  self.collectionName = collectionName;
  self.selector = Mongo.Collection._rewriteSelector(selector);
  self.options = options || {};
};

Cursor = function (mongo, cursorDescription) {
  var self = this;
  self._mongo = mongo;
  self._cursorDescription = cursorDescription;
  self._synchronousCursor = null;
};

_.each(['forEach', 'map', 'fetch', 'count', Symbol.iterator], function (method) {
  Cursor.prototype[method] = function () {
    var self = this; // You can only observe a tailable cursor.

    if (self._cursorDescription.options.tailable) throw new Error("Cannot call " + method + " on a tailable cursor");

    if (!self._synchronousCursor) {
      self._synchronousCursor = self._mongo._createSynchronousCursor(self._cursorDescription, {
        // Make sure that the "self" argument to forEach/map callbacks is the
        // Cursor, not the SynchronousCursor.
        selfForIteration: self,
        useTransform: true
      });
    }

    return self._synchronousCursor[method].apply(self._synchronousCursor, arguments);
  };
}); // Since we don't actually have a "nextObject" interface, there's really no
// reason to have a "rewind" interface.  All it did was make multiple calls
// to fetch/map/forEach return nothing the second time.
// XXX COMPAT WITH 0.8.1


Cursor.prototype.rewind = function () {};

Cursor.prototype.getTransform = function () {
  return this._cursorDescription.options.transform;
}; // When you call Meteor.publish() with a function that returns a Cursor, we need
// to transmute it into the equivalent subscription.  This is the function that
// does that.


Cursor.prototype._publishCursor = function (sub) {
  var self = this;
  var collection = self._cursorDescription.collectionName;
  return Mongo.Collection._publishCursor(self, sub, collection);
}; // Used to guarantee that publish functions return at most one cursor per
// collection. Private, because we might later have cursors that include
// documents from multiple collections somehow.


Cursor.prototype._getCollectionName = function () {
  var self = this;
  return self._cursorDescription.collectionName;
};

Cursor.prototype.observe = function (callbacks) {
  var self = this;
  return LocalCollection._observeFromObserveChanges(self, callbacks);
};

Cursor.prototype.observeChanges = function (callbacks) {
  var self = this;
  var methods = ['addedAt', 'added', 'changedAt', 'changed', 'removedAt', 'removed', 'movedTo'];

  var ordered = LocalCollection._observeChangesCallbacksAreOrdered(callbacks); // XXX: Can we find out if callbacks are from observe?


  var exceptionName = ' observe/observeChanges callback';
  methods.forEach(function (method) {
    if (callbacks[method] && typeof callbacks[method] == "function") {
      callbacks[method] = Meteor.bindEnvironment(callbacks[method], method + exceptionName);
    }
  });
  return self._mongo._observeChanges(self._cursorDescription, ordered, callbacks);
};

MongoConnection.prototype._createSynchronousCursor = function (cursorDescription, options) {
  var self = this;
  options = _.pick(options || {}, 'selfForIteration', 'useTransform');
  var collection = self.rawCollection(cursorDescription.collectionName);
  var cursorOptions = cursorDescription.options;
  var mongoOptions = {
    sort: cursorOptions.sort,
    limit: cursorOptions.limit,
    skip: cursorOptions.skip,
    projection: cursorOptions.fields
  }; // Do we want a tailable cursor (which only works on capped collections)?

  if (cursorOptions.tailable) {
    // We want a tailable cursor...
    mongoOptions.tailable = true; // ... and for the server to wait a bit if any getMore has no data (rather
    // than making us put the relevant sleeps in the client)...

    mongoOptions.awaitdata = true; // ... and to keep querying the server indefinitely rather than just 5 times
    // if there's no more data.

    mongoOptions.numberOfRetries = -1; // And if this is on the oplog collection and the cursor specifies a 'ts',
    // then set the undocumented oplog replay flag, which does a special scan to
    // find the first document (instead of creating an index on ts). This is a
    // very hard-coded Mongo flag which only works on the oplog collection and
    // only works with the ts field.

    if (cursorDescription.collectionName === OPLOG_COLLECTION && cursorDescription.selector.ts) {
      mongoOptions.oplogReplay = true;
    }
  }

  var dbCursor = collection.find(replaceTypes(cursorDescription.selector, replaceMeteorAtomWithMongo), mongoOptions);

  if (typeof cursorOptions.maxTimeMs !== 'undefined') {
    dbCursor = dbCursor.maxTimeMS(cursorOptions.maxTimeMs);
  }

  if (typeof cursorOptions.hint !== 'undefined') {
    dbCursor = dbCursor.hint(cursorOptions.hint);
  }

  return new SynchronousCursor(dbCursor, cursorDescription, options);
};

var SynchronousCursor = function (dbCursor, cursorDescription, options) {
  var self = this;
  options = _.pick(options || {}, 'selfForIteration', 'useTransform');
  self._dbCursor = dbCursor;
  self._cursorDescription = cursorDescription; // The "self" argument passed to forEach/map callbacks. If we're wrapped
  // inside a user-visible Cursor, we want to provide the outer cursor!

  self._selfForIteration = options.selfForIteration || self;

  if (options.useTransform && cursorDescription.options.transform) {
    self._transform = LocalCollection.wrapTransform(cursorDescription.options.transform);
  } else {
    self._transform = null;
  }

  self._synchronousCount = Future.wrap(dbCursor.count.bind(dbCursor));
  self._visitedIds = new LocalCollection._IdMap();
};

_.extend(SynchronousCursor.prototype, {
  // Returns a Promise for the next object from the underlying cursor (before
  // the Mongo->Meteor type replacement).
  _rawNextObjectPromise: function () {
    const self = this;
    return new Promise((resolve, reject) => {
      self._dbCursor.next((err, doc) => {
        if (err) {
          reject(err);
        } else {
          resolve(doc);
        }
      });
    });
  },
  // Returns a Promise for the next object from the cursor, skipping those whose
  // IDs we've already seen and replacing Mongo atoms with Meteor atoms.
  _nextObjectPromise: function () {
    return Promise.asyncApply(() => {
      var self = this;

      while (true) {
        var doc = Promise.await(self._rawNextObjectPromise());
        if (!doc) return null;
        doc = replaceTypes(doc, replaceMongoAtomWithMeteor);

        if (!self._cursorDescription.options.tailable && _.has(doc, '_id')) {
          // Did Mongo give us duplicate documents in the same cursor? If so,
          // ignore this one. (Do this before the transform, since transform might
          // return some unrelated value.) We don't do this for tailable cursors,
          // because we want to maintain O(1) memory usage. And if there isn't _id
          // for some reason (maybe it's the oplog), then we don't do this either.
          // (Be careful to do this for falsey but existing _id, though.)
          if (self._visitedIds.has(doc._id)) continue;

          self._visitedIds.set(doc._id, true);
        }

        if (self._transform) doc = self._transform(doc);
        return doc;
      }
    });
  },
  // Returns a promise which is resolved with the next object (like with
  // _nextObjectPromise) or rejected if the cursor doesn't return within
  // timeoutMS ms.
  _nextObjectPromiseWithTimeout: function (timeoutMS) {
    const self = this;

    if (!timeoutMS) {
      return self._nextObjectPromise();
    }

    const nextObjectPromise = self._nextObjectPromise();

    const timeoutErr = new Error('Client-side timeout waiting for next object');
    const timeoutPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(timeoutErr);
      }, timeoutMS);
    });
    return Promise.race([nextObjectPromise, timeoutPromise]).catch(err => {
      if (err === timeoutErr) {
        self.close();
      }

      throw err;
    });
  },
  _nextObject: function () {
    var self = this;
    return self._nextObjectPromise().await();
  },
  forEach: function (callback, thisArg) {
    var self = this; // Get back to the beginning.

    self._rewind(); // We implement the loop ourself instead of using self._dbCursor.each,
    // because "each" will call its callback outside of a fiber which makes it
    // much more complex to make this function synchronous.


    var index = 0;

    while (true) {
      var doc = self._nextObject();

      if (!doc) return;
      callback.call(thisArg, doc, index++, self._selfForIteration);
    }
  },
  // XXX Allow overlapping callback executions if callback yields.
  map: function (callback, thisArg) {
    var self = this;
    var res = [];
    self.forEach(function (doc, index) {
      res.push(callback.call(thisArg, doc, index, self._selfForIteration));
    });
    return res;
  },
  _rewind: function () {
    var self = this; // known to be synchronous

    self._dbCursor.rewind();

    self._visitedIds = new LocalCollection._IdMap();
  },
  // Mostly usable for tailable cursors.
  close: function () {
    var self = this;

    self._dbCursor.close();
  },
  fetch: function () {
    var self = this;
    return self.map(_.identity);
  },
  count: function (applySkipLimit = false) {
    var self = this;
    return self._synchronousCount(applySkipLimit).wait();
  },
  // This method is NOT wrapped in Cursor.
  getRawObjects: function (ordered) {
    var self = this;

    if (ordered) {
      return self.fetch();
    } else {
      var results = new LocalCollection._IdMap();
      self.forEach(function (doc) {
        results.set(doc._id, doc);
      });
      return results;
    }
  }
});

SynchronousCursor.prototype[Symbol.iterator] = function () {
  var self = this; // Get back to the beginning.

  self._rewind();

  return {
    next() {
      const doc = self._nextObject();

      return doc ? {
        value: doc
      } : {
        done: true
      };
    }

  };
}; // Tails the cursor described by cursorDescription, most likely on the
// oplog. Calls docCallback with each document found. Ignores errors and just
// restarts the tail on error.
//
// If timeoutMS is set, then if we don't get a new document every timeoutMS,
// kill and restart the cursor. This is primarily a workaround for #8598.


MongoConnection.prototype.tail = function (cursorDescription, docCallback, timeoutMS) {
  var self = this;
  if (!cursorDescription.options.tailable) throw new Error("Can only tail a tailable cursor");

  var cursor = self._createSynchronousCursor(cursorDescription);

  var stopped = false;
  var lastTS;

  var loop = function () {
    var doc = null;

    while (true) {
      if (stopped) return;

      try {
        doc = cursor._nextObjectPromiseWithTimeout(timeoutMS).await();
      } catch (err) {
        // There's no good way to figure out if this was actually an error from
        // Mongo, or just client-side (including our own timeout error). Ah
        // well. But either way, we need to retry the cursor (unless the failure
        // was because the observe got stopped).
        doc = null;
      } // Since we awaited a promise above, we need to check again to see if
      // we've been stopped before calling the callback.


      if (stopped) return;

      if (doc) {
        // If a tailable cursor contains a "ts" field, use it to recreate the
        // cursor on error. ("ts" is a standard that Mongo uses internally for
        // the oplog, and there's a special flag that lets you do binary search
        // on it instead of needing to use an index.)
        lastTS = doc.ts;
        docCallback(doc);
      } else {
        var newSelector = _.clone(cursorDescription.selector);

        if (lastTS) {
          newSelector.ts = {
            $gt: lastTS
          };
        }

        cursor = self._createSynchronousCursor(new CursorDescription(cursorDescription.collectionName, newSelector, cursorDescription.options)); // Mongo failover takes many seconds.  Retry in a bit.  (Without this
        // setTimeout, we peg the CPU at 100% and never notice the actual
        // failover.

        Meteor.setTimeout(loop, 100);
        break;
      }
    }
  };

  Meteor.defer(loop);
  return {
    stop: function () {
      stopped = true;
      cursor.close();
    }
  };
};

MongoConnection.prototype._observeChanges = function (cursorDescription, ordered, callbacks) {
  var self = this;

  if (cursorDescription.options.tailable) {
    return self._observeChangesTailable(cursorDescription, ordered, callbacks);
  } // You may not filter out _id when observing changes, because the id is a core
  // part of the observeChanges API.


  if (cursorDescription.options.fields && (cursorDescription.options.fields._id === 0 || cursorDescription.options.fields._id === false)) {
    throw Error("You may not observe a cursor with {fields: {_id: 0}}");
  }

  var observeKey = EJSON.stringify(_.extend({
    ordered: ordered
  }, cursorDescription));
  var multiplexer, observeDriver;
  var firstHandle = false; // Find a matching ObserveMultiplexer, or create a new one. This next block is
  // guaranteed to not yield (and it doesn't call anything that can observe a
  // new query), so no other calls to this function can interleave with it.

  Meteor._noYieldsAllowed(function () {
    if (_.has(self._observeMultiplexers, observeKey)) {
      multiplexer = self._observeMultiplexers[observeKey];
    } else {
      firstHandle = true; // Create a new ObserveMultiplexer.

      multiplexer = new ObserveMultiplexer({
        ordered: ordered,
        onStop: function () {
          delete self._observeMultiplexers[observeKey];
          observeDriver.stop();
        }
      });
      self._observeMultiplexers[observeKey] = multiplexer;
    }
  });

  var observeHandle = new ObserveHandle(multiplexer, callbacks);

  if (firstHandle) {
    var matcher, sorter;

    var canUseOplog = _.all([function () {
      // At a bare minimum, using the oplog requires us to have an oplog, to
      // want unordered callbacks, and to not want a callback on the polls
      // that won't happen.
      return self._oplogHandle && !ordered && !callbacks._testOnlyPollCallback;
    }, function () {
      // We need to be able to compile the selector. Fall back to polling for
      // some newfangled $selector that minimongo doesn't support yet.
      try {
        matcher = new Minimongo.Matcher(cursorDescription.selector);
        return true;
      } catch (e) {
        // XXX make all compilation errors MinimongoError or something
        //     so that this doesn't ignore unrelated exceptions
        return false;
      }
    }, function () {
      // ... and the selector itself needs to support oplog.
      return OplogObserveDriver.cursorSupported(cursorDescription, matcher);
    }, function () {
      // And we need to be able to compile the sort, if any.  eg, can't be
      // {$natural: 1}.
      if (!cursorDescription.options.sort) return true;

      try {
        sorter = new Minimongo.Sorter(cursorDescription.options.sort, {
          matcher: matcher
        });
        return true;
      } catch (e) {
        // XXX make all compilation errors MinimongoError or something
        //     so that this doesn't ignore unrelated exceptions
        return false;
      }
    }], function (f) {
      return f();
    }); // invoke each function


    var driverClass = canUseOplog ? OplogObserveDriver : PollingObserveDriver;
    observeDriver = new driverClass({
      cursorDescription: cursorDescription,
      mongoHandle: self,
      multiplexer: multiplexer,
      ordered: ordered,
      matcher: matcher,
      // ignored by polling
      sorter: sorter,
      // ignored by polling
      _testOnlyPollCallback: callbacks._testOnlyPollCallback
    }); // This field is only set for use in tests.

    multiplexer._observeDriver = observeDriver;
  } // Blocks until the initial adds have been sent.


  multiplexer.addHandleAndSendInitialAdds(observeHandle);
  return observeHandle;
}; // Listen for the invalidation messages that will trigger us to poll the
// database for changes. If this selector specifies specific IDs, specify them
// here, so that updates to different specific IDs don't cause us to poll.
// listenCallback is the same kind of (notification, complete) callback passed
// to InvalidationCrossbar.listen.


listenAll = function (cursorDescription, listenCallback) {
  var listeners = [];
  forEachTrigger(cursorDescription, function (trigger) {
    listeners.push(DDPServer._InvalidationCrossbar.listen(trigger, listenCallback));
  });
  return {
    stop: function () {
      _.each(listeners, function (listener) {
        listener.stop();
      });
    }
  };
};

forEachTrigger = function (cursorDescription, triggerCallback) {
  var key = {
    collection: cursorDescription.collectionName
  };

  var specificIds = LocalCollection._idsMatchedBySelector(cursorDescription.selector);

  if (specificIds) {
    _.each(specificIds, function (id) {
      triggerCallback(_.extend({
        id: id
      }, key));
    });

    triggerCallback(_.extend({
      dropCollection: true,
      id: null
    }, key));
  } else {
    triggerCallback(key);
  } // Everyone cares about the database being dropped.


  triggerCallback({
    dropDatabase: true
  });
}; // observeChanges for tailable cursors on capped collections.
//
// Some differences from normal cursors:
//   - Will never produce anything other than 'added' or 'addedBefore'. If you
//     do update a document that has already been produced, this will not notice
//     it.
//   - If you disconnect and reconnect from Mongo, it will essentially restart
//     the query, which will lead to duplicate results. This is pretty bad,
//     but if you include a field called 'ts' which is inserted as
//     new MongoInternals.MongoTimestamp(0, 0) (which is initialized to the
//     current Mongo-style timestamp), we'll be able to find the place to
//     restart properly. (This field is specifically understood by Mongo with an
//     optimization which allows it to find the right place to start without
//     an index on ts. It's how the oplog works.)
//   - No callbacks are triggered synchronously with the call (there's no
//     differentiation between "initial data" and "later changes"; everything
//     that matches the query gets sent asynchronously).
//   - De-duplication is not implemented.
//   - Does not yet interact with the write fence. Probably, this should work by
//     ignoring removes (which don't work on capped collections) and updates
//     (which don't affect tailable cursors), and just keeping track of the ID
//     of the inserted object, and closing the write fence once you get to that
//     ID (or timestamp?).  This doesn't work well if the document doesn't match
//     the query, though.  On the other hand, the write fence can close
//     immediately if it does not match the query. So if we trust minimongo
//     enough to accurately evaluate the query against the write fence, we
//     should be able to do this...  Of course, minimongo doesn't even support
//     Mongo Timestamps yet.


MongoConnection.prototype._observeChangesTailable = function (cursorDescription, ordered, callbacks) {
  var self = this; // Tailable cursors only ever call added/addedBefore callbacks, so it's an
  // error if you didn't provide them.

  if (ordered && !callbacks.addedBefore || !ordered && !callbacks.added) {
    throw new Error("Can't observe an " + (ordered ? "ordered" : "unordered") + " tailable cursor without a " + (ordered ? "addedBefore" : "added") + " callback");
  }

  return self.tail(cursorDescription, function (doc) {
    var id = doc._id;
    delete doc._id; // The ts is an implementation detail. Hide it.

    delete doc.ts;

    if (ordered) {
      callbacks.addedBefore(id, doc, null);
    } else {
      callbacks.added(id, doc);
    }
  });
}; // XXX We probably need to find a better way to expose this. Right now
// it's only used by tests, but in fact you need it in normal
// operation to interact with capped collections.


MongoInternals.MongoTimestamp = MongoDB.Timestamp;
MongoInternals.Connection = MongoConnection;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oplog_tailing.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/oplog_tailing.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Future = Npm.require('fibers/future');

OPLOG_COLLECTION = 'oplog.rs';
var TOO_FAR_BEHIND = process.env.METEOR_OPLOG_TOO_FAR_BEHIND || 2000;
var TAIL_TIMEOUT = +process.env.METEOR_OPLOG_TAIL_TIMEOUT || 30000;

var showTS = function (ts) {
  return "Timestamp(" + ts.getHighBits() + ", " + ts.getLowBits() + ")";
};

idForOp = function (op) {
  if (op.op === 'd') return op.o._id;else if (op.op === 'i') return op.o._id;else if (op.op === 'u') return op.o2._id;else if (op.op === 'c') throw Error("Operator 'c' doesn't supply an object with id: " + EJSON.stringify(op));else throw Error("Unknown op: " + EJSON.stringify(op));
};

OplogHandle = function (oplogUrl, dbName) {
  var self = this;
  self._oplogUrl = oplogUrl;
  self._dbName = dbName;
  self._oplogLastEntryConnection = null;
  self._oplogTailConnection = null;
  self._stopped = false;
  self._tailHandle = null;
  self._readyFuture = new Future();
  self._crossbar = new DDPServer._Crossbar({
    factPackage: "mongo-livedata",
    factName: "oplog-watchers"
  });
  self._baseOplogSelector = {
    ns: new RegExp('^' + Meteor._escapeRegExp(self._dbName) + '\\.'),
    $or: [{
      op: {
        $in: ['i', 'u', 'd']
      }
    }, // drop collection
    {
      op: 'c',
      'o.drop': {
        $exists: true
      }
    }, {
      op: 'c',
      'o.dropDatabase': 1
    }]
  }; // Data structures to support waitUntilCaughtUp(). Each oplog entry has a
  // MongoTimestamp object on it (which is not the same as a Date --- it's a
  // combination of time and an incrementing counter; see
  // http://docs.mongodb.org/manual/reference/bson-types/#timestamps).
  //
  // _catchingUpFutures is an array of {ts: MongoTimestamp, future: Future}
  // objects, sorted by ascending timestamp. _lastProcessedTS is the
  // MongoTimestamp of the last oplog entry we've processed.
  //
  // Each time we call waitUntilCaughtUp, we take a peek at the final oplog
  // entry in the db.  If we've already processed it (ie, it is not greater than
  // _lastProcessedTS), waitUntilCaughtUp immediately returns. Otherwise,
  // waitUntilCaughtUp makes a new Future and inserts it along with the final
  // timestamp entry that it read, into _catchingUpFutures. waitUntilCaughtUp
  // then waits on that future, which is resolved once _lastProcessedTS is
  // incremented to be past its timestamp by the worker fiber.
  //
  // XXX use a priority queue or something else that's faster than an array

  self._catchingUpFutures = [];
  self._lastProcessedTS = null;
  self._onSkippedEntriesHook = new Hook({
    debugPrintExceptions: "onSkippedEntries callback"
  });
  self._entryQueue = new Meteor._DoubleEndedQueue();
  self._workerActive = false;

  self._startTailing();
};

_.extend(OplogHandle.prototype, {
  stop: function () {
    var self = this;
    if (self._stopped) return;
    self._stopped = true;
    if (self._tailHandle) self._tailHandle.stop(); // XXX should close connections too
  },
  onOplogEntry: function (trigger, callback) {
    var self = this;
    if (self._stopped) throw new Error("Called onOplogEntry on stopped handle!"); // Calling onOplogEntry requires us to wait for the tailing to be ready.

    self._readyFuture.wait();

    var originalCallback = callback;
    callback = Meteor.bindEnvironment(function (notification) {
      originalCallback(notification);
    }, function (err) {
      Meteor._debug("Error in oplog callback", err);
    });

    var listenHandle = self._crossbar.listen(trigger, callback);

    return {
      stop: function () {
        listenHandle.stop();
      }
    };
  },
  // Register a callback to be invoked any time we skip oplog entries (eg,
  // because we are too far behind).
  onSkippedEntries: function (callback) {
    var self = this;
    if (self._stopped) throw new Error("Called onSkippedEntries on stopped handle!");
    return self._onSkippedEntriesHook.register(callback);
  },
  // Calls `callback` once the oplog has been processed up to a point that is
  // roughly "now": specifically, once we've processed all ops that are
  // currently visible.
  // XXX become convinced that this is actually safe even if oplogConnection
  // is some kind of pool
  waitUntilCaughtUp: function () {
    var self = this;
    if (self._stopped) throw new Error("Called waitUntilCaughtUp on stopped handle!"); // Calling waitUntilCaughtUp requries us to wait for the oplog connection to
    // be ready.

    self._readyFuture.wait();

    var lastEntry;

    while (!self._stopped) {
      // We need to make the selector at least as restrictive as the actual
      // tailing selector (ie, we need to specify the DB name) or else we might
      // find a TS that won't show up in the actual tail stream.
      try {
        lastEntry = self._oplogLastEntryConnection.findOne(OPLOG_COLLECTION, self._baseOplogSelector, {
          fields: {
            ts: 1
          },
          sort: {
            $natural: -1
          }
        });
        break;
      } catch (e) {
        // During failover (eg) if we get an exception we should log and retry
        // instead of crashing.
        Meteor._debug("Got exception while reading last entry", e);

        Meteor._sleepForMs(100);
      }
    }

    if (self._stopped) return;

    if (!lastEntry) {
      // Really, nothing in the oplog? Well, we've processed everything.
      return;
    }

    var ts = lastEntry.ts;
    if (!ts) throw Error("oplog entry without ts: " + EJSON.stringify(lastEntry));

    if (self._lastProcessedTS && ts.lessThanOrEqual(self._lastProcessedTS)) {
      // We've already caught up to here.
      return;
    } // Insert the future into our list. Almost always, this will be at the end,
    // but it's conceivable that if we fail over from one primary to another,
    // the oplog entries we see will go backwards.


    var insertAfter = self._catchingUpFutures.length;

    while (insertAfter - 1 > 0 && self._catchingUpFutures[insertAfter - 1].ts.greaterThan(ts)) {
      insertAfter--;
    }

    var f = new Future();

    self._catchingUpFutures.splice(insertAfter, 0, {
      ts: ts,
      future: f
    });

    f.wait();
  },
  _startTailing: function () {
    var self = this; // First, make sure that we're talking to the local database.

    var mongodbUri = Npm.require('mongodb-uri');

    if (mongodbUri.parse(self._oplogUrl).database !== 'local') {
      throw Error("$MONGO_OPLOG_URL must be set to the 'local' database of " + "a Mongo replica set");
    } // We make two separate connections to Mongo. The Node Mongo driver
    // implements a naive round-robin connection pool: each "connection" is a
    // pool of several (5 by default) TCP connections, and each request is
    // rotated through the pools. Tailable cursor queries block on the server
    // until there is some data to return (or until a few seconds have
    // passed). So if the connection pool used for tailing cursors is the same
    // pool used for other queries, the other queries will be delayed by seconds
    // 1/5 of the time.
    //
    // The tail connection will only ever be running a single tail command, so
    // it only needs to make one underlying TCP connection.


    self._oplogTailConnection = new MongoConnection(self._oplogUrl, {
      poolSize: 1
    }); // XXX better docs, but: it's to get monotonic results
    // XXX is it safe to say "if there's an in flight query, just use its
    //     results"? I don't think so but should consider that

    self._oplogLastEntryConnection = new MongoConnection(self._oplogUrl, {
      poolSize: 1
    }); // Now, make sure that there actually is a repl set here. If not, oplog
    // tailing won't ever find anything!
    // More on the isMasterDoc
    // https://docs.mongodb.com/manual/reference/command/isMaster/

    var f = new Future();

    self._oplogLastEntryConnection.db.admin().command({
      ismaster: 1
    }, f.resolver());

    var isMasterDoc = f.wait();

    if (!(isMasterDoc && isMasterDoc.setName)) {
      throw Error("$MONGO_OPLOG_URL must be set to the 'local' database of " + "a Mongo replica set");
    } // Find the last oplog entry.


    var lastOplogEntry = self._oplogLastEntryConnection.findOne(OPLOG_COLLECTION, {}, {
      sort: {
        $natural: -1
      },
      fields: {
        ts: 1
      }
    });

    var oplogSelector = _.clone(self._baseOplogSelector);

    if (lastOplogEntry) {
      // Start after the last entry that currently exists.
      oplogSelector.ts = {
        $gt: lastOplogEntry.ts
      }; // If there are any calls to callWhenProcessedLatest before any other
      // oplog entries show up, allow callWhenProcessedLatest to call its
      // callback immediately.

      self._lastProcessedTS = lastOplogEntry.ts;
    }

    var cursorDescription = new CursorDescription(OPLOG_COLLECTION, oplogSelector, {
      tailable: true
    }); // Start tailing the oplog.
    //
    // We restart the low-level oplog query every 30 seconds if we didn't get a
    // doc. This is a workaround for #8598: the Node Mongo driver has at least
    // one bug that can lead to query callbacks never getting called (even with
    // an error) when leadership failover occur.

    self._tailHandle = self._oplogTailConnection.tail(cursorDescription, function (doc) {
      self._entryQueue.push(doc);

      self._maybeStartWorker();
    }, TAIL_TIMEOUT);

    self._readyFuture.return();
  },
  _maybeStartWorker: function () {
    var self = this;
    if (self._workerActive) return;
    self._workerActive = true;
    Meteor.defer(function () {
      try {
        while (!self._stopped && !self._entryQueue.isEmpty()) {
          // Are we too far behind? Just tell our observers that they need to
          // repoll, and drop our queue.
          if (self._entryQueue.length > TOO_FAR_BEHIND) {
            var lastEntry = self._entryQueue.pop();

            self._entryQueue.clear();

            self._onSkippedEntriesHook.each(function (callback) {
              callback();
              return true;
            }); // Free any waitUntilCaughtUp() calls that were waiting for us to
            // pass something that we just skipped.


            self._setLastProcessedTS(lastEntry.ts);

            continue;
          }

          var doc = self._entryQueue.shift();

          if (!(doc.ns && doc.ns.length > self._dbName.length + 1 && doc.ns.substr(0, self._dbName.length + 1) === self._dbName + '.')) {
            throw new Error("Unexpected ns");
          }

          var trigger = {
            collection: doc.ns.substr(self._dbName.length + 1),
            dropCollection: false,
            dropDatabase: false,
            op: doc
          }; // Is it a special command and the collection name is hidden somewhere
          // in operator?

          if (trigger.collection === "$cmd") {
            if (doc.o.dropDatabase) {
              delete trigger.collection;
              trigger.dropDatabase = true;
            } else if (_.has(doc.o, 'drop')) {
              trigger.collection = doc.o.drop;
              trigger.dropCollection = true;
              trigger.id = null;
            } else {
              throw Error("Unknown command " + JSON.stringify(doc));
            }
          } else {
            // All other ops have an id.
            trigger.id = idForOp(doc);
          }

          self._crossbar.fire(trigger); // Now that we've processed this operation, process pending
          // sequencers.


          if (!doc.ts) throw Error("oplog entry without ts: " + EJSON.stringify(doc));

          self._setLastProcessedTS(doc.ts);
        }
      } finally {
        self._workerActive = false;
      }
    });
  },
  _setLastProcessedTS: function (ts) {
    var self = this;
    self._lastProcessedTS = ts;

    while (!_.isEmpty(self._catchingUpFutures) && self._catchingUpFutures[0].ts.lessThanOrEqual(self._lastProcessedTS)) {
      var sequencer = self._catchingUpFutures.shift();

      sequencer.future.return();
    }
  },
  //Methods used on tests to dinamically change TOO_FAR_BEHIND
  _defineTooFarBehind: function (value) {
    TOO_FAR_BEHIND = value;
  },
  _resetTooFarBehind: function () {
    TOO_FAR_BEHIND = process.env.METEOR_OPLOG_TOO_FAR_BEHIND || 2000;
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"observe_multiplex.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/observe_multiplex.js                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Future = Npm.require('fibers/future');

ObserveMultiplexer = function (options) {
  var self = this;
  if (!options || !_.has(options, 'ordered')) throw Error("must specified ordered");
  Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-multiplexers", 1);
  self._ordered = options.ordered;

  self._onStop = options.onStop || function () {};

  self._queue = new Meteor._SynchronousQueue();
  self._handles = {};
  self._readyFuture = new Future();
  self._cache = new LocalCollection._CachingChangeObserver({
    ordered: options.ordered
  }); // Number of addHandleAndSendInitialAdds tasks scheduled but not yet
  // running. removeHandle uses this to know if it's time to call the onStop
  // callback.

  self._addHandleTasksScheduledButNotPerformed = 0;

  _.each(self.callbackNames(), function (callbackName) {
    self[callbackName] = function ()
    /* ... */
    {
      self._applyCallback(callbackName, _.toArray(arguments));
    };
  });
};

_.extend(ObserveMultiplexer.prototype, {
  addHandleAndSendInitialAdds: function (handle) {
    var self = this; // Check this before calling runTask (even though runTask does the same
    // check) so that we don't leak an ObserveMultiplexer on error by
    // incrementing _addHandleTasksScheduledButNotPerformed and never
    // decrementing it.

    if (!self._queue.safeToRunTask()) throw new Error("Can't call observeChanges from an observe callback on the same query");
    ++self._addHandleTasksScheduledButNotPerformed;
    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-handles", 1);

    self._queue.runTask(function () {
      self._handles[handle._id] = handle; // Send out whatever adds we have so far (whether or not we the
      // multiplexer is ready).

      self._sendAdds(handle);

      --self._addHandleTasksScheduledButNotPerformed;
    }); // *outside* the task, since otherwise we'd deadlock


    self._readyFuture.wait();
  },
  // Remove an observe handle. If it was the last observe handle, call the
  // onStop callback; you cannot add any more observe handles after this.
  //
  // This is not synchronized with polls and handle additions: this means that
  // you can safely call it from within an observe callback, but it also means
  // that we have to be careful when we iterate over _handles.
  removeHandle: function (id) {
    var self = this; // This should not be possible: you can only call removeHandle by having
    // access to the ObserveHandle, which isn't returned to user code until the
    // multiplex is ready.

    if (!self._ready()) throw new Error("Can't remove handles until the multiplex is ready");
    delete self._handles[id];
    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-handles", -1);

    if (_.isEmpty(self._handles) && self._addHandleTasksScheduledButNotPerformed === 0) {
      self._stop();
    }
  },
  _stop: function (options) {
    var self = this;
    options = options || {}; // It shouldn't be possible for us to stop when all our handles still
    // haven't been returned from observeChanges!

    if (!self._ready() && !options.fromQueryError) throw Error("surprising _stop: not ready"); // Call stop callback (which kills the underlying process which sends us
    // callbacks and removes us from the connection's dictionary).

    self._onStop();

    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-multiplexers", -1); // Cause future addHandleAndSendInitialAdds calls to throw (but the onStop
    // callback should make our connection forget about us).

    self._handles = null;
  },
  // Allows all addHandleAndSendInitialAdds calls to return, once all preceding
  // adds have been processed. Does not block.
  ready: function () {
    var self = this;

    self._queue.queueTask(function () {
      if (self._ready()) throw Error("can't make ObserveMultiplex ready twice!");

      self._readyFuture.return();
    });
  },
  // If trying to execute the query results in an error, call this. This is
  // intended for permanent errors, not transient network errors that could be
  // fixed. It should only be called before ready(), because if you called ready
  // that meant that you managed to run the query once. It will stop this
  // ObserveMultiplex and cause addHandleAndSendInitialAdds calls (and thus
  // observeChanges calls) to throw the error.
  queryError: function (err) {
    var self = this;

    self._queue.runTask(function () {
      if (self._ready()) throw Error("can't claim query has an error after it worked!");

      self._stop({
        fromQueryError: true
      });

      self._readyFuture.throw(err);
    });
  },
  // Calls "cb" once the effects of all "ready", "addHandleAndSendInitialAdds"
  // and observe callbacks which came before this call have been propagated to
  // all handles. "ready" must have already been called on this multiplexer.
  onFlush: function (cb) {
    var self = this;

    self._queue.queueTask(function () {
      if (!self._ready()) throw Error("only call onFlush on a multiplexer that will be ready");
      cb();
    });
  },
  callbackNames: function () {
    var self = this;
    if (self._ordered) return ["addedBefore", "changed", "movedBefore", "removed"];else return ["added", "changed", "removed"];
  },
  _ready: function () {
    return this._readyFuture.isResolved();
  },
  _applyCallback: function (callbackName, args) {
    var self = this;

    self._queue.queueTask(function () {
      // If we stopped in the meantime, do nothing.
      if (!self._handles) return; // First, apply the change to the cache.
      // XXX We could make applyChange callbacks promise not to hang on to any
      // state from their arguments (assuming that their supplied callbacks
      // don't) and skip this clone. Currently 'changed' hangs on to state
      // though.

      self._cache.applyChange[callbackName].apply(null, EJSON.clone(args)); // If we haven't finished the initial adds, then we should only be getting
      // adds.


      if (!self._ready() && callbackName !== 'added' && callbackName !== 'addedBefore') {
        throw new Error("Got " + callbackName + " during initial adds");
      } // Now multiplex the callbacks out to all observe handles. It's OK if
      // these calls yield; since we're inside a task, no other use of our queue
      // can continue until these are done. (But we do have to be careful to not
      // use a handle that got removed, because removeHandle does not use the
      // queue; thus, we iterate over an array of keys that we control.)


      _.each(_.keys(self._handles), function (handleId) {
        var handle = self._handles && self._handles[handleId];
        if (!handle) return;
        var callback = handle['_' + callbackName]; // clone arguments so that callbacks can mutate their arguments

        callback && callback.apply(null, EJSON.clone(args));
      });
    });
  },
  // Sends initial adds to a handle. It should only be called from within a task
  // (the task that is processing the addHandleAndSendInitialAdds call). It
  // synchronously invokes the handle's added or addedBefore; there's no need to
  // flush the queue afterwards to ensure that the callbacks get out.
  _sendAdds: function (handle) {
    var self = this;
    if (self._queue.safeToRunTask()) throw Error("_sendAdds may only be called from within a task!");
    var add = self._ordered ? handle._addedBefore : handle._added;
    if (!add) return; // note: docs may be an _IdMap or an OrderedDict

    self._cache.docs.forEach(function (doc, id) {
      if (!_.has(self._handles, handle._id)) throw Error("handle got removed before sending initial adds!");
      var fields = EJSON.clone(doc);
      delete fields._id;
      if (self._ordered) add(id, fields, null); // we're going in order, so add at end
      else add(id, fields);
    });
  }
});

var nextObserveHandleId = 1;

ObserveHandle = function (multiplexer, callbacks) {
  var self = this; // The end user is only supposed to call stop().  The other fields are
  // accessible to the multiplexer, though.

  self._multiplexer = multiplexer;

  _.each(multiplexer.callbackNames(), function (name) {
    if (callbacks[name]) {
      self['_' + name] = callbacks[name];
    } else if (name === "addedBefore" && callbacks.added) {
      // Special case: if you specify "added" and "movedBefore", you get an
      // ordered observe where for some reason you don't get ordering data on
      // the adds.  I dunno, we wrote tests for it, there must have been a
      // reason.
      self._addedBefore = function (id, fields, before) {
        callbacks.added(id, fields);
      };
    }
  });

  self._stopped = false;
  self._id = nextObserveHandleId++;
};

ObserveHandle.prototype.stop = function () {
  var self = this;
  if (self._stopped) return;
  self._stopped = true;

  self._multiplexer.removeHandle(self._id);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"doc_fetcher.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/doc_fetcher.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Fiber = Npm.require('fibers');

var Future = Npm.require('fibers/future');

DocFetcher = function (mongoConnection) {
  var self = this;
  self._mongoConnection = mongoConnection; // Map from cache key -> [callback]

  self._callbacksForCacheKey = {};
};

_.extend(DocFetcher.prototype, {
  // Fetches document "id" from collectionName, returning it or null if not
  // found.
  //
  // If you make multiple calls to fetch() with the same cacheKey (a string),
  // DocFetcher may assume that they all return the same document. (It does
  // not check to see if collectionName/id match.)
  //
  // You may assume that callback is never called synchronously (and in fact
  // OplogObserveDriver does so).
  fetch: function (collectionName, id, cacheKey, callback) {
    var self = this;
    check(collectionName, String); // id is some sort of scalar

    check(cacheKey, String); // If there's already an in-progress fetch for this cache key, yield until
    // it's done and return whatever it returns.

    if (_.has(self._callbacksForCacheKey, cacheKey)) {
      self._callbacksForCacheKey[cacheKey].push(callback);

      return;
    }

    var callbacks = self._callbacksForCacheKey[cacheKey] = [callback];
    Fiber(function () {
      try {
        var doc = self._mongoConnection.findOne(collectionName, {
          _id: id
        }) || null; // Return doc to all relevant callbacks. Note that this array can
        // continue to grow during callback excecution.

        while (!_.isEmpty(callbacks)) {
          // Clone the document so that the various calls to fetch don't return
          // objects that are intertwingled with each other. Clone before
          // popping the future, so that if clone throws, the error gets passed
          // to the next callback.
          var clonedDoc = EJSON.clone(doc);
          callbacks.pop()(null, clonedDoc);
        }
      } catch (e) {
        while (!_.isEmpty(callbacks)) {
          callbacks.pop()(e);
        }
      } finally {
        // XXX consider keeping the doc around for a period of time before
        // removing from the cache
        delete self._callbacksForCacheKey[cacheKey];
      }
    }).run();
  }
});

MongoTest.DocFetcher = DocFetcher;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"polling_observe_driver.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/polling_observe_driver.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
PollingObserveDriver = function (options) {
  var self = this;
  self._cursorDescription = options.cursorDescription;
  self._mongoHandle = options.mongoHandle;
  self._ordered = options.ordered;
  self._multiplexer = options.multiplexer;
  self._stopCallbacks = [];
  self._stopped = false;
  self._synchronousCursor = self._mongoHandle._createSynchronousCursor(self._cursorDescription); // previous results snapshot.  on each poll cycle, diffs against
  // results drives the callbacks.

  self._results = null; // The number of _pollMongo calls that have been added to self._taskQueue but
  // have not started running. Used to make sure we never schedule more than one
  // _pollMongo (other than possibly the one that is currently running). It's
  // also used by _suspendPolling to pretend there's a poll scheduled. Usually,
  // it's either 0 (for "no polls scheduled other than maybe one currently
  // running") or 1 (for "a poll scheduled that isn't running yet"), but it can
  // also be 2 if incremented by _suspendPolling.

  self._pollsScheduledButNotStarted = 0;
  self._pendingWrites = []; // people to notify when polling completes
  // Make sure to create a separately throttled function for each
  // PollingObserveDriver object.

  self._ensurePollIsScheduled = _.throttle(self._unthrottledEnsurePollIsScheduled, self._cursorDescription.options.pollingThrottleMs || 50
  /* ms */
  ); // XXX figure out if we still need a queue

  self._taskQueue = new Meteor._SynchronousQueue();
  var listenersHandle = listenAll(self._cursorDescription, function (notification) {
    // When someone does a transaction that might affect us, schedule a poll
    // of the database. If that transaction happens inside of a write fence,
    // block the fence until we've polled and notified observers.
    var fence = DDPServer._CurrentWriteFence.get();

    if (fence) self._pendingWrites.push(fence.beginWrite()); // Ensure a poll is scheduled... but if we already know that one is,
    // don't hit the throttled _ensurePollIsScheduled function (which might
    // lead to us calling it unnecessarily in <pollingThrottleMs> ms).

    if (self._pollsScheduledButNotStarted === 0) self._ensurePollIsScheduled();
  });

  self._stopCallbacks.push(function () {
    listenersHandle.stop();
  }); // every once and a while, poll even if we don't think we're dirty, for
  // eventual consistency with database writes from outside the Meteor
  // universe.
  //
  // For testing, there's an undocumented callback argument to observeChanges
  // which disables time-based polling and gets called at the beginning of each
  // poll.


  if (options._testOnlyPollCallback) {
    self._testOnlyPollCallback = options._testOnlyPollCallback;
  } else {
    var pollingInterval = self._cursorDescription.options.pollingIntervalMs || self._cursorDescription.options._pollingInterval || // COMPAT with 1.2
    10 * 1000;
    var intervalHandle = Meteor.setInterval(_.bind(self._ensurePollIsScheduled, self), pollingInterval);

    self._stopCallbacks.push(function () {
      Meteor.clearInterval(intervalHandle);
    });
  } // Make sure we actually poll soon!


  self._unthrottledEnsurePollIsScheduled();

  Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-drivers-polling", 1);
};

_.extend(PollingObserveDriver.prototype, {
  // This is always called through _.throttle (except once at startup).
  _unthrottledEnsurePollIsScheduled: function () {
    var self = this;
    if (self._pollsScheduledButNotStarted > 0) return;
    ++self._pollsScheduledButNotStarted;

    self._taskQueue.queueTask(function () {
      self._pollMongo();
    });
  },
  // test-only interface for controlling polling.
  //
  // _suspendPolling blocks until any currently running and scheduled polls are
  // done, and prevents any further polls from being scheduled. (new
  // ObserveHandles can be added and receive their initial added callbacks,
  // though.)
  //
  // _resumePolling immediately polls, and allows further polls to occur.
  _suspendPolling: function () {
    var self = this; // Pretend that there's another poll scheduled (which will prevent
    // _ensurePollIsScheduled from queueing any more polls).

    ++self._pollsScheduledButNotStarted; // Now block until all currently running or scheduled polls are done.

    self._taskQueue.runTask(function () {}); // Confirm that there is only one "poll" (the fake one we're pretending to
    // have) scheduled.


    if (self._pollsScheduledButNotStarted !== 1) throw new Error("_pollsScheduledButNotStarted is " + self._pollsScheduledButNotStarted);
  },
  _resumePolling: function () {
    var self = this; // We should be in the same state as in the end of _suspendPolling.

    if (self._pollsScheduledButNotStarted !== 1) throw new Error("_pollsScheduledButNotStarted is " + self._pollsScheduledButNotStarted); // Run a poll synchronously (which will counteract the
    // ++_pollsScheduledButNotStarted from _suspendPolling).

    self._taskQueue.runTask(function () {
      self._pollMongo();
    });
  },
  _pollMongo: function () {
    var self = this;
    --self._pollsScheduledButNotStarted;
    if (self._stopped) return;
    var first = false;
    var newResults;
    var oldResults = self._results;

    if (!oldResults) {
      first = true; // XXX maybe use OrderedDict instead?

      oldResults = self._ordered ? [] : new LocalCollection._IdMap();
    }

    self._testOnlyPollCallback && self._testOnlyPollCallback(); // Save the list of pending writes which this round will commit.

    var writesForCycle = self._pendingWrites;
    self._pendingWrites = []; // Get the new query results. (This yields.)

    try {
      newResults = self._synchronousCursor.getRawObjects(self._ordered);
    } catch (e) {
      if (first && typeof e.code === 'number') {
        // This is an error document sent to us by mongod, not a connection
        // error generated by the client. And we've never seen this query work
        // successfully. Probably it's a bad selector or something, so we should
        // NOT retry. Instead, we should halt the observe (which ends up calling
        // `stop` on us).
        self._multiplexer.queryError(new Error("Exception while polling query " + JSON.stringify(self._cursorDescription) + ": " + e.message));

        return;
      } // getRawObjects can throw if we're having trouble talking to the
      // database.  That's fine --- we will repoll later anyway. But we should
      // make sure not to lose track of this cycle's writes.
      // (It also can throw if there's just something invalid about this query;
      // unfortunately the ObserveDriver API doesn't provide a good way to
      // "cancel" the observe from the inside in this case.


      Array.prototype.push.apply(self._pendingWrites, writesForCycle);

      Meteor._debug("Exception while polling query " + JSON.stringify(self._cursorDescription), e);

      return;
    } // Run diffs.


    if (!self._stopped) {
      LocalCollection._diffQueryChanges(self._ordered, oldResults, newResults, self._multiplexer);
    } // Signals the multiplexer to allow all observeChanges calls that share this
    // multiplexer to return. (This happens asynchronously, via the
    // multiplexer's queue.)


    if (first) self._multiplexer.ready(); // Replace self._results atomically.  (This assignment is what makes `first`
    // stay through on the next cycle, so we've waited until after we've
    // committed to ready-ing the multiplexer.)

    self._results = newResults; // Once the ObserveMultiplexer has processed everything we've done in this
    // round, mark all the writes which existed before this call as
    // commmitted. (If new writes have shown up in the meantime, there'll
    // already be another _pollMongo task scheduled.)

    self._multiplexer.onFlush(function () {
      _.each(writesForCycle, function (w) {
        w.committed();
      });
    });
  },
  stop: function () {
    var self = this;
    self._stopped = true;

    _.each(self._stopCallbacks, function (c) {
      c();
    }); // Release any write fences that are waiting on us.


    _.each(self._pendingWrites, function (w) {
      w.committed();
    });

    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-drivers-polling", -1);
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oplog_observe_driver.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/oplog_observe_driver.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Future = Npm.require('fibers/future');

var PHASE = {
  QUERYING: "QUERYING",
  FETCHING: "FETCHING",
  STEADY: "STEADY"
}; // Exception thrown by _needToPollQuery which unrolls the stack up to the
// enclosing call to finishIfNeedToPollQuery.

var SwitchedToQuery = function () {};

var finishIfNeedToPollQuery = function (f) {
  return function () {
    try {
      f.apply(this, arguments);
    } catch (e) {
      if (!(e instanceof SwitchedToQuery)) throw e;
    }
  };
};

var currentId = 0; // OplogObserveDriver is an alternative to PollingObserveDriver which follows
// the Mongo operation log instead of just re-polling the query. It obeys the
// same simple interface: constructing it starts sending observeChanges
// callbacks (and a ready() invocation) to the ObserveMultiplexer, and you stop
// it by calling the stop() method.

OplogObserveDriver = function (options) {
  var self = this;
  self._usesOplog = true; // tests look at this

  self._id = currentId;
  currentId++;
  self._cursorDescription = options.cursorDescription;
  self._mongoHandle = options.mongoHandle;
  self._multiplexer = options.multiplexer;

  if (options.ordered) {
    throw Error("OplogObserveDriver only supports unordered observeChanges");
  }

  var sorter = options.sorter; // We don't support $near and other geo-queries so it's OK to initialize the
  // comparator only once in the constructor.

  var comparator = sorter && sorter.getComparator();

  if (options.cursorDescription.options.limit) {
    // There are several properties ordered driver implements:
    // - _limit is a positive number
    // - _comparator is a function-comparator by which the query is ordered
    // - _unpublishedBuffer is non-null Min/Max Heap,
    //                      the empty buffer in STEADY phase implies that the
    //                      everything that matches the queries selector fits
    //                      into published set.
    // - _published - Min Heap (also implements IdMap methods)
    var heapOptions = {
      IdMap: LocalCollection._IdMap
    };
    self._limit = self._cursorDescription.options.limit;
    self._comparator = comparator;
    self._sorter = sorter;
    self._unpublishedBuffer = new MinMaxHeap(comparator, heapOptions); // We need something that can find Max value in addition to IdMap interface

    self._published = new MaxHeap(comparator, heapOptions);
  } else {
    self._limit = 0;
    self._comparator = null;
    self._sorter = null;
    self._unpublishedBuffer = null;
    self._published = new LocalCollection._IdMap();
  } // Indicates if it is safe to insert a new document at the end of the buffer
  // for this query. i.e. it is known that there are no documents matching the
  // selector those are not in published or buffer.


  self._safeAppendToBuffer = false;
  self._stopped = false;
  self._stopHandles = [];
  Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-drivers-oplog", 1);

  self._registerPhaseChange(PHASE.QUERYING);

  self._matcher = options.matcher;
  var projection = self._cursorDescription.options.fields || {};
  self._projectionFn = LocalCollection._compileProjection(projection); // Projection function, result of combining important fields for selector and
  // existing fields projection

  self._sharedProjection = self._matcher.combineIntoProjection(projection);
  if (sorter) self._sharedProjection = sorter.combineIntoProjection(self._sharedProjection);
  self._sharedProjectionFn = LocalCollection._compileProjection(self._sharedProjection);
  self._needToFetch = new LocalCollection._IdMap();
  self._currentlyFetching = null;
  self._fetchGeneration = 0;
  self._requeryWhenDoneThisQuery = false;
  self._writesToCommitWhenWeReachSteady = []; // If the oplog handle tells us that it skipped some entries (because it got
  // behind, say), re-poll.

  self._stopHandles.push(self._mongoHandle._oplogHandle.onSkippedEntries(finishIfNeedToPollQuery(function () {
    self._needToPollQuery();
  })));

  forEachTrigger(self._cursorDescription, function (trigger) {
    self._stopHandles.push(self._mongoHandle._oplogHandle.onOplogEntry(trigger, function (notification) {
      Meteor._noYieldsAllowed(finishIfNeedToPollQuery(function () {
        var op = notification.op;

        if (notification.dropCollection || notification.dropDatabase) {
          // Note: this call is not allowed to block on anything (especially
          // on waiting for oplog entries to catch up) because that will block
          // onOplogEntry!
          self._needToPollQuery();
        } else {
          // All other operators should be handled depending on phase
          if (self._phase === PHASE.QUERYING) {
            self._handleOplogEntryQuerying(op);
          } else {
            self._handleOplogEntrySteadyOrFetching(op);
          }
        }
      }));
    }));
  }); // XXX ordering w.r.t. everything else?

  self._stopHandles.push(listenAll(self._cursorDescription, function (notification) {
    // If we're not in a pre-fire write fence, we don't have to do anything.
    var fence = DDPServer._CurrentWriteFence.get();

    if (!fence || fence.fired) return;

    if (fence._oplogObserveDrivers) {
      fence._oplogObserveDrivers[self._id] = self;
      return;
    }

    fence._oplogObserveDrivers = {};
    fence._oplogObserveDrivers[self._id] = self;
    fence.onBeforeFire(function () {
      var drivers = fence._oplogObserveDrivers;
      delete fence._oplogObserveDrivers; // This fence cannot fire until we've caught up to "this point" in the
      // oplog, and all observers made it back to the steady state.

      self._mongoHandle._oplogHandle.waitUntilCaughtUp();

      _.each(drivers, function (driver) {
        if (driver._stopped) return;
        var write = fence.beginWrite();

        if (driver._phase === PHASE.STEADY) {
          // Make sure that all of the callbacks have made it through the
          // multiplexer and been delivered to ObserveHandles before committing
          // writes.
          driver._multiplexer.onFlush(function () {
            write.committed();
          });
        } else {
          driver._writesToCommitWhenWeReachSteady.push(write);
        }
      });
    });
  })); // When Mongo fails over, we need to repoll the query, in case we processed an
  // oplog entry that got rolled back.


  self._stopHandles.push(self._mongoHandle._onFailover(finishIfNeedToPollQuery(function () {
    self._needToPollQuery();
  }))); // Give _observeChanges a chance to add the new ObserveHandle to our
  // multiplexer, so that the added calls get streamed.


  Meteor.defer(finishIfNeedToPollQuery(function () {
    self._runInitialQuery();
  }));
};

_.extend(OplogObserveDriver.prototype, {
  _addPublished: function (id, doc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var fields = _.clone(doc);

      delete fields._id;

      self._published.set(id, self._sharedProjectionFn(doc));

      self._multiplexer.added(id, self._projectionFn(fields)); // After adding this document, the published set might be overflowed
      // (exceeding capacity specified by limit). If so, push the maximum
      // element to the buffer, we might want to save it in memory to reduce the
      // amount of Mongo lookups in the future.


      if (self._limit && self._published.size() > self._limit) {
        // XXX in theory the size of published is no more than limit+1
        if (self._published.size() !== self._limit + 1) {
          throw new Error("After adding to published, " + (self._published.size() - self._limit) + " documents are overflowing the set");
        }

        var overflowingDocId = self._published.maxElementId();

        var overflowingDoc = self._published.get(overflowingDocId);

        if (EJSON.equals(overflowingDocId, id)) {
          throw new Error("The document just added is overflowing the published set");
        }

        self._published.remove(overflowingDocId);

        self._multiplexer.removed(overflowingDocId);

        self._addBuffered(overflowingDocId, overflowingDoc);
      }
    });
  },
  _removePublished: function (id) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._published.remove(id);

      self._multiplexer.removed(id);

      if (!self._limit || self._published.size() === self._limit) return;
      if (self._published.size() > self._limit) throw Error("self._published got too big"); // OK, we are publishing less than the limit. Maybe we should look in the
      // buffer to find the next element past what we were publishing before.

      if (!self._unpublishedBuffer.empty()) {
        // There's something in the buffer; move the first thing in it to
        // _published.
        var newDocId = self._unpublishedBuffer.minElementId();

        var newDoc = self._unpublishedBuffer.get(newDocId);

        self._removeBuffered(newDocId);

        self._addPublished(newDocId, newDoc);

        return;
      } // There's nothing in the buffer.  This could mean one of a few things.
      // (a) We could be in the middle of re-running the query (specifically, we
      // could be in _publishNewResults). In that case, _unpublishedBuffer is
      // empty because we clear it at the beginning of _publishNewResults. In
      // this case, our caller already knows the entire answer to the query and
      // we don't need to do anything fancy here.  Just return.


      if (self._phase === PHASE.QUERYING) return; // (b) We're pretty confident that the union of _published and
      // _unpublishedBuffer contain all documents that match selector. Because
      // _unpublishedBuffer is empty, that means we're confident that _published
      // contains all documents that match selector. So we have nothing to do.

      if (self._safeAppendToBuffer) return; // (c) Maybe there are other documents out there that should be in our
      // buffer. But in that case, when we emptied _unpublishedBuffer in
      // _removeBuffered, we should have called _needToPollQuery, which will
      // either put something in _unpublishedBuffer or set _safeAppendToBuffer
      // (or both), and it will put us in QUERYING for that whole time. So in
      // fact, we shouldn't be able to get here.

      throw new Error("Buffer inexplicably empty");
    });
  },
  _changePublished: function (id, oldDoc, newDoc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._published.set(id, self._sharedProjectionFn(newDoc));

      var projectedNew = self._projectionFn(newDoc);

      var projectedOld = self._projectionFn(oldDoc);

      var changed = DiffSequence.makeChangedFields(projectedNew, projectedOld);
      if (!_.isEmpty(changed)) self._multiplexer.changed(id, changed);
    });
  },
  _addBuffered: function (id, doc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._unpublishedBuffer.set(id, self._sharedProjectionFn(doc)); // If something is overflowing the buffer, we just remove it from cache


      if (self._unpublishedBuffer.size() > self._limit) {
        var maxBufferedId = self._unpublishedBuffer.maxElementId();

        self._unpublishedBuffer.remove(maxBufferedId); // Since something matching is removed from cache (both published set and
        // buffer), set flag to false


        self._safeAppendToBuffer = false;
      }
    });
  },
  // Is called either to remove the doc completely from matching set or to move
  // it to the published set later.
  _removeBuffered: function (id) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._unpublishedBuffer.remove(id); // To keep the contract "buffer is never empty in STEADY phase unless the
      // everything matching fits into published" true, we poll everything as
      // soon as we see the buffer becoming empty.


      if (!self._unpublishedBuffer.size() && !self._safeAppendToBuffer) self._needToPollQuery();
    });
  },
  // Called when a document has joined the "Matching" results set.
  // Takes responsibility of keeping _unpublishedBuffer in sync with _published
  // and the effect of limit enforced.
  _addMatching: function (doc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var id = doc._id;
      if (self._published.has(id)) throw Error("tried to add something already published " + id);
      if (self._limit && self._unpublishedBuffer.has(id)) throw Error("tried to add something already existed in buffer " + id);
      var limit = self._limit;
      var comparator = self._comparator;
      var maxPublished = limit && self._published.size() > 0 ? self._published.get(self._published.maxElementId()) : null;
      var maxBuffered = limit && self._unpublishedBuffer.size() > 0 ? self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId()) : null; // The query is unlimited or didn't publish enough documents yet or the
      // new document would fit into published set pushing the maximum element
      // out, then we need to publish the doc.

      var toPublish = !limit || self._published.size() < limit || comparator(doc, maxPublished) < 0; // Otherwise we might need to buffer it (only in case of limited query).
      // Buffering is allowed if the buffer is not filled up yet and all
      // matching docs are either in the published set or in the buffer.

      var canAppendToBuffer = !toPublish && self._safeAppendToBuffer && self._unpublishedBuffer.size() < limit; // Or if it is small enough to be safely inserted to the middle or the
      // beginning of the buffer.

      var canInsertIntoBuffer = !toPublish && maxBuffered && comparator(doc, maxBuffered) <= 0;
      var toBuffer = canAppendToBuffer || canInsertIntoBuffer;

      if (toPublish) {
        self._addPublished(id, doc);
      } else if (toBuffer) {
        self._addBuffered(id, doc);
      } else {
        // dropping it and not saving to the cache
        self._safeAppendToBuffer = false;
      }
    });
  },
  // Called when a document leaves the "Matching" results set.
  // Takes responsibility of keeping _unpublishedBuffer in sync with _published
  // and the effect of limit enforced.
  _removeMatching: function (id) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      if (!self._published.has(id) && !self._limit) throw Error("tried to remove something matching but not cached " + id);

      if (self._published.has(id)) {
        self._removePublished(id);
      } else if (self._unpublishedBuffer.has(id)) {
        self._removeBuffered(id);
      }
    });
  },
  _handleDoc: function (id, newDoc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var matchesNow = newDoc && self._matcher.documentMatches(newDoc).result;

      var publishedBefore = self._published.has(id);

      var bufferedBefore = self._limit && self._unpublishedBuffer.has(id);

      var cachedBefore = publishedBefore || bufferedBefore;

      if (matchesNow && !cachedBefore) {
        self._addMatching(newDoc);
      } else if (cachedBefore && !matchesNow) {
        self._removeMatching(id);
      } else if (cachedBefore && matchesNow) {
        var oldDoc = self._published.get(id);

        var comparator = self._comparator;

        var minBuffered = self._limit && self._unpublishedBuffer.size() && self._unpublishedBuffer.get(self._unpublishedBuffer.minElementId());

        var maxBuffered;

        if (publishedBefore) {
          // Unlimited case where the document stays in published once it
          // matches or the case when we don't have enough matching docs to
          // publish or the changed but matching doc will stay in published
          // anyways.
          //
          // XXX: We rely on the emptiness of buffer. Be sure to maintain the
          // fact that buffer can't be empty if there are matching documents not
          // published. Notably, we don't want to schedule repoll and continue
          // relying on this property.
          var staysInPublished = !self._limit || self._unpublishedBuffer.size() === 0 || comparator(newDoc, minBuffered) <= 0;

          if (staysInPublished) {
            self._changePublished(id, oldDoc, newDoc);
          } else {
            // after the change doc doesn't stay in the published, remove it
            self._removePublished(id); // but it can move into buffered now, check it


            maxBuffered = self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId());
            var toBuffer = self._safeAppendToBuffer || maxBuffered && comparator(newDoc, maxBuffered) <= 0;

            if (toBuffer) {
              self._addBuffered(id, newDoc);
            } else {
              // Throw away from both published set and buffer
              self._safeAppendToBuffer = false;
            }
          }
        } else if (bufferedBefore) {
          oldDoc = self._unpublishedBuffer.get(id); // remove the old version manually instead of using _removeBuffered so
          // we don't trigger the querying immediately.  if we end this block
          // with the buffer empty, we will need to trigger the query poll
          // manually too.

          self._unpublishedBuffer.remove(id);

          var maxPublished = self._published.get(self._published.maxElementId());

          maxBuffered = self._unpublishedBuffer.size() && self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId()); // the buffered doc was updated, it could move to published

          var toPublish = comparator(newDoc, maxPublished) < 0; // or stays in buffer even after the change

          var staysInBuffer = !toPublish && self._safeAppendToBuffer || !toPublish && maxBuffered && comparator(newDoc, maxBuffered) <= 0;

          if (toPublish) {
            self._addPublished(id, newDoc);
          } else if (staysInBuffer) {
            // stays in buffer but changes
            self._unpublishedBuffer.set(id, newDoc);
          } else {
            // Throw away from both published set and buffer
            self._safeAppendToBuffer = false; // Normally this check would have been done in _removeBuffered but
            // we didn't use it, so we need to do it ourself now.

            if (!self._unpublishedBuffer.size()) {
              self._needToPollQuery();
            }
          }
        } else {
          throw new Error("cachedBefore implies either of publishedBefore or bufferedBefore is true.");
        }
      }
    });
  },
  _fetchModifiedDocuments: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._registerPhaseChange(PHASE.FETCHING); // Defer, because nothing called from the oplog entry handler may yield,
      // but fetch() yields.


      Meteor.defer(finishIfNeedToPollQuery(function () {
        while (!self._stopped && !self._needToFetch.empty()) {
          if (self._phase === PHASE.QUERYING) {
            // While fetching, we decided to go into QUERYING mode, and then we
            // saw another oplog entry, so _needToFetch is not empty. But we
            // shouldn't fetch these documents until AFTER the query is done.
            break;
          } // Being in steady phase here would be surprising.


          if (self._phase !== PHASE.FETCHING) throw new Error("phase in fetchModifiedDocuments: " + self._phase);
          self._currentlyFetching = self._needToFetch;
          var thisGeneration = ++self._fetchGeneration;
          self._needToFetch = new LocalCollection._IdMap();
          var waiting = 0;
          var fut = new Future(); // This loop is safe, because _currentlyFetching will not be updated
          // during this loop (in fact, it is never mutated).

          self._currentlyFetching.forEach(function (cacheKey, id) {
            waiting++;

            self._mongoHandle._docFetcher.fetch(self._cursorDescription.collectionName, id, cacheKey, finishIfNeedToPollQuery(function (err, doc) {
              try {
                if (err) {
                  Meteor._debug("Got exception while fetching documents", err); // If we get an error from the fetcher (eg, trouble
                  // connecting to Mongo), let's just abandon the fetch phase
                  // altogether and fall back to polling. It's not like we're
                  // getting live updates anyway.


                  if (self._phase !== PHASE.QUERYING) {
                    self._needToPollQuery();
                  }
                } else if (!self._stopped && self._phase === PHASE.FETCHING && self._fetchGeneration === thisGeneration) {
                  // We re-check the generation in case we've had an explicit
                  // _pollQuery call (eg, in another fiber) which should
                  // effectively cancel this round of fetches.  (_pollQuery
                  // increments the generation.)
                  self._handleDoc(id, doc);
                }
              } finally {
                waiting--; // Because fetch() never calls its callback synchronously,
                // this is safe (ie, we won't call fut.return() before the
                // forEach is done).

                if (waiting === 0) fut.return();
              }
            }));
          });

          fut.wait(); // Exit now if we've had a _pollQuery call (here or in another fiber).

          if (self._phase === PHASE.QUERYING) return;
          self._currentlyFetching = null;
        } // We're done fetching, so we can be steady, unless we've had a
        // _pollQuery call (here or in another fiber).


        if (self._phase !== PHASE.QUERYING) self._beSteady();
      }));
    });
  },
  _beSteady: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._registerPhaseChange(PHASE.STEADY);

      var writes = self._writesToCommitWhenWeReachSteady;
      self._writesToCommitWhenWeReachSteady = [];

      self._multiplexer.onFlush(function () {
        _.each(writes, function (w) {
          w.committed();
        });
      });
    });
  },
  _handleOplogEntryQuerying: function (op) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._needToFetch.set(idForOp(op), op.ts.toString());
    });
  },
  _handleOplogEntrySteadyOrFetching: function (op) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var id = idForOp(op); // If we're already fetching this one, or about to, we can't optimize;
      // make sure that we fetch it again if necessary.

      if (self._phase === PHASE.FETCHING && (self._currentlyFetching && self._currentlyFetching.has(id) || self._needToFetch.has(id))) {
        self._needToFetch.set(id, op.ts.toString());

        return;
      }

      if (op.op === 'd') {
        if (self._published.has(id) || self._limit && self._unpublishedBuffer.has(id)) self._removeMatching(id);
      } else if (op.op === 'i') {
        if (self._published.has(id)) throw new Error("insert found for already-existing ID in published");
        if (self._unpublishedBuffer && self._unpublishedBuffer.has(id)) throw new Error("insert found for already-existing ID in buffer"); // XXX what if selector yields?  for now it can't but later it could
        // have $where

        if (self._matcher.documentMatches(op.o).result) self._addMatching(op.o);
      } else if (op.op === 'u') {
        // Is this a modifier ($set/$unset, which may require us to poll the
        // database to figure out if the whole document matches the selector) or
        // a replacement (in which case we can just directly re-evaluate the
        // selector)?
        var isReplace = !_.has(op.o, '$set') && !_.has(op.o, '$unset'); // If this modifier modifies something inside an EJSON custom type (ie,
        // anything with EJSON$), then we can't try to use
        // LocalCollection._modify, since that just mutates the EJSON encoding,
        // not the actual object.

        var canDirectlyModifyDoc = !isReplace && modifierCanBeDirectlyApplied(op.o);

        var publishedBefore = self._published.has(id);

        var bufferedBefore = self._limit && self._unpublishedBuffer.has(id);

        if (isReplace) {
          self._handleDoc(id, _.extend({
            _id: id
          }, op.o));
        } else if ((publishedBefore || bufferedBefore) && canDirectlyModifyDoc) {
          // Oh great, we actually know what the document is, so we can apply
          // this directly.
          var newDoc = self._published.has(id) ? self._published.get(id) : self._unpublishedBuffer.get(id);
          newDoc = EJSON.clone(newDoc);
          newDoc._id = id;

          try {
            LocalCollection._modify(newDoc, op.o);
          } catch (e) {
            if (e.name !== "MinimongoError") throw e; // We didn't understand the modifier.  Re-fetch.

            self._needToFetch.set(id, op.ts.toString());

            if (self._phase === PHASE.STEADY) {
              self._fetchModifiedDocuments();
            }

            return;
          }

          self._handleDoc(id, self._sharedProjectionFn(newDoc));
        } else if (!canDirectlyModifyDoc || self._matcher.canBecomeTrueByModifier(op.o) || self._sorter && self._sorter.affectedByModifier(op.o)) {
          self._needToFetch.set(id, op.ts.toString());

          if (self._phase === PHASE.STEADY) self._fetchModifiedDocuments();
        }
      } else {
        throw Error("XXX SURPRISING OPERATION: " + op);
      }
    });
  },
  // Yields!
  _runInitialQuery: function () {
    var self = this;
    if (self._stopped) throw new Error("oplog stopped surprisingly early");

    self._runQuery({
      initial: true
    }); // yields


    if (self._stopped) return; // can happen on queryError
    // Allow observeChanges calls to return. (After this, it's possible for
    // stop() to be called.)

    self._multiplexer.ready();

    self._doneQuerying(); // yields

  },
  // In various circumstances, we may just want to stop processing the oplog and
  // re-run the initial query, just as if we were a PollingObserveDriver.
  //
  // This function may not block, because it is called from an oplog entry
  // handler.
  //
  // XXX We should call this when we detect that we've been in FETCHING for "too
  // long".
  //
  // XXX We should call this when we detect Mongo failover (since that might
  // mean that some of the oplog entries we have processed have been rolled
  // back). The Node Mongo driver is in the middle of a bunch of huge
  // refactorings, including the way that it notifies you when primary
  // changes. Will put off implementing this until driver 1.4 is out.
  _pollQuery: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      if (self._stopped) return; // Yay, we get to forget about all the things we thought we had to fetch.

      self._needToFetch = new LocalCollection._IdMap();
      self._currentlyFetching = null;
      ++self._fetchGeneration; // ignore any in-flight fetches

      self._registerPhaseChange(PHASE.QUERYING); // Defer so that we don't yield.  We don't need finishIfNeedToPollQuery
      // here because SwitchedToQuery is not thrown in QUERYING mode.


      Meteor.defer(function () {
        self._runQuery();

        self._doneQuerying();
      });
    });
  },
  // Yields!
  _runQuery: function (options) {
    var self = this;
    options = options || {};
    var newResults, newBuffer; // This while loop is just to retry failures.

    while (true) {
      // If we've been stopped, we don't have to run anything any more.
      if (self._stopped) return;
      newResults = new LocalCollection._IdMap();
      newBuffer = new LocalCollection._IdMap(); // Query 2x documents as the half excluded from the original query will go
      // into unpublished buffer to reduce additional Mongo lookups in cases
      // when documents are removed from the published set and need a
      // replacement.
      // XXX needs more thought on non-zero skip
      // XXX 2 is a "magic number" meaning there is an extra chunk of docs for
      // buffer if such is needed.

      var cursor = self._cursorForQuery({
        limit: self._limit * 2
      });

      try {
        cursor.forEach(function (doc, i) {
          // yields
          if (!self._limit || i < self._limit) {
            newResults.set(doc._id, doc);
          } else {
            newBuffer.set(doc._id, doc);
          }
        });
        break;
      } catch (e) {
        if (options.initial && typeof e.code === 'number') {
          // This is an error document sent to us by mongod, not a connection
          // error generated by the client. And we've never seen this query work
          // successfully. Probably it's a bad selector or something, so we
          // should NOT retry. Instead, we should halt the observe (which ends
          // up calling `stop` on us).
          self._multiplexer.queryError(e);

          return;
        } // During failover (eg) if we get an exception we should log and retry
        // instead of crashing.


        Meteor._debug("Got exception while polling query", e);

        Meteor._sleepForMs(100);
      }
    }

    if (self._stopped) return;

    self._publishNewResults(newResults, newBuffer);
  },
  // Transitions to QUERYING and runs another query, or (if already in QUERYING)
  // ensures that we will query again later.
  //
  // This function may not block, because it is called from an oplog entry
  // handler. However, if we were not already in the QUERYING phase, it throws
  // an exception that is caught by the closest surrounding
  // finishIfNeedToPollQuery call; this ensures that we don't continue running
  // close that was designed for another phase inside PHASE.QUERYING.
  //
  // (It's also necessary whenever logic in this file yields to check that other
  // phases haven't put us into QUERYING mode, though; eg,
  // _fetchModifiedDocuments does this.)
  _needToPollQuery: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      if (self._stopped) return; // If we're not already in the middle of a query, we can query now
      // (possibly pausing FETCHING).

      if (self._phase !== PHASE.QUERYING) {
        self._pollQuery();

        throw new SwitchedToQuery();
      } // We're currently in QUERYING. Set a flag to ensure that we run another
      // query when we're done.


      self._requeryWhenDoneThisQuery = true;
    });
  },
  // Yields!
  _doneQuerying: function () {
    var self = this;
    if (self._stopped) return;

    self._mongoHandle._oplogHandle.waitUntilCaughtUp(); // yields


    if (self._stopped) return;
    if (self._phase !== PHASE.QUERYING) throw Error("Phase unexpectedly " + self._phase);

    Meteor._noYieldsAllowed(function () {
      if (self._requeryWhenDoneThisQuery) {
        self._requeryWhenDoneThisQuery = false;

        self._pollQuery();
      } else if (self._needToFetch.empty()) {
        self._beSteady();
      } else {
        self._fetchModifiedDocuments();
      }
    });
  },
  _cursorForQuery: function (optionsOverwrite) {
    var self = this;
    return Meteor._noYieldsAllowed(function () {
      // The query we run is almost the same as the cursor we are observing,
      // with a few changes. We need to read all the fields that are relevant to
      // the selector, not just the fields we are going to publish (that's the
      // "shared" projection). And we don't want to apply any transform in the
      // cursor, because observeChanges shouldn't use the transform.
      var options = _.clone(self._cursorDescription.options); // Allow the caller to modify the options. Useful to specify different
      // skip and limit values.


      _.extend(options, optionsOverwrite);

      options.fields = self._sharedProjection;
      delete options.transform; // We are NOT deep cloning fields or selector here, which should be OK.

      var description = new CursorDescription(self._cursorDescription.collectionName, self._cursorDescription.selector, options);
      return new Cursor(self._mongoHandle, description);
    });
  },
  // Replace self._published with newResults (both are IdMaps), invoking observe
  // callbacks on the multiplexer.
  // Replace self._unpublishedBuffer with newBuffer.
  //
  // XXX This is very similar to LocalCollection._diffQueryUnorderedChanges. We
  // should really: (a) Unify IdMap and OrderedDict into Unordered/OrderedDict
  // (b) Rewrite diff.js to use these classes instead of arrays and objects.
  _publishNewResults: function (newResults, newBuffer) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      // If the query is limited and there is a buffer, shut down so it doesn't
      // stay in a way.
      if (self._limit) {
        self._unpublishedBuffer.clear();
      } // First remove anything that's gone. Be careful not to modify
      // self._published while iterating over it.


      var idsToRemove = [];

      self._published.forEach(function (doc, id) {
        if (!newResults.has(id)) idsToRemove.push(id);
      });

      _.each(idsToRemove, function (id) {
        self._removePublished(id);
      }); // Now do adds and changes.
      // If self has a buffer and limit, the new fetched result will be
      // limited correctly as the query has sort specifier.


      newResults.forEach(function (doc, id) {
        self._handleDoc(id, doc);
      }); // Sanity-check that everything we tried to put into _published ended up
      // there.
      // XXX if this is slow, remove it later

      if (self._published.size() !== newResults.size()) {
        throw Error("The Mongo server and the Meteor query disagree on how " + "many documents match your query. Maybe it is hitting a Mongo " + "edge case? The query is: " + EJSON.stringify(self._cursorDescription.selector));
      }

      self._published.forEach(function (doc, id) {
        if (!newResults.has(id)) throw Error("_published has a doc that newResults doesn't; " + id);
      }); // Finally, replace the buffer


      newBuffer.forEach(function (doc, id) {
        self._addBuffered(id, doc);
      });
      self._safeAppendToBuffer = newBuffer.size() < self._limit;
    });
  },
  // This stop function is invoked from the onStop of the ObserveMultiplexer, so
  // it shouldn't actually be possible to call it until the multiplexer is
  // ready.
  //
  // It's important to check self._stopped after every call in this file that
  // can yield!
  stop: function () {
    var self = this;
    if (self._stopped) return;
    self._stopped = true;

    _.each(self._stopHandles, function (handle) {
      handle.stop();
    }); // Note: we *don't* use multiplexer.onFlush here because this stop
    // callback is actually invoked by the multiplexer itself when it has
    // determined that there are no handles left. So nothing is actually going
    // to get flushed (and it's probably not valid to call methods on the
    // dying multiplexer).


    _.each(self._writesToCommitWhenWeReachSteady, function (w) {
      w.committed(); // maybe yields?
    });

    self._writesToCommitWhenWeReachSteady = null; // Proactively drop references to potentially big things.

    self._published = null;
    self._unpublishedBuffer = null;
    self._needToFetch = null;
    self._currentlyFetching = null;
    self._oplogEntryHandle = null;
    self._listenersHandle = null;
    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-drivers-oplog", -1);
  },
  _registerPhaseChange: function (phase) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var now = new Date();

      if (self._phase) {
        var timeDiff = now - self._phaseStartTime;
        Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "time-spent-in-" + self._phase + "-phase", timeDiff);
      }

      self._phase = phase;
      self._phaseStartTime = now;
    });
  }
}); // Does our oplog tailing code support this cursor? For now, we are being very
// conservative and allowing only simple queries with simple options.
// (This is a "static method".)


OplogObserveDriver.cursorSupported = function (cursorDescription, matcher) {
  // First, check the options.
  var options = cursorDescription.options; // Did the user say no explicitly?
  // underscored version of the option is COMPAT with 1.2

  if (options.disableOplog || options._disableOplog) return false; // skip is not supported: to support it we would need to keep track of all
  // "skipped" documents or at least their ids.
  // limit w/o a sort specifier is not supported: current implementation needs a
  // deterministic way to order documents.

  if (options.skip || options.limit && !options.sort) return false; // If a fields projection option is given check if it is supported by
  // minimongo (some operators are not supported).

  if (options.fields) {
    try {
      LocalCollection._checkSupportedProjection(options.fields);
    } catch (e) {
      if (e.name === "MinimongoError") {
        return false;
      } else {
        throw e;
      }
    }
  } // We don't allow the following selectors:
  //   - $where (not confident that we provide the same JS environment
  //             as Mongo, and can yield!)
  //   - $near (has "interesting" properties in MongoDB, like the possibility
  //            of returning an ID multiple times, though even polling maybe
  //            have a bug there)
  //           XXX: once we support it, we would need to think more on how we
  //           initialize the comparators when we create the driver.


  return !matcher.hasWhere() && !matcher.hasGeoQuery();
};

var modifierCanBeDirectlyApplied = function (modifier) {
  return _.all(modifier, function (fields, operation) {
    return _.all(fields, function (value, field) {
      return !/EJSON\$/.test(field);
    });
  });
};

MongoInternals.OplogObserveDriver = OplogObserveDriver;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"local_collection_driver.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/local_collection_driver.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  LocalCollectionDriver: () => LocalCollectionDriver
});
const LocalCollectionDriver = new class LocalCollectionDriver {
  constructor() {
    this.noConnCollections = Object.create(null);
  }

  open(name, conn) {
    if (!name) {
      return new LocalCollection();
    }

    if (!conn) {
      return ensureCollection(name, this.noConnCollections);
    }

    if (!conn._mongo_livedata_collections) {
      conn._mongo_livedata_collections = Object.create(null);
    } // XXX is there a way to keep track of a connection's collections without
    // dangling it off the connection object?


    return ensureCollection(name, conn._mongo_livedata_collections);
  }

}();

function ensureCollection(name, collections) {
  return name in collections ? collections[name] : collections[name] = new LocalCollection(name);
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"remote_collection_driver.js":function(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/remote_collection_driver.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
MongoInternals.RemoteCollectionDriver = function (mongo_url, options) {
  var self = this;
  self.mongo = new MongoConnection(mongo_url, options);
};

_.extend(MongoInternals.RemoteCollectionDriver.prototype, {
  open: function (name) {
    var self = this;
    var ret = {};

    _.each(['find', 'findOne', 'insert', 'update', 'upsert', 'remove', '_ensureIndex', '_dropIndex', '_createCappedCollection', 'dropCollection', 'rawCollection'], function (m) {
      ret[m] = _.bind(self.mongo[m], self.mongo, name);
    });

    return ret;
  }
}); // Create the singleton RemoteCollectionDriver only on demand, so we
// only require Mongo configuration if it's actually used (eg, not if
// you're only trying to receive data from a remote DDP server.)


MongoInternals.defaultRemoteCollectionDriver = _.once(function () {
  var connectionOptions = {};
  var mongoUrl = process.env.MONGO_URL;

  if (process.env.MONGO_OPLOG_URL) {
    connectionOptions.oplogUrl = process.env.MONGO_OPLOG_URL;
  }

  if (!mongoUrl) throw new Error("MONGO_URL must be set in environment");
  return new MongoInternals.RemoteCollectionDriver(mongoUrl, connectionOptions);
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"collection.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/collection.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

// options.connection, if given, is a LivedataClient or LivedataServer
// XXX presently there is no way to destroy/clean up a Collection

/**
 * @summary Namespace for MongoDB-related items
 * @namespace
 */
Mongo = {};
/**
 * @summary Constructor for a Collection
 * @locus Anywhere
 * @instancename collection
 * @class
 * @param {String} name The name of the collection.  If null, creates an unmanaged (unsynchronized) local collection.
 * @param {Object} [options]
 * @param {Object} options.connection The server connection that will manage this collection. Uses the default connection if not specified.  Pass the return value of calling [`DDP.connect`](#ddp_connect) to specify a different server. Pass `null` to specify no connection. Unmanaged (`name` is null) collections cannot specify a connection.
 * @param {String} options.idGeneration The method of generating the `_id` fields of new documents in this collection.  Possible values:

 - **`'STRING'`**: random strings
 - **`'MONGO'`**:  random [`Mongo.ObjectID`](#mongo_object_id) values

The default id generation technique is `'STRING'`.
 * @param {Function} options.transform An optional transformation function. Documents will be passed through this function before being returned from `fetch` or `findOne`, and before being passed to callbacks of `observe`, `map`, `forEach`, `allow`, and `deny`. Transforms are *not* applied for the callbacks of `observeChanges` or to cursors returned from publish functions.
 * @param {Boolean} options.defineMutationMethods Set to `false` to skip setting up the mutation methods that enable insert/update/remove from client code. Default `true`.
 */

Mongo.Collection = function Collection(name, options) {
  if (!name && name !== null) {
    Meteor._debug("Warning: creating anonymous collection. It will not be " + "saved or synchronized over the network. (Pass null for " + "the collection name to turn off this warning.)");

    name = null;
  }

  if (name !== null && typeof name !== "string") {
    throw new Error("First argument to new Mongo.Collection must be a string or null");
  }

  if (options && options.methods) {
    // Backwards compatibility hack with original signature (which passed
    // "connection" directly instead of in options. (Connections must have a "methods"
    // method.)
    // XXX remove before 1.0
    options = {
      connection: options
    };
  } // Backwards compatibility: "connection" used to be called "manager".


  if (options && options.manager && !options.connection) {
    options.connection = options.manager;
  }

  options = (0, _objectSpread2.default)({
    connection: undefined,
    idGeneration: 'STRING',
    transform: null,
    _driver: undefined,
    _preventAutopublish: false
  }, options);

  switch (options.idGeneration) {
    case 'MONGO':
      this._makeNewID = function () {
        var src = name ? DDP.randomStream('/collection/' + name) : Random.insecure;
        return new Mongo.ObjectID(src.hexString(24));
      };

      break;

    case 'STRING':
    default:
      this._makeNewID = function () {
        var src = name ? DDP.randomStream('/collection/' + name) : Random.insecure;
        return src.id();
      };

      break;
  }

  this._transform = LocalCollection.wrapTransform(options.transform);
  if (!name || options.connection === null) // note: nameless collections never have a connection
    this._connection = null;else if (options.connection) this._connection = options.connection;else if (Meteor.isClient) this._connection = Meteor.connection;else this._connection = Meteor.server;

  if (!options._driver) {
    // XXX This check assumes that webapp is loaded so that Meteor.server !==
    // null. We should fully support the case of "want to use a Mongo-backed
    // collection from Node code without webapp", but we don't yet.
    // #MeteorServerNull
    if (name && this._connection === Meteor.server && typeof MongoInternals !== "undefined" && MongoInternals.defaultRemoteCollectionDriver) {
      options._driver = MongoInternals.defaultRemoteCollectionDriver();
    } else {
      const {
        LocalCollectionDriver
      } = require("./local_collection_driver.js");

      options._driver = LocalCollectionDriver;
    }
  }

  this._collection = options._driver.open(name, this._connection);
  this._name = name;
  this._driver = options._driver;

  this._maybeSetUpReplication(name, options); // XXX don't define these until allow or deny is actually used for this
  // collection. Could be hard if the security rules are only defined on the
  // server.


  if (options.defineMutationMethods !== false) {
    try {
      this._defineMutationMethods({
        useExisting: options._suppressSameNameError === true
      });
    } catch (error) {
      // Throw a more understandable error on the server for same collection name
      if (error.message === `A method named '/${name}/insert' is already defined`) throw new Error(`There is already a collection named "${name}"`);
      throw error;
    }
  } // autopublish


  if (Package.autopublish && !options._preventAutopublish && this._connection && this._connection.publish) {
    this._connection.publish(null, () => this.find(), {
      is_auto: true
    });
  }
};

Object.assign(Mongo.Collection.prototype, {
  _maybeSetUpReplication(name, {
    _suppressSameNameError = false
  }) {
    const self = this;

    if (!(self._connection && self._connection.registerStore)) {
      return;
    } // OK, we're going to be a slave, replicating some remote
    // database, except possibly with some temporary divergence while
    // we have unacknowledged RPC's.


    const ok = self._connection.registerStore(name, {
      // Called at the beginning of a batch of updates. batchSize is the number
      // of update calls to expect.
      //
      // XXX This interface is pretty janky. reset probably ought to go back to
      // being its own function, and callers shouldn't have to calculate
      // batchSize. The optimization of not calling pause/remove should be
      // delayed until later: the first call to update() should buffer its
      // message, and then we can either directly apply it at endUpdate time if
      // it was the only update, or do pauseObservers/apply/apply at the next
      // update() if there's another one.
      beginUpdate(batchSize, reset) {
        // pause observers so users don't see flicker when updating several
        // objects at once (including the post-reconnect reset-and-reapply
        // stage), and so that a re-sorting of a query can take advantage of the
        // full _diffQuery moved calculation instead of applying change one at a
        // time.
        if (batchSize > 1 || reset) self._collection.pauseObservers();
        if (reset) self._collection.remove({});
      },

      // Apply an update.
      // XXX better specify this interface (not in terms of a wire message)?
      update(msg) {
        var mongoId = MongoID.idParse(msg.id);

        var doc = self._collection.findOne(mongoId); // Is this a "replace the whole doc" message coming from the quiescence
        // of method writes to an object? (Note that 'undefined' is a valid
        // value meaning "remove it".)


        if (msg.msg === 'replace') {
          var replace = msg.replace;

          if (!replace) {
            if (doc) self._collection.remove(mongoId);
          } else if (!doc) {
            self._collection.insert(replace);
          } else {
            // XXX check that replace has no $ ops
            self._collection.update(mongoId, replace);
          }

          return;
        } else if (msg.msg === 'added') {
          if (doc) {
            throw new Error("Expected not to find a document already present for an add");
          }

          self._collection.insert((0, _objectSpread2.default)({
            _id: mongoId
          }, msg.fields));
        } else if (msg.msg === 'removed') {
          if (!doc) throw new Error("Expected to find a document already present for removed");

          self._collection.remove(mongoId);
        } else if (msg.msg === 'changed') {
          if (!doc) throw new Error("Expected to find a document to change");
          const keys = Object.keys(msg.fields);

          if (keys.length > 0) {
            var modifier = {};
            keys.forEach(key => {
              const value = msg.fields[key];

              if (typeof value === "undefined") {
                if (!modifier.$unset) {
                  modifier.$unset = {};
                }

                modifier.$unset[key] = 1;
              } else {
                if (!modifier.$set) {
                  modifier.$set = {};
                }

                modifier.$set[key] = value;
              }
            });

            self._collection.update(mongoId, modifier);
          }
        } else {
          throw new Error("I don't know how to deal with this message");
        }
      },

      // Called at the end of a batch of updates.
      endUpdate() {
        self._collection.resumeObservers();
      },

      // Called around method stub invocations to capture the original versions
      // of modified documents.
      saveOriginals() {
        self._collection.saveOriginals();
      },

      retrieveOriginals() {
        return self._collection.retrieveOriginals();
      },

      // Used to preserve current versions of documents across a store reset.
      getDoc(id) {
        return self.findOne(id);
      },

      // To be able to get back to the collection from the store.
      _getCollection() {
        return self;
      }

    });

    if (!ok) {
      const message = `There is already a collection named "${name}"`;

      if (_suppressSameNameError === true) {
        // XXX In theory we do not have to throw when `ok` is falsy. The
        // store is already defined for this collection name, but this
        // will simply be another reference to it and everything should
        // work. However, we have historically thrown an error here, so
        // for now we will skip the error only when _suppressSameNameError
        // is `true`, allowing people to opt in and give this some real
        // world testing.
        console.warn ? console.warn(message) : console.log(message);
      } else {
        throw new Error(message);
      }
    }
  },

  ///
  /// Main collection API
  ///
  _getFindSelector(args) {
    if (args.length == 0) return {};else return args[0];
  },

  _getFindOptions(args) {
    var self = this;

    if (args.length < 2) {
      return {
        transform: self._transform
      };
    } else {
      check(args[1], Match.Optional(Match.ObjectIncluding({
        fields: Match.Optional(Match.OneOf(Object, undefined)),
        sort: Match.Optional(Match.OneOf(Object, Array, Function, undefined)),
        limit: Match.Optional(Match.OneOf(Number, undefined)),
        skip: Match.Optional(Match.OneOf(Number, undefined))
      })));
      return (0, _objectSpread2.default)({
        transform: self._transform
      }, args[1]);
    }
  },

  /**
   * @summary Find the documents in a collection that match the selector.
   * @locus Anywhere
   * @method find
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} [selector] A query describing the documents to find
   * @param {Object} [options]
   * @param {MongoSortSpecifier} options.sort Sort order (default: natural order)
   * @param {Number} options.skip Number of results to skip at the beginning
   * @param {Number} options.limit Maximum number of results to return
   * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
   * @param {Boolean} options.reactive (Client only) Default `true`; pass `false` to disable reactivity
   * @param {Function} options.transform Overrides `transform` on the  [`Collection`](#collections) for this cursor.  Pass `null` to disable transformation.
   * @param {Boolean} options.disableOplog (Server only) Pass true to disable oplog-tailing on this query. This affects the way server processes calls to `observe` on this query. Disabling the oplog can be useful when working with data that updates in large batches.
   * @param {Number} options.pollingIntervalMs (Server only) When oplog is disabled (through the use of `disableOplog` or when otherwise not available), the frequency (in milliseconds) of how often to poll this query when observing on the server. Defaults to 10000ms (10 seconds).
   * @param {Number} options.pollingThrottleMs (Server only) When oplog is disabled (through the use of `disableOplog` or when otherwise not available), the minimum time (in milliseconds) to allow between re-polling when observing on the server. Increasing this will save CPU and mongo load at the expense of slower updates to users. Decreasing this is not recommended. Defaults to 50ms.
   * @param {Number} options.maxTimeMs (Server only) If set, instructs MongoDB to set a time limit for this cursor's operations. If the operation reaches the specified time limit (in milliseconds) without the having been completed, an exception will be thrown. Useful to prevent an (accidental or malicious) unoptimized query from causing a full collection scan that would disrupt other database users, at the expense of needing to handle the resulting error.
   * @param {String|Object} options.hint (Server only) Overrides MongoDB's default index selection and query optimization process. Specify an index to force its use, either by its name or index specification. You can also specify `{ $natural : 1 }` to force a forwards collection scan, or `{ $natural : -1 }` for a reverse collection scan. Setting this is only recommended for advanced users.
   * @returns {Mongo.Cursor}
   */
  find(...args) {
    // Collection.find() (return all docs) behaves differently
    // from Collection.find(undefined) (return 0 docs).  so be
    // careful about the length of arguments.
    return this._collection.find(this._getFindSelector(args), this._getFindOptions(args));
  },

  /**
   * @summary Finds the first document that matches the selector, as ordered by sort and skip options. Returns `undefined` if no matching document is found.
   * @locus Anywhere
   * @method findOne
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} [selector] A query describing the documents to find
   * @param {Object} [options]
   * @param {MongoSortSpecifier} options.sort Sort order (default: natural order)
   * @param {Number} options.skip Number of results to skip at the beginning
   * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
   * @param {Boolean} options.reactive (Client only) Default true; pass false to disable reactivity
   * @param {Function} options.transform Overrides `transform` on the [`Collection`](#collections) for this cursor.  Pass `null` to disable transformation.
   * @returns {Object}
   */
  findOne(...args) {
    return this._collection.findOne(this._getFindSelector(args), this._getFindOptions(args));
  }

});
Object.assign(Mongo.Collection, {
  _publishCursor(cursor, sub, collection) {
    var observeHandle = cursor.observeChanges({
      added: function (id, fields) {
        sub.added(collection, id, fields);
      },
      changed: function (id, fields) {
        sub.changed(collection, id, fields);
      },
      removed: function (id) {
        sub.removed(collection, id);
      }
    }); // We don't call sub.ready() here: it gets called in livedata_server, after
    // possibly calling _publishCursor on multiple returned cursors.
    // register stop callback (expects lambda w/ no args).

    sub.onStop(function () {
      observeHandle.stop();
    }); // return the observeHandle in case it needs to be stopped early

    return observeHandle;
  },

  // protect against dangerous selectors.  falsey and {_id: falsey} are both
  // likely programmer error, and not what you want, particularly for destructive
  // operations. If a falsey _id is sent in, a new string _id will be
  // generated and returned; if a fallbackId is provided, it will be returned
  // instead.
  _rewriteSelector(selector, {
    fallbackId
  } = {}) {
    // shorthand -- scalars match _id
    if (LocalCollection._selectorIsId(selector)) selector = {
      _id: selector
    };

    if (Array.isArray(selector)) {
      // This is consistent with the Mongo console itself; if we don't do this
      // check passing an empty array ends up selecting all items
      throw new Error("Mongo selector can't be an array.");
    }

    if (!selector || '_id' in selector && !selector._id) {
      // can't match anything
      return {
        _id: fallbackId || Random.id()
      };
    }

    return selector;
  }

});
Object.assign(Mongo.Collection.prototype, {
  // 'insert' immediately returns the inserted document's new _id.
  // The others return values immediately if you are in a stub, an in-memory
  // unmanaged collection, or a mongo-backed collection and you don't pass a
  // callback. 'update' and 'remove' return the number of affected
  // documents. 'upsert' returns an object with keys 'numberAffected' and, if an
  // insert happened, 'insertedId'.
  //
  // Otherwise, the semantics are exactly like other methods: they take
  // a callback as an optional last argument; if no callback is
  // provided, they block until the operation is complete, and throw an
  // exception if it fails; if a callback is provided, then they don't
  // necessarily block, and they call the callback when they finish with error and
  // result arguments.  (The insert method provides the document ID as its result;
  // update and remove provide the number of affected docs as the result; upsert
  // provides an object with numberAffected and maybe insertedId.)
  //
  // On the client, blocking is impossible, so if a callback
  // isn't provided, they just return immediately and any error
  // information is lost.
  //
  // There's one more tweak. On the client, if you don't provide a
  // callback, then if there is an error, a message will be logged with
  // Meteor._debug.
  //
  // The intent (though this is actually determined by the underlying
  // drivers) is that the operations should be done synchronously, not
  // generating their result until the database has acknowledged
  // them. In the future maybe we should provide a flag to turn this
  // off.

  /**
   * @summary Insert a document in the collection.  Returns its unique _id.
   * @locus Anywhere
   * @method  insert
   * @memberof Mongo.Collection
   * @instance
   * @param {Object} doc The document to insert. May not yet have an _id attribute, in which case Meteor will generate one for you.
   * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the _id as the second.
   */
  insert(doc, callback) {
    // Make sure we were passed a document to insert
    if (!doc) {
      throw new Error("insert requires an argument");
    } // Make a shallow clone of the document, preserving its prototype.


    doc = Object.create(Object.getPrototypeOf(doc), Object.getOwnPropertyDescriptors(doc));

    if ('_id' in doc) {
      if (!doc._id || !(typeof doc._id === 'string' || doc._id instanceof Mongo.ObjectID)) {
        throw new Error("Meteor requires document _id fields to be non-empty strings or ObjectIDs");
      }
    } else {
      let generateId = true; // Don't generate the id if we're the client and the 'outermost' call
      // This optimization saves us passing both the randomSeed and the id
      // Passing both is redundant.

      if (this._isRemoteCollection()) {
        const enclosing = DDP._CurrentMethodInvocation.get();

        if (!enclosing) {
          generateId = false;
        }
      }

      if (generateId) {
        doc._id = this._makeNewID();
      }
    } // On inserts, always return the id that we generated; on all other
    // operations, just return the result from the collection.


    var chooseReturnValueFromCollectionResult = function (result) {
      if (doc._id) {
        return doc._id;
      } // XXX what is this for??
      // It's some iteraction between the callback to _callMutatorMethod and
      // the return value conversion


      doc._id = result;
      return result;
    };

    const wrappedCallback = wrapCallback(callback, chooseReturnValueFromCollectionResult);

    if (this._isRemoteCollection()) {
      const result = this._callMutatorMethod("insert", [doc], wrappedCallback);

      return chooseReturnValueFromCollectionResult(result);
    } // it's my collection.  descend into the collection object
    // and propagate any exception.


    try {
      // If the user provided a callback and the collection implements this
      // operation asynchronously, then queryRet will be undefined, and the
      // result will be returned through the callback instead.
      const result = this._collection.insert(doc, wrappedCallback);

      return chooseReturnValueFromCollectionResult(result);
    } catch (e) {
      if (callback) {
        callback(e);
        return null;
      }

      throw e;
    }
  },

  /**
   * @summary Modify one or more documents in the collection. Returns the number of matched documents.
   * @locus Anywhere
   * @method update
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} selector Specifies which documents to modify
   * @param {MongoModifier} modifier Specifies how to modify the documents
   * @param {Object} [options]
   * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
   * @param {Boolean} options.upsert True to insert a document if no matching documents are found.
   * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the number of affected documents as the second.
   */
  update(selector, modifier, ...optionsAndCallback) {
    const callback = popCallbackFromArgs(optionsAndCallback); // We've already popped off the callback, so we are left with an array
    // of one or zero items

    const options = (0, _objectSpread2.default)({}, optionsAndCallback[0] || null);
    let insertedId;

    if (options && options.upsert) {
      // set `insertedId` if absent.  `insertedId` is a Meteor extension.
      if (options.insertedId) {
        if (!(typeof options.insertedId === 'string' || options.insertedId instanceof Mongo.ObjectID)) throw new Error("insertedId must be string or ObjectID");
        insertedId = options.insertedId;
      } else if (!selector || !selector._id) {
        insertedId = this._makeNewID();
        options.generatedId = true;
        options.insertedId = insertedId;
      }
    }

    selector = Mongo.Collection._rewriteSelector(selector, {
      fallbackId: insertedId
    });
    const wrappedCallback = wrapCallback(callback);

    if (this._isRemoteCollection()) {
      const args = [selector, modifier, options];
      return this._callMutatorMethod("update", args, wrappedCallback);
    } // it's my collection.  descend into the collection object
    // and propagate any exception.


    try {
      // If the user provided a callback and the collection implements this
      // operation asynchronously, then queryRet will be undefined, and the
      // result will be returned through the callback instead.
      return this._collection.update(selector, modifier, options, wrappedCallback);
    } catch (e) {
      if (callback) {
        callback(e);
        return null;
      }

      throw e;
    }
  },

  /**
   * @summary Remove documents from the collection
   * @locus Anywhere
   * @method remove
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} selector Specifies which documents to remove
   * @param {Function} [callback] Optional.  If present, called with an error object as its argument.
   */
  remove(selector, callback) {
    selector = Mongo.Collection._rewriteSelector(selector);
    const wrappedCallback = wrapCallback(callback);

    if (this._isRemoteCollection()) {
      return this._callMutatorMethod("remove", [selector], wrappedCallback);
    } // it's my collection.  descend into the collection object
    // and propagate any exception.


    try {
      // If the user provided a callback and the collection implements this
      // operation asynchronously, then queryRet will be undefined, and the
      // result will be returned through the callback instead.
      return this._collection.remove(selector, wrappedCallback);
    } catch (e) {
      if (callback) {
        callback(e);
        return null;
      }

      throw e;
    }
  },

  // Determine if this collection is simply a minimongo representation of a real
  // database on another server
  _isRemoteCollection() {
    // XXX see #MeteorServerNull
    return this._connection && this._connection !== Meteor.server;
  },

  /**
   * @summary Modify one or more documents in the collection, or insert one if no matching documents were found. Returns an object with keys `numberAffected` (the number of documents modified)  and `insertedId` (the unique _id of the document that was inserted, if any).
   * @locus Anywhere
   * @method upsert
   * @memberof Mongo.Collection
   * @instance
   * @param {MongoSelector} selector Specifies which documents to modify
   * @param {MongoModifier} modifier Specifies how to modify the documents
   * @param {Object} [options]
   * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
   * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the number of affected documents as the second.
   */
  upsert(selector, modifier, options, callback) {
    if (!callback && typeof options === "function") {
      callback = options;
      options = {};
    }

    return this.update(selector, modifier, (0, _objectSpread2.default)({}, options, {
      _returnObject: true,
      upsert: true
    }), callback);
  },

  // We'll actually design an index API later. For now, we just pass through to
  // Mongo's, but make it synchronous.
  _ensureIndex(index, options) {
    var self = this;
    if (!self._collection._ensureIndex) throw new Error("Can only call _ensureIndex on server collections");

    self._collection._ensureIndex(index, options);
  },

  _dropIndex(index) {
    var self = this;
    if (!self._collection._dropIndex) throw new Error("Can only call _dropIndex on server collections");

    self._collection._dropIndex(index);
  },

  _dropCollection() {
    var self = this;
    if (!self._collection.dropCollection) throw new Error("Can only call _dropCollection on server collections");

    self._collection.dropCollection();
  },

  _createCappedCollection(byteSize, maxDocuments) {
    var self = this;
    if (!self._collection._createCappedCollection) throw new Error("Can only call _createCappedCollection on server collections");

    self._collection._createCappedCollection(byteSize, maxDocuments);
  },

  /**
   * @summary Returns the [`Collection`](http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html) object corresponding to this collection from the [npm `mongodb` driver module](https://www.npmjs.com/package/mongodb) which is wrapped by `Mongo.Collection`.
   * @locus Server
   */
  rawCollection() {
    var self = this;

    if (!self._collection.rawCollection) {
      throw new Error("Can only call rawCollection on server collections");
    }

    return self._collection.rawCollection();
  },

  /**
   * @summary Returns the [`Db`](http://mongodb.github.io/node-mongodb-native/2.2/api/Db.html) object corresponding to this collection's database connection from the [npm `mongodb` driver module](https://www.npmjs.com/package/mongodb) which is wrapped by `Mongo.Collection`.
   * @locus Server
   */
  rawDatabase() {
    var self = this;

    if (!(self._driver.mongo && self._driver.mongo.db)) {
      throw new Error("Can only call rawDatabase on server collections");
    }

    return self._driver.mongo.db;
  }

}); // Convert the callback to not return a result if there is an error

function wrapCallback(callback, convertResult) {
  return callback && function (error, result) {
    if (error) {
      callback(error);
    } else if (typeof convertResult === "function") {
      callback(null, convertResult(result));
    } else {
      callback(null, result);
    }
  };
}
/**
 * @summary Create a Mongo-style `ObjectID`.  If you don't specify a `hexString`, the `ObjectID` will generated randomly (not using MongoDB's ID construction rules).
 * @locus Anywhere
 * @class
 * @param {String} [hexString] Optional.  The 24-character hexadecimal contents of the ObjectID to create
 */


Mongo.ObjectID = MongoID.ObjectID;
/**
 * @summary To create a cursor, use find. To access the documents in a cursor, use forEach, map, or fetch.
 * @class
 * @instanceName cursor
 */

Mongo.Cursor = LocalCollection.Cursor;
/**
 * @deprecated in 0.9.1
 */

Mongo.Collection.Cursor = Mongo.Cursor;
/**
 * @deprecated in 0.9.1
 */

Mongo.Collection.ObjectID = Mongo.ObjectID;
/**
 * @deprecated in 0.9.1
 */

Meteor.Collection = Mongo.Collection; // Allow deny stuff is now in the allow-deny package

Object.assign(Meteor.Collection.prototype, AllowDeny.CollectionPrototype);

function popCallbackFromArgs(args) {
  // Pull off any callback (or perhaps a 'callback' variable that was passed
  // in undefined, like how 'upsert' does it).
  if (args.length && (args[args.length - 1] === undefined || args[args.length - 1] instanceof Function)) {
    return args.pop();
  }
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"connection_options.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/connection_options.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * @summary Allows for user specified connection options
 * @example http://mongodb.github.io/node-mongodb-native/2.2/reference/connecting/connection-settings/
 * @locus Server
 * @param {Object} options User specified Mongo connection options
 */
Mongo.setConnectionOptions = function setConnectionOptions(options) {
  check(options, Object);
  Mongo._connectionOptions = options;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/mongo/mongo_driver.js");
require("/node_modules/meteor/mongo/oplog_tailing.js");
require("/node_modules/meteor/mongo/observe_multiplex.js");
require("/node_modules/meteor/mongo/doc_fetcher.js");
require("/node_modules/meteor/mongo/polling_observe_driver.js");
require("/node_modules/meteor/mongo/oplog_observe_driver.js");
require("/node_modules/meteor/mongo/local_collection_driver.js");
require("/node_modules/meteor/mongo/remote_collection_driver.js");
require("/node_modules/meteor/mongo/collection.js");
require("/node_modules/meteor/mongo/connection_options.js");

/* Exports */
Package._define("mongo", {
  MongoInternals: MongoInternals,
  MongoTest: MongoTest,
  Mongo: Mongo
});

})();

//# sourceURL=meteor://💻app/packages/mongo.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vbW9uZ29fZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9vcGxvZ190YWlsaW5nLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9vYnNlcnZlX211bHRpcGxleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vZG9jX2ZldGNoZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL3BvbGxpbmdfb2JzZXJ2ZV9kcml2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL29wbG9nX29ic2VydmVfZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9sb2NhbF9jb2xsZWN0aW9uX2RyaXZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vcmVtb3RlX2NvbGxlY3Rpb25fZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9jb2xsZWN0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9jb25uZWN0aW9uX29wdGlvbnMuanMiXSwibmFtZXMiOlsiTW9uZ29EQiIsIk5wbU1vZHVsZU1vbmdvZGIiLCJGdXR1cmUiLCJOcG0iLCJyZXF1aXJlIiwiTW9uZ29JbnRlcm5hbHMiLCJNb25nb1Rlc3QiLCJOcG1Nb2R1bGVzIiwibW9uZ29kYiIsInZlcnNpb24iLCJOcG1Nb2R1bGVNb25nb2RiVmVyc2lvbiIsIm1vZHVsZSIsIk5wbU1vZHVsZSIsInJlcGxhY2VOYW1lcyIsImZpbHRlciIsInRoaW5nIiwiXyIsImlzQXJyYXkiLCJtYXAiLCJiaW5kIiwicmV0IiwiZWFjaCIsInZhbHVlIiwia2V5IiwiVGltZXN0YW1wIiwicHJvdG90eXBlIiwiY2xvbmUiLCJtYWtlTW9uZ29MZWdhbCIsIm5hbWUiLCJ1bm1ha2VNb25nb0xlZ2FsIiwic3Vic3RyIiwicmVwbGFjZU1vbmdvQXRvbVdpdGhNZXRlb3IiLCJkb2N1bWVudCIsIkJpbmFyeSIsImJ1ZmZlciIsIlVpbnQ4QXJyYXkiLCJPYmplY3RJRCIsIk1vbmdvIiwidG9IZXhTdHJpbmciLCJzaXplIiwiRUpTT04iLCJmcm9tSlNPTlZhbHVlIiwidW5kZWZpbmVkIiwicmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28iLCJpc0JpbmFyeSIsIkJ1ZmZlciIsImZyb20iLCJfaXNDdXN0b21UeXBlIiwidG9KU09OVmFsdWUiLCJyZXBsYWNlVHlwZXMiLCJhdG9tVHJhbnNmb3JtZXIiLCJyZXBsYWNlZFRvcExldmVsQXRvbSIsInZhbCIsInZhbFJlcGxhY2VkIiwiTW9uZ29Db25uZWN0aW9uIiwidXJsIiwib3B0aW9ucyIsInNlbGYiLCJfb2JzZXJ2ZU11bHRpcGxleGVycyIsIl9vbkZhaWxvdmVySG9vayIsIkhvb2siLCJtb25nb09wdGlvbnMiLCJPYmplY3QiLCJhc3NpZ24iLCJhdXRvUmVjb25uZWN0IiwicmVjb25uZWN0VHJpZXMiLCJJbmZpbml0eSIsImlnbm9yZVVuZGVmaW5lZCIsIl9jb25uZWN0aW9uT3B0aW9ucyIsInRlc3QiLCJuYXRpdmVfcGFyc2VyIiwiaGFzIiwicG9vbFNpemUiLCJkYiIsIl9wcmltYXJ5IiwiX29wbG9nSGFuZGxlIiwiX2RvY0ZldGNoZXIiLCJjb25uZWN0RnV0dXJlIiwiY29ubmVjdCIsIk1ldGVvciIsImJpbmRFbnZpcm9ubWVudCIsImVyciIsImNsaWVudCIsInNlcnZlckNvbmZpZyIsImlzTWFzdGVyRG9jIiwicHJpbWFyeSIsIm9uIiwia2luZCIsImRvYyIsImNhbGxiYWNrIiwibWUiLCJyZXNvbHZlciIsIndhaXQiLCJvcGxvZ1VybCIsIlBhY2thZ2UiLCJPcGxvZ0hhbmRsZSIsImRhdGFiYXNlTmFtZSIsIkRvY0ZldGNoZXIiLCJjbG9zZSIsIkVycm9yIiwib3Bsb2dIYW5kbGUiLCJzdG9wIiwid3JhcCIsInJhd0NvbGxlY3Rpb24iLCJjb2xsZWN0aW9uTmFtZSIsImZ1dHVyZSIsImNvbGxlY3Rpb24iLCJfY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbiIsImJ5dGVTaXplIiwibWF4RG9jdW1lbnRzIiwiY3JlYXRlQ29sbGVjdGlvbiIsImNhcHBlZCIsIm1heCIsIl9tYXliZUJlZ2luV3JpdGUiLCJmZW5jZSIsIkREUFNlcnZlciIsIl9DdXJyZW50V3JpdGVGZW5jZSIsImdldCIsImJlZ2luV3JpdGUiLCJjb21taXR0ZWQiLCJfb25GYWlsb3ZlciIsInJlZ2lzdGVyIiwid3JpdGVDYWxsYmFjayIsIndyaXRlIiwicmVmcmVzaCIsInJlc3VsdCIsInJlZnJlc2hFcnIiLCJiaW5kRW52aXJvbm1lbnRGb3JXcml0ZSIsIl9pbnNlcnQiLCJjb2xsZWN0aW9uX25hbWUiLCJzZW5kRXJyb3IiLCJlIiwiX2V4cGVjdGVkQnlUZXN0IiwiTG9jYWxDb2xsZWN0aW9uIiwiX2lzUGxhaW5PYmplY3QiLCJpZCIsIl9pZCIsImluc2VydCIsInNhZmUiLCJfcmVmcmVzaCIsInNlbGVjdG9yIiwicmVmcmVzaEtleSIsInNwZWNpZmljSWRzIiwiX2lkc01hdGNoZWRCeVNlbGVjdG9yIiwiZXh0ZW5kIiwiX3JlbW92ZSIsIndyYXBwZWRDYWxsYmFjayIsImRyaXZlclJlc3VsdCIsInRyYW5zZm9ybVJlc3VsdCIsIm51bWJlckFmZmVjdGVkIiwicmVtb3ZlIiwiX2Ryb3BDb2xsZWN0aW9uIiwiY2IiLCJkcm9wQ29sbGVjdGlvbiIsImRyb3AiLCJfZHJvcERhdGFiYXNlIiwiZHJvcERhdGFiYXNlIiwiX3VwZGF0ZSIsIm1vZCIsIkZ1bmN0aW9uIiwibW9uZ29PcHRzIiwidXBzZXJ0IiwibXVsdGkiLCJmdWxsUmVzdWx0IiwibW9uZ29TZWxlY3RvciIsIm1vbmdvTW9kIiwiaXNNb2RpZnkiLCJfaXNNb2RpZmljYXRpb25Nb2QiLCJfZm9yYmlkUmVwbGFjZSIsImtub3duSWQiLCJuZXdEb2MiLCJfY3JlYXRlVXBzZXJ0RG9jdW1lbnQiLCJpbnNlcnRlZElkIiwiZ2VuZXJhdGVkSWQiLCJzaW11bGF0ZVVwc2VydFdpdGhJbnNlcnRlZElkIiwiZXJyb3IiLCJfcmV0dXJuT2JqZWN0IiwiaGFzT3duUHJvcGVydHkiLCIkc2V0T25JbnNlcnQiLCJ1cGRhdGUiLCJtZXRlb3JSZXN1bHQiLCJtb25nb1Jlc3VsdCIsInVwc2VydGVkIiwibGVuZ3RoIiwibiIsIk5VTV9PUFRJTUlTVElDX1RSSUVTIiwiX2lzQ2Fubm90Q2hhbmdlSWRFcnJvciIsImVycm1zZyIsImluZGV4T2YiLCJtb25nb09wdHNGb3JVcGRhdGUiLCJtb25nb09wdHNGb3JJbnNlcnQiLCJyZXBsYWNlbWVudFdpdGhJZCIsInRyaWVzIiwiZG9VcGRhdGUiLCJkb0NvbmRpdGlvbmFsSW5zZXJ0IiwibWV0aG9kIiwid3JhcEFzeW5jIiwiYXBwbHkiLCJhcmd1bWVudHMiLCJmaW5kIiwiQ3Vyc29yIiwiQ3Vyc29yRGVzY3JpcHRpb24iLCJmaW5kT25lIiwibGltaXQiLCJmZXRjaCIsIl9lbnN1cmVJbmRleCIsImluZGV4IiwiaW5kZXhOYW1lIiwiZW5zdXJlSW5kZXgiLCJfZHJvcEluZGV4IiwiZHJvcEluZGV4IiwiQ29sbGVjdGlvbiIsIl9yZXdyaXRlU2VsZWN0b3IiLCJtb25nbyIsImN1cnNvckRlc2NyaXB0aW9uIiwiX21vbmdvIiwiX2N1cnNvckRlc2NyaXB0aW9uIiwiX3N5bmNocm9ub3VzQ3Vyc29yIiwiU3ltYm9sIiwiaXRlcmF0b3IiLCJ0YWlsYWJsZSIsIl9jcmVhdGVTeW5jaHJvbm91c0N1cnNvciIsInNlbGZGb3JJdGVyYXRpb24iLCJ1c2VUcmFuc2Zvcm0iLCJyZXdpbmQiLCJnZXRUcmFuc2Zvcm0iLCJ0cmFuc2Zvcm0iLCJfcHVibGlzaEN1cnNvciIsInN1YiIsIl9nZXRDb2xsZWN0aW9uTmFtZSIsIm9ic2VydmUiLCJjYWxsYmFja3MiLCJfb2JzZXJ2ZUZyb21PYnNlcnZlQ2hhbmdlcyIsIm9ic2VydmVDaGFuZ2VzIiwibWV0aG9kcyIsIm9yZGVyZWQiLCJfb2JzZXJ2ZUNoYW5nZXNDYWxsYmFja3NBcmVPcmRlcmVkIiwiZXhjZXB0aW9uTmFtZSIsImZvckVhY2giLCJfb2JzZXJ2ZUNoYW5nZXMiLCJwaWNrIiwiY3Vyc29yT3B0aW9ucyIsInNvcnQiLCJza2lwIiwicHJvamVjdGlvbiIsImZpZWxkcyIsImF3YWl0ZGF0YSIsIm51bWJlck9mUmV0cmllcyIsIk9QTE9HX0NPTExFQ1RJT04iLCJ0cyIsIm9wbG9nUmVwbGF5IiwiZGJDdXJzb3IiLCJtYXhUaW1lTXMiLCJtYXhUaW1lTVMiLCJoaW50IiwiU3luY2hyb25vdXNDdXJzb3IiLCJfZGJDdXJzb3IiLCJfc2VsZkZvckl0ZXJhdGlvbiIsIl90cmFuc2Zvcm0iLCJ3cmFwVHJhbnNmb3JtIiwiX3N5bmNocm9ub3VzQ291bnQiLCJjb3VudCIsIl92aXNpdGVkSWRzIiwiX0lkTWFwIiwiX3Jhd05leHRPYmplY3RQcm9taXNlIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJuZXh0IiwiX25leHRPYmplY3RQcm9taXNlIiwic2V0IiwiX25leHRPYmplY3RQcm9taXNlV2l0aFRpbWVvdXQiLCJ0aW1lb3V0TVMiLCJuZXh0T2JqZWN0UHJvbWlzZSIsInRpbWVvdXRFcnIiLCJ0aW1lb3V0UHJvbWlzZSIsInRpbWVyIiwic2V0VGltZW91dCIsInJhY2UiLCJjYXRjaCIsIl9uZXh0T2JqZWN0IiwiYXdhaXQiLCJ0aGlzQXJnIiwiX3Jld2luZCIsImNhbGwiLCJyZXMiLCJwdXNoIiwiaWRlbnRpdHkiLCJhcHBseVNraXBMaW1pdCIsImdldFJhd09iamVjdHMiLCJyZXN1bHRzIiwiZG9uZSIsInRhaWwiLCJkb2NDYWxsYmFjayIsImN1cnNvciIsInN0b3BwZWQiLCJsYXN0VFMiLCJsb29wIiwibmV3U2VsZWN0b3IiLCIkZ3QiLCJkZWZlciIsIl9vYnNlcnZlQ2hhbmdlc1RhaWxhYmxlIiwib2JzZXJ2ZUtleSIsInN0cmluZ2lmeSIsIm11bHRpcGxleGVyIiwib2JzZXJ2ZURyaXZlciIsImZpcnN0SGFuZGxlIiwiX25vWWllbGRzQWxsb3dlZCIsIk9ic2VydmVNdWx0aXBsZXhlciIsIm9uU3RvcCIsIm9ic2VydmVIYW5kbGUiLCJPYnNlcnZlSGFuZGxlIiwibWF0Y2hlciIsInNvcnRlciIsImNhblVzZU9wbG9nIiwiYWxsIiwiX3Rlc3RPbmx5UG9sbENhbGxiYWNrIiwiTWluaW1vbmdvIiwiTWF0Y2hlciIsIk9wbG9nT2JzZXJ2ZURyaXZlciIsImN1cnNvclN1cHBvcnRlZCIsIlNvcnRlciIsImYiLCJkcml2ZXJDbGFzcyIsIlBvbGxpbmdPYnNlcnZlRHJpdmVyIiwibW9uZ29IYW5kbGUiLCJfb2JzZXJ2ZURyaXZlciIsImFkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkcyIsImxpc3RlbkFsbCIsImxpc3RlbkNhbGxiYWNrIiwibGlzdGVuZXJzIiwiZm9yRWFjaFRyaWdnZXIiLCJ0cmlnZ2VyIiwiX0ludmFsaWRhdGlvbkNyb3NzYmFyIiwibGlzdGVuIiwibGlzdGVuZXIiLCJ0cmlnZ2VyQ2FsbGJhY2siLCJhZGRlZEJlZm9yZSIsImFkZGVkIiwiTW9uZ29UaW1lc3RhbXAiLCJDb25uZWN0aW9uIiwiVE9PX0ZBUl9CRUhJTkQiLCJwcm9jZXNzIiwiZW52IiwiTUVURU9SX09QTE9HX1RPT19GQVJfQkVISU5EIiwiVEFJTF9USU1FT1VUIiwiTUVURU9SX09QTE9HX1RBSUxfVElNRU9VVCIsInNob3dUUyIsImdldEhpZ2hCaXRzIiwiZ2V0TG93Qml0cyIsImlkRm9yT3AiLCJvcCIsIm8iLCJvMiIsImRiTmFtZSIsIl9vcGxvZ1VybCIsIl9kYk5hbWUiLCJfb3Bsb2dMYXN0RW50cnlDb25uZWN0aW9uIiwiX29wbG9nVGFpbENvbm5lY3Rpb24iLCJfc3RvcHBlZCIsIl90YWlsSGFuZGxlIiwiX3JlYWR5RnV0dXJlIiwiX2Nyb3NzYmFyIiwiX0Nyb3NzYmFyIiwiZmFjdFBhY2thZ2UiLCJmYWN0TmFtZSIsIl9iYXNlT3Bsb2dTZWxlY3RvciIsIm5zIiwiUmVnRXhwIiwiX2VzY2FwZVJlZ0V4cCIsIiRvciIsIiRpbiIsIiRleGlzdHMiLCJfY2F0Y2hpbmdVcEZ1dHVyZXMiLCJfbGFzdFByb2Nlc3NlZFRTIiwiX29uU2tpcHBlZEVudHJpZXNIb29rIiwiZGVidWdQcmludEV4Y2VwdGlvbnMiLCJfZW50cnlRdWV1ZSIsIl9Eb3VibGVFbmRlZFF1ZXVlIiwiX3dvcmtlckFjdGl2ZSIsIl9zdGFydFRhaWxpbmciLCJvbk9wbG9nRW50cnkiLCJvcmlnaW5hbENhbGxiYWNrIiwibm90aWZpY2F0aW9uIiwiX2RlYnVnIiwibGlzdGVuSGFuZGxlIiwib25Ta2lwcGVkRW50cmllcyIsIndhaXRVbnRpbENhdWdodFVwIiwibGFzdEVudHJ5IiwiJG5hdHVyYWwiLCJfc2xlZXBGb3JNcyIsImxlc3NUaGFuT3JFcXVhbCIsImluc2VydEFmdGVyIiwiZ3JlYXRlclRoYW4iLCJzcGxpY2UiLCJtb25nb2RiVXJpIiwicGFyc2UiLCJkYXRhYmFzZSIsImFkbWluIiwiY29tbWFuZCIsImlzbWFzdGVyIiwic2V0TmFtZSIsImxhc3RPcGxvZ0VudHJ5Iiwib3Bsb2dTZWxlY3RvciIsIl9tYXliZVN0YXJ0V29ya2VyIiwicmV0dXJuIiwiaXNFbXB0eSIsInBvcCIsImNsZWFyIiwiX3NldExhc3RQcm9jZXNzZWRUUyIsInNoaWZ0IiwiSlNPTiIsImZpcmUiLCJzZXF1ZW5jZXIiLCJfZGVmaW5lVG9vRmFyQmVoaW5kIiwiX3Jlc2V0VG9vRmFyQmVoaW5kIiwiRmFjdHMiLCJpbmNyZW1lbnRTZXJ2ZXJGYWN0IiwiX29yZGVyZWQiLCJfb25TdG9wIiwiX3F1ZXVlIiwiX1N5bmNocm9ub3VzUXVldWUiLCJfaGFuZGxlcyIsIl9jYWNoZSIsIl9DYWNoaW5nQ2hhbmdlT2JzZXJ2ZXIiLCJfYWRkSGFuZGxlVGFza3NTY2hlZHVsZWRCdXROb3RQZXJmb3JtZWQiLCJjYWxsYmFja05hbWVzIiwiY2FsbGJhY2tOYW1lIiwiX2FwcGx5Q2FsbGJhY2siLCJ0b0FycmF5IiwiaGFuZGxlIiwic2FmZVRvUnVuVGFzayIsInJ1blRhc2siLCJfc2VuZEFkZHMiLCJyZW1vdmVIYW5kbGUiLCJfcmVhZHkiLCJfc3RvcCIsImZyb21RdWVyeUVycm9yIiwicmVhZHkiLCJxdWV1ZVRhc2siLCJxdWVyeUVycm9yIiwidGhyb3ciLCJvbkZsdXNoIiwiaXNSZXNvbHZlZCIsImFyZ3MiLCJhcHBseUNoYW5nZSIsImtleXMiLCJoYW5kbGVJZCIsImFkZCIsIl9hZGRlZEJlZm9yZSIsIl9hZGRlZCIsImRvY3MiLCJuZXh0T2JzZXJ2ZUhhbmRsZUlkIiwiX211bHRpcGxleGVyIiwiYmVmb3JlIiwiRmliZXIiLCJtb25nb0Nvbm5lY3Rpb24iLCJfbW9uZ29Db25uZWN0aW9uIiwiX2NhbGxiYWNrc0ZvckNhY2hlS2V5IiwiY2FjaGVLZXkiLCJjaGVjayIsIlN0cmluZyIsImNsb25lZERvYyIsInJ1biIsIl9tb25nb0hhbmRsZSIsIl9zdG9wQ2FsbGJhY2tzIiwiX3Jlc3VsdHMiLCJfcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkIiwiX3BlbmRpbmdXcml0ZXMiLCJfZW5zdXJlUG9sbElzU2NoZWR1bGVkIiwidGhyb3R0bGUiLCJfdW50aHJvdHRsZWRFbnN1cmVQb2xsSXNTY2hlZHVsZWQiLCJwb2xsaW5nVGhyb3R0bGVNcyIsIl90YXNrUXVldWUiLCJsaXN0ZW5lcnNIYW5kbGUiLCJwb2xsaW5nSW50ZXJ2YWwiLCJwb2xsaW5nSW50ZXJ2YWxNcyIsIl9wb2xsaW5nSW50ZXJ2YWwiLCJpbnRlcnZhbEhhbmRsZSIsInNldEludGVydmFsIiwiY2xlYXJJbnRlcnZhbCIsIl9wb2xsTW9uZ28iLCJfc3VzcGVuZFBvbGxpbmciLCJfcmVzdW1lUG9sbGluZyIsImZpcnN0IiwibmV3UmVzdWx0cyIsIm9sZFJlc3VsdHMiLCJ3cml0ZXNGb3JDeWNsZSIsImNvZGUiLCJtZXNzYWdlIiwiQXJyYXkiLCJfZGlmZlF1ZXJ5Q2hhbmdlcyIsInciLCJjIiwiUEhBU0UiLCJRVUVSWUlORyIsIkZFVENISU5HIiwiU1RFQURZIiwiU3dpdGNoZWRUb1F1ZXJ5IiwiZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkiLCJjdXJyZW50SWQiLCJfdXNlc09wbG9nIiwiY29tcGFyYXRvciIsImdldENvbXBhcmF0b3IiLCJoZWFwT3B0aW9ucyIsIklkTWFwIiwiX2xpbWl0IiwiX2NvbXBhcmF0b3IiLCJfc29ydGVyIiwiX3VucHVibGlzaGVkQnVmZmVyIiwiTWluTWF4SGVhcCIsIl9wdWJsaXNoZWQiLCJNYXhIZWFwIiwiX3NhZmVBcHBlbmRUb0J1ZmZlciIsIl9zdG9wSGFuZGxlcyIsIl9yZWdpc3RlclBoYXNlQ2hhbmdlIiwiX21hdGNoZXIiLCJfcHJvamVjdGlvbkZuIiwiX2NvbXBpbGVQcm9qZWN0aW9uIiwiX3NoYXJlZFByb2plY3Rpb24iLCJjb21iaW5lSW50b1Byb2plY3Rpb24iLCJfc2hhcmVkUHJvamVjdGlvbkZuIiwiX25lZWRUb0ZldGNoIiwiX2N1cnJlbnRseUZldGNoaW5nIiwiX2ZldGNoR2VuZXJhdGlvbiIsIl9yZXF1ZXJ5V2hlbkRvbmVUaGlzUXVlcnkiLCJfd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeSIsIl9uZWVkVG9Qb2xsUXVlcnkiLCJfcGhhc2UiLCJfaGFuZGxlT3Bsb2dFbnRyeVF1ZXJ5aW5nIiwiX2hhbmRsZU9wbG9nRW50cnlTdGVhZHlPckZldGNoaW5nIiwiZmlyZWQiLCJfb3Bsb2dPYnNlcnZlRHJpdmVycyIsIm9uQmVmb3JlRmlyZSIsImRyaXZlcnMiLCJkcml2ZXIiLCJfcnVuSW5pdGlhbFF1ZXJ5IiwiX2FkZFB1Ymxpc2hlZCIsIm92ZXJmbG93aW5nRG9jSWQiLCJtYXhFbGVtZW50SWQiLCJvdmVyZmxvd2luZ0RvYyIsImVxdWFscyIsInJlbW92ZWQiLCJfYWRkQnVmZmVyZWQiLCJfcmVtb3ZlUHVibGlzaGVkIiwiZW1wdHkiLCJuZXdEb2NJZCIsIm1pbkVsZW1lbnRJZCIsIl9yZW1vdmVCdWZmZXJlZCIsIl9jaGFuZ2VQdWJsaXNoZWQiLCJvbGREb2MiLCJwcm9qZWN0ZWROZXciLCJwcm9qZWN0ZWRPbGQiLCJjaGFuZ2VkIiwiRGlmZlNlcXVlbmNlIiwibWFrZUNoYW5nZWRGaWVsZHMiLCJtYXhCdWZmZXJlZElkIiwiX2FkZE1hdGNoaW5nIiwibWF4UHVibGlzaGVkIiwibWF4QnVmZmVyZWQiLCJ0b1B1Ymxpc2giLCJjYW5BcHBlbmRUb0J1ZmZlciIsImNhbkluc2VydEludG9CdWZmZXIiLCJ0b0J1ZmZlciIsIl9yZW1vdmVNYXRjaGluZyIsIl9oYW5kbGVEb2MiLCJtYXRjaGVzTm93IiwiZG9jdW1lbnRNYXRjaGVzIiwicHVibGlzaGVkQmVmb3JlIiwiYnVmZmVyZWRCZWZvcmUiLCJjYWNoZWRCZWZvcmUiLCJtaW5CdWZmZXJlZCIsInN0YXlzSW5QdWJsaXNoZWQiLCJzdGF5c0luQnVmZmVyIiwiX2ZldGNoTW9kaWZpZWREb2N1bWVudHMiLCJ0aGlzR2VuZXJhdGlvbiIsIndhaXRpbmciLCJmdXQiLCJfYmVTdGVhZHkiLCJ3cml0ZXMiLCJ0b1N0cmluZyIsImlzUmVwbGFjZSIsImNhbkRpcmVjdGx5TW9kaWZ5RG9jIiwibW9kaWZpZXJDYW5CZURpcmVjdGx5QXBwbGllZCIsIl9tb2RpZnkiLCJjYW5CZWNvbWVUcnVlQnlNb2RpZmllciIsImFmZmVjdGVkQnlNb2RpZmllciIsIl9ydW5RdWVyeSIsImluaXRpYWwiLCJfZG9uZVF1ZXJ5aW5nIiwiX3BvbGxRdWVyeSIsIm5ld0J1ZmZlciIsIl9jdXJzb3JGb3JRdWVyeSIsImkiLCJfcHVibGlzaE5ld1Jlc3VsdHMiLCJvcHRpb25zT3ZlcndyaXRlIiwiZGVzY3JpcHRpb24iLCJpZHNUb1JlbW92ZSIsIl9vcGxvZ0VudHJ5SGFuZGxlIiwiX2xpc3RlbmVyc0hhbmRsZSIsInBoYXNlIiwibm93IiwiRGF0ZSIsInRpbWVEaWZmIiwiX3BoYXNlU3RhcnRUaW1lIiwiZGlzYWJsZU9wbG9nIiwiX2Rpc2FibGVPcGxvZyIsIl9jaGVja1N1cHBvcnRlZFByb2plY3Rpb24iLCJoYXNXaGVyZSIsImhhc0dlb1F1ZXJ5IiwibW9kaWZpZXIiLCJvcGVyYXRpb24iLCJmaWVsZCIsImV4cG9ydCIsIkxvY2FsQ29sbGVjdGlvbkRyaXZlciIsImNvbnN0cnVjdG9yIiwibm9Db25uQ29sbGVjdGlvbnMiLCJjcmVhdGUiLCJvcGVuIiwiY29ubiIsImVuc3VyZUNvbGxlY3Rpb24iLCJfbW9uZ29fbGl2ZWRhdGFfY29sbGVjdGlvbnMiLCJjb2xsZWN0aW9ucyIsIlJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIiLCJtb25nb191cmwiLCJtIiwiZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIiLCJvbmNlIiwiY29ubmVjdGlvbk9wdGlvbnMiLCJtb25nb1VybCIsIk1PTkdPX1VSTCIsIk1PTkdPX09QTE9HX1VSTCIsImNvbm5lY3Rpb24iLCJtYW5hZ2VyIiwiaWRHZW5lcmF0aW9uIiwiX2RyaXZlciIsIl9wcmV2ZW50QXV0b3B1Ymxpc2giLCJfbWFrZU5ld0lEIiwic3JjIiwiRERQIiwicmFuZG9tU3RyZWFtIiwiUmFuZG9tIiwiaW5zZWN1cmUiLCJoZXhTdHJpbmciLCJfY29ubmVjdGlvbiIsImlzQ2xpZW50Iiwic2VydmVyIiwiX2NvbGxlY3Rpb24iLCJfbmFtZSIsIl9tYXliZVNldFVwUmVwbGljYXRpb24iLCJkZWZpbmVNdXRhdGlvbk1ldGhvZHMiLCJfZGVmaW5lTXV0YXRpb25NZXRob2RzIiwidXNlRXhpc3RpbmciLCJfc3VwcHJlc3NTYW1lTmFtZUVycm9yIiwiYXV0b3B1Ymxpc2giLCJwdWJsaXNoIiwiaXNfYXV0byIsInJlZ2lzdGVyU3RvcmUiLCJvayIsImJlZ2luVXBkYXRlIiwiYmF0Y2hTaXplIiwicmVzZXQiLCJwYXVzZU9ic2VydmVycyIsIm1zZyIsIm1vbmdvSWQiLCJNb25nb0lEIiwiaWRQYXJzZSIsInJlcGxhY2UiLCIkdW5zZXQiLCIkc2V0IiwiZW5kVXBkYXRlIiwicmVzdW1lT2JzZXJ2ZXJzIiwic2F2ZU9yaWdpbmFscyIsInJldHJpZXZlT3JpZ2luYWxzIiwiZ2V0RG9jIiwiX2dldENvbGxlY3Rpb24iLCJjb25zb2xlIiwid2FybiIsImxvZyIsIl9nZXRGaW5kU2VsZWN0b3IiLCJfZ2V0RmluZE9wdGlvbnMiLCJNYXRjaCIsIk9wdGlvbmFsIiwiT2JqZWN0SW5jbHVkaW5nIiwiT25lT2YiLCJOdW1iZXIiLCJmYWxsYmFja0lkIiwiX3NlbGVjdG9ySXNJZCIsImdldFByb3RvdHlwZU9mIiwiZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyIsImdlbmVyYXRlSWQiLCJfaXNSZW1vdGVDb2xsZWN0aW9uIiwiZW5jbG9zaW5nIiwiX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uIiwiY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdCIsIndyYXBDYWxsYmFjayIsIl9jYWxsTXV0YXRvck1ldGhvZCIsIm9wdGlvbnNBbmRDYWxsYmFjayIsInBvcENhbGxiYWNrRnJvbUFyZ3MiLCJyYXdEYXRhYmFzZSIsImNvbnZlcnRSZXN1bHQiLCJBbGxvd0RlbnkiLCJDb2xsZWN0aW9uUHJvdG90eXBlIiwic2V0Q29ubmVjdGlvbk9wdGlvbnMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBOzs7Ozs7OztBQVNBLElBQUlBLFVBQVVDLGdCQUFkOztBQUNBLElBQUlDLFNBQVNDLElBQUlDLE9BQUosQ0FBWSxlQUFaLENBQWI7O0FBRUFDLGlCQUFpQixFQUFqQjtBQUNBQyxZQUFZLEVBQVo7QUFFQUQsZUFBZUUsVUFBZixHQUE0QjtBQUMxQkMsV0FBUztBQUNQQyxhQUFTQyx1QkFERjtBQUVQQyxZQUFRWDtBQUZEO0FBRGlCLENBQTVCLEMsQ0FPQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQUssZUFBZU8sU0FBZixHQUEyQlosT0FBM0IsQyxDQUVBO0FBQ0E7O0FBQ0EsSUFBSWEsZUFBZSxVQUFVQyxNQUFWLEVBQWtCQyxLQUFsQixFQUF5QjtBQUMxQyxNQUFJLE9BQU9BLEtBQVAsS0FBaUIsUUFBakIsSUFBNkJBLFVBQVUsSUFBM0MsRUFBaUQ7QUFDL0MsUUFBSUMsRUFBRUMsT0FBRixDQUFVRixLQUFWLENBQUosRUFBc0I7QUFDcEIsYUFBT0MsRUFBRUUsR0FBRixDQUFNSCxLQUFOLEVBQWFDLEVBQUVHLElBQUYsQ0FBT04sWUFBUCxF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S0EsS0FBS3JRLE1BQUwsR0FBYyxDQUFuQixhQUFpQ3hCLFFBRmxDLENBQUosRUFFaUQ7QUFDL0MsV0FBTzZSLEtBQUtyQyxHQUFMLEVBQVA7QUFDRDtBQUNGLEM7Ozs7Ozs7Ozs7O0FDaHdCRDs7Ozs7O0FBTUFsWCxNQUFNMHBCLG9CQUFOLEdBQTZCLFNBQVNBLG9CQUFULENBQStCdm9CLE9BQS9CLEVBQXdDO0FBQ25Fb1osUUFBTXBaLE9BQU4sRUFBZU0sTUFBZjtBQUNBekIsUUFBTStCLGtCQUFOLEdBQTJCWixPQUEzQjtBQUNELENBSEQsQyIsImZpbGUiOiIvcGFja2FnZXMvbW9uZ28uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFByb3ZpZGUgYSBzeW5jaHJvbm91cyBDb2xsZWN0aW9uIEFQSSB1c2luZyBmaWJlcnMsIGJhY2tlZCBieVxuICogTW9uZ29EQi4gIFRoaXMgaXMgb25seSBmb3IgdXNlIG9uIHRoZSBzZXJ2ZXIsIGFuZCBtb3N0bHkgaWRlbnRpY2FsXG4gKiB0byB0aGUgY2xpZW50IEFQSS5cbiAqXG4gKiBOT1RFOiB0aGUgcHVibGljIEFQSSBtZXRob2RzIG11c3QgYmUgcnVuIHdpdGhpbiBhIGZpYmVyLiBJZiB5b3UgY2FsbFxuICogdGhlc2Ugb3V0c2lkZSBvZiBhIGZpYmVyIHRoZXkgd2lsbCBleHBsb2RlIVxuICovXG5cbnZhciBNb25nb0RCID0gTnBtTW9kdWxlTW9uZ29kYjtcbnZhciBGdXR1cmUgPSBOcG0ucmVxdWlyZSgnZmliZXJzL2Z1dHVyZScpO1xuXG5Nb25nb0ludGVybmFscyA9IHt9O1xuTW9uZ29UZXN0ID0ge307XG5cbk1vbmdvSW50ZXJuYWxzLk5wbU1vZHVsZXMgPSB7XG4gIG1vbmdvZGI6IHtcbiAgICB2ZXJzaW9uOiBOcG1Nb2R1bGVNb25nb2RiVmVyc2lvbixcbiAgICBtb2R1bGU6IE1vbmdvREJcbiAgfVxufTtcblxuLy8gT2xkZXIgdmVyc2lvbiBvZiB3aGF0IGlzIG5vdyBhdmFpbGFibGUgdmlhXG4vLyBNb25nb0ludGVybmFscy5OcG1Nb2R1bGVzLm1vbmdvZGIubW9kdWxlLiAgSXQgd2FzIG5ldmVyIGRvY3VtZW50ZWQsIGJ1dFxuLy8gcGVvcGxlIGRvIHVzZSBpdC5cbi8vIFhYWCBDT01QQVQgV0lUSCAxLjAuMy4yXG5Nb25nb0ludGVybmFscy5OcG1Nb2R1bGUgPSBNb25nb0RCO1xuXG4vLyBUaGlzIGlzIHVzZWQgdG8gYWRkIG9yIHJlbW92ZSBFSlNPTiBmcm9tIHRoZSBiZWdpbm5pbmcgb2YgZXZlcnl0aGluZyBuZXN0ZWRcbi8vIGluc2lkZSBhbiBFSlNPTiBjdXN0b20gdHlwZS4gSXQgc2hvdWxkIG9ubHkgYmUgY2FsbGVkIG9uIHB1cmUgSlNPTiFcbnZhciByZXBsYWNlTmFtZXMgPSBmdW5jdGlvbiAoZmlsdGVyLCB0aGluZykge1xuICBpZiAodHlwZW9mIHRoaW5nID09PSBcIm9iamVjdFwiICYmIHRoaW5nICE9PSBudWxsKSB7XG4gICAgaWYgKF8uaXNBcnJheSh0aGluZykpIHtcbiAgICAgIHJldHVybiBfLm1hcCh0aGluZywgXy5iaW5kKHJlcGxhY2VOYW1lcywgbnVsbCwgZmlsdGVyKSk7XG4gICAgfVxuICAgIHZhciByZXQgPSB7fTtcbiAgICBfLmVhY2godGhpbmcsIGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICByZXRbZmlsdGVyKGtleSldID0gcmVwbGFjZU5hbWVzKGZpbHRlciwgdmFsdWUpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXQ7XG4gIH1cbiAgcmV0dXJuIHRoaW5nO1xufTtcblxuLy8gRW5zdXJlIHRoYXQgRUpTT04uY2xvbmUga2VlcHMgYSBUaW1lc3RhbXAgYXMgYSBUaW1lc3RhbXAgKGluc3RlYWQgb2YganVzdFxuLy8gZG9pbmcgYSBzdHJ1Y3R1cmFsIGNsb25lKS5cbi8vIFhYWCBob3cgb2sgaXMgdGhpcz8gd2hhdCBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgY29waWVzIG9mIE1vbmdvREIgbG9hZGVkP1xuTW9uZ29EQi5UaW1lc3RhbXAucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24gKCkge1xuICAvLyBUaW1lc3RhbXBzIHNob3VsZCBiZSBpbW11dGFibGUuXG4gIHJldHVybiB0aGlzO1xufTtcblxudmFyIG1ha2VNb25nb0xlZ2FsID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFwiRUpTT05cIiArIG5hbWU7IH07XG52YXIgdW5tYWtlTW9uZ29MZWdhbCA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBuYW1lLnN1YnN0cig1KTsgfTtcblxudmFyIHJlcGxhY2VNb25nb0F0b21XaXRoTWV0ZW9yID0gZnVuY3Rpb24gKGRvY3VtZW50KSB7XG4gIGlmIChkb2N1bWVudCBpbnN0YW5jZW9mIE1vbmdvREIuQmluYXJ5KSB7XG4gICAgdmFyIGJ1ZmZlciA9IGRvY3VtZW50LnZhbHVlKHRydWUpO1xuICAgIHJldHVybiBuZXcgVWludDhBcnJheShidWZmZXIpO1xuICB9XG4gIGlmIChkb2N1bWVudCBpbnN0YW5jZW9mIE1vbmdvREIuT2JqZWN0SUQpIHtcbiAgICByZXR1cm4gbmV3IE1vbmdvLk9iamVjdElEKGRvY3VtZW50LnRvSGV4U3RyaW5nKCkpO1xuICB9XG4gIGlmIChkb2N1bWVudFtcIkVKU09OJHR5cGVcIl0gJiYgZG9jdW1lbnRbXCJFSlNPTiR2YWx1ZVwiXSAmJiBfLnNpemUoZG9jdW1lbnQpID09PSAyKSB7XG4gICAgcmV0dXJuIEVKU09OLmZyb21KU09OVmFsdWUocmVwbGFjZU5hbWVzKHVubWFrZU1vbmdvTGVnYWwsIGRvY3VtZW50KSk7XG4gIH1cbiAgaWYgKGRvY3VtZW50IGluc3RhbmNlb2YgTW9uZ29EQi5UaW1lc3RhbXApIHtcbiAgICAvLyBGb3Igbm93LCB0aGUgTWV0ZW9yIHJlcHJlc2VudGF0aW9uIG9mIGEgTW9uZ28gdGltZXN0YW1wIHR5cGUgKG5vdCBhIGRhdGUhXG4gICAgLy8gdGhpcyBpcyBhIHdlaXJkIGludGVybmFsIHRoaW5nIHVzZWQgaW4gdGhlIG9wbG9nISkgaXMgdGhlIHNhbWUgYXMgdGhlXG4gICAgLy8gTW9uZ28gcmVwcmVzZW50YXRpb24uIFdlIG5lZWQgdG8gZG8gdGhpcyBleHBsaWNpdGx5IG9yIGVsc2Ugd2Ugd291bGQgZG8gYVxuICAgIC8vIHN0cnVjdHVyYWwgY2xvbmUgYW5kIGxvc2UgdGhlIHByb3RvdHlwZS5cbiAgICByZXR1cm4gZG9jdW1lbnQ7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn07XG5cbnZhciByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyA9IGZ1bmN0aW9uIChkb2N1bWVudCkge1xuICBpZiAoRUpTT04uaXNCaW5hcnkoZG9jdW1lbnQpKSB7XG4gICAgLy8gVGhpcyBkb2VzIG1vcmUgY29waWVzIHRoYW4gd2UnZCBsaWtlLCBidXQgaXMgbmVjZXNzYXJ5IGJlY2F1c2VcbiAgICAvLyBNb25nb0RCLkJTT04gb25seSBsb29rcyBsaWtlIGl0IHRha2VzIGEgVWludDhBcnJheSAoYW5kIGRvZXNuJ3QgYWN0dWFsbHlcbiAgICAvLyBzZXJpYWxpemUgaXQgY29ycmVjdGx5KS5cbiAgICByZXR1cm4gbmV3IE1vbmdvREIuQmluYXJ5KEJ1ZmZlci5mcm9tKGRvY3VtZW50KSk7XG4gIH1cbiAgaWYgKGRvY3VtZW50IGluc3RhbmNlb2YgTW9uZ28uT2JqZWN0SUQpIHtcbiAgICByZXR1cm4gbmV3IE1vbmdvREIuT2JqZWN0SUQoZG9jdW1lbnQudG9IZXhTdHJpbmcoKSk7XG4gIH1cbiAgaWYgKGRvY3VtZW50IGluc3RhbmNlb2YgTW9uZ29EQi5UaW1lc3RhbXApIHtcbiAgICAvLyBGb3Igbm93LCB0aGUgTWV0ZW9yIHJlcHJlc2VudGF0aW9uIG9mIGEgTW9uZ28gdGltZXN0YW1wIHR5cGUgKG5vdCBhIGRhdGUhXG4gICAgLy8gdGhpcyBpcyBhIHdlaXJkIGludGVybmFsIHRoaW5nIHVzZWQgaW4gdGhlIG9wbG9nISkgaXMgdGhlIHNhbWUgYXMgdGhlXG4gICAgLy8gTW9uZ28gcmVwcmVzZW50YXRpb24uIFdlIG5lZWQgdG8gZG8gdGhpcyBleHBsaWNpdGx5IG9yIGVsc2Ugd2Ugd291bGQgZG8gYVxuICAgIC8vIHN0cnVjdHVyYWwgY2xvbmUgYW5kIGxvc2UgdGhlIHByb3RvdHlwZS5cbiAgICByZXR1cm4gZG9jdW1lbnQ7XG4gIH1cbiAgaWYgKEVKU09OLl9pc0N1c3RvbVR5cGUoZG9jdW1lbnQpKSB7XG4gICAgcmV0dXJuIHJlcGxhY2VOYW1lcyhtYWtlTW9uZ29MZWdhbCwgRUpTT04udG9KU09OVmFsdWUoZG9jdW1lbnQpKTtcbiAgfVxuICAvLyBJdCBpcyBub3Qgb3JkaW5hcmlseSBwb3NzaWJsZSB0byBzdGljayBkb2xsYXItc2lnbiBrZXlzIGludG8gbW9uZ29cbiAgLy8gc28gd2UgZG9uJ3QgYm90aGVyIGNoZWNraW5nIGZvciB0aGluZ3MgdGhhdCBuZWVkIGVzY2FwaW5nIGF0IHRoaXMgdGltZS5cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn07XG5cbnZhciByZXBsYWNlVHlwZXMgPSBmdW5jdGlvbiAoZG9jdW1lbnQsIGF0b21UcmFuc2Zvcm1lcikge1xuICBpZiAodHlwZW9mIGRvY3VtZW50ICE9PSAnb2JqZWN0JyB8fCBkb2N1bWVudCA9PT0gbnVsbClcbiAgICByZXR1cm4gZG9jdW1lbnQ7XG5cbiAgdmFyIHJlcGxhY2VkVG9wTGV2ZWxBdG9tID0gYXRvbVRyYW5zZm9ybWVyKGRvY3VtZW50KTtcbiAgaWYgKHJlcGxhY2VkVG9wTGV2ZWxBdG9tICE9PSB1bmRlZmluZWQpXG4gICAgcmV0dXJuIHJlcGxhY2VkVG9wTGV2ZWxBdG9tO1xuXG4gIHZhciByZXQgPSBkb2N1bWVudDtcbiAgXy5lYWNoKGRvY3VtZW50LCBmdW5jdGlvbiAodmFsLCBrZXkpIHtcbiAgICB2YXIgdmFsUmVwbGFjZWQgPSByZXBsYWNlVHlwZXModmFsLCBhdG9tVHJhbnNmb3JtZXIpO1xuICAgIGlmICh2YWwgIT09IHZhbFJlcGxhY2VkKSB7XG4gICAgICAvLyBMYXp5IGNsb25lLiBTaGFsbG93IGNvcHkuXG4gICAgICBpZiAocmV0ID09PSBkb2N1bWVudClcbiAgICAgICAgcmV0ID0gXy5jbG9uZShkb2N1bWVudCk7XG4gICAgICByZXRba2V5XSA9IHZhbFJlcGxhY2VkO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5cbk1vbmdvQ29ubmVjdGlvbiA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgc2VsZi5fb2JzZXJ2ZU11bHRpcGxleGVycyA9IHt9O1xuICBzZWxmLl9vbkZhaWxvdmVySG9vayA9IG5ldyBIb29rO1xuXG4gIHZhciBtb25nb09wdGlvbnMgPSBPYmplY3QuYXNzaWduKHtcbiAgICAvLyBSZWNvbm5lY3Qgb24gZXJyb3IuXG4gICAgYXV0b1JlY29ubmVjdDogdHJ1ZSxcbiAgICAvLyBUcnkgdG8gcmVjb25uZWN0IGZvcmV2ZXIsIGluc3RlYWQgb2Ygc3RvcHBpbmcgYWZ0ZXIgMzAgdHJpZXMgKHRoZVxuICAgIC8vIGRlZmF1bHQpLCB3aXRoIGVhY2ggYXR0ZW1wdCBzZXBhcmF0ZWQgYnkgMTAwMG1zLlxuICAgIHJlY29ubmVjdFRyaWVzOiBJbmZpbml0eSxcbiAgICBpZ25vcmVVbmRlZmluZWQ6IHRydWVcbiAgfSwgTW9uZ28uX2Nvbm5lY3Rpb25PcHRpb25zKTtcblxuICAvLyBEaXNhYmxlIHRoZSBuYXRpdmUgcGFyc2VyIGJ5IGRlZmF1bHQsIHVubGVzcyBzcGVjaWZpY2FsbHkgZW5hYmxlZFxuICAvLyBpbiB0aGUgbW9uZ28gVVJMLlxuICAvLyAtIFRoZSBuYXRpdmUgZHJpdmVyIGNhbiBjYXVzZSBlcnJvcnMgd2hpY2ggbm9ybWFsbHkgd291bGQgYmVcbiAgLy8gICB0aHJvd24sIGNhdWdodCwgYW5kIGhhbmRsZWQgaW50byBzZWdmYXVsdHMgdGhhdCB0YWtlIGRvd24gdGhlXG4gIC8vICAgd2hvbGUgYXBwLlxuICAvLyAtIEJpbmFyeSBtb2R1bGVzIGRvbid0IHlldCB3b3JrIHdoZW4geW91IGJ1bmRsZSBhbmQgbW92ZSB0aGUgYnVuZGxlXG4gIC8vICAgdG8gYSBkaWZmZXJlbnQgcGxhdGZvcm0gKGFrYSBkZXBsb3kpXG4gIC8vIFdlIHNob3VsZCByZXZpc2l0IHRoaXMgYWZ0ZXIgYmluYXJ5IG5wbSBtb2R1bGUgc3VwcG9ydCBsYW5kcy5cbiAgaWYgKCEoL1tcXD8mXW5hdGl2ZV8/W3BQXWFyc2VyPS8udGVzdCh1cmwpKSkge1xuICAgIG1vbmdvT3B0aW9ucy5uYXRpdmVfcGFyc2VyID0gZmFsc2U7XG4gIH1cblxuICAvLyBJbnRlcm5hbGx5IHRoZSBvcGxvZyBjb25uZWN0aW9ucyBzcGVjaWZ5IHRoZWlyIG93biBwb29sU2l6ZVxuICAvLyB3aGljaCB3ZSBkb24ndCB3YW50IHRvIG92ZXJ3cml0ZSB3aXRoIGFueSB1c2VyIGRlZmluZWQgdmFsdWVcbiAgaWYgKF8uaGFzKG9wdGlvbnMsICdwb29sU2l6ZScpKSB7XG4gICAgLy8gSWYgd2UganVzdCBzZXQgdGhpcyBmb3IgXCJzZXJ2ZXJcIiwgcmVwbFNldCB3aWxsIG92ZXJyaWRlIGl0LiBJZiB3ZSBqdXN0XG4gICAgLy8gc2V0IGl0IGZvciByZXBsU2V0LCBpdCB3aWxsIGJlIGlnbm9yZWQgaWYgd2UncmUgbm90IHVzaW5nIGEgcmVwbFNldC5cbiAgICBtb25nb09wdGlvbnMucG9vbFNpemUgPSBvcHRpb25zLnBvb2xTaXplO1xuICB9XG5cbiAgc2VsZi5kYiA9IG51bGw7XG4gIC8vIFdlIGtlZXAgdHJhY2sgb2YgdGhlIFJlcGxTZXQncyBwcmltYXJ5LCBzbyB0aGF0IHdlIGNhbiB0cmlnZ2VyIGhvb2tzIHdoZW5cbiAgLy8gaXQgY2hhbmdlcy4gIFRoZSBOb2RlIGRyaXZlcidzIGpvaW5lZCBjYWxsYmFjayBzZWVtcyB0byBmaXJlIHdheSB0b29cbiAgLy8gb2Z0ZW4sIHdoaWNoIGlzIHdoeSB3ZSBuZWVkIHRvIHRyYWNrIGl0IG91cnNlbHZlcy5cbiAgc2VsZi5fcHJpbWFyeSA9IG51bGw7XG4gIHNlbGYuX29wbG9nSGFuZGxlID0gbnVsbDtcbiAgc2VsZi5fZG9jRmV0Y2hlciA9IG51bGw7XG5cblxuICB2YXIgY29ubmVjdEZ1dHVyZSA9IG5ldyBGdXR1cmU7XG4gIE1vbmdvREIuY29ubmVjdChcbiAgICB1cmwsXG4gICAgbW9uZ29PcHRpb25zLFxuICAgIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoXG4gICAgICBmdW5jdGlvbiAoZXJyLCBjbGllbnQpIHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBkYiA9IGNsaWVudC5kYigpO1xuXG4gICAgICAgIC8vIEZpcnN0LCBmaWd1cmUgb3V0IHdoYXQgdGhlIGN1cnJlbnQgcHJpbWFyeSBpcywgaWYgYW55LlxuICAgICAgICBpZiAoZGIuc2VydmVyQ29uZmlnLmlzTWFzdGVyRG9jKSB7XG4gICAgICAgICAgc2VsZi5fcHJpbWFyeSA9IGRiLnNlcnZlckNvbmZpZy5pc01hc3RlckRvYy5wcmltYXJ5O1xuICAgICAgICB9XG5cbiAgICAgICAgZGIuc2VydmVyQ29uZmlnLm9uKFxuICAgICAgICAgICdqb2luZWQnLCBNZXRlb3IuYmluZEVudmlyb25tZW50KGZ1bmN0aW9uIChraW5kLCBkb2MpIHtcbiAgICAgICAgICAgIGlmIChraW5kID09PSAncHJpbWFyeScpIHtcbiAgICAgICAgICAgICAgaWYgKGRvYy5wcmltYXJ5ICE9PSBzZWxmLl9wcmltYXJ5KSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fcHJpbWFyeSA9IGRvYy5wcmltYXJ5O1xuICAgICAgICAgICAgICAgIHNlbGYuX29uRmFpbG92ZXJIb29rLmVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZG9jLm1lID09PSBzZWxmLl9wcmltYXJ5KSB7XG4gICAgICAgICAgICAgIC8vIFRoZSB0aGluZyB3ZSB0aG91Z2h0IHdhcyBwcmltYXJ5IGlzIG5vdyBzb21ldGhpbmcgb3RoZXIgdGhhblxuICAgICAgICAgICAgICAvLyBwcmltYXJ5LiAgRm9yZ2V0IHRoYXQgd2UgdGhvdWdodCBpdCB3YXMgcHJpbWFyeS4gIChUaGlzIG1lYW5zXG4gICAgICAgICAgICAgIC8vIHRoYXQgaWYgYSBzZXJ2ZXIgc3RvcHMgYmVpbmcgcHJpbWFyeSBhbmQgdGhlbiBzdGFydHMgYmVpbmdcbiAgICAgICAgICAgICAgLy8gcHJpbWFyeSBhZ2FpbiB3aXRob3V0IGFub3RoZXIgc2VydmVyIGJlY29taW5nIHByaW1hcnkgaW4gdGhlXG4gICAgICAgICAgICAgIC8vIG1pZGRsZSwgd2UnbGwgY29ycmVjdGx5IGNvdW50IGl0IGFzIGEgZmFpbG92ZXIuKVxuICAgICAgICAgICAgICBzZWxmLl9wcmltYXJ5ID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KSk7XG5cbiAgICAgICAgLy8gQWxsb3cgdGhlIGNvbnN0cnVjdG9yIHRvIHJldHVybi5cbiAgICAgICAgY29ubmVjdEZ1dHVyZVsncmV0dXJuJ10oeyBjbGllbnQsIGRiIH0pO1xuICAgICAgfSxcbiAgICAgIGNvbm5lY3RGdXR1cmUucmVzb2x2ZXIoKSAgLy8gb25FeGNlcHRpb25cbiAgICApXG4gICk7XG5cbiAgLy8gV2FpdCBmb3IgdGhlIGNvbm5lY3Rpb24gdG8gYmUgc3VjY2Vzc2Z1bCAodGhyb3dzIG9uIGZhaWx1cmUpIGFuZCBhc3NpZ24gdGhlXG4gIC8vIHJlc3VsdHMgKGBjbGllbnRgIGFuZCBgZGJgKSB0byBgc2VsZmAuXG4gIE9iamVjdC5hc3NpZ24oc2VsZiwgY29ubmVjdEZ1dHVyZS53YWl0KCkpO1xuXG4gIGlmIChvcHRpb25zLm9wbG9nVXJsICYmICEgUGFja2FnZVsnZGlzYWJsZS1vcGxvZyddKSB7XG4gICAgc2VsZi5fb3Bsb2dIYW5kbGUgPSBuZXcgT3Bsb2dIYW5kbGUob3B0aW9ucy5vcGxvZ1VybCwgc2VsZi5kYi5kYXRhYmFzZU5hbWUpO1xuICAgIHNlbGYuX2RvY0ZldGNoZXIgPSBuZXcgRG9jRmV0Y2hlcihzZWxmKTtcbiAgfVxufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKCEgc2VsZi5kYilcbiAgICB0aHJvdyBFcnJvcihcImNsb3NlIGNhbGxlZCBiZWZvcmUgQ29ubmVjdGlvbiBjcmVhdGVkP1wiKTtcblxuICAvLyBYWFggcHJvYmFibHkgdW50ZXN0ZWRcbiAgdmFyIG9wbG9nSGFuZGxlID0gc2VsZi5fb3Bsb2dIYW5kbGU7XG4gIHNlbGYuX29wbG9nSGFuZGxlID0gbnVsbDtcbiAgaWYgKG9wbG9nSGFuZGxlKVxuICAgIG9wbG9nSGFuZGxlLnN0b3AoKTtcblxuICAvLyBVc2UgRnV0dXJlLndyYXAgc28gdGhhdCBlcnJvcnMgZ2V0IHRocm93bi4gVGhpcyBoYXBwZW5zIHRvXG4gIC8vIHdvcmsgZXZlbiBvdXRzaWRlIGEgZmliZXIgc2luY2UgdGhlICdjbG9zZScgbWV0aG9kIGlzIG5vdFxuICAvLyBhY3R1YWxseSBhc3luY2hyb25vdXMuXG4gIEZ1dHVyZS53cmFwKF8uYmluZChzZWxmLmNsaWVudC5jbG9zZSwgc2VsZi5jbGllbnQpKSh0cnVlKS53YWl0KCk7XG59O1xuXG4vLyBSZXR1cm5zIHRoZSBNb25nbyBDb2xsZWN0aW9uIG9iamVjdDsgbWF5IHlpZWxkLlxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5yYXdDb2xsZWN0aW9uID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoISBzZWxmLmRiKVxuICAgIHRocm93IEVycm9yKFwicmF3Q29sbGVjdGlvbiBjYWxsZWQgYmVmb3JlIENvbm5lY3Rpb24gY3JlYXRlZD9cIik7XG5cbiAgdmFyIGZ1dHVyZSA9IG5ldyBGdXR1cmU7XG4gIHNlbGYuZGIuY29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSwgZnV0dXJlLnJlc29sdmVyKCkpO1xuICByZXR1cm4gZnV0dXJlLndhaXQoKTtcbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX2NyZWF0ZUNhcHBlZENvbGxlY3Rpb24gPSBmdW5jdGlvbiAoXG4gICAgY29sbGVjdGlvbk5hbWUsIGJ5dGVTaXplLCBtYXhEb2N1bWVudHMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICghIHNlbGYuZGIpXG4gICAgdGhyb3cgRXJyb3IoXCJfY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbiBjYWxsZWQgYmVmb3JlIENvbm5lY3Rpb24gY3JlYXRlZD9cIik7XG5cbiAgdmFyIGZ1dHVyZSA9IG5ldyBGdXR1cmUoKTtcbiAgc2VsZi5kYi5jcmVhdGVDb2xsZWN0aW9uKFxuICAgIGNvbGxlY3Rpb25OYW1lLFxuICAgIHsgY2FwcGVkOiB0cnVlLCBzaXplOiBieXRlU2l6ZSwgbWF4OiBtYXhEb2N1bWVudHMgfSxcbiAgICBmdXR1cmUucmVzb2x2ZXIoKSk7XG4gIGZ1dHVyZS53YWl0KCk7XG59O1xuXG4vLyBUaGlzIHNob3VsZCBiZSBjYWxsZWQgc3luY2hyb25vdXNseSB3aXRoIGEgd3JpdGUsIHRvIGNyZWF0ZSBhXG4vLyB0cmFuc2FjdGlvbiBvbiB0aGUgY3VycmVudCB3cml0ZSBmZW5jZSwgaWYgYW55LiBBZnRlciB3ZSBjYW4gcmVhZFxuLy8gdGhlIHdyaXRlLCBhbmQgYWZ0ZXIgb2JzZXJ2ZXJzIGhhdmUgYmVlbiBub3RpZmllZCAob3IgYXQgbGVhc3QsXG4vLyBhZnRlciB0aGUgb2JzZXJ2ZXIgbm90aWZpZXJzIGhhdmUgYWRkZWQgdGhlbXNlbHZlcyB0byB0aGUgd3JpdGVcbi8vIGZlbmNlKSwgeW91IHNob3VsZCBjYWxsICdjb21taXR0ZWQoKScgb24gdGhlIG9iamVjdCByZXR1cm5lZC5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX21heWJlQmVnaW5Xcml0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGZlbmNlID0gRERQU2VydmVyLl9DdXJyZW50V3JpdGVGZW5jZS5nZXQoKTtcbiAgaWYgKGZlbmNlKSB7XG4gICAgcmV0dXJuIGZlbmNlLmJlZ2luV3JpdGUoKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge2NvbW1pdHRlZDogZnVuY3Rpb24gKCkge319O1xuICB9XG59O1xuXG4vLyBJbnRlcm5hbCBpbnRlcmZhY2U6IGFkZHMgYSBjYWxsYmFjayB3aGljaCBpcyBjYWxsZWQgd2hlbiB0aGUgTW9uZ28gcHJpbWFyeVxuLy8gY2hhbmdlcy4gUmV0dXJucyBhIHN0b3AgaGFuZGxlLlxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fb25GYWlsb3ZlciA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICByZXR1cm4gdGhpcy5fb25GYWlsb3Zlckhvb2sucmVnaXN0ZXIoY2FsbGJhY2spO1xufTtcblxuXG4vLy8vLy8vLy8vLy8gUHVibGljIEFQSSAvLy8vLy8vLy8vXG5cbi8vIFRoZSB3cml0ZSBtZXRob2RzIGJsb2NrIHVudGlsIHRoZSBkYXRhYmFzZSBoYXMgY29uZmlybWVkIHRoZSB3cml0ZSAoaXQgbWF5XG4vLyBub3QgYmUgcmVwbGljYXRlZCBvciBzdGFibGUgb24gZGlzaywgYnV0IG9uZSBzZXJ2ZXIgaGFzIGNvbmZpcm1lZCBpdCkgaWYgbm9cbi8vIGNhbGxiYWNrIGlzIHByb3ZpZGVkLiBJZiBhIGNhbGxiYWNrIGlzIHByb3ZpZGVkLCB0aGVuIHRoZXkgY2FsbCB0aGUgY2FsbGJhY2tcbi8vIHdoZW4gdGhlIHdyaXRlIGlzIGNvbmZpcm1lZC4gVGhleSByZXR1cm4gbm90aGluZyBvbiBzdWNjZXNzLCBhbmQgcmFpc2UgYW5cbi8vIGV4Y2VwdGlvbiBvbiBmYWlsdXJlLlxuLy9cbi8vIEFmdGVyIG1ha2luZyBhIHdyaXRlICh3aXRoIGluc2VydCwgdXBkYXRlLCByZW1vdmUpLCBvYnNlcnZlcnMgYXJlXG4vLyBub3RpZmllZCBhc3luY2hyb25vdXNseS4gSWYgeW91IHdhbnQgdG8gcmVjZWl2ZSBhIGNhbGxiYWNrIG9uY2UgYWxsXG4vLyBvZiB0aGUgb2JzZXJ2ZXIgbm90aWZpY2F0aW9ucyBoYXZlIGxhbmRlZCBmb3IgeW91ciB3cml0ZSwgZG8gdGhlXG4vLyB3cml0ZXMgaW5zaWRlIGEgd3JpdGUgZmVuY2UgKHNldCBERFBTZXJ2ZXIuX0N1cnJlbnRXcml0ZUZlbmNlIHRvIGEgbmV3XG4vLyBfV3JpdGVGZW5jZSwgYW5kIHRoZW4gc2V0IGEgY2FsbGJhY2sgb24gdGhlIHdyaXRlIGZlbmNlLilcbi8vXG4vLyBTaW5jZSBvdXIgZXhlY3V0aW9uIGVudmlyb25tZW50IGlzIHNpbmdsZS10aHJlYWRlZCwgdGhpcyBpc1xuLy8gd2VsbC1kZWZpbmVkIC0tIGEgd3JpdGUgXCJoYXMgYmVlbiBtYWRlXCIgaWYgaXQncyByZXR1cm5lZCwgYW5kIGFuXG4vLyBvYnNlcnZlciBcImhhcyBiZWVuIG5vdGlmaWVkXCIgaWYgaXRzIGNhbGxiYWNrIGhhcyByZXR1cm5lZC5cblxudmFyIHdyaXRlQ2FsbGJhY2sgPSBmdW5jdGlvbiAod3JpdGUsIHJlZnJlc2gsIGNhbGxiYWNrKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoZXJyLCByZXN1bHQpIHtcbiAgICBpZiAoISBlcnIpIHtcbiAgICAgIC8vIFhYWCBXZSBkb24ndCBoYXZlIHRvIHJ1biB0aGlzIG9uIGVycm9yLCByaWdodD9cbiAgICAgIHRyeSB7XG4gICAgICAgIHJlZnJlc2goKTtcbiAgICAgIH0gY2F0Y2ggKHJlZnJlc2hFcnIpIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgY2FsbGJhY2socmVmcmVzaEVycik7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IHJlZnJlc2hFcnI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjayhlcnIsIHJlc3VsdCk7XG4gICAgfSBlbHNlIGlmIChlcnIpIHtcbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH07XG59O1xuXG52YXIgYmluZEVudmlyb25tZW50Rm9yV3JpdGUgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgcmV0dXJuIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoY2FsbGJhY2ssIFwiTW9uZ28gd3JpdGVcIik7XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9pbnNlcnQgPSBmdW5jdGlvbiAoY29sbGVjdGlvbl9uYW1lLCBkb2N1bWVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIHNlbmRFcnJvciA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGNhbGxiYWNrKVxuICAgICAgcmV0dXJuIGNhbGxiYWNrKGUpO1xuICAgIHRocm93IGU7XG4gIH07XG5cbiAgaWYgKGNvbGxlY3Rpb25fbmFtZSA9PT0gXCJfX19tZXRlb3JfZmFpbHVyZV90ZXN0X2NvbGxlY3Rpb25cIikge1xuICAgIHZhciBlID0gbmV3IEVycm9yKFwiRmFpbHVyZSB0ZXN0XCIpO1xuICAgIGUuX2V4cGVjdGVkQnlUZXN0ID0gdHJ1ZTtcbiAgICBzZW5kRXJyb3IoZSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKCEoTG9jYWxDb2xsZWN0aW9uLl9pc1BsYWluT2JqZWN0KGRvY3VtZW50KSAmJlxuICAgICAgICAhRUpTT04uX2lzQ3VzdG9tVHlwZShkb2N1bWVudCkpKSB7XG4gICAgc2VuZEVycm9yKG5ldyBFcnJvcihcbiAgICAgIFwiT25seSBwbGFpbiBvYmplY3RzIG1heSBiZSBpbnNlcnRlZCBpbnRvIE1vbmdvREJcIikpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciB3cml0ZSA9IHNlbGYuX21heWJlQmVnaW5Xcml0ZSgpO1xuICB2YXIgcmVmcmVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICBNZXRlb3IucmVmcmVzaCh7Y29sbGVjdGlvbjogY29sbGVjdGlvbl9uYW1lLCBpZDogZG9jdW1lbnQuX2lkIH0pO1xuICB9O1xuICBjYWxsYmFjayA9IGJpbmRFbnZpcm9ubWVudEZvcldyaXRlKHdyaXRlQ2FsbGJhY2sod3JpdGUsIHJlZnJlc2gsIGNhbGxiYWNrKSk7XG4gIHRyeSB7XG4gICAgdmFyIGNvbGxlY3Rpb24gPSBzZWxmLnJhd0NvbGxlY3Rpb24oY29sbGVjdGlvbl9uYW1lKTtcbiAgICBjb2xsZWN0aW9uLmluc2VydChyZXBsYWNlVHlwZXMoZG9jdW1lbnQsIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKSxcbiAgICAgICAgICAgICAgICAgICAgICB7c2FmZTogdHJ1ZX0sIGNhbGxiYWNrKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgdGhyb3cgZXJyO1xuICB9XG59O1xuXG4vLyBDYXVzZSBxdWVyaWVzIHRoYXQgbWF5IGJlIGFmZmVjdGVkIGJ5IHRoZSBzZWxlY3RvciB0byBwb2xsIGluIHRoaXMgd3JpdGVcbi8vIGZlbmNlLlxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fcmVmcmVzaCA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgc2VsZWN0b3IpIHtcbiAgdmFyIHJlZnJlc2hLZXkgPSB7Y29sbGVjdGlvbjogY29sbGVjdGlvbk5hbWV9O1xuICAvLyBJZiB3ZSBrbm93IHdoaWNoIGRvY3VtZW50cyB3ZSdyZSByZW1vdmluZywgZG9uJ3QgcG9sbCBxdWVyaWVzIHRoYXQgYXJlXG4gIC8vIHNwZWNpZmljIHRvIG90aGVyIGRvY3VtZW50cy4gKE5vdGUgdGhhdCBtdWx0aXBsZSBub3RpZmljYXRpb25zIGhlcmUgc2hvdWxkXG4gIC8vIG5vdCBjYXVzZSBtdWx0aXBsZSBwb2xscywgc2luY2UgYWxsIG91ciBsaXN0ZW5lciBpcyBkb2luZyBpcyBlbnF1ZXVlaW5nIGFcbiAgLy8gcG9sbC4pXG4gIHZhciBzcGVjaWZpY0lkcyA9IExvY2FsQ29sbGVjdGlvbi5faWRzTWF0Y2hlZEJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICBpZiAoc3BlY2lmaWNJZHMpIHtcbiAgICBfLmVhY2goc3BlY2lmaWNJZHMsIGZ1bmN0aW9uIChpZCkge1xuICAgICAgTWV0ZW9yLnJlZnJlc2goXy5leHRlbmQoe2lkOiBpZH0sIHJlZnJlc2hLZXkpKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBNZXRlb3IucmVmcmVzaChyZWZyZXNoS2V5KTtcbiAgfVxufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fcmVtb3ZlID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25fbmFtZSwgc2VsZWN0b3IsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2spIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmIChjb2xsZWN0aW9uX25hbWUgPT09IFwiX19fbWV0ZW9yX2ZhaWx1cmVfdGVzdF9jb2xsZWN0aW9uXCIpIHtcbiAgICB2YXIgZSA9IG5ldyBFcnJvcihcIkZhaWx1cmUgdGVzdFwiKTtcbiAgICBlLl9leHBlY3RlZEJ5VGVzdCA9IHRydWU7XG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2soZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgdmFyIHdyaXRlID0gc2VsZi5fbWF5YmVCZWdpbldyaXRlKCk7XG4gIHZhciByZWZyZXNoID0gZnVuY3Rpb24gKCkge1xuICAgIHNlbGYuX3JlZnJlc2goY29sbGVjdGlvbl9uYW1lLCBzZWxlY3Rvcik7XG4gIH07XG4gIGNhbGxiYWNrID0gYmluZEVudmlyb25tZW50Rm9yV3JpdGUod3JpdGVDYWxsYmFjayh3cml0ZSwgcmVmcmVzaCwgY2FsbGJhY2spKTtcblxuICB0cnkge1xuICAgIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25fbmFtZSk7XG4gICAgdmFyIHdyYXBwZWRDYWxsYmFjayA9IGZ1bmN0aW9uKGVyciwgZHJpdmVyUmVzdWx0KSB7XG4gICAgICBjYWxsYmFjayhlcnIsIHRyYW5zZm9ybVJlc3VsdChkcml2ZXJSZXN1bHQpLm51bWJlckFmZmVjdGVkKTtcbiAgICB9O1xuICAgIGNvbGxlY3Rpb24ucmVtb3ZlKHJlcGxhY2VUeXBlcyhzZWxlY3RvciwgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28pLFxuICAgICAgICAgICAgICAgICAgICAgICB7c2FmZTogdHJ1ZX0sIHdyYXBwZWRDYWxsYmFjayk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgIHRocm93IGVycjtcbiAgfVxufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fZHJvcENvbGxlY3Rpb24gPSBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIGNiKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICB2YXIgd3JpdGUgPSBzZWxmLl9tYXliZUJlZ2luV3JpdGUoKTtcbiAgdmFyIHJlZnJlc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgTWV0ZW9yLnJlZnJlc2goe2NvbGxlY3Rpb246IGNvbGxlY3Rpb25OYW1lLCBpZDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgZHJvcENvbGxlY3Rpb246IHRydWV9KTtcbiAgfTtcbiAgY2IgPSBiaW5kRW52aXJvbm1lbnRGb3JXcml0ZSh3cml0ZUNhbGxiYWNrKHdyaXRlLCByZWZyZXNoLCBjYikpO1xuXG4gIHRyeSB7XG4gICAgdmFyIGNvbGxlY3Rpb24gPSBzZWxmLnJhd0NvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuICAgIGNvbGxlY3Rpb24uZHJvcChjYik7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB3cml0ZS5jb21taXR0ZWQoKTtcbiAgICB0aHJvdyBlO1xuICB9XG59O1xuXG4vLyBGb3IgdGVzdGluZyBvbmx5LiAgU2xpZ2h0bHkgYmV0dGVyIHRoYW4gYGMucmF3RGF0YWJhc2UoKS5kcm9wRGF0YWJhc2UoKWBcbi8vIGJlY2F1c2UgaXQgbGV0cyB0aGUgdGVzdCdzIGZlbmNlIHdhaXQgZm9yIGl0IHRvIGJlIGNvbXBsZXRlLlxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fZHJvcERhdGFiYXNlID0gZnVuY3Rpb24gKGNiKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICB2YXIgd3JpdGUgPSBzZWxmLl9tYXliZUJlZ2luV3JpdGUoKTtcbiAgdmFyIHJlZnJlc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgTWV0ZW9yLnJlZnJlc2goeyBkcm9wRGF0YWJhc2U6IHRydWUgfSk7XG4gIH07XG4gIGNiID0gYmluZEVudmlyb25tZW50Rm9yV3JpdGUod3JpdGVDYWxsYmFjayh3cml0ZSwgcmVmcmVzaCwgY2IpKTtcblxuICB0cnkge1xuICAgIHNlbGYuZGIuZHJvcERhdGFiYXNlKGNiKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgIHRocm93IGU7XG4gIH1cbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX3VwZGF0ZSA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uX25hbWUsIHNlbGVjdG9yLCBtb2QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICghIGNhbGxiYWNrICYmIG9wdGlvbnMgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICBvcHRpb25zID0gbnVsbDtcbiAgfVxuXG4gIGlmIChjb2xsZWN0aW9uX25hbWUgPT09IFwiX19fbWV0ZW9yX2ZhaWx1cmVfdGVzdF9jb2xsZWN0aW9uXCIpIHtcbiAgICB2YXIgZSA9IG5ldyBFcnJvcihcIkZhaWx1cmUgdGVzdFwiKTtcbiAgICBlLl9leHBlY3RlZEJ5VGVzdCA9IHRydWU7XG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2soZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9XG5cbiAgLy8gZXhwbGljaXQgc2FmZXR5IGNoZWNrLiBudWxsIGFuZCB1bmRlZmluZWQgY2FuIGNyYXNoIHRoZSBtb25nb1xuICAvLyBkcml2ZXIuIEFsdGhvdWdoIHRoZSBub2RlIGRyaXZlciBhbmQgbWluaW1vbmdvIGRvICdzdXBwb3J0J1xuICAvLyBub24tb2JqZWN0IG1vZGlmaWVyIGluIHRoYXQgdGhleSBkb24ndCBjcmFzaCwgdGhleSBhcmUgbm90XG4gIC8vIG1lYW5pbmdmdWwgb3BlcmF0aW9ucyBhbmQgZG8gbm90IGRvIGFueXRoaW5nLiBEZWZlbnNpdmVseSB0aHJvdyBhblxuICAvLyBlcnJvciBoZXJlLlxuICBpZiAoIW1vZCB8fCB0eXBlb2YgbW9kICE9PSAnb2JqZWN0JylcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIG1vZGlmaWVyLiBNb2RpZmllciBtdXN0IGJlIGFuIG9iamVjdC5cIik7XG5cbiAgaWYgKCEoTG9jYWxDb2xsZWN0aW9uLl9pc1BsYWluT2JqZWN0KG1vZCkgJiZcbiAgICAgICAgIUVKU09OLl9pc0N1c3RvbVR5cGUobW9kKSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBcIk9ubHkgcGxhaW4gb2JqZWN0cyBtYXkgYmUgdXNlZCBhcyByZXBsYWNlbWVudFwiICtcbiAgICAgICAgXCIgZG9jdW1lbnRzIGluIE1vbmdvREJcIik7XG4gIH1cblxuICBpZiAoIW9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcblxuICB2YXIgd3JpdGUgPSBzZWxmLl9tYXliZUJlZ2luV3JpdGUoKTtcbiAgdmFyIHJlZnJlc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgc2VsZi5fcmVmcmVzaChjb2xsZWN0aW9uX25hbWUsIHNlbGVjdG9yKTtcbiAgfTtcbiAgY2FsbGJhY2sgPSB3cml0ZUNhbGxiYWNrKHdyaXRlLCByZWZyZXNoLCBjYWxsYmFjayk7XG4gIHRyeSB7XG4gICAgdmFyIGNvbGxlY3Rpb24gPSBzZWxmLnJhd0NvbGxlY3Rpb24oY29sbGVjdGlvbl9uYW1lKTtcbiAgICB2YXIgbW9uZ29PcHRzID0ge3NhZmU6IHRydWV9O1xuICAgIC8vIGV4cGxpY3RseSBlbnVtZXJhdGUgb3B0aW9ucyB0aGF0IG1pbmltb25nbyBzdXBwb3J0c1xuICAgIGlmIChvcHRpb25zLnVwc2VydCkgbW9uZ29PcHRzLnVwc2VydCA9IHRydWU7XG4gICAgaWYgKG9wdGlvbnMubXVsdGkpIG1vbmdvT3B0cy5tdWx0aSA9IHRydWU7XG4gICAgLy8gTGV0cyB5b3UgZ2V0IGEgbW9yZSBtb3JlIGZ1bGwgcmVzdWx0IGZyb20gTW9uZ29EQi4gVXNlIHdpdGggY2F1dGlvbjpcbiAgICAvLyBtaWdodCBub3Qgd29yayB3aXRoIEMudXBzZXJ0IChhcyBvcHBvc2VkIHRvIEMudXBkYXRlKHt1cHNlcnQ6dHJ1ZX0pIG9yXG4gICAgLy8gd2l0aCBzaW11bGF0ZWQgdXBzZXJ0LlxuICAgIGlmIChvcHRpb25zLmZ1bGxSZXN1bHQpIG1vbmdvT3B0cy5mdWxsUmVzdWx0ID0gdHJ1ZTtcblxuICAgIHZhciBtb25nb1NlbGVjdG9yID0gcmVwbGFjZVR5cGVzKHNlbGVjdG9yLCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyk7XG4gICAgdmFyIG1vbmdvTW9kID0gcmVwbGFjZVR5cGVzKG1vZCwgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28pO1xuXG4gICAgdmFyIGlzTW9kaWZ5ID0gTG9jYWxDb2xsZWN0aW9uLl9pc01vZGlmaWNhdGlvbk1vZChtb25nb01vZCk7XG5cbiAgICBpZiAob3B0aW9ucy5fZm9yYmlkUmVwbGFjZSAmJiAhaXNNb2RpZnkpIHtcbiAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoXCJJbnZhbGlkIG1vZGlmaWVyLiBSZXBsYWNlbWVudHMgYXJlIGZvcmJpZGRlbi5cIik7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gV2UndmUgYWxyZWFkeSBydW4gcmVwbGFjZVR5cGVzL3JlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvIG9uXG4gICAgLy8gc2VsZWN0b3IgYW5kIG1vZC4gIFdlIGFzc3VtZSBpdCBkb2Vzbid0IG1hdHRlciwgYXMgZmFyIGFzXG4gICAgLy8gdGhlIGJlaGF2aW9yIG9mIG1vZGlmaWVycyBpcyBjb25jZXJuZWQsIHdoZXRoZXIgYF9tb2RpZnlgXG4gICAgLy8gaXMgcnVuIG9uIEVKU09OIG9yIG9uIG1vbmdvLWNvbnZlcnRlZCBFSlNPTi5cblxuICAgIC8vIFJ1biB0aGlzIGNvZGUgdXAgZnJvbnQgc28gdGhhdCBpdCBmYWlscyBmYXN0IGlmIHNvbWVvbmUgdXNlc1xuICAgIC8vIGEgTW9uZ28gdXBkYXRlIG9wZXJhdG9yIHdlIGRvbid0IHN1cHBvcnQuXG4gICAgbGV0IGtub3duSWQ7XG4gICAgaWYgKG9wdGlvbnMudXBzZXJ0KSB7XG4gICAgICB0cnkge1xuICAgICAgICBsZXQgbmV3RG9jID0gTG9jYWxDb2xsZWN0aW9uLl9jcmVhdGVVcHNlcnREb2N1bWVudChzZWxlY3RvciwgbW9kKTtcbiAgICAgICAga25vd25JZCA9IG5ld0RvYy5faWQ7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMudXBzZXJ0ICYmXG4gICAgICAgICEgaXNNb2RpZnkgJiZcbiAgICAgICAgISBrbm93bklkICYmXG4gICAgICAgIG9wdGlvbnMuaW5zZXJ0ZWRJZCAmJlxuICAgICAgICAhIChvcHRpb25zLmluc2VydGVkSWQgaW5zdGFuY2VvZiBNb25nby5PYmplY3RJRCAmJlxuICAgICAgICAgICBvcHRpb25zLmdlbmVyYXRlZElkKSkge1xuICAgICAgLy8gSW4gY2FzZSBvZiBhbiB1cHNlcnQgd2l0aCBhIHJlcGxhY2VtZW50LCB3aGVyZSB0aGVyZSBpcyBubyBfaWQgZGVmaW5lZFxuICAgICAgLy8gaW4gZWl0aGVyIHRoZSBxdWVyeSBvciB0aGUgcmVwbGFjZW1lbnQgZG9jLCBtb25nbyB3aWxsIGdlbmVyYXRlIGFuIGlkIGl0c2VsZi5cbiAgICAgIC8vIFRoZXJlZm9yZSB3ZSBuZWVkIHRoaXMgc3BlY2lhbCBzdHJhdGVneSBpZiB3ZSB3YW50IHRvIGNvbnRyb2wgdGhlIGlkIG91cnNlbHZlcy5cblxuICAgICAgLy8gV2UgZG9uJ3QgbmVlZCB0byBkbyB0aGlzIHdoZW46XG4gICAgICAvLyAtIFRoaXMgaXMgbm90IGEgcmVwbGFjZW1lbnQsIHNvIHdlIGNhbiBhZGQgYW4gX2lkIHRvICRzZXRPbkluc2VydFxuICAgICAgLy8gLSBUaGUgaWQgaXMgZGVmaW5lZCBieSBxdWVyeSBvciBtb2Qgd2UgY2FuIGp1c3QgYWRkIGl0IHRvIHRoZSByZXBsYWNlbWVudCBkb2NcbiAgICAgIC8vIC0gVGhlIHVzZXIgZGlkIG5vdCBzcGVjaWZ5IGFueSBpZCBwcmVmZXJlbmNlIGFuZCB0aGUgaWQgaXMgYSBNb25nbyBPYmplY3RJZCxcbiAgICAgIC8vICAgICB0aGVuIHdlIGNhbiBqdXN0IGxldCBNb25nbyBnZW5lcmF0ZSB0aGUgaWRcblxuICAgICAgc2ltdWxhdGVVcHNlcnRXaXRoSW5zZXJ0ZWRJZChcbiAgICAgICAgY29sbGVjdGlvbiwgbW9uZ29TZWxlY3RvciwgbW9uZ29Nb2QsIG9wdGlvbnMsXG4gICAgICAgIC8vIFRoaXMgY2FsbGJhY2sgZG9lcyBub3QgbmVlZCB0byBiZSBiaW5kRW52aXJvbm1lbnQnZWQgYmVjYXVzZVxuICAgICAgICAvLyBzaW11bGF0ZVVwc2VydFdpdGhJbnNlcnRlZElkKCkgd3JhcHMgaXQgYW5kIHRoZW4gcGFzc2VzIGl0IHRocm91Z2hcbiAgICAgICAgLy8gYmluZEVudmlyb25tZW50Rm9yV3JpdGUuXG4gICAgICAgIGZ1bmN0aW9uIChlcnJvciwgcmVzdWx0KSB7XG4gICAgICAgICAgLy8gSWYgd2UgZ290IGhlcmUgdmlhIGEgdXBzZXJ0KCkgY2FsbCwgdGhlbiBvcHRpb25zLl9yZXR1cm5PYmplY3Qgd2lsbFxuICAgICAgICAgIC8vIGJlIHNldCBhbmQgd2Ugc2hvdWxkIHJldHVybiB0aGUgd2hvbGUgb2JqZWN0LiBPdGhlcndpc2UsIHdlIHNob3VsZFxuICAgICAgICAgIC8vIGp1c3QgcmV0dXJuIHRoZSBudW1iZXIgb2YgYWZmZWN0ZWQgZG9jcyB0byBtYXRjaCB0aGUgbW9uZ28gQVBJLlxuICAgICAgICAgIGlmIChyZXN1bHQgJiYgISBvcHRpb25zLl9yZXR1cm5PYmplY3QpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCByZXN1bHQubnVtYmVyQWZmZWN0ZWQpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnJvciwgcmVzdWx0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfSBlbHNlIHtcblxuICAgICAgaWYgKG9wdGlvbnMudXBzZXJ0ICYmICFrbm93bklkICYmIG9wdGlvbnMuaW5zZXJ0ZWRJZCAmJiBpc01vZGlmeSkge1xuICAgICAgICBpZiAoIW1vbmdvTW9kLmhhc093blByb3BlcnR5KCckc2V0T25JbnNlcnQnKSkge1xuICAgICAgICAgIG1vbmdvTW9kLiRzZXRPbkluc2VydCA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIGtub3duSWQgPSBvcHRpb25zLmluc2VydGVkSWQ7XG4gICAgICAgIE9iamVjdC5hc3NpZ24obW9uZ29Nb2QuJHNldE9uSW5zZXJ0LCByZXBsYWNlVHlwZXMoe19pZDogb3B0aW9ucy5pbnNlcnRlZElkfSwgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28pKTtcbiAgICAgIH1cblxuICAgICAgY29sbGVjdGlvbi51cGRhdGUoXG4gICAgICAgIG1vbmdvU2VsZWN0b3IsIG1vbmdvTW9kLCBtb25nb09wdHMsXG4gICAgICAgIGJpbmRFbnZpcm9ubWVudEZvcldyaXRlKGZ1bmN0aW9uIChlcnIsIHJlc3VsdCkge1xuICAgICAgICAgIGlmICghIGVycikge1xuICAgICAgICAgICAgdmFyIG1ldGVvclJlc3VsdCA9IHRyYW5zZm9ybVJlc3VsdChyZXN1bHQpO1xuICAgICAgICAgICAgaWYgKG1ldGVvclJlc3VsdCAmJiBvcHRpb25zLl9yZXR1cm5PYmplY3QpIHtcbiAgICAgICAgICAgICAgLy8gSWYgdGhpcyB3YXMgYW4gdXBzZXJ0KCkgY2FsbCwgYW5kIHdlIGVuZGVkIHVwXG4gICAgICAgICAgICAgIC8vIGluc2VydGluZyBhIG5ldyBkb2MgYW5kIHdlIGtub3cgaXRzIGlkLCB0aGVuXG4gICAgICAgICAgICAgIC8vIHJldHVybiB0aGF0IGlkIGFzIHdlbGwuXG4gICAgICAgICAgICAgIGlmIChvcHRpb25zLnVwc2VydCAmJiBtZXRlb3JSZXN1bHQuaW5zZXJ0ZWRJZCkge1xuICAgICAgICAgICAgICAgIGlmIChrbm93bklkKSB7XG4gICAgICAgICAgICAgICAgICBtZXRlb3JSZXN1bHQuaW5zZXJ0ZWRJZCA9IGtub3duSWQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtZXRlb3JSZXN1bHQuaW5zZXJ0ZWRJZCBpbnN0YW5jZW9mIE1vbmdvREIuT2JqZWN0SUQpIHtcbiAgICAgICAgICAgICAgICAgIG1ldGVvclJlc3VsdC5pbnNlcnRlZElkID0gbmV3IE1vbmdvLk9iamVjdElEKG1ldGVvclJlc3VsdC5pbnNlcnRlZElkLnRvSGV4U3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgbWV0ZW9yUmVzdWx0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgbWV0ZW9yUmVzdWx0Lm51bWJlckFmZmVjdGVkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB3cml0ZS5jb21taXR0ZWQoKTtcbiAgICB0aHJvdyBlO1xuICB9XG59O1xuXG52YXIgdHJhbnNmb3JtUmVzdWx0ID0gZnVuY3Rpb24gKGRyaXZlclJlc3VsdCkge1xuICB2YXIgbWV0ZW9yUmVzdWx0ID0geyBudW1iZXJBZmZlY3RlZDogMCB9O1xuICBpZiAoZHJpdmVyUmVzdWx0KSB7XG4gICAgdmFyIG1vbmdvUmVzdWx0ID0gZHJpdmVyUmVzdWx0LnJlc3VsdDtcblxuICAgIC8vIE9uIHVwZGF0ZXMgd2l0aCB1cHNlcnQ6dHJ1ZSwgdGhlIGluc2VydGVkIHZhbHVlcyBjb21lIGFzIGEgbGlzdCBvZlxuICAgIC8vIHVwc2VydGVkIHZhbHVlcyAtLSBldmVuIHdpdGggb3B0aW9ucy5tdWx0aSwgd2hlbiB0aGUgdXBzZXJ0IGRvZXMgaW5zZXJ0LFxuICAgIC8vIGl0IG9ubHkgaW5zZXJ0cyBvbmUgZWxlbWVudC5cbiAgICBpZiAobW9uZ29SZXN1bHQudXBzZXJ0ZWQpIHtcbiAgICAgIG1ldGVvclJlc3VsdC5udW1iZXJBZmZlY3RlZCArPSBtb25nb1Jlc3VsdC51cHNlcnRlZC5sZW5ndGg7XG5cbiAgICAgIGlmIChtb25nb1Jlc3VsdC51cHNlcnRlZC5sZW5ndGggPT0gMSkge1xuICAgICAgICBtZXRlb3JSZXN1bHQuaW5zZXJ0ZWRJZCA9IG1vbmdvUmVzdWx0LnVwc2VydGVkWzBdLl9pZDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbWV0ZW9yUmVzdWx0Lm51bWJlckFmZmVjdGVkID0gbW9uZ29SZXN1bHQubjtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbWV0ZW9yUmVzdWx0O1xufTtcblxuXG52YXIgTlVNX09QVElNSVNUSUNfVFJJRVMgPSAzO1xuXG4vLyBleHBvc2VkIGZvciB0ZXN0aW5nXG5Nb25nb0Nvbm5lY3Rpb24uX2lzQ2Fubm90Q2hhbmdlSWRFcnJvciA9IGZ1bmN0aW9uIChlcnIpIHtcblxuICAvLyBNb25nbyAzLjIuKiByZXR1cm5zIGVycm9yIGFzIG5leHQgT2JqZWN0OlxuICAvLyB7bmFtZTogU3RyaW5nLCBjb2RlOiBOdW1iZXIsIGVycm1zZzogU3RyaW5nfVxuICAvLyBPbGRlciBNb25nbyByZXR1cm5zOlxuICAvLyB7bmFtZTogU3RyaW5nLCBjb2RlOiBOdW1iZXIsIGVycjogU3RyaW5nfVxuICB2YXIgZXJyb3IgPSBlcnIuZXJybXNnIHx8IGVyci5lcnI7XG5cbiAgLy8gV2UgZG9uJ3QgdXNlIHRoZSBlcnJvciBjb2RlIGhlcmVcbiAgLy8gYmVjYXVzZSB0aGUgZXJyb3IgY29kZSB3ZSBvYnNlcnZlZCBpdCBwcm9kdWNpbmcgKDE2ODM3KSBhcHBlYXJzIHRvIGJlXG4gIC8vIGEgZmFyIG1vcmUgZ2VuZXJpYyBlcnJvciBjb2RlIGJhc2VkIG9uIGV4YW1pbmluZyB0aGUgc291cmNlLlxuICBpZiAoZXJyb3IuaW5kZXhPZignVGhlIF9pZCBmaWVsZCBjYW5ub3QgYmUgY2hhbmdlZCcpID09PSAwXG4gICAgfHwgZXJyb3IuaW5kZXhPZihcInRoZSAoaW1tdXRhYmxlKSBmaWVsZCAnX2lkJyB3YXMgZm91bmQgdG8gaGF2ZSBiZWVuIGFsdGVyZWQgdG8gX2lkXCIpICE9PSAtMSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxudmFyIHNpbXVsYXRlVXBzZXJ0V2l0aEluc2VydGVkSWQgPSBmdW5jdGlvbiAoY29sbGVjdGlvbiwgc2VsZWN0b3IsIG1vZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gIC8vIFNUUkFURUdZOiBGaXJzdCB0cnkgZG9pbmcgYW4gdXBzZXJ0IHdpdGggYSBnZW5lcmF0ZWQgSUQuXG4gIC8vIElmIHRoaXMgdGhyb3dzIGFuIGVycm9yIGFib3V0IGNoYW5naW5nIHRoZSBJRCBvbiBhbiBleGlzdGluZyBkb2N1bWVudFxuICAvLyB0aGVuIHdpdGhvdXQgYWZmZWN0aW5nIHRoZSBkYXRhYmFzZSwgd2Uga25vdyB3ZSBzaG91bGQgcHJvYmFibHkgdHJ5XG4gIC8vIGFuIHVwZGF0ZSB3aXRob3V0IHRoZSBnZW5lcmF0ZWQgSUQuIElmIGl0IGFmZmVjdGVkIDAgZG9jdW1lbnRzLFxuICAvLyB0aGVuIHdpdGhvdXQgYWZmZWN0aW5nIHRoZSBkYXRhYmFzZSwgd2UgdGhlIGRvY3VtZW50IHRoYXQgZmlyc3RcbiAgLy8gZ2F2ZSB0aGUgZXJyb3IgaXMgcHJvYmFibHkgcmVtb3ZlZCBhbmQgd2UgbmVlZCB0byB0cnkgYW4gaW5zZXJ0IGFnYWluXG4gIC8vIFdlIGdvIGJhY2sgdG8gc3RlcCBvbmUgYW5kIHJlcGVhdC5cbiAgLy8gTGlrZSBhbGwgXCJvcHRpbWlzdGljIHdyaXRlXCIgc2NoZW1lcywgd2UgcmVseSBvbiB0aGUgZmFjdCB0aGF0IGl0J3NcbiAgLy8gdW5saWtlbHkgb3VyIHdyaXRlcyB3aWxsIGNvbnRpbnVlIHRvIGJlIGludGVyZmVyZWQgd2l0aCB1bmRlciBub3JtYWxcbiAgLy8gY2lyY3Vtc3RhbmNlcyAodGhvdWdoIHN1ZmZpY2llbnRseSBoZWF2eSBjb250ZW50aW9uIHdpdGggd3JpdGVyc1xuICAvLyBkaXNhZ3JlZWluZyBvbiB0aGUgZXhpc3RlbmNlIG9mIGFuIG9iamVjdCB3aWxsIGNhdXNlIHdyaXRlcyB0byBmYWlsXG4gIC8vIGluIHRoZW9yeSkuXG5cbiAgdmFyIGluc2VydGVkSWQgPSBvcHRpb25zLmluc2VydGVkSWQ7IC8vIG11c3QgZXhpc3RcbiAgdmFyIG1vbmdvT3B0c0ZvclVwZGF0ZSA9IHtcbiAgICBzYWZlOiB0cnVlLFxuICAgIG11bHRpOiBvcHRpb25zLm11bHRpXG4gIH07XG4gIHZhciBtb25nb09wdHNGb3JJbnNlcnQgPSB7XG4gICAgc2FmZTogdHJ1ZSxcbiAgICB1cHNlcnQ6IHRydWVcbiAgfTtcblxuICB2YXIgcmVwbGFjZW1lbnRXaXRoSWQgPSBPYmplY3QuYXNzaWduKFxuICAgIHJlcGxhY2VUeXBlcyh7X2lkOiBpbnNlcnRlZElkfSwgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28pLFxuICAgIG1vZCk7XG5cbiAgdmFyIHRyaWVzID0gTlVNX09QVElNSVNUSUNfVFJJRVM7XG5cbiAgdmFyIGRvVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHRyaWVzLS07XG4gICAgaWYgKCEgdHJpZXMpIHtcbiAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihcIlVwc2VydCBmYWlsZWQgYWZ0ZXIgXCIgKyBOVU1fT1BUSU1JU1RJQ19UUklFUyArIFwiIHRyaWVzLlwiKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbGxlY3Rpb24udXBkYXRlKHNlbGVjdG9yLCBtb2QsIG1vbmdvT3B0c0ZvclVwZGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJpbmRFbnZpcm9ubWVudEZvcldyaXRlKGZ1bmN0aW9uIChlcnIsIHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgJiYgcmVzdWx0LnJlc3VsdC5uICE9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBudW1iZXJBZmZlY3RlZDogcmVzdWx0LnJlc3VsdC5uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9Db25kaXRpb25hbEluc2VydCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgfVxuICB9O1xuXG4gIHZhciBkb0NvbmRpdGlvbmFsSW5zZXJ0ID0gZnVuY3Rpb24gKCkge1xuICAgIGNvbGxlY3Rpb24udXBkYXRlKHNlbGVjdG9yLCByZXBsYWNlbWVudFdpdGhJZCwgbW9uZ29PcHRzRm9ySW5zZXJ0LFxuICAgICAgICAgICAgICAgICAgICAgIGJpbmRFbnZpcm9ubWVudEZvcldyaXRlKGZ1bmN0aW9uIChlcnIsIHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBmaWd1cmUgb3V0IGlmIHRoaXMgaXMgYVxuICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBcImNhbm5vdCBjaGFuZ2UgX2lkIG9mIGRvY3VtZW50XCIgZXJyb3IsIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBpZiBzbywgdHJ5IGRvVXBkYXRlKCkgYWdhaW4sIHVwIHRvIDMgdGltZXMuXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChNb25nb0Nvbm5lY3Rpb24uX2lzQ2Fubm90Q2hhbmdlSWRFcnJvcihlcnIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9VcGRhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbnVtYmVyQWZmZWN0ZWQ6IHJlc3VsdC5yZXN1bHQudXBzZXJ0ZWQubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluc2VydGVkSWQ6IGluc2VydGVkSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgfTtcblxuICBkb1VwZGF0ZSgpO1xufTtcblxuXy5lYWNoKFtcImluc2VydFwiLCBcInVwZGF0ZVwiLCBcInJlbW92ZVwiLCBcImRyb3BDb2xsZWN0aW9uXCIsIFwiZHJvcERhdGFiYXNlXCJdLCBmdW5jdGlvbiAobWV0aG9kKSB7XG4gIE1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGVbbWV0aG9kXSA9IGZ1bmN0aW9uICgvKiBhcmd1bWVudHMgKi8pIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIE1ldGVvci53cmFwQXN5bmMoc2VsZltcIl9cIiArIG1ldGhvZF0pLmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7XG4gIH07XG59KTtcblxuLy8gWFhYIE1vbmdvQ29ubmVjdGlvbi51cHNlcnQoKSBkb2VzIG5vdCByZXR1cm4gdGhlIGlkIG9mIHRoZSBpbnNlcnRlZCBkb2N1bWVudFxuLy8gdW5sZXNzIHlvdSBzZXQgaXQgZXhwbGljaXRseSBpbiB0aGUgc2VsZWN0b3Igb3IgbW9kaWZpZXIgKGFzIGEgcmVwbGFjZW1lbnRcbi8vIGRvYykuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLnVwc2VydCA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgc2VsZWN0b3IsIG1vZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIgJiYgISBjYWxsYmFjaykge1xuICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICBvcHRpb25zID0ge307XG4gIH1cblxuICByZXR1cm4gc2VsZi51cGRhdGUoY29sbGVjdGlvbk5hbWUsIHNlbGVjdG9yLCBtb2QsXG4gICAgICAgICAgICAgICAgICAgICBfLmV4dGVuZCh7fSwgb3B0aW9ucywge1xuICAgICAgICAgICAgICAgICAgICAgICB1cHNlcnQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgIF9yZXR1cm5PYmplY3Q6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgIH0pLCBjYWxsYmFjayk7XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLmZpbmQgPSBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIHNlbGVjdG9yLCBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSlcbiAgICBzZWxlY3RvciA9IHt9O1xuXG4gIHJldHVybiBuZXcgQ3Vyc29yKFxuICAgIHNlbGYsIG5ldyBDdXJzb3JEZXNjcmlwdGlvbihjb2xsZWN0aW9uTmFtZSwgc2VsZWN0b3IsIG9wdGlvbnMpKTtcbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuZmluZE9uZSA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uX25hbWUsIHNlbGVjdG9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSlcbiAgICBzZWxlY3RvciA9IHt9O1xuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBvcHRpb25zLmxpbWl0ID0gMTtcbiAgcmV0dXJuIHNlbGYuZmluZChjb2xsZWN0aW9uX25hbWUsIHNlbGVjdG9yLCBvcHRpb25zKS5mZXRjaCgpWzBdO1xufTtcblxuLy8gV2UnbGwgYWN0dWFsbHkgZGVzaWduIGFuIGluZGV4IEFQSSBsYXRlci4gRm9yIG5vdywgd2UganVzdCBwYXNzIHRocm91Z2ggdG9cbi8vIE1vbmdvJ3MsIGJ1dCBtYWtlIGl0IHN5bmNocm9ub3VzLlxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fZW5zdXJlSW5kZXggPSBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIGluZGV4LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgLy8gV2UgZXhwZWN0IHRoaXMgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGF0IHN0YXJ0dXAsIG5vdCBmcm9tIHdpdGhpbiBhIG1ldGhvZCxcbiAgLy8gc28gd2UgZG9uJ3QgaW50ZXJhY3Qgd2l0aCB0aGUgd3JpdGUgZmVuY2UuXG4gIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcbiAgdmFyIGZ1dHVyZSA9IG5ldyBGdXR1cmU7XG4gIHZhciBpbmRleE5hbWUgPSBjb2xsZWN0aW9uLmVuc3VyZUluZGV4KGluZGV4LCBvcHRpb25zLCBmdXR1cmUucmVzb2x2ZXIoKSk7XG4gIGZ1dHVyZS53YWl0KCk7XG59O1xuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fZHJvcEluZGV4ID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBpbmRleCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgLy8gVGhpcyBmdW5jdGlvbiBpcyBvbmx5IHVzZWQgYnkgdGVzdCBjb2RlLCBub3Qgd2l0aGluIGEgbWV0aG9kLCBzbyB3ZSBkb24ndFxuICAvLyBpbnRlcmFjdCB3aXRoIHRoZSB3cml0ZSBmZW5jZS5cbiAgdmFyIGNvbGxlY3Rpb24gPSBzZWxmLnJhd0NvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuICB2YXIgZnV0dXJlID0gbmV3IEZ1dHVyZTtcbiAgdmFyIGluZGV4TmFtZSA9IGNvbGxlY3Rpb24uZHJvcEluZGV4KGluZGV4LCBmdXR1cmUucmVzb2x2ZXIoKSk7XG4gIGZ1dHVyZS53YWl0KCk7XG59O1xuXG4vLyBDVVJTT1JTXG5cbi8vIFRoZXJlIGFyZSBzZXZlcmFsIGNsYXNzZXMgd2hpY2ggcmVsYXRlIHRvIGN1cnNvcnM6XG4vL1xuLy8gQ3Vyc29yRGVzY3JpcHRpb24gcmVwcmVzZW50cyB0aGUgYXJndW1lbnRzIHVzZWQgdG8gY29uc3RydWN0IGEgY3Vyc29yOlxuLy8gY29sbGVjdGlvbk5hbWUsIHNlbGVjdG9yLCBhbmQgKGZpbmQpIG9wdGlvbnMuICBCZWNhdXNlIGl0IGlzIHVzZWQgYXMgYSBrZXlcbi8vIGZvciBjdXJzb3IgZGUtZHVwLCBldmVyeXRoaW5nIGluIGl0IHNob3VsZCBlaXRoZXIgYmUgSlNPTi1zdHJpbmdpZmlhYmxlIG9yXG4vLyBub3QgYWZmZWN0IG9ic2VydmVDaGFuZ2VzIG91dHB1dCAoZWcsIG9wdGlvbnMudHJhbnNmb3JtIGZ1bmN0aW9ucyBhcmUgbm90XG4vLyBzdHJpbmdpZmlhYmxlIGJ1dCBkbyBub3QgYWZmZWN0IG9ic2VydmVDaGFuZ2VzKS5cbi8vXG4vLyBTeW5jaHJvbm91c0N1cnNvciBpcyBhIHdyYXBwZXIgYXJvdW5kIGEgTW9uZ29EQiBjdXJzb3Jcbi8vIHdoaWNoIGluY2x1ZGVzIGZ1bGx5LXN5bmNocm9ub3VzIHZlcnNpb25zIG9mIGZvckVhY2gsIGV0Yy5cbi8vXG4vLyBDdXJzb3IgaXMgdGhlIGN1cnNvciBvYmplY3QgcmV0dXJuZWQgZnJvbSBmaW5kKCksIHdoaWNoIGltcGxlbWVudHMgdGhlXG4vLyBkb2N1bWVudGVkIE1vbmdvLkNvbGxlY3Rpb24gY3Vyc29yIEFQSS4gIEl0IHdyYXBzIGEgQ3Vyc29yRGVzY3JpcHRpb24gYW5kIGFcbi8vIFN5bmNocm9ub3VzQ3Vyc29yIChsYXppbHk6IGl0IGRvZXNuJ3QgY29udGFjdCBNb25nbyB1bnRpbCB5b3UgY2FsbCBhIG1ldGhvZFxuLy8gbGlrZSBmZXRjaCBvciBmb3JFYWNoIG9uIGl0KS5cbi8vXG4vLyBPYnNlcnZlSGFuZGxlIGlzIHRoZSBcIm9ic2VydmUgaGFuZGxlXCIgcmV0dXJuZWQgZnJvbSBvYnNlcnZlQ2hhbmdlcy4gSXQgaGFzIGFcbi8vIHJlZmVyZW5jZSB0byBhbiBPYnNlcnZlTXVsdGlwbGV4ZXIuXG4vL1xuLy8gT2JzZXJ2ZU11bHRpcGxleGVyIGFsbG93cyBtdWx0aXBsZSBpZGVudGljYWwgT2JzZXJ2ZUhhbmRsZXMgdG8gYmUgZHJpdmVuIGJ5IGFcbi8vIHNpbmdsZSBvYnNlcnZlIGRyaXZlci5cbi8vXG4vLyBUaGVyZSBhcmUgdHdvIFwib2JzZXJ2ZSBkcml2ZXJzXCIgd2hpY2ggZHJpdmUgT2JzZXJ2ZU11bHRpcGxleGVyczpcbi8vICAgLSBQb2xsaW5nT2JzZXJ2ZURyaXZlciBjYWNoZXMgdGhlIHJlc3VsdHMgb2YgYSBxdWVyeSBhbmQgcmVydW5zIGl0IHdoZW5cbi8vICAgICBuZWNlc3NhcnkuXG4vLyAgIC0gT3Bsb2dPYnNlcnZlRHJpdmVyIGZvbGxvd3MgdGhlIE1vbmdvIG9wZXJhdGlvbiBsb2cgdG8gZGlyZWN0bHkgb2JzZXJ2ZVxuLy8gICAgIGRhdGFiYXNlIGNoYW5nZXMuXG4vLyBCb3RoIGltcGxlbWVudGF0aW9ucyBmb2xsb3cgdGhlIHNhbWUgc2ltcGxlIGludGVyZmFjZTogd2hlbiB5b3UgY3JlYXRlIHRoZW0sXG4vLyB0aGV5IHN0YXJ0IHNlbmRpbmcgb2JzZXJ2ZUNoYW5nZXMgY2FsbGJhY2tzIChhbmQgYSByZWFkeSgpIGludm9jYXRpb24pIHRvXG4vLyB0aGVpciBPYnNlcnZlTXVsdGlwbGV4ZXIsIGFuZCB5b3Ugc3RvcCB0aGVtIGJ5IGNhbGxpbmcgdGhlaXIgc3RvcCgpIG1ldGhvZC5cblxuQ3Vyc29yRGVzY3JpcHRpb24gPSBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIHNlbGVjdG9yLCBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5jb2xsZWN0aW9uTmFtZSA9IGNvbGxlY3Rpb25OYW1lO1xuICBzZWxmLnNlbGVjdG9yID0gTW9uZ28uQ29sbGVjdGlvbi5fcmV3cml0ZVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgc2VsZi5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbn07XG5cbkN1cnNvciA9IGZ1bmN0aW9uIChtb25nbywgY3Vyc29yRGVzY3JpcHRpb24pIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHNlbGYuX21vbmdvID0gbW9uZ287XG4gIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uID0gY3Vyc29yRGVzY3JpcHRpb247XG4gIHNlbGYuX3N5bmNocm9ub3VzQ3Vyc29yID0gbnVsbDtcbn07XG5cbl8uZWFjaChbJ2ZvckVhY2gnLCAnbWFwJywgJ2ZldGNoJywgJ2NvdW50JywgU3ltYm9sLml0ZXJhdG9yXSwgZnVuY3Rpb24gKG1ldGhvZCkge1xuICBDdXJzb3IucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gWW91IGNhbiBvbmx5IG9ic2VydmUgYSB0YWlsYWJsZSBjdXJzb3IuXG4gICAgaWYgKHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMudGFpbGFibGUpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgY2FsbCBcIiArIG1ldGhvZCArIFwiIG9uIGEgdGFpbGFibGUgY3Vyc29yXCIpO1xuXG4gICAgaWYgKCFzZWxmLl9zeW5jaHJvbm91c0N1cnNvcikge1xuICAgICAgc2VsZi5fc3luY2hyb25vdXNDdXJzb3IgPSBzZWxmLl9tb25nby5fY3JlYXRlU3luY2hyb25vdXNDdXJzb3IoXG4gICAgICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLCB7XG4gICAgICAgICAgLy8gTWFrZSBzdXJlIHRoYXQgdGhlIFwic2VsZlwiIGFyZ3VtZW50IHRvIGZvckVhY2gvbWFwIGNhbGxiYWNrcyBpcyB0aGVcbiAgICAgICAgICAvLyBDdXJzb3IsIG5vdCB0aGUgU3luY2hyb25vdXNDdXJzb3IuXG4gICAgICAgICAgc2VsZkZvckl0ZXJhdGlvbjogc2VsZixcbiAgICAgICAgICB1c2VUcmFuc2Zvcm06IHRydWVcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNlbGYuX3N5bmNocm9ub3VzQ3Vyc29yW21ldGhvZF0uYXBwbHkoXG4gICAgICBzZWxmLl9zeW5jaHJvbm91c0N1cnNvciwgYXJndW1lbnRzKTtcbiAgfTtcbn0pO1xuXG4vLyBTaW5jZSB3ZSBkb24ndCBhY3R1YWxseSBoYXZlIGEgXCJuZXh0T2JqZWN0XCIgaW50ZXJmYWNlLCB0aGVyZSdzIHJlYWxseSBub1xuLy8gcmVhc29uIHRvIGhhdmUgYSBcInJld2luZFwiIGludGVyZmFjZS4gIEFsbCBpdCBkaWQgd2FzIG1ha2UgbXVsdGlwbGUgY2FsbHNcbi8vIHRvIGZldGNoL21hcC9mb3JFYWNoIHJldHVybiBub3RoaW5nIHRoZSBzZWNvbmQgdGltZS5cbi8vIFhYWCBDT01QQVQgV0lUSCAwLjguMVxuQ3Vyc29yLnByb3RvdHlwZS5yZXdpbmQgPSBmdW5jdGlvbiAoKSB7XG59O1xuXG5DdXJzb3IucHJvdG90eXBlLmdldFRyYW5zZm9ybSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMudHJhbnNmb3JtO1xufTtcblxuLy8gV2hlbiB5b3UgY2FsbCBNZXRlb3IucHVibGlzaCgpIHdpdGggYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBDdXJzb3IsIHdlIG5lZWRcbi8vIHRvIHRyYW5zbXV0ZSBpdCBpbnRvIHRoZSBlcXVpdmFsZW50IHN1YnNjcmlwdGlvbi4gIFRoaXMgaXMgdGhlIGZ1bmN0aW9uIHRoYXRcbi8vIGRvZXMgdGhhdC5cblxuQ3Vyc29yLnByb3RvdHlwZS5fcHVibGlzaEN1cnNvciA9IGZ1bmN0aW9uIChzdWIpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgY29sbGVjdGlvbiA9IHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lO1xuICByZXR1cm4gTW9uZ28uQ29sbGVjdGlvbi5fcHVibGlzaEN1cnNvcihzZWxmLCBzdWIsIGNvbGxlY3Rpb24pO1xufTtcblxuLy8gVXNlZCB0byBndWFyYW50ZWUgdGhhdCBwdWJsaXNoIGZ1bmN0aW9ucyByZXR1cm4gYXQgbW9zdCBvbmUgY3Vyc29yIHBlclxuLy8gY29sbGVjdGlvbi4gUHJpdmF0ZSwgYmVjYXVzZSB3ZSBtaWdodCBsYXRlciBoYXZlIGN1cnNvcnMgdGhhdCBpbmNsdWRlXG4vLyBkb2N1bWVudHMgZnJvbSBtdWx0aXBsZSBjb2xsZWN0aW9ucyBzb21laG93LlxuQ3Vyc29yLnByb3RvdHlwZS5fZ2V0Q29sbGVjdGlvbk5hbWUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lO1xufTtcblxuQ3Vyc29yLnByb3RvdHlwZS5vYnNlcnZlID0gZnVuY3Rpb24gKGNhbGxiYWNrcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiBMb2NhbENvbGxlY3Rpb24uX29ic2VydmVGcm9tT2JzZXJ2ZUNoYW5nZXMoc2VsZiwgY2FsbGJhY2tzKTtcbn07XG5cbkN1cnNvci5wcm90b3R5cGUub2JzZXJ2ZUNoYW5nZXMgPSBmdW5jdGlvbiAoY2FsbGJhY2tzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIG1ldGhvZHMgPSBbXG4gICAgJ2FkZGVkQXQnLFxuICAgICdhZGRlZCcsXG4gICAgJ2NoYW5nZWRBdCcsXG4gICAgJ2NoYW5nZWQnLFxuICAgICdyZW1vdmVkQXQnLFxuICAgICdyZW1vdmVkJyxcbiAgICAnbW92ZWRUbydcbiAgXTtcbiAgdmFyIG9yZGVyZWQgPSBMb2NhbENvbGxlY3Rpb24uX29ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzQXJlT3JkZXJlZChjYWxsYmFja3MpO1xuXG4gIC8vIFhYWDogQ2FuIHdlIGZpbmQgb3V0IGlmIGNhbGxiYWNrcyBhcmUgZnJvbSBvYnNlcnZlP1xuICB2YXIgZXhjZXB0aW9uTmFtZSA9ICcgb2JzZXJ2ZS9vYnNlcnZlQ2hhbmdlcyBjYWxsYmFjayc7XG4gIG1ldGhvZHMuZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKSB7XG4gICAgaWYgKGNhbGxiYWNrc1ttZXRob2RdICYmIHR5cGVvZiBjYWxsYmFja3NbbWV0aG9kXSA9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIGNhbGxiYWNrc1ttZXRob2RdID0gTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChjYWxsYmFja3NbbWV0aG9kXSwgbWV0aG9kICsgZXhjZXB0aW9uTmFtZSk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gc2VsZi5fbW9uZ28uX29ic2VydmVDaGFuZ2VzKFxuICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLCBvcmRlcmVkLCBjYWxsYmFja3MpO1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fY3JlYXRlU3luY2hyb25vdXNDdXJzb3IgPSBmdW5jdGlvbihcbiAgICBjdXJzb3JEZXNjcmlwdGlvbiwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIG9wdGlvbnMgPSBfLnBpY2sob3B0aW9ucyB8fCB7fSwgJ3NlbGZGb3JJdGVyYXRpb24nLCAndXNlVHJhbnNmb3JtJyk7XG5cbiAgdmFyIGNvbGxlY3Rpb24gPSBzZWxmLnJhd0NvbGxlY3Rpb24oY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWUpO1xuICB2YXIgY3Vyc29yT3B0aW9ucyA9IGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnM7XG4gIHZhciBtb25nb09wdGlvbnMgPSB7XG4gICAgc29ydDogY3Vyc29yT3B0aW9ucy5zb3J0LFxuICAgIGxpbWl0OiBjdXJzb3JPcHRpb25zLmxpbWl0LFxuICAgIHNraXA6IGN1cnNvck9wdGlvbnMuc2tpcCxcbiAgICBwcm9qZWN0aW9uOiBjdXJzb3JPcHRpb25zLmZpZWxkc1xuICB9O1xuXG4gIC8vIERvIHdlIHdhbnQgYSB0YWlsYWJsZSBjdXJzb3IgKHdoaWNoIG9ubHkgd29ya3Mgb24gY2FwcGVkIGNvbGxlY3Rpb25zKT9cbiAgaWYgKGN1cnNvck9wdGlvbnMudGFpbGFibGUpIHtcbiAgICAvLyBXZSB3YW50IGEgdGFpbGFibGUgY3Vyc29yLi4uXG4gICAgbW9uZ29PcHRpb25zLnRhaWxhYmxlID0gdHJ1ZTtcbiAgICAvLyAuLi4gYW5kIGZvciB0aGUgc2VydmVyIHRvIHdhaXQgYSBiaXQgaWYgYW55IGdldE1vcmUgaGFzIG5vIGRhdGEgKHJhdGhlclxuICAgIC8vIHRoYW4gbWFraW5nIHVzIHB1dCB0aGUgcmVsZXZhbnQgc2xlZXBzIGluIHRoZSBjbGllbnQpLi4uXG4gICAgbW9uZ29PcHRpb25zLmF3YWl0ZGF0YSA9IHRydWU7XG4gICAgLy8gLi4uIGFuZCB0byBrZWVwIHF1ZXJ5aW5nIHRoZSBzZXJ2ZXIgaW5kZWZpbml0ZWx5IHJhdGhlciB0aGFuIGp1c3QgNSB0aW1lc1xuICAgIC8vIGlmIHRoZXJlJ3Mgbm8gbW9yZSBkYXRhLlxuICAgIG1vbmdvT3B0aW9ucy5udW1iZXJPZlJldHJpZXMgPSAtMTtcbiAgICAvLyBBbmQgaWYgdGhpcyBpcyBvbiB0aGUgb3Bsb2cgY29sbGVjdGlvbiBhbmQgdGhlIGN1cnNvciBzcGVjaWZpZXMgYSAndHMnLFxuICAgIC8vIHRoZW4gc2V0IHRoZSB1bmRvY3VtZW50ZWQgb3Bsb2cgcmVwbGF5IGZsYWcsIHdoaWNoIGRvZXMgYSBzcGVjaWFsIHNjYW4gdG9cbiAgICAvLyBmaW5kIHRoZSBmaXJzdCBkb2N1bWVudCAoaW5zdGVhZCBvZiBjcmVhdGluZyBhbiBpbmRleCBvbiB0cykuIFRoaXMgaXMgYVxuICAgIC8vIHZlcnkgaGFyZC1jb2RlZCBNb25nbyBmbGFnIHdoaWNoIG9ubHkgd29ya3Mgb24gdGhlIG9wbG9nIGNvbGxlY3Rpb24gYW5kXG4gICAgLy8gb25seSB3b3JrcyB3aXRoIHRoZSB0cyBmaWVsZC5cbiAgICBpZiAoY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWUgPT09IE9QTE9HX0NPTExFQ1RJT04gJiZcbiAgICAgICAgY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IudHMpIHtcbiAgICAgIG1vbmdvT3B0aW9ucy5vcGxvZ1JlcGxheSA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgdmFyIGRiQ3Vyc29yID0gY29sbGVjdGlvbi5maW5kKFxuICAgIHJlcGxhY2VUeXBlcyhjdXJzb3JEZXNjcmlwdGlvbi5zZWxlY3RvciwgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28pLFxuICAgIG1vbmdvT3B0aW9ucyk7XG5cbiAgaWYgKHR5cGVvZiBjdXJzb3JPcHRpb25zLm1heFRpbWVNcyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBkYkN1cnNvciA9IGRiQ3Vyc29yLm1heFRpbWVNUyhjdXJzb3JPcHRpb25zLm1heFRpbWVNcyk7XG4gIH1cbiAgaWYgKHR5cGVvZiBjdXJzb3JPcHRpb25zLmhpbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgZGJDdXJzb3IgPSBkYkN1cnNvci5oaW50KGN1cnNvck9wdGlvbnMuaGludCk7XG4gIH1cblxuICByZXR1cm4gbmV3IFN5bmNocm9ub3VzQ3Vyc29yKGRiQ3Vyc29yLCBjdXJzb3JEZXNjcmlwdGlvbiwgb3B0aW9ucyk7XG59O1xuXG52YXIgU3luY2hyb25vdXNDdXJzb3IgPSBmdW5jdGlvbiAoZGJDdXJzb3IsIGN1cnNvckRlc2NyaXB0aW9uLCBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgb3B0aW9ucyA9IF8ucGljayhvcHRpb25zIHx8IHt9LCAnc2VsZkZvckl0ZXJhdGlvbicsICd1c2VUcmFuc2Zvcm0nKTtcblxuICBzZWxmLl9kYkN1cnNvciA9IGRiQ3Vyc29yO1xuICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiA9IGN1cnNvckRlc2NyaXB0aW9uO1xuICAvLyBUaGUgXCJzZWxmXCIgYXJndW1lbnQgcGFzc2VkIHRvIGZvckVhY2gvbWFwIGNhbGxiYWNrcy4gSWYgd2UncmUgd3JhcHBlZFxuICAvLyBpbnNpZGUgYSB1c2VyLXZpc2libGUgQ3Vyc29yLCB3ZSB3YW50IHRvIHByb3ZpZGUgdGhlIG91dGVyIGN1cnNvciFcbiAgc2VsZi5fc2VsZkZvckl0ZXJhdGlvbiA9IG9wdGlvbnMuc2VsZkZvckl0ZXJhdGlvbiB8fCBzZWxmO1xuICBpZiAob3B0aW9ucy51c2VUcmFuc2Zvcm0gJiYgY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy50cmFuc2Zvcm0pIHtcbiAgICBzZWxmLl90cmFuc2Zvcm0gPSBMb2NhbENvbGxlY3Rpb24ud3JhcFRyYW5zZm9ybShcbiAgICAgIGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMudHJhbnNmb3JtKTtcbiAgfSBlbHNlIHtcbiAgICBzZWxmLl90cmFuc2Zvcm0gPSBudWxsO1xuICB9XG5cbiAgc2VsZi5fc3luY2hyb25vdXNDb3VudCA9IEZ1dHVyZS53cmFwKGRiQ3Vyc29yLmNvdW50LmJpbmQoZGJDdXJzb3IpKTtcbiAgc2VsZi5fdmlzaXRlZElkcyA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xufTtcblxuXy5leHRlbmQoU3luY2hyb25vdXNDdXJzb3IucHJvdG90eXBlLCB7XG4gIC8vIFJldHVybnMgYSBQcm9taXNlIGZvciB0aGUgbmV4dCBvYmplY3QgZnJvbSB0aGUgdW5kZXJseWluZyBjdXJzb3IgKGJlZm9yZVxuICAvLyB0aGUgTW9uZ28tPk1ldGVvciB0eXBlIHJlcGxhY2VtZW50KS5cbiAgX3Jhd05leHRPYmplY3RQcm9taXNlOiBmdW5jdGlvbiAoKSB7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHNlbGYuX2RiQ3Vyc29yLm5leHQoKGVyciwgZG9jKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXNvbHZlKGRvYyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFJldHVybnMgYSBQcm9taXNlIGZvciB0aGUgbmV4dCBvYmplY3QgZnJvbSB0aGUgY3Vyc29yLCBza2lwcGluZyB0aG9zZSB3aG9zZVxuICAvLyBJRHMgd2UndmUgYWxyZWFkeSBzZWVuIGFuZCByZXBsYWNpbmcgTW9uZ28gYXRvbXMgd2l0aCBNZXRlb3IgYXRvbXMuXG4gIF9uZXh0T2JqZWN0UHJvbWlzZTogYXN5bmMgZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICB2YXIgZG9jID0gYXdhaXQgc2VsZi5fcmF3TmV4dE9iamVjdFByb21pc2UoKTtcblxuICAgICAgaWYgKCFkb2MpIHJldHVybiBudWxsO1xuICAgICAgZG9jID0gcmVwbGFjZVR5cGVzKGRvYywgcmVwbGFjZU1vbmdvQXRvbVdpdGhNZXRlb3IpO1xuXG4gICAgICBpZiAoIXNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMudGFpbGFibGUgJiYgXy5oYXMoZG9jLCAnX2lkJykpIHtcbiAgICAgICAgLy8gRGlkIE1vbmdvIGdpdmUgdXMgZHVwbGljYXRlIGRvY3VtZW50cyBpbiB0aGUgc2FtZSBjdXJzb3I/IElmIHNvLFxuICAgICAgICAvLyBpZ25vcmUgdGhpcyBvbmUuIChEbyB0aGlzIGJlZm9yZSB0aGUgdHJhbnNmb3JtLCBzaW5jZSB0cmFuc2Zvcm0gbWlnaHRcbiAgICAgICAgLy8gcmV0dXJuIHNvbWUgdW5yZWxhdGVkIHZhbHVlLikgV2UgZG9uJ3QgZG8gdGhpcyBmb3IgdGFpbGFibGUgY3Vyc29ycyxcbiAgICAgICAgLy8gYmVjYXVzZSB3ZSB3YW50IHRvIG1haW50YWluIE8oMSkgbWVtb3J5IHVzYWdlLiBBbmQgaWYgdGhlcmUgaXNuJ3QgX2lkXG4gICAgICAgIC8vIGZvciBzb21lIHJlYXNvbiAobWF5YmUgaXQncyB0aGUgb3Bsb2cpLCB0aGVuIHdlIGRvbid0IGRvIHRoaXMgZWl0aGVyLlxuICAgICAgICAvLyAoQmUgY2FyZWZ1bCB0byBkbyB0aGlzIGZvciBmYWxzZXkgYnV0IGV4aXN0aW5nIF9pZCwgdGhvdWdoLilcbiAgICAgICAgaWYgKHNlbGYuX3Zpc2l0ZWRJZHMuaGFzKGRvYy5faWQpKSBjb250aW51ZTtcbiAgICAgICAgc2VsZi5fdmlzaXRlZElkcy5zZXQoZG9jLl9pZCwgdHJ1ZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChzZWxmLl90cmFuc2Zvcm0pXG4gICAgICAgIGRvYyA9IHNlbGYuX3RyYW5zZm9ybShkb2MpO1xuXG4gICAgICByZXR1cm4gZG9jO1xuICAgIH1cbiAgfSxcblxuICAvLyBSZXR1cm5zIGEgcHJvbWlzZSB3aGljaCBpcyByZXNvbHZlZCB3aXRoIHRoZSBuZXh0IG9iamVjdCAobGlrZSB3aXRoXG4gIC8vIF9uZXh0T2JqZWN0UHJvbWlzZSkgb3IgcmVqZWN0ZWQgaWYgdGhlIGN1cnNvciBkb2Vzbid0IHJldHVybiB3aXRoaW5cbiAgLy8gdGltZW91dE1TIG1zLlxuICBfbmV4dE9iamVjdFByb21pc2VXaXRoVGltZW91dDogZnVuY3Rpb24gKHRpbWVvdXRNUykge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGlmICghdGltZW91dE1TKSB7XG4gICAgICByZXR1cm4gc2VsZi5fbmV4dE9iamVjdFByb21pc2UoKTtcbiAgICB9XG4gICAgY29uc3QgbmV4dE9iamVjdFByb21pc2UgPSBzZWxmLl9uZXh0T2JqZWN0UHJvbWlzZSgpO1xuICAgIGNvbnN0IHRpbWVvdXRFcnIgPSBuZXcgRXJyb3IoJ0NsaWVudC1zaWRlIHRpbWVvdXQgd2FpdGluZyBmb3IgbmV4dCBvYmplY3QnKTtcbiAgICBjb25zdCB0aW1lb3V0UHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHJlamVjdCh0aW1lb3V0RXJyKTtcbiAgICAgIH0sIHRpbWVvdXRNUyk7XG4gICAgfSk7XG4gICAgcmV0dXJuIFByb21pc2UucmFjZShbbmV4dE9iamVjdFByb21pc2UsIHRpbWVvdXRQcm9taXNlXSlcbiAgICAgIC5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIGlmIChlcnIgPT09IHRpbWVvdXRFcnIpIHtcbiAgICAgICAgICBzZWxmLmNsb3NlKCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfSk7XG4gIH0sXG5cbiAgX25leHRPYmplY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHNlbGYuX25leHRPYmplY3RQcm9taXNlKCkuYXdhaXQoKTtcbiAgfSxcblxuICBmb3JFYWNoOiBmdW5jdGlvbiAoY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBHZXQgYmFjayB0byB0aGUgYmVnaW5uaW5nLlxuICAgIHNlbGYuX3Jld2luZCgpO1xuXG4gICAgLy8gV2UgaW1wbGVtZW50IHRoZSBsb29wIG91cnNlbGYgaW5zdGVhZCBvZiB1c2luZyBzZWxmLl9kYkN1cnNvci5lYWNoLFxuICAgIC8vIGJlY2F1c2UgXCJlYWNoXCIgd2lsbCBjYWxsIGl0cyBjYWxsYmFjayBvdXRzaWRlIG9mIGEgZmliZXIgd2hpY2ggbWFrZXMgaXRcbiAgICAvLyBtdWNoIG1vcmUgY29tcGxleCB0byBtYWtlIHRoaXMgZnVuY3Rpb24gc3luY2hyb25vdXMuXG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgdmFyIGRvYyA9IHNlbGYuX25leHRPYmplY3QoKTtcbiAgICAgIGlmICghZG9jKSByZXR1cm47XG4gICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIGRvYywgaW5kZXgrKywgc2VsZi5fc2VsZkZvckl0ZXJhdGlvbik7XG4gICAgfVxuICB9LFxuXG4gIC8vIFhYWCBBbGxvdyBvdmVybGFwcGluZyBjYWxsYmFjayBleGVjdXRpb25zIGlmIGNhbGxiYWNrIHlpZWxkcy5cbiAgbWFwOiBmdW5jdGlvbiAoY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIHNlbGYuZm9yRWFjaChmdW5jdGlvbiAoZG9jLCBpbmRleCkge1xuICAgICAgcmVzLnB1c2goY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBkb2MsIGluZGV4LCBzZWxmLl9zZWxmRm9ySXRlcmF0aW9uKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbiAgfSxcblxuICBfcmV3aW5kOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8ga25vd24gdG8gYmUgc3luY2hyb25vdXNcbiAgICBzZWxmLl9kYkN1cnNvci5yZXdpbmQoKTtcblxuICAgIHNlbGYuX3Zpc2l0ZWRJZHMgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgfSxcblxuICAvLyBNb3N0bHkgdXNhYmxlIGZvciB0YWlsYWJsZSBjdXJzb3JzLlxuICBjbG9zZTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHNlbGYuX2RiQ3Vyc29yLmNsb3NlKCk7XG4gIH0sXG5cbiAgZmV0Y2g6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHNlbGYubWFwKF8uaWRlbnRpdHkpO1xuICB9LFxuXG4gIGNvdW50OiBmdW5jdGlvbiAoYXBwbHlTa2lwTGltaXQgPSBmYWxzZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gc2VsZi5fc3luY2hyb25vdXNDb3VudChhcHBseVNraXBMaW1pdCkud2FpdCgpO1xuICB9LFxuXG4gIC8vIFRoaXMgbWV0aG9kIGlzIE5PVCB3cmFwcGVkIGluIEN1cnNvci5cbiAgZ2V0UmF3T2JqZWN0czogZnVuY3Rpb24gKG9yZGVyZWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKG9yZGVyZWQpIHtcbiAgICAgIHJldHVybiBzZWxmLmZldGNoKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciByZXN1bHRzID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gICAgICBzZWxmLmZvckVhY2goZnVuY3Rpb24gKGRvYykge1xuICAgICAgICByZXN1bHRzLnNldChkb2MuX2lkLCBkb2MpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0cztcbiAgICB9XG4gIH1cbn0pO1xuXG5TeW5jaHJvbm91c0N1cnNvci5wcm90b3R5cGVbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8vIEdldCBiYWNrIHRvIHRoZSBiZWdpbm5pbmcuXG4gIHNlbGYuX3Jld2luZCgpO1xuXG4gIHJldHVybiB7XG4gICAgbmV4dCgpIHtcbiAgICAgIGNvbnN0IGRvYyA9IHNlbGYuX25leHRPYmplY3QoKTtcbiAgICAgIHJldHVybiBkb2MgPyB7XG4gICAgICAgIHZhbHVlOiBkb2NcbiAgICAgIH0gOiB7XG4gICAgICAgIGRvbmU6IHRydWVcbiAgICAgIH07XG4gICAgfVxuICB9O1xufTtcblxuLy8gVGFpbHMgdGhlIGN1cnNvciBkZXNjcmliZWQgYnkgY3Vyc29yRGVzY3JpcHRpb24sIG1vc3QgbGlrZWx5IG9uIHRoZVxuLy8gb3Bsb2cuIENhbGxzIGRvY0NhbGxiYWNrIHdpdGggZWFjaCBkb2N1bWVudCBmb3VuZC4gSWdub3JlcyBlcnJvcnMgYW5kIGp1c3Rcbi8vIHJlc3RhcnRzIHRoZSB0YWlsIG9uIGVycm9yLlxuLy9cbi8vIElmIHRpbWVvdXRNUyBpcyBzZXQsIHRoZW4gaWYgd2UgZG9uJ3QgZ2V0IGEgbmV3IGRvY3VtZW50IGV2ZXJ5IHRpbWVvdXRNUyxcbi8vIGtpbGwgYW5kIHJlc3RhcnQgdGhlIGN1cnNvci4gVGhpcyBpcyBwcmltYXJpbHkgYSB3b3JrYXJvdW5kIGZvciAjODU5OC5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUudGFpbCA9IGZ1bmN0aW9uIChjdXJzb3JEZXNjcmlwdGlvbiwgZG9jQ2FsbGJhY2ssIHRpbWVvdXRNUykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICghY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy50YWlsYWJsZSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4gb25seSB0YWlsIGEgdGFpbGFibGUgY3Vyc29yXCIpO1xuXG4gIHZhciBjdXJzb3IgPSBzZWxmLl9jcmVhdGVTeW5jaHJvbm91c0N1cnNvcihjdXJzb3JEZXNjcmlwdGlvbik7XG5cbiAgdmFyIHN0b3BwZWQgPSBmYWxzZTtcbiAgdmFyIGxhc3RUUztcbiAgdmFyIGxvb3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGRvYyA9IG51bGw7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGlmIChzdG9wcGVkKVxuICAgICAgICByZXR1cm47XG4gICAgICB0cnkge1xuICAgICAgICBkb2MgPSBjdXJzb3IuX25leHRPYmplY3RQcm9taXNlV2l0aFRpbWVvdXQodGltZW91dE1TKS5hd2FpdCgpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIC8vIFRoZXJlJ3Mgbm8gZ29vZCB3YXkgdG8gZmlndXJlIG91dCBpZiB0aGlzIHdhcyBhY3R1YWxseSBhbiBlcnJvciBmcm9tXG4gICAgICAgIC8vIE1vbmdvLCBvciBqdXN0IGNsaWVudC1zaWRlIChpbmNsdWRpbmcgb3VyIG93biB0aW1lb3V0IGVycm9yKS4gQWhcbiAgICAgICAgLy8gd2VsbC4gQnV0IGVpdGhlciB3YXksIHdlIG5lZWQgdG8gcmV0cnkgdGhlIGN1cnNvciAodW5sZXNzIHRoZSBmYWlsdXJlXG4gICAgICAgIC8vIHdhcyBiZWNhdXNlIHRoZSBvYnNlcnZlIGdvdCBzdG9wcGVkKS5cbiAgICAgICAgZG9jID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIC8vIFNpbmNlIHdlIGF3YWl0ZWQgYSBwcm9taXNlIGFib3ZlLCB3ZSBuZWVkIHRvIGNoZWNrIGFnYWluIHRvIHNlZSBpZlxuICAgICAgLy8gd2UndmUgYmVlbiBzdG9wcGVkIGJlZm9yZSBjYWxsaW5nIHRoZSBjYWxsYmFjay5cbiAgICAgIGlmIChzdG9wcGVkKVxuICAgICAgICByZXR1cm47XG4gICAgICBpZiAoZG9jKSB7XG4gICAgICAgIC8vIElmIGEgdGFpbGFibGUgY3Vyc29yIGNvbnRhaW5zIGEgXCJ0c1wiIGZpZWxkLCB1c2UgaXQgdG8gcmVjcmVhdGUgdGhlXG4gICAgICAgIC8vIGN1cnNvciBvbiBlcnJvci4gKFwidHNcIiBpcyBhIHN0YW5kYXJkIHRoYXQgTW9uZ28gdXNlcyBpbnRlcm5hbGx5IGZvclxuICAgICAgICAvLyB0aGUgb3Bsb2csIGFuZCB0aGVyZSdzIGEgc3BlY2lhbCBmbGFnIHRoYXQgbGV0cyB5b3UgZG8gYmluYXJ5IHNlYXJjaFxuICAgICAgICAvLyBvbiBpdCBpbnN0ZWFkIG9mIG5lZWRpbmcgdG8gdXNlIGFuIGluZGV4LilcbiAgICAgICAgbGFzdFRTID0gZG9jLnRzO1xuICAgICAgICBkb2NDYWxsYmFjayhkb2MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIG5ld1NlbGVjdG9yID0gXy5jbG9uZShjdXJzb3JEZXNjcmlwdGlvbi5zZWxlY3Rvcik7XG4gICAgICAgIGlmIChsYXN0VFMpIHtcbiAgICAgICAgICBuZXdTZWxlY3Rvci50cyA9IHskZ3Q6IGxhc3RUU307XG4gICAgICAgIH1cbiAgICAgICAgY3Vyc29yID0gc2VsZi5fY3JlYXRlU3luY2hyb25vdXNDdXJzb3IobmV3IEN1cnNvckRlc2NyaXB0aW9uKFxuICAgICAgICAgIGN1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lLFxuICAgICAgICAgIG5ld1NlbGVjdG9yLFxuICAgICAgICAgIGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMpKTtcbiAgICAgICAgLy8gTW9uZ28gZmFpbG92ZXIgdGFrZXMgbWFueSBzZWNvbmRzLiAgUmV0cnkgaW4gYSBiaXQuICAoV2l0aG91dCB0aGlzXG4gICAgICAgIC8vIHNldFRpbWVvdXQsIHdlIHBlZyB0aGUgQ1BVIGF0IDEwMCUgYW5kIG5ldmVyIG5vdGljZSB0aGUgYWN0dWFsXG4gICAgICAgIC8vIGZhaWxvdmVyLlxuICAgICAgICBNZXRlb3Iuc2V0VGltZW91dChsb29wLCAxMDApO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgTWV0ZW9yLmRlZmVyKGxvb3ApO1xuXG4gIHJldHVybiB7XG4gICAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgICAgc3RvcHBlZCA9IHRydWU7XG4gICAgICBjdXJzb3IuY2xvc2UoKTtcbiAgICB9XG4gIH07XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9vYnNlcnZlQ2hhbmdlcyA9IGZ1bmN0aW9uIChcbiAgICBjdXJzb3JEZXNjcmlwdGlvbiwgb3JkZXJlZCwgY2FsbGJhY2tzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy50YWlsYWJsZSkge1xuICAgIHJldHVybiBzZWxmLl9vYnNlcnZlQ2hhbmdlc1RhaWxhYmxlKGN1cnNvckRlc2NyaXB0aW9uLCBvcmRlcmVkLCBjYWxsYmFja3MpO1xuICB9XG5cbiAgLy8gWW91IG1heSBub3QgZmlsdGVyIG91dCBfaWQgd2hlbiBvYnNlcnZpbmcgY2hhbmdlcywgYmVjYXVzZSB0aGUgaWQgaXMgYSBjb3JlXG4gIC8vIHBhcnQgb2YgdGhlIG9ic2VydmVDaGFuZ2VzIEFQSS5cbiAgaWYgKGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMuZmllbGRzICYmXG4gICAgICAoY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5maWVsZHMuX2lkID09PSAwIHx8XG4gICAgICAgY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5maWVsZHMuX2lkID09PSBmYWxzZSkpIHtcbiAgICB0aHJvdyBFcnJvcihcIllvdSBtYXkgbm90IG9ic2VydmUgYSBjdXJzb3Igd2l0aCB7ZmllbGRzOiB7X2lkOiAwfX1cIik7XG4gIH1cblxuICB2YXIgb2JzZXJ2ZUtleSA9IEVKU09OLnN0cmluZ2lmeShcbiAgICBfLmV4dGVuZCh7b3JkZXJlZDogb3JkZXJlZH0sIGN1cnNvckRlc2NyaXB0aW9uKSk7XG5cbiAgdmFyIG11bHRpcGxleGVyLCBvYnNlcnZlRHJpdmVyO1xuICB2YXIgZmlyc3RIYW5kbGUgPSBmYWxzZTtcblxuICAvLyBGaW5kIGEgbWF0Y2hpbmcgT2JzZXJ2ZU11bHRpcGxleGVyLCBvciBjcmVhdGUgYSBuZXcgb25lLiBUaGlzIG5leHQgYmxvY2sgaXNcbiAgLy8gZ3VhcmFudGVlZCB0byBub3QgeWllbGQgKGFuZCBpdCBkb2Vzbid0IGNhbGwgYW55dGhpbmcgdGhhdCBjYW4gb2JzZXJ2ZSBhXG4gIC8vIG5ldyBxdWVyeSksIHNvIG5vIG90aGVyIGNhbGxzIHRvIHRoaXMgZnVuY3Rpb24gY2FuIGludGVybGVhdmUgd2l0aCBpdC5cbiAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgIGlmIChfLmhhcyhzZWxmLl9vYnNlcnZlTXVsdGlwbGV4ZXJzLCBvYnNlcnZlS2V5KSkge1xuICAgICAgbXVsdGlwbGV4ZXIgPSBzZWxmLl9vYnNlcnZlTXVsdGlwbGV4ZXJzW29ic2VydmVLZXldO1xuICAgIH0gZWxzZSB7XG4gICAgICBmaXJzdEhhbmRsZSA9IHRydWU7XG4gICAgICAvLyBDcmVhdGUgYSBuZXcgT2JzZXJ2ZU11bHRpcGxleGVyLlxuICAgICAgbXVsdGlwbGV4ZXIgPSBuZXcgT2JzZXJ2ZU11bHRpcGxleGVyKHtcbiAgICAgICAgb3JkZXJlZDogb3JkZXJlZCxcbiAgICAgICAgb25TdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgZGVsZXRlIHNlbGYuX29ic2VydmVNdWx0aXBsZXhlcnNbb2JzZXJ2ZUtleV07XG4gICAgICAgICAgb2JzZXJ2ZURyaXZlci5zdG9wKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgc2VsZi5fb2JzZXJ2ZU11bHRpcGxleGVyc1tvYnNlcnZlS2V5XSA9IG11bHRpcGxleGVyO1xuICAgIH1cbiAgfSk7XG5cbiAgdmFyIG9ic2VydmVIYW5kbGUgPSBuZXcgT2JzZXJ2ZUhhbmRsZShtdWx0aXBsZXhlciwgY2FsbGJhY2tzKTtcblxuICBpZiAoZmlyc3RIYW5kbGUpIHtcbiAgICB2YXIgbWF0Y2hlciwgc29ydGVyO1xuICAgIHZhciBjYW5Vc2VPcGxvZyA9IF8uYWxsKFtcbiAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gQXQgYSBiYXJlIG1pbmltdW0sIHVzaW5nIHRoZSBvcGxvZyByZXF1aXJlcyB1cyB0byBoYXZlIGFuIG9wbG9nLCB0b1xuICAgICAgICAvLyB3YW50IHVub3JkZXJlZCBjYWxsYmFja3MsIGFuZCB0byBub3Qgd2FudCBhIGNhbGxiYWNrIG9uIHRoZSBwb2xsc1xuICAgICAgICAvLyB0aGF0IHdvbid0IGhhcHBlbi5cbiAgICAgICAgcmV0dXJuIHNlbGYuX29wbG9nSGFuZGxlICYmICFvcmRlcmVkICYmXG4gICAgICAgICAgIWNhbGxiYWNrcy5fdGVzdE9ubHlQb2xsQ2FsbGJhY2s7XG4gICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIFdlIG5lZWQgdG8gYmUgYWJsZSB0byBjb21waWxlIHRoZSBzZWxlY3Rvci4gRmFsbCBiYWNrIHRvIHBvbGxpbmcgZm9yXG4gICAgICAgIC8vIHNvbWUgbmV3ZmFuZ2xlZCAkc2VsZWN0b3IgdGhhdCBtaW5pbW9uZ28gZG9lc24ndCBzdXBwb3J0IHlldC5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKGN1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIC8vIFhYWCBtYWtlIGFsbCBjb21waWxhdGlvbiBlcnJvcnMgTWluaW1vbmdvRXJyb3Igb3Igc29tZXRoaW5nXG4gICAgICAgICAgLy8gICAgIHNvIHRoYXQgdGhpcyBkb2Vzbid0IGlnbm9yZSB1bnJlbGF0ZWQgZXhjZXB0aW9uc1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyAuLi4gYW5kIHRoZSBzZWxlY3RvciBpdHNlbGYgbmVlZHMgdG8gc3VwcG9ydCBvcGxvZy5cbiAgICAgICAgcmV0dXJuIE9wbG9nT2JzZXJ2ZURyaXZlci5jdXJzb3JTdXBwb3J0ZWQoY3Vyc29yRGVzY3JpcHRpb24sIG1hdGNoZXIpO1xuICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBBbmQgd2UgbmVlZCB0byBiZSBhYmxlIHRvIGNvbXBpbGUgdGhlIHNvcnQsIGlmIGFueS4gIGVnLCBjYW4ndCBiZVxuICAgICAgICAvLyB7JG5hdHVyYWw6IDF9LlxuICAgICAgICBpZiAoIWN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMuc29ydClcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBzb3J0ZXIgPSBuZXcgTWluaW1vbmdvLlNvcnRlcihjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnNvcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBtYXRjaGVyOiBtYXRjaGVyIH0pO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgLy8gWFhYIG1ha2UgYWxsIGNvbXBpbGF0aW9uIGVycm9ycyBNaW5pbW9uZ29FcnJvciBvciBzb21ldGhpbmdcbiAgICAgICAgICAvLyAgICAgc28gdGhhdCB0aGlzIGRvZXNuJ3QgaWdub3JlIHVucmVsYXRlZCBleGNlcHRpb25zXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XSwgZnVuY3Rpb24gKGYpIHsgcmV0dXJuIGYoKTsgfSk7ICAvLyBpbnZva2UgZWFjaCBmdW5jdGlvblxuXG4gICAgdmFyIGRyaXZlckNsYXNzID0gY2FuVXNlT3Bsb2cgPyBPcGxvZ09ic2VydmVEcml2ZXIgOiBQb2xsaW5nT2JzZXJ2ZURyaXZlcjtcbiAgICBvYnNlcnZlRHJpdmVyID0gbmV3IGRyaXZlckNsYXNzKHtcbiAgICAgIGN1cnNvckRlc2NyaXB0aW9uOiBjdXJzb3JEZXNjcmlwdGlvbixcbiAgICAgIG1vbmdvSGFuZGxlOiBzZWxmLFxuICAgICAgbXVsdGlwbGV4ZXI6IG11bHRpcGxleGVyLFxuICAgICAgb3JkZXJlZDogb3JkZXJlZCxcbiAgICAgIG1hdGNoZXI6IG1hdGNoZXIsICAvLyBpZ25vcmVkIGJ5IHBvbGxpbmdcbiAgICAgIHNvcnRlcjogc29ydGVyLCAgLy8gaWdub3JlZCBieSBwb2xsaW5nXG4gICAgICBfdGVzdE9ubHlQb2xsQ2FsbGJhY2s6IGNhbGxiYWNrcy5fdGVzdE9ubHlQb2xsQ2FsbGJhY2tcbiAgICB9KTtcblxuICAgIC8vIFRoaXMgZmllbGQgaXMgb25seSBzZXQgZm9yIHVzZSBpbiB0ZXN0cy5cbiAgICBtdWx0aXBsZXhlci5fb2JzZXJ2ZURyaXZlciA9IG9ic2VydmVEcml2ZXI7XG4gIH1cblxuICAvLyBCbG9ja3MgdW50aWwgdGhlIGluaXRpYWwgYWRkcyBoYXZlIGJlZW4gc2VudC5cbiAgbXVsdGlwbGV4ZXIuYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzKG9ic2VydmVIYW5kbGUpO1xuXG4gIHJldHVybiBvYnNlcnZlSGFuZGxlO1xufTtcblxuLy8gTGlzdGVuIGZvciB0aGUgaW52YWxpZGF0aW9uIG1lc3NhZ2VzIHRoYXQgd2lsbCB0cmlnZ2VyIHVzIHRvIHBvbGwgdGhlXG4vLyBkYXRhYmFzZSBmb3IgY2hhbmdlcy4gSWYgdGhpcyBzZWxlY3RvciBzcGVjaWZpZXMgc3BlY2lmaWMgSURzLCBzcGVjaWZ5IHRoZW1cbi8vIGhlcmUsIHNvIHRoYXQgdXBkYXRlcyB0byBkaWZmZXJlbnQgc3BlY2lmaWMgSURzIGRvbid0IGNhdXNlIHVzIHRvIHBvbGwuXG4vLyBsaXN0ZW5DYWxsYmFjayBpcyB0aGUgc2FtZSBraW5kIG9mIChub3RpZmljYXRpb24sIGNvbXBsZXRlKSBjYWxsYmFjayBwYXNzZWRcbi8vIHRvIEludmFsaWRhdGlvbkNyb3NzYmFyLmxpc3Rlbi5cblxubGlzdGVuQWxsID0gZnVuY3Rpb24gKGN1cnNvckRlc2NyaXB0aW9uLCBsaXN0ZW5DYWxsYmFjaykge1xuICB2YXIgbGlzdGVuZXJzID0gW107XG4gIGZvckVhY2hUcmlnZ2VyKGN1cnNvckRlc2NyaXB0aW9uLCBmdW5jdGlvbiAodHJpZ2dlcikge1xuICAgIGxpc3RlbmVycy5wdXNoKEREUFNlcnZlci5fSW52YWxpZGF0aW9uQ3Jvc3NiYXIubGlzdGVuKFxuICAgICAgdHJpZ2dlciwgbGlzdGVuQ2FsbGJhY2spKTtcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBzdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgICBfLmVhY2gobGlzdGVuZXJzLCBmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgbGlzdGVuZXIuc3RvcCgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xufTtcblxuZm9yRWFjaFRyaWdnZXIgPSBmdW5jdGlvbiAoY3Vyc29yRGVzY3JpcHRpb24sIHRyaWdnZXJDYWxsYmFjaykge1xuICB2YXIga2V5ID0ge2NvbGxlY3Rpb246IGN1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lfTtcbiAgdmFyIHNwZWNpZmljSWRzID0gTG9jYWxDb2xsZWN0aW9uLl9pZHNNYXRjaGVkQnlTZWxlY3RvcihcbiAgICBjdXJzb3JEZXNjcmlwdGlvbi5zZWxlY3Rvcik7XG4gIGlmIChzcGVjaWZpY0lkcykge1xuICAgIF8uZWFjaChzcGVjaWZpY0lkcywgZnVuY3Rpb24gKGlkKSB7XG4gICAgICB0cmlnZ2VyQ2FsbGJhY2soXy5leHRlbmQoe2lkOiBpZH0sIGtleSkpO1xuICAgIH0pO1xuICAgIHRyaWdnZXJDYWxsYmFjayhfLmV4dGVuZCh7ZHJvcENvbGxlY3Rpb246IHRydWUsIGlkOiBudWxsfSwga2V5KSk7XG4gIH0gZWxzZSB7XG4gICAgdHJpZ2dlckNhbGxiYWNrKGtleSk7XG4gIH1cbiAgLy8gRXZlcnlvbmUgY2FyZXMgYWJvdXQgdGhlIGRhdGFiYXNlIGJlaW5nIGRyb3BwZWQuXG4gIHRyaWdnZXJDYWxsYmFjayh7IGRyb3BEYXRhYmFzZTogdHJ1ZSB9KTtcbn07XG5cbi8vIG9ic2VydmVDaGFuZ2VzIGZvciB0YWlsYWJsZSBjdXJzb3JzIG9uIGNhcHBlZCBjb2xsZWN0aW9ucy5cbi8vXG4vLyBTb21lIGRpZmZlcmVuY2VzIGZyb20gbm9ybWFsIGN1cnNvcnM6XG4vLyAgIC0gV2lsbCBuZXZlciBwcm9kdWNlIGFueXRoaW5nIG90aGVyIHRoYW4gJ2FkZGVkJyBvciAnYWRkZWRCZWZvcmUnLiBJZiB5b3Vcbi8vICAgICBkbyB1cGRhdGUgYSBkb2N1bWVudCB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gcHJvZHVjZWQsIHRoaXMgd2lsbCBub3Qgbm90aWNlXG4vLyAgICAgaXQuXG4vLyAgIC0gSWYgeW91IGRpc2Nvbm5lY3QgYW5kIHJlY29ubmVjdCBmcm9tIE1vbmdvLCBpdCB3aWxsIGVzc2VudGlhbGx5IHJlc3RhcnRcbi8vICAgICB0aGUgcXVlcnksIHdoaWNoIHdpbGwgbGVhZCB0byBkdXBsaWNhdGUgcmVzdWx0cy4gVGhpcyBpcyBwcmV0dHkgYmFkLFxuLy8gICAgIGJ1dCBpZiB5b3UgaW5jbHVkZSBhIGZpZWxkIGNhbGxlZCAndHMnIHdoaWNoIGlzIGluc2VydGVkIGFzXG4vLyAgICAgbmV3IE1vbmdvSW50ZXJuYWxzLk1vbmdvVGltZXN0YW1wKDAsIDApICh3aGljaCBpcyBpbml0aWFsaXplZCB0byB0aGVcbi8vICAgICBjdXJyZW50IE1vbmdvLXN0eWxlIHRpbWVzdGFtcCksIHdlJ2xsIGJlIGFibGUgdG8gZmluZCB0aGUgcGxhY2UgdG9cbi8vICAgICByZXN0YXJ0IHByb3Blcmx5LiAoVGhpcyBmaWVsZCBpcyBzcGVjaWZpY2FsbHkgdW5kZXJzdG9vZCBieSBNb25nbyB3aXRoIGFuXG4vLyAgICAgb3B0aW1pemF0aW9uIHdoaWNoIGFsbG93cyBpdCB0byBmaW5kIHRoZSByaWdodCBwbGFjZSB0byBzdGFydCB3aXRob3V0XG4vLyAgICAgYW4gaW5kZXggb24gdHMuIEl0J3MgaG93IHRoZSBvcGxvZyB3b3Jrcy4pXG4vLyAgIC0gTm8gY2FsbGJhY2tzIGFyZSB0cmlnZ2VyZWQgc3luY2hyb25vdXNseSB3aXRoIHRoZSBjYWxsICh0aGVyZSdzIG5vXG4vLyAgICAgZGlmZmVyZW50aWF0aW9uIGJldHdlZW4gXCJpbml0aWFsIGRhdGFcIiBhbmQgXCJsYXRlciBjaGFuZ2VzXCI7IGV2ZXJ5dGhpbmdcbi8vICAgICB0aGF0IG1hdGNoZXMgdGhlIHF1ZXJ5IGdldHMgc2VudCBhc3luY2hyb25vdXNseSkuXG4vLyAgIC0gRGUtZHVwbGljYXRpb24gaXMgbm90IGltcGxlbWVudGVkLlxuLy8gICAtIERvZXMgbm90IHlldCBpbnRlcmFjdCB3aXRoIHRoZSB3cml0ZSBmZW5jZS4gUHJvYmFibHksIHRoaXMgc2hvdWxkIHdvcmsgYnlcbi8vICAgICBpZ25vcmluZyByZW1vdmVzICh3aGljaCBkb24ndCB3b3JrIG9uIGNhcHBlZCBjb2xsZWN0aW9ucykgYW5kIHVwZGF0ZXNcbi8vICAgICAod2hpY2ggZG9uJ3QgYWZmZWN0IHRhaWxhYmxlIGN1cnNvcnMpLCBhbmQganVzdCBrZWVwaW5nIHRyYWNrIG9mIHRoZSBJRFxuLy8gICAgIG9mIHRoZSBpbnNlcnRlZCBvYmplY3QsIGFuZCBjbG9zaW5nIHRoZSB3cml0ZSBmZW5jZSBvbmNlIHlvdSBnZXQgdG8gdGhhdFxuLy8gICAgIElEIChvciB0aW1lc3RhbXA/KS4gIFRoaXMgZG9lc24ndCB3b3JrIHdlbGwgaWYgdGhlIGRvY3VtZW50IGRvZXNuJ3QgbWF0Y2hcbi8vICAgICB0aGUgcXVlcnksIHRob3VnaC4gIE9uIHRoZSBvdGhlciBoYW5kLCB0aGUgd3JpdGUgZmVuY2UgY2FuIGNsb3NlXG4vLyAgICAgaW1tZWRpYXRlbHkgaWYgaXQgZG9lcyBub3QgbWF0Y2ggdGhlIHF1ZXJ5LiBTbyBpZiB3ZSB0cnVzdCBtaW5pbW9uZ29cbi8vICAgICBlbm91Z2ggdG8gYWNjdXJhdGVseSBldmFsdWF0ZSB0aGUgcXVlcnkgYWdhaW5zdCB0aGUgd3JpdGUgZmVuY2UsIHdlXG4vLyAgICAgc2hvdWxkIGJlIGFibGUgdG8gZG8gdGhpcy4uLiAgT2YgY291cnNlLCBtaW5pbW9uZ28gZG9lc24ndCBldmVuIHN1cHBvcnRcbi8vICAgICBNb25nbyBUaW1lc3RhbXBzIHlldC5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX29ic2VydmVDaGFuZ2VzVGFpbGFibGUgPSBmdW5jdGlvbiAoXG4gICAgY3Vyc29yRGVzY3JpcHRpb24sIG9yZGVyZWQsIGNhbGxiYWNrcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgLy8gVGFpbGFibGUgY3Vyc29ycyBvbmx5IGV2ZXIgY2FsbCBhZGRlZC9hZGRlZEJlZm9yZSBjYWxsYmFja3MsIHNvIGl0J3MgYW5cbiAgLy8gZXJyb3IgaWYgeW91IGRpZG4ndCBwcm92aWRlIHRoZW0uXG4gIGlmICgob3JkZXJlZCAmJiAhY2FsbGJhY2tzLmFkZGVkQmVmb3JlKSB8fFxuICAgICAgKCFvcmRlcmVkICYmICFjYWxsYmFja3MuYWRkZWQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3Qgb2JzZXJ2ZSBhbiBcIiArIChvcmRlcmVkID8gXCJvcmRlcmVkXCIgOiBcInVub3JkZXJlZFwiKVxuICAgICAgICAgICAgICAgICAgICArIFwiIHRhaWxhYmxlIGN1cnNvciB3aXRob3V0IGEgXCJcbiAgICAgICAgICAgICAgICAgICAgKyAob3JkZXJlZCA/IFwiYWRkZWRCZWZvcmVcIiA6IFwiYWRkZWRcIikgKyBcIiBjYWxsYmFja1wiKTtcbiAgfVxuXG4gIHJldHVybiBzZWxmLnRhaWwoY3Vyc29yRGVzY3JpcHRpb24sIGZ1bmN0aW9uIChkb2MpIHtcbiAgICB2YXIgaWQgPSBkb2MuX2lkO1xuICAgIGRlbGV0ZSBkb2MuX2lkO1xuICAgIC8vIFRoZSB0cyBpcyBhbiBpbXBsZW1lbnRhdGlvbiBkZXRhaWwuIEhpZGUgaXQuXG4gICAgZGVsZXRlIGRvYy50cztcbiAgICBpZiAob3JkZXJlZCkge1xuICAgICAgY2FsbGJhY2tzLmFkZGVkQmVmb3JlKGlkLCBkb2MsIG51bGwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYWxsYmFja3MuYWRkZWQoaWQsIGRvYyk7XG4gICAgfVxuICB9KTtcbn07XG5cbi8vIFhYWCBXZSBwcm9iYWJseSBuZWVkIHRvIGZpbmQgYSBiZXR0ZXIgd2F5IHRvIGV4cG9zZSB0aGlzLiBSaWdodCBub3dcbi8vIGl0J3Mgb25seSB1c2VkIGJ5IHRlc3RzLCBidXQgaW4gZmFjdCB5b3UgbmVlZCBpdCBpbiBub3JtYWxcbi8vIG9wZXJhdGlvbiB0byBpbnRlcmFjdCB3aXRoIGNhcHBlZCBjb2xsZWN0aW9ucy5cbk1vbmdvSW50ZXJuYWxzLk1vbmdvVGltZXN0YW1wID0gTW9uZ29EQi5UaW1lc3RhbXA7XG5cbk1vbmdvSW50ZXJuYWxzLkNvbm5lY3Rpb24gPSBNb25nb0Nvbm5lY3Rpb247XG4iLCJ2YXIgRnV0dXJlID0gTnBtLnJlcXVpcmUoJ2ZpYmVycy9mdXR1cmUnKTtcblxuT1BMT0dfQ09MTEVDVElPTiA9ICdvcGxvZy5ycyc7XG5cbnZhciBUT09fRkFSX0JFSElORCA9IHByb2Nlc3MuZW52Lk1FVEVPUl9PUExPR19UT09fRkFSX0JFSElORCB8fCAyMDAwO1xudmFyIFRBSUxfVElNRU9VVCA9ICtwcm9jZXNzLmVudi5NRVRFT1JfT1BMT0dfVEFJTF9USU1FT1VUIHx8IDMwMDAwO1xuXG52YXIgc2hvd1RTID0gZnVuY3Rpb24gKHRzKSB7XG4gIHJldHVybiBcIlRpbWVzdGFtcChcIiArIHRzLmdldEhpZ2hCaXRzKCkgKyBcIiwgXCIgKyB0cy5nZXRMb3dCaXRzKCkgKyBcIilcIjtcbn07XG5cbmlkRm9yT3AgPSBmdW5jdGlvbiAob3ApIHtcbiAgaWYgKG9wLm9wID09PSAnZCcpXG4gICAgcmV0dXJuIG9wLm8uX2lkO1xuICBlbHNlIGlmIChvcC5vcCA9PT0gJ2knKVxuICAgIHJldHVybiBvcC5vLl9pZDtcbiAgZWxzZSBpZiAob3Aub3AgPT09ICd1JylcbiAgICByZXR1cm4gb3AubzIuX2lkO1xuICBlbHNlIGlmIChvcC5vcCA9PT0gJ2MnKVxuICAgIHRocm93IEVycm9yKFwiT3BlcmF0b3IgJ2MnIGRvZXNuJ3Qgc3VwcGx5IGFuIG9iamVjdCB3aXRoIGlkOiBcIiArXG4gICAgICAgICAgICAgICAgRUpTT04uc3RyaW5naWZ5KG9wKSk7XG4gIGVsc2VcbiAgICB0aHJvdyBFcnJvcihcIlVua25vd24gb3A6IFwiICsgRUpTT04uc3RyaW5naWZ5KG9wKSk7XG59O1xuXG5PcGxvZ0hhbmRsZSA9IGZ1bmN0aW9uIChvcGxvZ1VybCwgZGJOYW1lKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5fb3Bsb2dVcmwgPSBvcGxvZ1VybDtcbiAgc2VsZi5fZGJOYW1lID0gZGJOYW1lO1xuXG4gIHNlbGYuX29wbG9nTGFzdEVudHJ5Q29ubmVjdGlvbiA9IG51bGw7XG4gIHNlbGYuX29wbG9nVGFpbENvbm5lY3Rpb24gPSBudWxsO1xuICBzZWxmLl9zdG9wcGVkID0gZmFsc2U7XG4gIHNlbGYuX3RhaWxIYW5kbGUgPSBudWxsO1xuICBzZWxmLl9yZWFkeUZ1dHVyZSA9IG5ldyBGdXR1cmUoKTtcbiAgc2VsZi5fY3Jvc3NiYXIgPSBuZXcgRERQU2VydmVyLl9Dcm9zc2Jhcih7XG4gICAgZmFjdFBhY2thZ2U6IFwibW9uZ28tbGl2ZWRhdGFcIiwgZmFjdE5hbWU6IFwib3Bsb2ctd2F0Y2hlcnNcIlxuICB9KTtcbiAgc2VsZi5fYmFzZU9wbG9nU2VsZWN0b3IgPSB7XG4gICAgbnM6IG5ldyBSZWdFeHAoJ14nICsgTWV0ZW9yLl9lc2NhcGVSZWdFeHAoc2VsZi5fZGJOYW1lKSArICdcXFxcLicpLFxuICAgICRvcjogW1xuICAgICAgeyBvcDogeyRpbjogWydpJywgJ3UnLCAnZCddfSB9LFxuICAgICAgLy8gZHJvcCBjb2xsZWN0aW9uXG4gICAgICB7IG9wOiAnYycsICdvLmRyb3AnOiB7ICRleGlzdHM6IHRydWUgfSB9LFxuICAgICAgeyBvcDogJ2MnLCAnby5kcm9wRGF0YWJhc2UnOiAxIH0sXG4gICAgXVxuICB9O1xuXG4gIC8vIERhdGEgc3RydWN0dXJlcyB0byBzdXBwb3J0IHdhaXRVbnRpbENhdWdodFVwKCkuIEVhY2ggb3Bsb2cgZW50cnkgaGFzIGFcbiAgLy8gTW9uZ29UaW1lc3RhbXAgb2JqZWN0IG9uIGl0ICh3aGljaCBpcyBub3QgdGhlIHNhbWUgYXMgYSBEYXRlIC0tLSBpdCdzIGFcbiAgLy8gY29tYmluYXRpb24gb2YgdGltZSBhbmQgYW4gaW5jcmVtZW50aW5nIGNvdW50ZXI7IHNlZVxuICAvLyBodHRwOi8vZG9jcy5tb25nb2RiLm9yZy9tYW51YWwvcmVmZXJlbmNlL2Jzb24tdHlwZXMvI3RpbWVzdGFtcHMpLlxuICAvL1xuICAvLyBfY2F0Y2hpbmdVcEZ1dHVyZXMgaXMgYW4gYXJyYXkgb2Yge3RzOiBNb25nb1RpbWVzdGFtcCwgZnV0dXJlOiBGdXR1cmV9XG4gIC8vIG9iamVjdHMsIHNvcnRlZCBieSBhc2NlbmRpbmcgdGltZXN0YW1wLiBfbGFzdFByb2Nlc3NlZFRTIGlzIHRoZVxuICAvLyBNb25nb1RpbWVzdGFtcCBvZiB0aGUgbGFzdCBvcGxvZyBlbnRyeSB3ZSd2ZSBwcm9jZXNzZWQuXG4gIC8vXG4gIC8vIEVhY2ggdGltZSB3ZSBjYWxsIHdhaXRVbnRpbENhdWdodFVwLCB3ZSB0YWtlIGEgcGVlayBhdCB0aGUgZmluYWwgb3Bsb2dcbiAgLy8gZW50cnkgaW4gdGhlIGRiLiAgSWYgd2UndmUgYWxyZWFkeSBwcm9jZXNzZWQgaXQgKGllLCBpdCBpcyBub3QgZ3JlYXRlciB0aGFuXG4gIC8vIF9sYXN0UHJvY2Vzc2VkVFMpLCB3YWl0VW50aWxDYXVnaHRVcCBpbW1lZGlhdGVseSByZXR1cm5zLiBPdGhlcndpc2UsXG4gIC8vIHdhaXRVbnRpbENhdWdodFVwIG1ha2VzIGEgbmV3IEZ1dHVyZSBhbmQgaW5zZXJ0cyBpdCBhbG9uZyB3aXRoIHRoZSBmaW5hbFxuICAvLyB0aW1lc3RhbXAgZW50cnkgdGhhdCBpdCByZWFkLCBpbnRvIF9jYXRjaGluZ1VwRnV0dXJlcy4gd2FpdFVudGlsQ2F1Z2h0VXBcbiAgLy8gdGhlbiB3YWl0cyBvbiB0aGF0IGZ1dHVyZSwgd2hpY2ggaXMgcmVzb2x2ZWQgb25jZSBfbGFzdFByb2Nlc3NlZFRTIGlzXG4gIC8vIGluY3JlbWVudGVkIHRvIGJlIHBhc3QgaXRzIHRpbWVzdGFtcCBieSB0aGUgd29ya2VyIGZpYmVyLlxuICAvL1xuICAvLyBYWFggdXNlIGEgcHJpb3JpdHkgcXVldWUgb3Igc29tZXRoaW5nIGVsc2UgdGhhdCdzIGZhc3RlciB0aGFuIGFuIGFycmF5XG4gIHNlbGYuX2NhdGNoaW5nVXBGdXR1cmVzID0gW107XG4gIHNlbGYuX2xhc3RQcm9jZXNzZWRUUyA9IG51bGw7XG5cbiAgc2VsZi5fb25Ta2lwcGVkRW50cmllc0hvb2sgPSBuZXcgSG9vayh7XG4gICAgZGVidWdQcmludEV4Y2VwdGlvbnM6IFwib25Ta2lwcGVkRW50cmllcyBjYWxsYmFja1wiXG4gIH0pO1xuXG4gIHNlbGYuX2VudHJ5UXVldWUgPSBuZXcgTWV0ZW9yLl9Eb3VibGVFbmRlZFF1ZXVlKCk7XG4gIHNlbGYuX3dvcmtlckFjdGl2ZSA9IGZhbHNlO1xuXG4gIHNlbGYuX3N0YXJ0VGFpbGluZygpO1xufTtcblxuXy5leHRlbmQoT3Bsb2dIYW5kbGUucHJvdG90eXBlLCB7XG4gIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICByZXR1cm47XG4gICAgc2VsZi5fc3RvcHBlZCA9IHRydWU7XG4gICAgaWYgKHNlbGYuX3RhaWxIYW5kbGUpXG4gICAgICBzZWxmLl90YWlsSGFuZGxlLnN0b3AoKTtcbiAgICAvLyBYWFggc2hvdWxkIGNsb3NlIGNvbm5lY3Rpb25zIHRvb1xuICB9LFxuICBvbk9wbG9nRW50cnk6IGZ1bmN0aW9uICh0cmlnZ2VyLCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbGxlZCBvbk9wbG9nRW50cnkgb24gc3RvcHBlZCBoYW5kbGUhXCIpO1xuXG4gICAgLy8gQ2FsbGluZyBvbk9wbG9nRW50cnkgcmVxdWlyZXMgdXMgdG8gd2FpdCBmb3IgdGhlIHRhaWxpbmcgdG8gYmUgcmVhZHkuXG4gICAgc2VsZi5fcmVhZHlGdXR1cmUud2FpdCgpO1xuXG4gICAgdmFyIG9yaWdpbmFsQ2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICBjYWxsYmFjayA9IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoZnVuY3Rpb24gKG5vdGlmaWNhdGlvbikge1xuICAgICAgb3JpZ2luYWxDYWxsYmFjayhub3RpZmljYXRpb24pO1xuICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgIE1ldGVvci5fZGVidWcoXCJFcnJvciBpbiBvcGxvZyBjYWxsYmFja1wiLCBlcnIpO1xuICAgIH0pO1xuICAgIHZhciBsaXN0ZW5IYW5kbGUgPSBzZWxmLl9jcm9zc2Jhci5saXN0ZW4odHJpZ2dlciwgY2FsbGJhY2spO1xuICAgIHJldHVybiB7XG4gICAgICBzdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxpc3RlbkhhbmRsZS5zdG9wKCk7XG4gICAgICB9XG4gICAgfTtcbiAgfSxcbiAgLy8gUmVnaXN0ZXIgYSBjYWxsYmFjayB0byBiZSBpbnZva2VkIGFueSB0aW1lIHdlIHNraXAgb3Bsb2cgZW50cmllcyAoZWcsXG4gIC8vIGJlY2F1c2Ugd2UgYXJlIHRvbyBmYXIgYmVoaW5kKS5cbiAgb25Ta2lwcGVkRW50cmllczogZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGVkIG9uU2tpcHBlZEVudHJpZXMgb24gc3RvcHBlZCBoYW5kbGUhXCIpO1xuICAgIHJldHVybiBzZWxmLl9vblNraXBwZWRFbnRyaWVzSG9vay5yZWdpc3RlcihjYWxsYmFjayk7XG4gIH0sXG4gIC8vIENhbGxzIGBjYWxsYmFja2Agb25jZSB0aGUgb3Bsb2cgaGFzIGJlZW4gcHJvY2Vzc2VkIHVwIHRvIGEgcG9pbnQgdGhhdCBpc1xuICAvLyByb3VnaGx5IFwibm93XCI6IHNwZWNpZmljYWxseSwgb25jZSB3ZSd2ZSBwcm9jZXNzZWQgYWxsIG9wcyB0aGF0IGFyZVxuICAvLyBjdXJyZW50bHkgdmlzaWJsZS5cbiAgLy8gWFhYIGJlY29tZSBjb252aW5jZWQgdGhhdCB0aGlzIGlzIGFjdHVhbGx5IHNhZmUgZXZlbiBpZiBvcGxvZ0Nvbm5lY3Rpb25cbiAgLy8gaXMgc29tZSBraW5kIG9mIHBvb2xcbiAgd2FpdFVudGlsQ2F1Z2h0VXA6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYWxsZWQgd2FpdFVudGlsQ2F1Z2h0VXAgb24gc3RvcHBlZCBoYW5kbGUhXCIpO1xuXG4gICAgLy8gQ2FsbGluZyB3YWl0VW50aWxDYXVnaHRVcCByZXF1cmllcyB1cyB0byB3YWl0IGZvciB0aGUgb3Bsb2cgY29ubmVjdGlvbiB0b1xuICAgIC8vIGJlIHJlYWR5LlxuICAgIHNlbGYuX3JlYWR5RnV0dXJlLndhaXQoKTtcbiAgICB2YXIgbGFzdEVudHJ5O1xuXG4gICAgd2hpbGUgKCFzZWxmLl9zdG9wcGVkKSB7XG4gICAgICAvLyBXZSBuZWVkIHRvIG1ha2UgdGhlIHNlbGVjdG9yIGF0IGxlYXN0IGFzIHJlc3RyaWN0aXZlIGFzIHRoZSBhY3R1YWxcbiAgICAgIC8vIHRhaWxpbmcgc2VsZWN0b3IgKGllLCB3ZSBuZWVkIHRvIHNwZWNpZnkgdGhlIERCIG5hbWUpIG9yIGVsc2Ugd2UgbWlnaHRcbiAgICAgIC8vIGZpbmQgYSBUUyB0aGF0IHdvbid0IHNob3cgdXAgaW4gdGhlIGFjdHVhbCB0YWlsIHN0cmVhbS5cbiAgICAgIHRyeSB7XG4gICAgICAgIGxhc3RFbnRyeSA9IHNlbGYuX29wbG9nTGFzdEVudHJ5Q29ubmVjdGlvbi5maW5kT25lKFxuICAgICAgICAgIE9QTE9HX0NPTExFQ1RJT04sIHNlbGYuX2Jhc2VPcGxvZ1NlbGVjdG9yLFxuICAgICAgICAgIHtmaWVsZHM6IHt0czogMX0sIHNvcnQ6IHskbmF0dXJhbDogLTF9fSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBEdXJpbmcgZmFpbG92ZXIgKGVnKSBpZiB3ZSBnZXQgYW4gZXhjZXB0aW9uIHdlIHNob3VsZCBsb2cgYW5kIHJldHJ5XG4gICAgICAgIC8vIGluc3RlYWQgb2YgY3Jhc2hpbmcuXG4gICAgICAgIE1ldGVvci5fZGVidWcoXCJHb3QgZXhjZXB0aW9uIHdoaWxlIHJlYWRpbmcgbGFzdCBlbnRyeVwiLCBlKTtcbiAgICAgICAgTWV0ZW9yLl9zbGVlcEZvck1zKDEwMCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICByZXR1cm47XG5cbiAgICBpZiAoIWxhc3RFbnRyeSkge1xuICAgICAgLy8gUmVhbGx5LCBub3RoaW5nIGluIHRoZSBvcGxvZz8gV2VsbCwgd2UndmUgcHJvY2Vzc2VkIGV2ZXJ5dGhpbmcuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIHRzID0gbGFzdEVudHJ5LnRzO1xuICAgIGlmICghdHMpXG4gICAgICB0aHJvdyBFcnJvcihcIm9wbG9nIGVudHJ5IHdpdGhvdXQgdHM6IFwiICsgRUpTT04uc3RyaW5naWZ5KGxhc3RFbnRyeSkpO1xuXG4gICAgaWYgKHNlbGYuX2xhc3RQcm9jZXNzZWRUUyAmJiB0cy5sZXNzVGhhbk9yRXF1YWwoc2VsZi5fbGFzdFByb2Nlc3NlZFRTKSkge1xuICAgICAgLy8gV2UndmUgYWxyZWFkeSBjYXVnaHQgdXAgdG8gaGVyZS5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cblxuICAgIC8vIEluc2VydCB0aGUgZnV0dXJlIGludG8gb3VyIGxpc3QuIEFsbW9zdCBhbHdheXMsIHRoaXMgd2lsbCBiZSBhdCB0aGUgZW5kLFxuICAgIC8vIGJ1dCBpdCdzIGNvbmNlaXZhYmxlIHRoYXQgaWYgd2UgZmFpbCBvdmVyIGZyb20gb25lIHByaW1hcnkgdG8gYW5vdGhlcixcbiAgICAvLyB0aGUgb3Bsb2cgZW50cmllcyB3ZSBzZWUgd2lsbCBnbyBiYWNrd2FyZHMuXG4gICAgdmFyIGluc2VydEFmdGVyID0gc2VsZi5fY2F0Y2hpbmdVcEZ1dHVyZXMubGVuZ3RoO1xuICAgIHdoaWxlIChpbnNlcnRBZnRlciAtIDEgPiAwICYmIHNlbGYuX2NhdGNoaW5nVXBGdXR1cmVzW2luc2VydEFmdGVyIC0gMV0udHMuZ3JlYXRlclRoYW4odHMpKSB7XG4gICAgICBpbnNlcnRBZnRlci0tO1xuICAgIH1cbiAgICB2YXIgZiA9IG5ldyBGdXR1cmU7XG4gICAgc2VsZi5fY2F0Y2hpbmdVcEZ1dHVyZXMuc3BsaWNlKGluc2VydEFmdGVyLCAwLCB7dHM6IHRzLCBmdXR1cmU6IGZ9KTtcbiAgICBmLndhaXQoKTtcbiAgfSxcbiAgX3N0YXJ0VGFpbGluZzogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBGaXJzdCwgbWFrZSBzdXJlIHRoYXQgd2UncmUgdGFsa2luZyB0byB0aGUgbG9jYWwgZGF0YWJhc2UuXG4gICAgdmFyIG1vbmdvZGJVcmkgPSBOcG0ucmVxdWlyZSgnbW9uZ29kYi11cmknKTtcbiAgICBpZiAobW9uZ29kYlVyaS5wYXJzZShzZWxmLl9vcGxvZ1VybCkuZGF0YWJhc2UgIT09ICdsb2NhbCcpIHtcbiAgICAgIHRocm93IEVycm9yKFwiJE1PTkdPX09QTE9HX1VSTCBtdXN0IGJlIHNldCB0byB0aGUgJ2xvY2FsJyBkYXRhYmFzZSBvZiBcIiArXG4gICAgICAgICAgICAgICAgICBcImEgTW9uZ28gcmVwbGljYSBzZXRcIik7XG4gICAgfVxuXG4gICAgLy8gV2UgbWFrZSB0d28gc2VwYXJhdGUgY29ubmVjdGlvbnMgdG8gTW9uZ28uIFRoZSBOb2RlIE1vbmdvIGRyaXZlclxuICAgIC8vIGltcGxlbWVudHMgYSBuYWl2ZSByb3VuZC1yb2JpbiBjb25uZWN0aW9uIHBvb2w6IGVhY2ggXCJjb25uZWN0aW9uXCIgaXMgYVxuICAgIC8vIHBvb2wgb2Ygc2V2ZXJhbCAoNSBieSBkZWZhdWx0KSBUQ1AgY29ubmVjdGlvbnMsIGFuZCBlYWNoIHJlcXVlc3QgaXNcbiAgICAvLyByb3RhdGVkIHRocm91Z2ggdGhlIHBvb2xzLiBUYWlsYWJsZSBjdXJzb3IgcXVlcmllcyBibG9jayBvbiB0aGUgc2VydmVyXG4gICAgLy8gdW50aWwgdGhlcmUgaXMgc29tZSBkYXRhIHRvIHJldHVybiAob3IgdW50aWwgYSBmZXcgc2Vjb25kcyBoYXZlXG4gICAgLy8gcGFzc2VkKS4gU28gaWYgdGhlIGNvbm5lY3Rpb24gcG9vbCB1c2VkIGZvciB0YWlsaW5nIGN1cnNvcnMgaXMgdGhlIHNhbWVcbiAgICAvLyBwb29sIHVzZWQgZm9yIG90aGVyIHF1ZXJpZXMsIHRoZSBvdGhlciBxdWVyaWVzIHdpbGwgYmUgZGVsYXllZCBieSBzZWNvbmRzXG4gICAgLy8gMS81IG9mIHRoZSB0aW1lLlxuICAgIC8vXG4gICAgLy8gVGhlIHRhaWwgY29ubmVjdGlvbiB3aWxsIG9ubHkgZXZlciBiZSBydW5uaW5nIGEgc2luZ2xlIHRhaWwgY29tbWFuZCwgc29cbiAgICAvLyBpdCBvbmx5IG5lZWRzIHRvIG1ha2Ugb25lIHVuZGVybHlpbmcgVENQIGNvbm5lY3Rpb24uXG4gICAgc2VsZi5fb3Bsb2dUYWlsQ29ubmVjdGlvbiA9IG5ldyBNb25nb0Nvbm5lY3Rpb24oXG4gICAgICBzZWxmLl9vcGxvZ1VybCwge3Bvb2xTaXplOiAxfSk7XG4gICAgLy8gWFhYIGJldHRlciBkb2NzLCBidXQ6IGl0J3MgdG8gZ2V0IG1vbm90b25pYyByZXN1bHRzXG4gICAgLy8gWFhYIGlzIGl0IHNhZmUgdG8gc2F5IFwiaWYgdGhlcmUncyBhbiBpbiBmbGlnaHQgcXVlcnksIGp1c3QgdXNlIGl0c1xuICAgIC8vICAgICByZXN1bHRzXCI/IEkgZG9uJ3QgdGhpbmsgc28gYnV0IHNob3VsZCBjb25zaWRlciB0aGF0XG4gICAgc2VsZi5fb3Bsb2dMYXN0RW50cnlDb25uZWN0aW9uID0gbmV3IE1vbmdvQ29ubmVjdGlvbihcbiAgICAgIHNlbGYuX29wbG9nVXJsLCB7cG9vbFNpemU6IDF9KTtcblxuICAgIC8vIE5vdywgbWFrZSBzdXJlIHRoYXQgdGhlcmUgYWN0dWFsbHkgaXMgYSByZXBsIHNldCBoZXJlLiBJZiBub3QsIG9wbG9nXG4gICAgLy8gdGFpbGluZyB3b24ndCBldmVyIGZpbmQgYW55dGhpbmchXG4gICAgLy8gTW9yZSBvbiB0aGUgaXNNYXN0ZXJEb2NcbiAgICAvLyBodHRwczovL2RvY3MubW9uZ29kYi5jb20vbWFudWFsL3JlZmVyZW5jZS9jb21tYW5kL2lzTWFzdGVyL1xuICAgIHZhciBmID0gbmV3IEZ1dHVyZTtcbiAgICBzZWxmLl9vcGxvZ0xhc3RFbnRyeUNvbm5lY3Rpb24uZGIuYWRtaW4oKS5jb21tYW5kKFxuICAgICAgeyBpc21hc3RlcjogMSB9LCBmLnJlc29sdmVyKCkpO1xuICAgIHZhciBpc01hc3RlckRvYyA9IGYud2FpdCgpO1xuXG4gICAgaWYgKCEoaXNNYXN0ZXJEb2MgJiYgaXNNYXN0ZXJEb2Muc2V0TmFtZSkpIHtcbiAgICAgIHRocm93IEVycm9yKFwiJE1PTkdPX09QTE9HX1VSTCBtdXN0IGJlIHNldCB0byB0aGUgJ2xvY2FsJyBkYXRhYmFzZSBvZiBcIiArXG4gICAgICAgICAgICAgICAgICBcImEgTW9uZ28gcmVwbGljYSBzZXRcIik7XG4gICAgfVxuXG4gICAgLy8gRmluZCB0aGUgbGFzdCBvcGxvZyBlbnRyeS5cbiAgICB2YXIgbGFzdE9wbG9nRW50cnkgPSBzZWxmLl9vcGxvZ0xhc3RFbnRyeUNvbm5lY3Rpb24uZmluZE9uZShcbiAgICAgIE9QTE9HX0NPTExFQ1RJT04sIHt9LCB7c29ydDogeyRuYXR1cmFsOiAtMX0sIGZpZWxkczoge3RzOiAxfX0pO1xuXG4gICAgdmFyIG9wbG9nU2VsZWN0b3IgPSBfLmNsb25lKHNlbGYuX2Jhc2VPcGxvZ1NlbGVjdG9yKTtcbiAgICBpZiAobGFzdE9wbG9nRW50cnkpIHtcbiAgICAgIC8vIFN0YXJ0IGFmdGVyIHRoZSBsYXN0IGVudHJ5IHRoYXQgY3VycmVudGx5IGV4aXN0cy5cbiAgICAgIG9wbG9nU2VsZWN0b3IudHMgPSB7JGd0OiBsYXN0T3Bsb2dFbnRyeS50c307XG4gICAgICAvLyBJZiB0aGVyZSBhcmUgYW55IGNhbGxzIHRvIGNhbGxXaGVuUHJvY2Vzc2VkTGF0ZXN0IGJlZm9yZSBhbnkgb3RoZXJcbiAgICAgIC8vIG9wbG9nIGVudHJpZXMgc2hvdyB1cCwgYWxsb3cgY2FsbFdoZW5Qcm9jZXNzZWRMYXRlc3QgdG8gY2FsbCBpdHNcbiAgICAgIC8vIGNhbGxiYWNrIGltbWVkaWF0ZWx5LlxuICAgICAgc2VsZi5fbGFzdFByb2Nlc3NlZFRTID0gbGFzdE9wbG9nRW50cnkudHM7XG4gICAgfVxuXG4gICAgdmFyIGN1cnNvckRlc2NyaXB0aW9uID0gbmV3IEN1cnNvckRlc2NyaXB0aW9uKFxuICAgICAgT1BMT0dfQ09MTEVDVElPTiwgb3Bsb2dTZWxlY3Rvciwge3RhaWxhYmxlOiB0cnVlfSk7XG5cbiAgICAvLyBTdGFydCB0YWlsaW5nIHRoZSBvcGxvZy5cbiAgICAvL1xuICAgIC8vIFdlIHJlc3RhcnQgdGhlIGxvdy1sZXZlbCBvcGxvZyBxdWVyeSBldmVyeSAzMCBzZWNvbmRzIGlmIHdlIGRpZG4ndCBnZXQgYVxuICAgIC8vIGRvYy4gVGhpcyBpcyBhIHdvcmthcm91bmQgZm9yICM4NTk4OiB0aGUgTm9kZSBNb25nbyBkcml2ZXIgaGFzIGF0IGxlYXN0XG4gICAgLy8gb25lIGJ1ZyB0aGF0IGNhbiBsZWFkIHRvIHF1ZXJ5IGNhbGxiYWNrcyBuZXZlciBnZXR0aW5nIGNhbGxlZCAoZXZlbiB3aXRoXG4gICAgLy8gYW4gZXJyb3IpIHdoZW4gbGVhZGVyc2hpcCBmYWlsb3ZlciBvY2N1ci5cbiAgICBzZWxmLl90YWlsSGFuZGxlID0gc2VsZi5fb3Bsb2dUYWlsQ29ubmVjdGlvbi50YWlsKFxuICAgICAgY3Vyc29yRGVzY3JpcHRpb24sXG4gICAgICBmdW5jdGlvbiAoZG9jKSB7XG4gICAgICAgIHNlbGYuX2VudHJ5UXVldWUucHVzaChkb2MpO1xuICAgICAgICBzZWxmLl9tYXliZVN0YXJ0V29ya2VyKCk7XG4gICAgICB9LFxuICAgICAgVEFJTF9USU1FT1VUXG4gICAgKTtcbiAgICBzZWxmLl9yZWFkeUZ1dHVyZS5yZXR1cm4oKTtcbiAgfSxcblxuICBfbWF5YmVTdGFydFdvcmtlcjogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fd29ya2VyQWN0aXZlKVxuICAgICAgcmV0dXJuO1xuICAgIHNlbGYuX3dvcmtlckFjdGl2ZSA9IHRydWU7XG4gICAgTWV0ZW9yLmRlZmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHdoaWxlICghIHNlbGYuX3N0b3BwZWQgJiYgISBzZWxmLl9lbnRyeVF1ZXVlLmlzRW1wdHkoKSkge1xuICAgICAgICAgIC8vIEFyZSB3ZSB0b28gZmFyIGJlaGluZD8gSnVzdCB0ZWxsIG91ciBvYnNlcnZlcnMgdGhhdCB0aGV5IG5lZWQgdG9cbiAgICAgICAgICAvLyByZXBvbGwsIGFuZCBkcm9wIG91ciBxdWV1ZS5cbiAgICAgICAgICBpZiAoc2VsZi5fZW50cnlRdWV1ZS5sZW5ndGggPiBUT09fRkFSX0JFSElORCkge1xuICAgICAgICAgICAgdmFyIGxhc3RFbnRyeSA9IHNlbGYuX2VudHJ5UXVldWUucG9wKCk7XG4gICAgICAgICAgICBzZWxmLl9lbnRyeVF1ZXVlLmNsZWFyKCk7XG5cbiAgICAgICAgICAgIHNlbGYuX29uU2tpcHBlZEVudHJpZXNIb29rLmVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEZyZWUgYW55IHdhaXRVbnRpbENhdWdodFVwKCkgY2FsbHMgdGhhdCB3ZXJlIHdhaXRpbmcgZm9yIHVzIHRvXG4gICAgICAgICAgICAvLyBwYXNzIHNvbWV0aGluZyB0aGF0IHdlIGp1c3Qgc2tpcHBlZC5cbiAgICAgICAgICAgIHNlbGYuX3NldExhc3RQcm9jZXNzZWRUUyhsYXN0RW50cnkudHMpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIGRvYyA9IHNlbGYuX2VudHJ5UXVldWUuc2hpZnQoKTtcblxuICAgICAgICAgIGlmICghKGRvYy5ucyAmJiBkb2MubnMubGVuZ3RoID4gc2VsZi5fZGJOYW1lLmxlbmd0aCArIDEgJiZcbiAgICAgICAgICAgICAgICBkb2MubnMuc3Vic3RyKDAsIHNlbGYuX2RiTmFtZS5sZW5ndGggKyAxKSA9PT1cbiAgICAgICAgICAgICAgICAoc2VsZi5fZGJOYW1lICsgJy4nKSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuZXhwZWN0ZWQgbnNcIik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdmFyIHRyaWdnZXIgPSB7Y29sbGVjdGlvbjogZG9jLm5zLnN1YnN0cihzZWxmLl9kYk5hbWUubGVuZ3RoICsgMSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgZHJvcENvbGxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgIGRyb3BEYXRhYmFzZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgb3A6IGRvY307XG5cbiAgICAgICAgICAvLyBJcyBpdCBhIHNwZWNpYWwgY29tbWFuZCBhbmQgdGhlIGNvbGxlY3Rpb24gbmFtZSBpcyBoaWRkZW4gc29tZXdoZXJlXG4gICAgICAgICAgLy8gaW4gb3BlcmF0b3I/XG4gICAgICAgICAgaWYgKHRyaWdnZXIuY29sbGVjdGlvbiA9PT0gXCIkY21kXCIpIHtcbiAgICAgICAgICAgIGlmIChkb2Muby5kcm9wRGF0YWJhc2UpIHtcbiAgICAgICAgICAgICAgZGVsZXRlIHRyaWdnZXIuY29sbGVjdGlvbjtcbiAgICAgICAgICAgICAgdHJpZ2dlci5kcm9wRGF0YWJhc2UgPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChfLmhhcyhkb2MubywgJ2Ryb3AnKSkge1xuICAgICAgICAgICAgICB0cmlnZ2VyLmNvbGxlY3Rpb24gPSBkb2Muby5kcm9wO1xuICAgICAgICAgICAgICB0cmlnZ2VyLmRyb3BDb2xsZWN0aW9uID0gdHJ1ZTtcbiAgICAgICAgICAgICAgdHJpZ2dlci5pZCA9IG51bGw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBFcnJvcihcIlVua25vd24gY29tbWFuZCBcIiArIEpTT04uc3RyaW5naWZ5KGRvYykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBBbGwgb3RoZXIgb3BzIGhhdmUgYW4gaWQuXG4gICAgICAgICAgICB0cmlnZ2VyLmlkID0gaWRGb3JPcChkb2MpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHNlbGYuX2Nyb3NzYmFyLmZpcmUodHJpZ2dlcik7XG5cbiAgICAgICAgICAvLyBOb3cgdGhhdCB3ZSd2ZSBwcm9jZXNzZWQgdGhpcyBvcGVyYXRpb24sIHByb2Nlc3MgcGVuZGluZ1xuICAgICAgICAgIC8vIHNlcXVlbmNlcnMuXG4gICAgICAgICAgaWYgKCFkb2MudHMpXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIm9wbG9nIGVudHJ5IHdpdGhvdXQgdHM6IFwiICsgRUpTT04uc3RyaW5naWZ5KGRvYykpO1xuICAgICAgICAgIHNlbGYuX3NldExhc3RQcm9jZXNzZWRUUyhkb2MudHMpO1xuICAgICAgICB9XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBzZWxmLl93b3JrZXJBY3RpdmUgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgX3NldExhc3RQcm9jZXNzZWRUUzogZnVuY3Rpb24gKHRzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYuX2xhc3RQcm9jZXNzZWRUUyA9IHRzO1xuICAgIHdoaWxlICghXy5pc0VtcHR5KHNlbGYuX2NhdGNoaW5nVXBGdXR1cmVzKSAmJiBzZWxmLl9jYXRjaGluZ1VwRnV0dXJlc1swXS50cy5sZXNzVGhhbk9yRXF1YWwoc2VsZi5fbGFzdFByb2Nlc3NlZFRTKSkge1xuICAgICAgdmFyIHNlcXVlbmNlciA9IHNlbGYuX2NhdGNoaW5nVXBGdXR1cmVzLnNoaWZ0KCk7XG4gICAgICBzZXF1ZW5jZXIuZnV0dXJlLnJldHVybigpO1xuICAgIH1cbiAgfSxcblxuICAvL01ldGhvZHMgdXNlZCBvbiB0ZXN0cyB0byBkaW5hbWljYWxseSBjaGFuZ2UgVE9PX0ZBUl9CRUhJTkRcbiAgX2RlZmluZVRvb0ZhckJlaGluZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICBUT09fRkFSX0JFSElORCA9IHZhbHVlO1xuICB9LFxuICBfcmVzZXRUb29GYXJCZWhpbmQ6IGZ1bmN0aW9uKCkge1xuICAgIFRPT19GQVJfQkVISU5EID0gcHJvY2Vzcy5lbnYuTUVURU9SX09QTE9HX1RPT19GQVJfQkVISU5EIHx8IDIwMDA7XG4gIH1cbn0pO1xuIiwidmFyIEZ1dHVyZSA9IE5wbS5yZXF1aXJlKCdmaWJlcnMvZnV0dXJlJyk7XG5cbk9ic2VydmVNdWx0aXBsZXhlciA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoIW9wdGlvbnMgfHwgIV8uaGFzKG9wdGlvbnMsICdvcmRlcmVkJykpXG4gICAgdGhyb3cgRXJyb3IoXCJtdXN0IHNwZWNpZmllZCBvcmRlcmVkXCIpO1xuXG4gIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXSAmJiBQYWNrYWdlWydmYWN0cy1iYXNlJ10uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICBcIm1vbmdvLWxpdmVkYXRhXCIsIFwib2JzZXJ2ZS1tdWx0aXBsZXhlcnNcIiwgMSk7XG5cbiAgc2VsZi5fb3JkZXJlZCA9IG9wdGlvbnMub3JkZXJlZDtcbiAgc2VsZi5fb25TdG9wID0gb3B0aW9ucy5vblN0b3AgfHwgZnVuY3Rpb24gKCkge307XG4gIHNlbGYuX3F1ZXVlID0gbmV3IE1ldGVvci5fU3luY2hyb25vdXNRdWV1ZSgpO1xuICBzZWxmLl9oYW5kbGVzID0ge307XG4gIHNlbGYuX3JlYWR5RnV0dXJlID0gbmV3IEZ1dHVyZTtcbiAgc2VsZi5fY2FjaGUgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9DYWNoaW5nQ2hhbmdlT2JzZXJ2ZXIoe1xuICAgIG9yZGVyZWQ6IG9wdGlvbnMub3JkZXJlZH0pO1xuICAvLyBOdW1iZXIgb2YgYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzIHRhc2tzIHNjaGVkdWxlZCBidXQgbm90IHlldFxuICAvLyBydW5uaW5nLiByZW1vdmVIYW5kbGUgdXNlcyB0aGlzIHRvIGtub3cgaWYgaXQncyB0aW1lIHRvIGNhbGwgdGhlIG9uU3RvcFxuICAvLyBjYWxsYmFjay5cbiAgc2VsZi5fYWRkSGFuZGxlVGFza3NTY2hlZHVsZWRCdXROb3RQZXJmb3JtZWQgPSAwO1xuXG4gIF8uZWFjaChzZWxmLmNhbGxiYWNrTmFtZXMoKSwgZnVuY3Rpb24gKGNhbGxiYWNrTmFtZSkge1xuICAgIHNlbGZbY2FsbGJhY2tOYW1lXSA9IGZ1bmN0aW9uICgvKiAuLi4gKi8pIHtcbiAgICAgIHNlbGYuX2FwcGx5Q2FsbGJhY2soY2FsbGJhY2tOYW1lLCBfLnRvQXJyYXkoYXJndW1lbnRzKSk7XG4gICAgfTtcbiAgfSk7XG59O1xuXG5fLmV4dGVuZChPYnNlcnZlTXVsdGlwbGV4ZXIucHJvdG90eXBlLCB7XG4gIGFkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkczogZnVuY3Rpb24gKGhhbmRsZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIENoZWNrIHRoaXMgYmVmb3JlIGNhbGxpbmcgcnVuVGFzayAoZXZlbiB0aG91Z2ggcnVuVGFzayBkb2VzIHRoZSBzYW1lXG4gICAgLy8gY2hlY2spIHNvIHRoYXQgd2UgZG9uJ3QgbGVhayBhbiBPYnNlcnZlTXVsdGlwbGV4ZXIgb24gZXJyb3IgYnlcbiAgICAvLyBpbmNyZW1lbnRpbmcgX2FkZEhhbmRsZVRhc2tzU2NoZWR1bGVkQnV0Tm90UGVyZm9ybWVkIGFuZCBuZXZlclxuICAgIC8vIGRlY3JlbWVudGluZyBpdC5cbiAgICBpZiAoIXNlbGYuX3F1ZXVlLnNhZmVUb1J1blRhc2soKSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IGNhbGwgb2JzZXJ2ZUNoYW5nZXMgZnJvbSBhbiBvYnNlcnZlIGNhbGxiYWNrIG9uIHRoZSBzYW1lIHF1ZXJ5XCIpO1xuICAgICsrc2VsZi5fYWRkSGFuZGxlVGFza3NTY2hlZHVsZWRCdXROb3RQZXJmb3JtZWQ7XG5cbiAgICBQYWNrYWdlWydmYWN0cy1iYXNlJ10gJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICBcIm1vbmdvLWxpdmVkYXRhXCIsIFwib2JzZXJ2ZS1oYW5kbGVzXCIsIDEpO1xuXG4gICAgc2VsZi5fcXVldWUucnVuVGFzayhmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9oYW5kbGVzW2hhbmRsZS5faWRdID0gaGFuZGxlO1xuICAgICAgLy8gU2VuZCBvdXQgd2hhdGV2ZXIgYWRkcyB3ZSBoYXZlIHNvIGZhciAod2hldGhlciBvciBub3Qgd2UgdGhlXG4gICAgICAvLyBtdWx0aXBsZXhlciBpcyByZWFkeSkuXG4gICAgICBzZWxmLl9zZW5kQWRkcyhoYW5kbGUpO1xuICAgICAgLS1zZWxmLl9hZGRIYW5kbGVUYXNrc1NjaGVkdWxlZEJ1dE5vdFBlcmZvcm1lZDtcbiAgICB9KTtcbiAgICAvLyAqb3V0c2lkZSogdGhlIHRhc2ssIHNpbmNlIG90aGVyd2lzZSB3ZSdkIGRlYWRsb2NrXG4gICAgc2VsZi5fcmVhZHlGdXR1cmUud2FpdCgpO1xuICB9LFxuXG4gIC8vIFJlbW92ZSBhbiBvYnNlcnZlIGhhbmRsZS4gSWYgaXQgd2FzIHRoZSBsYXN0IG9ic2VydmUgaGFuZGxlLCBjYWxsIHRoZVxuICAvLyBvblN0b3AgY2FsbGJhY2s7IHlvdSBjYW5ub3QgYWRkIGFueSBtb3JlIG9ic2VydmUgaGFuZGxlcyBhZnRlciB0aGlzLlxuICAvL1xuICAvLyBUaGlzIGlzIG5vdCBzeW5jaHJvbml6ZWQgd2l0aCBwb2xscyBhbmQgaGFuZGxlIGFkZGl0aW9uczogdGhpcyBtZWFucyB0aGF0XG4gIC8vIHlvdSBjYW4gc2FmZWx5IGNhbGwgaXQgZnJvbSB3aXRoaW4gYW4gb2JzZXJ2ZSBjYWxsYmFjaywgYnV0IGl0IGFsc28gbWVhbnNcbiAgLy8gdGhhdCB3ZSBoYXZlIHRvIGJlIGNhcmVmdWwgd2hlbiB3ZSBpdGVyYXRlIG92ZXIgX2hhbmRsZXMuXG4gIHJlbW92ZUhhbmRsZTogZnVuY3Rpb24gKGlkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gVGhpcyBzaG91bGQgbm90IGJlIHBvc3NpYmxlOiB5b3UgY2FuIG9ubHkgY2FsbCByZW1vdmVIYW5kbGUgYnkgaGF2aW5nXG4gICAgLy8gYWNjZXNzIHRvIHRoZSBPYnNlcnZlSGFuZGxlLCB3aGljaCBpc24ndCByZXR1cm5lZCB0byB1c2VyIGNvZGUgdW50aWwgdGhlXG4gICAgLy8gbXVsdGlwbGV4IGlzIHJlYWR5LlxuICAgIGlmICghc2VsZi5fcmVhZHkoKSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IHJlbW92ZSBoYW5kbGVzIHVudGlsIHRoZSBtdWx0aXBsZXggaXMgcmVhZHlcIik7XG5cbiAgICBkZWxldGUgc2VsZi5faGFuZGxlc1tpZF07XG5cbiAgICBQYWNrYWdlWydmYWN0cy1iYXNlJ10gJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICBcIm1vbmdvLWxpdmVkYXRhXCIsIFwib2JzZXJ2ZS1oYW5kbGVzXCIsIC0xKTtcblxuICAgIGlmIChfLmlzRW1wdHkoc2VsZi5faGFuZGxlcykgJiZcbiAgICAgICAgc2VsZi5fYWRkSGFuZGxlVGFza3NTY2hlZHVsZWRCdXROb3RQZXJmb3JtZWQgPT09IDApIHtcbiAgICAgIHNlbGYuX3N0b3AoKTtcbiAgICB9XG4gIH0sXG4gIF9zdG9wOiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIC8vIEl0IHNob3VsZG4ndCBiZSBwb3NzaWJsZSBmb3IgdXMgdG8gc3RvcCB3aGVuIGFsbCBvdXIgaGFuZGxlcyBzdGlsbFxuICAgIC8vIGhhdmVuJ3QgYmVlbiByZXR1cm5lZCBmcm9tIG9ic2VydmVDaGFuZ2VzIVxuICAgIGlmICghIHNlbGYuX3JlYWR5KCkgJiYgISBvcHRpb25zLmZyb21RdWVyeUVycm9yKVxuICAgICAgdGhyb3cgRXJyb3IoXCJzdXJwcmlzaW5nIF9zdG9wOiBub3QgcmVhZHlcIik7XG5cbiAgICAvLyBDYWxsIHN0b3AgY2FsbGJhY2sgKHdoaWNoIGtpbGxzIHRoZSB1bmRlcmx5aW5nIHByb2Nlc3Mgd2hpY2ggc2VuZHMgdXNcbiAgICAvLyBjYWxsYmFja3MgYW5kIHJlbW92ZXMgdXMgZnJvbSB0aGUgY29ubmVjdGlvbidzIGRpY3Rpb25hcnkpLlxuICAgIHNlbGYuX29uU3RvcCgpO1xuICAgIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXSAmJiBQYWNrYWdlWydmYWN0cy1iYXNlJ10uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLW11bHRpcGxleGVyc1wiLCAtMSk7XG5cbiAgICAvLyBDYXVzZSBmdXR1cmUgYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzIGNhbGxzIHRvIHRocm93IChidXQgdGhlIG9uU3RvcFxuICAgIC8vIGNhbGxiYWNrIHNob3VsZCBtYWtlIG91ciBjb25uZWN0aW9uIGZvcmdldCBhYm91dCB1cykuXG4gICAgc2VsZi5faGFuZGxlcyA9IG51bGw7XG4gIH0sXG5cbiAgLy8gQWxsb3dzIGFsbCBhZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHMgY2FsbHMgdG8gcmV0dXJuLCBvbmNlIGFsbCBwcmVjZWRpbmdcbiAgLy8gYWRkcyBoYXZlIGJlZW4gcHJvY2Vzc2VkLiBEb2VzIG5vdCBibG9jay5cbiAgcmVhZHk6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2VsZi5fcXVldWUucXVldWVUYXNrKGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmIChzZWxmLl9yZWFkeSgpKVxuICAgICAgICB0aHJvdyBFcnJvcihcImNhbid0IG1ha2UgT2JzZXJ2ZU11bHRpcGxleCByZWFkeSB0d2ljZSFcIik7XG4gICAgICBzZWxmLl9yZWFkeUZ1dHVyZS5yZXR1cm4oKTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBJZiB0cnlpbmcgdG8gZXhlY3V0ZSB0aGUgcXVlcnkgcmVzdWx0cyBpbiBhbiBlcnJvciwgY2FsbCB0aGlzLiBUaGlzIGlzXG4gIC8vIGludGVuZGVkIGZvciBwZXJtYW5lbnQgZXJyb3JzLCBub3QgdHJhbnNpZW50IG5ldHdvcmsgZXJyb3JzIHRoYXQgY291bGQgYmVcbiAgLy8gZml4ZWQuIEl0IHNob3VsZCBvbmx5IGJlIGNhbGxlZCBiZWZvcmUgcmVhZHkoKSwgYmVjYXVzZSBpZiB5b3UgY2FsbGVkIHJlYWR5XG4gIC8vIHRoYXQgbWVhbnQgdGhhdCB5b3UgbWFuYWdlZCB0byBydW4gdGhlIHF1ZXJ5IG9uY2UuIEl0IHdpbGwgc3RvcCB0aGlzXG4gIC8vIE9ic2VydmVNdWx0aXBsZXggYW5kIGNhdXNlIGFkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkcyBjYWxscyAoYW5kIHRodXNcbiAgLy8gb2JzZXJ2ZUNoYW5nZXMgY2FsbHMpIHRvIHRocm93IHRoZSBlcnJvci5cbiAgcXVlcnlFcnJvcjogZnVuY3Rpb24gKGVycikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLl9xdWV1ZS5ydW5UYXNrKGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmIChzZWxmLl9yZWFkeSgpKVxuICAgICAgICB0aHJvdyBFcnJvcihcImNhbid0IGNsYWltIHF1ZXJ5IGhhcyBhbiBlcnJvciBhZnRlciBpdCB3b3JrZWQhXCIpO1xuICAgICAgc2VsZi5fc3RvcCh7ZnJvbVF1ZXJ5RXJyb3I6IHRydWV9KTtcbiAgICAgIHNlbGYuX3JlYWR5RnV0dXJlLnRocm93KGVycik7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gQ2FsbHMgXCJjYlwiIG9uY2UgdGhlIGVmZmVjdHMgb2YgYWxsIFwicmVhZHlcIiwgXCJhZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHNcIlxuICAvLyBhbmQgb2JzZXJ2ZSBjYWxsYmFja3Mgd2hpY2ggY2FtZSBiZWZvcmUgdGhpcyBjYWxsIGhhdmUgYmVlbiBwcm9wYWdhdGVkIHRvXG4gIC8vIGFsbCBoYW5kbGVzLiBcInJlYWR5XCIgbXVzdCBoYXZlIGFscmVhZHkgYmVlbiBjYWxsZWQgb24gdGhpcyBtdWx0aXBsZXhlci5cbiAgb25GbHVzaDogZnVuY3Rpb24gKGNiKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYuX3F1ZXVlLnF1ZXVlVGFzayhmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoIXNlbGYuX3JlYWR5KCkpXG4gICAgICAgIHRocm93IEVycm9yKFwib25seSBjYWxsIG9uRmx1c2ggb24gYSBtdWx0aXBsZXhlciB0aGF0IHdpbGwgYmUgcmVhZHlcIik7XG4gICAgICBjYigpO1xuICAgIH0pO1xuICB9LFxuICBjYWxsYmFja05hbWVzOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9vcmRlcmVkKVxuICAgICAgcmV0dXJuIFtcImFkZGVkQmVmb3JlXCIsIFwiY2hhbmdlZFwiLCBcIm1vdmVkQmVmb3JlXCIsIFwicmVtb3ZlZFwiXTtcbiAgICBlbHNlXG4gICAgICByZXR1cm4gW1wiYWRkZWRcIiwgXCJjaGFuZ2VkXCIsIFwicmVtb3ZlZFwiXTtcbiAgfSxcbiAgX3JlYWR5OiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3JlYWR5RnV0dXJlLmlzUmVzb2x2ZWQoKTtcbiAgfSxcbiAgX2FwcGx5Q2FsbGJhY2s6IGZ1bmN0aW9uIChjYWxsYmFja05hbWUsIGFyZ3MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2VsZi5fcXVldWUucXVldWVUYXNrKGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIElmIHdlIHN0b3BwZWQgaW4gdGhlIG1lYW50aW1lLCBkbyBub3RoaW5nLlxuICAgICAgaWYgKCFzZWxmLl9oYW5kbGVzKVxuICAgICAgICByZXR1cm47XG5cbiAgICAgIC8vIEZpcnN0LCBhcHBseSB0aGUgY2hhbmdlIHRvIHRoZSBjYWNoZS5cbiAgICAgIC8vIFhYWCBXZSBjb3VsZCBtYWtlIGFwcGx5Q2hhbmdlIGNhbGxiYWNrcyBwcm9taXNlIG5vdCB0byBoYW5nIG9uIHRvIGFueVxuICAgICAgLy8gc3RhdGUgZnJvbSB0aGVpciBhcmd1bWVudHMgKGFzc3VtaW5nIHRoYXQgdGhlaXIgc3VwcGxpZWQgY2FsbGJhY2tzXG4gICAgICAvLyBkb24ndCkgYW5kIHNraXAgdGhpcyBjbG9uZS4gQ3VycmVudGx5ICdjaGFuZ2VkJyBoYW5ncyBvbiB0byBzdGF0ZVxuICAgICAgLy8gdGhvdWdoLlxuICAgICAgc2VsZi5fY2FjaGUuYXBwbHlDaGFuZ2VbY2FsbGJhY2tOYW1lXS5hcHBseShudWxsLCBFSlNPTi5jbG9uZShhcmdzKSk7XG5cbiAgICAgIC8vIElmIHdlIGhhdmVuJ3QgZmluaXNoZWQgdGhlIGluaXRpYWwgYWRkcywgdGhlbiB3ZSBzaG91bGQgb25seSBiZSBnZXR0aW5nXG4gICAgICAvLyBhZGRzLlxuICAgICAgaWYgKCFzZWxmLl9yZWFkeSgpICYmXG4gICAgICAgICAgKGNhbGxiYWNrTmFtZSAhPT0gJ2FkZGVkJyAmJiBjYWxsYmFja05hbWUgIT09ICdhZGRlZEJlZm9yZScpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkdvdCBcIiArIGNhbGxiYWNrTmFtZSArIFwiIGR1cmluZyBpbml0aWFsIGFkZHNcIik7XG4gICAgICB9XG5cbiAgICAgIC8vIE5vdyBtdWx0aXBsZXggdGhlIGNhbGxiYWNrcyBvdXQgdG8gYWxsIG9ic2VydmUgaGFuZGxlcy4gSXQncyBPSyBpZlxuICAgICAgLy8gdGhlc2UgY2FsbHMgeWllbGQ7IHNpbmNlIHdlJ3JlIGluc2lkZSBhIHRhc2ssIG5vIG90aGVyIHVzZSBvZiBvdXIgcXVldWVcbiAgICAgIC8vIGNhbiBjb250aW51ZSB1bnRpbCB0aGVzZSBhcmUgZG9uZS4gKEJ1dCB3ZSBkbyBoYXZlIHRvIGJlIGNhcmVmdWwgdG8gbm90XG4gICAgICAvLyB1c2UgYSBoYW5kbGUgdGhhdCBnb3QgcmVtb3ZlZCwgYmVjYXVzZSByZW1vdmVIYW5kbGUgZG9lcyBub3QgdXNlIHRoZVxuICAgICAgLy8gcXVldWU7IHRodXMsIHdlIGl0ZXJhdGUgb3ZlciBhbiBhcnJheSBvZiBrZXlzIHRoYXQgd2UgY29udHJvbC4pXG4gICAgICBfLmVhY2goXy5rZXlzKHNlbGYuX2hhbmRsZXMpLCBmdW5jdGlvbiAoaGFuZGxlSWQpIHtcbiAgICAgICAgdmFyIGhhbmRsZSA9IHNlbGYuX2hhbmRsZXMgJiYgc2VsZi5faGFuZGxlc1toYW5kbGVJZF07XG4gICAgICAgIGlmICghaGFuZGxlKVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gaGFuZGxlWydfJyArIGNhbGxiYWNrTmFtZV07XG4gICAgICAgIC8vIGNsb25lIGFyZ3VtZW50cyBzbyB0aGF0IGNhbGxiYWNrcyBjYW4gbXV0YXRlIHRoZWlyIGFyZ3VtZW50c1xuICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjay5hcHBseShudWxsLCBFSlNPTi5jbG9uZShhcmdzKSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBTZW5kcyBpbml0aWFsIGFkZHMgdG8gYSBoYW5kbGUuIEl0IHNob3VsZCBvbmx5IGJlIGNhbGxlZCBmcm9tIHdpdGhpbiBhIHRhc2tcbiAgLy8gKHRoZSB0YXNrIHRoYXQgaXMgcHJvY2Vzc2luZyB0aGUgYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzIGNhbGwpLiBJdFxuICAvLyBzeW5jaHJvbm91c2x5IGludm9rZXMgdGhlIGhhbmRsZSdzIGFkZGVkIG9yIGFkZGVkQmVmb3JlOyB0aGVyZSdzIG5vIG5lZWQgdG9cbiAgLy8gZmx1c2ggdGhlIHF1ZXVlIGFmdGVyd2FyZHMgdG8gZW5zdXJlIHRoYXQgdGhlIGNhbGxiYWNrcyBnZXQgb3V0LlxuICBfc2VuZEFkZHM6IGZ1bmN0aW9uIChoYW5kbGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX3F1ZXVlLnNhZmVUb1J1blRhc2soKSlcbiAgICAgIHRocm93IEVycm9yKFwiX3NlbmRBZGRzIG1heSBvbmx5IGJlIGNhbGxlZCBmcm9tIHdpdGhpbiBhIHRhc2shXCIpO1xuICAgIHZhciBhZGQgPSBzZWxmLl9vcmRlcmVkID8gaGFuZGxlLl9hZGRlZEJlZm9yZSA6IGhhbmRsZS5fYWRkZWQ7XG4gICAgaWYgKCFhZGQpXG4gICAgICByZXR1cm47XG4gICAgLy8gbm90ZTogZG9jcyBtYXkgYmUgYW4gX0lkTWFwIG9yIGFuIE9yZGVyZWREaWN0XG4gICAgc2VsZi5fY2FjaGUuZG9jcy5mb3JFYWNoKGZ1bmN0aW9uIChkb2MsIGlkKSB7XG4gICAgICBpZiAoIV8uaGFzKHNlbGYuX2hhbmRsZXMsIGhhbmRsZS5faWQpKVxuICAgICAgICB0aHJvdyBFcnJvcihcImhhbmRsZSBnb3QgcmVtb3ZlZCBiZWZvcmUgc2VuZGluZyBpbml0aWFsIGFkZHMhXCIpO1xuICAgICAgdmFyIGZpZWxkcyA9IEVKU09OLmNsb25lKGRvYyk7XG4gICAgICBkZWxldGUgZmllbGRzLl9pZDtcbiAgICAgIGlmIChzZWxmLl9vcmRlcmVkKVxuICAgICAgICBhZGQoaWQsIGZpZWxkcywgbnVsbCk7IC8vIHdlJ3JlIGdvaW5nIGluIG9yZGVyLCBzbyBhZGQgYXQgZW5kXG4gICAgICBlbHNlXG4gICAgICAgIGFkZChpZCwgZmllbGRzKTtcbiAgICB9KTtcbiAgfVxufSk7XG5cblxudmFyIG5leHRPYnNlcnZlSGFuZGxlSWQgPSAxO1xuT2JzZXJ2ZUhhbmRsZSA9IGZ1bmN0aW9uIChtdWx0aXBsZXhlciwgY2FsbGJhY2tzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgLy8gVGhlIGVuZCB1c2VyIGlzIG9ubHkgc3VwcG9zZWQgdG8gY2FsbCBzdG9wKCkuICBUaGUgb3RoZXIgZmllbGRzIGFyZVxuICAvLyBhY2Nlc3NpYmxlIHRvIHRoZSBtdWx0aXBsZXhlciwgdGhvdWdoLlxuICBzZWxmLl9tdWx0aXBsZXhlciA9IG11bHRpcGxleGVyO1xuICBfLmVhY2gobXVsdGlwbGV4ZXIuY2FsbGJhY2tOYW1lcygpLCBmdW5jdGlvbiAobmFtZSkge1xuICAgIGlmIChjYWxsYmFja3NbbmFtZV0pIHtcbiAgICAgIHNlbGZbJ18nICsgbmFtZV0gPSBjYWxsYmFja3NbbmFtZV07XG4gICAgfSBlbHNlIGlmIChuYW1lID09PSBcImFkZGVkQmVmb3JlXCIgJiYgY2FsbGJhY2tzLmFkZGVkKSB7XG4gICAgICAvLyBTcGVjaWFsIGNhc2U6IGlmIHlvdSBzcGVjaWZ5IFwiYWRkZWRcIiBhbmQgXCJtb3ZlZEJlZm9yZVwiLCB5b3UgZ2V0IGFuXG4gICAgICAvLyBvcmRlcmVkIG9ic2VydmUgd2hlcmUgZm9yIHNvbWUgcmVhc29uIHlvdSBkb24ndCBnZXQgb3JkZXJpbmcgZGF0YSBvblxuICAgICAgLy8gdGhlIGFkZHMuICBJIGR1bm5vLCB3ZSB3cm90ZSB0ZXN0cyBmb3IgaXQsIHRoZXJlIG11c3QgaGF2ZSBiZWVuIGFcbiAgICAgIC8vIHJlYXNvbi5cbiAgICAgIHNlbGYuX2FkZGVkQmVmb3JlID0gZnVuY3Rpb24gKGlkLCBmaWVsZHMsIGJlZm9yZSkge1xuICAgICAgICBjYWxsYmFja3MuYWRkZWQoaWQsIGZpZWxkcyk7XG4gICAgICB9O1xuICAgIH1cbiAgfSk7XG4gIHNlbGYuX3N0b3BwZWQgPSBmYWxzZTtcbiAgc2VsZi5faWQgPSBuZXh0T2JzZXJ2ZUhhbmRsZUlkKys7XG59O1xuT2JzZXJ2ZUhhbmRsZS5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICByZXR1cm47XG4gIHNlbGYuX3N0b3BwZWQgPSB0cnVlO1xuICBzZWxmLl9tdWx0aXBsZXhlci5yZW1vdmVIYW5kbGUoc2VsZi5faWQpO1xufTtcbiIsInZhciBGaWJlciA9IE5wbS5yZXF1aXJlKCdmaWJlcnMnKTtcbnZhciBGdXR1cmUgPSBOcG0ucmVxdWlyZSgnZmliZXJzL2Z1dHVyZScpO1xuXG5Eb2NGZXRjaGVyID0gZnVuY3Rpb24gKG1vbmdvQ29ubmVjdGlvbikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYuX21vbmdvQ29ubmVjdGlvbiA9IG1vbmdvQ29ubmVjdGlvbjtcbiAgLy8gTWFwIGZyb20gY2FjaGUga2V5IC0+IFtjYWxsYmFja11cbiAgc2VsZi5fY2FsbGJhY2tzRm9yQ2FjaGVLZXkgPSB7fTtcbn07XG5cbl8uZXh0ZW5kKERvY0ZldGNoZXIucHJvdG90eXBlLCB7XG4gIC8vIEZldGNoZXMgZG9jdW1lbnQgXCJpZFwiIGZyb20gY29sbGVjdGlvbk5hbWUsIHJldHVybmluZyBpdCBvciBudWxsIGlmIG5vdFxuICAvLyBmb3VuZC5cbiAgLy9cbiAgLy8gSWYgeW91IG1ha2UgbXVsdGlwbGUgY2FsbHMgdG8gZmV0Y2goKSB3aXRoIHRoZSBzYW1lIGNhY2hlS2V5IChhIHN0cmluZyksXG4gIC8vIERvY0ZldGNoZXIgbWF5IGFzc3VtZSB0aGF0IHRoZXkgYWxsIHJldHVybiB0aGUgc2FtZSBkb2N1bWVudC4gKEl0IGRvZXNcbiAgLy8gbm90IGNoZWNrIHRvIHNlZSBpZiBjb2xsZWN0aW9uTmFtZS9pZCBtYXRjaC4pXG4gIC8vXG4gIC8vIFlvdSBtYXkgYXNzdW1lIHRoYXQgY2FsbGJhY2sgaXMgbmV2ZXIgY2FsbGVkIHN5bmNocm9ub3VzbHkgKGFuZCBpbiBmYWN0XG4gIC8vIE9wbG9nT2JzZXJ2ZURyaXZlciBkb2VzIHNvKS5cbiAgZmV0Y2g6IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgaWQsIGNhY2hlS2V5LCBjYWxsYmFjaykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGNoZWNrKGNvbGxlY3Rpb25OYW1lLCBTdHJpbmcpO1xuICAgIC8vIGlkIGlzIHNvbWUgc29ydCBvZiBzY2FsYXJcbiAgICBjaGVjayhjYWNoZUtleSwgU3RyaW5nKTtcblxuICAgIC8vIElmIHRoZXJlJ3MgYWxyZWFkeSBhbiBpbi1wcm9ncmVzcyBmZXRjaCBmb3IgdGhpcyBjYWNoZSBrZXksIHlpZWxkIHVudGlsXG4gICAgLy8gaXQncyBkb25lIGFuZCByZXR1cm4gd2hhdGV2ZXIgaXQgcmV0dXJucy5cbiAgICBpZiAoXy5oYXMoc2VsZi5fY2FsbGJhY2tzRm9yQ2FjaGVLZXksIGNhY2hlS2V5KSkge1xuICAgICAgc2VsZi5fY2FsbGJhY2tzRm9yQ2FjaGVLZXlbY2FjaGVLZXldLnB1c2goY2FsbGJhY2spO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBjYWxsYmFja3MgPSBzZWxmLl9jYWxsYmFja3NGb3JDYWNoZUtleVtjYWNoZUtleV0gPSBbY2FsbGJhY2tdO1xuXG4gICAgRmliZXIoZnVuY3Rpb24gKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIGRvYyA9IHNlbGYuX21vbmdvQ29ubmVjdGlvbi5maW5kT25lKFxuICAgICAgICAgIGNvbGxlY3Rpb25OYW1lLCB7X2lkOiBpZH0pIHx8IG51bGw7XG4gICAgICAgIC8vIFJldHVybiBkb2MgdG8gYWxsIHJlbGV2YW50IGNhbGxiYWNrcy4gTm90ZSB0aGF0IHRoaXMgYXJyYXkgY2FuXG4gICAgICAgIC8vIGNvbnRpbnVlIHRvIGdyb3cgZHVyaW5nIGNhbGxiYWNrIGV4Y2VjdXRpb24uXG4gICAgICAgIHdoaWxlICghXy5pc0VtcHR5KGNhbGxiYWNrcykpIHtcbiAgICAgICAgICAvLyBDbG9uZSB0aGUgZG9jdW1lbnQgc28gdGhhdCB0aGUgdmFyaW91cyBjYWxscyB0byBmZXRjaCBkb24ndCByZXR1cm5cbiAgICAgICAgICAvLyBvYmplY3RzIHRoYXQgYXJlIGludGVydHdpbmdsZWQgd2l0aCBlYWNoIG90aGVyLiBDbG9uZSBiZWZvcmVcbiAgICAgICAgICAvLyBwb3BwaW5nIHRoZSBmdXR1cmUsIHNvIHRoYXQgaWYgY2xvbmUgdGhyb3dzLCB0aGUgZXJyb3IgZ2V0cyBwYXNzZWRcbiAgICAgICAgICAvLyB0byB0aGUgbmV4dCBjYWxsYmFjay5cbiAgICAgICAgICB2YXIgY2xvbmVkRG9jID0gRUpTT04uY2xvbmUoZG9jKTtcbiAgICAgICAgICBjYWxsYmFja3MucG9wKCkobnVsbCwgY2xvbmVkRG9jKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB3aGlsZSAoIV8uaXNFbXB0eShjYWxsYmFja3MpKSB7XG4gICAgICAgICAgY2FsbGJhY2tzLnBvcCgpKGUpO1xuICAgICAgICB9XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICAvLyBYWFggY29uc2lkZXIga2VlcGluZyB0aGUgZG9jIGFyb3VuZCBmb3IgYSBwZXJpb2Qgb2YgdGltZSBiZWZvcmVcbiAgICAgICAgLy8gcmVtb3ZpbmcgZnJvbSB0aGUgY2FjaGVcbiAgICAgICAgZGVsZXRlIHNlbGYuX2NhbGxiYWNrc0ZvckNhY2hlS2V5W2NhY2hlS2V5XTtcbiAgICAgIH1cbiAgICB9KS5ydW4oKTtcbiAgfVxufSk7XG5cbk1vbmdvVGVzdC5Eb2NGZXRjaGVyID0gRG9jRmV0Y2hlcjtcbiIsIlBvbGxpbmdPYnNlcnZlRHJpdmVyID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uID0gb3B0aW9ucy5jdXJzb3JEZXNjcmlwdGlvbjtcbiAgc2VsZi5fbW9uZ29IYW5kbGUgPSBvcHRpb25zLm1vbmdvSGFuZGxlO1xuICBzZWxmLl9vcmRlcmVkID0gb3B0aW9ucy5vcmRlcmVkO1xuICBzZWxmLl9tdWx0aXBsZXhlciA9IG9wdGlvbnMubXVsdGlwbGV4ZXI7XG4gIHNlbGYuX3N0b3BDYWxsYmFja3MgPSBbXTtcbiAgc2VsZi5fc3RvcHBlZCA9IGZhbHNlO1xuXG4gIHNlbGYuX3N5bmNocm9ub3VzQ3Vyc29yID0gc2VsZi5fbW9uZ29IYW5kbGUuX2NyZWF0ZVN5bmNocm9ub3VzQ3Vyc29yKFxuICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uKTtcblxuICAvLyBwcmV2aW91cyByZXN1bHRzIHNuYXBzaG90LiAgb24gZWFjaCBwb2xsIGN5Y2xlLCBkaWZmcyBhZ2FpbnN0XG4gIC8vIHJlc3VsdHMgZHJpdmVzIHRoZSBjYWxsYmFja3MuXG4gIHNlbGYuX3Jlc3VsdHMgPSBudWxsO1xuXG4gIC8vIFRoZSBudW1iZXIgb2YgX3BvbGxNb25nbyBjYWxscyB0aGF0IGhhdmUgYmVlbiBhZGRlZCB0byBzZWxmLl90YXNrUXVldWUgYnV0XG4gIC8vIGhhdmUgbm90IHN0YXJ0ZWQgcnVubmluZy4gVXNlZCB0byBtYWtlIHN1cmUgd2UgbmV2ZXIgc2NoZWR1bGUgbW9yZSB0aGFuIG9uZVxuICAvLyBfcG9sbE1vbmdvIChvdGhlciB0aGFuIHBvc3NpYmx5IHRoZSBvbmUgdGhhdCBpcyBjdXJyZW50bHkgcnVubmluZykuIEl0J3NcbiAgLy8gYWxzbyB1c2VkIGJ5IF9zdXNwZW5kUG9sbGluZyB0byBwcmV0ZW5kIHRoZXJlJ3MgYSBwb2xsIHNjaGVkdWxlZC4gVXN1YWxseSxcbiAgLy8gaXQncyBlaXRoZXIgMCAoZm9yIFwibm8gcG9sbHMgc2NoZWR1bGVkIG90aGVyIHRoYW4gbWF5YmUgb25lIGN1cnJlbnRseVxuICAvLyBydW5uaW5nXCIpIG9yIDEgKGZvciBcImEgcG9sbCBzY2hlZHVsZWQgdGhhdCBpc24ndCBydW5uaW5nIHlldFwiKSwgYnV0IGl0IGNhblxuICAvLyBhbHNvIGJlIDIgaWYgaW5jcmVtZW50ZWQgYnkgX3N1c3BlbmRQb2xsaW5nLlxuICBzZWxmLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgPSAwO1xuICBzZWxmLl9wZW5kaW5nV3JpdGVzID0gW107IC8vIHBlb3BsZSB0byBub3RpZnkgd2hlbiBwb2xsaW5nIGNvbXBsZXRlc1xuXG4gIC8vIE1ha2Ugc3VyZSB0byBjcmVhdGUgYSBzZXBhcmF0ZWx5IHRocm90dGxlZCBmdW5jdGlvbiBmb3IgZWFjaFxuICAvLyBQb2xsaW5nT2JzZXJ2ZURyaXZlciBvYmplY3QuXG4gIHNlbGYuX2Vuc3VyZVBvbGxJc1NjaGVkdWxlZCA9IF8udGhyb3R0bGUoXG4gICAgc2VsZi5fdW50aHJvdHRsZWRFbnN1cmVQb2xsSXNTY2hlZHVsZWQsXG4gICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5wb2xsaW5nVGhyb3R0bGVNcyB8fCA1MCAvKiBtcyAqLyk7XG5cbiAgLy8gWFhYIGZpZ3VyZSBvdXQgaWYgd2Ugc3RpbGwgbmVlZCBhIHF1ZXVlXG4gIHNlbGYuX3Rhc2tRdWV1ZSA9IG5ldyBNZXRlb3IuX1N5bmNocm9ub3VzUXVldWUoKTtcblxuICB2YXIgbGlzdGVuZXJzSGFuZGxlID0gbGlzdGVuQWxsKFxuICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLCBmdW5jdGlvbiAobm90aWZpY2F0aW9uKSB7XG4gICAgICAvLyBXaGVuIHNvbWVvbmUgZG9lcyBhIHRyYW5zYWN0aW9uIHRoYXQgbWlnaHQgYWZmZWN0IHVzLCBzY2hlZHVsZSBhIHBvbGxcbiAgICAgIC8vIG9mIHRoZSBkYXRhYmFzZS4gSWYgdGhhdCB0cmFuc2FjdGlvbiBoYXBwZW5zIGluc2lkZSBvZiBhIHdyaXRlIGZlbmNlLFxuICAgICAgLy8gYmxvY2sgdGhlIGZlbmNlIHVudGlsIHdlJ3ZlIHBvbGxlZCBhbmQgbm90aWZpZWQgb2JzZXJ2ZXJzLlxuICAgICAgdmFyIGZlbmNlID0gRERQU2VydmVyLl9DdXJyZW50V3JpdGVGZW5jZS5nZXQoKTtcbiAgICAgIGlmIChmZW5jZSlcbiAgICAgICAgc2VsZi5fcGVuZGluZ1dyaXRlcy5wdXNoKGZlbmNlLmJlZ2luV3JpdGUoKSk7XG4gICAgICAvLyBFbnN1cmUgYSBwb2xsIGlzIHNjaGVkdWxlZC4uLiBidXQgaWYgd2UgYWxyZWFkeSBrbm93IHRoYXQgb25lIGlzLFxuICAgICAgLy8gZG9uJ3QgaGl0IHRoZSB0aHJvdHRsZWQgX2Vuc3VyZVBvbGxJc1NjaGVkdWxlZCBmdW5jdGlvbiAod2hpY2ggbWlnaHRcbiAgICAgIC8vIGxlYWQgdG8gdXMgY2FsbGluZyBpdCB1bm5lY2Vzc2FyaWx5IGluIDxwb2xsaW5nVGhyb3R0bGVNcz4gbXMpLlxuICAgICAgaWYgKHNlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCA9PT0gMClcbiAgICAgICAgc2VsZi5fZW5zdXJlUG9sbElzU2NoZWR1bGVkKCk7XG4gICAgfVxuICApO1xuICBzZWxmLl9zdG9wQ2FsbGJhY2tzLnB1c2goZnVuY3Rpb24gKCkgeyBsaXN0ZW5lcnNIYW5kbGUuc3RvcCgpOyB9KTtcblxuICAvLyBldmVyeSBvbmNlIGFuZCBhIHdoaWxlLCBwb2xsIGV2ZW4gaWYgd2UgZG9uJ3QgdGhpbmsgd2UncmUgZGlydHksIGZvclxuICAvLyBldmVudHVhbCBjb25zaXN0ZW5jeSB3aXRoIGRhdGFiYXNlIHdyaXRlcyBmcm9tIG91dHNpZGUgdGhlIE1ldGVvclxuICAvLyB1bml2ZXJzZS5cbiAgLy9cbiAgLy8gRm9yIHRlc3RpbmcsIHRoZXJlJ3MgYW4gdW5kb2N1bWVudGVkIGNhbGxiYWNrIGFyZ3VtZW50IHRvIG9ic2VydmVDaGFuZ2VzXG4gIC8vIHdoaWNoIGRpc2FibGVzIHRpbWUtYmFzZWQgcG9sbGluZyBhbmQgZ2V0cyBjYWxsZWQgYXQgdGhlIGJlZ2lubmluZyBvZiBlYWNoXG4gIC8vIHBvbGwuXG4gIGlmIChvcHRpb25zLl90ZXN0T25seVBvbGxDYWxsYmFjaykge1xuICAgIHNlbGYuX3Rlc3RPbmx5UG9sbENhbGxiYWNrID0gb3B0aW9ucy5fdGVzdE9ubHlQb2xsQ2FsbGJhY2s7XG4gIH0gZWxzZSB7XG4gICAgdmFyIHBvbGxpbmdJbnRlcnZhbCA9XG4gICAgICAgICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5wb2xsaW5nSW50ZXJ2YWxNcyB8fFxuICAgICAgICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMuX3BvbGxpbmdJbnRlcnZhbCB8fCAvLyBDT01QQVQgd2l0aCAxLjJcbiAgICAgICAgICAxMCAqIDEwMDA7XG4gICAgdmFyIGludGVydmFsSGFuZGxlID0gTWV0ZW9yLnNldEludGVydmFsKFxuICAgICAgXy5iaW5kKHNlbGYuX2Vuc3VyZVBvbGxJc1NjaGVkdWxlZCwgc2VsZiksIHBvbGxpbmdJbnRlcnZhbCk7XG4gICAgc2VsZi5fc3RvcENhbGxiYWNrcy5wdXNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIE1ldGVvci5jbGVhckludGVydmFsKGludGVydmFsSGFuZGxlKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIE1ha2Ugc3VyZSB3ZSBhY3R1YWxseSBwb2xsIHNvb24hXG4gIHNlbGYuX3VudGhyb3R0bGVkRW5zdXJlUG9sbElzU2NoZWR1bGVkKCk7XG5cbiAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLWRyaXZlcnMtcG9sbGluZ1wiLCAxKTtcbn07XG5cbl8uZXh0ZW5kKFBvbGxpbmdPYnNlcnZlRHJpdmVyLnByb3RvdHlwZSwge1xuICAvLyBUaGlzIGlzIGFsd2F5cyBjYWxsZWQgdGhyb3VnaCBfLnRocm90dGxlIChleGNlcHQgb25jZSBhdCBzdGFydHVwKS5cbiAgX3VudGhyb3R0bGVkRW5zdXJlUG9sbElzU2NoZWR1bGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgPiAwKVxuICAgICAgcmV0dXJuO1xuICAgICsrc2VsZi5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkO1xuICAgIHNlbGYuX3Rhc2tRdWV1ZS5xdWV1ZVRhc2soZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fcG9sbE1vbmdvKCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gdGVzdC1vbmx5IGludGVyZmFjZSBmb3IgY29udHJvbGxpbmcgcG9sbGluZy5cbiAgLy9cbiAgLy8gX3N1c3BlbmRQb2xsaW5nIGJsb2NrcyB1bnRpbCBhbnkgY3VycmVudGx5IHJ1bm5pbmcgYW5kIHNjaGVkdWxlZCBwb2xscyBhcmVcbiAgLy8gZG9uZSwgYW5kIHByZXZlbnRzIGFueSBmdXJ0aGVyIHBvbGxzIGZyb20gYmVpbmcgc2NoZWR1bGVkLiAobmV3XG4gIC8vIE9ic2VydmVIYW5kbGVzIGNhbiBiZSBhZGRlZCBhbmQgcmVjZWl2ZSB0aGVpciBpbml0aWFsIGFkZGVkIGNhbGxiYWNrcyxcbiAgLy8gdGhvdWdoLilcbiAgLy9cbiAgLy8gX3Jlc3VtZVBvbGxpbmcgaW1tZWRpYXRlbHkgcG9sbHMsIGFuZCBhbGxvd3MgZnVydGhlciBwb2xscyB0byBvY2N1ci5cbiAgX3N1c3BlbmRQb2xsaW5nOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gUHJldGVuZCB0aGF0IHRoZXJlJ3MgYW5vdGhlciBwb2xsIHNjaGVkdWxlZCAod2hpY2ggd2lsbCBwcmV2ZW50XG4gICAgLy8gX2Vuc3VyZVBvbGxJc1NjaGVkdWxlZCBmcm9tIHF1ZXVlaW5nIGFueSBtb3JlIHBvbGxzKS5cbiAgICArK3NlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZDtcbiAgICAvLyBOb3cgYmxvY2sgdW50aWwgYWxsIGN1cnJlbnRseSBydW5uaW5nIG9yIHNjaGVkdWxlZCBwb2xscyBhcmUgZG9uZS5cbiAgICBzZWxmLl90YXNrUXVldWUucnVuVGFzayhmdW5jdGlvbigpIHt9KTtcblxuICAgIC8vIENvbmZpcm0gdGhhdCB0aGVyZSBpcyBvbmx5IG9uZSBcInBvbGxcIiAodGhlIGZha2Ugb25lIHdlJ3JlIHByZXRlbmRpbmcgdG9cbiAgICAvLyBoYXZlKSBzY2hlZHVsZWQuXG4gICAgaWYgKHNlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCAhPT0gMSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgaXMgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCk7XG4gIH0sXG4gIF9yZXN1bWVQb2xsaW5nOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gV2Ugc2hvdWxkIGJlIGluIHRoZSBzYW1lIHN0YXRlIGFzIGluIHRoZSBlbmQgb2YgX3N1c3BlbmRQb2xsaW5nLlxuICAgIGlmIChzZWxmLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgIT09IDEpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJfcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkIGlzIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQpO1xuICAgIC8vIFJ1biBhIHBvbGwgc3luY2hyb25vdXNseSAod2hpY2ggd2lsbCBjb3VudGVyYWN0IHRoZVxuICAgIC8vICsrX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCBmcm9tIF9zdXNwZW5kUG9sbGluZykuXG4gICAgc2VsZi5fdGFza1F1ZXVlLnJ1blRhc2soZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fcG9sbE1vbmdvKCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgX3BvbGxNb25nbzogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAtLXNlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZDtcblxuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdmFyIGZpcnN0ID0gZmFsc2U7XG4gICAgdmFyIG5ld1Jlc3VsdHM7XG4gICAgdmFyIG9sZFJlc3VsdHMgPSBzZWxmLl9yZXN1bHRzO1xuICAgIGlmICghb2xkUmVzdWx0cykge1xuICAgICAgZmlyc3QgPSB0cnVlO1xuICAgICAgLy8gWFhYIG1heWJlIHVzZSBPcmRlcmVkRGljdCBpbnN0ZWFkP1xuICAgICAgb2xkUmVzdWx0cyA9IHNlbGYuX29yZGVyZWQgPyBbXSA6IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICAgIH1cblxuICAgIHNlbGYuX3Rlc3RPbmx5UG9sbENhbGxiYWNrICYmIHNlbGYuX3Rlc3RPbmx5UG9sbENhbGxiYWNrKCk7XG5cbiAgICAvLyBTYXZlIHRoZSBsaXN0IG9mIHBlbmRpbmcgd3JpdGVzIHdoaWNoIHRoaXMgcm91bmQgd2lsbCBjb21taXQuXG4gICAgdmFyIHdyaXRlc0ZvckN5Y2xlID0gc2VsZi5fcGVuZGluZ1dyaXRlcztcbiAgICBzZWxmLl9wZW5kaW5nV3JpdGVzID0gW107XG5cbiAgICAvLyBHZXQgdGhlIG5ldyBxdWVyeSByZXN1bHRzLiAoVGhpcyB5aWVsZHMuKVxuICAgIHRyeSB7XG4gICAgICBuZXdSZXN1bHRzID0gc2VsZi5fc3luY2hyb25vdXNDdXJzb3IuZ2V0UmF3T2JqZWN0cyhzZWxmLl9vcmRlcmVkKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZmlyc3QgJiYgdHlwZW9mKGUuY29kZSkgPT09ICdudW1iZXInKSB7XG4gICAgICAgIC8vIFRoaXMgaXMgYW4gZXJyb3IgZG9jdW1lbnQgc2VudCB0byB1cyBieSBtb25nb2QsIG5vdCBhIGNvbm5lY3Rpb25cbiAgICAgICAgLy8gZXJyb3IgZ2VuZXJhdGVkIGJ5IHRoZSBjbGllbnQuIEFuZCB3ZSd2ZSBuZXZlciBzZWVuIHRoaXMgcXVlcnkgd29ya1xuICAgICAgICAvLyBzdWNjZXNzZnVsbHkuIFByb2JhYmx5IGl0J3MgYSBiYWQgc2VsZWN0b3Igb3Igc29tZXRoaW5nLCBzbyB3ZSBzaG91bGRcbiAgICAgICAgLy8gTk9UIHJldHJ5LiBJbnN0ZWFkLCB3ZSBzaG91bGQgaGFsdCB0aGUgb2JzZXJ2ZSAod2hpY2ggZW5kcyB1cCBjYWxsaW5nXG4gICAgICAgIC8vIGBzdG9wYCBvbiB1cykuXG4gICAgICAgIHNlbGYuX211bHRpcGxleGVyLnF1ZXJ5RXJyb3IoXG4gICAgICAgICAgbmV3IEVycm9yKFxuICAgICAgICAgICAgXCJFeGNlcHRpb24gd2hpbGUgcG9sbGluZyBxdWVyeSBcIiArXG4gICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uKSArIFwiOiBcIiArIGUubWVzc2FnZSkpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIGdldFJhd09iamVjdHMgY2FuIHRocm93IGlmIHdlJ3JlIGhhdmluZyB0cm91YmxlIHRhbGtpbmcgdG8gdGhlXG4gICAgICAvLyBkYXRhYmFzZS4gIFRoYXQncyBmaW5lIC0tLSB3ZSB3aWxsIHJlcG9sbCBsYXRlciBhbnl3YXkuIEJ1dCB3ZSBzaG91bGRcbiAgICAgIC8vIG1ha2Ugc3VyZSBub3QgdG8gbG9zZSB0cmFjayBvZiB0aGlzIGN5Y2xlJ3Mgd3JpdGVzLlxuICAgICAgLy8gKEl0IGFsc28gY2FuIHRocm93IGlmIHRoZXJlJ3MganVzdCBzb21ldGhpbmcgaW52YWxpZCBhYm91dCB0aGlzIHF1ZXJ5O1xuICAgICAgLy8gdW5mb3J0dW5hdGVseSB0aGUgT2JzZXJ2ZURyaXZlciBBUEkgZG9lc24ndCBwcm92aWRlIGEgZ29vZCB3YXkgdG9cbiAgICAgIC8vIFwiY2FuY2VsXCIgdGhlIG9ic2VydmUgZnJvbSB0aGUgaW5zaWRlIGluIHRoaXMgY2FzZS5cbiAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KHNlbGYuX3BlbmRpbmdXcml0ZXMsIHdyaXRlc0ZvckN5Y2xlKTtcbiAgICAgIE1ldGVvci5fZGVidWcoXCJFeGNlcHRpb24gd2hpbGUgcG9sbGluZyBxdWVyeSBcIiArXG4gICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uKSwgZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gUnVuIGRpZmZzLlxuICAgIGlmICghc2VsZi5fc3RvcHBlZCkge1xuICAgICAgTG9jYWxDb2xsZWN0aW9uLl9kaWZmUXVlcnlDaGFuZ2VzKFxuICAgICAgICBzZWxmLl9vcmRlcmVkLCBvbGRSZXN1bHRzLCBuZXdSZXN1bHRzLCBzZWxmLl9tdWx0aXBsZXhlcik7XG4gICAgfVxuXG4gICAgLy8gU2lnbmFscyB0aGUgbXVsdGlwbGV4ZXIgdG8gYWxsb3cgYWxsIG9ic2VydmVDaGFuZ2VzIGNhbGxzIHRoYXQgc2hhcmUgdGhpc1xuICAgIC8vIG11bHRpcGxleGVyIHRvIHJldHVybi4gKFRoaXMgaGFwcGVucyBhc3luY2hyb25vdXNseSwgdmlhIHRoZVxuICAgIC8vIG11bHRpcGxleGVyJ3MgcXVldWUuKVxuICAgIGlmIChmaXJzdClcbiAgICAgIHNlbGYuX211bHRpcGxleGVyLnJlYWR5KCk7XG5cbiAgICAvLyBSZXBsYWNlIHNlbGYuX3Jlc3VsdHMgYXRvbWljYWxseS4gIChUaGlzIGFzc2lnbm1lbnQgaXMgd2hhdCBtYWtlcyBgZmlyc3RgXG4gICAgLy8gc3RheSB0aHJvdWdoIG9uIHRoZSBuZXh0IGN5Y2xlLCBzbyB3ZSd2ZSB3YWl0ZWQgdW50aWwgYWZ0ZXIgd2UndmVcbiAgICAvLyBjb21taXR0ZWQgdG8gcmVhZHktaW5nIHRoZSBtdWx0aXBsZXhlci4pXG4gICAgc2VsZi5fcmVzdWx0cyA9IG5ld1Jlc3VsdHM7XG5cbiAgICAvLyBPbmNlIHRoZSBPYnNlcnZlTXVsdGlwbGV4ZXIgaGFzIHByb2Nlc3NlZCBldmVyeXRoaW5nIHdlJ3ZlIGRvbmUgaW4gdGhpc1xuICAgIC8vIHJvdW5kLCBtYXJrIGFsbCB0aGUgd3JpdGVzIHdoaWNoIGV4aXN0ZWQgYmVmb3JlIHRoaXMgY2FsbCBhc1xuICAgIC8vIGNvbW1taXR0ZWQuIChJZiBuZXcgd3JpdGVzIGhhdmUgc2hvd24gdXAgaW4gdGhlIG1lYW50aW1lLCB0aGVyZSdsbFxuICAgIC8vIGFscmVhZHkgYmUgYW5vdGhlciBfcG9sbE1vbmdvIHRhc2sgc2NoZWR1bGVkLilcbiAgICBzZWxmLl9tdWx0aXBsZXhlci5vbkZsdXNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIF8uZWFjaCh3cml0ZXNGb3JDeWNsZSwgZnVuY3Rpb24gKHcpIHtcbiAgICAgICAgdy5jb21taXR0ZWQoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2VsZi5fc3RvcHBlZCA9IHRydWU7XG4gICAgXy5lYWNoKHNlbGYuX3N0b3BDYWxsYmFja3MsIGZ1bmN0aW9uIChjKSB7IGMoKTsgfSk7XG4gICAgLy8gUmVsZWFzZSBhbnkgd3JpdGUgZmVuY2VzIHRoYXQgYXJlIHdhaXRpbmcgb24gdXMuXG4gICAgXy5lYWNoKHNlbGYuX3BlbmRpbmdXcml0ZXMsIGZ1bmN0aW9uICh3KSB7XG4gICAgICB3LmNvbW1pdHRlZCgpO1xuICAgIH0pO1xuICAgIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXSAmJiBQYWNrYWdlWydmYWN0cy1iYXNlJ10uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLWRyaXZlcnMtcG9sbGluZ1wiLCAtMSk7XG4gIH1cbn0pO1xuIiwidmFyIEZ1dHVyZSA9IE5wbS5yZXF1aXJlKCdmaWJlcnMvZnV0dXJlJyk7XG5cbnZhciBQSEFTRSA9IHtcbiAgUVVFUllJTkc6IFwiUVVFUllJTkdcIixcbiAgRkVUQ0hJTkc6IFwiRkVUQ0hJTkdcIixcbiAgU1RFQURZOiBcIlNURUFEWVwiXG59O1xuXG4vLyBFeGNlcHRpb24gdGhyb3duIGJ5IF9uZWVkVG9Qb2xsUXVlcnkgd2hpY2ggdW5yb2xscyB0aGUgc3RhY2sgdXAgdG8gdGhlXG4vLyBlbmNsb3NpbmcgY2FsbCB0byBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeS5cbnZhciBTd2l0Y2hlZFRvUXVlcnkgPSBmdW5jdGlvbiAoKSB7fTtcbnZhciBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeSA9IGZ1bmN0aW9uIChmKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgIGYuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoIShlIGluc3RhbmNlb2YgU3dpdGNoZWRUb1F1ZXJ5KSlcbiAgICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH07XG59O1xuXG52YXIgY3VycmVudElkID0gMDtcblxuLy8gT3Bsb2dPYnNlcnZlRHJpdmVyIGlzIGFuIGFsdGVybmF0aXZlIHRvIFBvbGxpbmdPYnNlcnZlRHJpdmVyIHdoaWNoIGZvbGxvd3Ncbi8vIHRoZSBNb25nbyBvcGVyYXRpb24gbG9nIGluc3RlYWQgb2YganVzdCByZS1wb2xsaW5nIHRoZSBxdWVyeS4gSXQgb2JleXMgdGhlXG4vLyBzYW1lIHNpbXBsZSBpbnRlcmZhY2U6IGNvbnN0cnVjdGluZyBpdCBzdGFydHMgc2VuZGluZyBvYnNlcnZlQ2hhbmdlc1xuLy8gY2FsbGJhY2tzIChhbmQgYSByZWFkeSgpIGludm9jYXRpb24pIHRvIHRoZSBPYnNlcnZlTXVsdGlwbGV4ZXIsIGFuZCB5b3Ugc3RvcFxuLy8gaXQgYnkgY2FsbGluZyB0aGUgc3RvcCgpIG1ldGhvZC5cbk9wbG9nT2JzZXJ2ZURyaXZlciA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5fdXNlc09wbG9nID0gdHJ1ZTsgIC8vIHRlc3RzIGxvb2sgYXQgdGhpc1xuXG4gIHNlbGYuX2lkID0gY3VycmVudElkO1xuICBjdXJyZW50SWQrKztcblxuICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiA9IG9wdGlvbnMuY3Vyc29yRGVzY3JpcHRpb247XG4gIHNlbGYuX21vbmdvSGFuZGxlID0gb3B0aW9ucy5tb25nb0hhbmRsZTtcbiAgc2VsZi5fbXVsdGlwbGV4ZXIgPSBvcHRpb25zLm11bHRpcGxleGVyO1xuXG4gIGlmIChvcHRpb25zLm9yZGVyZWQpIHtcbiAgICB0aHJvdyBFcnJvcihcIk9wbG9nT2JzZXJ2ZURyaXZlciBvbmx5IHN1cHBvcnRzIHVub3JkZXJlZCBvYnNlcnZlQ2hhbmdlc1wiKTtcbiAgfVxuXG4gIHZhciBzb3J0ZXIgPSBvcHRpb25zLnNvcnRlcjtcbiAgLy8gV2UgZG9uJ3Qgc3VwcG9ydCAkbmVhciBhbmQgb3RoZXIgZ2VvLXF1ZXJpZXMgc28gaXQncyBPSyB0byBpbml0aWFsaXplIHRoZVxuICAvLyBjb21wYXJhdG9yIG9ubHkgb25jZSBpbiB0aGUgY29uc3RydWN0b3IuXG4gIHZhciBjb21wYXJhdG9yID0gc29ydGVyICYmIHNvcnRlci5nZXRDb21wYXJhdG9yKCk7XG5cbiAgaWYgKG9wdGlvbnMuY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5saW1pdCkge1xuICAgIC8vIFRoZXJlIGFyZSBzZXZlcmFsIHByb3BlcnRpZXMgb3JkZXJlZCBkcml2ZXIgaW1wbGVtZW50czpcbiAgICAvLyAtIF9saW1pdCBpcyBhIHBvc2l0aXZlIG51bWJlclxuICAgIC8vIC0gX2NvbXBhcmF0b3IgaXMgYSBmdW5jdGlvbi1jb21wYXJhdG9yIGJ5IHdoaWNoIHRoZSBxdWVyeSBpcyBvcmRlcmVkXG4gICAgLy8gLSBfdW5wdWJsaXNoZWRCdWZmZXIgaXMgbm9uLW51bGwgTWluL01heCBIZWFwLFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgIHRoZSBlbXB0eSBidWZmZXIgaW4gU1RFQURZIHBoYXNlIGltcGxpZXMgdGhhdCB0aGVcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICBldmVyeXRoaW5nIHRoYXQgbWF0Y2hlcyB0aGUgcXVlcmllcyBzZWxlY3RvciBmaXRzXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgaW50byBwdWJsaXNoZWQgc2V0LlxuICAgIC8vIC0gX3B1Ymxpc2hlZCAtIE1pbiBIZWFwIChhbHNvIGltcGxlbWVudHMgSWRNYXAgbWV0aG9kcylcblxuICAgIHZhciBoZWFwT3B0aW9ucyA9IHsgSWRNYXA6IExvY2FsQ29sbGVjdGlvbi5fSWRNYXAgfTtcbiAgICBzZWxmLl9saW1pdCA9IHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMubGltaXQ7XG4gICAgc2VsZi5fY29tcGFyYXRvciA9IGNvbXBhcmF0b3I7XG4gICAgc2VsZi5fc29ydGVyID0gc29ydGVyO1xuICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyID0gbmV3IE1pbk1heEhlYXAoY29tcGFyYXRvciwgaGVhcE9wdGlvbnMpO1xuICAgIC8vIFdlIG5lZWQgc29tZXRoaW5nIHRoYXQgY2FuIGZpbmQgTWF4IHZhbHVlIGluIGFkZGl0aW9uIHRvIElkTWFwIGludGVyZmFjZVxuICAgIHNlbGYuX3B1Ymxpc2hlZCA9IG5ldyBNYXhIZWFwKGNvbXBhcmF0b3IsIGhlYXBPcHRpb25zKTtcbiAgfSBlbHNlIHtcbiAgICBzZWxmLl9saW1pdCA9IDA7XG4gICAgc2VsZi5fY29tcGFyYXRvciA9IG51bGw7XG4gICAgc2VsZi5fc29ydGVyID0gbnVsbDtcbiAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlciA9IG51bGw7XG4gICAgc2VsZi5fcHVibGlzaGVkID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gIH1cblxuICAvLyBJbmRpY2F0ZXMgaWYgaXQgaXMgc2FmZSB0byBpbnNlcnQgYSBuZXcgZG9jdW1lbnQgYXQgdGhlIGVuZCBvZiB0aGUgYnVmZmVyXG4gIC8vIGZvciB0aGlzIHF1ZXJ5LiBpLmUuIGl0IGlzIGtub3duIHRoYXQgdGhlcmUgYXJlIG5vIGRvY3VtZW50cyBtYXRjaGluZyB0aGVcbiAgLy8gc2VsZWN0b3IgdGhvc2UgYXJlIG5vdCBpbiBwdWJsaXNoZWQgb3IgYnVmZmVyLlxuICBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIgPSBmYWxzZTtcblxuICBzZWxmLl9zdG9wcGVkID0gZmFsc2U7XG4gIHNlbGYuX3N0b3BIYW5kbGVzID0gW107XG5cbiAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLWRyaXZlcnMtb3Bsb2dcIiwgMSk7XG5cbiAgc2VsZi5fcmVnaXN0ZXJQaGFzZUNoYW5nZShQSEFTRS5RVUVSWUlORyk7XG5cbiAgc2VsZi5fbWF0Y2hlciA9IG9wdGlvbnMubWF0Y2hlcjtcbiAgdmFyIHByb2plY3Rpb24gPSBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLmZpZWxkcyB8fCB7fTtcbiAgc2VsZi5fcHJvamVjdGlvbkZuID0gTG9jYWxDb2xsZWN0aW9uLl9jb21waWxlUHJvamVjdGlvbihwcm9qZWN0aW9uKTtcbiAgLy8gUHJvamVjdGlvbiBmdW5jdGlvbiwgcmVzdWx0IG9mIGNvbWJpbmluZyBpbXBvcnRhbnQgZmllbGRzIGZvciBzZWxlY3RvciBhbmRcbiAgLy8gZXhpc3RpbmcgZmllbGRzIHByb2plY3Rpb25cbiAgc2VsZi5fc2hhcmVkUHJvamVjdGlvbiA9IHNlbGYuX21hdGNoZXIuY29tYmluZUludG9Qcm9qZWN0aW9uKHByb2plY3Rpb24pO1xuICBpZiAoc29ydGVyKVxuICAgIHNlbGYuX3NoYXJlZFByb2plY3Rpb24gPSBzb3J0ZXIuY29tYmluZUludG9Qcm9qZWN0aW9uKHNlbGYuX3NoYXJlZFByb2plY3Rpb24pO1xuICBzZWxmLl9zaGFyZWRQcm9qZWN0aW9uRm4gPSBMb2NhbENvbGxlY3Rpb24uX2NvbXBpbGVQcm9qZWN0aW9uKFxuICAgIHNlbGYuX3NoYXJlZFByb2plY3Rpb24pO1xuXG4gIHNlbGYuX25lZWRUb0ZldGNoID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nID0gbnVsbDtcbiAgc2VsZi5fZmV0Y2hHZW5lcmF0aW9uID0gMDtcblxuICBzZWxmLl9yZXF1ZXJ5V2hlbkRvbmVUaGlzUXVlcnkgPSBmYWxzZTtcbiAgc2VsZi5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeSA9IFtdO1xuXG4gIC8vIElmIHRoZSBvcGxvZyBoYW5kbGUgdGVsbHMgdXMgdGhhdCBpdCBza2lwcGVkIHNvbWUgZW50cmllcyAoYmVjYXVzZSBpdCBnb3RcbiAgLy8gYmVoaW5kLCBzYXkpLCByZS1wb2xsLlxuICBzZWxmLl9zdG9wSGFuZGxlcy5wdXNoKHNlbGYuX21vbmdvSGFuZGxlLl9vcGxvZ0hhbmRsZS5vblNraXBwZWRFbnRyaWVzKFxuICAgIGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5KGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX25lZWRUb1BvbGxRdWVyeSgpO1xuICAgIH0pXG4gICkpO1xuXG4gIGZvckVhY2hUcmlnZ2VyKHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLCBmdW5jdGlvbiAodHJpZ2dlcikge1xuICAgIHNlbGYuX3N0b3BIYW5kbGVzLnB1c2goc2VsZi5fbW9uZ29IYW5kbGUuX29wbG9nSGFuZGxlLm9uT3Bsb2dFbnRyeShcbiAgICAgIHRyaWdnZXIsIGZ1bmN0aW9uIChub3RpZmljYXRpb24pIHtcbiAgICAgICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBvcCA9IG5vdGlmaWNhdGlvbi5vcDtcbiAgICAgICAgICBpZiAobm90aWZpY2F0aW9uLmRyb3BDb2xsZWN0aW9uIHx8IG5vdGlmaWNhdGlvbi5kcm9wRGF0YWJhc2UpIHtcbiAgICAgICAgICAgIC8vIE5vdGU6IHRoaXMgY2FsbCBpcyBub3QgYWxsb3dlZCB0byBibG9jayBvbiBhbnl0aGluZyAoZXNwZWNpYWxseVxuICAgICAgICAgICAgLy8gb24gd2FpdGluZyBmb3Igb3Bsb2cgZW50cmllcyB0byBjYXRjaCB1cCkgYmVjYXVzZSB0aGF0IHdpbGwgYmxvY2tcbiAgICAgICAgICAgIC8vIG9uT3Bsb2dFbnRyeSFcbiAgICAgICAgICAgIHNlbGYuX25lZWRUb1BvbGxRdWVyeSgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBBbGwgb3RoZXIgb3BlcmF0b3JzIHNob3VsZCBiZSBoYW5kbGVkIGRlcGVuZGluZyBvbiBwaGFzZVxuICAgICAgICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5RVUVSWUlORykge1xuICAgICAgICAgICAgICBzZWxmLl9oYW5kbGVPcGxvZ0VudHJ5UXVlcnlpbmcob3ApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgc2VsZi5faGFuZGxlT3Bsb2dFbnRyeVN0ZWFkeU9yRmV0Y2hpbmcob3ApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgICkpO1xuICB9KTtcblxuICAvLyBYWFggb3JkZXJpbmcgdy5yLnQuIGV2ZXJ5dGhpbmcgZWxzZT9cbiAgc2VsZi5fc3RvcEhhbmRsZXMucHVzaChsaXN0ZW5BbGwoXG4gICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24sIGZ1bmN0aW9uIChub3RpZmljYXRpb24pIHtcbiAgICAgIC8vIElmIHdlJ3JlIG5vdCBpbiBhIHByZS1maXJlIHdyaXRlIGZlbmNlLCB3ZSBkb24ndCBoYXZlIHRvIGRvIGFueXRoaW5nLlxuICAgICAgdmFyIGZlbmNlID0gRERQU2VydmVyLl9DdXJyZW50V3JpdGVGZW5jZS5nZXQoKTtcbiAgICAgIGlmICghZmVuY2UgfHwgZmVuY2UuZmlyZWQpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgaWYgKGZlbmNlLl9vcGxvZ09ic2VydmVEcml2ZXJzKSB7XG4gICAgICAgIGZlbmNlLl9vcGxvZ09ic2VydmVEcml2ZXJzW3NlbGYuX2lkXSA9IHNlbGY7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgZmVuY2UuX29wbG9nT2JzZXJ2ZURyaXZlcnMgPSB7fTtcbiAgICAgIGZlbmNlLl9vcGxvZ09ic2VydmVEcml2ZXJzW3NlbGYuX2lkXSA9IHNlbGY7XG5cbiAgICAgIGZlbmNlLm9uQmVmb3JlRmlyZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBkcml2ZXJzID0gZmVuY2UuX29wbG9nT2JzZXJ2ZURyaXZlcnM7XG4gICAgICAgIGRlbGV0ZSBmZW5jZS5fb3Bsb2dPYnNlcnZlRHJpdmVycztcblxuICAgICAgICAvLyBUaGlzIGZlbmNlIGNhbm5vdCBmaXJlIHVudGlsIHdlJ3ZlIGNhdWdodCB1cCB0byBcInRoaXMgcG9pbnRcIiBpbiB0aGVcbiAgICAgICAgLy8gb3Bsb2csIGFuZCBhbGwgb2JzZXJ2ZXJzIG1hZGUgaXQgYmFjayB0byB0aGUgc3RlYWR5IHN0YXRlLlxuICAgICAgICBzZWxmLl9tb25nb0hhbmRsZS5fb3Bsb2dIYW5kbGUud2FpdFVudGlsQ2F1Z2h0VXAoKTtcblxuICAgICAgICBfLmVhY2goZHJpdmVycywgZnVuY3Rpb24gKGRyaXZlcikge1xuICAgICAgICAgIGlmIChkcml2ZXIuX3N0b3BwZWQpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICB2YXIgd3JpdGUgPSBmZW5jZS5iZWdpbldyaXRlKCk7XG4gICAgICAgICAgaWYgKGRyaXZlci5fcGhhc2UgPT09IFBIQVNFLlNURUFEWSkge1xuICAgICAgICAgICAgLy8gTWFrZSBzdXJlIHRoYXQgYWxsIG9mIHRoZSBjYWxsYmFja3MgaGF2ZSBtYWRlIGl0IHRocm91Z2ggdGhlXG4gICAgICAgICAgICAvLyBtdWx0aXBsZXhlciBhbmQgYmVlbiBkZWxpdmVyZWQgdG8gT2JzZXJ2ZUhhbmRsZXMgYmVmb3JlIGNvbW1pdHRpbmdcbiAgICAgICAgICAgIC8vIHdyaXRlcy5cbiAgICAgICAgICAgIGRyaXZlci5fbXVsdGlwbGV4ZXIub25GbHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgIHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRyaXZlci5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeS5wdXNoKHdyaXRlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfVxuICApKTtcblxuICAvLyBXaGVuIE1vbmdvIGZhaWxzIG92ZXIsIHdlIG5lZWQgdG8gcmVwb2xsIHRoZSBxdWVyeSwgaW4gY2FzZSB3ZSBwcm9jZXNzZWQgYW5cbiAgLy8gb3Bsb2cgZW50cnkgdGhhdCBnb3Qgcm9sbGVkIGJhY2suXG4gIHNlbGYuX3N0b3BIYW5kbGVzLnB1c2goc2VsZi5fbW9uZ29IYW5kbGUuX29uRmFpbG92ZXIoZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkoXG4gICAgZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fbmVlZFRvUG9sbFF1ZXJ5KCk7XG4gICAgfSkpKTtcblxuICAvLyBHaXZlIF9vYnNlcnZlQ2hhbmdlcyBhIGNoYW5jZSB0byBhZGQgdGhlIG5ldyBPYnNlcnZlSGFuZGxlIHRvIG91clxuICAvLyBtdWx0aXBsZXhlciwgc28gdGhhdCB0aGUgYWRkZWQgY2FsbHMgZ2V0IHN0cmVhbWVkLlxuICBNZXRlb3IuZGVmZXIoZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkoZnVuY3Rpb24gKCkge1xuICAgIHNlbGYuX3J1bkluaXRpYWxRdWVyeSgpO1xuICB9KSk7XG59O1xuXG5fLmV4dGVuZChPcGxvZ09ic2VydmVEcml2ZXIucHJvdG90eXBlLCB7XG4gIF9hZGRQdWJsaXNoZWQ6IGZ1bmN0aW9uIChpZCwgZG9jKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBmaWVsZHMgPSBfLmNsb25lKGRvYyk7XG4gICAgICBkZWxldGUgZmllbGRzLl9pZDtcbiAgICAgIHNlbGYuX3B1Ymxpc2hlZC5zZXQoaWQsIHNlbGYuX3NoYXJlZFByb2plY3Rpb25Gbihkb2MpKTtcbiAgICAgIHNlbGYuX211bHRpcGxleGVyLmFkZGVkKGlkLCBzZWxmLl9wcm9qZWN0aW9uRm4oZmllbGRzKSk7XG5cbiAgICAgIC8vIEFmdGVyIGFkZGluZyB0aGlzIGRvY3VtZW50LCB0aGUgcHVibGlzaGVkIHNldCBtaWdodCBiZSBvdmVyZmxvd2VkXG4gICAgICAvLyAoZXhjZWVkaW5nIGNhcGFjaXR5IHNwZWNpZmllZCBieSBsaW1pdCkuIElmIHNvLCBwdXNoIHRoZSBtYXhpbXVtXG4gICAgICAvLyBlbGVtZW50IHRvIHRoZSBidWZmZXIsIHdlIG1pZ2h0IHdhbnQgdG8gc2F2ZSBpdCBpbiBtZW1vcnkgdG8gcmVkdWNlIHRoZVxuICAgICAgLy8gYW1vdW50IG9mIE1vbmdvIGxvb2t1cHMgaW4gdGhlIGZ1dHVyZS5cbiAgICAgIGlmIChzZWxmLl9saW1pdCAmJiBzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpID4gc2VsZi5fbGltaXQpIHtcbiAgICAgICAgLy8gWFhYIGluIHRoZW9yeSB0aGUgc2l6ZSBvZiBwdWJsaXNoZWQgaXMgbm8gbW9yZSB0aGFuIGxpbWl0KzFcbiAgICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgIT09IHNlbGYuX2xpbWl0ICsgMSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkFmdGVyIGFkZGluZyB0byBwdWJsaXNoZWQsIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgLSBzZWxmLl9saW1pdCkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICBcIiBkb2N1bWVudHMgYXJlIG92ZXJmbG93aW5nIHRoZSBzZXRcIik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgb3ZlcmZsb3dpbmdEb2NJZCA9IHNlbGYuX3B1Ymxpc2hlZC5tYXhFbGVtZW50SWQoKTtcbiAgICAgICAgdmFyIG92ZXJmbG93aW5nRG9jID0gc2VsZi5fcHVibGlzaGVkLmdldChvdmVyZmxvd2luZ0RvY0lkKTtcblxuICAgICAgICBpZiAoRUpTT04uZXF1YWxzKG92ZXJmbG93aW5nRG9jSWQsIGlkKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSBkb2N1bWVudCBqdXN0IGFkZGVkIGlzIG92ZXJmbG93aW5nIHRoZSBwdWJsaXNoZWQgc2V0XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgc2VsZi5fcHVibGlzaGVkLnJlbW92ZShvdmVyZmxvd2luZ0RvY0lkKTtcbiAgICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIucmVtb3ZlZChvdmVyZmxvd2luZ0RvY0lkKTtcbiAgICAgICAgc2VsZi5fYWRkQnVmZmVyZWQob3ZlcmZsb3dpbmdEb2NJZCwgb3ZlcmZsb3dpbmdEb2MpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICBfcmVtb3ZlUHVibGlzaGVkOiBmdW5jdGlvbiAoaWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fcHVibGlzaGVkLnJlbW92ZShpZCk7XG4gICAgICBzZWxmLl9tdWx0aXBsZXhlci5yZW1vdmVkKGlkKTtcbiAgICAgIGlmICghIHNlbGYuX2xpbWl0IHx8IHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgPT09IHNlbGYuX2xpbWl0KVxuICAgICAgICByZXR1cm47XG5cbiAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpID4gc2VsZi5fbGltaXQpXG4gICAgICAgIHRocm93IEVycm9yKFwic2VsZi5fcHVibGlzaGVkIGdvdCB0b28gYmlnXCIpO1xuXG4gICAgICAvLyBPSywgd2UgYXJlIHB1Ymxpc2hpbmcgbGVzcyB0aGFuIHRoZSBsaW1pdC4gTWF5YmUgd2Ugc2hvdWxkIGxvb2sgaW4gdGhlXG4gICAgICAvLyBidWZmZXIgdG8gZmluZCB0aGUgbmV4dCBlbGVtZW50IHBhc3Qgd2hhdCB3ZSB3ZXJlIHB1Ymxpc2hpbmcgYmVmb3JlLlxuXG4gICAgICBpZiAoIXNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmVtcHR5KCkpIHtcbiAgICAgICAgLy8gVGhlcmUncyBzb21ldGhpbmcgaW4gdGhlIGJ1ZmZlcjsgbW92ZSB0aGUgZmlyc3QgdGhpbmcgaW4gaXQgdG9cbiAgICAgICAgLy8gX3B1Ymxpc2hlZC5cbiAgICAgICAgdmFyIG5ld0RvY0lkID0gc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIubWluRWxlbWVudElkKCk7XG4gICAgICAgIHZhciBuZXdEb2MgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQobmV3RG9jSWQpO1xuICAgICAgICBzZWxmLl9yZW1vdmVCdWZmZXJlZChuZXdEb2NJZCk7XG4gICAgICAgIHNlbGYuX2FkZFB1Ymxpc2hlZChuZXdEb2NJZCwgbmV3RG9jKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGVyZSdzIG5vdGhpbmcgaW4gdGhlIGJ1ZmZlci4gIFRoaXMgY291bGQgbWVhbiBvbmUgb2YgYSBmZXcgdGhpbmdzLlxuXG4gICAgICAvLyAoYSkgV2UgY291bGQgYmUgaW4gdGhlIG1pZGRsZSBvZiByZS1ydW5uaW5nIHRoZSBxdWVyeSAoc3BlY2lmaWNhbGx5LCB3ZVxuICAgICAgLy8gY291bGQgYmUgaW4gX3B1Ymxpc2hOZXdSZXN1bHRzKS4gSW4gdGhhdCBjYXNlLCBfdW5wdWJsaXNoZWRCdWZmZXIgaXNcbiAgICAgIC8vIGVtcHR5IGJlY2F1c2Ugd2UgY2xlYXIgaXQgYXQgdGhlIGJlZ2lubmluZyBvZiBfcHVibGlzaE5ld1Jlc3VsdHMuIEluXG4gICAgICAvLyB0aGlzIGNhc2UsIG91ciBjYWxsZXIgYWxyZWFkeSBrbm93cyB0aGUgZW50aXJlIGFuc3dlciB0byB0aGUgcXVlcnkgYW5kXG4gICAgICAvLyB3ZSBkb24ndCBuZWVkIHRvIGRvIGFueXRoaW5nIGZhbmN5IGhlcmUuICBKdXN0IHJldHVybi5cbiAgICAgIGlmIChzZWxmLl9waGFzZSA9PT0gUEhBU0UuUVVFUllJTkcpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgLy8gKGIpIFdlJ3JlIHByZXR0eSBjb25maWRlbnQgdGhhdCB0aGUgdW5pb24gb2YgX3B1Ymxpc2hlZCBhbmRcbiAgICAgIC8vIF91bnB1Ymxpc2hlZEJ1ZmZlciBjb250YWluIGFsbCBkb2N1bWVudHMgdGhhdCBtYXRjaCBzZWxlY3Rvci4gQmVjYXVzZVxuICAgICAgLy8gX3VucHVibGlzaGVkQnVmZmVyIGlzIGVtcHR5LCB0aGF0IG1lYW5zIHdlJ3JlIGNvbmZpZGVudCB0aGF0IF9wdWJsaXNoZWRcbiAgICAgIC8vIGNvbnRhaW5zIGFsbCBkb2N1bWVudHMgdGhhdCBtYXRjaCBzZWxlY3Rvci4gU28gd2UgaGF2ZSBub3RoaW5nIHRvIGRvLlxuICAgICAgaWYgKHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlcilcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICAvLyAoYykgTWF5YmUgdGhlcmUgYXJlIG90aGVyIGRvY3VtZW50cyBvdXQgdGhlcmUgdGhhdCBzaG91bGQgYmUgaW4gb3VyXG4gICAgICAvLyBidWZmZXIuIEJ1dCBpbiB0aGF0IGNhc2UsIHdoZW4gd2UgZW1wdGllZCBfdW5wdWJsaXNoZWRCdWZmZXIgaW5cbiAgICAgIC8vIF9yZW1vdmVCdWZmZXJlZCwgd2Ugc2hvdWxkIGhhdmUgY2FsbGVkIF9uZWVkVG9Qb2xsUXVlcnksIHdoaWNoIHdpbGxcbiAgICAgIC8vIGVpdGhlciBwdXQgc29tZXRoaW5nIGluIF91bnB1Ymxpc2hlZEJ1ZmZlciBvciBzZXQgX3NhZmVBcHBlbmRUb0J1ZmZlclxuICAgICAgLy8gKG9yIGJvdGgpLCBhbmQgaXQgd2lsbCBwdXQgdXMgaW4gUVVFUllJTkcgZm9yIHRoYXQgd2hvbGUgdGltZS4gU28gaW5cbiAgICAgIC8vIGZhY3QsIHdlIHNob3VsZG4ndCBiZSBhYmxlIHRvIGdldCBoZXJlLlxuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJCdWZmZXIgaW5leHBsaWNhYmx5IGVtcHR5XCIpO1xuICAgIH0pO1xuICB9LFxuICBfY2hhbmdlUHVibGlzaGVkOiBmdW5jdGlvbiAoaWQsIG9sZERvYywgbmV3RG9jKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX3B1Ymxpc2hlZC5zZXQoaWQsIHNlbGYuX3NoYXJlZFByb2plY3Rpb25GbihuZXdEb2MpKTtcbiAgICAgIHZhciBwcm9qZWN0ZWROZXcgPSBzZWxmLl9wcm9qZWN0aW9uRm4obmV3RG9jKTtcbiAgICAgIHZhciBwcm9qZWN0ZWRPbGQgPSBzZWxmLl9wcm9qZWN0aW9uRm4ob2xkRG9jKTtcbiAgICAgIHZhciBjaGFuZ2VkID0gRGlmZlNlcXVlbmNlLm1ha2VDaGFuZ2VkRmllbGRzKFxuICAgICAgICBwcm9qZWN0ZWROZXcsIHByb2plY3RlZE9sZCk7XG4gICAgICBpZiAoIV8uaXNFbXB0eShjaGFuZ2VkKSlcbiAgICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIuY2hhbmdlZChpZCwgY2hhbmdlZCk7XG4gICAgfSk7XG4gIH0sXG4gIF9hZGRCdWZmZXJlZDogZnVuY3Rpb24gKGlkLCBkb2MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2V0KGlkLCBzZWxmLl9zaGFyZWRQcm9qZWN0aW9uRm4oZG9jKSk7XG5cbiAgICAgIC8vIElmIHNvbWV0aGluZyBpcyBvdmVyZmxvd2luZyB0aGUgYnVmZmVyLCB3ZSBqdXN0IHJlbW92ZSBpdCBmcm9tIGNhY2hlXG4gICAgICBpZiAoc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2l6ZSgpID4gc2VsZi5fbGltaXQpIHtcbiAgICAgICAgdmFyIG1heEJ1ZmZlcmVkSWQgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5tYXhFbGVtZW50SWQoKTtcblxuICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5yZW1vdmUobWF4QnVmZmVyZWRJZCk7XG5cbiAgICAgICAgLy8gU2luY2Ugc29tZXRoaW5nIG1hdGNoaW5nIGlzIHJlbW92ZWQgZnJvbSBjYWNoZSAoYm90aCBwdWJsaXNoZWQgc2V0IGFuZFxuICAgICAgICAvLyBidWZmZXIpLCBzZXQgZmxhZyB0byBmYWxzZVxuICAgICAgICBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgLy8gSXMgY2FsbGVkIGVpdGhlciB0byByZW1vdmUgdGhlIGRvYyBjb21wbGV0ZWx5IGZyb20gbWF0Y2hpbmcgc2V0IG9yIHRvIG1vdmVcbiAgLy8gaXQgdG8gdGhlIHB1Ymxpc2hlZCBzZXQgbGF0ZXIuXG4gIF9yZW1vdmVCdWZmZXJlZDogZnVuY3Rpb24gKGlkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnJlbW92ZShpZCk7XG4gICAgICAvLyBUbyBrZWVwIHRoZSBjb250cmFjdCBcImJ1ZmZlciBpcyBuZXZlciBlbXB0eSBpbiBTVEVBRFkgcGhhc2UgdW5sZXNzIHRoZVxuICAgICAgLy8gZXZlcnl0aGluZyBtYXRjaGluZyBmaXRzIGludG8gcHVibGlzaGVkXCIgdHJ1ZSwgd2UgcG9sbCBldmVyeXRoaW5nIGFzXG4gICAgICAvLyBzb29uIGFzIHdlIHNlZSB0aGUgYnVmZmVyIGJlY29taW5nIGVtcHR5LlxuICAgICAgaWYgKCEgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2l6ZSgpICYmICEgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyKVxuICAgICAgICBzZWxmLl9uZWVkVG9Qb2xsUXVlcnkoKTtcbiAgICB9KTtcbiAgfSxcbiAgLy8gQ2FsbGVkIHdoZW4gYSBkb2N1bWVudCBoYXMgam9pbmVkIHRoZSBcIk1hdGNoaW5nXCIgcmVzdWx0cyBzZXQuXG4gIC8vIFRha2VzIHJlc3BvbnNpYmlsaXR5IG9mIGtlZXBpbmcgX3VucHVibGlzaGVkQnVmZmVyIGluIHN5bmMgd2l0aCBfcHVibGlzaGVkXG4gIC8vIGFuZCB0aGUgZWZmZWN0IG9mIGxpbWl0IGVuZm9yY2VkLlxuICBfYWRkTWF0Y2hpbmc6IGZ1bmN0aW9uIChkb2MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGlkID0gZG9jLl9pZDtcbiAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKSlcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJ0cmllZCB0byBhZGQgc29tZXRoaW5nIGFscmVhZHkgcHVibGlzaGVkIFwiICsgaWQpO1xuICAgICAgaWYgKHNlbGYuX2xpbWl0ICYmIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmhhcyhpZCkpXG4gICAgICAgIHRocm93IEVycm9yKFwidHJpZWQgdG8gYWRkIHNvbWV0aGluZyBhbHJlYWR5IGV4aXN0ZWQgaW4gYnVmZmVyIFwiICsgaWQpO1xuXG4gICAgICB2YXIgbGltaXQgPSBzZWxmLl9saW1pdDtcbiAgICAgIHZhciBjb21wYXJhdG9yID0gc2VsZi5fY29tcGFyYXRvcjtcbiAgICAgIHZhciBtYXhQdWJsaXNoZWQgPSAobGltaXQgJiYgc2VsZi5fcHVibGlzaGVkLnNpemUoKSA+IDApID9cbiAgICAgICAgc2VsZi5fcHVibGlzaGVkLmdldChzZWxmLl9wdWJsaXNoZWQubWF4RWxlbWVudElkKCkpIDogbnVsbDtcbiAgICAgIHZhciBtYXhCdWZmZXJlZCA9IChsaW1pdCAmJiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgPiAwKVxuICAgICAgICA/IHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmdldChzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5tYXhFbGVtZW50SWQoKSlcbiAgICAgICAgOiBudWxsO1xuICAgICAgLy8gVGhlIHF1ZXJ5IGlzIHVubGltaXRlZCBvciBkaWRuJ3QgcHVibGlzaCBlbm91Z2ggZG9jdW1lbnRzIHlldCBvciB0aGVcbiAgICAgIC8vIG5ldyBkb2N1bWVudCB3b3VsZCBmaXQgaW50byBwdWJsaXNoZWQgc2V0IHB1c2hpbmcgdGhlIG1heGltdW0gZWxlbWVudFxuICAgICAgLy8gb3V0LCB0aGVuIHdlIG5lZWQgdG8gcHVibGlzaCB0aGUgZG9jLlxuICAgICAgdmFyIHRvUHVibGlzaCA9ICEgbGltaXQgfHwgc2VsZi5fcHVibGlzaGVkLnNpemUoKSA8IGxpbWl0IHx8XG4gICAgICAgIGNvbXBhcmF0b3IoZG9jLCBtYXhQdWJsaXNoZWQpIDwgMDtcblxuICAgICAgLy8gT3RoZXJ3aXNlIHdlIG1pZ2h0IG5lZWQgdG8gYnVmZmVyIGl0IChvbmx5IGluIGNhc2Ugb2YgbGltaXRlZCBxdWVyeSkuXG4gICAgICAvLyBCdWZmZXJpbmcgaXMgYWxsb3dlZCBpZiB0aGUgYnVmZmVyIGlzIG5vdCBmaWxsZWQgdXAgeWV0IGFuZCBhbGxcbiAgICAgIC8vIG1hdGNoaW5nIGRvY3MgYXJlIGVpdGhlciBpbiB0aGUgcHVibGlzaGVkIHNldCBvciBpbiB0aGUgYnVmZmVyLlxuICAgICAgdmFyIGNhbkFwcGVuZFRvQnVmZmVyID0gIXRvUHVibGlzaCAmJiBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIgJiZcbiAgICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2l6ZSgpIDwgbGltaXQ7XG5cbiAgICAgIC8vIE9yIGlmIGl0IGlzIHNtYWxsIGVub3VnaCB0byBiZSBzYWZlbHkgaW5zZXJ0ZWQgdG8gdGhlIG1pZGRsZSBvciB0aGVcbiAgICAgIC8vIGJlZ2lubmluZyBvZiB0aGUgYnVmZmVyLlxuICAgICAgdmFyIGNhbkluc2VydEludG9CdWZmZXIgPSAhdG9QdWJsaXNoICYmIG1heEJ1ZmZlcmVkICYmXG4gICAgICAgIGNvbXBhcmF0b3IoZG9jLCBtYXhCdWZmZXJlZCkgPD0gMDtcblxuICAgICAgdmFyIHRvQnVmZmVyID0gY2FuQXBwZW5kVG9CdWZmZXIgfHwgY2FuSW5zZXJ0SW50b0J1ZmZlcjtcblxuICAgICAgaWYgKHRvUHVibGlzaCkge1xuICAgICAgICBzZWxmLl9hZGRQdWJsaXNoZWQoaWQsIGRvYyk7XG4gICAgICB9IGVsc2UgaWYgKHRvQnVmZmVyKSB7XG4gICAgICAgIHNlbGYuX2FkZEJ1ZmZlcmVkKGlkLCBkb2MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZHJvcHBpbmcgaXQgYW5kIG5vdCBzYXZpbmcgdG8gdGhlIGNhY2hlXG4gICAgICAgIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICAvLyBDYWxsZWQgd2hlbiBhIGRvY3VtZW50IGxlYXZlcyB0aGUgXCJNYXRjaGluZ1wiIHJlc3VsdHMgc2V0LlxuICAvLyBUYWtlcyByZXNwb25zaWJpbGl0eSBvZiBrZWVwaW5nIF91bnB1Ymxpc2hlZEJ1ZmZlciBpbiBzeW5jIHdpdGggX3B1Ymxpc2hlZFxuICAvLyBhbmQgdGhlIGVmZmVjdCBvZiBsaW1pdCBlbmZvcmNlZC5cbiAgX3JlbW92ZU1hdGNoaW5nOiBmdW5jdGlvbiAoaWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKCEgc2VsZi5fcHVibGlzaGVkLmhhcyhpZCkgJiYgISBzZWxmLl9saW1pdClcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJ0cmllZCB0byByZW1vdmUgc29tZXRoaW5nIG1hdGNoaW5nIGJ1dCBub3QgY2FjaGVkIFwiICsgaWQpO1xuXG4gICAgICBpZiAoc2VsZi5fcHVibGlzaGVkLmhhcyhpZCkpIHtcbiAgICAgICAgc2VsZi5fcmVtb3ZlUHVibGlzaGVkKGlkKTtcbiAgICAgIH0gZWxzZSBpZiAoc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuaGFzKGlkKSkge1xuICAgICAgICBzZWxmLl9yZW1vdmVCdWZmZXJlZChpZCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIF9oYW5kbGVEb2M6IGZ1bmN0aW9uIChpZCwgbmV3RG9jKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBtYXRjaGVzTm93ID0gbmV3RG9jICYmIHNlbGYuX21hdGNoZXIuZG9jdW1lbnRNYXRjaGVzKG5ld0RvYykucmVzdWx0O1xuXG4gICAgICB2YXIgcHVibGlzaGVkQmVmb3JlID0gc2VsZi5fcHVibGlzaGVkLmhhcyhpZCk7XG4gICAgICB2YXIgYnVmZmVyZWRCZWZvcmUgPSBzZWxmLl9saW1pdCAmJiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5oYXMoaWQpO1xuICAgICAgdmFyIGNhY2hlZEJlZm9yZSA9IHB1Ymxpc2hlZEJlZm9yZSB8fCBidWZmZXJlZEJlZm9yZTtcblxuICAgICAgaWYgKG1hdGNoZXNOb3cgJiYgIWNhY2hlZEJlZm9yZSkge1xuICAgICAgICBzZWxmLl9hZGRNYXRjaGluZyhuZXdEb2MpO1xuICAgICAgfSBlbHNlIGlmIChjYWNoZWRCZWZvcmUgJiYgIW1hdGNoZXNOb3cpIHtcbiAgICAgICAgc2VsZi5fcmVtb3ZlTWF0Y2hpbmcoaWQpO1xuICAgICAgfSBlbHNlIGlmIChjYWNoZWRCZWZvcmUgJiYgbWF0Y2hlc05vdykge1xuICAgICAgICB2YXIgb2xkRG9jID0gc2VsZi5fcHVibGlzaGVkLmdldChpZCk7XG4gICAgICAgIHZhciBjb21wYXJhdG9yID0gc2VsZi5fY29tcGFyYXRvcjtcbiAgICAgICAgdmFyIG1pbkJ1ZmZlcmVkID0gc2VsZi5fbGltaXQgJiYgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2l6ZSgpICYmXG4gICAgICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuZ2V0KHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLm1pbkVsZW1lbnRJZCgpKTtcbiAgICAgICAgdmFyIG1heEJ1ZmZlcmVkO1xuXG4gICAgICAgIGlmIChwdWJsaXNoZWRCZWZvcmUpIHtcbiAgICAgICAgICAvLyBVbmxpbWl0ZWQgY2FzZSB3aGVyZSB0aGUgZG9jdW1lbnQgc3RheXMgaW4gcHVibGlzaGVkIG9uY2UgaXRcbiAgICAgICAgICAvLyBtYXRjaGVzIG9yIHRoZSBjYXNlIHdoZW4gd2UgZG9uJ3QgaGF2ZSBlbm91Z2ggbWF0Y2hpbmcgZG9jcyB0b1xuICAgICAgICAgIC8vIHB1Ymxpc2ggb3IgdGhlIGNoYW5nZWQgYnV0IG1hdGNoaW5nIGRvYyB3aWxsIHN0YXkgaW4gcHVibGlzaGVkXG4gICAgICAgICAgLy8gYW55d2F5cy5cbiAgICAgICAgICAvL1xuICAgICAgICAgIC8vIFhYWDogV2UgcmVseSBvbiB0aGUgZW1wdGluZXNzIG9mIGJ1ZmZlci4gQmUgc3VyZSB0byBtYWludGFpbiB0aGVcbiAgICAgICAgICAvLyBmYWN0IHRoYXQgYnVmZmVyIGNhbid0IGJlIGVtcHR5IGlmIHRoZXJlIGFyZSBtYXRjaGluZyBkb2N1bWVudHMgbm90XG4gICAgICAgICAgLy8gcHVibGlzaGVkLiBOb3RhYmx5LCB3ZSBkb24ndCB3YW50IHRvIHNjaGVkdWxlIHJlcG9sbCBhbmQgY29udGludWVcbiAgICAgICAgICAvLyByZWx5aW5nIG9uIHRoaXMgcHJvcGVydHkuXG4gICAgICAgICAgdmFyIHN0YXlzSW5QdWJsaXNoZWQgPSAhIHNlbGYuX2xpbWl0IHx8XG4gICAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgPT09IDAgfHxcbiAgICAgICAgICAgIGNvbXBhcmF0b3IobmV3RG9jLCBtaW5CdWZmZXJlZCkgPD0gMDtcblxuICAgICAgICAgIGlmIChzdGF5c0luUHVibGlzaGVkKSB7XG4gICAgICAgICAgICBzZWxmLl9jaGFuZ2VQdWJsaXNoZWQoaWQsIG9sZERvYywgbmV3RG9jKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gYWZ0ZXIgdGhlIGNoYW5nZSBkb2MgZG9lc24ndCBzdGF5IGluIHRoZSBwdWJsaXNoZWQsIHJlbW92ZSBpdFxuICAgICAgICAgICAgc2VsZi5fcmVtb3ZlUHVibGlzaGVkKGlkKTtcbiAgICAgICAgICAgIC8vIGJ1dCBpdCBjYW4gbW92ZSBpbnRvIGJ1ZmZlcmVkIG5vdywgY2hlY2sgaXRcbiAgICAgICAgICAgIG1heEJ1ZmZlcmVkID0gc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuZ2V0KFxuICAgICAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5tYXhFbGVtZW50SWQoKSk7XG5cbiAgICAgICAgICAgIHZhciB0b0J1ZmZlciA9IHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciB8fFxuICAgICAgICAgICAgICAgICAgKG1heEJ1ZmZlcmVkICYmIGNvbXBhcmF0b3IobmV3RG9jLCBtYXhCdWZmZXJlZCkgPD0gMCk7XG5cbiAgICAgICAgICAgIGlmICh0b0J1ZmZlcikge1xuICAgICAgICAgICAgICBzZWxmLl9hZGRCdWZmZXJlZChpZCwgbmV3RG9jKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIFRocm93IGF3YXkgZnJvbSBib3RoIHB1Ymxpc2hlZCBzZXQgYW5kIGJ1ZmZlclxuICAgICAgICAgICAgICBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoYnVmZmVyZWRCZWZvcmUpIHtcbiAgICAgICAgICBvbGREb2MgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQoaWQpO1xuICAgICAgICAgIC8vIHJlbW92ZSB0aGUgb2xkIHZlcnNpb24gbWFudWFsbHkgaW5zdGVhZCBvZiB1c2luZyBfcmVtb3ZlQnVmZmVyZWQgc29cbiAgICAgICAgICAvLyB3ZSBkb24ndCB0cmlnZ2VyIHRoZSBxdWVyeWluZyBpbW1lZGlhdGVseS4gIGlmIHdlIGVuZCB0aGlzIGJsb2NrXG4gICAgICAgICAgLy8gd2l0aCB0aGUgYnVmZmVyIGVtcHR5LCB3ZSB3aWxsIG5lZWQgdG8gdHJpZ2dlciB0aGUgcXVlcnkgcG9sbFxuICAgICAgICAgIC8vIG1hbnVhbGx5IHRvby5cbiAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5yZW1vdmUoaWQpO1xuXG4gICAgICAgICAgdmFyIG1heFB1Ymxpc2hlZCA9IHNlbGYuX3B1Ymxpc2hlZC5nZXQoXG4gICAgICAgICAgICBzZWxmLl9wdWJsaXNoZWQubWF4RWxlbWVudElkKCkpO1xuICAgICAgICAgIG1heEJ1ZmZlcmVkID0gc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuc2l6ZSgpICYmXG4gICAgICAgICAgICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuZ2V0KFxuICAgICAgICAgICAgICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIubWF4RWxlbWVudElkKCkpO1xuXG4gICAgICAgICAgLy8gdGhlIGJ1ZmZlcmVkIGRvYyB3YXMgdXBkYXRlZCwgaXQgY291bGQgbW92ZSB0byBwdWJsaXNoZWRcbiAgICAgICAgICB2YXIgdG9QdWJsaXNoID0gY29tcGFyYXRvcihuZXdEb2MsIG1heFB1Ymxpc2hlZCkgPCAwO1xuXG4gICAgICAgICAgLy8gb3Igc3RheXMgaW4gYnVmZmVyIGV2ZW4gYWZ0ZXIgdGhlIGNoYW5nZVxuICAgICAgICAgIHZhciBzdGF5c0luQnVmZmVyID0gKCEgdG9QdWJsaXNoICYmIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlcikgfHxcbiAgICAgICAgICAgICAgICAoIXRvUHVibGlzaCAmJiBtYXhCdWZmZXJlZCAmJlxuICAgICAgICAgICAgICAgICBjb21wYXJhdG9yKG5ld0RvYywgbWF4QnVmZmVyZWQpIDw9IDApO1xuXG4gICAgICAgICAgaWYgKHRvUHVibGlzaCkge1xuICAgICAgICAgICAgc2VsZi5fYWRkUHVibGlzaGVkKGlkLCBuZXdEb2MpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoc3RheXNJbkJ1ZmZlcikge1xuICAgICAgICAgICAgLy8gc3RheXMgaW4gYnVmZmVyIGJ1dCBjaGFuZ2VzXG4gICAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zZXQoaWQsIG5ld0RvYyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRocm93IGF3YXkgZnJvbSBib3RoIHB1Ymxpc2hlZCBzZXQgYW5kIGJ1ZmZlclxuICAgICAgICAgICAgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyID0gZmFsc2U7XG4gICAgICAgICAgICAvLyBOb3JtYWxseSB0aGlzIGNoZWNrIHdvdWxkIGhhdmUgYmVlbiBkb25lIGluIF9yZW1vdmVCdWZmZXJlZCBidXRcbiAgICAgICAgICAgIC8vIHdlIGRpZG4ndCB1c2UgaXQsIHNvIHdlIG5lZWQgdG8gZG8gaXQgb3Vyc2VsZiBub3cuXG4gICAgICAgICAgICBpZiAoISBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkpIHtcbiAgICAgICAgICAgICAgc2VsZi5fbmVlZFRvUG9sbFF1ZXJ5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImNhY2hlZEJlZm9yZSBpbXBsaWVzIGVpdGhlciBvZiBwdWJsaXNoZWRCZWZvcmUgb3IgYnVmZmVyZWRCZWZvcmUgaXMgdHJ1ZS5cIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgX2ZldGNoTW9kaWZpZWREb2N1bWVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fcmVnaXN0ZXJQaGFzZUNoYW5nZShQSEFTRS5GRVRDSElORyk7XG4gICAgICAvLyBEZWZlciwgYmVjYXVzZSBub3RoaW5nIGNhbGxlZCBmcm9tIHRoZSBvcGxvZyBlbnRyeSBoYW5kbGVyIG1heSB5aWVsZCxcbiAgICAgIC8vIGJ1dCBmZXRjaCgpIHlpZWxkcy5cbiAgICAgIE1ldGVvci5kZWZlcihmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeShmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdoaWxlICghc2VsZi5fc3RvcHBlZCAmJiAhc2VsZi5fbmVlZFRvRmV0Y2guZW1wdHkoKSkge1xuICAgICAgICAgIGlmIChzZWxmLl9waGFzZSA9PT0gUEhBU0UuUVVFUllJTkcpIHtcbiAgICAgICAgICAgIC8vIFdoaWxlIGZldGNoaW5nLCB3ZSBkZWNpZGVkIHRvIGdvIGludG8gUVVFUllJTkcgbW9kZSwgYW5kIHRoZW4gd2VcbiAgICAgICAgICAgIC8vIHNhdyBhbm90aGVyIG9wbG9nIGVudHJ5LCBzbyBfbmVlZFRvRmV0Y2ggaXMgbm90IGVtcHR5LiBCdXQgd2VcbiAgICAgICAgICAgIC8vIHNob3VsZG4ndCBmZXRjaCB0aGVzZSBkb2N1bWVudHMgdW50aWwgQUZURVIgdGhlIHF1ZXJ5IGlzIGRvbmUuXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBCZWluZyBpbiBzdGVhZHkgcGhhc2UgaGVyZSB3b3VsZCBiZSBzdXJwcmlzaW5nLlxuICAgICAgICAgIGlmIChzZWxmLl9waGFzZSAhPT0gUEhBU0UuRkVUQ0hJTkcpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwaGFzZSBpbiBmZXRjaE1vZGlmaWVkRG9jdW1lbnRzOiBcIiArIHNlbGYuX3BoYXNlKTtcblxuICAgICAgICAgIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nID0gc2VsZi5fbmVlZFRvRmV0Y2g7XG4gICAgICAgICAgdmFyIHRoaXNHZW5lcmF0aW9uID0gKytzZWxmLl9mZXRjaEdlbmVyYXRpb247XG4gICAgICAgICAgc2VsZi5fbmVlZFRvRmV0Y2ggPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgICAgICAgICB2YXIgd2FpdGluZyA9IDA7XG4gICAgICAgICAgdmFyIGZ1dCA9IG5ldyBGdXR1cmU7XG4gICAgICAgICAgLy8gVGhpcyBsb29wIGlzIHNhZmUsIGJlY2F1c2UgX2N1cnJlbnRseUZldGNoaW5nIHdpbGwgbm90IGJlIHVwZGF0ZWRcbiAgICAgICAgICAvLyBkdXJpbmcgdGhpcyBsb29wIChpbiBmYWN0LCBpdCBpcyBuZXZlciBtdXRhdGVkKS5cbiAgICAgICAgICBzZWxmLl9jdXJyZW50bHlGZXRjaGluZy5mb3JFYWNoKGZ1bmN0aW9uIChjYWNoZUtleSwgaWQpIHtcbiAgICAgICAgICAgIHdhaXRpbmcrKztcbiAgICAgICAgICAgIHNlbGYuX21vbmdvSGFuZGxlLl9kb2NGZXRjaGVyLmZldGNoKFxuICAgICAgICAgICAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZSwgaWQsIGNhY2hlS2V5LFxuICAgICAgICAgICAgICBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeShmdW5jdGlvbiAoZXJyLCBkb2MpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICBNZXRlb3IuX2RlYnVnKFwiR290IGV4Y2VwdGlvbiB3aGlsZSBmZXRjaGluZyBkb2N1bWVudHNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnIpO1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB3ZSBnZXQgYW4gZXJyb3IgZnJvbSB0aGUgZmV0Y2hlciAoZWcsIHRyb3VibGVcbiAgICAgICAgICAgICAgICAgICAgLy8gY29ubmVjdGluZyB0byBNb25nbyksIGxldCdzIGp1c3QgYWJhbmRvbiB0aGUgZmV0Y2ggcGhhc2VcbiAgICAgICAgICAgICAgICAgICAgLy8gYWx0b2dldGhlciBhbmQgZmFsbCBiYWNrIHRvIHBvbGxpbmcuIEl0J3Mgbm90IGxpa2Ugd2UncmVcbiAgICAgICAgICAgICAgICAgICAgLy8gZ2V0dGluZyBsaXZlIHVwZGF0ZXMgYW55d2F5LlxuICAgICAgICAgICAgICAgICAgICBpZiAoc2VsZi5fcGhhc2UgIT09IFBIQVNFLlFVRVJZSU5HKSB7XG4gICAgICAgICAgICAgICAgICAgICAgc2VsZi5fbmVlZFRvUG9sbFF1ZXJ5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXNlbGYuX3N0b3BwZWQgJiYgc2VsZi5fcGhhc2UgPT09IFBIQVNFLkZFVENISU5HXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICYmIHNlbGYuX2ZldGNoR2VuZXJhdGlvbiA9PT0gdGhpc0dlbmVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gV2UgcmUtY2hlY2sgdGhlIGdlbmVyYXRpb24gaW4gY2FzZSB3ZSd2ZSBoYWQgYW4gZXhwbGljaXRcbiAgICAgICAgICAgICAgICAgICAgLy8gX3BvbGxRdWVyeSBjYWxsIChlZywgaW4gYW5vdGhlciBmaWJlcikgd2hpY2ggc2hvdWxkXG4gICAgICAgICAgICAgICAgICAgIC8vIGVmZmVjdGl2ZWx5IGNhbmNlbCB0aGlzIHJvdW5kIG9mIGZldGNoZXMuICAoX3BvbGxRdWVyeVxuICAgICAgICAgICAgICAgICAgICAvLyBpbmNyZW1lbnRzIHRoZSBnZW5lcmF0aW9uLilcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5faGFuZGxlRG9jKGlkLCBkb2MpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgICB3YWl0aW5nLS07XG4gICAgICAgICAgICAgICAgICAvLyBCZWNhdXNlIGZldGNoKCkgbmV2ZXIgY2FsbHMgaXRzIGNhbGxiYWNrIHN5bmNocm9ub3VzbHksXG4gICAgICAgICAgICAgICAgICAvLyB0aGlzIGlzIHNhZmUgKGllLCB3ZSB3b24ndCBjYWxsIGZ1dC5yZXR1cm4oKSBiZWZvcmUgdGhlXG4gICAgICAgICAgICAgICAgICAvLyBmb3JFYWNoIGlzIGRvbmUpLlxuICAgICAgICAgICAgICAgICAgaWYgKHdhaXRpbmcgPT09IDApXG4gICAgICAgICAgICAgICAgICAgIGZ1dC5yZXR1cm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBmdXQud2FpdCgpO1xuICAgICAgICAgIC8vIEV4aXQgbm93IGlmIHdlJ3ZlIGhhZCBhIF9wb2xsUXVlcnkgY2FsbCAoaGVyZSBvciBpbiBhbm90aGVyIGZpYmVyKS5cbiAgICAgICAgICBpZiAoc2VsZi5fcGhhc2UgPT09IFBIQVNFLlFVRVJZSU5HKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICAvLyBXZSdyZSBkb25lIGZldGNoaW5nLCBzbyB3ZSBjYW4gYmUgc3RlYWR5LCB1bmxlc3Mgd2UndmUgaGFkIGFcbiAgICAgICAgLy8gX3BvbGxRdWVyeSBjYWxsIChoZXJlIG9yIGluIGFub3RoZXIgZmliZXIpLlxuICAgICAgICBpZiAoc2VsZi5fcGhhc2UgIT09IFBIQVNFLlFVRVJZSU5HKVxuICAgICAgICAgIHNlbGYuX2JlU3RlYWR5KCk7XG4gICAgICB9KSk7XG4gICAgfSk7XG4gIH0sXG4gIF9iZVN0ZWFkeTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9yZWdpc3RlclBoYXNlQ2hhbmdlKFBIQVNFLlNURUFEWSk7XG4gICAgICB2YXIgd3JpdGVzID0gc2VsZi5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeTtcbiAgICAgIHNlbGYuX3dyaXRlc1RvQ29tbWl0V2hlbldlUmVhY2hTdGVhZHkgPSBbXTtcbiAgICAgIHNlbGYuX211bHRpcGxleGVyLm9uRmx1c2goZnVuY3Rpb24gKCkge1xuICAgICAgICBfLmVhY2god3JpdGVzLCBmdW5jdGlvbiAodykge1xuICAgICAgICAgIHcuY29tbWl0dGVkKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG4gIF9oYW5kbGVPcGxvZ0VudHJ5UXVlcnlpbmc6IGZ1bmN0aW9uIChvcCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9uZWVkVG9GZXRjaC5zZXQoaWRGb3JPcChvcCksIG9wLnRzLnRvU3RyaW5nKCkpO1xuICAgIH0pO1xuICB9LFxuICBfaGFuZGxlT3Bsb2dFbnRyeVN0ZWFkeU9yRmV0Y2hpbmc6IGZ1bmN0aW9uIChvcCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgaWQgPSBpZEZvck9wKG9wKTtcbiAgICAgIC8vIElmIHdlJ3JlIGFscmVhZHkgZmV0Y2hpbmcgdGhpcyBvbmUsIG9yIGFib3V0IHRvLCB3ZSBjYW4ndCBvcHRpbWl6ZTtcbiAgICAgIC8vIG1ha2Ugc3VyZSB0aGF0IHdlIGZldGNoIGl0IGFnYWluIGlmIG5lY2Vzc2FyeS5cbiAgICAgIGlmIChzZWxmLl9waGFzZSA9PT0gUEhBU0UuRkVUQ0hJTkcgJiZcbiAgICAgICAgICAoKHNlbGYuX2N1cnJlbnRseUZldGNoaW5nICYmIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nLmhhcyhpZCkpIHx8XG4gICAgICAgICAgIHNlbGYuX25lZWRUb0ZldGNoLmhhcyhpZCkpKSB7XG4gICAgICAgIHNlbGYuX25lZWRUb0ZldGNoLnNldChpZCwgb3AudHMudG9TdHJpbmcoKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKG9wLm9wID09PSAnZCcpIHtcbiAgICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5oYXMoaWQpIHx8XG4gICAgICAgICAgICAoc2VsZi5fbGltaXQgJiYgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuaGFzKGlkKSkpXG4gICAgICAgICAgc2VsZi5fcmVtb3ZlTWF0Y2hpbmcoaWQpO1xuICAgICAgfSBlbHNlIGlmIChvcC5vcCA9PT0gJ2knKSB7XG4gICAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKSlcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnNlcnQgZm91bmQgZm9yIGFscmVhZHktZXhpc3RpbmcgSUQgaW4gcHVibGlzaGVkXCIpO1xuICAgICAgICBpZiAoc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIgJiYgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuaGFzKGlkKSlcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnNlcnQgZm91bmQgZm9yIGFscmVhZHktZXhpc3RpbmcgSUQgaW4gYnVmZmVyXCIpO1xuXG4gICAgICAgIC8vIFhYWCB3aGF0IGlmIHNlbGVjdG9yIHlpZWxkcz8gIGZvciBub3cgaXQgY2FuJ3QgYnV0IGxhdGVyIGl0IGNvdWxkXG4gICAgICAgIC8vIGhhdmUgJHdoZXJlXG4gICAgICAgIGlmIChzZWxmLl9tYXRjaGVyLmRvY3VtZW50TWF0Y2hlcyhvcC5vKS5yZXN1bHQpXG4gICAgICAgICAgc2VsZi5fYWRkTWF0Y2hpbmcob3Aubyk7XG4gICAgICB9IGVsc2UgaWYgKG9wLm9wID09PSAndScpIHtcbiAgICAgICAgLy8gSXMgdGhpcyBhIG1vZGlmaWVyICgkc2V0LyR1bnNldCwgd2hpY2ggbWF5IHJlcXVpcmUgdXMgdG8gcG9sbCB0aGVcbiAgICAgICAgLy8gZGF0YWJhc2UgdG8gZmlndXJlIG91dCBpZiB0aGUgd2hvbGUgZG9jdW1lbnQgbWF0Y2hlcyB0aGUgc2VsZWN0b3IpIG9yXG4gICAgICAgIC8vIGEgcmVwbGFjZW1lbnQgKGluIHdoaWNoIGNhc2Ugd2UgY2FuIGp1c3QgZGlyZWN0bHkgcmUtZXZhbHVhdGUgdGhlXG4gICAgICAgIC8vIHNlbGVjdG9yKT9cbiAgICAgICAgdmFyIGlzUmVwbGFjZSA9ICFfLmhhcyhvcC5vLCAnJHNldCcpICYmICFfLmhhcyhvcC5vLCAnJHVuc2V0Jyk7XG4gICAgICAgIC8vIElmIHRoaXMgbW9kaWZpZXIgbW9kaWZpZXMgc29tZXRoaW5nIGluc2lkZSBhbiBFSlNPTiBjdXN0b20gdHlwZSAoaWUsXG4gICAgICAgIC8vIGFueXRoaW5nIHdpdGggRUpTT04kKSwgdGhlbiB3ZSBjYW4ndCB0cnkgdG8gdXNlXG4gICAgICAgIC8vIExvY2FsQ29sbGVjdGlvbi5fbW9kaWZ5LCBzaW5jZSB0aGF0IGp1c3QgbXV0YXRlcyB0aGUgRUpTT04gZW5jb2RpbmcsXG4gICAgICAgIC8vIG5vdCB0aGUgYWN0dWFsIG9iamVjdC5cbiAgICAgICAgdmFyIGNhbkRpcmVjdGx5TW9kaWZ5RG9jID1cbiAgICAgICAgICAhaXNSZXBsYWNlICYmIG1vZGlmaWVyQ2FuQmVEaXJlY3RseUFwcGxpZWQob3Aubyk7XG5cbiAgICAgICAgdmFyIHB1Ymxpc2hlZEJlZm9yZSA9IHNlbGYuX3B1Ymxpc2hlZC5oYXMoaWQpO1xuICAgICAgICB2YXIgYnVmZmVyZWRCZWZvcmUgPSBzZWxmLl9saW1pdCAmJiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5oYXMoaWQpO1xuXG4gICAgICAgIGlmIChpc1JlcGxhY2UpIHtcbiAgICAgICAgICBzZWxmLl9oYW5kbGVEb2MoaWQsIF8uZXh0ZW5kKHtfaWQ6IGlkfSwgb3AubykpO1xuICAgICAgICB9IGVsc2UgaWYgKChwdWJsaXNoZWRCZWZvcmUgfHwgYnVmZmVyZWRCZWZvcmUpICYmXG4gICAgICAgICAgICAgICAgICAgY2FuRGlyZWN0bHlNb2RpZnlEb2MpIHtcbiAgICAgICAgICAvLyBPaCBncmVhdCwgd2UgYWN0dWFsbHkga25vdyB3aGF0IHRoZSBkb2N1bWVudCBpcywgc28gd2UgY2FuIGFwcGx5XG4gICAgICAgICAgLy8gdGhpcyBkaXJlY3RseS5cbiAgICAgICAgICB2YXIgbmV3RG9jID0gc2VsZi5fcHVibGlzaGVkLmhhcyhpZClcbiAgICAgICAgICAgID8gc2VsZi5fcHVibGlzaGVkLmdldChpZCkgOiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQoaWQpO1xuICAgICAgICAgIG5ld0RvYyA9IEVKU09OLmNsb25lKG5ld0RvYyk7XG5cbiAgICAgICAgICBuZXdEb2MuX2lkID0gaWQ7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIExvY2FsQ29sbGVjdGlvbi5fbW9kaWZ5KG5ld0RvYywgb3Aubyk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGUubmFtZSAhPT0gXCJNaW5pbW9uZ29FcnJvclwiKVxuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgLy8gV2UgZGlkbid0IHVuZGVyc3RhbmQgdGhlIG1vZGlmaWVyLiAgUmUtZmV0Y2guXG4gICAgICAgICAgICBzZWxmLl9uZWVkVG9GZXRjaC5zZXQoaWQsIG9wLnRzLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5TVEVBRFkpIHtcbiAgICAgICAgICAgICAgc2VsZi5fZmV0Y2hNb2RpZmllZERvY3VtZW50cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzZWxmLl9oYW5kbGVEb2MoaWQsIHNlbGYuX3NoYXJlZFByb2plY3Rpb25GbihuZXdEb2MpKTtcbiAgICAgICAgfSBlbHNlIGlmICghY2FuRGlyZWN0bHlNb2RpZnlEb2MgfHxcbiAgICAgICAgICAgICAgICAgICBzZWxmLl9tYXRjaGVyLmNhbkJlY29tZVRydWVCeU1vZGlmaWVyKG9wLm8pIHx8XG4gICAgICAgICAgICAgICAgICAgKHNlbGYuX3NvcnRlciAmJiBzZWxmLl9zb3J0ZXIuYWZmZWN0ZWRCeU1vZGlmaWVyKG9wLm8pKSkge1xuICAgICAgICAgIHNlbGYuX25lZWRUb0ZldGNoLnNldChpZCwgb3AudHMudG9TdHJpbmcoKSk7XG4gICAgICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5TVEVBRFkpXG4gICAgICAgICAgICBzZWxmLl9mZXRjaE1vZGlmaWVkRG9jdW1lbnRzKCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IEVycm9yKFwiWFhYIFNVUlBSSVNJTkcgT1BFUkFUSU9OOiBcIiArIG9wKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgLy8gWWllbGRzIVxuICBfcnVuSW5pdGlhbFF1ZXJ5OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwib3Bsb2cgc3RvcHBlZCBzdXJwcmlzaW5nbHkgZWFybHlcIik7XG5cbiAgICBzZWxmLl9ydW5RdWVyeSh7aW5pdGlhbDogdHJ1ZX0pOyAgLy8geWllbGRzXG5cbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHJldHVybjsgIC8vIGNhbiBoYXBwZW4gb24gcXVlcnlFcnJvclxuXG4gICAgLy8gQWxsb3cgb2JzZXJ2ZUNoYW5nZXMgY2FsbHMgdG8gcmV0dXJuLiAoQWZ0ZXIgdGhpcywgaXQncyBwb3NzaWJsZSBmb3JcbiAgICAvLyBzdG9wKCkgdG8gYmUgY2FsbGVkLilcbiAgICBzZWxmLl9tdWx0aXBsZXhlci5yZWFkeSgpO1xuXG4gICAgc2VsZi5fZG9uZVF1ZXJ5aW5nKCk7ICAvLyB5aWVsZHNcbiAgfSxcblxuICAvLyBJbiB2YXJpb3VzIGNpcmN1bXN0YW5jZXMsIHdlIG1heSBqdXN0IHdhbnQgdG8gc3RvcCBwcm9jZXNzaW5nIHRoZSBvcGxvZyBhbmRcbiAgLy8gcmUtcnVuIHRoZSBpbml0aWFsIHF1ZXJ5LCBqdXN0IGFzIGlmIHdlIHdlcmUgYSBQb2xsaW5nT2JzZXJ2ZURyaXZlci5cbiAgLy9cbiAgLy8gVGhpcyBmdW5jdGlvbiBtYXkgbm90IGJsb2NrLCBiZWNhdXNlIGl0IGlzIGNhbGxlZCBmcm9tIGFuIG9wbG9nIGVudHJ5XG4gIC8vIGhhbmRsZXIuXG4gIC8vXG4gIC8vIFhYWCBXZSBzaG91bGQgY2FsbCB0aGlzIHdoZW4gd2UgZGV0ZWN0IHRoYXQgd2UndmUgYmVlbiBpbiBGRVRDSElORyBmb3IgXCJ0b29cbiAgLy8gbG9uZ1wiLlxuICAvL1xuICAvLyBYWFggV2Ugc2hvdWxkIGNhbGwgdGhpcyB3aGVuIHdlIGRldGVjdCBNb25nbyBmYWlsb3ZlciAoc2luY2UgdGhhdCBtaWdodFxuICAvLyBtZWFuIHRoYXQgc29tZSBvZiB0aGUgb3Bsb2cgZW50cmllcyB3ZSBoYXZlIHByb2Nlc3NlZCBoYXZlIGJlZW4gcm9sbGVkXG4gIC8vIGJhY2spLiBUaGUgTm9kZSBNb25nbyBkcml2ZXIgaXMgaW4gdGhlIG1pZGRsZSBvZiBhIGJ1bmNoIG9mIGh1Z2VcbiAgLy8gcmVmYWN0b3JpbmdzLCBpbmNsdWRpbmcgdGhlIHdheSB0aGF0IGl0IG5vdGlmaWVzIHlvdSB3aGVuIHByaW1hcnlcbiAgLy8gY2hhbmdlcy4gV2lsbCBwdXQgb2ZmIGltcGxlbWVudGluZyB0aGlzIHVudGlsIGRyaXZlciAxLjQgaXMgb3V0LlxuICBfcG9sbFF1ZXJ5OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgICByZXR1cm47XG5cbiAgICAgIC8vIFlheSwgd2UgZ2V0IHRvIGZvcmdldCBhYm91dCBhbGwgdGhlIHRoaW5ncyB3ZSB0aG91Z2h0IHdlIGhhZCB0byBmZXRjaC5cbiAgICAgIHNlbGYuX25lZWRUb0ZldGNoID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gICAgICBzZWxmLl9jdXJyZW50bHlGZXRjaGluZyA9IG51bGw7XG4gICAgICArK3NlbGYuX2ZldGNoR2VuZXJhdGlvbjsgIC8vIGlnbm9yZSBhbnkgaW4tZmxpZ2h0IGZldGNoZXNcbiAgICAgIHNlbGYuX3JlZ2lzdGVyUGhhc2VDaGFuZ2UoUEhBU0UuUVVFUllJTkcpO1xuXG4gICAgICAvLyBEZWZlciBzbyB0aGF0IHdlIGRvbid0IHlpZWxkLiAgV2UgZG9uJ3QgbmVlZCBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeVxuICAgICAgLy8gaGVyZSBiZWNhdXNlIFN3aXRjaGVkVG9RdWVyeSBpcyBub3QgdGhyb3duIGluIFFVRVJZSU5HIG1vZGUuXG4gICAgICBNZXRlb3IuZGVmZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLl9ydW5RdWVyeSgpO1xuICAgICAgICBzZWxmLl9kb25lUXVlcnlpbmcoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFlpZWxkcyFcbiAgX3J1blF1ZXJ5OiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgbmV3UmVzdWx0cywgbmV3QnVmZmVyO1xuXG4gICAgLy8gVGhpcyB3aGlsZSBsb29wIGlzIGp1c3QgdG8gcmV0cnkgZmFpbHVyZXMuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIC8vIElmIHdlJ3ZlIGJlZW4gc3RvcHBlZCwgd2UgZG9uJ3QgaGF2ZSB0byBydW4gYW55dGhpbmcgYW55IG1vcmUuXG4gICAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICBuZXdSZXN1bHRzID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gICAgICBuZXdCdWZmZXIgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcblxuICAgICAgLy8gUXVlcnkgMnggZG9jdW1lbnRzIGFzIHRoZSBoYWxmIGV4Y2x1ZGVkIGZyb20gdGhlIG9yaWdpbmFsIHF1ZXJ5IHdpbGwgZ29cbiAgICAgIC8vIGludG8gdW5wdWJsaXNoZWQgYnVmZmVyIHRvIHJlZHVjZSBhZGRpdGlvbmFsIE1vbmdvIGxvb2t1cHMgaW4gY2FzZXNcbiAgICAgIC8vIHdoZW4gZG9jdW1lbnRzIGFyZSByZW1vdmVkIGZyb20gdGhlIHB1Ymxpc2hlZCBzZXQgYW5kIG5lZWQgYVxuICAgICAgLy8gcmVwbGFjZW1lbnQuXG4gICAgICAvLyBYWFggbmVlZHMgbW9yZSB0aG91Z2h0IG9uIG5vbi16ZXJvIHNraXBcbiAgICAgIC8vIFhYWCAyIGlzIGEgXCJtYWdpYyBudW1iZXJcIiBtZWFuaW5nIHRoZXJlIGlzIGFuIGV4dHJhIGNodW5rIG9mIGRvY3MgZm9yXG4gICAgICAvLyBidWZmZXIgaWYgc3VjaCBpcyBuZWVkZWQuXG4gICAgICB2YXIgY3Vyc29yID0gc2VsZi5fY3Vyc29yRm9yUXVlcnkoeyBsaW1pdDogc2VsZi5fbGltaXQgKiAyIH0pO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY3Vyc29yLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaSkgeyAgLy8geWllbGRzXG4gICAgICAgICAgaWYgKCFzZWxmLl9saW1pdCB8fCBpIDwgc2VsZi5fbGltaXQpIHtcbiAgICAgICAgICAgIG5ld1Jlc3VsdHMuc2V0KGRvYy5faWQsIGRvYyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5ld0J1ZmZlci5zZXQoZG9jLl9pZCwgZG9jKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBicmVhaztcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuaW5pdGlhbCAmJiB0eXBlb2YoZS5jb2RlKSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAvLyBUaGlzIGlzIGFuIGVycm9yIGRvY3VtZW50IHNlbnQgdG8gdXMgYnkgbW9uZ29kLCBub3QgYSBjb25uZWN0aW9uXG4gICAgICAgICAgLy8gZXJyb3IgZ2VuZXJhdGVkIGJ5IHRoZSBjbGllbnQuIEFuZCB3ZSd2ZSBuZXZlciBzZWVuIHRoaXMgcXVlcnkgd29ya1xuICAgICAgICAgIC8vIHN1Y2Nlc3NmdWxseS4gUHJvYmFibHkgaXQncyBhIGJhZCBzZWxlY3RvciBvciBzb21ldGhpbmcsIHNvIHdlXG4gICAgICAgICAgLy8gc2hvdWxkIE5PVCByZXRyeS4gSW5zdGVhZCwgd2Ugc2hvdWxkIGhhbHQgdGhlIG9ic2VydmUgKHdoaWNoIGVuZHNcbiAgICAgICAgICAvLyB1cCBjYWxsaW5nIGBzdG9wYCBvbiB1cykuXG4gICAgICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIucXVlcnlFcnJvcihlKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEdXJpbmcgZmFpbG92ZXIgKGVnKSBpZiB3ZSBnZXQgYW4gZXhjZXB0aW9uIHdlIHNob3VsZCBsb2cgYW5kIHJldHJ5XG4gICAgICAgIC8vIGluc3RlYWQgb2YgY3Jhc2hpbmcuXG4gICAgICAgIE1ldGVvci5fZGVidWcoXCJHb3QgZXhjZXB0aW9uIHdoaWxlIHBvbGxpbmcgcXVlcnlcIiwgZSk7XG4gICAgICAgIE1ldGVvci5fc2xlZXBGb3JNcygxMDApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgc2VsZi5fcHVibGlzaE5ld1Jlc3VsdHMobmV3UmVzdWx0cywgbmV3QnVmZmVyKTtcbiAgfSxcblxuICAvLyBUcmFuc2l0aW9ucyB0byBRVUVSWUlORyBhbmQgcnVucyBhbm90aGVyIHF1ZXJ5LCBvciAoaWYgYWxyZWFkeSBpbiBRVUVSWUlORylcbiAgLy8gZW5zdXJlcyB0aGF0IHdlIHdpbGwgcXVlcnkgYWdhaW4gbGF0ZXIuXG4gIC8vXG4gIC8vIFRoaXMgZnVuY3Rpb24gbWF5IG5vdCBibG9jaywgYmVjYXVzZSBpdCBpcyBjYWxsZWQgZnJvbSBhbiBvcGxvZyBlbnRyeVxuICAvLyBoYW5kbGVyLiBIb3dldmVyLCBpZiB3ZSB3ZXJlIG5vdCBhbHJlYWR5IGluIHRoZSBRVUVSWUlORyBwaGFzZSwgaXQgdGhyb3dzXG4gIC8vIGFuIGV4Y2VwdGlvbiB0aGF0IGlzIGNhdWdodCBieSB0aGUgY2xvc2VzdCBzdXJyb3VuZGluZ1xuICAvLyBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeSBjYWxsOyB0aGlzIGVuc3VyZXMgdGhhdCB3ZSBkb24ndCBjb250aW51ZSBydW5uaW5nXG4gIC8vIGNsb3NlIHRoYXQgd2FzIGRlc2lnbmVkIGZvciBhbm90aGVyIHBoYXNlIGluc2lkZSBQSEFTRS5RVUVSWUlORy5cbiAgLy9cbiAgLy8gKEl0J3MgYWxzbyBuZWNlc3Nhcnkgd2hlbmV2ZXIgbG9naWMgaW4gdGhpcyBmaWxlIHlpZWxkcyB0byBjaGVjayB0aGF0IG90aGVyXG4gIC8vIHBoYXNlcyBoYXZlbid0IHB1dCB1cyBpbnRvIFFVRVJZSU5HIG1vZGUsIHRob3VnaDsgZWcsXG4gIC8vIF9mZXRjaE1vZGlmaWVkRG9jdW1lbnRzIGRvZXMgdGhpcy4pXG4gIF9uZWVkVG9Qb2xsUXVlcnk6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgLy8gSWYgd2UncmUgbm90IGFscmVhZHkgaW4gdGhlIG1pZGRsZSBvZiBhIHF1ZXJ5LCB3ZSBjYW4gcXVlcnkgbm93XG4gICAgICAvLyAocG9zc2libHkgcGF1c2luZyBGRVRDSElORykuXG4gICAgICBpZiAoc2VsZi5fcGhhc2UgIT09IFBIQVNFLlFVRVJZSU5HKSB7XG4gICAgICAgIHNlbGYuX3BvbGxRdWVyeSgpO1xuICAgICAgICB0aHJvdyBuZXcgU3dpdGNoZWRUb1F1ZXJ5O1xuICAgICAgfVxuXG4gICAgICAvLyBXZSdyZSBjdXJyZW50bHkgaW4gUVVFUllJTkcuIFNldCBhIGZsYWcgdG8gZW5zdXJlIHRoYXQgd2UgcnVuIGFub3RoZXJcbiAgICAgIC8vIHF1ZXJ5IHdoZW4gd2UncmUgZG9uZS5cbiAgICAgIHNlbGYuX3JlcXVlcnlXaGVuRG9uZVRoaXNRdWVyeSA9IHRydWU7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gWWllbGRzIVxuICBfZG9uZVF1ZXJ5aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICByZXR1cm47XG4gICAgc2VsZi5fbW9uZ29IYW5kbGUuX29wbG9nSGFuZGxlLndhaXRVbnRpbENhdWdodFVwKCk7ICAvLyB5aWVsZHNcbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHJldHVybjtcbiAgICBpZiAoc2VsZi5fcGhhc2UgIT09IFBIQVNFLlFVRVJZSU5HKVxuICAgICAgdGhyb3cgRXJyb3IoXCJQaGFzZSB1bmV4cGVjdGVkbHkgXCIgKyBzZWxmLl9waGFzZSk7XG5cbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoc2VsZi5fcmVxdWVyeVdoZW5Eb25lVGhpc1F1ZXJ5KSB7XG4gICAgICAgIHNlbGYuX3JlcXVlcnlXaGVuRG9uZVRoaXNRdWVyeSA9IGZhbHNlO1xuICAgICAgICBzZWxmLl9wb2xsUXVlcnkoKTtcbiAgICAgIH0gZWxzZSBpZiAoc2VsZi5fbmVlZFRvRmV0Y2guZW1wdHkoKSkge1xuICAgICAgICBzZWxmLl9iZVN0ZWFkeSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5fZmV0Y2hNb2RpZmllZERvY3VtZW50cygpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIF9jdXJzb3JGb3JRdWVyeTogZnVuY3Rpb24gKG9wdGlvbnNPdmVyd3JpdGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIFRoZSBxdWVyeSB3ZSBydW4gaXMgYWxtb3N0IHRoZSBzYW1lIGFzIHRoZSBjdXJzb3Igd2UgYXJlIG9ic2VydmluZyxcbiAgICAgIC8vIHdpdGggYSBmZXcgY2hhbmdlcy4gV2UgbmVlZCB0byByZWFkIGFsbCB0aGUgZmllbGRzIHRoYXQgYXJlIHJlbGV2YW50IHRvXG4gICAgICAvLyB0aGUgc2VsZWN0b3IsIG5vdCBqdXN0IHRoZSBmaWVsZHMgd2UgYXJlIGdvaW5nIHRvIHB1Ymxpc2ggKHRoYXQncyB0aGVcbiAgICAgIC8vIFwic2hhcmVkXCIgcHJvamVjdGlvbikuIEFuZCB3ZSBkb24ndCB3YW50IHRvIGFwcGx5IGFueSB0cmFuc2Zvcm0gaW4gdGhlXG4gICAgICAvLyBjdXJzb3IsIGJlY2F1c2Ugb2JzZXJ2ZUNoYW5nZXMgc2hvdWxkbid0IHVzZSB0aGUgdHJhbnNmb3JtLlxuICAgICAgdmFyIG9wdGlvbnMgPSBfLmNsb25lKHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMpO1xuXG4gICAgICAvLyBBbGxvdyB0aGUgY2FsbGVyIHRvIG1vZGlmeSB0aGUgb3B0aW9ucy4gVXNlZnVsIHRvIHNwZWNpZnkgZGlmZmVyZW50XG4gICAgICAvLyBza2lwIGFuZCBsaW1pdCB2YWx1ZXMuXG4gICAgICBfLmV4dGVuZChvcHRpb25zLCBvcHRpb25zT3ZlcndyaXRlKTtcblxuICAgICAgb3B0aW9ucy5maWVsZHMgPSBzZWxmLl9zaGFyZWRQcm9qZWN0aW9uO1xuICAgICAgZGVsZXRlIG9wdGlvbnMudHJhbnNmb3JtO1xuICAgICAgLy8gV2UgYXJlIE5PVCBkZWVwIGNsb25pbmcgZmllbGRzIG9yIHNlbGVjdG9yIGhlcmUsIHdoaWNoIHNob3VsZCBiZSBPSy5cbiAgICAgIHZhciBkZXNjcmlwdGlvbiA9IG5ldyBDdXJzb3JEZXNjcmlwdGlvbihcbiAgICAgICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWUsXG4gICAgICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yLFxuICAgICAgICBvcHRpb25zKTtcbiAgICAgIHJldHVybiBuZXcgQ3Vyc29yKHNlbGYuX21vbmdvSGFuZGxlLCBkZXNjcmlwdGlvbik7XG4gICAgfSk7XG4gIH0sXG5cblxuICAvLyBSZXBsYWNlIHNlbGYuX3B1Ymxpc2hlZCB3aXRoIG5ld1Jlc3VsdHMgKGJvdGggYXJlIElkTWFwcyksIGludm9raW5nIG9ic2VydmVcbiAgLy8gY2FsbGJhY2tzIG9uIHRoZSBtdWx0aXBsZXhlci5cbiAgLy8gUmVwbGFjZSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlciB3aXRoIG5ld0J1ZmZlci5cbiAgLy9cbiAgLy8gWFhYIFRoaXMgaXMgdmVyeSBzaW1pbGFyIHRvIExvY2FsQ29sbGVjdGlvbi5fZGlmZlF1ZXJ5VW5vcmRlcmVkQ2hhbmdlcy4gV2VcbiAgLy8gc2hvdWxkIHJlYWxseTogKGEpIFVuaWZ5IElkTWFwIGFuZCBPcmRlcmVkRGljdCBpbnRvIFVub3JkZXJlZC9PcmRlcmVkRGljdFxuICAvLyAoYikgUmV3cml0ZSBkaWZmLmpzIHRvIHVzZSB0aGVzZSBjbGFzc2VzIGluc3RlYWQgb2YgYXJyYXlzIGFuZCBvYmplY3RzLlxuICBfcHVibGlzaE5ld1Jlc3VsdHM6IGZ1bmN0aW9uIChuZXdSZXN1bHRzLCBuZXdCdWZmZXIpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBJZiB0aGUgcXVlcnkgaXMgbGltaXRlZCBhbmQgdGhlcmUgaXMgYSBidWZmZXIsIHNodXQgZG93biBzbyBpdCBkb2Vzbid0XG4gICAgICAvLyBzdGF5IGluIGEgd2F5LlxuICAgICAgaWYgKHNlbGYuX2xpbWl0KSB7XG4gICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmNsZWFyKCk7XG4gICAgICB9XG5cbiAgICAgIC8vIEZpcnN0IHJlbW92ZSBhbnl0aGluZyB0aGF0J3MgZ29uZS4gQmUgY2FyZWZ1bCBub3QgdG8gbW9kaWZ5XG4gICAgICAvLyBzZWxmLl9wdWJsaXNoZWQgd2hpbGUgaXRlcmF0aW5nIG92ZXIgaXQuXG4gICAgICB2YXIgaWRzVG9SZW1vdmUgPSBbXTtcbiAgICAgIHNlbGYuX3B1Ymxpc2hlZC5mb3JFYWNoKGZ1bmN0aW9uIChkb2MsIGlkKSB7XG4gICAgICAgIGlmICghbmV3UmVzdWx0cy5oYXMoaWQpKVxuICAgICAgICAgIGlkc1RvUmVtb3ZlLnB1c2goaWQpO1xuICAgICAgfSk7XG4gICAgICBfLmVhY2goaWRzVG9SZW1vdmUsIGZ1bmN0aW9uIChpZCkge1xuICAgICAgICBzZWxmLl9yZW1vdmVQdWJsaXNoZWQoaWQpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIE5vdyBkbyBhZGRzIGFuZCBjaGFuZ2VzLlxuICAgICAgLy8gSWYgc2VsZiBoYXMgYSBidWZmZXIgYW5kIGxpbWl0LCB0aGUgbmV3IGZldGNoZWQgcmVzdWx0IHdpbGwgYmVcbiAgICAgIC8vIGxpbWl0ZWQgY29ycmVjdGx5IGFzIHRoZSBxdWVyeSBoYXMgc29ydCBzcGVjaWZpZXIuXG4gICAgICBuZXdSZXN1bHRzLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaWQpIHtcbiAgICAgICAgc2VsZi5faGFuZGxlRG9jKGlkLCBkb2MpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFNhbml0eS1jaGVjayB0aGF0IGV2ZXJ5dGhpbmcgd2UgdHJpZWQgdG8gcHV0IGludG8gX3B1Ymxpc2hlZCBlbmRlZCB1cFxuICAgICAgLy8gdGhlcmUuXG4gICAgICAvLyBYWFggaWYgdGhpcyBpcyBzbG93LCByZW1vdmUgaXQgbGF0ZXJcbiAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpICE9PSBuZXdSZXN1bHRzLnNpemUoKSkge1xuICAgICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgICBcIlRoZSBNb25nbyBzZXJ2ZXIgYW5kIHRoZSBNZXRlb3IgcXVlcnkgZGlzYWdyZWUgb24gaG93IFwiICtcbiAgICAgICAgICAgIFwibWFueSBkb2N1bWVudHMgbWF0Y2ggeW91ciBxdWVyeS4gTWF5YmUgaXQgaXMgaGl0dGluZyBhIE1vbmdvIFwiICtcbiAgICAgICAgICAgIFwiZWRnZSBjYXNlPyBUaGUgcXVlcnkgaXM6IFwiICtcbiAgICAgICAgICAgIEVKU09OLnN0cmluZ2lmeShzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5zZWxlY3RvcikpO1xuICAgICAgfVxuICAgICAgc2VsZi5fcHVibGlzaGVkLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaWQpIHtcbiAgICAgICAgaWYgKCFuZXdSZXN1bHRzLmhhcyhpZCkpXG4gICAgICAgICAgdGhyb3cgRXJyb3IoXCJfcHVibGlzaGVkIGhhcyBhIGRvYyB0aGF0IG5ld1Jlc3VsdHMgZG9lc24ndDsgXCIgKyBpZCk7XG4gICAgICB9KTtcblxuICAgICAgLy8gRmluYWxseSwgcmVwbGFjZSB0aGUgYnVmZmVyXG4gICAgICBuZXdCdWZmZXIuZm9yRWFjaChmdW5jdGlvbiAoZG9jLCBpZCkge1xuICAgICAgICBzZWxmLl9hZGRCdWZmZXJlZChpZCwgZG9jKTtcbiAgICAgIH0pO1xuXG4gICAgICBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIgPSBuZXdCdWZmZXIuc2l6ZSgpIDwgc2VsZi5fbGltaXQ7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gVGhpcyBzdG9wIGZ1bmN0aW9uIGlzIGludm9rZWQgZnJvbSB0aGUgb25TdG9wIG9mIHRoZSBPYnNlcnZlTXVsdGlwbGV4ZXIsIHNvXG4gIC8vIGl0IHNob3VsZG4ndCBhY3R1YWxseSBiZSBwb3NzaWJsZSB0byBjYWxsIGl0IHVudGlsIHRoZSBtdWx0aXBsZXhlciBpc1xuICAvLyByZWFkeS5cbiAgLy9cbiAgLy8gSXQncyBpbXBvcnRhbnQgdG8gY2hlY2sgc2VsZi5fc3RvcHBlZCBhZnRlciBldmVyeSBjYWxsIGluIHRoaXMgZmlsZSB0aGF0XG4gIC8vIGNhbiB5aWVsZCFcbiAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHJldHVybjtcbiAgICBzZWxmLl9zdG9wcGVkID0gdHJ1ZTtcbiAgICBfLmVhY2goc2VsZi5fc3RvcEhhbmRsZXMsIGZ1bmN0aW9uIChoYW5kbGUpIHtcbiAgICAgIGhhbmRsZS5zdG9wKCk7XG4gICAgfSk7XG5cbiAgICAvLyBOb3RlOiB3ZSAqZG9uJ3QqIHVzZSBtdWx0aXBsZXhlci5vbkZsdXNoIGhlcmUgYmVjYXVzZSB0aGlzIHN0b3BcbiAgICAvLyBjYWxsYmFjayBpcyBhY3R1YWxseSBpbnZva2VkIGJ5IHRoZSBtdWx0aXBsZXhlciBpdHNlbGYgd2hlbiBpdCBoYXNcbiAgICAvLyBkZXRlcm1pbmVkIHRoYXQgdGhlcmUgYXJlIG5vIGhhbmRsZXMgbGVmdC4gU28gbm90aGluZyBpcyBhY3R1YWxseSBnb2luZ1xuICAgIC8vIHRvIGdldCBmbHVzaGVkIChhbmQgaXQncyBwcm9iYWJseSBub3QgdmFsaWQgdG8gY2FsbCBtZXRob2RzIG9uIHRoZVxuICAgIC8vIGR5aW5nIG11bHRpcGxleGVyKS5cbiAgICBfLmVhY2goc2VsZi5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeSwgZnVuY3Rpb24gKHcpIHtcbiAgICAgIHcuY29tbWl0dGVkKCk7ICAvLyBtYXliZSB5aWVsZHM/XG4gICAgfSk7XG4gICAgc2VsZi5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeSA9IG51bGw7XG5cbiAgICAvLyBQcm9hY3RpdmVseSBkcm9wIHJlZmVyZW5jZXMgdG8gcG90ZW50aWFsbHkgYmlnIHRoaW5ncy5cbiAgICBzZWxmLl9wdWJsaXNoZWQgPSBudWxsO1xuICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyID0gbnVsbDtcbiAgICBzZWxmLl9uZWVkVG9GZXRjaCA9IG51bGw7XG4gICAgc2VsZi5fY3VycmVudGx5RmV0Y2hpbmcgPSBudWxsO1xuICAgIHNlbGYuX29wbG9nRW50cnlIYW5kbGUgPSBudWxsO1xuICAgIHNlbGYuX2xpc3RlbmVyc0hhbmRsZSA9IG51bGw7XG5cbiAgICBQYWNrYWdlWydmYWN0cy1iYXNlJ10gJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICBcIm1vbmdvLWxpdmVkYXRhXCIsIFwib2JzZXJ2ZS1kcml2ZXJzLW9wbG9nXCIsIC0xKTtcbiAgfSxcblxuICBfcmVnaXN0ZXJQaGFzZUNoYW5nZTogZnVuY3Rpb24gKHBoYXNlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBub3cgPSBuZXcgRGF0ZTtcblxuICAgICAgaWYgKHNlbGYuX3BoYXNlKSB7XG4gICAgICAgIHZhciB0aW1lRGlmZiA9IG5vdyAtIHNlbGYuX3BoYXNlU3RhcnRUaW1lO1xuICAgICAgICBQYWNrYWdlWydmYWN0cy1iYXNlJ10gJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgICAgICAgXCJtb25nby1saXZlZGF0YVwiLCBcInRpbWUtc3BlbnQtaW4tXCIgKyBzZWxmLl9waGFzZSArIFwiLXBoYXNlXCIsIHRpbWVEaWZmKTtcbiAgICAgIH1cblxuICAgICAgc2VsZi5fcGhhc2UgPSBwaGFzZTtcbiAgICAgIHNlbGYuX3BoYXNlU3RhcnRUaW1lID0gbm93O1xuICAgIH0pO1xuICB9XG59KTtcblxuLy8gRG9lcyBvdXIgb3Bsb2cgdGFpbGluZyBjb2RlIHN1cHBvcnQgdGhpcyBjdXJzb3I/IEZvciBub3csIHdlIGFyZSBiZWluZyB2ZXJ5XG4vLyBjb25zZXJ2YXRpdmUgYW5kIGFsbG93aW5nIG9ubHkgc2ltcGxlIHF1ZXJpZXMgd2l0aCBzaW1wbGUgb3B0aW9ucy5cbi8vIChUaGlzIGlzIGEgXCJzdGF0aWMgbWV0aG9kXCIuKVxuT3Bsb2dPYnNlcnZlRHJpdmVyLmN1cnNvclN1cHBvcnRlZCA9IGZ1bmN0aW9uIChjdXJzb3JEZXNjcmlwdGlvbiwgbWF0Y2hlcikge1xuICAvLyBGaXJzdCwgY2hlY2sgdGhlIG9wdGlvbnMuXG4gIHZhciBvcHRpb25zID0gY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucztcblxuICAvLyBEaWQgdGhlIHVzZXIgc2F5IG5vIGV4cGxpY2l0bHk/XG4gIC8vIHVuZGVyc2NvcmVkIHZlcnNpb24gb2YgdGhlIG9wdGlvbiBpcyBDT01QQVQgd2l0aCAxLjJcbiAgaWYgKG9wdGlvbnMuZGlzYWJsZU9wbG9nIHx8IG9wdGlvbnMuX2Rpc2FibGVPcGxvZylcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgLy8gc2tpcCBpcyBub3Qgc3VwcG9ydGVkOiB0byBzdXBwb3J0IGl0IHdlIHdvdWxkIG5lZWQgdG8ga2VlcCB0cmFjayBvZiBhbGxcbiAgLy8gXCJza2lwcGVkXCIgZG9jdW1lbnRzIG9yIGF0IGxlYXN0IHRoZWlyIGlkcy5cbiAgLy8gbGltaXQgdy9vIGEgc29ydCBzcGVjaWZpZXIgaXMgbm90IHN1cHBvcnRlZDogY3VycmVudCBpbXBsZW1lbnRhdGlvbiBuZWVkcyBhXG4gIC8vIGRldGVybWluaXN0aWMgd2F5IHRvIG9yZGVyIGRvY3VtZW50cy5cbiAgaWYgKG9wdGlvbnMuc2tpcCB8fCAob3B0aW9ucy5saW1pdCAmJiAhb3B0aW9ucy5zb3J0KSkgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIElmIGEgZmllbGRzIHByb2plY3Rpb24gb3B0aW9uIGlzIGdpdmVuIGNoZWNrIGlmIGl0IGlzIHN1cHBvcnRlZCBieVxuICAvLyBtaW5pbW9uZ28gKHNvbWUgb3BlcmF0b3JzIGFyZSBub3Qgc3VwcG9ydGVkKS5cbiAgaWYgKG9wdGlvbnMuZmllbGRzKSB7XG4gICAgdHJ5IHtcbiAgICAgIExvY2FsQ29sbGVjdGlvbi5fY2hlY2tTdXBwb3J0ZWRQcm9qZWN0aW9uKG9wdGlvbnMuZmllbGRzKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZS5uYW1lID09PSBcIk1pbmltb25nb0Vycm9yXCIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBXZSBkb24ndCBhbGxvdyB0aGUgZm9sbG93aW5nIHNlbGVjdG9yczpcbiAgLy8gICAtICR3aGVyZSAobm90IGNvbmZpZGVudCB0aGF0IHdlIHByb3ZpZGUgdGhlIHNhbWUgSlMgZW52aXJvbm1lbnRcbiAgLy8gICAgICAgICAgICAgYXMgTW9uZ28sIGFuZCBjYW4geWllbGQhKVxuICAvLyAgIC0gJG5lYXIgKGhhcyBcImludGVyZXN0aW5nXCIgcHJvcGVydGllcyBpbiBNb25nb0RCLCBsaWtlIHRoZSBwb3NzaWJpbGl0eVxuICAvLyAgICAgICAgICAgIG9mIHJldHVybmluZyBhbiBJRCBtdWx0aXBsZSB0aW1lcywgdGhvdWdoIGV2ZW4gcG9sbGluZyBtYXliZVxuICAvLyAgICAgICAgICAgIGhhdmUgYSBidWcgdGhlcmUpXG4gIC8vICAgICAgICAgICBYWFg6IG9uY2Ugd2Ugc3VwcG9ydCBpdCwgd2Ugd291bGQgbmVlZCB0byB0aGluayBtb3JlIG9uIGhvdyB3ZVxuICAvLyAgICAgICAgICAgaW5pdGlhbGl6ZSB0aGUgY29tcGFyYXRvcnMgd2hlbiB3ZSBjcmVhdGUgdGhlIGRyaXZlci5cbiAgcmV0dXJuICFtYXRjaGVyLmhhc1doZXJlKCkgJiYgIW1hdGNoZXIuaGFzR2VvUXVlcnkoKTtcbn07XG5cbnZhciBtb2RpZmllckNhbkJlRGlyZWN0bHlBcHBsaWVkID0gZnVuY3Rpb24gKG1vZGlmaWVyKSB7XG4gIHJldHVybiBfLmFsbChtb2RpZmllciwgZnVuY3Rpb24gKGZpZWxkcywgb3BlcmF0aW9uKSB7XG4gICAgcmV0dXJuIF8uYWxsKGZpZWxkcywgZnVuY3Rpb24gKHZhbHVlLCBmaWVsZCkge1xuICAgICAgcmV0dXJuICEvRUpTT05cXCQvLnRlc3QoZmllbGQpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbk1vbmdvSW50ZXJuYWxzLk9wbG9nT2JzZXJ2ZURyaXZlciA9IE9wbG9nT2JzZXJ2ZURyaXZlcjtcbiIsIi8vIHNpbmdsZXRvblxuZXhwb3J0IGNvbnN0IExvY2FsQ29sbGVjdGlvbkRyaXZlciA9IG5ldyAoY2xhc3MgTG9jYWxDb2xsZWN0aW9uRHJpdmVyIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5ub0Nvbm5Db2xsZWN0aW9ucyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIH1cblxuICBvcGVuKG5hbWUsIGNvbm4pIHtcbiAgICBpZiAoISBuYW1lKSB7XG4gICAgICByZXR1cm4gbmV3IExvY2FsQ29sbGVjdGlvbjtcbiAgICB9XG5cbiAgICBpZiAoISBjb25uKSB7XG4gICAgICByZXR1cm4gZW5zdXJlQ29sbGVjdGlvbihuYW1lLCB0aGlzLm5vQ29ubkNvbGxlY3Rpb25zKTtcbiAgICB9XG5cbiAgICBpZiAoISBjb25uLl9tb25nb19saXZlZGF0YV9jb2xsZWN0aW9ucykge1xuICAgICAgY29ubi5fbW9uZ29fbGl2ZWRhdGFfY29sbGVjdGlvbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIH1cblxuICAgIC8vIFhYWCBpcyB0aGVyZSBhIHdheSB0byBrZWVwIHRyYWNrIG9mIGEgY29ubmVjdGlvbidzIGNvbGxlY3Rpb25zIHdpdGhvdXRcbiAgICAvLyBkYW5nbGluZyBpdCBvZmYgdGhlIGNvbm5lY3Rpb24gb2JqZWN0P1xuICAgIHJldHVybiBlbnN1cmVDb2xsZWN0aW9uKG5hbWUsIGNvbm4uX21vbmdvX2xpdmVkYXRhX2NvbGxlY3Rpb25zKTtcbiAgfVxufSk7XG5cbmZ1bmN0aW9uIGVuc3VyZUNvbGxlY3Rpb24obmFtZSwgY29sbGVjdGlvbnMpIHtcbiAgcmV0dXJuIChuYW1lIGluIGNvbGxlY3Rpb25zKVxuICAgID8gY29sbGVjdGlvbnNbbmFtZV1cbiAgICA6IGNvbGxlY3Rpb25zW25hbWVdID0gbmV3IExvY2FsQ29sbGVjdGlvbihuYW1lKTtcbn1cbiIsIk1vbmdvSW50ZXJuYWxzLlJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIgPSBmdW5jdGlvbiAoXG4gIG1vbmdvX3VybCwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYubW9uZ28gPSBuZXcgTW9uZ29Db25uZWN0aW9uKG1vbmdvX3VybCwgb3B0aW9ucyk7XG59O1xuXG5fLmV4dGVuZChNb25nb0ludGVybmFscy5SZW1vdGVDb2xsZWN0aW9uRHJpdmVyLnByb3RvdHlwZSwge1xuICBvcGVuOiBmdW5jdGlvbiAobmFtZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcmV0ID0ge307XG4gICAgXy5lYWNoKFxuICAgICAgWydmaW5kJywgJ2ZpbmRPbmUnLCAnaW5zZXJ0JywgJ3VwZGF0ZScsICd1cHNlcnQnLFxuICAgICAgICdyZW1vdmUnLCAnX2Vuc3VyZUluZGV4JywgJ19kcm9wSW5kZXgnLCAnX2NyZWF0ZUNhcHBlZENvbGxlY3Rpb24nLFxuICAgICAgICdkcm9wQ29sbGVjdGlvbicsICdyYXdDb2xsZWN0aW9uJ10sXG4gICAgICBmdW5jdGlvbiAobSkge1xuICAgICAgICByZXRbbV0gPSBfLmJpbmQoc2VsZi5tb25nb1ttXSwgc2VsZi5tb25nbywgbmFtZSk7XG4gICAgICB9KTtcbiAgICByZXR1cm4gcmV0O1xuICB9XG59KTtcblxuXG4vLyBDcmVhdGUgdGhlIHNpbmdsZXRvbiBSZW1vdGVDb2xsZWN0aW9uRHJpdmVyIG9ubHkgb24gZGVtYW5kLCBzbyB3ZVxuLy8gb25seSByZXF1aXJlIE1vbmdvIGNvbmZpZ3VyYXRpb24gaWYgaXQncyBhY3R1YWxseSB1c2VkIChlZywgbm90IGlmXG4vLyB5b3UncmUgb25seSB0cnlpbmcgdG8gcmVjZWl2ZSBkYXRhIGZyb20gYSByZW1vdGUgRERQIHNlcnZlci4pXG5Nb25nb0ludGVybmFscy5kZWZhdWx0UmVtb3RlQ29sbGVjdGlvbkRyaXZlciA9IF8ub25jZShmdW5jdGlvbiAoKSB7XG4gIHZhciBjb25uZWN0aW9uT3B0aW9ucyA9IHt9O1xuXG4gIHZhciBtb25nb1VybCA9IHByb2Nlc3MuZW52Lk1PTkdPX1VSTDtcblxuICBpZiAocHJvY2Vzcy5lbnYuTU9OR09fT1BMT0dfVVJMKSB7XG4gICAgY29ubmVjdGlvbk9wdGlvbnMub3Bsb2dVcmwgPSBwcm9jZXNzLmVudi5NT05HT19PUExPR19VUkw7XG4gIH1cblxuICBpZiAoISBtb25nb1VybClcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNT05HT19VUkwgbXVzdCBiZSBzZXQgaW4gZW52aXJvbm1lbnRcIik7XG5cbiAgcmV0dXJuIG5ldyBNb25nb0ludGVybmFscy5SZW1vdGVDb2xsZWN0aW9uRHJpdmVyKG1vbmdvVXJsLCBjb25uZWN0aW9uT3B0aW9ucyk7XG59KTtcbiIsIi8vIG9wdGlvbnMuY29ubmVjdGlvbiwgaWYgZ2l2ZW4sIGlzIGEgTGl2ZWRhdGFDbGllbnQgb3IgTGl2ZWRhdGFTZXJ2ZXJcbi8vIFhYWCBwcmVzZW50bHkgdGhlcmUgaXMgbm8gd2F5IHRvIGRlc3Ryb3kvY2xlYW4gdXAgYSBDb2xsZWN0aW9uXG5cbi8qKlxuICogQHN1bW1hcnkgTmFtZXNwYWNlIGZvciBNb25nb0RCLXJlbGF0ZWQgaXRlbXNcbiAqIEBuYW1lc3BhY2VcbiAqL1xuTW9uZ28gPSB7fTtcblxuLyoqXG4gKiBAc3VtbWFyeSBDb25zdHJ1Y3RvciBmb3IgYSBDb2xsZWN0aW9uXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEBpbnN0YW5jZW5hbWUgY29sbGVjdGlvblxuICogQGNsYXNzXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvbi4gIElmIG51bGwsIGNyZWF0ZXMgYW4gdW5tYW5hZ2VkICh1bnN5bmNocm9uaXplZCkgbG9jYWwgY29sbGVjdGlvbi5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zLmNvbm5lY3Rpb24gVGhlIHNlcnZlciBjb25uZWN0aW9uIHRoYXQgd2lsbCBtYW5hZ2UgdGhpcyBjb2xsZWN0aW9uLiBVc2VzIHRoZSBkZWZhdWx0IGNvbm5lY3Rpb24gaWYgbm90IHNwZWNpZmllZC4gIFBhc3MgdGhlIHJldHVybiB2YWx1ZSBvZiBjYWxsaW5nIFtgRERQLmNvbm5lY3RgXSgjZGRwX2Nvbm5lY3QpIHRvIHNwZWNpZnkgYSBkaWZmZXJlbnQgc2VydmVyLiBQYXNzIGBudWxsYCB0byBzcGVjaWZ5IG5vIGNvbm5lY3Rpb24uIFVubWFuYWdlZCAoYG5hbWVgIGlzIG51bGwpIGNvbGxlY3Rpb25zIGNhbm5vdCBzcGVjaWZ5IGEgY29ubmVjdGlvbi5cbiAqIEBwYXJhbSB7U3RyaW5nfSBvcHRpb25zLmlkR2VuZXJhdGlvbiBUaGUgbWV0aG9kIG9mIGdlbmVyYXRpbmcgdGhlIGBfaWRgIGZpZWxkcyBvZiBuZXcgZG9jdW1lbnRzIGluIHRoaXMgY29sbGVjdGlvbi4gIFBvc3NpYmxlIHZhbHVlczpcblxuIC0gKipgJ1NUUklORydgKio6IHJhbmRvbSBzdHJpbmdzXG4gLSAqKmAnTU9OR08nYCoqOiAgcmFuZG9tIFtgTW9uZ28uT2JqZWN0SURgXSgjbW9uZ29fb2JqZWN0X2lkKSB2YWx1ZXNcblxuVGhlIGRlZmF1bHQgaWQgZ2VuZXJhdGlvbiB0ZWNobmlxdWUgaXMgYCdTVFJJTkcnYC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IG9wdGlvbnMudHJhbnNmb3JtIEFuIG9wdGlvbmFsIHRyYW5zZm9ybWF0aW9uIGZ1bmN0aW9uLiBEb2N1bWVudHMgd2lsbCBiZSBwYXNzZWQgdGhyb3VnaCB0aGlzIGZ1bmN0aW9uIGJlZm9yZSBiZWluZyByZXR1cm5lZCBmcm9tIGBmZXRjaGAgb3IgYGZpbmRPbmVgLCBhbmQgYmVmb3JlIGJlaW5nIHBhc3NlZCB0byBjYWxsYmFja3Mgb2YgYG9ic2VydmVgLCBgbWFwYCwgYGZvckVhY2hgLCBgYWxsb3dgLCBhbmQgYGRlbnlgLiBUcmFuc2Zvcm1zIGFyZSAqbm90KiBhcHBsaWVkIGZvciB0aGUgY2FsbGJhY2tzIG9mIGBvYnNlcnZlQ2hhbmdlc2Agb3IgdG8gY3Vyc29ycyByZXR1cm5lZCBmcm9tIHB1Ymxpc2ggZnVuY3Rpb25zLlxuICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLmRlZmluZU11dGF0aW9uTWV0aG9kcyBTZXQgdG8gYGZhbHNlYCB0byBza2lwIHNldHRpbmcgdXAgdGhlIG11dGF0aW9uIG1ldGhvZHMgdGhhdCBlbmFibGUgaW5zZXJ0L3VwZGF0ZS9yZW1vdmUgZnJvbSBjbGllbnQgY29kZS4gRGVmYXVsdCBgdHJ1ZWAuXG4gKi9cbk1vbmdvLkNvbGxlY3Rpb24gPSBmdW5jdGlvbiBDb2xsZWN0aW9uKG5hbWUsIG9wdGlvbnMpIHtcbiAgaWYgKCFuYW1lICYmIChuYW1lICE9PSBudWxsKSkge1xuICAgIE1ldGVvci5fZGVidWcoXCJXYXJuaW5nOiBjcmVhdGluZyBhbm9ueW1vdXMgY29sbGVjdGlvbi4gSXQgd2lsbCBub3QgYmUgXCIgK1xuICAgICAgICAgICAgICAgICAgXCJzYXZlZCBvciBzeW5jaHJvbml6ZWQgb3ZlciB0aGUgbmV0d29yay4gKFBhc3MgbnVsbCBmb3IgXCIgK1xuICAgICAgICAgICAgICAgICAgXCJ0aGUgY29sbGVjdGlvbiBuYW1lIHRvIHR1cm4gb2ZmIHRoaXMgd2FybmluZy4pXCIpO1xuICAgIG5hbWUgPSBudWxsO1xuICB9XG5cbiAgaWYgKG5hbWUgIT09IG51bGwgJiYgdHlwZW9mIG5hbWUgIT09IFwic3RyaW5nXCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBcIkZpcnN0IGFyZ3VtZW50IHRvIG5ldyBNb25nby5Db2xsZWN0aW9uIG11c3QgYmUgYSBzdHJpbmcgb3IgbnVsbFwiKTtcbiAgfVxuXG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMubWV0aG9kcykge1xuICAgIC8vIEJhY2t3YXJkcyBjb21wYXRpYmlsaXR5IGhhY2sgd2l0aCBvcmlnaW5hbCBzaWduYXR1cmUgKHdoaWNoIHBhc3NlZFxuICAgIC8vIFwiY29ubmVjdGlvblwiIGRpcmVjdGx5IGluc3RlYWQgb2YgaW4gb3B0aW9ucy4gKENvbm5lY3Rpb25zIG11c3QgaGF2ZSBhIFwibWV0aG9kc1wiXG4gICAgLy8gbWV0aG9kLilcbiAgICAvLyBYWFggcmVtb3ZlIGJlZm9yZSAxLjBcbiAgICBvcHRpb25zID0ge2Nvbm5lY3Rpb246IG9wdGlvbnN9O1xuICB9XG4gIC8vIEJhY2t3YXJkcyBjb21wYXRpYmlsaXR5OiBcImNvbm5lY3Rpb25cIiB1c2VkIHRvIGJlIGNhbGxlZCBcIm1hbmFnZXJcIi5cbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5tYW5hZ2VyICYmICFvcHRpb25zLmNvbm5lY3Rpb24pIHtcbiAgICBvcHRpb25zLmNvbm5lY3Rpb24gPSBvcHRpb25zLm1hbmFnZXI7XG4gIH1cblxuICBvcHRpb25zID0ge1xuICAgIGNvbm5lY3Rpb246IHVuZGVmaW5lZCxcbiAgICBpZEdlbmVyYXRpb246ICdTVFJJTkcnLFxuICAgIHRyYW5zZm9ybTogbnVsbCxcbiAgICBfZHJpdmVyOiB1bmRlZmluZWQsXG4gICAgX3ByZXZlbnRBdXRvcHVibGlzaDogZmFsc2UsXG4gICAgICAuLi5vcHRpb25zLFxuICB9O1xuXG4gIHN3aXRjaCAob3B0aW9ucy5pZEdlbmVyYXRpb24pIHtcbiAgY2FzZSAnTU9OR08nOlxuICAgIHRoaXMuX21ha2VOZXdJRCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBzcmMgPSBuYW1lID8gRERQLnJhbmRvbVN0cmVhbSgnL2NvbGxlY3Rpb24vJyArIG5hbWUpIDogUmFuZG9tLmluc2VjdXJlO1xuICAgICAgcmV0dXJuIG5ldyBNb25nby5PYmplY3RJRChzcmMuaGV4U3RyaW5nKDI0KSk7XG4gICAgfTtcbiAgICBicmVhaztcbiAgY2FzZSAnU1RSSU5HJzpcbiAgZGVmYXVsdDpcbiAgICB0aGlzLl9tYWtlTmV3SUQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgc3JjID0gbmFtZSA/IEREUC5yYW5kb21TdHJlYW0oJy9jb2xsZWN0aW9uLycgKyBuYW1lKSA6IFJhbmRvbS5pbnNlY3VyZTtcbiAgICAgIHJldHVybiBzcmMuaWQoKTtcbiAgICB9O1xuICAgIGJyZWFrO1xuICB9XG5cbiAgdGhpcy5fdHJhbnNmb3JtID0gTG9jYWxDb2xsZWN0aW9uLndyYXBUcmFuc2Zvcm0ob3B0aW9ucy50cmFuc2Zvcm0pO1xuXG4gIGlmICghIG5hbWUgfHwgb3B0aW9ucy5jb25uZWN0aW9uID09PSBudWxsKVxuICAgIC8vIG5vdGU6IG5hbWVsZXNzIGNvbGxlY3Rpb25zIG5ldmVyIGhhdmUgYSBjb25uZWN0aW9uXG4gICAgdGhpcy5fY29ubmVjdGlvbiA9IG51bGw7XG4gIGVsc2UgaWYgKG9wdGlvbnMuY29ubmVjdGlvbilcbiAgICB0aGlzLl9jb25uZWN0aW9uID0gb3B0aW9ucy5jb25uZWN0aW9uO1xuICBlbHNlIGlmIChNZXRlb3IuaXNDbGllbnQpXG4gICAgdGhpcy5fY29ubmVjdGlvbiA9IE1ldGVvci5jb25uZWN0aW9uO1xuICBlbHNlXG4gICAgdGhpcy5fY29ubmVjdGlvbiA9IE1ldGVvci5zZXJ2ZXI7XG5cbiAgaWYgKCFvcHRpb25zLl9kcml2ZXIpIHtcbiAgICAvLyBYWFggVGhpcyBjaGVjayBhc3N1bWVzIHRoYXQgd2ViYXBwIGlzIGxvYWRlZCBzbyB0aGF0IE1ldGVvci5zZXJ2ZXIgIT09XG4gICAgLy8gbnVsbC4gV2Ugc2hvdWxkIGZ1bGx5IHN1cHBvcnQgdGhlIGNhc2Ugb2YgXCJ3YW50IHRvIHVzZSBhIE1vbmdvLWJhY2tlZFxuICAgIC8vIGNvbGxlY3Rpb24gZnJvbSBOb2RlIGNvZGUgd2l0aG91dCB3ZWJhcHBcIiwgYnV0IHdlIGRvbid0IHlldC5cbiAgICAvLyAjTWV0ZW9yU2VydmVyTnVsbFxuICAgIGlmIChuYW1lICYmIHRoaXMuX2Nvbm5lY3Rpb24gPT09IE1ldGVvci5zZXJ2ZXIgJiZcbiAgICAgICAgdHlwZW9mIE1vbmdvSW50ZXJuYWxzICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICAgIE1vbmdvSW50ZXJuYWxzLmRlZmF1bHRSZW1vdGVDb2xsZWN0aW9uRHJpdmVyKSB7XG4gICAgICBvcHRpb25zLl9kcml2ZXIgPSBNb25nb0ludGVybmFscy5kZWZhdWx0UmVtb3RlQ29sbGVjdGlvbkRyaXZlcigpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB7IExvY2FsQ29sbGVjdGlvbkRyaXZlciB9ID1cbiAgICAgICAgcmVxdWlyZShcIi4vbG9jYWxfY29sbGVjdGlvbl9kcml2ZXIuanNcIik7XG4gICAgICBvcHRpb25zLl9kcml2ZXIgPSBMb2NhbENvbGxlY3Rpb25Ecml2ZXI7XG4gICAgfVxuICB9XG5cbiAgdGhpcy5fY29sbGVjdGlvbiA9IG9wdGlvbnMuX2RyaXZlci5vcGVuKG5hbWUsIHRoaXMuX2Nvbm5lY3Rpb24pO1xuICB0aGlzLl9uYW1lID0gbmFtZTtcbiAgdGhpcy5fZHJpdmVyID0gb3B0aW9ucy5fZHJpdmVyO1xuXG4gIHRoaXMuX21heWJlU2V0VXBSZXBsaWNhdGlvbihuYW1lLCBvcHRpb25zKTtcblxuICAvLyBYWFggZG9uJ3QgZGVmaW5lIHRoZXNlIHVudGlsIGFsbG93IG9yIGRlbnkgaXMgYWN0dWFsbHkgdXNlZCBmb3IgdGhpc1xuICAvLyBjb2xsZWN0aW9uLiBDb3VsZCBiZSBoYXJkIGlmIHRoZSBzZWN1cml0eSBydWxlcyBhcmUgb25seSBkZWZpbmVkIG9uIHRoZVxuICAvLyBzZXJ2ZXIuXG4gIGlmIChvcHRpb25zLmRlZmluZU11dGF0aW9uTWV0aG9kcyAhPT0gZmFsc2UpIHtcbiAgICB0cnkge1xuICAgICAgdGhpcy5fZGVmaW5lTXV0YXRpb25NZXRob2RzKHtcbiAgICAgICAgdXNlRXhpc3Rpbmc6IG9wdGlvbnMuX3N1cHByZXNzU2FtZU5hbWVFcnJvciA9PT0gdHJ1ZVxuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIC8vIFRocm93IGEgbW9yZSB1bmRlcnN0YW5kYWJsZSBlcnJvciBvbiB0aGUgc2VydmVyIGZvciBzYW1lIGNvbGxlY3Rpb24gbmFtZVxuICAgICAgaWYgKGVycm9yLm1lc3NhZ2UgPT09IGBBIG1ldGhvZCBuYW1lZCAnLyR7bmFtZX0vaW5zZXJ0JyBpcyBhbHJlYWR5IGRlZmluZWRgKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZXJlIGlzIGFscmVhZHkgYSBjb2xsZWN0aW9uIG5hbWVkIFwiJHtuYW1lfVwiYCk7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICAvLyBhdXRvcHVibGlzaFxuICBpZiAoUGFja2FnZS5hdXRvcHVibGlzaCAmJlxuICAgICAgISBvcHRpb25zLl9wcmV2ZW50QXV0b3B1Ymxpc2ggJiZcbiAgICAgIHRoaXMuX2Nvbm5lY3Rpb24gJiZcbiAgICAgIHRoaXMuX2Nvbm5lY3Rpb24ucHVibGlzaCkge1xuICAgIHRoaXMuX2Nvbm5lY3Rpb24ucHVibGlzaChudWxsLCAoKSA9PiB0aGlzLmZpbmQoKSwge1xuICAgICAgaXNfYXV0bzogdHJ1ZSxcbiAgICB9KTtcbiAgfVxufTtcblxuT2JqZWN0LmFzc2lnbihNb25nby5Db2xsZWN0aW9uLnByb3RvdHlwZSwge1xuICBfbWF5YmVTZXRVcFJlcGxpY2F0aW9uKG5hbWUsIHtcbiAgICBfc3VwcHJlc3NTYW1lTmFtZUVycm9yID0gZmFsc2VcbiAgfSkge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIGlmICghIChzZWxmLl9jb25uZWN0aW9uICYmXG4gICAgICAgICAgIHNlbGYuX2Nvbm5lY3Rpb24ucmVnaXN0ZXJTdG9yZSkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBPSywgd2UncmUgZ29pbmcgdG8gYmUgYSBzbGF2ZSwgcmVwbGljYXRpbmcgc29tZSByZW1vdGVcbiAgICAvLyBkYXRhYmFzZSwgZXhjZXB0IHBvc3NpYmx5IHdpdGggc29tZSB0ZW1wb3JhcnkgZGl2ZXJnZW5jZSB3aGlsZVxuICAgIC8vIHdlIGhhdmUgdW5hY2tub3dsZWRnZWQgUlBDJ3MuXG4gICAgY29uc3Qgb2sgPSBzZWxmLl9jb25uZWN0aW9uLnJlZ2lzdGVyU3RvcmUobmFtZSwge1xuICAgICAgLy8gQ2FsbGVkIGF0IHRoZSBiZWdpbm5pbmcgb2YgYSBiYXRjaCBvZiB1cGRhdGVzLiBiYXRjaFNpemUgaXMgdGhlIG51bWJlclxuICAgICAgLy8gb2YgdXBkYXRlIGNhbGxzIHRvIGV4cGVjdC5cbiAgICAgIC8vXG4gICAgICAvLyBYWFggVGhpcyBpbnRlcmZhY2UgaXMgcHJldHR5IGphbmt5LiByZXNldCBwcm9iYWJseSBvdWdodCB0byBnbyBiYWNrIHRvXG4gICAgICAvLyBiZWluZyBpdHMgb3duIGZ1bmN0aW9uLCBhbmQgY2FsbGVycyBzaG91bGRuJ3QgaGF2ZSB0byBjYWxjdWxhdGVcbiAgICAgIC8vIGJhdGNoU2l6ZS4gVGhlIG9wdGltaXphdGlvbiBvZiBub3QgY2FsbGluZyBwYXVzZS9yZW1vdmUgc2hvdWxkIGJlXG4gICAgICAvLyBkZWxheWVkIHVudGlsIGxhdGVyOiB0aGUgZmlyc3QgY2FsbCB0byB1cGRhdGUoKSBzaG91bGQgYnVmZmVyIGl0c1xuICAgICAgLy8gbWVzc2FnZSwgYW5kIHRoZW4gd2UgY2FuIGVpdGhlciBkaXJlY3RseSBhcHBseSBpdCBhdCBlbmRVcGRhdGUgdGltZSBpZlxuICAgICAgLy8gaXQgd2FzIHRoZSBvbmx5IHVwZGF0ZSwgb3IgZG8gcGF1c2VPYnNlcnZlcnMvYXBwbHkvYXBwbHkgYXQgdGhlIG5leHRcbiAgICAgIC8vIHVwZGF0ZSgpIGlmIHRoZXJlJ3MgYW5vdGhlciBvbmUuXG4gICAgICBiZWdpblVwZGF0ZShiYXRjaFNpemUsIHJlc2V0KSB7XG4gICAgICAgIC8vIHBhdXNlIG9ic2VydmVycyBzbyB1c2VycyBkb24ndCBzZWUgZmxpY2tlciB3aGVuIHVwZGF0aW5nIHNldmVyYWxcbiAgICAgICAgLy8gb2JqZWN0cyBhdCBvbmNlIChpbmNsdWRpbmcgdGhlIHBvc3QtcmVjb25uZWN0IHJlc2V0LWFuZC1yZWFwcGx5XG4gICAgICAgIC8vIHN0YWdlKSwgYW5kIHNvIHRoYXQgYSByZS1zb3J0aW5nIG9mIGEgcXVlcnkgY2FuIHRha2UgYWR2YW50YWdlIG9mIHRoZVxuICAgICAgICAvLyBmdWxsIF9kaWZmUXVlcnkgbW92ZWQgY2FsY3VsYXRpb24gaW5zdGVhZCBvZiBhcHBseWluZyBjaGFuZ2Ugb25lIGF0IGFcbiAgICAgICAgLy8gdGltZS5cbiAgICAgICAgaWYgKGJhdGNoU2l6ZSA+IDEgfHwgcmVzZXQpXG4gICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi5wYXVzZU9ic2VydmVycygpO1xuXG4gICAgICAgIGlmIChyZXNldClcbiAgICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLnJlbW92ZSh7fSk7XG4gICAgICB9LFxuXG4gICAgICAvLyBBcHBseSBhbiB1cGRhdGUuXG4gICAgICAvLyBYWFggYmV0dGVyIHNwZWNpZnkgdGhpcyBpbnRlcmZhY2UgKG5vdCBpbiB0ZXJtcyBvZiBhIHdpcmUgbWVzc2FnZSk/XG4gICAgICB1cGRhdGUobXNnKSB7XG4gICAgICAgIHZhciBtb25nb0lkID0gTW9uZ29JRC5pZFBhcnNlKG1zZy5pZCk7XG4gICAgICAgIHZhciBkb2MgPSBzZWxmLl9jb2xsZWN0aW9uLmZpbmRPbmUobW9uZ29JZCk7XG5cbiAgICAgICAgLy8gSXMgdGhpcyBhIFwicmVwbGFjZSB0aGUgd2hvbGUgZG9jXCIgbWVzc2FnZSBjb21pbmcgZnJvbSB0aGUgcXVpZXNjZW5jZVxuICAgICAgICAvLyBvZiBtZXRob2Qgd3JpdGVzIHRvIGFuIG9iamVjdD8gKE5vdGUgdGhhdCAndW5kZWZpbmVkJyBpcyBhIHZhbGlkXG4gICAgICAgIC8vIHZhbHVlIG1lYW5pbmcgXCJyZW1vdmUgaXRcIi4pXG4gICAgICAgIGlmIChtc2cubXNnID09PSAncmVwbGFjZScpIHtcbiAgICAgICAgICB2YXIgcmVwbGFjZSA9IG1zZy5yZXBsYWNlO1xuICAgICAgICAgIGlmICghcmVwbGFjZSkge1xuICAgICAgICAgICAgaWYgKGRvYylcbiAgICAgICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi5yZW1vdmUobW9uZ29JZCk7XG4gICAgICAgICAgfSBlbHNlIGlmICghZG9jKSB7XG4gICAgICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLmluc2VydChyZXBsYWNlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gWFhYIGNoZWNrIHRoYXQgcmVwbGFjZSBoYXMgbm8gJCBvcHNcbiAgICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb24udXBkYXRlKG1vbmdvSWQsIHJlcGxhY2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAobXNnLm1zZyA9PT0gJ2FkZGVkJykge1xuICAgICAgICAgIGlmIChkb2MpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGVkIG5vdCB0byBmaW5kIGEgZG9jdW1lbnQgYWxyZWFkeSBwcmVzZW50IGZvciBhbiBhZGRcIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb24uaW5zZXJ0KHsgX2lkOiBtb25nb0lkLCAuLi5tc2cuZmllbGRzIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKG1zZy5tc2cgPT09ICdyZW1vdmVkJykge1xuICAgICAgICAgIGlmICghZG9jKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgdG8gZmluZCBhIGRvY3VtZW50IGFscmVhZHkgcHJlc2VudCBmb3IgcmVtb3ZlZFwiKTtcbiAgICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLnJlbW92ZShtb25nb0lkKTtcbiAgICAgICAgfSBlbHNlIGlmIChtc2cubXNnID09PSAnY2hhbmdlZCcpIHtcbiAgICAgICAgICBpZiAoIWRvYylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGVkIHRvIGZpbmQgYSBkb2N1bWVudCB0byBjaGFuZ2VcIik7XG4gICAgICAgICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKG1zZy5maWVsZHMpO1xuICAgICAgICAgIGlmIChrZXlzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBtb2RpZmllciA9IHt9O1xuICAgICAgICAgICAga2V5cy5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gbXNnLmZpZWxkc1trZXldO1xuICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtb2RpZmllci4kdW5zZXQpIHtcbiAgICAgICAgICAgICAgICAgIG1vZGlmaWVyLiR1bnNldCA9IHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtb2RpZmllci4kdW5zZXRba2V5XSA9IDE7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtb2RpZmllci4kc2V0KSB7XG4gICAgICAgICAgICAgICAgICBtb2RpZmllci4kc2V0ID0ge307XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG1vZGlmaWVyLiRzZXRba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb24udXBkYXRlKG1vbmdvSWQsIG1vZGlmaWVyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSSBkb24ndCBrbm93IGhvdyB0byBkZWFsIHdpdGggdGhpcyBtZXNzYWdlXCIpO1xuICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICAvLyBDYWxsZWQgYXQgdGhlIGVuZCBvZiBhIGJhdGNoIG9mIHVwZGF0ZXMuXG4gICAgICBlbmRVcGRhdGUoKSB7XG4gICAgICAgIHNlbGYuX2NvbGxlY3Rpb24ucmVzdW1lT2JzZXJ2ZXJzKCk7XG4gICAgICB9LFxuXG4gICAgICAvLyBDYWxsZWQgYXJvdW5kIG1ldGhvZCBzdHViIGludm9jYXRpb25zIHRvIGNhcHR1cmUgdGhlIG9yaWdpbmFsIHZlcnNpb25zXG4gICAgICAvLyBvZiBtb2RpZmllZCBkb2N1bWVudHMuXG4gICAgICBzYXZlT3JpZ2luYWxzKCkge1xuICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLnNhdmVPcmlnaW5hbHMoKTtcbiAgICAgIH0sXG4gICAgICByZXRyaWV2ZU9yaWdpbmFscygpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuX2NvbGxlY3Rpb24ucmV0cmlldmVPcmlnaW5hbHMoKTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIFVzZWQgdG8gcHJlc2VydmUgY3VycmVudCB2ZXJzaW9ucyBvZiBkb2N1bWVudHMgYWNyb3NzIGEgc3RvcmUgcmVzZXQuXG4gICAgICBnZXREb2MoaWQpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuZmluZE9uZShpZCk7XG4gICAgICB9LFxuXG4gICAgICAvLyBUbyBiZSBhYmxlIHRvIGdldCBiYWNrIHRvIHRoZSBjb2xsZWN0aW9uIGZyb20gdGhlIHN0b3JlLlxuICAgICAgX2dldENvbGxlY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBzZWxmO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgaWYgKCEgb2spIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgVGhlcmUgaXMgYWxyZWFkeSBhIGNvbGxlY3Rpb24gbmFtZWQgXCIke25hbWV9XCJgO1xuICAgICAgaWYgKF9zdXBwcmVzc1NhbWVOYW1lRXJyb3IgPT09IHRydWUpIHtcbiAgICAgICAgLy8gWFhYIEluIHRoZW9yeSB3ZSBkbyBub3QgaGF2ZSB0byB0aHJvdyB3aGVuIGBva2AgaXMgZmFsc3kuIFRoZVxuICAgICAgICAvLyBzdG9yZSBpcyBhbHJlYWR5IGRlZmluZWQgZm9yIHRoaXMgY29sbGVjdGlvbiBuYW1lLCBidXQgdGhpc1xuICAgICAgICAvLyB3aWxsIHNpbXBseSBiZSBhbm90aGVyIHJlZmVyZW5jZSB0byBpdCBhbmQgZXZlcnl0aGluZyBzaG91bGRcbiAgICAgICAgLy8gd29yay4gSG93ZXZlciwgd2UgaGF2ZSBoaXN0b3JpY2FsbHkgdGhyb3duIGFuIGVycm9yIGhlcmUsIHNvXG4gICAgICAgIC8vIGZvciBub3cgd2Ugd2lsbCBza2lwIHRoZSBlcnJvciBvbmx5IHdoZW4gX3N1cHByZXNzU2FtZU5hbWVFcnJvclxuICAgICAgICAvLyBpcyBgdHJ1ZWAsIGFsbG93aW5nIHBlb3BsZSB0byBvcHQgaW4gYW5kIGdpdmUgdGhpcyBzb21lIHJlYWxcbiAgICAgICAgLy8gd29ybGQgdGVzdGluZy5cbiAgICAgICAgY29uc29sZS53YXJuID8gY29uc29sZS53YXJuKG1lc3NhZ2UpIDogY29uc29sZS5sb2cobWVzc2FnZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIC8vL1xuICAvLy8gTWFpbiBjb2xsZWN0aW9uIEFQSVxuICAvLy9cblxuICBfZ2V0RmluZFNlbGVjdG9yKGFyZ3MpIHtcbiAgICBpZiAoYXJncy5sZW5ndGggPT0gMClcbiAgICAgIHJldHVybiB7fTtcbiAgICBlbHNlXG4gICAgICByZXR1cm4gYXJnc1swXTtcbiAgfSxcblxuICBfZ2V0RmluZE9wdGlvbnMoYXJncykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoYXJncy5sZW5ndGggPCAyKSB7XG4gICAgICByZXR1cm4geyB0cmFuc2Zvcm06IHNlbGYuX3RyYW5zZm9ybSB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBjaGVjayhhcmdzWzFdLCBNYXRjaC5PcHRpb25hbChNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuICAgICAgICBmaWVsZHM6IE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9uZU9mKE9iamVjdCwgdW5kZWZpbmVkKSksXG4gICAgICAgIHNvcnQ6IE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9uZU9mKE9iamVjdCwgQXJyYXksIEZ1bmN0aW9uLCB1bmRlZmluZWQpKSxcbiAgICAgICAgbGltaXQ6IE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9uZU9mKE51bWJlciwgdW5kZWZpbmVkKSksXG4gICAgICAgIHNraXA6IE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9uZU9mKE51bWJlciwgdW5kZWZpbmVkKSlcbiAgICAgIH0pKSk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRyYW5zZm9ybTogc2VsZi5fdHJhbnNmb3JtLFxuICAgICAgICAuLi5hcmdzWzFdLFxuICAgICAgfTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEZpbmQgdGhlIGRvY3VtZW50cyBpbiBhIGNvbGxlY3Rpb24gdGhhdCBtYXRjaCB0aGUgc2VsZWN0b3IuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kIGZpbmRcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7TW9uZ29TZWxlY3Rvcn0gW3NlbGVjdG9yXSBBIHF1ZXJ5IGRlc2NyaWJpbmcgdGhlIGRvY3VtZW50cyB0byBmaW5kXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAgICogQHBhcmFtIHtNb25nb1NvcnRTcGVjaWZpZXJ9IG9wdGlvbnMuc29ydCBTb3J0IG9yZGVyIChkZWZhdWx0OiBuYXR1cmFsIG9yZGVyKVxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0aW9ucy5za2lwIE51bWJlciBvZiByZXN1bHRzIHRvIHNraXAgYXQgdGhlIGJlZ2lubmluZ1xuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0aW9ucy5saW1pdCBNYXhpbXVtIG51bWJlciBvZiByZXN1bHRzIHRvIHJldHVyblxuICAgKiBAcGFyYW0ge01vbmdvRmllbGRTcGVjaWZpZXJ9IG9wdGlvbnMuZmllbGRzIERpY3Rpb25hcnkgb2YgZmllbGRzIHRvIHJldHVybiBvciBleGNsdWRlLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMucmVhY3RpdmUgKENsaWVudCBvbmx5KSBEZWZhdWx0IGB0cnVlYDsgcGFzcyBgZmFsc2VgIHRvIGRpc2FibGUgcmVhY3Rpdml0eVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcHRpb25zLnRyYW5zZm9ybSBPdmVycmlkZXMgYHRyYW5zZm9ybWAgb24gdGhlICBbYENvbGxlY3Rpb25gXSgjY29sbGVjdGlvbnMpIGZvciB0aGlzIGN1cnNvci4gIFBhc3MgYG51bGxgIHRvIGRpc2FibGUgdHJhbnNmb3JtYXRpb24uXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5kaXNhYmxlT3Bsb2cgKFNlcnZlciBvbmx5KSBQYXNzIHRydWUgdG8gZGlzYWJsZSBvcGxvZy10YWlsaW5nIG9uIHRoaXMgcXVlcnkuIFRoaXMgYWZmZWN0cyB0aGUgd2F5IHNlcnZlciBwcm9jZXNzZXMgY2FsbHMgdG8gYG9ic2VydmVgIG9uIHRoaXMgcXVlcnkuIERpc2FibGluZyB0aGUgb3Bsb2cgY2FuIGJlIHVzZWZ1bCB3aGVuIHdvcmtpbmcgd2l0aCBkYXRhIHRoYXQgdXBkYXRlcyBpbiBsYXJnZSBiYXRjaGVzLlxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0aW9ucy5wb2xsaW5nSW50ZXJ2YWxNcyAoU2VydmVyIG9ubHkpIFdoZW4gb3Bsb2cgaXMgZGlzYWJsZWQgKHRocm91Z2ggdGhlIHVzZSBvZiBgZGlzYWJsZU9wbG9nYCBvciB3aGVuIG90aGVyd2lzZSBub3QgYXZhaWxhYmxlKSwgdGhlIGZyZXF1ZW5jeSAoaW4gbWlsbGlzZWNvbmRzKSBvZiBob3cgb2Z0ZW4gdG8gcG9sbCB0aGlzIHF1ZXJ5IHdoZW4gb2JzZXJ2aW5nIG9uIHRoZSBzZXJ2ZXIuIERlZmF1bHRzIHRvIDEwMDAwbXMgKDEwIHNlY29uZHMpLlxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0aW9ucy5wb2xsaW5nVGhyb3R0bGVNcyAoU2VydmVyIG9ubHkpIFdoZW4gb3Bsb2cgaXMgZGlzYWJsZWQgKHRocm91Z2ggdGhlIHVzZSBvZiBgZGlzYWJsZU9wbG9nYCBvciB3aGVuIG90aGVyd2lzZSBub3QgYXZhaWxhYmxlKSwgdGhlIG1pbmltdW0gdGltZSAoaW4gbWlsbGlzZWNvbmRzKSB0byBhbGxvdyBiZXR3ZWVuIHJlLXBvbGxpbmcgd2hlbiBvYnNlcnZpbmcgb24gdGhlIHNlcnZlci4gSW5jcmVhc2luZyB0aGlzIHdpbGwgc2F2ZSBDUFUgYW5kIG1vbmdvIGxvYWQgYXQgdGhlIGV4cGVuc2Ugb2Ygc2xvd2VyIHVwZGF0ZXMgdG8gdXNlcnMuIERlY3JlYXNpbmcgdGhpcyBpcyBub3QgcmVjb21tZW5kZWQuIERlZmF1bHRzIHRvIDUwbXMuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLm1heFRpbWVNcyAoU2VydmVyIG9ubHkpIElmIHNldCwgaW5zdHJ1Y3RzIE1vbmdvREIgdG8gc2V0IGEgdGltZSBsaW1pdCBmb3IgdGhpcyBjdXJzb3IncyBvcGVyYXRpb25zLiBJZiB0aGUgb3BlcmF0aW9uIHJlYWNoZXMgdGhlIHNwZWNpZmllZCB0aW1lIGxpbWl0IChpbiBtaWxsaXNlY29uZHMpIHdpdGhvdXQgdGhlIGhhdmluZyBiZWVuIGNvbXBsZXRlZCwgYW4gZXhjZXB0aW9uIHdpbGwgYmUgdGhyb3duLiBVc2VmdWwgdG8gcHJldmVudCBhbiAoYWNjaWRlbnRhbCBvciBtYWxpY2lvdXMpIHVub3B0aW1pemVkIHF1ZXJ5IGZyb20gY2F1c2luZyBhIGZ1bGwgY29sbGVjdGlvbiBzY2FuIHRoYXQgd291bGQgZGlzcnVwdCBvdGhlciBkYXRhYmFzZSB1c2VycywgYXQgdGhlIGV4cGVuc2Ugb2YgbmVlZGluZyB0byBoYW5kbGUgdGhlIHJlc3VsdGluZyBlcnJvci5cbiAgICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBvcHRpb25zLmhpbnQgKFNlcnZlciBvbmx5KSBPdmVycmlkZXMgTW9uZ29EQidzIGRlZmF1bHQgaW5kZXggc2VsZWN0aW9uIGFuZCBxdWVyeSBvcHRpbWl6YXRpb24gcHJvY2Vzcy4gU3BlY2lmeSBhbiBpbmRleCB0byBmb3JjZSBpdHMgdXNlLCBlaXRoZXIgYnkgaXRzIG5hbWUgb3IgaW5kZXggc3BlY2lmaWNhdGlvbi4gWW91IGNhbiBhbHNvIHNwZWNpZnkgYHsgJG5hdHVyYWwgOiAxIH1gIHRvIGZvcmNlIGEgZm9yd2FyZHMgY29sbGVjdGlvbiBzY2FuLCBvciBgeyAkbmF0dXJhbCA6IC0xIH1gIGZvciBhIHJldmVyc2UgY29sbGVjdGlvbiBzY2FuLiBTZXR0aW5nIHRoaXMgaXMgb25seSByZWNvbW1lbmRlZCBmb3IgYWR2YW5jZWQgdXNlcnMuXG4gICAqIEByZXR1cm5zIHtNb25nby5DdXJzb3J9XG4gICAqL1xuICBmaW5kKC4uLmFyZ3MpIHtcbiAgICAvLyBDb2xsZWN0aW9uLmZpbmQoKSAocmV0dXJuIGFsbCBkb2NzKSBiZWhhdmVzIGRpZmZlcmVudGx5XG4gICAgLy8gZnJvbSBDb2xsZWN0aW9uLmZpbmQodW5kZWZpbmVkKSAocmV0dXJuIDAgZG9jcykuICBzbyBiZVxuICAgIC8vIGNhcmVmdWwgYWJvdXQgdGhlIGxlbmd0aCBvZiBhcmd1bWVudHMuXG4gICAgcmV0dXJuIHRoaXMuX2NvbGxlY3Rpb24uZmluZChcbiAgICAgIHRoaXMuX2dldEZpbmRTZWxlY3RvcihhcmdzKSxcbiAgICAgIHRoaXMuX2dldEZpbmRPcHRpb25zKGFyZ3MpXG4gICAgKTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgRmluZHMgdGhlIGZpcnN0IGRvY3VtZW50IHRoYXQgbWF0Y2hlcyB0aGUgc2VsZWN0b3IsIGFzIG9yZGVyZWQgYnkgc29ydCBhbmQgc2tpcCBvcHRpb25zLiBSZXR1cm5zIGB1bmRlZmluZWRgIGlmIG5vIG1hdGNoaW5nIGRvY3VtZW50IGlzIGZvdW5kLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCBmaW5kT25lXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IFtzZWxlY3Rvcl0gQSBxdWVyeSBkZXNjcmliaW5nIHRoZSBkb2N1bWVudHMgdG8gZmluZFxuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gICAqIEBwYXJhbSB7TW9uZ29Tb3J0U3BlY2lmaWVyfSBvcHRpb25zLnNvcnQgU29ydCBvcmRlciAoZGVmYXVsdDogbmF0dXJhbCBvcmRlcilcbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMuc2tpcCBOdW1iZXIgb2YgcmVzdWx0cyB0byBza2lwIGF0IHRoZSBiZWdpbm5pbmdcbiAgICogQHBhcmFtIHtNb25nb0ZpZWxkU3BlY2lmaWVyfSBvcHRpb25zLmZpZWxkcyBEaWN0aW9uYXJ5IG9mIGZpZWxkcyB0byByZXR1cm4gb3IgZXhjbHVkZS5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnJlYWN0aXZlIChDbGllbnQgb25seSkgRGVmYXVsdCB0cnVlOyBwYXNzIGZhbHNlIHRvIGRpc2FibGUgcmVhY3Rpdml0eVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcHRpb25zLnRyYW5zZm9ybSBPdmVycmlkZXMgYHRyYW5zZm9ybWAgb24gdGhlIFtgQ29sbGVjdGlvbmBdKCNjb2xsZWN0aW9ucykgZm9yIHRoaXMgY3Vyc29yLiAgUGFzcyBgbnVsbGAgdG8gZGlzYWJsZSB0cmFuc2Zvcm1hdGlvbi5cbiAgICogQHJldHVybnMge09iamVjdH1cbiAgICovXG4gIGZpbmRPbmUoLi4uYXJncykge1xuICAgIHJldHVybiB0aGlzLl9jb2xsZWN0aW9uLmZpbmRPbmUoXG4gICAgICB0aGlzLl9nZXRGaW5kU2VsZWN0b3IoYXJncyksXG4gICAgICB0aGlzLl9nZXRGaW5kT3B0aW9ucyhhcmdzKVxuICAgICk7XG4gIH1cbn0pO1xuXG5PYmplY3QuYXNzaWduKE1vbmdvLkNvbGxlY3Rpb24sIHtcbiAgX3B1Ymxpc2hDdXJzb3IoY3Vyc29yLCBzdWIsIGNvbGxlY3Rpb24pIHtcbiAgICB2YXIgb2JzZXJ2ZUhhbmRsZSA9IGN1cnNvci5vYnNlcnZlQ2hhbmdlcyh7XG4gICAgICBhZGRlZDogZnVuY3Rpb24gKGlkLCBmaWVsZHMpIHtcbiAgICAgICAgc3ViLmFkZGVkKGNvbGxlY3Rpb24sIGlkLCBmaWVsZHMpO1xuICAgICAgfSxcbiAgICAgIGNoYW5nZWQ6IGZ1bmN0aW9uIChpZCwgZmllbGRzKSB7XG4gICAgICAgIHN1Yi5jaGFuZ2VkKGNvbGxlY3Rpb24sIGlkLCBmaWVsZHMpO1xuICAgICAgfSxcbiAgICAgIHJlbW92ZWQ6IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICBzdWIucmVtb3ZlZChjb2xsZWN0aW9uLCBpZCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBXZSBkb24ndCBjYWxsIHN1Yi5yZWFkeSgpIGhlcmU6IGl0IGdldHMgY2FsbGVkIGluIGxpdmVkYXRhX3NlcnZlciwgYWZ0ZXJcbiAgICAvLyBwb3NzaWJseSBjYWxsaW5nIF9wdWJsaXNoQ3Vyc29yIG9uIG11bHRpcGxlIHJldHVybmVkIGN1cnNvcnMuXG5cbiAgICAvLyByZWdpc3RlciBzdG9wIGNhbGxiYWNrIChleHBlY3RzIGxhbWJkYSB3LyBubyBhcmdzKS5cbiAgICBzdWIub25TdG9wKGZ1bmN0aW9uICgpIHtcbiAgICAgIG9ic2VydmVIYW5kbGUuc3RvcCgpO1xuICAgIH0pO1xuXG4gICAgLy8gcmV0dXJuIHRoZSBvYnNlcnZlSGFuZGxlIGluIGNhc2UgaXQgbmVlZHMgdG8gYmUgc3RvcHBlZCBlYXJseVxuICAgIHJldHVybiBvYnNlcnZlSGFuZGxlO1xuICB9LFxuXG4gIC8vIHByb3RlY3QgYWdhaW5zdCBkYW5nZXJvdXMgc2VsZWN0b3JzLiAgZmFsc2V5IGFuZCB7X2lkOiBmYWxzZXl9IGFyZSBib3RoXG4gIC8vIGxpa2VseSBwcm9ncmFtbWVyIGVycm9yLCBhbmQgbm90IHdoYXQgeW91IHdhbnQsIHBhcnRpY3VsYXJseSBmb3IgZGVzdHJ1Y3RpdmVcbiAgLy8gb3BlcmF0aW9ucy4gSWYgYSBmYWxzZXkgX2lkIGlzIHNlbnQgaW4sIGEgbmV3IHN0cmluZyBfaWQgd2lsbCBiZVxuICAvLyBnZW5lcmF0ZWQgYW5kIHJldHVybmVkOyBpZiBhIGZhbGxiYWNrSWQgaXMgcHJvdmlkZWQsIGl0IHdpbGwgYmUgcmV0dXJuZWRcbiAgLy8gaW5zdGVhZC5cbiAgX3Jld3JpdGVTZWxlY3RvcihzZWxlY3RvciwgeyBmYWxsYmFja0lkIH0gPSB7fSkge1xuICAgIC8vIHNob3J0aGFuZCAtLSBzY2FsYXJzIG1hdGNoIF9pZFxuICAgIGlmIChMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZChzZWxlY3RvcikpXG4gICAgICBzZWxlY3RvciA9IHtfaWQ6IHNlbGVjdG9yfTtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KHNlbGVjdG9yKSkge1xuICAgICAgLy8gVGhpcyBpcyBjb25zaXN0ZW50IHdpdGggdGhlIE1vbmdvIGNvbnNvbGUgaXRzZWxmOyBpZiB3ZSBkb24ndCBkbyB0aGlzXG4gICAgICAvLyBjaGVjayBwYXNzaW5nIGFuIGVtcHR5IGFycmF5IGVuZHMgdXAgc2VsZWN0aW5nIGFsbCBpdGVtc1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTW9uZ28gc2VsZWN0b3IgY2FuJ3QgYmUgYW4gYXJyYXkuXCIpO1xuICAgIH1cblxuICAgIGlmICghc2VsZWN0b3IgfHwgKCgnX2lkJyBpbiBzZWxlY3RvcikgJiYgIXNlbGVjdG9yLl9pZCkpIHtcbiAgICAgIC8vIGNhbid0IG1hdGNoIGFueXRoaW5nXG4gICAgICByZXR1cm4geyBfaWQ6IGZhbGxiYWNrSWQgfHwgUmFuZG9tLmlkKCkgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2VsZWN0b3I7XG4gIH1cbn0pO1xuXG5PYmplY3QuYXNzaWduKE1vbmdvLkNvbGxlY3Rpb24ucHJvdG90eXBlLCB7XG4gIC8vICdpbnNlcnQnIGltbWVkaWF0ZWx5IHJldHVybnMgdGhlIGluc2VydGVkIGRvY3VtZW50J3MgbmV3IF9pZC5cbiAgLy8gVGhlIG90aGVycyByZXR1cm4gdmFsdWVzIGltbWVkaWF0ZWx5IGlmIHlvdSBhcmUgaW4gYSBzdHViLCBhbiBpbi1tZW1vcnlcbiAgLy8gdW5tYW5hZ2VkIGNvbGxlY3Rpb24sIG9yIGEgbW9uZ28tYmFja2VkIGNvbGxlY3Rpb24gYW5kIHlvdSBkb24ndCBwYXNzIGFcbiAgLy8gY2FsbGJhY2suICd1cGRhdGUnIGFuZCAncmVtb3ZlJyByZXR1cm4gdGhlIG51bWJlciBvZiBhZmZlY3RlZFxuICAvLyBkb2N1bWVudHMuICd1cHNlcnQnIHJldHVybnMgYW4gb2JqZWN0IHdpdGgga2V5cyAnbnVtYmVyQWZmZWN0ZWQnIGFuZCwgaWYgYW5cbiAgLy8gaW5zZXJ0IGhhcHBlbmVkLCAnaW5zZXJ0ZWRJZCcuXG4gIC8vXG4gIC8vIE90aGVyd2lzZSwgdGhlIHNlbWFudGljcyBhcmUgZXhhY3RseSBsaWtlIG90aGVyIG1ldGhvZHM6IHRoZXkgdGFrZVxuICAvLyBhIGNhbGxiYWNrIGFzIGFuIG9wdGlvbmFsIGxhc3QgYXJndW1lbnQ7IGlmIG5vIGNhbGxiYWNrIGlzXG4gIC8vIHByb3ZpZGVkLCB0aGV5IGJsb2NrIHVudGlsIHRoZSBvcGVyYXRpb24gaXMgY29tcGxldGUsIGFuZCB0aHJvdyBhblxuICAvLyBleGNlcHRpb24gaWYgaXQgZmFpbHM7IGlmIGEgY2FsbGJhY2sgaXMgcHJvdmlkZWQsIHRoZW4gdGhleSBkb24ndFxuICAvLyBuZWNlc3NhcmlseSBibG9jaywgYW5kIHRoZXkgY2FsbCB0aGUgY2FsbGJhY2sgd2hlbiB0aGV5IGZpbmlzaCB3aXRoIGVycm9yIGFuZFxuICAvLyByZXN1bHQgYXJndW1lbnRzLiAgKFRoZSBpbnNlcnQgbWV0aG9kIHByb3ZpZGVzIHRoZSBkb2N1bWVudCBJRCBhcyBpdHMgcmVzdWx0O1xuICAvLyB1cGRhdGUgYW5kIHJlbW92ZSBwcm92aWRlIHRoZSBudW1iZXIgb2YgYWZmZWN0ZWQgZG9jcyBhcyB0aGUgcmVzdWx0OyB1cHNlcnRcbiAgLy8gcHJvdmlkZXMgYW4gb2JqZWN0IHdpdGggbnVtYmVyQWZmZWN0ZWQgYW5kIG1heWJlIGluc2VydGVkSWQuKVxuICAvL1xuICAvLyBPbiB0aGUgY2xpZW50LCBibG9ja2luZyBpcyBpbXBvc3NpYmxlLCBzbyBpZiBhIGNhbGxiYWNrXG4gIC8vIGlzbid0IHByb3ZpZGVkLCB0aGV5IGp1c3QgcmV0dXJuIGltbWVkaWF0ZWx5IGFuZCBhbnkgZXJyb3JcbiAgLy8gaW5mb3JtYXRpb24gaXMgbG9zdC5cbiAgLy9cbiAgLy8gVGhlcmUncyBvbmUgbW9yZSB0d2Vhay4gT24gdGhlIGNsaWVudCwgaWYgeW91IGRvbid0IHByb3ZpZGUgYVxuICAvLyBjYWxsYmFjaywgdGhlbiBpZiB0aGVyZSBpcyBhbiBlcnJvciwgYSBtZXNzYWdlIHdpbGwgYmUgbG9nZ2VkIHdpdGhcbiAgLy8gTWV0ZW9yLl9kZWJ1Zy5cbiAgLy9cbiAgLy8gVGhlIGludGVudCAodGhvdWdoIHRoaXMgaXMgYWN0dWFsbHkgZGV0ZXJtaW5lZCBieSB0aGUgdW5kZXJseWluZ1xuICAvLyBkcml2ZXJzKSBpcyB0aGF0IHRoZSBvcGVyYXRpb25zIHNob3VsZCBiZSBkb25lIHN5bmNocm9ub3VzbHksIG5vdFxuICAvLyBnZW5lcmF0aW5nIHRoZWlyIHJlc3VsdCB1bnRpbCB0aGUgZGF0YWJhc2UgaGFzIGFja25vd2xlZGdlZFxuICAvLyB0aGVtLiBJbiB0aGUgZnV0dXJlIG1heWJlIHdlIHNob3VsZCBwcm92aWRlIGEgZmxhZyB0byB0dXJuIHRoaXNcbiAgLy8gb2ZmLlxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBJbnNlcnQgYSBkb2N1bWVudCBpbiB0aGUgY29sbGVjdGlvbi4gIFJldHVybnMgaXRzIHVuaXF1ZSBfaWQuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kICBpbnNlcnRcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgVGhlIGRvY3VtZW50IHRvIGluc2VydC4gTWF5IG5vdCB5ZXQgaGF2ZSBhbiBfaWQgYXR0cmlidXRlLCBpbiB3aGljaCBjYXNlIE1ldGVvciB3aWxsIGdlbmVyYXRlIG9uZSBmb3IgeW91LlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIE9wdGlvbmFsLiAgSWYgcHJlc2VudCwgY2FsbGVkIHdpdGggYW4gZXJyb3Igb2JqZWN0IGFzIHRoZSBmaXJzdCBhcmd1bWVudCBhbmQsIGlmIG5vIGVycm9yLCB0aGUgX2lkIGFzIHRoZSBzZWNvbmQuXG4gICAqL1xuICBpbnNlcnQoZG9jLCBjYWxsYmFjaykge1xuICAgIC8vIE1ha2Ugc3VyZSB3ZSB3ZXJlIHBhc3NlZCBhIGRvY3VtZW50IHRvIGluc2VydFxuICAgIGlmICghZG9jKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnNlcnQgcmVxdWlyZXMgYW4gYXJndW1lbnRcIik7XG4gICAgfVxuXG4gICAgLy8gTWFrZSBhIHNoYWxsb3cgY2xvbmUgb2YgdGhlIGRvY3VtZW50LCBwcmVzZXJ2aW5nIGl0cyBwcm90b3R5cGUuXG4gICAgZG9jID0gT2JqZWN0LmNyZWF0ZShcbiAgICAgIE9iamVjdC5nZXRQcm90b3R5cGVPZihkb2MpLFxuICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMoZG9jKVxuICAgICk7XG5cbiAgICBpZiAoJ19pZCcgaW4gZG9jKSB7XG4gICAgICBpZiAoISBkb2MuX2lkIHx8XG4gICAgICAgICAgISAodHlwZW9mIGRvYy5faWQgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICAgICAgZG9jLl9pZCBpbnN0YW5jZW9mIE1vbmdvLk9iamVjdElEKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgXCJNZXRlb3IgcmVxdWlyZXMgZG9jdW1lbnQgX2lkIGZpZWxkcyB0byBiZSBub24tZW1wdHkgc3RyaW5ncyBvciBPYmplY3RJRHNcIik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCBnZW5lcmF0ZUlkID0gdHJ1ZTtcblxuICAgICAgLy8gRG9uJ3QgZ2VuZXJhdGUgdGhlIGlkIGlmIHdlJ3JlIHRoZSBjbGllbnQgYW5kIHRoZSAnb3V0ZXJtb3N0JyBjYWxsXG4gICAgICAvLyBUaGlzIG9wdGltaXphdGlvbiBzYXZlcyB1cyBwYXNzaW5nIGJvdGggdGhlIHJhbmRvbVNlZWQgYW5kIHRoZSBpZFxuICAgICAgLy8gUGFzc2luZyBib3RoIGlzIHJlZHVuZGFudC5cbiAgICAgIGlmICh0aGlzLl9pc1JlbW90ZUNvbGxlY3Rpb24oKSkge1xuICAgICAgICBjb25zdCBlbmNsb3NpbmcgPSBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLmdldCgpO1xuICAgICAgICBpZiAoIWVuY2xvc2luZykge1xuICAgICAgICAgIGdlbmVyYXRlSWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZ2VuZXJhdGVJZCkge1xuICAgICAgICBkb2MuX2lkID0gdGhpcy5fbWFrZU5ld0lEKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gT24gaW5zZXJ0cywgYWx3YXlzIHJldHVybiB0aGUgaWQgdGhhdCB3ZSBnZW5lcmF0ZWQ7IG9uIGFsbCBvdGhlclxuICAgIC8vIG9wZXJhdGlvbnMsIGp1c3QgcmV0dXJuIHRoZSByZXN1bHQgZnJvbSB0aGUgY29sbGVjdGlvbi5cbiAgICB2YXIgY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdCA9IGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgIGlmIChkb2MuX2lkKSB7XG4gICAgICAgIHJldHVybiBkb2MuX2lkO1xuICAgICAgfVxuXG4gICAgICAvLyBYWFggd2hhdCBpcyB0aGlzIGZvcj8/XG4gICAgICAvLyBJdCdzIHNvbWUgaXRlcmFjdGlvbiBiZXR3ZWVuIHRoZSBjYWxsYmFjayB0byBfY2FsbE11dGF0b3JNZXRob2QgYW5kXG4gICAgICAvLyB0aGUgcmV0dXJuIHZhbHVlIGNvbnZlcnNpb25cbiAgICAgIGRvYy5faWQgPSByZXN1bHQ7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcblxuICAgIGNvbnN0IHdyYXBwZWRDYWxsYmFjayA9IHdyYXBDYWxsYmFjayhcbiAgICAgIGNhbGxiYWNrLCBjaG9vc2VSZXR1cm5WYWx1ZUZyb21Db2xsZWN0aW9uUmVzdWx0KTtcblxuICAgIGlmICh0aGlzLl9pc1JlbW90ZUNvbGxlY3Rpb24oKSkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fY2FsbE11dGF0b3JNZXRob2QoXCJpbnNlcnRcIiwgW2RvY10sIHdyYXBwZWRDYWxsYmFjayk7XG4gICAgICByZXR1cm4gY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdChyZXN1bHQpO1xuICAgIH1cblxuICAgIC8vIGl0J3MgbXkgY29sbGVjdGlvbi4gIGRlc2NlbmQgaW50byB0aGUgY29sbGVjdGlvbiBvYmplY3RcbiAgICAvLyBhbmQgcHJvcGFnYXRlIGFueSBleGNlcHRpb24uXG4gICAgdHJ5IHtcbiAgICAgIC8vIElmIHRoZSB1c2VyIHByb3ZpZGVkIGEgY2FsbGJhY2sgYW5kIHRoZSBjb2xsZWN0aW9uIGltcGxlbWVudHMgdGhpc1xuICAgICAgLy8gb3BlcmF0aW9uIGFzeW5jaHJvbm91c2x5LCB0aGVuIHF1ZXJ5UmV0IHdpbGwgYmUgdW5kZWZpbmVkLCBhbmQgdGhlXG4gICAgICAvLyByZXN1bHQgd2lsbCBiZSByZXR1cm5lZCB0aHJvdWdoIHRoZSBjYWxsYmFjayBpbnN0ZWFkLlxuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fY29sbGVjdGlvbi5pbnNlcnQoZG9jLCB3cmFwcGVkQ2FsbGJhY2spO1xuICAgICAgcmV0dXJuIGNob29zZVJldHVyblZhbHVlRnJvbUNvbGxlY3Rpb25SZXN1bHQocmVzdWx0KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2soZSk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IE1vZGlmeSBvbmUgb3IgbW9yZSBkb2N1bWVudHMgaW4gdGhlIGNvbGxlY3Rpb24uIFJldHVybnMgdGhlIG51bWJlciBvZiBtYXRjaGVkIGRvY3VtZW50cy5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgdXBkYXRlXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IHNlbGVjdG9yIFNwZWNpZmllcyB3aGljaCBkb2N1bWVudHMgdG8gbW9kaWZ5XG4gICAqIEBwYXJhbSB7TW9uZ29Nb2RpZmllcn0gbW9kaWZpZXIgU3BlY2lmaWVzIGhvdyB0byBtb2RpZnkgdGhlIGRvY3VtZW50c1xuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5tdWx0aSBUcnVlIHRvIG1vZGlmeSBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzOyBmYWxzZSB0byBvbmx5IG1vZGlmeSBvbmUgb2YgdGhlIG1hdGNoaW5nIGRvY3VtZW50cyAodGhlIGRlZmF1bHQpLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMudXBzZXJ0IFRydWUgdG8gaW5zZXJ0IGEgZG9jdW1lbnQgaWYgbm8gbWF0Y2hpbmcgZG9jdW1lbnRzIGFyZSBmb3VuZC5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NhbGxiYWNrXSBPcHRpb25hbC4gIElmIHByZXNlbnQsIGNhbGxlZCB3aXRoIGFuIGVycm9yIG9iamVjdCBhcyB0aGUgZmlyc3QgYXJndW1lbnQgYW5kLCBpZiBubyBlcnJvciwgdGhlIG51bWJlciBvZiBhZmZlY3RlZCBkb2N1bWVudHMgYXMgdGhlIHNlY29uZC5cbiAgICovXG4gIHVwZGF0ZShzZWxlY3RvciwgbW9kaWZpZXIsIC4uLm9wdGlvbnNBbmRDYWxsYmFjaykge1xuICAgIGNvbnN0IGNhbGxiYWNrID0gcG9wQ2FsbGJhY2tGcm9tQXJncyhvcHRpb25zQW5kQ2FsbGJhY2spO1xuXG4gICAgLy8gV2UndmUgYWxyZWFkeSBwb3BwZWQgb2ZmIHRoZSBjYWxsYmFjaywgc28gd2UgYXJlIGxlZnQgd2l0aCBhbiBhcnJheVxuICAgIC8vIG9mIG9uZSBvciB6ZXJvIGl0ZW1zXG4gICAgY29uc3Qgb3B0aW9ucyA9IHsgLi4uKG9wdGlvbnNBbmRDYWxsYmFja1swXSB8fCBudWxsKSB9O1xuICAgIGxldCBpbnNlcnRlZElkO1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMudXBzZXJ0KSB7XG4gICAgICAvLyBzZXQgYGluc2VydGVkSWRgIGlmIGFic2VudC4gIGBpbnNlcnRlZElkYCBpcyBhIE1ldGVvciBleHRlbnNpb24uXG4gICAgICBpZiAob3B0aW9ucy5pbnNlcnRlZElkKSB7XG4gICAgICAgIGlmICghKHR5cGVvZiBvcHRpb25zLmluc2VydGVkSWQgPT09ICdzdHJpbmcnIHx8IG9wdGlvbnMuaW5zZXJ0ZWRJZCBpbnN0YW5jZW9mIE1vbmdvLk9iamVjdElEKSlcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnNlcnRlZElkIG11c3QgYmUgc3RyaW5nIG9yIE9iamVjdElEXCIpO1xuICAgICAgICBpbnNlcnRlZElkID0gb3B0aW9ucy5pbnNlcnRlZElkO1xuICAgICAgfSBlbHNlIGlmICghc2VsZWN0b3IgfHwgIXNlbGVjdG9yLl9pZCkge1xuICAgICAgICBpbnNlcnRlZElkID0gdGhpcy5fbWFrZU5ld0lEKCk7XG4gICAgICAgIG9wdGlvbnMuZ2VuZXJhdGVkSWQgPSB0cnVlO1xuICAgICAgICBvcHRpb25zLmluc2VydGVkSWQgPSBpbnNlcnRlZElkO1xuICAgICAgfVxuICAgIH1cblxuICAgIHNlbGVjdG9yID1cbiAgICAgIE1vbmdvLkNvbGxlY3Rpb24uX3Jld3JpdGVTZWxlY3RvcihzZWxlY3RvciwgeyBmYWxsYmFja0lkOiBpbnNlcnRlZElkIH0pO1xuXG4gICAgY29uc3Qgd3JhcHBlZENhbGxiYWNrID0gd3JhcENhbGxiYWNrKGNhbGxiYWNrKTtcblxuICAgIGlmICh0aGlzLl9pc1JlbW90ZUNvbGxlY3Rpb24oKSkge1xuICAgICAgY29uc3QgYXJncyA9IFtcbiAgICAgICAgc2VsZWN0b3IsXG4gICAgICAgIG1vZGlmaWVyLFxuICAgICAgICBvcHRpb25zXG4gICAgICBdO1xuXG4gICAgICByZXR1cm4gdGhpcy5fY2FsbE11dGF0b3JNZXRob2QoXCJ1cGRhdGVcIiwgYXJncywgd3JhcHBlZENhbGxiYWNrKTtcbiAgICB9XG5cbiAgICAvLyBpdCdzIG15IGNvbGxlY3Rpb24uICBkZXNjZW5kIGludG8gdGhlIGNvbGxlY3Rpb24gb2JqZWN0XG4gICAgLy8gYW5kIHByb3BhZ2F0ZSBhbnkgZXhjZXB0aW9uLlxuICAgIHRyeSB7XG4gICAgICAvLyBJZiB0aGUgdXNlciBwcm92aWRlZCBhIGNhbGxiYWNrIGFuZCB0aGUgY29sbGVjdGlvbiBpbXBsZW1lbnRzIHRoaXNcbiAgICAgIC8vIG9wZXJhdGlvbiBhc3luY2hyb25vdXNseSwgdGhlbiBxdWVyeVJldCB3aWxsIGJlIHVuZGVmaW5lZCwgYW5kIHRoZVxuICAgICAgLy8gcmVzdWx0IHdpbGwgYmUgcmV0dXJuZWQgdGhyb3VnaCB0aGUgY2FsbGJhY2sgaW5zdGVhZC5cbiAgICAgIHJldHVybiB0aGlzLl9jb2xsZWN0aW9uLnVwZGF0ZShcbiAgICAgICAgc2VsZWN0b3IsIG1vZGlmaWVyLCBvcHRpb25zLCB3cmFwcGVkQ2FsbGJhY2spO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayhlKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgUmVtb3ZlIGRvY3VtZW50cyBmcm9tIHRoZSBjb2xsZWN0aW9uXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kIHJlbW92ZVxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtNb25nb1NlbGVjdG9yfSBzZWxlY3RvciBTcGVjaWZpZXMgd2hpY2ggZG9jdW1lbnRzIHRvIHJlbW92ZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIE9wdGlvbmFsLiAgSWYgcHJlc2VudCwgY2FsbGVkIHdpdGggYW4gZXJyb3Igb2JqZWN0IGFzIGl0cyBhcmd1bWVudC5cbiAgICovXG4gIHJlbW92ZShzZWxlY3RvciwgY2FsbGJhY2spIHtcbiAgICBzZWxlY3RvciA9IE1vbmdvLkNvbGxlY3Rpb24uX3Jld3JpdGVTZWxlY3RvcihzZWxlY3Rvcik7XG5cbiAgICBjb25zdCB3cmFwcGVkQ2FsbGJhY2sgPSB3cmFwQ2FsbGJhY2soY2FsbGJhY2spO1xuXG4gICAgaWYgKHRoaXMuX2lzUmVtb3RlQ29sbGVjdGlvbigpKSB7XG4gICAgICByZXR1cm4gdGhpcy5fY2FsbE11dGF0b3JNZXRob2QoXCJyZW1vdmVcIiwgW3NlbGVjdG9yXSwgd3JhcHBlZENhbGxiYWNrKTtcbiAgICB9XG5cbiAgICAvLyBpdCdzIG15IGNvbGxlY3Rpb24uICBkZXNjZW5kIGludG8gdGhlIGNvbGxlY3Rpb24gb2JqZWN0XG4gICAgLy8gYW5kIHByb3BhZ2F0ZSBhbnkgZXhjZXB0aW9uLlxuICAgIHRyeSB7XG4gICAgICAvLyBJZiB0aGUgdXNlciBwcm92aWRlZCBhIGNhbGxiYWNrIGFuZCB0aGUgY29sbGVjdGlvbiBpbXBsZW1lbnRzIHRoaXNcbiAgICAgIC8vIG9wZXJhdGlvbiBhc3luY2hyb25vdXNseSwgdGhlbiBxdWVyeVJldCB3aWxsIGJlIHVuZGVmaW5lZCwgYW5kIHRoZVxuICAgICAgLy8gcmVzdWx0IHdpbGwgYmUgcmV0dXJuZWQgdGhyb3VnaCB0aGUgY2FsbGJhY2sgaW5zdGVhZC5cbiAgICAgIHJldHVybiB0aGlzLl9jb2xsZWN0aW9uLnJlbW92ZShzZWxlY3Rvciwgd3JhcHBlZENhbGxiYWNrKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2soZSk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH0sXG5cbiAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgY29sbGVjdGlvbiBpcyBzaW1wbHkgYSBtaW5pbW9uZ28gcmVwcmVzZW50YXRpb24gb2YgYSByZWFsXG4gIC8vIGRhdGFiYXNlIG9uIGFub3RoZXIgc2VydmVyXG4gIF9pc1JlbW90ZUNvbGxlY3Rpb24oKSB7XG4gICAgLy8gWFhYIHNlZSAjTWV0ZW9yU2VydmVyTnVsbFxuICAgIHJldHVybiB0aGlzLl9jb25uZWN0aW9uICYmIHRoaXMuX2Nvbm5lY3Rpb24gIT09IE1ldGVvci5zZXJ2ZXI7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IE1vZGlmeSBvbmUgb3IgbW9yZSBkb2N1bWVudHMgaW4gdGhlIGNvbGxlY3Rpb24sIG9yIGluc2VydCBvbmUgaWYgbm8gbWF0Y2hpbmcgZG9jdW1lbnRzIHdlcmUgZm91bmQuIFJldHVybnMgYW4gb2JqZWN0IHdpdGgga2V5cyBgbnVtYmVyQWZmZWN0ZWRgICh0aGUgbnVtYmVyIG9mIGRvY3VtZW50cyBtb2RpZmllZCkgIGFuZCBgaW5zZXJ0ZWRJZGAgKHRoZSB1bmlxdWUgX2lkIG9mIHRoZSBkb2N1bWVudCB0aGF0IHdhcyBpbnNlcnRlZCwgaWYgYW55KS5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgdXBzZXJ0XG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IHNlbGVjdG9yIFNwZWNpZmllcyB3aGljaCBkb2N1bWVudHMgdG8gbW9kaWZ5XG4gICAqIEBwYXJhbSB7TW9uZ29Nb2RpZmllcn0gbW9kaWZpZXIgU3BlY2lmaWVzIGhvdyB0byBtb2RpZnkgdGhlIGRvY3VtZW50c1xuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5tdWx0aSBUcnVlIHRvIG1vZGlmeSBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzOyBmYWxzZSB0byBvbmx5IG1vZGlmeSBvbmUgb2YgdGhlIG1hdGNoaW5nIGRvY3VtZW50cyAodGhlIGRlZmF1bHQpLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIE9wdGlvbmFsLiAgSWYgcHJlc2VudCwgY2FsbGVkIHdpdGggYW4gZXJyb3Igb2JqZWN0IGFzIHRoZSBmaXJzdCBhcmd1bWVudCBhbmQsIGlmIG5vIGVycm9yLCB0aGUgbnVtYmVyIG9mIGFmZmVjdGVkIGRvY3VtZW50cyBhcyB0aGUgc2Vjb25kLlxuICAgKi9cbiAgdXBzZXJ0KHNlbGVjdG9yLCBtb2RpZmllciwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICBpZiAoISBjYWxsYmFjayAmJiB0eXBlb2Ygb3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgICBvcHRpb25zID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMudXBkYXRlKHNlbGVjdG9yLCBtb2RpZmllciwge1xuICAgICAgLi4ub3B0aW9ucyxcbiAgICAgIF9yZXR1cm5PYmplY3Q6IHRydWUsXG4gICAgICB1cHNlcnQ6IHRydWUsXG4gICAgfSwgY2FsbGJhY2spO1xuICB9LFxuXG4gIC8vIFdlJ2xsIGFjdHVhbGx5IGRlc2lnbiBhbiBpbmRleCBBUEkgbGF0ZXIuIEZvciBub3csIHdlIGp1c3QgcGFzcyB0aHJvdWdoIHRvXG4gIC8vIE1vbmdvJ3MsIGJ1dCBtYWtlIGl0IHN5bmNocm9ub3VzLlxuICBfZW5zdXJlSW5kZXgoaW5kZXgsIG9wdGlvbnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFzZWxmLl9jb2xsZWN0aW9uLl9lbnN1cmVJbmRleClcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgX2Vuc3VyZUluZGV4IG9uIHNlcnZlciBjb2xsZWN0aW9uc1wiKTtcbiAgICBzZWxmLl9jb2xsZWN0aW9uLl9lbnN1cmVJbmRleChpbmRleCwgb3B0aW9ucyk7XG4gIH0sXG5cbiAgX2Ryb3BJbmRleChpbmRleCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIXNlbGYuX2NvbGxlY3Rpb24uX2Ryb3BJbmRleClcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgX2Ryb3BJbmRleCBvbiBzZXJ2ZXIgY29sbGVjdGlvbnNcIik7XG4gICAgc2VsZi5fY29sbGVjdGlvbi5fZHJvcEluZGV4KGluZGV4KTtcbiAgfSxcblxuICBfZHJvcENvbGxlY3Rpb24oKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghc2VsZi5fY29sbGVjdGlvbi5kcm9wQ29sbGVjdGlvbilcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgX2Ryb3BDb2xsZWN0aW9uIG9uIHNlcnZlciBjb2xsZWN0aW9uc1wiKTtcbiAgICBzZWxmLl9jb2xsZWN0aW9uLmRyb3BDb2xsZWN0aW9uKCk7XG4gIH0sXG5cbiAgX2NyZWF0ZUNhcHBlZENvbGxlY3Rpb24oYnl0ZVNpemUsIG1heERvY3VtZW50cykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIXNlbGYuX2NvbGxlY3Rpb24uX2NyZWF0ZUNhcHBlZENvbGxlY3Rpb24pXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4gb25seSBjYWxsIF9jcmVhdGVDYXBwZWRDb2xsZWN0aW9uIG9uIHNlcnZlciBjb2xsZWN0aW9uc1wiKTtcbiAgICBzZWxmLl9jb2xsZWN0aW9uLl9jcmVhdGVDYXBwZWRDb2xsZWN0aW9uKGJ5dGVTaXplLCBtYXhEb2N1bWVudHMpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBSZXR1cm5zIHRoZSBbYENvbGxlY3Rpb25gXShodHRwOi8vbW9uZ29kYi5naXRodWIuaW8vbm9kZS1tb25nb2RiLW5hdGl2ZS8yLjIvYXBpL0NvbGxlY3Rpb24uaHRtbCkgb2JqZWN0IGNvcnJlc3BvbmRpbmcgdG8gdGhpcyBjb2xsZWN0aW9uIGZyb20gdGhlIFtucG0gYG1vbmdvZGJgIGRyaXZlciBtb2R1bGVdKGh0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL21vbmdvZGIpIHdoaWNoIGlzIHdyYXBwZWQgYnkgYE1vbmdvLkNvbGxlY3Rpb25gLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqL1xuICByYXdDb2xsZWN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoISBzZWxmLl9jb2xsZWN0aW9uLnJhd0NvbGxlY3Rpb24pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgcmF3Q29sbGVjdGlvbiBvbiBzZXJ2ZXIgY29sbGVjdGlvbnNcIik7XG4gICAgfVxuICAgIHJldHVybiBzZWxmLl9jb2xsZWN0aW9uLnJhd0NvbGxlY3Rpb24oKTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgUmV0dXJucyB0aGUgW2BEYmBdKGh0dHA6Ly9tb25nb2RiLmdpdGh1Yi5pby9ub2RlLW1vbmdvZGItbmF0aXZlLzIuMi9hcGkvRGIuaHRtbCkgb2JqZWN0IGNvcnJlc3BvbmRpbmcgdG8gdGhpcyBjb2xsZWN0aW9uJ3MgZGF0YWJhc2UgY29ubmVjdGlvbiBmcm9tIHRoZSBbbnBtIGBtb25nb2RiYCBkcml2ZXIgbW9kdWxlXShodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9tb25nb2RiKSB3aGljaCBpcyB3cmFwcGVkIGJ5IGBNb25nby5Db2xsZWN0aW9uYC5cbiAgICogQGxvY3VzIFNlcnZlclxuICAgKi9cbiAgcmF3RGF0YWJhc2UoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghIChzZWxmLl9kcml2ZXIubW9uZ28gJiYgc2VsZi5fZHJpdmVyLm1vbmdvLmRiKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuIG9ubHkgY2FsbCByYXdEYXRhYmFzZSBvbiBzZXJ2ZXIgY29sbGVjdGlvbnNcIik7XG4gICAgfVxuICAgIHJldHVybiBzZWxmLl9kcml2ZXIubW9uZ28uZGI7XG4gIH1cbn0pO1xuXG4vLyBDb252ZXJ0IHRoZSBjYWxsYmFjayB0byBub3QgcmV0dXJuIGEgcmVzdWx0IGlmIHRoZXJlIGlzIGFuIGVycm9yXG5mdW5jdGlvbiB3cmFwQ2FsbGJhY2soY2FsbGJhY2ssIGNvbnZlcnRSZXN1bHQpIHtcbiAgcmV0dXJuIGNhbGxiYWNrICYmIGZ1bmN0aW9uIChlcnJvciwgcmVzdWx0KSB7XG4gICAgaWYgKGVycm9yKSB7XG4gICAgICBjYWxsYmFjayhlcnJvcik7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgY29udmVydFJlc3VsdCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBjYWxsYmFjayhudWxsLCBjb252ZXJ0UmVzdWx0KHJlc3VsdCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYWxsYmFjayhudWxsLCByZXN1bHQpO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBAc3VtbWFyeSBDcmVhdGUgYSBNb25nby1zdHlsZSBgT2JqZWN0SURgLiAgSWYgeW91IGRvbid0IHNwZWNpZnkgYSBgaGV4U3RyaW5nYCwgdGhlIGBPYmplY3RJRGAgd2lsbCBnZW5lcmF0ZWQgcmFuZG9tbHkgKG5vdCB1c2luZyBNb25nb0RCJ3MgSUQgY29uc3RydWN0aW9uIHJ1bGVzKS5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQGNsYXNzXG4gKiBAcGFyYW0ge1N0cmluZ30gW2hleFN0cmluZ10gT3B0aW9uYWwuICBUaGUgMjQtY2hhcmFjdGVyIGhleGFkZWNpbWFsIGNvbnRlbnRzIG9mIHRoZSBPYmplY3RJRCB0byBjcmVhdGVcbiAqL1xuTW9uZ28uT2JqZWN0SUQgPSBNb25nb0lELk9iamVjdElEO1xuXG4vKipcbiAqIEBzdW1tYXJ5IFRvIGNyZWF0ZSBhIGN1cnNvciwgdXNlIGZpbmQuIFRvIGFjY2VzcyB0aGUgZG9jdW1lbnRzIGluIGEgY3Vyc29yLCB1c2UgZm9yRWFjaCwgbWFwLCBvciBmZXRjaC5cbiAqIEBjbGFzc1xuICogQGluc3RhbmNlTmFtZSBjdXJzb3JcbiAqL1xuTW9uZ28uQ3Vyc29yID0gTG9jYWxDb2xsZWN0aW9uLkN1cnNvcjtcblxuLyoqXG4gKiBAZGVwcmVjYXRlZCBpbiAwLjkuMVxuICovXG5Nb25nby5Db2xsZWN0aW9uLkN1cnNvciA9IE1vbmdvLkN1cnNvcjtcblxuLyoqXG4gKiBAZGVwcmVjYXRlZCBpbiAwLjkuMVxuICovXG5Nb25nby5Db2xsZWN0aW9uLk9iamVjdElEID0gTW9uZ28uT2JqZWN0SUQ7XG5cbi8qKlxuICogQGRlcHJlY2F0ZWQgaW4gMC45LjFcbiAqL1xuTWV0ZW9yLkNvbGxlY3Rpb24gPSBNb25nby5Db2xsZWN0aW9uO1xuXG4vLyBBbGxvdyBkZW55IHN0dWZmIGlzIG5vdyBpbiB0aGUgYWxsb3ctZGVueSBwYWNrYWdlXG5PYmplY3QuYXNzaWduKFxuICBNZXRlb3IuQ29sbGVjdGlvbi5wcm90b3R5cGUsXG4gIEFsbG93RGVueS5Db2xsZWN0aW9uUHJvdG90eXBlXG4pO1xuXG5mdW5jdGlvbiBwb3BDYWxsYmFja0Zyb21BcmdzKGFyZ3MpIHtcbiAgLy8gUHVsbCBvZmYgYW55IGNhbGxiYWNrIChvciBwZXJoYXBzIGEgJ2NhbGxiYWNrJyB2YXJpYWJsZSB0aGF0IHdhcyBwYXNzZWRcbiAgLy8gaW4gdW5kZWZpbmVkLCBsaWtlIGhvdyAndXBzZXJ0JyBkb2VzIGl0KS5cbiAgaWYgKGFyZ3MubGVuZ3RoICYmXG4gICAgICAoYXJnc1thcmdzLmxlbmd0aCAtIDFdID09PSB1bmRlZmluZWQgfHxcbiAgICAgICBhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gaW5zdGFuY2VvZiBGdW5jdGlvbikpIHtcbiAgICByZXR1cm4gYXJncy5wb3AoKTtcbiAgfVxufVxuIiwiLyoqXG4gKiBAc3VtbWFyeSBBbGxvd3MgZm9yIHVzZXIgc3BlY2lmaWVkIGNvbm5lY3Rpb24gb3B0aW9uc1xuICogQGV4YW1wbGUgaHR0cDovL21vbmdvZGIuZ2l0aHViLmlvL25vZGUtbW9uZ29kYi1uYXRpdmUvMi4yL3JlZmVyZW5jZS9jb25uZWN0aW5nL2Nvbm5lY3Rpb24tc2V0dGluZ3MvXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBVc2VyIHNwZWNpZmllZCBNb25nbyBjb25uZWN0aW9uIG9wdGlvbnNcbiAqL1xuTW9uZ28uc2V0Q29ubmVjdGlvbk9wdGlvbnMgPSBmdW5jdGlvbiBzZXRDb25uZWN0aW9uT3B0aW9ucyAob3B0aW9ucykge1xuICBjaGVjayhvcHRpb25zLCBPYmplY3QpO1xuICBNb25nby5fY29ubmVjdGlvbk9wdGlvbnMgPSBvcHRpb25zO1xufTsiXX0=
