/* jshint maxparams:4 */
'use strict';
var State = require('./state.js');
var extend = require('util-extend');
var Iframe = require('./iframe.js');
var xde = require('cross-domain-events');
var queryParams = require('query-params');
var eventListener = require('eventlistener');


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

function Manager(options) {
    this.items = [];
    this.itemConfigs = {};

    options = options || {};
    this.callbacks = {};
    this.__inject = {};
    if (options.deactivateCDFS === true) {
        this.__inject.cdfs = options.deactivateCDFS;
    }

    this.flags = {};
    options.urlFragment = options.urlFragment || global.location.hash;
    this.logLevel = getLogLevel(options.urlFragment);
    this.logTo = getLogTo(options.urlFragment);

    if (this.logLevel > 0) {
        this.__inject.loglevel=this.logLevel;
        if (this.logTo)  { this.__inject.logto=this.logTo; }
    }

    // TODO: remove this fallbacks
    if (!options.iframeUrl) {
        throw new Error('mising option for iframeUrl');
    }
    this.iframeUrl = options.iframeUrl;

    if (!options.sameDomainIframeUrl) {
        options.sameDomainIframeUrl = this.iframeUrl;
    }

    var manager = this;

    /*
        (ios-fix) backbutton cache buster, reload all ads.
    */

    eventListener.add(global, 'pageshow', function(e){
        if(e.persisted === true){
            /*
                TODO: Need to refactor lastOrder/priority to live in
                configuration instead, e.g. { name..., dependOn: ['top', 'top_ipad'] }
            */
            manager.refreshAll(this.lastOrder);
        }
    }, false);

    // this.sharedState = {};
    xde.on('rendered', function(msg) {
        var item = this._getById(msg.data.id);
        if (item) {
            item.rendered.width = msg.data.width;
            item.rendered.height = msg.data.height;
            this._resolve(item);
        }
    }.bind(this));
}
/*if (Object.defineProperty) {
    Object.defineProperty(Manager, '_xde', {
        get: function () {
            return xde;
        }
    });
}*/
Manager._xde = xde;
Manager._Iframe = Iframe;
Manager._setIframe = function (newIframe) {
    Iframe = newIframe;
};

var proto = Manager.prototype;

/*proto._delegate = function (msg, item) {
    switch (msg.cmd) {
    case 'set':
        item.com({
            result: (this.flags[msg.key] = msg.value),
            cmd: 'callback',
            index: msg.index
        });
        break;
    case 'fail':
        item.iframe.addFailedClass();
        this._fail(msg.id, msg.message);
        break;
    case 'get':
        item.com({
            result: this.flags[msg.key],
            cmd: 'callback',
            index: msg.index
        });
        break;
    case 'sizes':
        // TODO refactor out and test. check if minsize
        // check if minsize
        item.input.width = msg.w;
        item.input.height = msg.h;
        this._resolve(msg.id);
        break;
    case 'debug':
        this.debug = this.debug||[];
        this.debug.push(msg);
        break;

    default:
        if (global.console) {
            global.console.log('Missing action for', msg.cmd, msg);
        }
        break;

    }
};*/

proto.extendInframeData = function (o) {
    if (o) {
        extend(this.__inject, o);
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
    this.items.push(item);
};

/* Insert iframe into page. */
proto.render = function (name, cb) {

    this._forEachWithName(name, function (item) {
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

        this.createIframe(item);

        if (item.isActive()) {
            if (item.isResolved()) {
                setTimeout(function () {
                    this._runCallbacks(item, [null, item]);
                }.bind(this), 0);
            }
        } else {
            item.set(State.ACTIVE);
            item.options.container.appendChild(item.iframe.wrapper);

        }
        //return item;
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
    var manager = this;
    function loop() {

        if(pri.length > 0) {
            manager.render(pri.shift(), function() {
                cb.apply(this, arguments);
                loop();
            });
        } else {
            manager._renderUntouched(cb);
        }
    }

    loop();
};

proto._getItemData = function (item) {
    return extend(item.getData(), this.__inject);
};

proto.createIframe = function (item) {
    if (!item.iframe) {
        // todo, check if actually iframe is on different domain
        item.iframe = new Iframe(item.id, {
            iframeUrl: this.iframeUrl,
            width: item.options.width,
            height: item.options.height,
            hidden: item.options.hidden,
            classes: ''
        });

        item.iframe.setData( this._getItemData(item) );
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
    if (item && typeof item.options[type] == 'function'){
        item.options[type](error, item);
    }
    if (item && item.isResolved() || error) {
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
        addItemCallback(item, cb);
        if (!item) { return cb(new Error('Missing config ' + name)); }
        if (item.isUsable()) {
            item.iframe.setData( this._getItemData(item) );
            item.set(State.REFRESHING);
            try{
                item.iframe.refresh();
            } catch(err){
                item.iframe = null;
                item.set(item.DESTROYED);
                // reset:
                this.render(name, cb);
            }
        } else {
            // todo: change to failed with master merge, + add test
            this._failed(item, 'item is not usable');
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
    var manager = this;
    function loop() {

        if(pri.length > 0) {
            manager.refresh(pri.shift(), function() {
                cb.apply(this, arguments);
                loop();
            });
        } else {
            manager._refreshUntouched(cb);
        }
    }
    loop();
};

module.exports = Manager;
