module.exports = function(config) {
    var settings = {
        basePath: '',
        frameworks: ['mocha', 'browserify', 'es5-shim', 'sinon'],
        files: [
            {
                pattern: 'test/fixtures/echo-iframe.html',
                included: false
            },
            'test/**/*.test.js'
        ],
        reporters: ['progress'],
        browsers: ['PhantomJS'],
        exclude: [],
        colors: true,
        logLevel: config.LOG_WARN,
        autoWatch: true,
        captureTimeout: 60000,
        singleRun: false,
        browserify: {
            watch: true,
            debug: true,
            bundle: true
        },
        preprocessors: {
            'test/**/*.test.js': 'browserify'
        },
        plugins: ['karma-*']
    };

    if (process.env.SAUCE_USERNAME && process.env.SAUCE_ACCESS_KEY) {
        settings.browserDisconnectTimeout = 60000;
        settings.browserNoActivityTimeout = 60000;
        settings.captureTimeout = 60000 * 3;
        settings.sauceLabs = {
            testName: 'Gardr host',
            tags: ['gardr', 'host']
        };
        settings.reporters = ['dots', 'saucelabs'];
        settings.customLaunchers = {};

        // only 3 vmms / browsers per run because of
        // https://github.com/karma-runner/karma-sauce-launcher/issues/40
        // should either add better setup for running max currently or
        var key = process.env.BROWSER_TYPE;
        var target = require('./ci-browsers.js')[key];
        if (!target) {
            console.error('Missing / Unknown BROWSER_TYPE ' + process.env.BROWSER_TYPE);
            process.exit(1);
        }

        Object.keys(target).forEach(function(key){
            settings.customLaunchers[key] = target[key];
        });

        console.log('Running CI tests on', Object.keys(settings.customLaunchers).join(', '));
        settings.browsers = Object.keys(settings.customLaunchers);
    }

    return config.set(settings);
};
