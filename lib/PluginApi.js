var data = {};
var i = 0;

function get (id, property) {
    if (data[id]) { return data[id][property]; }
}

function set (id, property, value) {
    data[id] = data[id] || {};
    data[id][property] = value;
}

function subscribe (id, subject, fn) {
    if (typeof id != 'number' && typeof subject != 'string' && typeof fn != 'function') {
        throw new Error('Invalid arguments');
    }
    var listeners = get(id, 'listeners');
    if (!listeners[subject]) {
        listeners[subject] = [];
    }
    listeners[subject].push(fn);
}

function publish (id, subject) {
    var subscribers = get(id, 'listeners')[subject];
    var args = Array.prototype.slice.call(arguments, 2);
    if (!subscribers) { return; }
    subscribers.forEach(function (fn) {
        fn.apply(null, args);
    });
}

var PluginApi = function () {
    this.id = i++;

    set(this.id, 'listeners', {});
    this.on      = subscribe.bind(null, this.id);
    this.trigger = publish.bind(null, this.id)

    this._reset = function () { set(this.id, 'listeners', {}); };
};

module.exports = PluginApi;
