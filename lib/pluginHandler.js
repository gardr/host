var plugins = [];

module.exports = {
    register: function (plugin) {
        if (typeof plugin !== 'function') {
            throw new Error('Plugin has to be a function');
        }
        plugins.push(plugin);
    },

    initPlugins : function (pluginApi) {
        if (!pluginApi) {
            throw new Error('Expected a PluginApi instance');
        }
        delete pluginApi._reset;
        if (Object.freeze) { Object.freeze(pluginApi); }
        plugins.forEach(function (plugin) {
            plugin(pluginApi);
        });
    }
};
