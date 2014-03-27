var Manager = require('./manager.js');
var pluginHandler = require('./pluginHandler.js');

module.exports = function (opts) {
    return new Manager(opts, pluginHandler);
};

module.exports.plugin = function (plugin) {
    pluginHandler.register(plugin);
};
