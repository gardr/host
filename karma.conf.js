module.exports = function (config) {
    return config.set({
        basePath: '',
        frameworks: ['mocha', 'browserify', 'sinon-chai'],
        files: [
            'test/lib/Function-polyfill.js',
            'lib/**/*.js',
            'test/**/*.js'
        ],
        exclude: [],
        reporters: ['progress'],
        colors: true,
        logLevel: config.LOG_WARN,
        autoWatch: true,
        browsers: ['PhantomJS'],
        captureTimeout: 60000,
        singleRun: false,
        browserify: {
            watch: true,
            debug: true
        },
        preprocessors: {
            'test/**/*.js': 'browserify',
            'lib/**/*.js': 'browserify'
        },
        plugins: ['karma-*']
    });
};
