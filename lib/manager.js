/* jshint maxparams:4 */
'use strict';
var State = require('./state.js');
var extend = require('util-extend');
var Iframe = require('./iframe.js');
var PluginApi = require('gardr-core-plugin').PluginApi;
var xde = require('cross-domain-events');
var queryParams = require('query-params');
var eventListener = require('eventlistener');

var requiredOpts = ['iframeUrl'];


function getLogLevel(hash) {
    hash = hash || '';
    var params = queryParams.decode(hash.replace(/^#/, ''));
    if (params.loglevel) {
        return parseInt(params.loglevel, 10);
    }
    return 0;
}

function getLogTo(hash) {
    hash = hash || '';
    var params = queryParams.decode(hash.replace(/^#/, ''));
    return params.logto;
}

function addItemCallback (item, callback) {
    if (typeof callback != 'function') {
        return;
    }
    item._callbacks = item._callbacks || [];
    item._callbacks.push(callback);
}

function getItemCallbacks (item) {
    return item._callbacks || [];
}

function Manager(options, pluginHandler) {
    this.items = [];
    this.itemConfigs = {};

    options = options || {};
    this.callbacks = {};
    this.inject = {};

    this.flags = {};
    options.urlFragment = options.urlFragment || global.location.hash;
    this.logLevel = getLogLevel(options.urlFragment);
    this.logTo = getLogTo(options.urlFragment);

    if (this.logLevel > 0) {
        this.inject.loglevel=this.logLevel;
        if (this.logTo)  { this.inject.logto=this.logTo; }
    }

    requiredOpts.forEach(function (requiredOption) {
        if (!options[requiredOption]) { throw new Error('mising option for ' + requiredOption); }
        this[requiredOption] = options[requiredOption];
    }.bind(this));

    this.pluginApi = new PluginApi();
    pluginHandler.initPlugins(this.pluginApi, options);

    /*
        (ios-fix) backbutton cache buster, reload all ads.
    */

    eventListener.add(global, 'pageshow', function(e){
        if(e.persisted === true){
            /*
                TODO: Need to refactor lastOrder/priority to live in
                configuration instead, e.g. { name..., dependOn: ['top', 'top_ipad'] }
            */
            this.refreshAll(this.lastOrder);
        }
    }.bind(this), false);

    // this.sharedState = {};
    xde.on('rendered', function(msg) {
        var item = this._getById(msg.data.id);
        if (item) {
            // copy all attributes from banner,
            // but maintain times, since its reserved
            var times = item.rendered.times;
            extend(item.rendered, msg.data);
            item.rendered.times = times;

            this._resolve(item);
        }
    }.bind(this));
}
Manager._xde = xde;
Manager._Iframe = Iframe;
Manager._setIframe = function (newIframe) {
    Iframe = newIframe;
};

var proto = Manager.prototype;

proto.extendInframeData = function (o) {
    if (o) {
        extend(this.inject, o);
    }
};

proto._get = function (name) {
    return this.items.filter(function(item){
        return item.name === name;
    });
};

proto._getById = function(id) {
    for(var i=0, l=this.items.length; i<l; i++) {
        if (this.items[i].id === id) { return this.items[i]; }
    }
};

proto._getConfig = function (name) {
    return this.itemConfigs[name];
};

proto.config = function (name, configData) {
    this.itemConfigs[name] = configData || {};
};

/* Add data. "Queue" banner for render. */
proto.queue = function (name, obj) {
    var input = obj || {};
    if (!name) {
        throw new Error('Can\'t queue without a name');
    }
    var config = this._getConfig(name) || {};
    if (!config.container && !input.container) {
        //throw new Error('Can\'t queue without a container');
        input.container = document.body.appendChild( document.createElement('div') );
    }

    var item = State.create(name, extend( extend({}, config), input));
    this.pluginApi.trigger('item:queue', item);
    this.items.push(item);
};

/* Insert iframe into page. */
proto.render = function (name, cb) {

    this._forEachWithName(name, function (item) {
        if (item.isActive()) { return; }

        if (!item.isViewable()) {
            // Cleanup and set item to be destroyed after callback
            item.iframe = null;
            item.options.container = null;
            item.set(State.DESTROYED);
            return this._resolve(item, new Error('Container missing from document'), true);
        }

        addItemCallback(item, cb);

        if (!item) {
            return this._failed(item, name + ' missing item');
        }
        if (!item.options.container || !item.options.url) {
            item.set(State.INCOMPLETE);
            return this._failed(item, name + ' missing queued config');
        }

        if (typeof item.options.container == 'string') {
            item.options.container = document.getElementById(item.options.container);
            if (!item.options.container) {
                return this._failed(item, name + ' missing container');
            }
        }

        this.pluginApi.trigger('item:beforerender', item);
        this.createIframe(item);

        item.set(State.ACTIVE);
        item.options.container.appendChild(item.iframe.wrapper);
    });
};

function commaStringToArray(list) {
    if (typeof list != 'string') {
        return [];
    }
    return list.split(',');
}

proto.renderAll = function(prioritized, cb) {
    if (typeof prioritized == 'function') {
        cb = prioritized;
        prioritized = undefined;
    }
    this.lastOrder = prioritized;

    var pri = commaStringToArray(prioritized);
    var loop = function () {
        if(pri.length > 0) {
            this.render(pri.shift(), function() {
                cb.apply(this, arguments);
                loop();
            });
        } else {
            this._renderUntouched(cb);
        }
    }.bind(this);

    loop();
};

proto._getItemData = function (item) {
    return extend(item.getData(), this.inject);
};

proto.createIframe = function (item) {
    if (!item.iframe) {
        // todo, check if actually iframe is on different domain
        item.iframe = new Iframe(item.id, {
            iframeUrl: this.iframeUrl,
            width: item.options.width,
            height: item.options.height,
            hidden: item.options.hidden,
            classes: '',
            data: this._getItemData(item)
        });

        item.iframe.makeIframe();
    }
};

proto._setCallback = function(name, cb) {
    var list = this.callbacks[name];
    if (!this.callbacks[name]) {
        list = this.callbacks[name] = [];
    }
    if (typeof cb == 'function') {
        list.push(cb);
    }
};

proto._runCallbacks = function(item, args) {
    var list = getItemCallbacks(item) || [];

    var length = list.length;
    while (length > 0) {
        list.shift().apply(global, args);
        length--;
    }
};

proto._resolve = function(item, error, ignoreNewState) {
    var type = 'done';
    if (error) { type = 'fail'; }

    if (item && ignoreNewState !== true) {
        item.rendered.times++;
        item.set(State.RESOLVED);
    }
    this.pluginApi.trigger('item:afterrender', item);
    if (item && typeof item.options[type] == 'function'){
        item.options[type](error, item);
    }
    if (item && item.isResolved() || error) {

        if (item.state === State.DESTROYED) {
            this.items = this.items.filter(function(_item) {
                return item !== _item;
            });
        }

        this._runCallbacks(item, [error, item]);
    }
};

proto._failed = function (item, message){
    if (item){
        item.set(State.FAILED);
    }
    this._resolve(item, new Error(message), true);
};

proto._checkResolvedStatus = function() {
    return this.items.every(function (item) {
        return item.isResolved();
    });
};

proto._forEachItem = function (fn) {
    this.items.forEach(fn.bind(this));
};

proto._forEachWithName = function (name, fn) {
    this._get(name).forEach(fn.bind(this));
};

proto._renderUntouched = function (cb) {
    this._forEachItem(function(item){
        if ( item.isActive() === false ){
            this.render(item.name, cb);
        }
    });
};

proto._refreshUntouched = function(cb) {
    this._forEachItem(function(item){
        if ( item.needsRefresh() === true ){
            this.refresh(item.name, cb);
        }
    });
};

proto.refresh = function(name, cb) {
    this._forEachWithName(name, function (item) {
        if (!item) {
            return cb(new Error('Missing config ' + name));
        }

        addItemCallback(item, cb);

        if (!item.isUsable()) {
            // todo: change to failed with master merge, + add test
            return this._failed(item, 'item is not usable');
        }

        if (!item.isViewable()) {
            // Cleanup and set item to be destroyed after callback
            item.iframe = null;
            item.options.container = null;
            item.set(State.DESTROYED);
            return this._resolve(item, new Error('Container missing from document'), true);
        }

        if (!item.options.container ||
            !item.options.container.parentNode ||
            !document.body.contains(item.options.container)) {
        }

        item.iframe.setData( this._getItemData(item) );
        item.set(State.REFRESHING);

        try {
            xde.sendTo(item.iframe.element.contentWindow, 'refresh', {
                'hash': encodeURIComponent(
                    JSON.stringify(
                        item.iframe.data
                    )
                )
            });
        } catch (e) {
            item.iframe = null;
            item.set(State.IFRAME_BROKEN);
            return this.render(name, cb);
        }
    });
};

proto.refreshAll = function(prioritized, cb) {
    if (typeof prioritized == 'function') {
        cb = prioritized;
        prioritized = undefined;
    }

    this._forEachItem(function(item){
        item.set(State.NEEDS_REFRESH);
    });

    var pri = commaStringToArray(prioritized);
    var loop = function () {
        if(pri.length > 0) {
            this.refresh(pri.shift(), function() {
                cb.apply(this, arguments);
                loop();
            });
        } else {
            this._refreshUntouched(cb);
        }
    }.bind(this);
    loop();
};

module.exports = Manager;
