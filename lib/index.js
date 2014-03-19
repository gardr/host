var Manager = require('./manager.js');

var plugins = [];

module.exports = function (opts) {
    var mgr = new Manager(opts);

    plugins.forEach(function (plugin) {
        plugin(mgr);
    });
    
    return mgr;
};

module.exports.plugin = function (plugin) {
    plugins.push(plugin);
};
