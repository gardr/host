module.exports = function(config) {

    var settings = {
        basePath: '',
        frameworks: ['mocha', 'browserify', 'sinon-chai'],
        files: [
            'test/lib/Function-polyfill.js'
        ],
        exclude: [],
        colors: true,
        logLevel: config.LOG_WARN,
        autoWatch: true,
        captureTimeout: 60000,
        singleRun: false,
        browserify: {
            watch: true,
            debug: true,
            files: [
                'lib/**/*.js',
                'test/**/*.js'
            ]
        },
        preprocessors: {
            '/**/*.browserify': 'browserify'
        },
        plugins: ['karma-*'],
    };

    if (!process.env.SAUCE_USERNAME || !process.env.SAUCE_ACCESS_KEY) {
        settings.reporters = ['progress'];
        settings.browsers = ['PhantomJS'];
    } else {
        console.log('Running CI tests');
        settings.sauceLabs = {
            // startConnect: false,
            testName: 'Gardr host test suite',
            tags: 'gardr'
        };
        settings.reporters = ['dots', 'saucelabs'];
        settings.customLaunchers = {
            'sl_chrome': {
                base: 'SauceLabs',
                browserName: 'chrome',
                platform: 'Windows 7',
                version: '35'
            },
            'sl_firefox': {
                base: 'SauceLabs',
                browserName: 'firefox',
                version: '30'
            },
            'sl_ios_safari': {
                base: 'SauceLabs',
                browserName: 'iphone',
                platform: 'OS X 10.9',
                version: '7.1'
            },
            'sl_ie_11': {
                base: 'SauceLabs',
                browserName: 'internet explorer',
                platform: 'Windows 8.1',
                version: '11'
            },
            'sl_ie_10': {
                base: 'SauceLabs',
                browserName: 'internet explorer',
                platform: 'Windows 8',
                version: '10'
            },
            'sl_ie_09': {
                base: 'SauceLabs',
                browserName: 'internet explorer',
                platform: 'Windows 7',
                version: '9'
            }/*,
            'sl_ie_08': {
                base: 'SauceLabs',
                browserName: 'internet explorer',
                platform: 'Windows 7',
                version: '8'
            }*/
        };
        settings.browsers = Object.keys(settings.customLaunchers);
    }

    return config.set(settings);
};
