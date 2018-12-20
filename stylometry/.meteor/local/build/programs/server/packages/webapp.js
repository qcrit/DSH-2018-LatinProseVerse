(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var Log = Package.logging.Log;
var _ = Package.underscore._;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var Boilerplate = Package['boilerplate-generator'].Boilerplate;
var WebAppHashing = Package['webapp-hashing'].WebAppHashing;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var memoizedBoilerplate, WebApp, WebAppInternals, main;

var require = meteorInstall({"node_modules":{"meteor":{"webapp":{"webapp_server.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/webapp/webapp_server.js                                                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
const module1 = module;
module1.export({
  WebApp: () => WebApp,
  WebAppInternals: () => WebAppInternals
});
let assert;
module1.watch(require("assert"), {
  default(v) {
    assert = v;
  }

}, 0);
let readFile;
module1.watch(require("fs"), {
  readFile(v) {
    readFile = v;
  }

}, 1);
let createServer;
module1.watch(require("http"), {
  createServer(v) {
    createServer = v;
  }

}, 2);
let pathJoin, pathDirname;
module1.watch(require("path"), {
  join(v) {
    pathJoin = v;
  },

  dirname(v) {
    pathDirname = v;
  }

}, 3);
let parseUrl;
module1.watch(require("url"), {
  parse(v) {
    parseUrl = v;
  }

}, 4);
let createHash;
module1.watch(require("crypto"), {
  createHash(v) {
    createHash = v;
  }

}, 5);
let connect;
module1.watch(require("./connect.js"), {
  connect(v) {
    connect = v;
  }

}, 6);
let compress;
module1.watch(require("compression"), {
  default(v) {
    compress = v;
  }

}, 7);
let cookieParser;
module1.watch(require("cookie-parser"), {
  default(v) {
    cookieParser = v;
  }

}, 8);
let query;
module1.watch(require("qs-middleware"), {
  default(v) {
    query = v;
  }

}, 9);
let parseRequest;
module1.watch(require("parseurl"), {
  default(v) {
    parseRequest = v;
  }

}, 10);
let basicAuth;
module1.watch(require("basic-auth-connect"), {
  default(v) {
    basicAuth = v;
  }

}, 11);
let lookupUserAgent;
module1.watch(require("useragent"), {
  lookup(v) {
    lookupUserAgent = v;
  }

}, 12);
let isModern;
module1.watch(require("meteor/modern-browsers"), {
  isModern(v) {
    isModern = v;
  }

}, 13);
let send;
module1.watch(require("send"), {
  default(v) {
    send = v;
  }

}, 14);
let removeExistingSocketFile, registerSocketFileCleanup;
module1.watch(require("./socket_file.js"), {
  removeExistingSocketFile(v) {
    removeExistingSocketFile = v;
  },

  registerSocketFileCleanup(v) {
    registerSocketFileCleanup = v;
  }

}, 15);
var SHORT_SOCKET_TIMEOUT = 5 * 1000;
var LONG_SOCKET_TIMEOUT = 120 * 1000;
const WebApp = {};
const WebAppInternals = {};
const hasOwn = Object.prototype.hasOwnProperty; // backwards compat to 2.0 of connect

connect.basicAuth = basicAuth;
WebAppInternals.NpmModules = {
  connect: {
    version: Npm.require('connect/package.json').version,
    module: connect
  }
}; // Though we might prefer to use web.browser (modern) as the default
// architecture, safety requires a more compatible defaultArch.

WebApp.defaultArch = 'web.browser.legacy'; // XXX maps archs to manifests

WebApp.clientPrograms = {}; // XXX maps archs to program path on filesystem

var archPath = {};

var bundledJsCssUrlRewriteHook = function (url) {
  var bundledPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '';
  return bundledPrefix + url;
};

var sha1 = function (contents) {
  var hash = createHash('sha1');
  hash.update(contents);
  return hash.digest('hex');
};

var readUtf8FileSync = function (filename) {
  return Meteor.wrapAsync(readFile)(filename, 'utf8');
}; // #BrowserIdentification
//
// We have multiple places that want to identify the browser: the
// unsupported browser page, the appcache package, and, eventually
// delivering browser polyfills only as needed.
//
// To avoid detecting the browser in multiple places ad-hoc, we create a
// Meteor "browser" object. It uses but does not expose the npm
// useragent module (we could choose a different mechanism to identify
// the browser in the future if we wanted to).  The browser object
// contains
//
// * `name`: the name of the browser in camel case
// * `major`, `minor`, `patch`: integers describing the browser version
//
// Also here is an early version of a Meteor `request` object, intended
// to be a high-level description of the request without exposing
// details of connect's low-level `req`.  Currently it contains:
//
// * `browser`: browser identification object described above
// * `url`: parsed url, including parsed query params
//
// As a temporary hack there is a `categorizeRequest` function on WebApp which
// converts a connect `req` to a Meteor `request`. This can go away once smart
// packages such as appcache are being passed a `request` object directly when
// they serve content.
//
// This allows `request` to be used uniformly: it is passed to the html
// attributes hook, and the appcache package can use it when deciding
// whether to generate a 404 for the manifest.
//
// Real routing / server side rendering will probably refactor this
// heavily.
// e.g. "Mobile Safari" => "mobileSafari"


var camelCase = function (name) {
  var parts = name.split(' ');
  parts[0] = parts[0].toLowerCase();

  for (var i = 1; i < parts.length; ++i) {
    parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].substr(1);
  }

  return parts.join('');
};

var identifyBrowser = function (userAgentString) {
  var userAgent = lookupUserAgent(userAgentString);
  return {
    name: camelCase(userAgent.family),
    major: +userAgent.major,
    minor: +userAgent.minor,
    patch: +userAgent.patch
  };
}; // XXX Refactor as part of implementing real routing.


WebAppInternals.identifyBrowser = identifyBrowser;

WebApp.categorizeRequest = function (req) {
  return _.extend({
    browser: identifyBrowser(req.headers['user-agent']),
    url: parseUrl(req.url, true)
  }, _.pick(req, 'dynamicHead', 'dynamicBody', 'headers', 'cookies'));
}; // HTML attribute hooks: functions to be called to determine any attributes to
// be added to the '<html>' tag. Each function is passed a 'request' object (see
// #BrowserIdentification) and should return null or object.


var htmlAttributeHooks = [];

var getHtmlAttributes = function (request) {
  var combinedAttributes = {};

  _.each(htmlAttributeHooks || [], function (hook) {
    var attributes = hook(request);
    if (attributes === null) return;
    if (typeof attributes !== 'object') throw Error("HTML attribute hook must return null or object");

    _.extend(combinedAttributes, attributes);
  });

  return combinedAttributes;
};

WebApp.addHtmlAttributeHook = function (hook) {
  htmlAttributeHooks.push(hook);
}; // Serve app HTML for this URL?


var appUrl = function (url) {
  if (url === '/favicon.ico' || url === '/robots.txt') return false; // NOTE: app.manifest is not a web standard like favicon.ico and
  // robots.txt. It is a file name we have chosen to use for HTML5
  // appcache URLs. It is included here to prevent using an appcache
  // then removing it from poisoning an app permanently. Eventually,
  // once we have server side routing, this won't be needed as
  // unknown URLs with return a 404 automatically.

  if (url === '/app.manifest') return false; // Avoid serving app HTML for declared routes such as /sockjs/.

  if (RoutePolicy.classify(url)) return false; // we currently return app HTML on all URLs by default

  return true;
}; // We need to calculate the client hash after all packages have loaded
// to give them a chance to populate __meteor_runtime_config__.
//
// Calculating the hash during startup means that packages can only
// populate __meteor_runtime_config__ during load, not during startup.
//
// Calculating instead it at the beginning of main after all startup
// hooks had run would allow packages to also populate
// __meteor_runtime_config__ during startup, but that's too late for
// autoupdate because it needs to have the client hash at startup to
// insert the auto update version itself into
// __meteor_runtime_config__ to get it to the client.
//
// An alternative would be to give autoupdate a "post-start,
// pre-listen" hook to allow it to insert the auto update version at
// the right moment.


Meteor.startup(function () {
  var calculateClientHash = WebAppHashing.calculateClientHash;

  WebApp.clientHash = function (archName) {
    archName = archName || WebApp.defaultArch;
    return calculateClientHash(WebApp.clientPrograms[archName].manifest);
  };

  WebApp.calculateClientHashRefreshable = function (archName) {
    archName = archName || WebApp.defaultArch;
    return calculateClientHash(WebApp.clientPrograms[archName].manifest, function (name) {
      return name === "css";
    });
  };

  WebApp.calculateClientHashNonRefreshable = function (archName) {
    archName = archName || WebApp.defaultArch;
    return calculateClientHash(WebApp.clientPrograms[archName].manifest, function (name) {
      return name !== "css";
    });
  };

  WebApp.calculateClientHashCordova = function () {
    var archName = 'web.cordova';
    if (!WebApp.clientPrograms[archName]) return 'none';
    return calculateClientHash(WebApp.clientPrograms[archName].manifest, null, _.pick(__meteor_runtime_config__, 'PUBLIC_SETTINGS'));
  };
}); // When we have a request pending, we want the socket timeout to be long, to
// give ourselves a while to serve it, and to allow sockjs long polls to
// complete.  On the other hand, we want to close idle sockets relatively
// quickly, so that we can shut down relatively promptly but cleanly, without
// cutting off anyone's response.

WebApp._timeoutAdjustmentRequestCallback = function (req, res) {
  // this is really just req.socket.setTimeout(LONG_SOCKET_TIMEOUT);
  req.setTimeout(LONG_SOCKET_TIMEOUT); // Insert our new finish listener to run BEFORE the existing one which removes
  // the response from the socket.

  var finishListeners = res.listeners('finish'); // XXX Apparently in Node 0.12 this event was called 'prefinish'.
  // https://github.com/joyent/node/commit/7c9b6070
  // But it has switched back to 'finish' in Node v4:
  // https://github.com/nodejs/node/pull/1411

  res.removeAllListeners('finish');
  res.on('finish', function () {
    res.setTimeout(SHORT_SOCKET_TIMEOUT);
  });

  _.each(finishListeners, function (l) {
    res.on('finish', l);
  });
}; // Will be updated by main before we listen.
// Map from client arch to boilerplate object.
// Boilerplate object has:
//   - func: XXX
//   - baseData: XXX


var boilerplateByArch = {}; // Register a callback function that can selectively modify boilerplate
// data given arguments (request, data, arch). The key should be a unique
// identifier, to prevent accumulating duplicate callbacks from the same
// call site over time. Callbacks will be called in the order they were
// registered. A callback should return false if it did not make any
// changes affecting the boilerplate. Passing null deletes the callback.
// Any previous callback registered for this key will be returned.

const boilerplateDataCallbacks = Object.create(null);

WebAppInternals.registerBoilerplateDataCallback = function (key, callback) {
  const previousCallback = boilerplateDataCallbacks[key];

  if (typeof callback === "function") {
    boilerplateDataCallbacks[key] = callback;
  } else {
    assert.strictEqual(callback, null);
    delete boilerplateDataCallbacks[key];
  } // Return the previous callback in case the new callback needs to call
  // it; for example, when the new callback is a wrapper for the old.


  return previousCallback || null;
}; // Given a request (as returned from `categorizeRequest`), return the
// boilerplate HTML to serve for that request.
//
// If a previous connect middleware has rendered content for the head or body,
// returns the boilerplate with that content patched in otherwise
// memoizes on HTML attributes (used by, eg, appcache) and whether inline
// scripts are currently allowed.
// XXX so far this function is always called with arch === 'web.browser'


function getBoilerplate(request, arch) {
  return getBoilerplateAsync(request, arch).await();
}

function getBoilerplateAsync(request, arch) {
  const boilerplate = boilerplateByArch[arch];
  const data = Object.assign({}, boilerplate.baseData, {
    htmlAttributes: getHtmlAttributes(request)
  }, _.pick(request, "dynamicHead", "dynamicBody"));
  let madeChanges = false;
  let promise = Promise.resolve();
  Object.keys(boilerplateDataCallbacks).forEach(key => {
    promise = promise.then(() => {
      const callback = boilerplateDataCallbacks[key];
      return callback(request, data, arch);
    }).then(result => {
      // Callbacks should return false if they did not make any changes.
      if (result !== false) {
        madeChanges = true;
      }
    });
  });
  return promise.then(() => ({
    stream: boilerplate.toHTMLStream(data),
    statusCode: data.statusCode,
    headers: data.headers
  }));
}

WebAppInternals.generateBoilerplateInstance = function (arch, manifest, additionalOptions) {
  additionalOptions = additionalOptions || {};

  var runtimeConfig = _.extend(_.clone(__meteor_runtime_config__), additionalOptions.runtimeConfigOverrides || {});

  return new Boilerplate(arch, manifest, _.extend({
    pathMapper(itemPath) {
      return pathJoin(archPath[arch], itemPath);
    },

    baseDataExtension: {
      additionalStaticJs: _.map(additionalStaticJs || [], function (contents, pathname) {
        return {
          pathname: pathname,
          contents: contents
        };
      }),
      // Convert to a JSON string, then get rid of most weird characters, then
      // wrap in double quotes. (The outermost JSON.stringify really ought to
      // just be "wrap in double quotes" but we use it to be safe.) This might
      // end up inside a <script> tag so we need to be careful to not include
      // "</script>", but normal {{spacebars}} escaping escapes too much! See
      // https://github.com/meteor/meteor/issues/3730
      meteorRuntimeConfig: JSON.stringify(encodeURIComponent(JSON.stringify(runtimeConfig))),
      rootUrlPathPrefix: __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '',
      bundledJsCssUrlRewriteHook: bundledJsCssUrlRewriteHook,
      inlineScriptsAllowed: WebAppInternals.inlineScriptsAllowed(),
      inline: additionalOptions.inline
    }
  }, additionalOptions));
}; // A mapping from url path to architecture (e.g. "web.browser") to static
// file information with the following fields:
// - type: the type of file to be served
// - cacheable: optionally, whether the file should be cached or not
// - sourceMapUrl: optionally, the url of the source map
//
// Info also contains one of the following:
// - content: the stringified content that should be served at this path
// - absolutePath: the absolute path on disk to the file


var staticFilesByArch; // Serve static files from the manifest or added with
// `addStaticJs`. Exported for tests.

WebAppInternals.staticFilesMiddleware = function (staticFilesByArch, req, res, next) {
  if ('GET' != req.method && 'HEAD' != req.method && 'OPTIONS' != req.method) {
    next();
    return;
  }

  var pathname = parseRequest(req).pathname;

  try {
    pathname = decodeURIComponent(pathname);
  } catch (e) {
    next();
    return;
  }

  var serveStaticJs = function (s) {
    res.writeHead(200, {
      'Content-type': 'application/javascript; charset=UTF-8'
    });
    res.write(s);
    res.end();
  };

  if (pathname === "/meteor_runtime_config.js" && !WebAppInternals.inlineScriptsAllowed()) {
    serveStaticJs("__meteor_runtime_config__ = " + JSON.stringify(__meteor_runtime_config__) + ";");
    return;
  } else if (_.has(additionalStaticJs, pathname) && !WebAppInternals.inlineScriptsAllowed()) {
    serveStaticJs(additionalStaticJs[pathname]);
    return;
  }

  const info = getStaticFileInfo(pathname, identifyBrowser(req.headers["user-agent"]));

  if (!info) {
    next();
    return;
  } // We don't need to call pause because, unlike 'static', once we call into
  // 'send' and yield to the event loop, we never call another handler with
  // 'next'.
  // Cacheable files are files that should never change. Typically
  // named by their hash (eg meteor bundled js and css files).
  // We cache them ~forever (1yr).


  const maxAge = info.cacheable ? 1000 * 60 * 60 * 24 * 365 : 0;

  if (info.cacheable) {
    // Since we use req.headers["user-agent"] to determine whether the
    // client should receive modern or legacy resources, tell the client
    // to invalidate cached resources when/if its user agent string
    // changes in the future.
    res.setHeader("Vary", "User-Agent");
  } // Set the X-SourceMap header, which current Chrome, FireFox, and Safari
  // understand.  (The SourceMap header is slightly more spec-correct but FF
  // doesn't understand it.)
  //
  // You may also need to enable source maps in Chrome: open dev tools, click
  // the gear in the bottom right corner, and select "enable source maps".


  if (info.sourceMapUrl) {
    res.setHeader('X-SourceMap', __meteor_runtime_config__.ROOT_URL_PATH_PREFIX + info.sourceMapUrl);
  }

  if (info.type === "js" || info.type === "dynamic js") {
    res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
  } else if (info.type === "css") {
    res.setHeader("Content-Type", "text/css; charset=UTF-8");
  } else if (info.type === "json") {
    res.setHeader("Content-Type", "application/json; charset=UTF-8");
  }

  if (info.hash) {
    res.setHeader('ETag', '"' + info.hash + '"');
  }

  if (info.content) {
    res.write(info.content);
    res.end();
  } else {
    send(req, info.absolutePath, {
      maxage: maxAge,
      dotfiles: 'allow',
      // if we specified a dotfile in the manifest, serve it
      lastModified: false // don't set last-modified based on the file date

    }).on('error', function (err) {
      Log.error("Error serving static file " + err);
      res.writeHead(500);
      res.end();
    }).on('directory', function () {
      Log.error("Unexpected directory " + info.absolutePath);
      res.writeHead(500);
      res.end();
    }).pipe(res);
  }
};

function getStaticFileInfo(originalPath, browser) {
  const {
    arch,
    path
  } = getArchAndPath(originalPath, browser);

  if (!hasOwn.call(WebApp.clientPrograms, arch)) {
    return null;
  } // Get a list of all available static file architectures, with arch
  // first in the list if it exists.


  const staticArchList = Object.keys(staticFilesByArch);
  const archIndex = staticArchList.indexOf(arch);

  if (archIndex > 0) {
    staticArchList.unshift(staticArchList.splice(archIndex, 1)[0]);
  }

  let info = null;
  staticArchList.some(arch => {
    const staticFiles = staticFilesByArch[arch]; // If staticFiles contains originalPath with the arch inferred above,
    // use that information.

    if (hasOwn.call(staticFiles, originalPath)) {
      return info = staticFiles[originalPath];
    } // If getArchAndPath returned an alternate path, try that instead.


    if (path !== originalPath && hasOwn.call(staticFiles, path)) {
      return info = staticFiles[path];
    }
  });
  return info;
}

function getArchAndPath(path, browser) {
  const pathParts = path.split("/");
  const archKey = pathParts[1];

  if (archKey.startsWith("__")) {
    const archCleaned = "web." + archKey.slice(2);

    if (hasOwn.call(WebApp.clientPrograms, archCleaned)) {
      pathParts.splice(1, 1); // Remove the archKey part.

      return {
        arch: archCleaned,
        path: pathParts.join("/")
      };
    }
  } // TODO Perhaps one day we could infer Cordova clients here, so that we
  // wouldn't have to use prefixed "/__cordova/..." URLs.


  const arch = isModern(browser) ? "web.browser" : "web.browser.legacy";

  if (hasOwn.call(WebApp.clientPrograms, arch)) {
    return {
      arch,
      path
    };
  }

  return {
    arch: WebApp.defaultArch,
    path
  };
} // Parse the passed in port value. Return the port as-is if it's a String
// (e.g. a Windows Server style named pipe), otherwise return the port as an
// integer.
//
// DEPRECATED: Direct use of this function is not recommended; it is no
// longer used internally, and will be removed in a future release.


WebAppInternals.parsePort = port => {
  let parsedPort = parseInt(port);

  if (Number.isNaN(parsedPort)) {
    parsedPort = port;
  }

  return parsedPort;
};

function runWebAppServer() {
  var shuttingDown = false;
  var syncQueue = new Meteor._SynchronousQueue();

  var getItemPathname = function (itemUrl) {
    return decodeURIComponent(parseUrl(itemUrl).pathname);
  };

  WebAppInternals.reloadClientPrograms = function () {
    syncQueue.runTask(function () {
      staticFilesByArch = Object.create(null);

      function generateClientProgram(clientPath, arch) {
        function addStaticFile(path, item) {
          if (!hasOwn.call(staticFilesByArch, arch)) {
            staticFilesByArch[arch] = Object.create(null);
          }

          staticFilesByArch[arch][path] = item;
        } // read the control for the client we'll be serving up


        var clientJsonPath = pathJoin(__meteor_bootstrap__.serverDir, clientPath);
        var clientDir = pathDirname(clientJsonPath);
        var clientJson = JSON.parse(readUtf8FileSync(clientJsonPath));
        if (clientJson.format !== "web-program-pre1") throw new Error("Unsupported format for client assets: " + JSON.stringify(clientJson.format));
        if (!clientJsonPath || !clientDir || !clientJson) throw new Error("Client config file not parsed.");
        var manifest = clientJson.manifest;

        _.each(manifest, function (item) {
          if (item.url && item.where === "client") {
            addStaticFile(getItemPathname(item.url), {
              absolutePath: pathJoin(clientDir, item.path),
              cacheable: item.cacheable,
              hash: item.hash,
              // Link from source to its map
              sourceMapUrl: item.sourceMapUrl,
              type: item.type
            });

            if (item.sourceMap) {
              // Serve the source map too, under the specified URL. We assume all
              // source maps are cacheable.
              addStaticFile(getItemPathname(item.sourceMapUrl), {
                absolutePath: pathJoin(clientDir, item.sourceMap),
                cacheable: true
              });
            }
          }
        });

        var program = {
          format: "web-program-pre1",
          manifest: manifest,
          version: process.env.AUTOUPDATE_VERSION || WebAppHashing.calculateClientHash(manifest, null, _.pick(__meteor_runtime_config__, "PUBLIC_SETTINGS")),
          cordovaCompatibilityVersions: clientJson.cordovaCompatibilityVersions,
          PUBLIC_SETTINGS: __meteor_runtime_config__.PUBLIC_SETTINGS
        };
        WebApp.clientPrograms[arch] = program; // Expose program details as a string reachable via the following
        // URL.

        const manifestUrlPrefix = "/__" + arch.replace(/^web\./, "");
        const manifestUrl = manifestUrlPrefix + getItemPathname("/manifest.json");
        addStaticFile(manifestUrl, {
          content: JSON.stringify(program),
          cacheable: false,
          hash: program.version,
          type: "json"
        });
      }

      try {
        var clientPaths = __meteor_bootstrap__.configJson.clientPaths;

        _.each(clientPaths, function (clientPath, arch) {
          archPath[arch] = pathDirname(clientPath);
          generateClientProgram(clientPath, arch);
        }); // Exported for tests.


        WebAppInternals.staticFilesByArch = staticFilesByArch;
      } catch (e) {
        Log.error("Error reloading the client program: " + e.stack);
        process.exit(1);
      }
    });
  };

  WebAppInternals.generateBoilerplate = function () {
    // This boilerplate will be served to the mobile devices when used with
    // Meteor/Cordova for the Hot-Code Push and since the file will be served by
    // the device's server, it is important to set the DDP url to the actual
    // Meteor server accepting DDP connections and not the device's file server.
    var defaultOptionsForArch = {
      'web.cordova': {
        runtimeConfigOverrides: {
          // XXX We use absoluteUrl() here so that we serve https://
          // URLs to cordova clients if force-ssl is in use. If we were
          // to use __meteor_runtime_config__.ROOT_URL instead of
          // absoluteUrl(), then Cordova clients would immediately get a
          // HCP setting their DDP_DEFAULT_CONNECTION_URL to
          // http://example.meteor.com. This breaks the app, because
          // force-ssl doesn't serve CORS headers on 302
          // redirects. (Plus it's undesirable to have clients
          // connecting to http://example.meteor.com when force-ssl is
          // in use.)
          DDP_DEFAULT_CONNECTION_URL: process.env.MOBILE_DDP_URL || Meteor.absoluteUrl(),
          ROOT_URL: process.env.MOBILE_ROOT_URL || Meteor.absoluteUrl()
        }
      },
      "web.browser": {
        runtimeConfigOverrides: {
          isModern: true
        }
      },
      "web.browser.legacy": {
        runtimeConfigOverrides: {
          isModern: false
        }
      }
    };
    syncQueue.runTask(function () {
      const allCss = [];

      _.each(WebApp.clientPrograms, function (program, archName) {
        boilerplateByArch[archName] = WebAppInternals.generateBoilerplateInstance(archName, program.manifest, defaultOptionsForArch[archName]);
        const cssFiles = boilerplateByArch[archName].baseData.css;
        cssFiles.forEach(file => allCss.push({
          url: bundledJsCssUrlRewriteHook(file.url)
        }));
      }); // Clear the memoized boilerplate cache.


      memoizedBoilerplate = {};
      WebAppInternals.refreshableAssets = {
        allCss
      };
    });
  };

  WebAppInternals.reloadClientPrograms(); // webserver

  var app = connect(); // Packages and apps can add handlers that run before any other Meteor
  // handlers via WebApp.rawConnectHandlers.

  var rawConnectHandlers = connect();
  app.use(rawConnectHandlers); // Auto-compress any json, javascript, or text.

  app.use(compress()); // parse cookies into an object

  app.use(cookieParser()); // We're not a proxy; reject (without crashing) attempts to treat us like
  // one. (See #1212.)

  app.use(function (req, res, next) {
    if (RoutePolicy.isValidUrl(req.url)) {
      next();
      return;
    }

    res.writeHead(400);
    res.write("Not a proxy");
    res.end();
  }); // Strip off the path prefix, if it exists.

  app.use(function (request, response, next) {
    var pathPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX;

    var url = Npm.require('url').parse(request.url);

    var pathname = url.pathname; // check if the path in the url starts with the path prefix (and the part
    // after the path prefix must start with a / if it exists.)

    if (pathPrefix && pathname.substring(0, pathPrefix.length) === pathPrefix && (pathname.length == pathPrefix.length || pathname.substring(pathPrefix.length, pathPrefix.length + 1) === "/")) {
      request.url = request.url.substring(pathPrefix.length);
      next();
    } else if (pathname === "/favicon.ico" || pathname === "/robots.txt") {
      next();
    } else if (pathPrefix) {
      response.writeHead(404);
      response.write("Unknown path");
      response.end();
    } else {
      next();
    }
  }); // Parse the query string into res.query. Used by oauth_server, but it's
  // generally pretty handy..

  app.use(query()); // Serve static files from the manifest.
  // This is inspired by the 'static' middleware.

  app.use(function (req, res, next) {
    WebAppInternals.staticFilesMiddleware(staticFilesByArch, req, res, next);
  }); // Core Meteor packages like dynamic-import can add handlers before
  // other handlers added by package and application code.

  app.use(WebAppInternals.meteorInternalHandlers = connect()); // Packages and apps can add handlers to this via WebApp.connectHandlers.
  // They are inserted before our default handler.

  var packageAndAppHandlers = connect();
  app.use(packageAndAppHandlers);
  var suppressConnectErrors = false; // connect knows it is an error handler because it has 4 arguments instead of
  // 3. go figure.  (It is not smart enough to find such a thing if it's hidden
  // inside packageAndAppHandlers.)

  app.use(function (err, req, res, next) {
    if (!err || !suppressConnectErrors || !req.headers['x-suppress-error']) {
      next(err);
      return;
    }

    res.writeHead(err.status, {
      'Content-Type': 'text/plain'
    });
    res.end("An error message");
  });
  app.use(function (req, res, next) {
    if (!appUrl(req.url)) {
      return next();
    } else {
      var headers = {
        'Content-Type': 'text/html; charset=utf-8'
      };

      if (shuttingDown) {
        headers['Connection'] = 'Close';
      }

      var request = WebApp.categorizeRequest(req);

      if (request.url.query && request.url.query['meteor_css_resource']) {
        // In this case, we're requesting a CSS resource in the meteor-specific
        // way, but we don't have it.  Serve a static css file that indicates that
        // we didn't have it, so we can detect that and refresh.  Make sure
        // that any proxies or CDNs don't cache this error!  (Normally proxies
        // or CDNs are smart enough not to cache error pages, but in order to
        // make this hack work, we need to return the CSS file as a 200, which
        // would otherwise be cached.)
        headers['Content-Type'] = 'text/css; charset=utf-8';
        headers['Cache-Control'] = 'no-cache';
        res.writeHead(200, headers);
        res.write(".meteor-css-not-found-error { width: 0px;}");
        res.end();
        return;
      }

      if (request.url.query && request.url.query['meteor_js_resource']) {
        // Similarly, we're requesting a JS resource that we don't have.
        // Serve an uncached 404. (We can't use the same hack we use for CSS,
        // because actually acting on that hack requires us to have the JS
        // already!)
        headers['Cache-Control'] = 'no-cache';
        res.writeHead(404, headers);
        res.end("404 Not Found");
        return;
      }

      if (request.url.query && request.url.query['meteor_dont_serve_index']) {
        // When downloading files during a Cordova hot code push, we need
        // to detect if a file is not available instead of inadvertently
        // downloading the default index page.
        // So similar to the situation above, we serve an uncached 404.
        headers['Cache-Control'] = 'no-cache';
        res.writeHead(404, headers);
        res.end("404 Not Found");
        return;
      }

      return getBoilerplateAsync(request, getArchAndPath(parseRequest(req).pathname, request.browser).arch).then(({
        stream,
        statusCode,
        headers: newHeaders
      }) => {
        if (!statusCode) {
          statusCode = res.statusCode ? res.statusCode : 200;
        }

        if (newHeaders) {
          Object.assign(headers, newHeaders);
        }

        res.writeHead(statusCode, headers);
        stream.pipe(res, {
          // End the response when the stream ends.
          end: true
        });
      }).catch(error => {
        Log.error("Error running template: " + error.stack);
        res.writeHead(500, headers);
        res.end();
      });
    }
  }); // Return 404 by default, if no other handlers serve this URL.

  app.use(function (req, res) {
    res.writeHead(404);
    res.end();
  });
  var httpServer = createServer(app);
  var onListeningCallbacks = []; // After 5 seconds w/o data on a socket, kill it.  On the other hand, if
  // there's an outstanding request, give it a higher timeout instead (to avoid
  // killing long-polling requests)

  httpServer.setTimeout(SHORT_SOCKET_TIMEOUT); // Do this here, and then also in livedata/stream_server.js, because
  // stream_server.js kills all the current request handlers when installing its
  // own.

  httpServer.on('request', WebApp._timeoutAdjustmentRequestCallback); // If the client gave us a bad request, tell it instead of just closing the
  // socket. This lets load balancers in front of us differentiate between "a
  // server is randomly closing sockets for no reason" and "client sent a bad
  // request".
  //
  // This will only work on Node 6; Node 4 destroys the socket before calling
  // this event. See https://github.com/nodejs/node/pull/4557/ for details.

  httpServer.on('clientError', (err, socket) => {
    // Pre-Node-6, do nothing.
    if (socket.destroyed) {
      return;
    }

    if (err.message === 'Parse Error') {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    } else {
      // For other errors, use the default behavior as if we had no clientError
      // handler.
      socket.destroy(err);
    }
  }); // start up app

  _.extend(WebApp, {
    connectHandlers: packageAndAppHandlers,
    rawConnectHandlers: rawConnectHandlers,
    httpServer: httpServer,
    connectApp: app,
    // For testing.
    suppressConnectErrors: function () {
      suppressConnectErrors = true;
    },
    onListening: function (f) {
      if (onListeningCallbacks) onListeningCallbacks.push(f);else f();
    },
    // This can be overridden by users who want to modify how listening works
    // (eg, to run a proxy like Apollo Engine Proxy in front of the server).
    startListening: function (httpServer, listenOptions, cb) {
      httpServer.listen(listenOptions, cb);
    }
  }); // Let the rest of the packages (and Meteor.startup hooks) insert connect
  // middlewares and update __meteor_runtime_config__, then keep going to set up
  // actually serving HTML.


  exports.main = argv => {
    WebAppInternals.generateBoilerplate();

    const startHttpServer = listenOptions => {
      WebApp.startListening(httpServer, listenOptions, Meteor.bindEnvironment(() => {
        if (process.env.METEOR_PRINT_ON_LISTEN) {
          console.log("LISTENING");
        }

        const callbacks = onListeningCallbacks;
        onListeningCallbacks = null;
        callbacks.forEach(callback => {
          callback();
        });
      }, e => {
        console.error("Error listening:", e);
        console.error(e && e.stack);
      }));
    };

    let localPort = process.env.PORT || 0;
    const unixSocketPath = process.env.UNIX_SOCKET_PATH;

    if (unixSocketPath) {
      // Start the HTTP server using a socket file.
      removeExistingSocketFile(unixSocketPath);
      startHttpServer({
        path: unixSocketPath
      });
      registerSocketFileCleanup(unixSocketPath);
    } else {
      localPort = isNaN(Number(localPort)) ? localPort : Number(localPort);

      if (/\\\\?.+\\pipe\\?.+/.test(localPort)) {
        // Start the HTTP server using Windows Server style named pipe.
        startHttpServer({
          path: localPort
        });
      } else if (typeof localPort === "number") {
        // Start the HTTP server using TCP.
        startHttpServer({
          port: localPort,
          host: process.env.BIND_IP || "0.0.0.0"
        });
      } else {
        throw new Error("Invalid PORT specified");
      }
    }

    return "DAEMON";
  };
}

runWebAppServer();
var inlineScriptsAllowed = true;

WebAppInternals.inlineScriptsAllowed = function () {
  return inlineScriptsAllowed;
};

WebAppInternals.setInlineScriptsAllowed = function (value) {
  inlineScriptsAllowed = value;
  WebAppInternals.generateBoilerplate();
};

WebAppInternals.setBundledJsCssUrlRewriteHook = function (hookFn) {
  bundledJsCssUrlRewriteHook = hookFn;
  WebAppInternals.generateBoilerplate();
};

WebAppInternals.setBundledJsCssPrefix = function (prefix) {
  var self = this;
  self.setBundledJsCssUrlRewriteHook(function (url) {
    return prefix + url;
  });
}; // Packages can call `WebAppInternals.addStaticJs` to specify static
// JavaScript to be included in the app. This static JS will be inlined,
// unless inline scripts have been disabled, in which case it will be
// served under `/<sha1 of contents>`.


var additionalStaticJs = {};

WebAppInternals.addStaticJs = function (contents) {
  additionalStaticJs["/" + sha1(contents) + ".js"] = contents;
}; // Exported for tests


WebAppInternals.getBoilerplate = getBoilerplate;
WebAppInternals.additionalStaticJs = additionalStaticJs;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"connect.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/webapp/connect.js                                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  connect: () => connect
});
let npmConnect;
module.watch(require("connect"), {
  default(v) {
    npmConnect = v;
  }

}, 0);

function connect(...connectArgs) {
  const handlers = npmConnect.apply(this, connectArgs);
  const originalUse = handlers.use; // Wrap the handlers.use method so that any provided handler functions
  // alway run in a Fiber.

  handlers.use = function use(...useArgs) {
    const {
      stack
    } = this;
    const originalLength = stack.length;
    const result = originalUse.apply(this, useArgs); // If we just added anything to the stack, wrap each new entry.handle
    // with a function that calls Promise.asyncApply to ensure the
    // original handler runs in a Fiber.

    for (let i = originalLength; i < stack.length; ++i) {
      const entry = stack[i];
      const originalHandle = entry.handle;

      if (originalHandle.length >= 4) {
        // If the original handle had four (or more) parameters, the
        // wrapper must also have four parameters, since connect uses
        // handle.length to dermine whether to pass the error as the first
        // argument to the handle function.
        entry.handle = function handle(err, req, res, next) {
          return Promise.asyncApply(originalHandle, this, arguments);
        };
      } else {
        entry.handle = function handle(req, res, next) {
          return Promise.asyncApply(originalHandle, this, arguments);
        };
      }
    }

    return result;
  };

  return handlers;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"socket_file.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/webapp/socket_file.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  removeExistingSocketFile: () => removeExistingSocketFile,
  registerSocketFileCleanup: () => registerSocketFileCleanup
});
let statSync, unlinkSync, existsSync;
module.watch(require("fs"), {
  statSync(v) {
    statSync = v;
  },

  unlinkSync(v) {
    unlinkSync = v;
  },

  existsSync(v) {
    existsSync = v;
  }

}, 0);

const removeExistingSocketFile = socketPath => {
  try {
    if (statSync(socketPath).isSocket()) {
      // Since a new socket file will be created, remove the existing
      // file.
      unlinkSync(socketPath);
    } else {
      throw new Error(`An existing file was found at "${socketPath}" and it is not ` + 'a socket file. Please confirm PORT is pointing to valid and ' + 'un-used socket file path.');
    }
  } catch (error) {
    // If there is no existing socket file to cleanup, great, we'll
    // continue normally. If the caught exception represents any other
    // issue, re-throw.
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

const registerSocketFileCleanup = (socketPath, eventEmitter = process) => {
  ['exit', 'SIGINT', 'SIGHUP', 'SIGTERM'].forEach(signal => {
    eventEmitter.on(signal, Meteor.bindEnvironment(() => {
      if (existsSync(socketPath)) {
        unlinkSync(socketPath);
      }
    }));
  });
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"connect":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/connect/package.json                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "connect";
exports.version = "3.6.5";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/connect/index.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"compression":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/compression/package.json                                                    //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "compression";
exports.version = "1.7.1";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/compression/index.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"cookie-parser":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/cookie-parser/package.json                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "cookie-parser";
exports.version = "1.4.3";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/cookie-parser/index.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"qs-middleware":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/qs-middleware/package.json                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "qs-middleware";
exports.version = "1.0.3";
exports.main = "./lib/qs-middleware.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"qs-middleware.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/qs-middleware/lib/qs-middleware.js                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"parseurl":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/parseurl/package.json                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "parseurl";
exports.version = "1.3.2";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/parseurl/index.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"basic-auth-connect":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/basic-auth-connect/package.json                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "basic-auth-connect";
exports.version = "1.0.0";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/basic-auth-connect/index.js                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"useragent":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/useragent/package.json                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "useragent";
exports.version = "2.2.1";
exports.main = "./index.js";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/useragent/index.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"send":{"package.json":function(require,exports){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/send/package.json                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
exports.name = "send";
exports.version = "0.16.1";

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// node_modules/meteor/webapp/node_modules/send/index.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.useNode();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/webapp/webapp_server.js");

/* Exports */
Package._define("webapp", exports, {
  WebApp: WebApp,
  WebAppInternals: WebAppInternals,
  main: main
});

})();

//# sourceURL=meteor://💻app/packages/webapp.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvd2ViYXBwL3dlYmFwcF9zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3dlYmFwcC9jb25uZWN0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy93ZWJhcHAvc29ja2V0X2ZpbGUuanMiXSwibmFtZXMiOlsibW9kdWxlMSIsIm1vZHVsZSIsImV4cG9ydCIsIldlYkFwcCIsIldlYkFwcEludGVybmFscyIsImFzc2VydCIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwicmVhZEZpbGUiLCJjcmVhdGVTZXJ2ZXIiLCJwYXRoSm9pbiIsInBhdGhEaXJuYW1lIiwiam9pbiIsImRpcm5hbWUiLCJwYXJzZVVybCIsInBhcnNlIiwiY3JlYXRlSGFzaCIsImNvbm5lY3QiLCJjb21wcmVzcyIsImNvb2tpZVBhcnNlciIsInF1ZXJ5IiwicGFyc2VSZXF1ZXN0IiwiYmFzaWNBdXRoIiwibG9va3VwVXNlckFnZW50IiwibG9va3VwIiwiaXNNb2Rlcm4iLCJzZW5kIiwicmVtb3ZlRXhpc3RpbmdTb2NrZXRGaWxlIiwicmVnaXN0ZXJTb2NrZXRGaWxlQ2xlYW51cCIsIlNIT1JUX1NPQ0tFVF9USU1FT1VUIiwiTE9OR19TT0NLRVRfVElNRU9VVCIsImhhc093biIsIk9iamVjdCIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiTnBtTW9kdWxlcyIsInZlcnNpb24iLCJOcG0iLCJkZWZhdWx0QXJjaCIsImNsaWVudFByb2dyYW1zIiwiYXJjaFBhdGgiLCJidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayIsInVybCIsImJ1bmRsZWRQcmVmaXgiLCJfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIiwiUk9PVF9VUkxfUEFUSF9QUkVGSVgiLCJzaGExIiwiY29udGVudHMiLCJoYXNoIiwidXBkYXRlIiwiZGlnZXN0IiwicmVhZFV0ZjhGaWxlU3luYyIsImZpbGVuYW1lIiwiTWV0ZW9yIiwid3JhcEFzeW5jIiwiY2FtZWxDYXNlIiwibmFtZSIsInBhcnRzIiwic3BsaXQiLCJ0b0xvd2VyQ2FzZSIsImkiLCJsZW5ndGgiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInN1YnN0ciIsImlkZW50aWZ5QnJvd3NlciIsInVzZXJBZ2VudFN0cmluZyIsInVzZXJBZ2VudCIsImZhbWlseSIsIm1ham9yIiwibWlub3IiLCJwYXRjaCIsImNhdGVnb3JpemVSZXF1ZXN0IiwicmVxIiwiXyIsImV4dGVuZCIsImJyb3dzZXIiLCJoZWFkZXJzIiwicGljayIsImh0bWxBdHRyaWJ1dGVIb29rcyIsImdldEh0bWxBdHRyaWJ1dGVzIiwicmVxdWVzdCIsImNvbWJpbmVkQXR0cmlidXRlcyIsImVhY2giLCJob29rIiwiYXR0cmlidXRlcyIsIkVycm9yIiwiYWRkSHRtbEF0dHJpYnV0ZUhvb2siLCJwdXNoIiwiYXBwVXJsIiwiUm91dGVQb2xpY3kiLCJjbGFzc2lmeSIsInN0YXJ0dXAiLCJjYWxjdWxhdGVDbGllbnRIYXNoIiwiV2ViQXBwSGFzaGluZyIsImNsaWVudEhhc2giLCJhcmNoTmFtZSIsIm1hbmlmZXN0IiwiY2FsY3VsYXRlQ2xpZW50SGFzaFJlZnJlc2hhYmxlIiwiY2FsY3VsYXRlQ2xpZW50SGFzaE5vblJlZnJlc2hhYmxlIiwiY2FsY3VsYXRlQ2xpZW50SGFzaENvcmRvdmEiLCJfdGltZW91dEFkanVzdG1lbnRSZXF1ZXN0Q2FsbGJhY2siLCJyZXMiLCJzZXRUaW1lb3V0IiwiZmluaXNoTGlzdGVuZXJzIiwibGlzdGVuZXJzIiwicmVtb3ZlQWxsTGlzdGVuZXJzIiwib24iLCJsIiwiYm9pbGVycGxhdGVCeUFyY2giLCJib2lsZXJwbGF0ZURhdGFDYWxsYmFja3MiLCJjcmVhdGUiLCJyZWdpc3RlckJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrIiwia2V5IiwiY2FsbGJhY2siLCJwcmV2aW91c0NhbGxiYWNrIiwic3RyaWN0RXF1YWwiLCJnZXRCb2lsZXJwbGF0ZSIsImFyY2giLCJnZXRCb2lsZXJwbGF0ZUFzeW5jIiwiYXdhaXQiLCJib2lsZXJwbGF0ZSIsImRhdGEiLCJhc3NpZ24iLCJiYXNlRGF0YSIsImh0bWxBdHRyaWJ1dGVzIiwibWFkZUNoYW5nZXMiLCJwcm9taXNlIiwiUHJvbWlzZSIsInJlc29sdmUiLCJrZXlzIiwiZm9yRWFjaCIsInRoZW4iLCJyZXN1bHQiLCJzdHJlYW0iLCJ0b0hUTUxTdHJlYW0iLCJzdGF0dXNDb2RlIiwiZ2VuZXJhdGVCb2lsZXJwbGF0ZUluc3RhbmNlIiwiYWRkaXRpb25hbE9wdGlvbnMiLCJydW50aW1lQ29uZmlnIiwiY2xvbmUiLCJydW50aW1lQ29uZmlnT3ZlcnJpZGVzIiwiQm9pbGVycGxhdGUiLCJwYXRoTWFwcGVyIiwiaXRlbVBhdGgiLCJiYXNlRGF0YUV4dGVuc2lvbiIsImFkZGl0aW9uYWxTdGF0aWNKcyIsIm1hcCIsInBhdGhuYW1lIiwibWV0ZW9yUnVudGltZUNvbmZpZyIsIkpTT04iLCJzdHJpbmdpZnkiLCJlbmNvZGVVUklDb21wb25lbnQiLCJyb290VXJsUGF0aFByZWZpeCIsImlubGluZVNjcmlwdHNBbGxvd2VkIiwiaW5saW5lIiwic3RhdGljRmlsZXNCeUFyY2giLCJzdGF0aWNGaWxlc01pZGRsZXdhcmUiLCJuZXh0IiwibWV0aG9kIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiZSIsInNlcnZlU3RhdGljSnMiLCJzIiwid3JpdGVIZWFkIiwid3JpdGUiLCJlbmQiLCJoYXMiLCJpbmZvIiwiZ2V0U3RhdGljRmlsZUluZm8iLCJtYXhBZ2UiLCJjYWNoZWFibGUiLCJzZXRIZWFkZXIiLCJzb3VyY2VNYXBVcmwiLCJ0eXBlIiwiY29udGVudCIsImFic29sdXRlUGF0aCIsIm1heGFnZSIsImRvdGZpbGVzIiwibGFzdE1vZGlmaWVkIiwiZXJyIiwiTG9nIiwiZXJyb3IiLCJwaXBlIiwib3JpZ2luYWxQYXRoIiwicGF0aCIsImdldEFyY2hBbmRQYXRoIiwiY2FsbCIsInN0YXRpY0FyY2hMaXN0IiwiYXJjaEluZGV4IiwiaW5kZXhPZiIsInVuc2hpZnQiLCJzcGxpY2UiLCJzb21lIiwic3RhdGljRmlsZXMiLCJwYXRoUGFydHMiLCJhcmNoS2V5Iiwic3RhcnRzV2l0aCIsImFyY2hDbGVhbmVkIiwic2xpY2UiLCJwYXJzZVBvcnQiLCJwb3J0IiwicGFyc2VkUG9ydCIsInBhcnNlSW50IiwiTnVtYmVyIiwiaXNOYU4iLCJydW5XZWJBcHBTZXJ2ZXIiLCJzaHV0dGluZ0Rvd24iLCJzeW5jUXVldWUiLCJfU3luY2hyb25vdXNRdWV1ZSIsImdldEl0ZW1QYXRobmFtZSIsIml0ZW1VcmwiLCJyZWxvYWRDbGllbnRQcm9ncmFtcyIsInJ1blRhc2siLCJnZW5lcmF0ZUNsaWVudFByb2dyYW0iLCJjbGllbnRQYXRoIiwiYWRkU3RhdGljRmlsZSIsIml0ZW0iLCJjbGllbnRKc29uUGF0aCIsIl9fbWV0ZW9yX2Jvb3RzdHJhcF9fIiwic2VydmVyRGlyIiwiY2xpZW50RGlyIiwiY2xpZW50SnNvbiIsImZvcm1hdCIsIndoZXJlIiwic291cmNlTWFwIiwicHJvZ3JhbSIsInByb2Nlc3MiLCJlbnYiLCJBVVRPVVBEQVRFX1ZFUlNJT04iLCJjb3Jkb3ZhQ29tcGF0aWJpbGl0eVZlcnNpb25zIiwiUFVCTElDX1NFVFRJTkdTIiwibWFuaWZlc3RVcmxQcmVmaXgiLCJyZXBsYWNlIiwibWFuaWZlc3RVcmwiLCJjbGllbnRQYXRocyIsImNvbmZpZ0pzb24iLCJzdGFjayIsImV4aXQiLCJnZW5lcmF0ZUJvaWxlcnBsYXRlIiwiZGVmYXVsdE9wdGlvbnNGb3JBcmNoIiwiRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkwiLCJNT0JJTEVfRERQX1VSTCIsImFic29sdXRlVXJsIiwiUk9PVF9VUkwiLCJNT0JJTEVfUk9PVF9VUkwiLCJhbGxDc3MiLCJjc3NGaWxlcyIsImNzcyIsImZpbGUiLCJtZW1vaXplZEJvaWxlcnBsYXRlIiwicmVmcmVzaGFibGVBc3NldHMiLCJhcHAiLCJyYXdDb25uZWN0SGFuZGxlcnMiLCJ1c2UiLCJpc1ZhbGlkVXJsIiwicmVzcG9uc2UiLCJwYXRoUHJlZml4Iiwic3Vic3RyaW5nIiwibWV0ZW9ySW50ZXJuYWxIYW5kbGVycyIsInBhY2thZ2VBbmRBcHBIYW5kbGVycyIsInN1cHByZXNzQ29ubmVjdEVycm9ycyIsInN0YXR1cyIsIm5ld0hlYWRlcnMiLCJjYXRjaCIsImh0dHBTZXJ2ZXIiLCJvbkxpc3RlbmluZ0NhbGxiYWNrcyIsInNvY2tldCIsImRlc3Ryb3llZCIsIm1lc3NhZ2UiLCJkZXN0cm95IiwiY29ubmVjdEhhbmRsZXJzIiwiY29ubmVjdEFwcCIsIm9uTGlzdGVuaW5nIiwiZiIsInN0YXJ0TGlzdGVuaW5nIiwibGlzdGVuT3B0aW9ucyIsImNiIiwibGlzdGVuIiwiZXhwb3J0cyIsIm1haW4iLCJhcmd2Iiwic3RhcnRIdHRwU2VydmVyIiwiYmluZEVudmlyb25tZW50IiwiTUVURU9SX1BSSU5UX09OX0xJU1RFTiIsImNvbnNvbGUiLCJsb2ciLCJjYWxsYmFja3MiLCJsb2NhbFBvcnQiLCJQT1JUIiwidW5peFNvY2tldFBhdGgiLCJVTklYX1NPQ0tFVF9QQVRIIiwidGVzdCIsImhvc3QiLCJCSU5EX0lQIiwic2V0SW5saW5lU2NyaXB0c0FsbG93ZWQiLCJ2YWx1ZSIsInNldEJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rIiwiaG9va0ZuIiwic2V0QnVuZGxlZEpzQ3NzUHJlZml4IiwicHJlZml4Iiwic2VsZiIsImFkZFN0YXRpY0pzIiwibnBtQ29ubmVjdCIsImNvbm5lY3RBcmdzIiwiaGFuZGxlcnMiLCJhcHBseSIsIm9yaWdpbmFsVXNlIiwidXNlQXJncyIsIm9yaWdpbmFsTGVuZ3RoIiwiZW50cnkiLCJvcmlnaW5hbEhhbmRsZSIsImhhbmRsZSIsImFzeW5jQXBwbHkiLCJhcmd1bWVudHMiLCJzdGF0U3luYyIsInVubGlua1N5bmMiLCJleGlzdHNTeW5jIiwic29ja2V0UGF0aCIsImlzU29ja2V0IiwiY29kZSIsImV2ZW50RW1pdHRlciIsInNpZ25hbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsTUFBTUEsVUFBUUMsTUFB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RDtBQUNGLEdBWkQsQ0FZRSxPQUFPeEksS0FBUCxFQUFjO0FBQ2Q7QUFDQTtBQUNBO0FBQ0EsUUFBSUEsTUFBTTBJLElBQU4sS0FBZSxRQUFuQixFQUE2QjtBQUMzQixZQUFNMUksS0FBTjtBQUNEO0FBQ0Y7QUFDRixDQXJCTTs7QUEwQkEsTUFBTTFKLDRCQUNYLENBQUNrUyxVQUFELEVBQWFHLGVBQWU5RixPQUE1QixLQUF3QztBQUN0QyxHQUFDLE1BQUQsRUFBUyxRQUFULEVBQW1CLFFBQW5CLEVBQTZCLFNBQTdCLEVBQXdDaEcsT0FBeEMsQ0FBZ0QrTCxVQUFVO0FBQ3hERCxpQkFBYXROLEVBQWIsQ0FBZ0J1TixNQUFoQixFQUF3QjdRLE9BQU9zTyxlQUFQLENBQXVCLE1BQU07QUFDbkQsVUFBSWtDLFdBQVdDLFVBQVgsQ0FBSixFQUE0QjtBQUMxQkYsbUJBQVdFLFVBQVg7QUFDRDtBQUNGLEtBSnVCLENBQXhCO0FBS0QsR0FORDtBQU9ELENBVEksQyIsImZpbGUiOiIvcGFja2FnZXMvd2ViYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFzc2VydCBmcm9tIFwiYXNzZXJ0XCI7XG5pbXBvcnQgeyByZWFkRmlsZSB9IGZyb20gXCJmc1wiO1xuaW1wb3J0IHsgY3JlYXRlU2VydmVyIH0gZnJvbSBcImh0dHBcIjtcbmltcG9ydCB7XG4gIGpvaW4gYXMgcGF0aEpvaW4sXG4gIGRpcm5hbWUgYXMgcGF0aERpcm5hbWUsXG59IGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBwYXJzZSBhcyBwYXJzZVVybCB9IGZyb20gXCJ1cmxcIjtcbmltcG9ydCB7IGNyZWF0ZUhhc2ggfSBmcm9tIFwiY3J5cHRvXCI7XG5pbXBvcnQgeyBjb25uZWN0IH0gZnJvbSBcIi4vY29ubmVjdC5qc1wiO1xuaW1wb3J0IGNvbXByZXNzIGZyb20gXCJjb21wcmVzc2lvblwiO1xuaW1wb3J0IGNvb2tpZVBhcnNlciBmcm9tIFwiY29va2llLXBhcnNlclwiO1xuaW1wb3J0IHF1ZXJ5IGZyb20gXCJxcy1taWRkbGV3YXJlXCI7XG5pbXBvcnQgcGFyc2VSZXF1ZXN0IGZyb20gXCJwYXJzZXVybFwiO1xuaW1wb3J0IGJhc2ljQXV0aCBmcm9tIFwiYmFzaWMtYXV0aC1jb25uZWN0XCI7XG5pbXBvcnQgeyBsb29rdXAgYXMgbG9va3VwVXNlckFnZW50IH0gZnJvbSBcInVzZXJhZ2VudFwiO1xuaW1wb3J0IHsgaXNNb2Rlcm4gfSBmcm9tIFwibWV0ZW9yL21vZGVybi1icm93c2Vyc1wiO1xuaW1wb3J0IHNlbmQgZnJvbSBcInNlbmRcIjtcbmltcG9ydCB7XG4gIHJlbW92ZUV4aXN0aW5nU29ja2V0RmlsZSxcbiAgcmVnaXN0ZXJTb2NrZXRGaWxlQ2xlYW51cCxcbn0gZnJvbSAnLi9zb2NrZXRfZmlsZS5qcyc7XG5cbnZhciBTSE9SVF9TT0NLRVRfVElNRU9VVCA9IDUqMTAwMDtcbnZhciBMT05HX1NPQ0tFVF9USU1FT1VUID0gMTIwKjEwMDA7XG5cbmV4cG9ydCBjb25zdCBXZWJBcHAgPSB7fTtcbmV4cG9ydCBjb25zdCBXZWJBcHBJbnRlcm5hbHMgPSB7fTtcblxuY29uc3QgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLy8gYmFja3dhcmRzIGNvbXBhdCB0byAyLjAgb2YgY29ubmVjdFxuY29ubmVjdC5iYXNpY0F1dGggPSBiYXNpY0F1dGg7XG5cbldlYkFwcEludGVybmFscy5OcG1Nb2R1bGVzID0ge1xuICBjb25uZWN0OiB7XG4gICAgdmVyc2lvbjogTnBtLnJlcXVpcmUoJ2Nvbm5lY3QvcGFja2FnZS5qc29uJykudmVyc2lvbixcbiAgICBtb2R1bGU6IGNvbm5lY3QsXG4gIH1cbn07XG5cbi8vIFRob3VnaCB3ZSBtaWdodCBwcmVmZXIgdG8gdXNlIHdlYi5icm93c2VyIChtb2Rlcm4pIGFzIHRoZSBkZWZhdWx0XG4vLyBhcmNoaXRlY3R1cmUsIHNhZmV0eSByZXF1aXJlcyBhIG1vcmUgY29tcGF0aWJsZSBkZWZhdWx0QXJjaC5cbldlYkFwcC5kZWZhdWx0QXJjaCA9ICd3ZWIuYnJvd3Nlci5sZWdhY3knO1xuXG4vLyBYWFggbWFwcyBhcmNocyB0byBtYW5pZmVzdHNcbldlYkFwcC5jbGllbnRQcm9ncmFtcyA9IHt9O1xuXG4vLyBYWFggbWFwcyBhcmNocyB0byBwcm9ncmFtIHBhdGggb24gZmlsZXN5c3RlbVxudmFyIGFyY2hQYXRoID0ge307XG5cbnZhciBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayA9IGZ1bmN0aW9uICh1cmwpIHtcbiAgdmFyIGJ1bmRsZWRQcmVmaXggPVxuICAgICBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYIHx8ICcnO1xuICByZXR1cm4gYnVuZGxlZFByZWZpeCArIHVybDtcbn07XG5cbnZhciBzaGExID0gZnVuY3Rpb24gKGNvbnRlbnRzKSB7XG4gIHZhciBoYXNoID0gY3JlYXRlSGFzaCgnc2hhMScpO1xuICBoYXNoLnVwZGF0ZShjb250ZW50cyk7XG4gIHJldHVybiBoYXNoLmRpZ2VzdCgnaGV4Jyk7XG59O1xuXG52YXIgcmVhZFV0ZjhGaWxlU3luYyA9IGZ1bmN0aW9uIChmaWxlbmFtZSkge1xuICByZXR1cm4gTWV0ZW9yLndyYXBBc3luYyhyZWFkRmlsZSkoZmlsZW5hbWUsICd1dGY4Jyk7XG59O1xuXG4vLyAjQnJvd3NlcklkZW50aWZpY2F0aW9uXG4vL1xuLy8gV2UgaGF2ZSBtdWx0aXBsZSBwbGFjZXMgdGhhdCB3YW50IHRvIGlkZW50aWZ5IHRoZSBicm93c2VyOiB0aGVcbi8vIHVuc3VwcG9ydGVkIGJyb3dzZXIgcGFnZSwgdGhlIGFwcGNhY2hlIHBhY2thZ2UsIGFuZCwgZXZlbnR1YWxseVxuLy8gZGVsaXZlcmluZyBicm93c2VyIHBvbHlmaWxscyBvbmx5IGFzIG5lZWRlZC5cbi8vXG4vLyBUbyBhdm9pZCBkZXRlY3RpbmcgdGhlIGJyb3dzZXIgaW4gbXVsdGlwbGUgcGxhY2VzIGFkLWhvYywgd2UgY3JlYXRlIGFcbi8vIE1ldGVvciBcImJyb3dzZXJcIiBvYmplY3QuIEl0IHVzZXMgYnV0IGRvZXMgbm90IGV4cG9zZSB0aGUgbnBtXG4vLyB1c2VyYWdlbnQgbW9kdWxlICh3ZSBjb3VsZCBjaG9vc2UgYSBkaWZmZXJlbnQgbWVjaGFuaXNtIHRvIGlkZW50aWZ5XG4vLyB0aGUgYnJvd3NlciBpbiB0aGUgZnV0dXJlIGlmIHdlIHdhbnRlZCB0bykuICBUaGUgYnJvd3NlciBvYmplY3Rcbi8vIGNvbnRhaW5zXG4vL1xuLy8gKiBgbmFtZWA6IHRoZSBuYW1lIG9mIHRoZSBicm93c2VyIGluIGNhbWVsIGNhc2Vcbi8vICogYG1ham9yYCwgYG1pbm9yYCwgYHBhdGNoYDogaW50ZWdlcnMgZGVzY3JpYmluZyB0aGUgYnJvd3NlciB2ZXJzaW9uXG4vL1xuLy8gQWxzbyBoZXJlIGlzIGFuIGVhcmx5IHZlcnNpb24gb2YgYSBNZXRlb3IgYHJlcXVlc3RgIG9iamVjdCwgaW50ZW5kZWRcbi8vIHRvIGJlIGEgaGlnaC1sZXZlbCBkZXNjcmlwdGlvbiBvZiB0aGUgcmVxdWVzdCB3aXRob3V0IGV4cG9zaW5nXG4vLyBkZXRhaWxzIG9mIGNvbm5lY3QncyBsb3ctbGV2ZWwgYHJlcWAuICBDdXJyZW50bHkgaXQgY29udGFpbnM6XG4vL1xuLy8gKiBgYnJvd3NlcmA6IGJyb3dzZXIgaWRlbnRpZmljYXRpb24gb2JqZWN0IGRlc2NyaWJlZCBhYm92ZVxuLy8gKiBgdXJsYDogcGFyc2VkIHVybCwgaW5jbHVkaW5nIHBhcnNlZCBxdWVyeSBwYXJhbXNcbi8vXG4vLyBBcyBhIHRlbXBvcmFyeSBoYWNrIHRoZXJlIGlzIGEgYGNhdGVnb3JpemVSZXF1ZXN0YCBmdW5jdGlvbiBvbiBXZWJBcHAgd2hpY2hcbi8vIGNvbnZlcnRzIGEgY29ubmVjdCBgcmVxYCB0byBhIE1ldGVvciBgcmVxdWVzdGAuIFRoaXMgY2FuIGdvIGF3YXkgb25jZSBzbWFydFxuLy8gcGFja2FnZXMgc3VjaCBhcyBhcHBjYWNoZSBhcmUgYmVpbmcgcGFzc2VkIGEgYHJlcXVlc3RgIG9iamVjdCBkaXJlY3RseSB3aGVuXG4vLyB0aGV5IHNlcnZlIGNvbnRlbnQuXG4vL1xuLy8gVGhpcyBhbGxvd3MgYHJlcXVlc3RgIHRvIGJlIHVzZWQgdW5pZm9ybWx5OiBpdCBpcyBwYXNzZWQgdG8gdGhlIGh0bWxcbi8vIGF0dHJpYnV0ZXMgaG9vaywgYW5kIHRoZSBhcHBjYWNoZSBwYWNrYWdlIGNhbiB1c2UgaXQgd2hlbiBkZWNpZGluZ1xuLy8gd2hldGhlciB0byBnZW5lcmF0ZSBhIDQwNCBmb3IgdGhlIG1hbmlmZXN0LlxuLy9cbi8vIFJlYWwgcm91dGluZyAvIHNlcnZlciBzaWRlIHJlbmRlcmluZyB3aWxsIHByb2JhYmx5IHJlZmFjdG9yIHRoaXNcbi8vIGhlYXZpbHkuXG5cblxuLy8gZS5nLiBcIk1vYmlsZSBTYWZhcmlcIiA9PiBcIm1vYmlsZVNhZmFyaVwiXG52YXIgY2FtZWxDYXNlID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgdmFyIHBhcnRzID0gbmFtZS5zcGxpdCgnICcpO1xuICBwYXJ0c1swXSA9IHBhcnRzWzBdLnRvTG93ZXJDYXNlKCk7XG4gIGZvciAodmFyIGkgPSAxOyAgaSA8IHBhcnRzLmxlbmd0aDsgICsraSkge1xuICAgIHBhcnRzW2ldID0gcGFydHNbaV0uY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBwYXJ0c1tpXS5zdWJzdHIoMSk7XG4gIH1cbiAgcmV0dXJuIHBhcnRzLmpvaW4oJycpO1xufTtcblxudmFyIGlkZW50aWZ5QnJvd3NlciA9IGZ1bmN0aW9uICh1c2VyQWdlbnRTdHJpbmcpIHtcbiAgdmFyIHVzZXJBZ2VudCA9IGxvb2t1cFVzZXJBZ2VudCh1c2VyQWdlbnRTdHJpbmcpO1xuICByZXR1cm4ge1xuICAgIG5hbWU6IGNhbWVsQ2FzZSh1c2VyQWdlbnQuZmFtaWx5KSxcbiAgICBtYWpvcjogK3VzZXJBZ2VudC5tYWpvcixcbiAgICBtaW5vcjogK3VzZXJBZ2VudC5taW5vcixcbiAgICBwYXRjaDogK3VzZXJBZ2VudC5wYXRjaFxuICB9O1xufTtcblxuLy8gWFhYIFJlZmFjdG9yIGFzIHBhcnQgb2YgaW1wbGVtZW50aW5nIHJlYWwgcm91dGluZy5cbldlYkFwcEludGVybmFscy5pZGVudGlmeUJyb3dzZXIgPSBpZGVudGlmeUJyb3dzZXI7XG5cbldlYkFwcC5jYXRlZ29yaXplUmVxdWVzdCA9IGZ1bmN0aW9uIChyZXEpIHtcbiAgcmV0dXJuIF8uZXh0ZW5kKHtcbiAgICBicm93c2VyOiBpZGVudGlmeUJyb3dzZXIocmVxLmhlYWRlcnNbJ3VzZXItYWdlbnQnXSksXG4gICAgdXJsOiBwYXJzZVVybChyZXEudXJsLCB0cnVlKVxuICB9LCBfLnBpY2socmVxLCAnZHluYW1pY0hlYWQnLCAnZHluYW1pY0JvZHknLCAnaGVhZGVycycsICdjb29raWVzJykpO1xufTtcblxuLy8gSFRNTCBhdHRyaWJ1dGUgaG9va3M6IGZ1bmN0aW9ucyB0byBiZSBjYWxsZWQgdG8gZGV0ZXJtaW5lIGFueSBhdHRyaWJ1dGVzIHRvXG4vLyBiZSBhZGRlZCB0byB0aGUgJzxodG1sPicgdGFnLiBFYWNoIGZ1bmN0aW9uIGlzIHBhc3NlZCBhICdyZXF1ZXN0JyBvYmplY3QgKHNlZVxuLy8gI0Jyb3dzZXJJZGVudGlmaWNhdGlvbikgYW5kIHNob3VsZCByZXR1cm4gbnVsbCBvciBvYmplY3QuXG52YXIgaHRtbEF0dHJpYnV0ZUhvb2tzID0gW107XG52YXIgZ2V0SHRtbEF0dHJpYnV0ZXMgPSBmdW5jdGlvbiAocmVxdWVzdCkge1xuICB2YXIgY29tYmluZWRBdHRyaWJ1dGVzICA9IHt9O1xuICBfLmVhY2goaHRtbEF0dHJpYnV0ZUhvb2tzIHx8IFtdLCBmdW5jdGlvbiAoaG9vaykge1xuICAgIHZhciBhdHRyaWJ1dGVzID0gaG9vayhyZXF1ZXN0KTtcbiAgICBpZiAoYXR0cmlidXRlcyA9PT0gbnVsbClcbiAgICAgIHJldHVybjtcbiAgICBpZiAodHlwZW9mIGF0dHJpYnV0ZXMgIT09ICdvYmplY3QnKVxuICAgICAgdGhyb3cgRXJyb3IoXCJIVE1MIGF0dHJpYnV0ZSBob29rIG11c3QgcmV0dXJuIG51bGwgb3Igb2JqZWN0XCIpO1xuICAgIF8uZXh0ZW5kKGNvbWJpbmVkQXR0cmlidXRlcywgYXR0cmlidXRlcyk7XG4gIH0pO1xuICByZXR1cm4gY29tYmluZWRBdHRyaWJ1dGVzO1xufTtcbldlYkFwcC5hZGRIdG1sQXR0cmlidXRlSG9vayA9IGZ1bmN0aW9uIChob29rKSB7XG4gIGh0bWxBdHRyaWJ1dGVIb29rcy5wdXNoKGhvb2spO1xufTtcblxuLy8gU2VydmUgYXBwIEhUTUwgZm9yIHRoaXMgVVJMP1xudmFyIGFwcFVybCA9IGZ1bmN0aW9uICh1cmwpIHtcbiAgaWYgKHVybCA9PT0gJy9mYXZpY29uLmljbycgfHwgdXJsID09PSAnL3JvYm90cy50eHQnKVxuICAgIHJldHVybiBmYWxzZTtcblxuICAvLyBOT1RFOiBhcHAubWFuaWZlc3QgaXMgbm90IGEgd2ViIHN0YW5kYXJkIGxpa2UgZmF2aWNvbi5pY28gYW5kXG4gIC8vIHJvYm90cy50eHQuIEl0IGlzIGEgZmlsZSBuYW1lIHdlIGhhdmUgY2hvc2VuIHRvIHVzZSBmb3IgSFRNTDVcbiAgLy8gYXBwY2FjaGUgVVJMcy4gSXQgaXMgaW5jbHVkZWQgaGVyZSB0byBwcmV2ZW50IHVzaW5nIGFuIGFwcGNhY2hlXG4gIC8vIHRoZW4gcmVtb3ZpbmcgaXQgZnJvbSBwb2lzb25pbmcgYW4gYXBwIHBlcm1hbmVudGx5LiBFdmVudHVhbGx5LFxuICAvLyBvbmNlIHdlIGhhdmUgc2VydmVyIHNpZGUgcm91dGluZywgdGhpcyB3b24ndCBiZSBuZWVkZWQgYXNcbiAgLy8gdW5rbm93biBVUkxzIHdpdGggcmV0dXJuIGEgNDA0IGF1dG9tYXRpY2FsbHkuXG4gIGlmICh1cmwgPT09ICcvYXBwLm1hbmlmZXN0JylcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgLy8gQXZvaWQgc2VydmluZyBhcHAgSFRNTCBmb3IgZGVjbGFyZWQgcm91dGVzIHN1Y2ggYXMgL3NvY2tqcy8uXG4gIGlmIChSb3V0ZVBvbGljeS5jbGFzc2lmeSh1cmwpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICAvLyB3ZSBjdXJyZW50bHkgcmV0dXJuIGFwcCBIVE1MIG9uIGFsbCBVUkxzIGJ5IGRlZmF1bHRcbiAgcmV0dXJuIHRydWU7XG59O1xuXG5cbi8vIFdlIG5lZWQgdG8gY2FsY3VsYXRlIHRoZSBjbGllbnQgaGFzaCBhZnRlciBhbGwgcGFja2FnZXMgaGF2ZSBsb2FkZWRcbi8vIHRvIGdpdmUgdGhlbSBhIGNoYW5jZSB0byBwb3B1bGF0ZSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlxuLy9cbi8vIENhbGN1bGF0aW5nIHRoZSBoYXNoIGR1cmluZyBzdGFydHVwIG1lYW5zIHRoYXQgcGFja2FnZXMgY2FuIG9ubHlcbi8vIHBvcHVsYXRlIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18gZHVyaW5nIGxvYWQsIG5vdCBkdXJpbmcgc3RhcnR1cC5cbi8vXG4vLyBDYWxjdWxhdGluZyBpbnN0ZWFkIGl0IGF0IHRoZSBiZWdpbm5pbmcgb2YgbWFpbiBhZnRlciBhbGwgc3RhcnR1cFxuLy8gaG9va3MgaGFkIHJ1biB3b3VsZCBhbGxvdyBwYWNrYWdlcyB0byBhbHNvIHBvcHVsYXRlXG4vLyBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIGR1cmluZyBzdGFydHVwLCBidXQgdGhhdCdzIHRvbyBsYXRlIGZvclxuLy8gYXV0b3VwZGF0ZSBiZWNhdXNlIGl0IG5lZWRzIHRvIGhhdmUgdGhlIGNsaWVudCBoYXNoIGF0IHN0YXJ0dXAgdG9cbi8vIGluc2VydCB0aGUgYXV0byB1cGRhdGUgdmVyc2lvbiBpdHNlbGYgaW50b1xuLy8gX19tZXRlb3JfcnVudGltZV9jb25maWdfXyB0byBnZXQgaXQgdG8gdGhlIGNsaWVudC5cbi8vXG4vLyBBbiBhbHRlcm5hdGl2ZSB3b3VsZCBiZSB0byBnaXZlIGF1dG91cGRhdGUgYSBcInBvc3Qtc3RhcnQsXG4vLyBwcmUtbGlzdGVuXCIgaG9vayB0byBhbGxvdyBpdCB0byBpbnNlcnQgdGhlIGF1dG8gdXBkYXRlIHZlcnNpb24gYXRcbi8vIHRoZSByaWdodCBtb21lbnQuXG5cbk1ldGVvci5zdGFydHVwKGZ1bmN0aW9uICgpIHtcbiAgdmFyIGNhbGN1bGF0ZUNsaWVudEhhc2ggPSBXZWJBcHBIYXNoaW5nLmNhbGN1bGF0ZUNsaWVudEhhc2g7XG4gIFdlYkFwcC5jbGllbnRIYXNoID0gZnVuY3Rpb24gKGFyY2hOYW1lKSB7XG4gICAgYXJjaE5hbWUgPSBhcmNoTmFtZSB8fCBXZWJBcHAuZGVmYXVsdEFyY2g7XG4gICAgcmV0dXJuIGNhbGN1bGF0ZUNsaWVudEhhc2goV2ViQXBwLmNsaWVudFByb2dyYW1zW2FyY2hOYW1lXS5tYW5pZmVzdCk7XG4gIH07XG5cbiAgV2ViQXBwLmNhbGN1bGF0ZUNsaWVudEhhc2hSZWZyZXNoYWJsZSA9IGZ1bmN0aW9uIChhcmNoTmFtZSkge1xuICAgIGFyY2hOYW1lID0gYXJjaE5hbWUgfHwgV2ViQXBwLmRlZmF1bHRBcmNoO1xuICAgIHJldHVybiBjYWxjdWxhdGVDbGllbnRIYXNoKFdlYkFwcC5jbGllbnRQcm9ncmFtc1thcmNoTmFtZV0ubWFuaWZlc3QsXG4gICAgICBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICByZXR1cm4gbmFtZSA9PT0gXCJjc3NcIjtcbiAgICAgIH0pO1xuICB9O1xuICBXZWJBcHAuY2FsY3VsYXRlQ2xpZW50SGFzaE5vblJlZnJlc2hhYmxlID0gZnVuY3Rpb24gKGFyY2hOYW1lKSB7XG4gICAgYXJjaE5hbWUgPSBhcmNoTmFtZSB8fCBXZWJBcHAuZGVmYXVsdEFyY2g7XG4gICAgcmV0dXJuIGNhbGN1bGF0ZUNsaWVudEhhc2goV2ViQXBwLmNsaWVudFByb2dyYW1zW2FyY2hOYW1lXS5tYW5pZmVzdCxcbiAgICAgIGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHJldHVybiBuYW1lICE9PSBcImNzc1wiO1xuICAgICAgfSk7XG4gIH07XG4gIFdlYkFwcC5jYWxjdWxhdGVDbGllbnRIYXNoQ29yZG92YSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYXJjaE5hbWUgPSAnd2ViLmNvcmRvdmEnO1xuICAgIGlmICghIFdlYkFwcC5jbGllbnRQcm9ncmFtc1thcmNoTmFtZV0pXG4gICAgICByZXR1cm4gJ25vbmUnO1xuXG4gICAgcmV0dXJuIGNhbGN1bGF0ZUNsaWVudEhhc2goXG4gICAgICBXZWJBcHAuY2xpZW50UHJvZ3JhbXNbYXJjaE5hbWVdLm1hbmlmZXN0LCBudWxsLCBfLnBpY2soXG4gICAgICAgIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18sICdQVUJMSUNfU0VUVElOR1MnKSk7XG4gIH07XG59KTtcblxuXG5cbi8vIFdoZW4gd2UgaGF2ZSBhIHJlcXVlc3QgcGVuZGluZywgd2Ugd2FudCB0aGUgc29ja2V0IHRpbWVvdXQgdG8gYmUgbG9uZywgdG9cbi8vIGdpdmUgb3Vyc2VsdmVzIGEgd2hpbGUgdG8gc2VydmUgaXQsIGFuZCB0byBhbGxvdyBzb2NranMgbG9uZyBwb2xscyB0b1xuLy8gY29tcGxldGUuICBPbiB0aGUgb3RoZXIgaGFuZCwgd2Ugd2FudCB0byBjbG9zZSBpZGxlIHNvY2tldHMgcmVsYXRpdmVseVxuLy8gcXVpY2tseSwgc28gdGhhdCB3ZSBjYW4gc2h1dCBkb3duIHJlbGF0aXZlbHkgcHJvbXB0bHkgYnV0IGNsZWFubHksIHdpdGhvdXRcbi8vIGN1dHRpbmcgb2ZmIGFueW9uZSdzIHJlc3BvbnNlLlxuV2ViQXBwLl90aW1lb3V0QWRqdXN0bWVudFJlcXVlc3RDYWxsYmFjayA9IGZ1bmN0aW9uIChyZXEsIHJlcykge1xuICAvLyB0aGlzIGlzIHJlYWxseSBqdXN0IHJlcS5zb2NrZXQuc2V0VGltZW91dChMT05HX1NPQ0tFVF9USU1FT1VUKTtcbiAgcmVxLnNldFRpbWVvdXQoTE9OR19TT0NLRVRfVElNRU9VVCk7XG4gIC8vIEluc2VydCBvdXIgbmV3IGZpbmlzaCBsaXN0ZW5lciB0byBydW4gQkVGT1JFIHRoZSBleGlzdGluZyBvbmUgd2hpY2ggcmVtb3Zlc1xuICAvLyB0aGUgcmVzcG9uc2UgZnJvbSB0aGUgc29ja2V0LlxuICB2YXIgZmluaXNoTGlzdGVuZXJzID0gcmVzLmxpc3RlbmVycygnZmluaXNoJyk7XG4gIC8vIFhYWCBBcHBhcmVudGx5IGluIE5vZGUgMC4xMiB0aGlzIGV2ZW50IHdhcyBjYWxsZWQgJ3ByZWZpbmlzaCcuXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9qb3llbnQvbm9kZS9jb21taXQvN2M5YjYwNzBcbiAgLy8gQnV0IGl0IGhhcyBzd2l0Y2hlZCBiYWNrIHRvICdmaW5pc2gnIGluIE5vZGUgdjQ6XG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9wdWxsLzE0MTFcbiAgcmVzLnJlbW92ZUFsbExpc3RlbmVycygnZmluaXNoJyk7XG4gIHJlcy5vbignZmluaXNoJywgZnVuY3Rpb24gKCkge1xuICAgIHJlcy5zZXRUaW1lb3V0KFNIT1JUX1NPQ0tFVF9USU1FT1VUKTtcbiAgfSk7XG4gIF8uZWFjaChmaW5pc2hMaXN0ZW5lcnMsIGZ1bmN0aW9uIChsKSB7IHJlcy5vbignZmluaXNoJywgbCk7IH0pO1xufTtcblxuXG4vLyBXaWxsIGJlIHVwZGF0ZWQgYnkgbWFpbiBiZWZvcmUgd2UgbGlzdGVuLlxuLy8gTWFwIGZyb20gY2xpZW50IGFyY2ggdG8gYm9pbGVycGxhdGUgb2JqZWN0LlxuLy8gQm9pbGVycGxhdGUgb2JqZWN0IGhhczpcbi8vICAgLSBmdW5jOiBYWFhcbi8vICAgLSBiYXNlRGF0YTogWFhYXG52YXIgYm9pbGVycGxhdGVCeUFyY2ggPSB7fTtcblxuLy8gUmVnaXN0ZXIgYSBjYWxsYmFjayBmdW5jdGlvbiB0aGF0IGNhbiBzZWxlY3RpdmVseSBtb2RpZnkgYm9pbGVycGxhdGVcbi8vIGRhdGEgZ2l2ZW4gYXJndW1lbnRzIChyZXF1ZXN0LCBkYXRhLCBhcmNoKS4gVGhlIGtleSBzaG91bGQgYmUgYSB1bmlxdWVcbi8vIGlkZW50aWZpZXIsIHRvIHByZXZlbnQgYWNjdW11bGF0aW5nIGR1cGxpY2F0ZSBjYWxsYmFja3MgZnJvbSB0aGUgc2FtZVxuLy8gY2FsbCBzaXRlIG92ZXIgdGltZS4gQ2FsbGJhY2tzIHdpbGwgYmUgY2FsbGVkIGluIHRoZSBvcmRlciB0aGV5IHdlcmVcbi8vIHJlZ2lzdGVyZWQuIEEgY2FsbGJhY2sgc2hvdWxkIHJldHVybiBmYWxzZSBpZiBpdCBkaWQgbm90IG1ha2UgYW55XG4vLyBjaGFuZ2VzIGFmZmVjdGluZyB0aGUgYm9pbGVycGxhdGUuIFBhc3NpbmcgbnVsbCBkZWxldGVzIHRoZSBjYWxsYmFjay5cbi8vIEFueSBwcmV2aW91cyBjYWxsYmFjayByZWdpc3RlcmVkIGZvciB0aGlzIGtleSB3aWxsIGJlIHJldHVybmVkLlxuY29uc3QgYm9pbGVycGxhdGVEYXRhQ2FsbGJhY2tzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbldlYkFwcEludGVybmFscy5yZWdpc3RlckJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrID0gZnVuY3Rpb24gKGtleSwgY2FsbGJhY2spIHtcbiAgY29uc3QgcHJldmlvdXNDYWxsYmFjayA9IGJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrc1trZXldO1xuXG4gIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrc1trZXldID0gY2FsbGJhY2s7XG4gIH0gZWxzZSB7XG4gICAgYXNzZXJ0LnN0cmljdEVxdWFsKGNhbGxiYWNrLCBudWxsKTtcbiAgICBkZWxldGUgYm9pbGVycGxhdGVEYXRhQ2FsbGJhY2tzW2tleV07XG4gIH1cblxuICAvLyBSZXR1cm4gdGhlIHByZXZpb3VzIGNhbGxiYWNrIGluIGNhc2UgdGhlIG5ldyBjYWxsYmFjayBuZWVkcyB0byBjYWxsXG4gIC8vIGl0OyBmb3IgZXhhbXBsZSwgd2hlbiB0aGUgbmV3IGNhbGxiYWNrIGlzIGEgd3JhcHBlciBmb3IgdGhlIG9sZC5cbiAgcmV0dXJuIHByZXZpb3VzQ2FsbGJhY2sgfHwgbnVsbDtcbn07XG5cbi8vIEdpdmVuIGEgcmVxdWVzdCAoYXMgcmV0dXJuZWQgZnJvbSBgY2F0ZWdvcml6ZVJlcXVlc3RgKSwgcmV0dXJuIHRoZVxuLy8gYm9pbGVycGxhdGUgSFRNTCB0byBzZXJ2ZSBmb3IgdGhhdCByZXF1ZXN0LlxuLy9cbi8vIElmIGEgcHJldmlvdXMgY29ubmVjdCBtaWRkbGV3YXJlIGhhcyByZW5kZXJlZCBjb250ZW50IGZvciB0aGUgaGVhZCBvciBib2R5LFxuLy8gcmV0dXJucyB0aGUgYm9pbGVycGxhdGUgd2l0aCB0aGF0IGNvbnRlbnQgcGF0Y2hlZCBpbiBvdGhlcndpc2Vcbi8vIG1lbW9pemVzIG9uIEhUTUwgYXR0cmlidXRlcyAodXNlZCBieSwgZWcsIGFwcGNhY2hlKSBhbmQgd2hldGhlciBpbmxpbmVcbi8vIHNjcmlwdHMgYXJlIGN1cnJlbnRseSBhbGxvd2VkLlxuLy8gWFhYIHNvIGZhciB0aGlzIGZ1bmN0aW9uIGlzIGFsd2F5cyBjYWxsZWQgd2l0aCBhcmNoID09PSAnd2ViLmJyb3dzZXInXG5mdW5jdGlvbiBnZXRCb2lsZXJwbGF0ZShyZXF1ZXN0LCBhcmNoKSB7XG4gIHJldHVybiBnZXRCb2lsZXJwbGF0ZUFzeW5jKHJlcXVlc3QsIGFyY2gpLmF3YWl0KCk7XG59XG5cbmZ1bmN0aW9uIGdldEJvaWxlcnBsYXRlQXN5bmMocmVxdWVzdCwgYXJjaCkge1xuICBjb25zdCBib2lsZXJwbGF0ZSA9IGJvaWxlcnBsYXRlQnlBcmNoW2FyY2hdO1xuICBjb25zdCBkYXRhID0gT2JqZWN0LmFzc2lnbih7fSwgYm9pbGVycGxhdGUuYmFzZURhdGEsIHtcbiAgICBodG1sQXR0cmlidXRlczogZ2V0SHRtbEF0dHJpYnV0ZXMocmVxdWVzdCksXG4gIH0sIF8ucGljayhyZXF1ZXN0LCBcImR5bmFtaWNIZWFkXCIsIFwiZHluYW1pY0JvZHlcIikpO1xuXG4gIGxldCBtYWRlQ2hhbmdlcyA9IGZhbHNlO1xuICBsZXQgcHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuXG4gIE9iamVjdC5rZXlzKGJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrcykuZm9yRWFjaChrZXkgPT4ge1xuICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oKCkgPT4ge1xuICAgICAgY29uc3QgY2FsbGJhY2sgPSBib2lsZXJwbGF0ZURhdGFDYWxsYmFja3Nba2V5XTtcbiAgICAgIHJldHVybiBjYWxsYmFjayhyZXF1ZXN0LCBkYXRhLCBhcmNoKTtcbiAgICB9KS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICAvLyBDYWxsYmFja3Mgc2hvdWxkIHJldHVybiBmYWxzZSBpZiB0aGV5IGRpZCBub3QgbWFrZSBhbnkgY2hhbmdlcy5cbiAgICAgIGlmIChyZXN1bHQgIT09IGZhbHNlKSB7XG4gICAgICAgIG1hZGVDaGFuZ2VzID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIHByb21pc2UudGhlbigoKSA9PiAoe1xuICAgIHN0cmVhbTogYm9pbGVycGxhdGUudG9IVE1MU3RyZWFtKGRhdGEpLFxuICAgIHN0YXR1c0NvZGU6IGRhdGEuc3RhdHVzQ29kZSxcbiAgICBoZWFkZXJzOiBkYXRhLmhlYWRlcnMsXG4gIH0pKTtcbn1cblxuV2ViQXBwSW50ZXJuYWxzLmdlbmVyYXRlQm9pbGVycGxhdGVJbnN0YW5jZSA9IGZ1bmN0aW9uIChhcmNoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkaXRpb25hbE9wdGlvbnMpIHtcbiAgYWRkaXRpb25hbE9wdGlvbnMgPSBhZGRpdGlvbmFsT3B0aW9ucyB8fCB7fTtcblxuICB2YXIgcnVudGltZUNvbmZpZyA9IF8uZXh0ZW5kKFxuICAgIF8uY2xvbmUoX19tZXRlb3JfcnVudGltZV9jb25maWdfXyksXG4gICAgYWRkaXRpb25hbE9wdGlvbnMucnVudGltZUNvbmZpZ092ZXJyaWRlcyB8fCB7fVxuICApO1xuXG4gIHJldHVybiBuZXcgQm9pbGVycGxhdGUoYXJjaCwgbWFuaWZlc3QsIF8uZXh0ZW5kKHtcbiAgICBwYXRoTWFwcGVyKGl0ZW1QYXRoKSB7XG4gICAgICByZXR1cm4gcGF0aEpvaW4oYXJjaFBhdGhbYXJjaF0sIGl0ZW1QYXRoKTtcbiAgICB9LFxuICAgIGJhc2VEYXRhRXh0ZW5zaW9uOiB7XG4gICAgICBhZGRpdGlvbmFsU3RhdGljSnM6IF8ubWFwKFxuICAgICAgICBhZGRpdGlvbmFsU3RhdGljSnMgfHwgW10sXG4gICAgICAgIGZ1bmN0aW9uIChjb250ZW50cywgcGF0aG5hbWUpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcGF0aG5hbWU6IHBhdGhuYW1lLFxuICAgICAgICAgICAgY29udGVudHM6IGNvbnRlbnRzXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgKSxcbiAgICAgIC8vIENvbnZlcnQgdG8gYSBKU09OIHN0cmluZywgdGhlbiBnZXQgcmlkIG9mIG1vc3Qgd2VpcmQgY2hhcmFjdGVycywgdGhlblxuICAgICAgLy8gd3JhcCBpbiBkb3VibGUgcXVvdGVzLiAoVGhlIG91dGVybW9zdCBKU09OLnN0cmluZ2lmeSByZWFsbHkgb3VnaHQgdG9cbiAgICAgIC8vIGp1c3QgYmUgXCJ3cmFwIGluIGRvdWJsZSBxdW90ZXNcIiBidXQgd2UgdXNlIGl0IHRvIGJlIHNhZmUuKSBUaGlzIG1pZ2h0XG4gICAgICAvLyBlbmQgdXAgaW5zaWRlIGEgPHNjcmlwdD4gdGFnIHNvIHdlIG5lZWQgdG8gYmUgY2FyZWZ1bCB0byBub3QgaW5jbHVkZVxuICAgICAgLy8gXCI8L3NjcmlwdD5cIiwgYnV0IG5vcm1hbCB7e3NwYWNlYmFyc319IGVzY2FwaW5nIGVzY2FwZXMgdG9vIG11Y2ghIFNlZVxuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21ldGVvci9tZXRlb3IvaXNzdWVzLzM3MzBcbiAgICAgIG1ldGVvclJ1bnRpbWVDb25maWc6IEpTT04uc3RyaW5naWZ5KFxuICAgICAgICBlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkocnVudGltZUNvbmZpZykpKSxcbiAgICAgIHJvb3RVcmxQYXRoUHJlZml4OiBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYIHx8ICcnLFxuICAgICAgYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2s6IGJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rLFxuICAgICAgaW5saW5lU2NyaXB0c0FsbG93ZWQ6IFdlYkFwcEludGVybmFscy5pbmxpbmVTY3JpcHRzQWxsb3dlZCgpLFxuICAgICAgaW5saW5lOiBhZGRpdGlvbmFsT3B0aW9ucy5pbmxpbmVcbiAgICB9XG4gIH0sIGFkZGl0aW9uYWxPcHRpb25zKSk7XG59O1xuXG4vLyBBIG1hcHBpbmcgZnJvbSB1cmwgcGF0aCB0byBhcmNoaXRlY3R1cmUgKGUuZy4gXCJ3ZWIuYnJvd3NlclwiKSB0byBzdGF0aWNcbi8vIGZpbGUgaW5mb3JtYXRpb24gd2l0aCB0aGUgZm9sbG93aW5nIGZpZWxkczpcbi8vIC0gdHlwZTogdGhlIHR5cGUgb2YgZmlsZSB0byBiZSBzZXJ2ZWRcbi8vIC0gY2FjaGVhYmxlOiBvcHRpb25hbGx5LCB3aGV0aGVyIHRoZSBmaWxlIHNob3VsZCBiZSBjYWNoZWQgb3Igbm90XG4vLyAtIHNvdXJjZU1hcFVybDogb3B0aW9uYWxseSwgdGhlIHVybCBvZiB0aGUgc291cmNlIG1hcFxuLy9cbi8vIEluZm8gYWxzbyBjb250YWlucyBvbmUgb2YgdGhlIGZvbGxvd2luZzpcbi8vIC0gY29udGVudDogdGhlIHN0cmluZ2lmaWVkIGNvbnRlbnQgdGhhdCBzaG91bGQgYmUgc2VydmVkIGF0IHRoaXMgcGF0aFxuLy8gLSBhYnNvbHV0ZVBhdGg6IHRoZSBhYnNvbHV0ZSBwYXRoIG9uIGRpc2sgdG8gdGhlIGZpbGVcblxudmFyIHN0YXRpY0ZpbGVzQnlBcmNoO1xuXG4vLyBTZXJ2ZSBzdGF0aWMgZmlsZXMgZnJvbSB0aGUgbWFuaWZlc3Qgb3IgYWRkZWQgd2l0aFxuLy8gYGFkZFN0YXRpY0pzYC4gRXhwb3J0ZWQgZm9yIHRlc3RzLlxuV2ViQXBwSW50ZXJuYWxzLnN0YXRpY0ZpbGVzTWlkZGxld2FyZSA9IGZ1bmN0aW9uIChzdGF0aWNGaWxlc0J5QXJjaCwgcmVxLCByZXMsIG5leHQpIHtcbiAgaWYgKCdHRVQnICE9IHJlcS5tZXRob2QgJiYgJ0hFQUQnICE9IHJlcS5tZXRob2QgJiYgJ09QVElPTlMnICE9IHJlcS5tZXRob2QpIHtcbiAgICBuZXh0KCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBwYXRobmFtZSA9IHBhcnNlUmVxdWVzdChyZXEpLnBhdGhuYW1lO1xuICB0cnkge1xuICAgIHBhdGhuYW1lID0gZGVjb2RlVVJJQ29tcG9uZW50KHBhdGhuYW1lKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIG5leHQoKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgc2VydmVTdGF0aWNKcyA9IGZ1bmN0aW9uIChzKSB7XG4gICAgcmVzLndyaXRlSGVhZCgyMDAsIHtcbiAgICAgICdDb250ZW50LXR5cGUnOiAnYXBwbGljYXRpb24vamF2YXNjcmlwdDsgY2hhcnNldD1VVEYtOCdcbiAgICB9KTtcbiAgICByZXMud3JpdGUocyk7XG4gICAgcmVzLmVuZCgpO1xuICB9O1xuXG4gIGlmIChwYXRobmFtZSA9PT0gXCIvbWV0ZW9yX3J1bnRpbWVfY29uZmlnLmpzXCIgJiZcbiAgICAgICEgV2ViQXBwSW50ZXJuYWxzLmlubGluZVNjcmlwdHNBbGxvd2VkKCkpIHtcbiAgICBzZXJ2ZVN0YXRpY0pzKFwiX19tZXRlb3JfcnVudGltZV9jb25maWdfXyA9IFwiICtcbiAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18pICsgXCI7XCIpO1xuICAgIHJldHVybjtcbiAgfSBlbHNlIGlmIChfLmhhcyhhZGRpdGlvbmFsU3RhdGljSnMsIHBhdGhuYW1lKSAmJlxuICAgICAgICAgICAgICAhIFdlYkFwcEludGVybmFscy5pbmxpbmVTY3JpcHRzQWxsb3dlZCgpKSB7XG4gICAgc2VydmVTdGF0aWNKcyhhZGRpdGlvbmFsU3RhdGljSnNbcGF0aG5hbWVdKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBpbmZvID0gZ2V0U3RhdGljRmlsZUluZm8oXG4gICAgcGF0aG5hbWUsXG4gICAgaWRlbnRpZnlCcm93c2VyKHJlcS5oZWFkZXJzW1widXNlci1hZ2VudFwiXSksXG4gICk7XG5cbiAgaWYgKCEgaW5mbykge1xuICAgIG5leHQoKTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBXZSBkb24ndCBuZWVkIHRvIGNhbGwgcGF1c2UgYmVjYXVzZSwgdW5saWtlICdzdGF0aWMnLCBvbmNlIHdlIGNhbGwgaW50b1xuICAvLyAnc2VuZCcgYW5kIHlpZWxkIHRvIHRoZSBldmVudCBsb29wLCB3ZSBuZXZlciBjYWxsIGFub3RoZXIgaGFuZGxlciB3aXRoXG4gIC8vICduZXh0Jy5cblxuICAvLyBDYWNoZWFibGUgZmlsZXMgYXJlIGZpbGVzIHRoYXQgc2hvdWxkIG5ldmVyIGNoYW5nZS4gVHlwaWNhbGx5XG4gIC8vIG5hbWVkIGJ5IHRoZWlyIGhhc2ggKGVnIG1ldGVvciBidW5kbGVkIGpzIGFuZCBjc3MgZmlsZXMpLlxuICAvLyBXZSBjYWNoZSB0aGVtIH5mb3JldmVyICgxeXIpLlxuICBjb25zdCBtYXhBZ2UgPSBpbmZvLmNhY2hlYWJsZVxuICAgID8gMTAwMCAqIDYwICogNjAgKiAyNCAqIDM2NVxuICAgIDogMDtcblxuICBpZiAoaW5mby5jYWNoZWFibGUpIHtcbiAgICAvLyBTaW5jZSB3ZSB1c2UgcmVxLmhlYWRlcnNbXCJ1c2VyLWFnZW50XCJdIHRvIGRldGVybWluZSB3aGV0aGVyIHRoZVxuICAgIC8vIGNsaWVudCBzaG91bGQgcmVjZWl2ZSBtb2Rlcm4gb3IgbGVnYWN5IHJlc291cmNlcywgdGVsbCB0aGUgY2xpZW50XG4gICAgLy8gdG8gaW52YWxpZGF0ZSBjYWNoZWQgcmVzb3VyY2VzIHdoZW4vaWYgaXRzIHVzZXIgYWdlbnQgc3RyaW5nXG4gICAgLy8gY2hhbmdlcyBpbiB0aGUgZnV0dXJlLlxuICAgIHJlcy5zZXRIZWFkZXIoXCJWYXJ5XCIsIFwiVXNlci1BZ2VudFwiKTtcbiAgfVxuXG4gIC8vIFNldCB0aGUgWC1Tb3VyY2VNYXAgaGVhZGVyLCB3aGljaCBjdXJyZW50IENocm9tZSwgRmlyZUZveCwgYW5kIFNhZmFyaVxuICAvLyB1bmRlcnN0YW5kLiAgKFRoZSBTb3VyY2VNYXAgaGVhZGVyIGlzIHNsaWdodGx5IG1vcmUgc3BlYy1jb3JyZWN0IGJ1dCBGRlxuICAvLyBkb2Vzbid0IHVuZGVyc3RhbmQgaXQuKVxuICAvL1xuICAvLyBZb3UgbWF5IGFsc28gbmVlZCB0byBlbmFibGUgc291cmNlIG1hcHMgaW4gQ2hyb21lOiBvcGVuIGRldiB0b29scywgY2xpY2tcbiAgLy8gdGhlIGdlYXIgaW4gdGhlIGJvdHRvbSByaWdodCBjb3JuZXIsIGFuZCBzZWxlY3QgXCJlbmFibGUgc291cmNlIG1hcHNcIi5cbiAgaWYgKGluZm8uc291cmNlTWFwVXJsKSB7XG4gICAgcmVzLnNldEhlYWRlcignWC1Tb3VyY2VNYXAnLFxuICAgICAgICAgICAgICAgICAgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTF9QQVRIX1BSRUZJWCArXG4gICAgICAgICAgICAgICAgICBpbmZvLnNvdXJjZU1hcFVybCk7XG4gIH1cblxuICBpZiAoaW5mby50eXBlID09PSBcImpzXCIgfHxcbiAgICAgIGluZm8udHlwZSA9PT0gXCJkeW5hbWljIGpzXCIpIHtcbiAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vamF2YXNjcmlwdDsgY2hhcnNldD1VVEYtOFwiKTtcbiAgfSBlbHNlIGlmIChpbmZvLnR5cGUgPT09IFwiY3NzXCIpIHtcbiAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwidGV4dC9jc3M7IGNoYXJzZXQ9VVRGLThcIik7XG4gIH0gZWxzZSBpZiAoaW5mby50eXBlID09PSBcImpzb25cIikge1xuICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PVVURi04XCIpO1xuICB9XG5cbiAgaWYgKGluZm8uaGFzaCkge1xuICAgIHJlcy5zZXRIZWFkZXIoJ0VUYWcnLCAnXCInICsgaW5mby5oYXNoICsgJ1wiJyk7XG4gIH1cblxuICBpZiAoaW5mby5jb250ZW50KSB7XG4gICAgcmVzLndyaXRlKGluZm8uY29udGVudCk7XG4gICAgcmVzLmVuZCgpO1xuICB9IGVsc2Uge1xuICAgIHNlbmQocmVxLCBpbmZvLmFic29sdXRlUGF0aCwge1xuICAgICAgbWF4YWdlOiBtYXhBZ2UsXG4gICAgICBkb3RmaWxlczogJ2FsbG93JywgLy8gaWYgd2Ugc3BlY2lmaWVkIGEgZG90ZmlsZSBpbiB0aGUgbWFuaWZlc3QsIHNlcnZlIGl0XG4gICAgICBsYXN0TW9kaWZpZWQ6IGZhbHNlIC8vIGRvbid0IHNldCBsYXN0LW1vZGlmaWVkIGJhc2VkIG9uIHRoZSBmaWxlIGRhdGVcbiAgICB9KS5vbignZXJyb3InLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICBMb2cuZXJyb3IoXCJFcnJvciBzZXJ2aW5nIHN0YXRpYyBmaWxlIFwiICsgZXJyKTtcbiAgICAgIHJlcy53cml0ZUhlYWQoNTAwKTtcbiAgICAgIHJlcy5lbmQoKTtcbiAgICB9KS5vbignZGlyZWN0b3J5JywgZnVuY3Rpb24gKCkge1xuICAgICAgTG9nLmVycm9yKFwiVW5leHBlY3RlZCBkaXJlY3RvcnkgXCIgKyBpbmZvLmFic29sdXRlUGF0aCk7XG4gICAgICByZXMud3JpdGVIZWFkKDUwMCk7XG4gICAgICByZXMuZW5kKCk7XG4gICAgfSkucGlwZShyZXMpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBnZXRTdGF0aWNGaWxlSW5mbyhvcmlnaW5hbFBhdGgsIGJyb3dzZXIpIHtcbiAgY29uc3QgeyBhcmNoLCBwYXRoIH0gPSBnZXRBcmNoQW5kUGF0aChvcmlnaW5hbFBhdGgsIGJyb3dzZXIpO1xuXG4gIGlmICghIGhhc093bi5jYWxsKFdlYkFwcC5jbGllbnRQcm9ncmFtcywgYXJjaCkpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8vIEdldCBhIGxpc3Qgb2YgYWxsIGF2YWlsYWJsZSBzdGF0aWMgZmlsZSBhcmNoaXRlY3R1cmVzLCB3aXRoIGFyY2hcbiAgLy8gZmlyc3QgaW4gdGhlIGxpc3QgaWYgaXQgZXhpc3RzLlxuICBjb25zdCBzdGF0aWNBcmNoTGlzdCA9IE9iamVjdC5rZXlzKHN0YXRpY0ZpbGVzQnlBcmNoKTtcbiAgY29uc3QgYXJjaEluZGV4ID0gc3RhdGljQXJjaExpc3QuaW5kZXhPZihhcmNoKTtcbiAgaWYgKGFyY2hJbmRleCA+IDApIHtcbiAgICBzdGF0aWNBcmNoTGlzdC51bnNoaWZ0KHN0YXRpY0FyY2hMaXN0LnNwbGljZShhcmNoSW5kZXgsIDEpWzBdKTtcbiAgfVxuXG4gIGxldCBpbmZvID0gbnVsbDtcblxuICBzdGF0aWNBcmNoTGlzdC5zb21lKGFyY2ggPT4ge1xuICAgIGNvbnN0IHN0YXRpY0ZpbGVzID0gc3RhdGljRmlsZXNCeUFyY2hbYXJjaF07XG5cbiAgICAvLyBJZiBzdGF0aWNGaWxlcyBjb250YWlucyBvcmlnaW5hbFBhdGggd2l0aCB0aGUgYXJjaCBpbmZlcnJlZCBhYm92ZSxcbiAgICAvLyB1c2UgdGhhdCBpbmZvcm1hdGlvbi5cbiAgICBpZiAoaGFzT3duLmNhbGwoc3RhdGljRmlsZXMsIG9yaWdpbmFsUGF0aCkpIHtcbiAgICAgIHJldHVybiBpbmZvID0gc3RhdGljRmlsZXNbb3JpZ2luYWxQYXRoXTtcbiAgICB9XG5cbiAgICAvLyBJZiBnZXRBcmNoQW5kUGF0aCByZXR1cm5lZCBhbiBhbHRlcm5hdGUgcGF0aCwgdHJ5IHRoYXQgaW5zdGVhZC5cbiAgICBpZiAocGF0aCAhPT0gb3JpZ2luYWxQYXRoICYmXG4gICAgICAgIGhhc093bi5jYWxsKHN0YXRpY0ZpbGVzLCBwYXRoKSkge1xuICAgICAgcmV0dXJuIGluZm8gPSBzdGF0aWNGaWxlc1twYXRoXTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBpbmZvO1xufVxuXG5mdW5jdGlvbiBnZXRBcmNoQW5kUGF0aChwYXRoLCBicm93c2VyKSB7XG4gIGNvbnN0IHBhdGhQYXJ0cyA9IHBhdGguc3BsaXQoXCIvXCIpO1xuICBjb25zdCBhcmNoS2V5ID0gcGF0aFBhcnRzWzFdO1xuXG4gIGlmIChhcmNoS2V5LnN0YXJ0c1dpdGgoXCJfX1wiKSkge1xuICAgIGNvbnN0IGFyY2hDbGVhbmVkID0gXCJ3ZWIuXCIgKyBhcmNoS2V5LnNsaWNlKDIpO1xuICAgIGlmIChoYXNPd24uY2FsbChXZWJBcHAuY2xpZW50UHJvZ3JhbXMsIGFyY2hDbGVhbmVkKSkge1xuICAgICAgcGF0aFBhcnRzLnNwbGljZSgxLCAxKTsgLy8gUmVtb3ZlIHRoZSBhcmNoS2V5IHBhcnQuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBhcmNoOiBhcmNoQ2xlYW5lZCxcbiAgICAgICAgcGF0aDogcGF0aFBhcnRzLmpvaW4oXCIvXCIpLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICAvLyBUT0RPIFBlcmhhcHMgb25lIGRheSB3ZSBjb3VsZCBpbmZlciBDb3Jkb3ZhIGNsaWVudHMgaGVyZSwgc28gdGhhdCB3ZVxuICAvLyB3b3VsZG4ndCBoYXZlIHRvIHVzZSBwcmVmaXhlZCBcIi9fX2NvcmRvdmEvLi4uXCIgVVJMcy5cbiAgY29uc3QgYXJjaCA9IGlzTW9kZXJuKGJyb3dzZXIpXG4gICAgPyBcIndlYi5icm93c2VyXCJcbiAgICA6IFwid2ViLmJyb3dzZXIubGVnYWN5XCI7XG5cbiAgaWYgKGhhc093bi5jYWxsKFdlYkFwcC5jbGllbnRQcm9ncmFtcywgYXJjaCkpIHtcbiAgICByZXR1cm4geyBhcmNoLCBwYXRoIH07XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGFyY2g6IFdlYkFwcC5kZWZhdWx0QXJjaCxcbiAgICBwYXRoLFxuICB9O1xufVxuXG4vLyBQYXJzZSB0aGUgcGFzc2VkIGluIHBvcnQgdmFsdWUuIFJldHVybiB0aGUgcG9ydCBhcy1pcyBpZiBpdCdzIGEgU3RyaW5nXG4vLyAoZS5nLiBhIFdpbmRvd3MgU2VydmVyIHN0eWxlIG5hbWVkIHBpcGUpLCBvdGhlcndpc2UgcmV0dXJuIHRoZSBwb3J0IGFzIGFuXG4vLyBpbnRlZ2VyLlxuLy9cbi8vIERFUFJFQ0FURUQ6IERpcmVjdCB1c2Ugb2YgdGhpcyBmdW5jdGlvbiBpcyBub3QgcmVjb21tZW5kZWQ7IGl0IGlzIG5vXG4vLyBsb25nZXIgdXNlZCBpbnRlcm5hbGx5LCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIGEgZnV0dXJlIHJlbGVhc2UuXG5XZWJBcHBJbnRlcm5hbHMucGFyc2VQb3J0ID0gcG9ydCA9PiB7XG4gIGxldCBwYXJzZWRQb3J0ID0gcGFyc2VJbnQocG9ydCk7XG4gIGlmIChOdW1iZXIuaXNOYU4ocGFyc2VkUG9ydCkpIHtcbiAgICBwYXJzZWRQb3J0ID0gcG9ydDtcbiAgfVxuICByZXR1cm4gcGFyc2VkUG9ydDtcbn1cblxuZnVuY3Rpb24gcnVuV2ViQXBwU2VydmVyKCkge1xuICB2YXIgc2h1dHRpbmdEb3duID0gZmFsc2U7XG4gIHZhciBzeW5jUXVldWUgPSBuZXcgTWV0ZW9yLl9TeW5jaHJvbm91c1F1ZXVlKCk7XG5cbiAgdmFyIGdldEl0ZW1QYXRobmFtZSA9IGZ1bmN0aW9uIChpdGVtVXJsKSB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChwYXJzZVVybChpdGVtVXJsKS5wYXRobmFtZSk7XG4gIH07XG5cbiAgV2ViQXBwSW50ZXJuYWxzLnJlbG9hZENsaWVudFByb2dyYW1zID0gZnVuY3Rpb24gKCkge1xuICAgIHN5bmNRdWV1ZS5ydW5UYXNrKGZ1bmN0aW9uKCkge1xuICAgICAgc3RhdGljRmlsZXNCeUFyY2ggPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgICBmdW5jdGlvbiBnZW5lcmF0ZUNsaWVudFByb2dyYW0oY2xpZW50UGF0aCwgYXJjaCkge1xuICAgICAgICBmdW5jdGlvbiBhZGRTdGF0aWNGaWxlKHBhdGgsIGl0ZW0pIHtcbiAgICAgICAgICBpZiAoISBoYXNPd24uY2FsbChzdGF0aWNGaWxlc0J5QXJjaCwgYXJjaCkpIHtcbiAgICAgICAgICAgIHN0YXRpY0ZpbGVzQnlBcmNoW2FyY2hdID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc3RhdGljRmlsZXNCeUFyY2hbYXJjaF1bcGF0aF0gPSBpdGVtO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gcmVhZCB0aGUgY29udHJvbCBmb3IgdGhlIGNsaWVudCB3ZSdsbCBiZSBzZXJ2aW5nIHVwXG4gICAgICAgIHZhciBjbGllbnRKc29uUGF0aCA9IHBhdGhKb2luKF9fbWV0ZW9yX2Jvb3RzdHJhcF9fLnNlcnZlckRpcixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpZW50UGF0aCk7XG4gICAgICAgIHZhciBjbGllbnREaXIgPSBwYXRoRGlybmFtZShjbGllbnRKc29uUGF0aCk7XG4gICAgICAgIHZhciBjbGllbnRKc29uID0gSlNPTi5wYXJzZShyZWFkVXRmOEZpbGVTeW5jKGNsaWVudEpzb25QYXRoKSk7XG4gICAgICAgIGlmIChjbGllbnRKc29uLmZvcm1hdCAhPT0gXCJ3ZWItcHJvZ3JhbS1wcmUxXCIpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5zdXBwb3J0ZWQgZm9ybWF0IGZvciBjbGllbnQgYXNzZXRzOiBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGNsaWVudEpzb24uZm9ybWF0KSk7XG5cbiAgICAgICAgaWYgKCEgY2xpZW50SnNvblBhdGggfHwgISBjbGllbnREaXIgfHwgISBjbGllbnRKc29uKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNsaWVudCBjb25maWcgZmlsZSBub3QgcGFyc2VkLlwiKTtcblxuICAgICAgICB2YXIgbWFuaWZlc3QgPSBjbGllbnRKc29uLm1hbmlmZXN0O1xuICAgICAgICBfLmVhY2gobWFuaWZlc3QsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgaWYgKGl0ZW0udXJsICYmIGl0ZW0ud2hlcmUgPT09IFwiY2xpZW50XCIpIHtcbiAgICAgICAgICAgIGFkZFN0YXRpY0ZpbGUoZ2V0SXRlbVBhdGhuYW1lKGl0ZW0udXJsKSwge1xuICAgICAgICAgICAgICBhYnNvbHV0ZVBhdGg6IHBhdGhKb2luKGNsaWVudERpciwgaXRlbS5wYXRoKSxcbiAgICAgICAgICAgICAgY2FjaGVhYmxlOiBpdGVtLmNhY2hlYWJsZSxcbiAgICAgICAgICAgICAgaGFzaDogaXRlbS5oYXNoLFxuICAgICAgICAgICAgICAvLyBMaW5rIGZyb20gc291cmNlIHRvIGl0cyBtYXBcbiAgICAgICAgICAgICAgc291cmNlTWFwVXJsOiBpdGVtLnNvdXJjZU1hcFVybCxcbiAgICAgICAgICAgICAgdHlwZTogaXRlbS50eXBlXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKGl0ZW0uc291cmNlTWFwKSB7XG4gICAgICAgICAgICAgIC8vIFNlcnZlIHRoZSBzb3VyY2UgbWFwIHRvbywgdW5kZXIgdGhlIHNwZWNpZmllZCBVUkwuIFdlIGFzc3VtZSBhbGxcbiAgICAgICAgICAgICAgLy8gc291cmNlIG1hcHMgYXJlIGNhY2hlYWJsZS5cbiAgICAgICAgICAgICAgYWRkU3RhdGljRmlsZShnZXRJdGVtUGF0aG5hbWUoaXRlbS5zb3VyY2VNYXBVcmwpLCB7XG4gICAgICAgICAgICAgICAgYWJzb2x1dGVQYXRoOiBwYXRoSm9pbihjbGllbnREaXIsIGl0ZW0uc291cmNlTWFwKSxcbiAgICAgICAgICAgICAgICBjYWNoZWFibGU6IHRydWVcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgcHJvZ3JhbSA9IHtcbiAgICAgICAgICBmb3JtYXQ6IFwid2ViLXByb2dyYW0tcHJlMVwiLFxuICAgICAgICAgIG1hbmlmZXN0OiBtYW5pZmVzdCxcbiAgICAgICAgICB2ZXJzaW9uOiBwcm9jZXNzLmVudi5BVVRPVVBEQVRFX1ZFUlNJT04gfHxcbiAgICAgICAgICAgIFdlYkFwcEhhc2hpbmcuY2FsY3VsYXRlQ2xpZW50SGFzaChcbiAgICAgICAgICAgICAgbWFuaWZlc3QsXG4gICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgIF8ucGljayhfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLCBcIlBVQkxJQ19TRVRUSU5HU1wiKVxuICAgICAgICAgICAgKSxcbiAgICAgICAgICBjb3Jkb3ZhQ29tcGF0aWJpbGl0eVZlcnNpb25zOiBjbGllbnRKc29uLmNvcmRvdmFDb21wYXRpYmlsaXR5VmVyc2lvbnMsXG4gICAgICAgICAgUFVCTElDX1NFVFRJTkdTOiBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlBVQkxJQ19TRVRUSU5HU1xuICAgICAgICB9O1xuXG4gICAgICAgIFdlYkFwcC5jbGllbnRQcm9ncmFtc1thcmNoXSA9IHByb2dyYW07XG5cbiAgICAgICAgLy8gRXhwb3NlIHByb2dyYW0gZGV0YWlscyBhcyBhIHN0cmluZyByZWFjaGFibGUgdmlhIHRoZSBmb2xsb3dpbmdcbiAgICAgICAgLy8gVVJMLlxuICAgICAgICBjb25zdCBtYW5pZmVzdFVybFByZWZpeCA9IFwiL19fXCIgKyBhcmNoLnJlcGxhY2UoL153ZWJcXC4vLCBcIlwiKTtcbiAgICAgICAgY29uc3QgbWFuaWZlc3RVcmwgPSBtYW5pZmVzdFVybFByZWZpeCArXG4gICAgICAgICAgZ2V0SXRlbVBhdGhuYW1lKFwiL21hbmlmZXN0Lmpzb25cIik7XG5cbiAgICAgICAgYWRkU3RhdGljRmlsZShtYW5pZmVzdFVybCwge1xuICAgICAgICAgIGNvbnRlbnQ6IEpTT04uc3RyaW5naWZ5KHByb2dyYW0pLFxuICAgICAgICAgIGNhY2hlYWJsZTogZmFsc2UsXG4gICAgICAgICAgaGFzaDogcHJvZ3JhbS52ZXJzaW9uLFxuICAgICAgICAgIHR5cGU6IFwianNvblwiXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICB2YXIgY2xpZW50UGF0aHMgPSBfX21ldGVvcl9ib290c3RyYXBfXy5jb25maWdKc29uLmNsaWVudFBhdGhzO1xuICAgICAgICBfLmVhY2goY2xpZW50UGF0aHMsIGZ1bmN0aW9uIChjbGllbnRQYXRoLCBhcmNoKSB7XG4gICAgICAgICAgYXJjaFBhdGhbYXJjaF0gPSBwYXRoRGlybmFtZShjbGllbnRQYXRoKTtcbiAgICAgICAgICBnZW5lcmF0ZUNsaWVudFByb2dyYW0oY2xpZW50UGF0aCwgYXJjaCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV4cG9ydGVkIGZvciB0ZXN0cy5cbiAgICAgICAgV2ViQXBwSW50ZXJuYWxzLnN0YXRpY0ZpbGVzQnlBcmNoID0gc3RhdGljRmlsZXNCeUFyY2g7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIExvZy5lcnJvcihcIkVycm9yIHJlbG9hZGluZyB0aGUgY2xpZW50IHByb2dyYW06IFwiICsgZS5zdGFjayk7XG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICBXZWJBcHBJbnRlcm5hbHMuZ2VuZXJhdGVCb2lsZXJwbGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBUaGlzIGJvaWxlcnBsYXRlIHdpbGwgYmUgc2VydmVkIHRvIHRoZSBtb2JpbGUgZGV2aWNlcyB3aGVuIHVzZWQgd2l0aFxuICAgIC8vIE1ldGVvci9Db3Jkb3ZhIGZvciB0aGUgSG90LUNvZGUgUHVzaCBhbmQgc2luY2UgdGhlIGZpbGUgd2lsbCBiZSBzZXJ2ZWQgYnlcbiAgICAvLyB0aGUgZGV2aWNlJ3Mgc2VydmVyLCBpdCBpcyBpbXBvcnRhbnQgdG8gc2V0IHRoZSBERFAgdXJsIHRvIHRoZSBhY3R1YWxcbiAgICAvLyBNZXRlb3Igc2VydmVyIGFjY2VwdGluZyBERFAgY29ubmVjdGlvbnMgYW5kIG5vdCB0aGUgZGV2aWNlJ3MgZmlsZSBzZXJ2ZXIuXG4gICAgdmFyIGRlZmF1bHRPcHRpb25zRm9yQXJjaCA9IHtcbiAgICAgICd3ZWIuY29yZG92YSc6IHtcbiAgICAgICAgcnVudGltZUNvbmZpZ092ZXJyaWRlczoge1xuICAgICAgICAgIC8vIFhYWCBXZSB1c2UgYWJzb2x1dGVVcmwoKSBoZXJlIHNvIHRoYXQgd2Ugc2VydmUgaHR0cHM6Ly9cbiAgICAgICAgICAvLyBVUkxzIHRvIGNvcmRvdmEgY2xpZW50cyBpZiBmb3JjZS1zc2wgaXMgaW4gdXNlLiBJZiB3ZSB3ZXJlXG4gICAgICAgICAgLy8gdG8gdXNlIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkwgaW5zdGVhZCBvZlxuICAgICAgICAgIC8vIGFic29sdXRlVXJsKCksIHRoZW4gQ29yZG92YSBjbGllbnRzIHdvdWxkIGltbWVkaWF0ZWx5IGdldCBhXG4gICAgICAgICAgLy8gSENQIHNldHRpbmcgdGhlaXIgRERQX0RFRkFVTFRfQ09OTkVDVElPTl9VUkwgdG9cbiAgICAgICAgICAvLyBodHRwOi8vZXhhbXBsZS5tZXRlb3IuY29tLiBUaGlzIGJyZWFrcyB0aGUgYXBwLCBiZWNhdXNlXG4gICAgICAgICAgLy8gZm9yY2Utc3NsIGRvZXNuJ3Qgc2VydmUgQ09SUyBoZWFkZXJzIG9uIDMwMlxuICAgICAgICAgIC8vIHJlZGlyZWN0cy4gKFBsdXMgaXQncyB1bmRlc2lyYWJsZSB0byBoYXZlIGNsaWVudHNcbiAgICAgICAgICAvLyBjb25uZWN0aW5nIHRvIGh0dHA6Ly9leGFtcGxlLm1ldGVvci5jb20gd2hlbiBmb3JjZS1zc2wgaXNcbiAgICAgICAgICAvLyBpbiB1c2UuKVxuICAgICAgICAgIEREUF9ERUZBVUxUX0NPTk5FQ1RJT05fVVJMOiBwcm9jZXNzLmVudi5NT0JJTEVfRERQX1VSTCB8fFxuICAgICAgICAgICAgTWV0ZW9yLmFic29sdXRlVXJsKCksXG4gICAgICAgICAgUk9PVF9VUkw6IHByb2Nlc3MuZW52Lk1PQklMRV9ST09UX1VSTCB8fFxuICAgICAgICAgICAgTWV0ZW9yLmFic29sdXRlVXJsKClcbiAgICAgICAgfVxuICAgICAgfSxcblxuICAgICAgXCJ3ZWIuYnJvd3NlclwiOiB7XG4gICAgICAgIHJ1bnRpbWVDb25maWdPdmVycmlkZXM6IHtcbiAgICAgICAgICBpc01vZGVybjogdHJ1ZSxcbiAgICAgICAgfVxuICAgICAgfSxcblxuICAgICAgXCJ3ZWIuYnJvd3Nlci5sZWdhY3lcIjoge1xuICAgICAgICBydW50aW1lQ29uZmlnT3ZlcnJpZGVzOiB7XG4gICAgICAgICAgaXNNb2Rlcm46IGZhbHNlLFxuICAgICAgICB9XG4gICAgICB9LFxuICAgIH07XG5cbiAgICBzeW5jUXVldWUucnVuVGFzayhmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0IGFsbENzcyA9IFtdO1xuXG4gICAgICBfLmVhY2goV2ViQXBwLmNsaWVudFByb2dyYW1zLCBmdW5jdGlvbiAocHJvZ3JhbSwgYXJjaE5hbWUpIHtcbiAgICAgICAgYm9pbGVycGxhdGVCeUFyY2hbYXJjaE5hbWVdID1cbiAgICAgICAgICBXZWJBcHBJbnRlcm5hbHMuZ2VuZXJhdGVCb2lsZXJwbGF0ZUluc3RhbmNlKFxuICAgICAgICAgICAgYXJjaE5hbWUsXG4gICAgICAgICAgICBwcm9ncmFtLm1hbmlmZXN0LFxuICAgICAgICAgICAgZGVmYXVsdE9wdGlvbnNGb3JBcmNoW2FyY2hOYW1lXSxcbiAgICAgICAgICApO1xuXG4gICAgICAgIGNvbnN0IGNzc0ZpbGVzID0gYm9pbGVycGxhdGVCeUFyY2hbYXJjaE5hbWVdLmJhc2VEYXRhLmNzcztcbiAgICAgICAgY3NzRmlsZXMuZm9yRWFjaChmaWxlID0+IGFsbENzcy5wdXNoKHtcbiAgICAgICAgICB1cmw6IGJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rKGZpbGUudXJsKSxcbiAgICAgICAgfSkpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIENsZWFyIHRoZSBtZW1vaXplZCBib2lsZXJwbGF0ZSBjYWNoZS5cbiAgICAgIG1lbW9pemVkQm9pbGVycGxhdGUgPSB7fTtcblxuICAgICAgV2ViQXBwSW50ZXJuYWxzLnJlZnJlc2hhYmxlQXNzZXRzID0geyBhbGxDc3MgfTtcbiAgICB9KTtcbiAgfTtcblxuICBXZWJBcHBJbnRlcm5hbHMucmVsb2FkQ2xpZW50UHJvZ3JhbXMoKTtcblxuICAvLyB3ZWJzZXJ2ZXJcbiAgdmFyIGFwcCA9IGNvbm5lY3QoKTtcblxuICAvLyBQYWNrYWdlcyBhbmQgYXBwcyBjYW4gYWRkIGhhbmRsZXJzIHRoYXQgcnVuIGJlZm9yZSBhbnkgb3RoZXIgTWV0ZW9yXG4gIC8vIGhhbmRsZXJzIHZpYSBXZWJBcHAucmF3Q29ubmVjdEhhbmRsZXJzLlxuICB2YXIgcmF3Q29ubmVjdEhhbmRsZXJzID0gY29ubmVjdCgpO1xuICBhcHAudXNlKHJhd0Nvbm5lY3RIYW5kbGVycyk7XG5cbiAgLy8gQXV0by1jb21wcmVzcyBhbnkganNvbiwgamF2YXNjcmlwdCwgb3IgdGV4dC5cbiAgYXBwLnVzZShjb21wcmVzcygpKTtcblxuICAvLyBwYXJzZSBjb29raWVzIGludG8gYW4gb2JqZWN0XG4gIGFwcC51c2UoY29va2llUGFyc2VyKCkpO1xuXG4gIC8vIFdlJ3JlIG5vdCBhIHByb3h5OyByZWplY3QgKHdpdGhvdXQgY3Jhc2hpbmcpIGF0dGVtcHRzIHRvIHRyZWF0IHVzIGxpa2VcbiAgLy8gb25lLiAoU2VlICMxMjEyLilcbiAgYXBwLnVzZShmdW5jdGlvbihyZXEsIHJlcywgbmV4dCkge1xuICAgIGlmIChSb3V0ZVBvbGljeS5pc1ZhbGlkVXJsKHJlcS51cmwpKSB7XG4gICAgICBuZXh0KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICByZXMud3JpdGUoXCJOb3QgYSBwcm94eVwiKTtcbiAgICByZXMuZW5kKCk7XG4gIH0pO1xuXG4gIC8vIFN0cmlwIG9mZiB0aGUgcGF0aCBwcmVmaXgsIGlmIGl0IGV4aXN0cy5cbiAgYXBwLnVzZShmdW5jdGlvbiAocmVxdWVzdCwgcmVzcG9uc2UsIG5leHQpIHtcbiAgICB2YXIgcGF0aFByZWZpeCA9IF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkxfUEFUSF9QUkVGSVg7XG4gICAgdmFyIHVybCA9IE5wbS5yZXF1aXJlKCd1cmwnKS5wYXJzZShyZXF1ZXN0LnVybCk7XG4gICAgdmFyIHBhdGhuYW1lID0gdXJsLnBhdGhuYW1lO1xuICAgIC8vIGNoZWNrIGlmIHRoZSBwYXRoIGluIHRoZSB1cmwgc3RhcnRzIHdpdGggdGhlIHBhdGggcHJlZml4IChhbmQgdGhlIHBhcnRcbiAgICAvLyBhZnRlciB0aGUgcGF0aCBwcmVmaXggbXVzdCBzdGFydCB3aXRoIGEgLyBpZiBpdCBleGlzdHMuKVxuICAgIGlmIChwYXRoUHJlZml4ICYmIHBhdGhuYW1lLnN1YnN0cmluZygwLCBwYXRoUHJlZml4Lmxlbmd0aCkgPT09IHBhdGhQcmVmaXggJiZcbiAgICAgICAocGF0aG5hbWUubGVuZ3RoID09IHBhdGhQcmVmaXgubGVuZ3RoXG4gICAgICAgIHx8IHBhdGhuYW1lLnN1YnN0cmluZyhwYXRoUHJlZml4Lmxlbmd0aCwgcGF0aFByZWZpeC5sZW5ndGggKyAxKSA9PT0gXCIvXCIpKSB7XG4gICAgICByZXF1ZXN0LnVybCA9IHJlcXVlc3QudXJsLnN1YnN0cmluZyhwYXRoUHJlZml4Lmxlbmd0aCk7XG4gICAgICBuZXh0KCk7XG4gICAgfSBlbHNlIGlmIChwYXRobmFtZSA9PT0gXCIvZmF2aWNvbi5pY29cIiB8fCBwYXRobmFtZSA9PT0gXCIvcm9ib3RzLnR4dFwiKSB7XG4gICAgICBuZXh0KCk7XG4gICAgfSBlbHNlIGlmIChwYXRoUHJlZml4KSB7XG4gICAgICByZXNwb25zZS53cml0ZUhlYWQoNDA0KTtcbiAgICAgIHJlc3BvbnNlLndyaXRlKFwiVW5rbm93biBwYXRoXCIpO1xuICAgICAgcmVzcG9uc2UuZW5kKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5leHQoKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIFBhcnNlIHRoZSBxdWVyeSBzdHJpbmcgaW50byByZXMucXVlcnkuIFVzZWQgYnkgb2F1dGhfc2VydmVyLCBidXQgaXQnc1xuICAvLyBnZW5lcmFsbHkgcHJldHR5IGhhbmR5Li5cbiAgYXBwLnVzZShxdWVyeSgpKTtcblxuICAvLyBTZXJ2ZSBzdGF0aWMgZmlsZXMgZnJvbSB0aGUgbWFuaWZlc3QuXG4gIC8vIFRoaXMgaXMgaW5zcGlyZWQgYnkgdGhlICdzdGF0aWMnIG1pZGRsZXdhcmUuXG4gIGFwcC51c2UoZnVuY3Rpb24gKHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgV2ViQXBwSW50ZXJuYWxzLnN0YXRpY0ZpbGVzTWlkZGxld2FyZShzdGF0aWNGaWxlc0J5QXJjaCwgcmVxLCByZXMsIG5leHQpO1xuICB9KTtcblxuICAvLyBDb3JlIE1ldGVvciBwYWNrYWdlcyBsaWtlIGR5bmFtaWMtaW1wb3J0IGNhbiBhZGQgaGFuZGxlcnMgYmVmb3JlXG4gIC8vIG90aGVyIGhhbmRsZXJzIGFkZGVkIGJ5IHBhY2thZ2UgYW5kIGFwcGxpY2F0aW9uIGNvZGUuXG4gIGFwcC51c2UoV2ViQXBwSW50ZXJuYWxzLm1ldGVvckludGVybmFsSGFuZGxlcnMgPSBjb25uZWN0KCkpO1xuXG4gIC8vIFBhY2thZ2VzIGFuZCBhcHBzIGNhbiBhZGQgaGFuZGxlcnMgdG8gdGhpcyB2aWEgV2ViQXBwLmNvbm5lY3RIYW5kbGVycy5cbiAgLy8gVGhleSBhcmUgaW5zZXJ0ZWQgYmVmb3JlIG91ciBkZWZhdWx0IGhhbmRsZXIuXG4gIHZhciBwYWNrYWdlQW5kQXBwSGFuZGxlcnMgPSBjb25uZWN0KCk7XG4gIGFwcC51c2UocGFja2FnZUFuZEFwcEhhbmRsZXJzKTtcblxuICB2YXIgc3VwcHJlc3NDb25uZWN0RXJyb3JzID0gZmFsc2U7XG4gIC8vIGNvbm5lY3Qga25vd3MgaXQgaXMgYW4gZXJyb3IgaGFuZGxlciBiZWNhdXNlIGl0IGhhcyA0IGFyZ3VtZW50cyBpbnN0ZWFkIG9mXG4gIC8vIDMuIGdvIGZpZ3VyZS4gIChJdCBpcyBub3Qgc21hcnQgZW5vdWdoIHRvIGZpbmQgc3VjaCBhIHRoaW5nIGlmIGl0J3MgaGlkZGVuXG4gIC8vIGluc2lkZSBwYWNrYWdlQW5kQXBwSGFuZGxlcnMuKVxuICBhcHAudXNlKGZ1bmN0aW9uIChlcnIsIHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgaWYgKCFlcnIgfHwgIXN1cHByZXNzQ29ubmVjdEVycm9ycyB8fCAhcmVxLmhlYWRlcnNbJ3gtc3VwcHJlc3MtZXJyb3InXSkge1xuICAgICAgbmV4dChlcnIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXMud3JpdGVIZWFkKGVyci5zdGF0dXMsIHsgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L3BsYWluJyB9KTtcbiAgICByZXMuZW5kKFwiQW4gZXJyb3IgbWVzc2FnZVwiKTtcbiAgfSk7XG5cbiAgYXBwLnVzZShmdW5jdGlvbiAocmVxLCByZXMsIG5leHQpIHtcbiAgICBpZiAoISBhcHBVcmwocmVxLnVybCkpIHtcbiAgICAgIHJldHVybiBuZXh0KCk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGhlYWRlcnMgPSB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAndGV4dC9odG1sOyBjaGFyc2V0PXV0Zi04J1xuICAgICAgfTtcblxuICAgICAgaWYgKHNodXR0aW5nRG93bikge1xuICAgICAgICBoZWFkZXJzWydDb25uZWN0aW9uJ10gPSAnQ2xvc2UnO1xuICAgICAgfVxuXG4gICAgICB2YXIgcmVxdWVzdCA9IFdlYkFwcC5jYXRlZ29yaXplUmVxdWVzdChyZXEpO1xuXG4gICAgICBpZiAocmVxdWVzdC51cmwucXVlcnkgJiYgcmVxdWVzdC51cmwucXVlcnlbJ21ldGVvcl9jc3NfcmVzb3VyY2UnXSkge1xuICAgICAgICAvLyBJbiB0aGlzIGNhc2UsIHdlJ3JlIHJlcXVlc3RpbmcgYSBDU1MgcmVzb3VyY2UgaW4gdGhlIG1ldGVvci1zcGVjaWZpY1xuICAgICAgICAvLyB3YXksIGJ1dCB3ZSBkb24ndCBoYXZlIGl0LiAgU2VydmUgYSBzdGF0aWMgY3NzIGZpbGUgdGhhdCBpbmRpY2F0ZXMgdGhhdFxuICAgICAgICAvLyB3ZSBkaWRuJ3QgaGF2ZSBpdCwgc28gd2UgY2FuIGRldGVjdCB0aGF0IGFuZCByZWZyZXNoLiAgTWFrZSBzdXJlXG4gICAgICAgIC8vIHRoYXQgYW55IHByb3hpZXMgb3IgQ0ROcyBkb24ndCBjYWNoZSB0aGlzIGVycm9yISAgKE5vcm1hbGx5IHByb3hpZXNcbiAgICAgICAgLy8gb3IgQ0ROcyBhcmUgc21hcnQgZW5vdWdoIG5vdCB0byBjYWNoZSBlcnJvciBwYWdlcywgYnV0IGluIG9yZGVyIHRvXG4gICAgICAgIC8vIG1ha2UgdGhpcyBoYWNrIHdvcmssIHdlIG5lZWQgdG8gcmV0dXJuIHRoZSBDU1MgZmlsZSBhcyBhIDIwMCwgd2hpY2hcbiAgICAgICAgLy8gd291bGQgb3RoZXJ3aXNlIGJlIGNhY2hlZC4pXG4gICAgICAgIGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddID0gJ3RleHQvY3NzOyBjaGFyc2V0PXV0Zi04JztcbiAgICAgICAgaGVhZGVyc1snQ2FjaGUtQ29udHJvbCddID0gJ25vLWNhY2hlJztcbiAgICAgICAgcmVzLndyaXRlSGVhZCgyMDAsIGhlYWRlcnMpO1xuICAgICAgICByZXMud3JpdGUoXCIubWV0ZW9yLWNzcy1ub3QtZm91bmQtZXJyb3IgeyB3aWR0aDogMHB4O31cIik7XG4gICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVxdWVzdC51cmwucXVlcnkgJiYgcmVxdWVzdC51cmwucXVlcnlbJ21ldGVvcl9qc19yZXNvdXJjZSddKSB7XG4gICAgICAgIC8vIFNpbWlsYXJseSwgd2UncmUgcmVxdWVzdGluZyBhIEpTIHJlc291cmNlIHRoYXQgd2UgZG9uJ3QgaGF2ZS5cbiAgICAgICAgLy8gU2VydmUgYW4gdW5jYWNoZWQgNDA0LiAoV2UgY2FuJ3QgdXNlIHRoZSBzYW1lIGhhY2sgd2UgdXNlIGZvciBDU1MsXG4gICAgICAgIC8vIGJlY2F1c2UgYWN0dWFsbHkgYWN0aW5nIG9uIHRoYXQgaGFjayByZXF1aXJlcyB1cyB0byBoYXZlIHRoZSBKU1xuICAgICAgICAvLyBhbHJlYWR5ISlcbiAgICAgICAgaGVhZGVyc1snQ2FjaGUtQ29udHJvbCddID0gJ25vLWNhY2hlJztcbiAgICAgICAgcmVzLndyaXRlSGVhZCg0MDQsIGhlYWRlcnMpO1xuICAgICAgICByZXMuZW5kKFwiNDA0IE5vdCBGb3VuZFwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVxdWVzdC51cmwucXVlcnkgJiYgcmVxdWVzdC51cmwucXVlcnlbJ21ldGVvcl9kb250X3NlcnZlX2luZGV4J10pIHtcbiAgICAgICAgLy8gV2hlbiBkb3dubG9hZGluZyBmaWxlcyBkdXJpbmcgYSBDb3Jkb3ZhIGhvdCBjb2RlIHB1c2gsIHdlIG5lZWRcbiAgICAgICAgLy8gdG8gZGV0ZWN0IGlmIGEgZmlsZSBpcyBub3QgYXZhaWxhYmxlIGluc3RlYWQgb2YgaW5hZHZlcnRlbnRseVxuICAgICAgICAvLyBkb3dubG9hZGluZyB0aGUgZGVmYXVsdCBpbmRleCBwYWdlLlxuICAgICAgICAvLyBTbyBzaW1pbGFyIHRvIHRoZSBzaXR1YXRpb24gYWJvdmUsIHdlIHNlcnZlIGFuIHVuY2FjaGVkIDQwNC5cbiAgICAgICAgaGVhZGVyc1snQ2FjaGUtQ29udHJvbCddID0gJ25vLWNhY2hlJztcbiAgICAgICAgcmVzLndyaXRlSGVhZCg0MDQsIGhlYWRlcnMpO1xuICAgICAgICByZXMuZW5kKFwiNDA0IE5vdCBGb3VuZFwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZ2V0Qm9pbGVycGxhdGVBc3luYyhcbiAgICAgICAgcmVxdWVzdCxcbiAgICAgICAgZ2V0QXJjaEFuZFBhdGgoXG4gICAgICAgICAgcGFyc2VSZXF1ZXN0KHJlcSkucGF0aG5hbWUsXG4gICAgICAgICAgcmVxdWVzdC5icm93c2VyLFxuICAgICAgICApLmFyY2gsXG4gICAgICApLnRoZW4oKHsgc3RyZWFtLCBzdGF0dXNDb2RlLCBoZWFkZXJzOiBuZXdIZWFkZXJzIH0pID0+IHtcbiAgICAgICAgaWYgKCFzdGF0dXNDb2RlKSB7XG4gICAgICAgICAgc3RhdHVzQ29kZSA9IHJlcy5zdGF0dXNDb2RlID8gcmVzLnN0YXR1c0NvZGUgOiAyMDA7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobmV3SGVhZGVycykge1xuICAgICAgICAgIE9iamVjdC5hc3NpZ24oaGVhZGVycywgbmV3SGVhZGVycyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXMud3JpdGVIZWFkKHN0YXR1c0NvZGUsIGhlYWRlcnMpO1xuXG4gICAgICAgIHN0cmVhbS5waXBlKHJlcywge1xuICAgICAgICAgIC8vIEVuZCB0aGUgcmVzcG9uc2Ugd2hlbiB0aGUgc3RyZWFtIGVuZHMuXG4gICAgICAgICAgZW5kOiB0cnVlLFxuICAgICAgICB9KTtcblxuICAgICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICBMb2cuZXJyb3IoXCJFcnJvciBydW5uaW5nIHRlbXBsYXRlOiBcIiArIGVycm9yLnN0YWNrKTtcbiAgICAgICAgcmVzLndyaXRlSGVhZCg1MDAsIGhlYWRlcnMpO1xuICAgICAgICByZXMuZW5kKCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIFJldHVybiA0MDQgYnkgZGVmYXVsdCwgaWYgbm8gb3RoZXIgaGFuZGxlcnMgc2VydmUgdGhpcyBVUkwuXG4gIGFwcC51c2UoZnVuY3Rpb24gKHJlcSwgcmVzKSB7XG4gICAgcmVzLndyaXRlSGVhZCg0MDQpO1xuICAgIHJlcy5lbmQoKTtcbiAgfSk7XG5cblxuICB2YXIgaHR0cFNlcnZlciA9IGNyZWF0ZVNlcnZlcihhcHApO1xuICB2YXIgb25MaXN0ZW5pbmdDYWxsYmFja3MgPSBbXTtcblxuICAvLyBBZnRlciA1IHNlY29uZHMgdy9vIGRhdGEgb24gYSBzb2NrZXQsIGtpbGwgaXQuICBPbiB0aGUgb3RoZXIgaGFuZCwgaWZcbiAgLy8gdGhlcmUncyBhbiBvdXRzdGFuZGluZyByZXF1ZXN0LCBnaXZlIGl0IGEgaGlnaGVyIHRpbWVvdXQgaW5zdGVhZCAodG8gYXZvaWRcbiAgLy8ga2lsbGluZyBsb25nLXBvbGxpbmcgcmVxdWVzdHMpXG4gIGh0dHBTZXJ2ZXIuc2V0VGltZW91dChTSE9SVF9TT0NLRVRfVElNRU9VVCk7XG5cbiAgLy8gRG8gdGhpcyBoZXJlLCBhbmQgdGhlbiBhbHNvIGluIGxpdmVkYXRhL3N0cmVhbV9zZXJ2ZXIuanMsIGJlY2F1c2VcbiAgLy8gc3RyZWFtX3NlcnZlci5qcyBraWxscyBhbGwgdGhlIGN1cnJlbnQgcmVxdWVzdCBoYW5kbGVycyB3aGVuIGluc3RhbGxpbmcgaXRzXG4gIC8vIG93bi5cbiAgaHR0cFNlcnZlci5vbigncmVxdWVzdCcsIFdlYkFwcC5fdGltZW91dEFkanVzdG1lbnRSZXF1ZXN0Q2FsbGJhY2spO1xuXG4gIC8vIElmIHRoZSBjbGllbnQgZ2F2ZSB1cyBhIGJhZCByZXF1ZXN0LCB0ZWxsIGl0IGluc3RlYWQgb2YganVzdCBjbG9zaW5nIHRoZVxuICAvLyBzb2NrZXQuIFRoaXMgbGV0cyBsb2FkIGJhbGFuY2VycyBpbiBmcm9udCBvZiB1cyBkaWZmZXJlbnRpYXRlIGJldHdlZW4gXCJhXG4gIC8vIHNlcnZlciBpcyByYW5kb21seSBjbG9zaW5nIHNvY2tldHMgZm9yIG5vIHJlYXNvblwiIGFuZCBcImNsaWVudCBzZW50IGEgYmFkXG4gIC8vIHJlcXVlc3RcIi5cbiAgLy9cbiAgLy8gVGhpcyB3aWxsIG9ubHkgd29yayBvbiBOb2RlIDY7IE5vZGUgNCBkZXN0cm95cyB0aGUgc29ja2V0IGJlZm9yZSBjYWxsaW5nXG4gIC8vIHRoaXMgZXZlbnQuIFNlZSBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvcHVsbC80NTU3LyBmb3IgZGV0YWlscy5cbiAgaHR0cFNlcnZlci5vbignY2xpZW50RXJyb3InLCAoZXJyLCBzb2NrZXQpID0+IHtcbiAgICAvLyBQcmUtTm9kZS02LCBkbyBub3RoaW5nLlxuICAgIGlmIChzb2NrZXQuZGVzdHJveWVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKGVyci5tZXNzYWdlID09PSAnUGFyc2UgRXJyb3InKSB7XG4gICAgICBzb2NrZXQuZW5kKCdIVFRQLzEuMSA0MDAgQmFkIFJlcXVlc3RcXHJcXG5cXHJcXG4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRm9yIG90aGVyIGVycm9ycywgdXNlIHRoZSBkZWZhdWx0IGJlaGF2aW9yIGFzIGlmIHdlIGhhZCBubyBjbGllbnRFcnJvclxuICAgICAgLy8gaGFuZGxlci5cbiAgICAgIHNvY2tldC5kZXN0cm95KGVycik7XG4gICAgfVxuICB9KTtcblxuICAvLyBzdGFydCB1cCBhcHBcbiAgXy5leHRlbmQoV2ViQXBwLCB7XG4gICAgY29ubmVjdEhhbmRsZXJzOiBwYWNrYWdlQW5kQXBwSGFuZGxlcnMsXG4gICAgcmF3Q29ubmVjdEhhbmRsZXJzOiByYXdDb25uZWN0SGFuZGxlcnMsXG4gICAgaHR0cFNlcnZlcjogaHR0cFNlcnZlcixcbiAgICBjb25uZWN0QXBwOiBhcHAsXG4gICAgLy8gRm9yIHRlc3RpbmcuXG4gICAgc3VwcHJlc3NDb25uZWN0RXJyb3JzOiBmdW5jdGlvbiAoKSB7XG4gICAgICBzdXBwcmVzc0Nvbm5lY3RFcnJvcnMgPSB0cnVlO1xuICAgIH0sXG4gICAgb25MaXN0ZW5pbmc6IGZ1bmN0aW9uIChmKSB7XG4gICAgICBpZiAob25MaXN0ZW5pbmdDYWxsYmFja3MpXG4gICAgICAgIG9uTGlzdGVuaW5nQ2FsbGJhY2tzLnB1c2goZik7XG4gICAgICBlbHNlXG4gICAgICAgIGYoKTtcbiAgICB9LFxuICAgIC8vIFRoaXMgY2FuIGJlIG92ZXJyaWRkZW4gYnkgdXNlcnMgd2hvIHdhbnQgdG8gbW9kaWZ5IGhvdyBsaXN0ZW5pbmcgd29ya3NcbiAgICAvLyAoZWcsIHRvIHJ1biBhIHByb3h5IGxpa2UgQXBvbGxvIEVuZ2luZSBQcm94eSBpbiBmcm9udCBvZiB0aGUgc2VydmVyKS5cbiAgICBzdGFydExpc3RlbmluZzogZnVuY3Rpb24gKGh0dHBTZXJ2ZXIsIGxpc3Rlbk9wdGlvbnMsIGNiKSB7XG4gICAgICBodHRwU2VydmVyLmxpc3RlbihsaXN0ZW5PcHRpb25zLCBjYik7XG4gICAgfSxcbiAgfSk7XG5cbiAgLy8gTGV0IHRoZSByZXN0IG9mIHRoZSBwYWNrYWdlcyAoYW5kIE1ldGVvci5zdGFydHVwIGhvb2tzKSBpbnNlcnQgY29ubmVjdFxuICAvLyBtaWRkbGV3YXJlcyBhbmQgdXBkYXRlIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18sIHRoZW4ga2VlcCBnb2luZyB0byBzZXQgdXBcbiAgLy8gYWN0dWFsbHkgc2VydmluZyBIVE1MLlxuICBleHBvcnRzLm1haW4gPSBhcmd2ID0+IHtcbiAgICBXZWJBcHBJbnRlcm5hbHMuZ2VuZXJhdGVCb2lsZXJwbGF0ZSgpO1xuXG4gICAgY29uc3Qgc3RhcnRIdHRwU2VydmVyID0gbGlzdGVuT3B0aW9ucyA9PiB7XG4gICAgICBXZWJBcHAuc3RhcnRMaXN0ZW5pbmcoaHR0cFNlcnZlciwgbGlzdGVuT3B0aW9ucywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7XG4gICAgICAgIGlmIChwcm9jZXNzLmVudi5NRVRFT1JfUFJJTlRfT05fTElTVEVOKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJMSVNURU5JTkdcIik7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY2FsbGJhY2tzID0gb25MaXN0ZW5pbmdDYWxsYmFja3M7XG4gICAgICAgIG9uTGlzdGVuaW5nQ2FsbGJhY2tzID0gbnVsbDtcbiAgICAgICAgY2FsbGJhY2tzLmZvckVhY2goY2FsbGJhY2sgPT4geyBjYWxsYmFjaygpOyB9KTtcbiAgICAgIH0sIGUgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiRXJyb3IgbGlzdGVuaW5nOlwiLCBlKTtcbiAgICAgICAgY29uc29sZS5lcnJvcihlICYmIGUuc3RhY2spO1xuICAgICAgfSkpO1xuICAgIH07XG5cbiAgICBsZXQgbG9jYWxQb3J0ID0gcHJvY2Vzcy5lbnYuUE9SVCB8fCAwO1xuICAgIGNvbnN0IHVuaXhTb2NrZXRQYXRoID0gcHJvY2Vzcy5lbnYuVU5JWF9TT0NLRVRfUEFUSDtcblxuICAgIGlmICh1bml4U29ja2V0UGF0aCkge1xuICAgICAgLy8gU3RhcnQgdGhlIEhUVFAgc2VydmVyIHVzaW5nIGEgc29ja2V0IGZpbGUuXG4gICAgICByZW1vdmVFeGlzdGluZ1NvY2tldEZpbGUodW5peFNvY2tldFBhdGgpO1xuICAgICAgc3RhcnRIdHRwU2VydmVyKHsgcGF0aDogdW5peFNvY2tldFBhdGggfSk7XG4gICAgICByZWdpc3RlclNvY2tldEZpbGVDbGVhbnVwKHVuaXhTb2NrZXRQYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9jYWxQb3J0ID0gaXNOYU4oTnVtYmVyKGxvY2FsUG9ydCkpID8gbG9jYWxQb3J0IDogTnVtYmVyKGxvY2FsUG9ydCk7XG4gICAgICBpZiAoL1xcXFxcXFxcPy4rXFxcXHBpcGVcXFxcPy4rLy50ZXN0KGxvY2FsUG9ydCkpIHtcbiAgICAgICAgLy8gU3RhcnQgdGhlIEhUVFAgc2VydmVyIHVzaW5nIFdpbmRvd3MgU2VydmVyIHN0eWxlIG5hbWVkIHBpcGUuXG4gICAgICAgIHN0YXJ0SHR0cFNlcnZlcih7IHBhdGg6IGxvY2FsUG9ydCB9KTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGxvY2FsUG9ydCA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAvLyBTdGFydCB0aGUgSFRUUCBzZXJ2ZXIgdXNpbmcgVENQLlxuICAgICAgICBzdGFydEh0dHBTZXJ2ZXIoe1xuICAgICAgICAgIHBvcnQ6IGxvY2FsUG9ydCxcbiAgICAgICAgICBob3N0OiBwcm9jZXNzLmVudi5CSU5EX0lQIHx8IFwiMC4wLjAuMFwiXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBQT1JUIHNwZWNpZmllZFwiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gXCJEQUVNT05cIjtcbiAgfTtcbn1cblxuXG5ydW5XZWJBcHBTZXJ2ZXIoKTtcblxuXG52YXIgaW5saW5lU2NyaXB0c0FsbG93ZWQgPSB0cnVlO1xuXG5XZWJBcHBJbnRlcm5hbHMuaW5saW5lU2NyaXB0c0FsbG93ZWQgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBpbmxpbmVTY3JpcHRzQWxsb3dlZDtcbn07XG5cbldlYkFwcEludGVybmFscy5zZXRJbmxpbmVTY3JpcHRzQWxsb3dlZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpbmxpbmVTY3JpcHRzQWxsb3dlZCA9IHZhbHVlO1xuICBXZWJBcHBJbnRlcm5hbHMuZ2VuZXJhdGVCb2lsZXJwbGF0ZSgpO1xufTtcblxuXG5XZWJBcHBJbnRlcm5hbHMuc2V0QnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2sgPSBmdW5jdGlvbiAoaG9va0ZuKSB7XG4gIGJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rID0gaG9va0ZuO1xuICBXZWJBcHBJbnRlcm5hbHMuZ2VuZXJhdGVCb2lsZXJwbGF0ZSgpO1xufTtcblxuV2ViQXBwSW50ZXJuYWxzLnNldEJ1bmRsZWRKc0Nzc1ByZWZpeCA9IGZ1bmN0aW9uIChwcmVmaXgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLnNldEJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rKFxuICAgIGZ1bmN0aW9uICh1cmwpIHtcbiAgICAgIHJldHVybiBwcmVmaXggKyB1cmw7XG4gIH0pO1xufTtcblxuLy8gUGFja2FnZXMgY2FuIGNhbGwgYFdlYkFwcEludGVybmFscy5hZGRTdGF0aWNKc2AgdG8gc3BlY2lmeSBzdGF0aWNcbi8vIEphdmFTY3JpcHQgdG8gYmUgaW5jbHVkZWQgaW4gdGhlIGFwcC4gVGhpcyBzdGF0aWMgSlMgd2lsbCBiZSBpbmxpbmVkLFxuLy8gdW5sZXNzIGlubGluZSBzY3JpcHRzIGhhdmUgYmVlbiBkaXNhYmxlZCwgaW4gd2hpY2ggY2FzZSBpdCB3aWxsIGJlXG4vLyBzZXJ2ZWQgdW5kZXIgYC88c2hhMSBvZiBjb250ZW50cz5gLlxudmFyIGFkZGl0aW9uYWxTdGF0aWNKcyA9IHt9O1xuV2ViQXBwSW50ZXJuYWxzLmFkZFN0YXRpY0pzID0gZnVuY3Rpb24gKGNvbnRlbnRzKSB7XG4gIGFkZGl0aW9uYWxTdGF0aWNKc1tcIi9cIiArIHNoYTEoY29udGVudHMpICsgXCIuanNcIl0gPSBjb250ZW50cztcbn07XG5cbi8vIEV4cG9ydGVkIGZvciB0ZXN0c1xuV2ViQXBwSW50ZXJuYWxzLmdldEJvaWxlcnBsYXRlID0gZ2V0Qm9pbGVycGxhdGU7XG5XZWJBcHBJbnRlcm5hbHMuYWRkaXRpb25hbFN0YXRpY0pzID0gYWRkaXRpb25hbFN0YXRpY0pzO1xuIiwiaW1wb3J0IG5wbUNvbm5lY3QgZnJvbSBcImNvbm5lY3RcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbm5lY3QoLi4uY29ubmVjdEFyZ3MpIHtcbiAgY29uc3QgaGFuZGxlcnMgPSBucG1Db25uZWN0LmFwcGx5KHRoaXMsIGNvbm5lY3RBcmdzKTtcbiAgY29uc3Qgb3JpZ2luYWxVc2UgPSBoYW5kbGVycy51c2U7XG5cbiAgLy8gV3JhcCB0aGUgaGFuZGxlcnMudXNlIG1ldGhvZCBzbyB0aGF0IGFueSBwcm92aWRlZCBoYW5kbGVyIGZ1bmN0aW9uc1xuICAvLyBhbHdheSBydW4gaW4gYSBGaWJlci5cbiAgaGFuZGxlcnMudXNlID0gZnVuY3Rpb24gdXNlKC4uLnVzZUFyZ3MpIHtcbiAgICBjb25zdCB7IHN0YWNrIH0gPSB0aGlzO1xuICAgIGNvbnN0IG9yaWdpbmFsTGVuZ3RoID0gc3RhY2subGVuZ3RoO1xuICAgIGNvbnN0IHJlc3VsdCA9IG9yaWdpbmFsVXNlLmFwcGx5KHRoaXMsIHVzZUFyZ3MpO1xuXG4gICAgLy8gSWYgd2UganVzdCBhZGRlZCBhbnl0aGluZyB0byB0aGUgc3RhY2ssIHdyYXAgZWFjaCBuZXcgZW50cnkuaGFuZGxlXG4gICAgLy8gd2l0aCBhIGZ1bmN0aW9uIHRoYXQgY2FsbHMgUHJvbWlzZS5hc3luY0FwcGx5IHRvIGVuc3VyZSB0aGVcbiAgICAvLyBvcmlnaW5hbCBoYW5kbGVyIHJ1bnMgaW4gYSBGaWJlci5cbiAgICBmb3IgKGxldCBpID0gb3JpZ2luYWxMZW5ndGg7IGkgPCBzdGFjay5sZW5ndGg7ICsraSkge1xuICAgICAgY29uc3QgZW50cnkgPSBzdGFja1tpXTtcbiAgICAgIGNvbnN0IG9yaWdpbmFsSGFuZGxlID0gZW50cnkuaGFuZGxlO1xuXG4gICAgICBpZiAob3JpZ2luYWxIYW5kbGUubGVuZ3RoID49IDQpIHtcbiAgICAgICAgLy8gSWYgdGhlIG9yaWdpbmFsIGhhbmRsZSBoYWQgZm91ciAob3IgbW9yZSkgcGFyYW1ldGVycywgdGhlXG4gICAgICAgIC8vIHdyYXBwZXIgbXVzdCBhbHNvIGhhdmUgZm91ciBwYXJhbWV0ZXJzLCBzaW5jZSBjb25uZWN0IHVzZXNcbiAgICAgICAgLy8gaGFuZGxlLmxlbmd0aCB0byBkZXJtaW5lIHdoZXRoZXIgdG8gcGFzcyB0aGUgZXJyb3IgYXMgdGhlIGZpcnN0XG4gICAgICAgIC8vIGFyZ3VtZW50IHRvIHRoZSBoYW5kbGUgZnVuY3Rpb24uXG4gICAgICAgIGVudHJ5LmhhbmRsZSA9IGZ1bmN0aW9uIGhhbmRsZShlcnIsIHJlcSwgcmVzLCBuZXh0KSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UuYXN5bmNBcHBseShvcmlnaW5hbEhhbmRsZSwgdGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVudHJ5LmhhbmRsZSA9IGZ1bmN0aW9uIGhhbmRsZShyZXEsIHJlcywgbmV4dCkge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLmFzeW5jQXBwbHkob3JpZ2luYWxIYW5kbGUsIHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICByZXR1cm4gaGFuZGxlcnM7XG59XG4iLCJpbXBvcnQgeyBzdGF0U3luYywgdW5saW5rU3luYywgZXhpc3RzU3luYyB9IGZyb20gJ2ZzJztcblxuLy8gU2luY2UgYSBuZXcgc29ja2V0IGZpbGUgd2lsbCBiZSBjcmVhdGVkIHdoZW4gdGhlIEhUVFAgc2VydmVyXG4vLyBzdGFydHMgdXAsIGlmIGZvdW5kIHJlbW92ZSB0aGUgZXhpc3RpbmcgZmlsZS5cbi8vXG4vLyBXQVJOSU5HOlxuLy8gVGhpcyB3aWxsIHJlbW92ZSB0aGUgY29uZmlndXJlZCBzb2NrZXQgZmlsZSB3aXRob3V0IHdhcm5pbmcuIElmXG4vLyB0aGUgY29uZmlndXJlZCBzb2NrZXQgZmlsZSBpcyBhbHJlYWR5IGluIHVzZSBieSBhbm90aGVyIGFwcGxpY2F0aW9uLFxuLy8gaXQgd2lsbCBzdGlsbCBiZSByZW1vdmVkLiBOb2RlIGRvZXMgbm90IHByb3ZpZGUgYSByZWxpYWJsZSB3YXkgdG9cbi8vIGRpZmZlcmVudGlhdGUgYmV0d2VlbiBhIHNvY2tldCBmaWxlIHRoYXQgaXMgYWxyZWFkeSBpbiB1c2UgYnlcbi8vIGFub3RoZXIgYXBwbGljYXRpb24gb3IgYSBzdGFsZSBzb2NrZXQgZmlsZSB0aGF0IGhhcyBiZWVuXG4vLyBsZWZ0IG92ZXIgYWZ0ZXIgYSBTSUdLSUxMLiBTaW5jZSB3ZSBoYXZlIG5vIHJlbGlhYmxlIHdheSB0b1xuLy8gZGlmZmVyZW50aWF0ZSBiZXR3ZWVuIHRoZXNlIHR3byBzY2VuYXJpb3MsIHRoZSBiZXN0IGNvdXJzZSBvZlxuLy8gYWN0aW9uIGR1cmluZyBzdGFydHVwIGlzIHRvIHJlbW92ZSBhbnkgZXhpc3Rpbmcgc29ja2V0IGZpbGUuIFRoaXNcbi8vIGlzIG5vdCB0aGUgc2FmZXN0IGNvdXJzZSBvZiBhY3Rpb24gYXMgcmVtb3ZpbmcgdGhlIGV4aXN0aW5nIHNvY2tldFxuLy8gZmlsZSBjb3VsZCBpbXBhY3QgYW4gYXBwbGljYXRpb24gdXNpbmcgaXQsIGJ1dCB0aGlzIGFwcHJvYWNoIGhlbHBzXG4vLyBlbnN1cmUgdGhlIEhUVFAgc2VydmVyIGNhbiBzdGFydHVwIHdpdGhvdXQgbWFudWFsXG4vLyBpbnRlcnZlbnRpb24gKGUuZy4gYXNraW5nIGZvciB0aGUgdmVyaWZpY2F0aW9uIGFuZCBjbGVhbnVwIG9mIHNvY2tldFxuLy8gZmlsZXMgYmVmb3JlIGFsbG93aW5nIHRoZSBIVFRQIHNlcnZlciB0byBiZSBzdGFydGVkKS5cbi8vXG4vLyBUaGUgYWJvdmUgYmVpbmcgc2FpZCwgYXMgbG9uZyBhcyB0aGUgc29ja2V0IGZpbGUgcGF0aCBpc1xuLy8gY29uZmlndXJlZCBjYXJlZnVsbHkgd2hlbiB0aGUgYXBwbGljYXRpb24gaXMgZGVwbG95ZWQgKGFuZCBleHRyYVxuLy8gY2FyZSBpcyB0YWtlbiB0byBtYWtlIHN1cmUgdGhlIGNvbmZpZ3VyZWQgcGF0aCBpcyB1bmlxdWUgYW5kIGRvZXNuJ3Rcbi8vIGNvbmZsaWN0IHdpdGggYW5vdGhlciBzb2NrZXQgZmlsZSBwYXRoKSwgdGhlbiB0aGVyZSBzaG91bGQgbm90IGJlXG4vLyBhbnkgaXNzdWVzIHdpdGggdGhpcyBhcHByb2FjaC5cbmV4cG9ydCBjb25zdCByZW1vdmVFeGlzdGluZ1NvY2tldEZpbGUgPSAoc29ja2V0UGF0aCkgPT4ge1xuICB0cnkge1xuICAgIGlmIChzdGF0U3luYyhzb2NrZXRQYXRoKS5pc1NvY2tldCgpKSB7XG4gICAgICAvLyBTaW5jZSBhIG5ldyBzb2NrZXQgZmlsZSB3aWxsIGJlIGNyZWF0ZWQsIHJlbW92ZSB0aGUgZXhpc3RpbmdcbiAgICAgIC8vIGZpbGUuXG4gICAgICB1bmxpbmtTeW5jKHNvY2tldFBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBBbiBleGlzdGluZyBmaWxlIHdhcyBmb3VuZCBhdCBcIiR7c29ja2V0UGF0aH1cIiBhbmQgaXQgaXMgbm90IGAgK1xuICAgICAgICAnYSBzb2NrZXQgZmlsZS4gUGxlYXNlIGNvbmZpcm0gUE9SVCBpcyBwb2ludGluZyB0byB2YWxpZCBhbmQgJyArXG4gICAgICAgICd1bi11c2VkIHNvY2tldCBmaWxlIHBhdGguJ1xuICAgICAgKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgLy8gSWYgdGhlcmUgaXMgbm8gZXhpc3Rpbmcgc29ja2V0IGZpbGUgdG8gY2xlYW51cCwgZ3JlYXQsIHdlJ2xsXG4gICAgLy8gY29udGludWUgbm9ybWFsbHkuIElmIHRoZSBjYXVnaHQgZXhjZXB0aW9uIHJlcHJlc2VudHMgYW55IG90aGVyXG4gICAgLy8gaXNzdWUsIHJlLXRocm93LlxuICAgIGlmIChlcnJvci5jb2RlICE9PSAnRU5PRU5UJykge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG59O1xuXG4vLyBSZW1vdmUgdGhlIHNvY2tldCBmaWxlIHdoZW4gZG9uZSB0byBhdm9pZCBsZWF2aW5nIGJlaGluZCBhIHN0YWxlIG9uZS5cbi8vIE5vdGUgLSBhIHN0YWxlIHNvY2tldCBmaWxlIGlzIHN0aWxsIGxlZnQgYmVoaW5kIGlmIHRoZSBydW5uaW5nIG5vZGVcbi8vIHByb2Nlc3MgaXMga2lsbGVkIHZpYSBzaWduYWwgOSAtIFNJR0tJTEwuXG5leHBvcnQgY29uc3QgcmVnaXN0ZXJTb2NrZXRGaWxlQ2xlYW51cCA9XG4gIChzb2NrZXRQYXRoLCBldmVudEVtaXR0ZXIgPSBwcm9jZXNzKSA9PiB7XG4gICAgWydleGl0JywgJ1NJR0lOVCcsICdTSUdIVVAnLCAnU0lHVEVSTSddLmZvckVhY2goc2lnbmFsID0+IHtcbiAgICAgIGV2ZW50RW1pdHRlci5vbihzaWduYWwsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT4ge1xuICAgICAgICBpZiAoZXhpc3RzU3luYyhzb2NrZXRQYXRoKSkge1xuICAgICAgICAgIHVubGlua1N5bmMoc29ja2V0UGF0aCk7XG4gICAgICAgIH1cbiAgICAgIH0pKTtcbiAgICB9KTtcbiAgfTtcbiJdfQ==
