//////////////////////////////////////////////////////////////////////////
//                                                                      //
// This is a generated file. You can view the original                  //
// source in your browser if your browser supports source maps.         //
// Source maps are supported by all recent versions of Chrome, Safari,  //
// and Firefox, and by Internet Explorer 11.                            //
//                                                                      //
//////////////////////////////////////////////////////////////////////////


(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;
var HTTP = Package.http.HTTP;

var require = meteorInstall({"node_modules":{"meteor":{"dynamic-import":{"client.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////
//                                                                             //
// packages/dynamic-import/client.js                                           //
//                                                                             //
/////////////////////////////////////////////////////////////////////////////////
                                                                               //
var Module = module.constructor;
var cache = require("./cache.js");
var HTTP = require("meteor/http").HTTP;
var meteorInstall = require("meteor/modules").meteorInstall;

// Call module.dynamicImport(id) to fetch a module and any/all of its
// dependencies that have not already been fetched, and evaluate them as
// soon as they arrive. This runtime API makes it very easy to implement
// ECMAScript dynamic import(...) syntax.
Module.prototype.dynamicImport = function (id) {
  var module = this;
  return module.prefetch(id).then(function () {
    return getNamespace(module, id);
  });
};

// Called by Module.prototype.prefetch if there are any missing dynamic
// modules that need to be fetched.
meteorInstall.fetch = function (ids) {
  var tree = Object.create(null);
  var versions = Object.create(null);
  var dynamicVersions = require("./dynamic-versions.js");
  var missing;

  function addSource(id, source) {
    addToTree(tree, id, makeModuleFunction(id, source, ids[id].options));
  }

  function addMissing(id) {
    addToTree(missing = missing || Object.create(null), id, 1);
  }

  Object.keys(ids).forEach(function (id) {
    var version = dynamicVersions.get(id);
    if (version) {
      versions[id] = version;
    } else {
      addMissing(id);
    }
  });

  return cache.checkMany(versions).then(function (sources) {
    Object.keys(sources).forEach(function (id) {
      var source = sources[id];
      if (source) {
        addSource(id, source);
      } else {
        addMissing(id);
      }
    });

    return missing && fetchMissing(missing).then(function (results) {
      var versionsAndSourcesById = Object.create(null);
      var flatResults = flattenModuleTree(results);

      Object.keys(flatResults).forEach(function (id) {
        var source = flatResults[id];
        addSource(id, source);

        var version = dynamicVersions.get(id);
        if (version) {
          versionsAndSourcesById[id] = {
            version: version,
            source: source
          };
        }
      });

      cache.setMany(versionsAndSourcesById);
    });

  }).then(function () {
    return tree;
  });
};

function flattenModuleTree(tree) {
  var parts = [""];
  var result = Object.create(null);

  function walk(t) {
    if (t && typeof t === "object") {
      Object.keys(t).forEach(function (key) {
        parts.push(key);
        walk(t[key]);
        parts.pop();
      });
    } else if (typeof t === "string") {
      result[parts.join("/")] = t;
    }
  }

  walk(tree);

  return result;
}

function makeModuleFunction(id, source, options) {
  // By calling (options && options.eval || eval) in a wrapper function,
  // we delay the cost of parsing and evaluating the module code until the
  // module is first imported.
  return function () {
    // If an options.eval function was provided in the second argument to
    // meteorInstall when this bundle was first installed, use that
    // function to parse and evaluate the dynamic module code in the scope
    // of the package. Otherwise fall back to indirect (global) eval.
    return (options && options.eval || eval)(
      // Wrap the function(require,exports,module){...} expression in
      // parentheses to force it to be parsed as an expression.
      "(" + source + ")\n//# sourceURL=" + id
    ).apply(this, arguments);
  };
}

var secretKey = null;
exports.setSecretKey = function (key) {
  secretKey = key;
};

var fetchURL = require("./common.js").fetchURL;

function fetchMissing(missingTree) {
  return new Promise(function (resolve, reject) {
    // If the hostname of the URL returned by Meteor.absoluteUrl differs
    // from location.host, then we'll be making a cross-origin request
    // here, but that's fine because the dynamic-import server sets
    // appropriate CORS headers to enable fetching dynamic modules from
    // any origin. Browsers that check CORS do so by sending an additional
    // preflight OPTIONS request, which may add latency to the first
    // dynamic import() request, so it's a good idea for ROOT_URL to match
    // location.host if possible, though not strictly necessary.
    HTTP.call("POST", Meteor.absoluteUrl(fetchURL), {
      query: secretKey ? "key=" + secretKey : void 0,
      data: missingTree
    }, function (error, result) {
      error ? reject(error) : resolve(result.data);
    });
  });
}

function addToTree(tree, id, value) {
  var parts = id.split("/");
  var lastIndex = parts.length - 1;
  parts.forEach(function (part, i) {
    if (part) {
      tree = tree[part] = tree[part] ||
        (i < lastIndex ? Object.create(null) : value);
    }
  });
}

function getNamespace(module, id) {
  var namespace;

  module.watch(module.require(id), {
    "*": function (ns) {
      namespace = ns;
    }
  });

  // This helps with Babel interop, since we're not just returning the
  // module.exports object.
  Object.defineProperty(namespace, "__esModule", {
    value: true,
    enumerable: false
  });

  return namespace;
}

/////////////////////////////////////////////////////////////////////////////////

},"cache.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////
//                                                                             //
// packages/dynamic-import/cache.js                                            //
//                                                                             //
/////////////////////////////////////////////////////////////////////////////////
                                                                               //
var hasOwn = Object.prototype.hasOwnProperty;
var dbPromise;

var canUseCache =
  // The server doesn't benefit from dynamic module fetching, and almost
  // certainly doesn't support IndexedDB.
  Meteor.isClient &&
  // Cordova bundles all modules into the monolithic initial bundle, so
  // the dynamic module cache won't be necessary.
  ! Meteor.isCordova &&
  // Caching can be confusing in development, and is designed to be a
  // transparent optimization for production performance.
  Meteor.isProduction;

function getIDB() {
  if (typeof indexedDB !== "undefined") return indexedDB;
  if (typeof webkitIndexedDB !== "undefined") return webkitIndexedDB;
  if (typeof mozIndexedDB !== "undefined") return mozIndexedDB;
  if (typeof OIndexedDB !== "undefined") return OIndexedDB;
  if (typeof msIndexedDB !== "undefined") return msIndexedDB;
}

function withDB(callback) {
  dbPromise = dbPromise || new Promise(function (resolve, reject) {
    var idb = getIDB();
    if (! idb) {
      throw new Error("IndexedDB not available");
    }

    // Incrementing the version number causes all existing object stores
    // to be deleted and recreates those specified by objectStoreMap.
    var request = idb.open("MeteorDynamicImportCache", 2);

    request.onupgradeneeded = function (event) {
      var db = event.target.result;

      // It's fine to delete existing object stores since onupgradeneeded
      // is only called when we change the DB version number, and the data
      // we're storing is disposable/reconstructible.
      Array.from(db.objectStoreNames).forEach(db.deleteObjectStore, db);

      Object.keys(objectStoreMap).forEach(function (name) {
        db.createObjectStore(name, objectStoreMap[name]);
      });
    };

    request.onerror = makeOnError(reject, "indexedDB.open");
    request.onsuccess = function (event) {
      resolve(event.target.result);
    };
  });

  return dbPromise.then(callback, function (error) {
    return callback(null);
  });
}

var objectStoreMap = {
  sourcesByVersion: { keyPath: "version" }
};

function makeOnError(reject, source) {
  return function (event) {
    reject(new Error(
      "IndexedDB failure in " + source + " " +
        JSON.stringify(event.target)
    ));

    // Returning true from an onerror callback function prevents an
    // InvalidStateError in Firefox during Private Browsing. Silencing
    // that error is safe because we handle the error more gracefully by
    // passing it to the Promise reject function above.
    // https://github.com/meteor/meteor/issues/8697
    return true;
  };
}

var checkCount = 0;

exports.checkMany = function (versions) {
  var ids = Object.keys(versions);
  var sourcesById = Object.create(null);

  // Initialize sourcesById with null values to indicate all sources are
  // missing (unless replaced with actual sources below).
  ids.forEach(function (id) {
    sourcesById[id] = null;
  });

  if (! canUseCache) {
    return Promise.resolve(sourcesById);
  }

  return withDB(function (db) {
    if (! db) {
      // We thought we could used IndexedDB, but something went wrong
      // while opening the database, so err on the side of safety.
      return sourcesById;
    }

    var txn = db.transaction([
      "sourcesByVersion"
    ], "readonly");

    var sourcesByVersion = txn.objectStore("sourcesByVersion");

    ++checkCount;

    function finish() {
      --checkCount;
      return sourcesById;
    }

    return Promise.all(ids.map(function (id) {
      return new Promise(function (resolve, reject) {
        var version = versions[id];
        if (version) {
          var sourceRequest = sourcesByVersion.get(version);
          sourceRequest.onerror = makeOnError(reject, "sourcesByVersion.get");
          sourceRequest.onsuccess = function (event) {
            var result = event.target.result;
            if (result) {
              sourcesById[id] = result.source;
            }
            resolve();
          };
        } else resolve();
      });
    })).then(finish, finish);
  });
};

var pendingVersionsAndSourcesById = Object.create(null);

exports.setMany = function (versionsAndSourcesById) {
  if (canUseCache) {
    Object.assign(
      pendingVersionsAndSourcesById,
      versionsAndSourcesById
    );

    // Delay the call to flushSetMany so that it doesn't contribute to the
    // amount of time it takes to call module.dynamicImport.
    if (! flushSetMany.timer) {
      flushSetMany.timer = setTimeout(flushSetMany, 100);
    }
  }
};

function flushSetMany() {
  if (checkCount > 0) {
    // If checkMany is currently underway, postpone the flush until later,
    // since updating the cache is less important than reading from it.
    return flushSetMany.timer = setTimeout(flushSetMany, 100);
  }

  flushSetMany.timer = null;

  var versionsAndSourcesById = pendingVersionsAndSourcesById;
  pendingVersionsAndSourcesById = Object.create(null);

  return withDB(function (db) {
    if (! db) {
      // We thought we could used IndexedDB, but something went wrong
      // while opening the database, so err on the side of safety.
      return;
    }

    var setTxn = db.transaction([
      "sourcesByVersion"
    ], "readwrite");

    var sourcesByVersion = setTxn.objectStore("sourcesByVersion");

    return Promise.all(
      Object.keys(versionsAndSourcesById).map(function (id) {
        var info = versionsAndSourcesById[id];
        return new Promise(function (resolve, reject) {
          var request = sourcesByVersion.put({
            version: info.version,
            source: info.source
          });
          request.onerror = makeOnError(reject, "sourcesByVersion.put");
          request.onsuccess = resolve;
        });
      })
    );
  });
}

/////////////////////////////////////////////////////////////////////////////////

},"common.js":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////
//                                                                             //
// packages/dynamic-import/common.js                                           //
//                                                                             //
/////////////////////////////////////////////////////////////////////////////////
                                                                               //
exports.fetchURL = "/__meteor__/dynamic-import/fetch";

/////////////////////////////////////////////////////////////////////////////////

},"dynamic-versions.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////
//                                                                             //
// packages/dynamic-import/dynamic-versions.js                                 //
//                                                                             //
/////////////////////////////////////////////////////////////////////////////////
                                                                               //
// This magic double-underscored identifier gets replaced in
// tools/isobuild/bundler.js with a tree of hashes of all dynamic
// modules, for use in client.js and cache.js.
var versions = {"node_modules":{"chart.js":{"package.json":"314033c98d78660afaeb1765bd53c9f908190f56","src":{"chart.js":"4160f2471d4144a1c213b6a4b65102589af2d02d","core":{"core.js":"75fbbf7ec5c62b1167803bea608344fc5fec2b14","core.defaults.js":"fdd0dc6eac075c47ca620d27359edc8467666b43","core.helpers.js":"2a2ed267284becb555caf974e7849b3b63e1af6f","core.element.js":"bb734402eea3e7c84f4af74ca95d4e34d104a63f","core.interaction.js":"339c922c7d7027a645932c6d271c1c32de096a68","core.layouts.js":"35a35b6d33f5094a900a56e6d0dbe945a0afb243","core.plugins.js":"fa607306ad0652864be90efef8196453a915c200","core.ticks.js":"22757f04f56cd7edf5c3d8d3f090f6577f96e5ed","core.animation.js":"055b4d1f1bbcee1b30827d3d4c70510d035d5bbd","core.controller.js":"4896aef9a68ca925bee577c043f31fe46bd80883","core.datasetController.js":"117ebcb5a67461f305b7532bfee6f1542061c60a","core.scaleService.js":"20773b1e632416ee29f61d00604d111f73ec24ba","core.scale.js":"241448d87f48bbe1e06c6f11b085816c6795fc6b","core.tooltip.js":"98a6695471b15f31e9f3af8e257d3d716aa47fd6"},"helpers":{"index.js":"8a6b094ad54b309283fa0d8dba739a6396eedb12","helpers.core.js":"2dbd59e3773c7b5743833e6e3f41eeccd078d808","helpers.easing.js":"368dde8072486bc877e842b9cf3edae9ba1ddcf8","helpers.canvas.js":"fd742d42bfaa2099ebcbd47a35bbf717983c504f","helpers.options.js":"79cfb29ad945eded7d12589538d7cdad044288b6"},"elements":{"index.js":"9d95664fcff7df66faeab6e3f2e8681f585c3e1b","element.arc.js":"343f39b6e40b3018b5c183797864dd59a221b553","element.line.js":"2f5ae8c83ec151a6ea0ffec8a30981a439ce1bc6","element.point.js":"b2ae2fd68abb5881b81298365834645443cba401","element.rectangle.js":"5e69dec4d0d5d0295a572885a97fbfd5c4fe1ba7"},"platforms":{"platform.js":"db6989869bbd7349383b4a12d2111f1c740b4b27","platform.basic.js":"0414c0113640fb3b3d2b808dd57a0828fb105c6f","platform.dom.js":"9f7b50b5dea105ce90aa4ccfb040eb550297e332"},"scales":{"scale.linearbase.js":"e3165001927c4494886137c5dbd177122847009b","scale.category.js":"2ac147e2628688238c0d51a0160feca5411d7c75","scale.linear.js":"71c39d05083c1a31c358ddb6b674b1dbdd63f86a","scale.logarithmic.js":"52312bccff98d11e5f0e91343061a87933386bc5","scale.radialLinear.js":"ab29950614ccdad798dc297dc47dc4cfe9c8005b","scale.time.js":"d672344c652cc94d538e76172d803608fc428180"},"controllers":{"controller.bar.js":"1e3103bfd2fdd58fe3ebad21ad5de5943c94fed6","controller.bubble.js":"a2fd1166f4576506c273326ecbb780523c1b009d","controller.doughnut.js":"0347a1bf975d669a7328585ac6b6ddd7a0a7f960","controller.line.js":"729ad418d65d9fa2d85d5525a4d95f2a4c645d02","controller.polarArea.js":"f3f05b69f02c9be44b17bb6ba9c1a4d96097a136","controller.radar.js":"04cfffeda86f68732d604066afa934447b102bb5","controller.scatter.js":"533d2ab04dc0045634c0109f46b2e6291505d4e9"},"charts":{"Chart.Bar.js":"afd6d5e033f3d1af0b965a1df6a7885879c777ed","Chart.Bubble.js":"928c357870012852bc7a631dac282880d4c14505","Chart.Doughnut.js":"3ce5abea7711cb7412721fb5fd795d76f340c9a7","Chart.Line.js":"55d37ba4b3c947e1b176aeeaea208864f9f3b7fd","Chart.PolarArea.js":"bf0041bd5f54403b4f3c7cb6db265fe5e45fe151","Chart.Radar.js":"339914e03b2381b28791bd3be6d7bc98b0a5d76a","Chart.Scatter.js":"458df9fc10f35b98555f59356e4450a6bf98000f"},"plugins":{"index.js":"8d4079bc56701fa9aa4ebeeb0632ebfbe737c879","plugin.filler.js":"880ce77054e95836565f00e930f60d1cd0d06c8f","plugin.legend.js":"af216cb9b5673da95ee25fcc6e639f5abb407951","plugin.title.js":"a89d320f864312afff16db0df804c6cc667197b7"}}},"chartjs-color":{"package.json":"f0195f8c5af83f45a4a253a3ac258f4cf3b73c1f","index.js":"4dd3affc3df97ea99afa9e1ac5f41d08aceb0900","node_modules":{"color-convert":{"package.json":"a59e9bd7264ca11b2f96c55867085b49832ff8cb","index.js":"353f596659fbb0f825aadd849b641b496df4acde","conversions.js":"faea97543783604c05799980c3defda6f7d23970"}}},"chartjs-color-string":{"package.json":"9ad922d152b5dde0699c118096ff0a32878ade2e","color-string.js":"dd464a9d0848f22df9f9088af43d75adaff581fc"},"color-name":{"package.json":"6df6e1f02baa5db6c9c9f969ea33c059c6db5a33","index.js":"eeb4a0fa95fe27c49988180cc6828b700983b3e7"},"moment":{"package.json":"a13915d746d0ca626a2a47bdd62acb7b4974ce60","moment.js":"903d0dddd4ebad28736394d24a5063561a914e2e"},"meteor":{"socket-stream-client":{"sockjs-0.3.4.js":"fd184747230bbe331a23a0f109337965fc505602"}}},"imports":{"ui":{"hands.js":"4881a4cdff317b397a74d524db4eae1812518cd1"}}};

exports.get = function (id) {
  var tree = versions;
  var version = null;

  id.split("/").some(function (part) {
    if (part) {
      // If the tree contains identifiers for Meteor packages with colons
      // in their names, the colons should not have been replaced by
      // underscores, but there's a bug that results in that behavior, so
      // for now it seems safest to be tolerant of underscores here.
      // https://github.com/meteor/meteor/pull/9103
      tree = tree[part] || tree[part.replace(":", "_")];
    }

    if (! tree) {
      // Terminate the search without reassigning version.
      return true;
    }

    if (typeof tree === "string") {
      version = tree;
      return true;
    }
  });

  return version;
};

function getFlatModuleArray(tree) {
  var parts = [""];
  var result = [];

  function walk(t) {
    if (t && typeof t === "object") {
      Object.keys(t).forEach(function (key) {
        parts.push(key);
        walk(t[key]);
        parts.pop();
      });
    } else if (typeof t === "string") {
      result.push(parts.join("/"));
    }
  }

  walk(tree);

  return result;
}

// If Package.appcache is loaded, preload additional modules after the
// core bundle has been loaded.
function precacheOnLoad(event) {
  // Check inside onload to make sure Package.appcache has had a chance to
  // become available.
  if (! Package.appcache) {
    return;
  }

  // Prefetch in chunks to reduce overhead. If we call module.prefetch(id)
  // multiple times in the same tick of the event loop, all those modules
  // will be fetched in one HTTP POST request.
  function prefetchInChunks(modules, amount) {
    Promise.all(modules.splice(0, amount).map(function (id) {
      return module.prefetch(id);
    })).then(function () {
      if (modules.length > 0) {
        prefetchInChunks(modules, amount);
      }
    });
  }

  // Get a flat array of modules and start prefetching.
  prefetchInChunks(getFlatModuleArray(versions), 50);
}

// Use window.onload to only prefetch after the main bundle has loaded.
if (global.addEventListener) {
  global.addEventListener('load', precacheOnLoad, false);
} else if (global.attachEvent) {
  global.attachEvent('onload', precacheOnLoad);
}

/////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/dynamic-import/client.js");

/* Exports */
Package._define("dynamic-import", exports);

})();
