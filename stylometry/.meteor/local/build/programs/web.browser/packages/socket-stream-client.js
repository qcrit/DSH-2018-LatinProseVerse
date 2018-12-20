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
var Retry = Package.retry.Retry;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var options, SockJS;

var require = meteorInstall({"node_modules":{"meteor":{"socket-stream-client":{"browser.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/socket-stream-client/browser.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

module.export({
  ClientStream: () => ClientStream
});
let toSockjsUrl, toWebsocketUrl;
module.watch(require("./urls.js"), {
  toSockjsUrl(v) {
    toSockjsUrl = v;
  },

  toWebsocketUrl(v) {
    toWebsocketUrl = v;
  }

}, 0);
let StreamClientCommon;
module.watch(require("./common.js"), {
  StreamClientCommon(v) {
    StreamClientCommon = v;
  }

}, 1);

class ClientStream extends StreamClientCommon {
  // @param url {String} URL to Meteor app
  //   "http://subdomain.meteor.com/" or "/" or
  //   "ddp+sockjs://foo-**.meteor.com/sockjs"
  constructor(url, options) {
    super(options);

    this._initCommon(this.options); //// Constants
    // how long between hearing heartbeat from the server until we declare
    // the connection dead. heartbeats come every 45s (stream_server.js)
    //
    // NOTE: this is a older timeout mechanism. We now send heartbeats at
    // the DDP level (https://github.com/meteor/meteor/pull/1865), and
    // expect those timeouts to kill a non-responsive connection before
    // this timeout fires. This is kept around for compatibility (when
    // talking to a server that doesn't support DDP heartbeats) and can be
    // removed later.


    this.HEARTBEAT_TIMEOUT = 100 * 1000;
    this.rawUrl = url;
    this.socket = null;
    this.lastError = null;
    this.heartbeatTimer = null; // Listen to global 'online' event if we are running in a browser.
    // (IE8 does not support addEventListener)

    if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('online', this._online.bind(this), false
    /* useCapture. make FF3.6 happy. */
    ); //// Kickoff!

    this._launchConnection();
  } // data is a utf8 string. Data sent while not connected is dropped on
  // the floor, and it is up the user of this API to retransmit lost
  // messages on 'reset'


  send(data) {
    if (this.currentStatus.connected) {
      this.socket.send(data);
    }
  } // Changes where this connection points


  _changeUrl(url) {
    this.rawUrl = url;
  }

  _connected() {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }

    if (this.currentStatus.connected) {
      // already connected. do nothing. this probably shouldn't happen.
      return;
    } // update status


    this.currentStatus.status = 'connected';
    this.currentStatus.connected = true;
    this.currentStatus.retryCount = 0;
    this.statusChanged(); // fire resets. This must come after status change so that clients
    // can call send from within a reset callback.

    this.forEachCallback('reset', callback => {
      callback();
    });
  }

  _cleanup(maybeError) {
    this._clearConnectionAndHeartbeatTimers();

    if (this.socket) {
      this.socket.onmessage = this.socket.onclose = this.socket.onerror = this.socket.onheartbeat = () => {};

      this.socket.close();
      this.socket = null;
    }

    this.forEachCallback('disconnect', callback => {
      callback(maybeError);
    });
  }

  _clearConnectionAndHeartbeatTimers() {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }

    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  _heartbeat_timeout() {
    console.log('Connection timeout. No sockjs heartbeat received.');

    this._lostConnection(new this.ConnectionError("Heartbeat timed out"));
  }

  _heartbeat_received() {
    // If we've already permanently shut down this stream, the timeout is
    // already cleared, and we don't need to set it again.
    if (this._forcedToDisconnect) return;
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = setTimeout(this._heartbeat_timeout.bind(this), this.HEARTBEAT_TIMEOUT);
  }

  _sockjsProtocolsWhitelist() {
    // only allow polling protocols. no streaming.  streaming
    // makes safari spin.
    var protocolsWhitelist = ['xdr-polling', 'xhr-polling', 'iframe-xhr-polling', 'jsonp-polling']; // iOS 4 and 5 and below crash when using websockets over certain
    // proxies. this seems to be resolved with iOS 6. eg
    // https://github.com/LearnBoost/socket.io/issues/193#issuecomment-7308865.
    //
    // iOS <4 doesn't support websockets at all so sockjs will just
    // immediately fall back to http

    var noWebsockets = navigator && /iPhone|iPad|iPod/.test(navigator.userAgent) && /OS 4_|OS 5_/.test(navigator.userAgent);
    if (!noWebsockets) protocolsWhitelist = ['websocket'].concat(protocolsWhitelist);
    return protocolsWhitelist;
  }

  _launchConnection() {
    this._cleanup(); // cleanup the old socket, if there was one.


    var options = (0, _objectSpread2.default)({
      protocols_whitelist: this._sockjsProtocolsWhitelist()
    }, this.options._sockjsOptions);
    const hasSockJS = typeof SockJS === "function";
    this.socket = hasSockJS // Convert raw URL to SockJS URL each time we open a connection, so
    // that we can connect to random hostnames and get around browser
    // per-host connection limits.
    ? new SockJS(toSockjsUrl(this.rawUrl), undefined, options) : new WebSocket(toWebsocketUrl(this.rawUrl));

    this.socket.onopen = data => {
      this.lastError = null;

      this._connected();
    };

    this.socket.onmessage = data => {
      this.lastError = null;

      this._heartbeat_received();

      if (this.currentStatus.connected) {
        this.forEachCallback('message', callback => {
          callback(data.data);
        });
      }
    };

    this.socket.onclose = () => {
      Promise.resolve( // If the socket is closing because there was an error, and we
      // didn't load SockJS before, try loading it dynamically before
      // retrying the connection.
      this.lastError && !hasSockJS && module.dynamicImport("./sockjs-0.3.4.js")).done(() => {
        this._lostConnection();
      });
    };

    this.socket.onerror = error => {
      const {
        lastError
      } = this;
      this.lastError = error;
      if (lastError) return;
      console.log('stream error', error, new Date().toDateString());
    };

    this.socket.onheartbeat = () => {
      this.lastError = null;

      this._heartbeat_received();
    };

    if (this.connectionTimer) clearTimeout(this.connectionTimer);
    this.connectionTimer = setTimeout(() => {
      this._lostConnection(new this.ConnectionError("DDP connection timed out"));
    }, this.CONNECT_TIMEOUT);
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"common.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/socket-stream-client/common.js                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

module.export({
  StreamClientCommon: () => StreamClientCommon
});
let Retry;
module.watch(require("meteor/retry"), {
  Retry(v) {
    Retry = v;
  }

}, 0);
const forcedReconnectError = new Error("forced reconnect");

class StreamClientCommon {
  constructor(options) {
    this.options = (0, _objectSpread2.default)({
      retry: true
    }, options || null);
    this.ConnectionError = options && options.ConnectionError || Error;
  } // Register for callbacks.


  on(name, callback) {
    if (name !== 'message' && name !== 'reset' && name !== 'disconnect') throw new Error('unknown event type: ' + name);
    if (!this.eventCallbacks[name]) this.eventCallbacks[name] = [];
    this.eventCallbacks[name].push(callback);
  }

  forEachCallback(name, cb) {
    if (!this.eventCallbacks[name] || !this.eventCallbacks[name].length) {
      return;
    }

    this.eventCallbacks[name].forEach(cb);
  }

  _initCommon(options) {
    options = options || Object.create(null); //// Constants
    // how long to wait until we declare the connection attempt
    // failed.

    this.CONNECT_TIMEOUT = options.connectTimeoutMs || 10000;
    this.eventCallbacks = Object.create(null); // name -> [callback]

    this._forcedToDisconnect = false; //// Reactive status

    this.currentStatus = {
      status: 'connecting',
      connected: false,
      retryCount: 0
    };

    if (Package.tracker) {
      this.statusListeners = new Package.tracker.Tracker.Dependency();
    }

    this.statusChanged = () => {
      if (this.statusListeners) {
        this.statusListeners.changed();
      }
    }; //// Retry logic


    this._retry = new Retry();
    this.connectionTimer = null;
  } // Trigger a reconnect.


  reconnect(options) {
    options = options || Object.create(null);

    if (options.url) {
      this._changeUrl(options.url);
    }

    if (options._sockjsOptions) {
      this.options._sockjsOptions = options._sockjsOptions;
    }

    if (this.currentStatus.connected) {
      if (options._force || options.url) {
        this._lostConnection(forcedReconnectError);
      }

      return;
    } // if we're mid-connection, stop it.


    if (this.currentStatus.status === 'connecting') {
      // Pretend it's a clean close.
      this._lostConnection();
    }

    this._retry.clear();

    this.currentStatus.retryCount -= 1; // don't count manual retries

    this._retryNow();
  }

  disconnect(options) {
    options = options || Object.create(null); // Failed is permanent. If we're failed, don't let people go back
    // online by calling 'disconnect' then 'reconnect'.

    if (this._forcedToDisconnect) return; // If _permanent is set, permanently disconnect a stream. Once a stream
    // is forced to disconnect, it can never reconnect. This is for
    // error cases such as ddp version mismatch, where trying again
    // won't fix the problem.

    if (options._permanent) {
      this._forcedToDisconnect = true;
    }

    this._cleanup();

    this._retry.clear();

    this.currentStatus = {
      status: options._permanent ? 'failed' : 'offline',
      connected: false,
      retryCount: 0
    };
    if (options._permanent && options._error) this.currentStatus.reason = options._error;
    this.statusChanged();
  } // maybeError is set unless it's a clean protocol-level close.


  _lostConnection(maybeError) {
    this._cleanup(maybeError);

    this._retryLater(maybeError); // sets status. no need to do it here.

  } // fired when we detect that we've gone online. try to reconnect
  // immediately.


  _online() {
    // if we've requested to be offline by disconnecting, don't reconnect.
    if (this.currentStatus.status != 'offline') this.reconnect();
  }

  _retryLater(maybeError) {
    var timeout = 0;

    if (this.options.retry || maybeError === forcedReconnectError) {
      timeout = this._retry.retryLater(this.currentStatus.retryCount, this._retryNow.bind(this));
      this.currentStatus.status = 'waiting';
      this.currentStatus.retryTime = new Date().getTime() + timeout;
    } else {
      this.currentStatus.status = 'failed';
      delete this.currentStatus.retryTime;
    }

    this.currentStatus.connected = false;
    this.statusChanged();
  }

  _retryNow() {
    if (this._forcedToDisconnect) return;
    this.currentStatus.retryCount += 1;
    this.currentStatus.status = 'connecting';
    this.currentStatus.connected = false;
    delete this.currentStatus.retryTime;
    this.statusChanged();

    this._launchConnection();
  } // Get current status. Reactive.


  status() {
    if (this.statusListeners) {
      this.statusListeners.depend();
    }

    return this.currentStatus;
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sockjs-0.3.4.js":[],"urls.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/socket-stream-client/urls.js                                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  toSockjsUrl: () => toSockjsUrl,
  toWebsocketUrl: () => toWebsocketUrl
});

// @param url {String} URL to Meteor app, eg:
//   "/" or "madewith.meteor.com" or "https://foo.meteor.com"
//   or "ddp+sockjs://ddp--****-foo.meteor.com/sockjs"
// @returns {String} URL to the endpoint with the specific scheme and subPath, e.g.
// for scheme "http" and subPath "sockjs"
//   "http://subdomain.meteor.com/sockjs" or "/sockjs"
//   or "https://ddp--1234-foo.meteor.com/sockjs"
function translateUrl(url, newSchemeBase, subPath) {
  if (!newSchemeBase) {
    newSchemeBase = 'http';
  }

  if (subPath !== "sockjs" && url.startsWith("/")) {
    url = Meteor.absoluteUrl(url.substr(1));
  }

  var ddpUrlMatch = url.match(/^ddp(i?)\+sockjs:\/\//);
  var httpUrlMatch = url.match(/^http(s?):\/\//);
  var newScheme;

  if (ddpUrlMatch) {
    // Remove scheme and split off the host.
    var urlAfterDDP = url.substr(ddpUrlMatch[0].length);
    newScheme = ddpUrlMatch[1] === 'i' ? newSchemeBase : newSchemeBase + 's';
    var slashPos = urlAfterDDP.indexOf('/');
    var host = slashPos === -1 ? urlAfterDDP : urlAfterDDP.substr(0, slashPos);
    var rest = slashPos === -1 ? '' : urlAfterDDP.substr(slashPos); // In the host (ONLY!), change '*' characters into random digits. This
    // allows different stream connections to connect to different hostnames
    // and avoid browser per-hostname connection limits.

    host = host.replace(/\*/g, () => Math.floor(Math.random() * 10));
    return newScheme + '://' + host + rest;
  } else if (httpUrlMatch) {
    newScheme = !httpUrlMatch[1] ? newSchemeBase : newSchemeBase + 's';
    var urlAfterHttp = url.substr(httpUrlMatch[0].length);
    url = newScheme + '://' + urlAfterHttp;
  } // Prefix FQDNs but not relative URLs


  if (url.indexOf('://') === -1 && !url.startsWith('/')) {
    url = newSchemeBase + '://' + url;
  } // XXX This is not what we should be doing: if I have a site
  // deployed at "/foo", then DDP.connect("/") should actually connect
  // to "/", not to "/foo". "/" is an absolute path. (Contrast: if
  // deployed at "/foo", it would be reasonable for DDP.connect("bar")
  // to connect to "/foo/bar").
  //
  // We should make this properly honor absolute paths rather than
  // forcing the path to be relative to the site root. Simultaneously,
  // we should set DDP_DEFAULT_CONNECTION_URL to include the site
  // root. See also client_convenience.js #RationalizingRelativeDDPURLs


  url = Meteor._relativeToSiteRootUrl(url);
  if (url.endsWith('/')) return url + subPath;else return url + '/' + subPath;
}

function toSockjsUrl(url) {
  return translateUrl(url, 'http', 'sockjs');
}

function toWebsocketUrl(url) {
  return translateUrl(url, 'ws', 'websocket');
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ],
  eval: function () {
    return eval(arguments[0]);
  }
});

/* Exports */
Package._define("socket-stream-client");

})();
