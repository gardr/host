# Garðr - the safe way to add third party content to your site

[![Build Status](https://travis-ci.org/gardr/host.png)](https://travis-ci.org/gardr/gardr)

Garðr is a library for embedding content from external sources such as advertisements or similar third party content.

Removes the need for friendly iframes support in delivery systems and supports both HTML, Image and Flash based adverts. The iframe should be hosted on a different domain to enable security-features in the browser that prevents third party content to insert content or get user info from the parent page. postMessage is used for cross-domain communication.

## Pre-requisits
* [NodeJS + NPM](http://nodejs.org)

## Testing
Easiest way is through npm.

	$ npm test

When working with the code you can use karma and grunt to get continuous feedback on your tests. Make sure you have `./node_modules/.bin` in your path, or install karma globally.

	$ karma start

## Logging

Debugging can be done by configuring logging to either the browser console or as an overlay inside the iframes rendered by Garðr.

You can turn on logging by adding an url-fragment with log level on the page you're using Garðr: #loglevel=4
By default it will display an overlay inside each banner with the log output. If the banner isn't visible, you can output to console by using: #loglevel=4&logto=console

*NB!* If the banner injects another iframe we have no good way of catching errors :(


## Polyfills required for IE8+ support

* [ES5-shim](https://npmjs.org/package/es5-shim) You do not need a sham (unsafe polyfills).
* postMessage is required, so it won't work in IE7 at the moment.

# Releasing new versions

	# Make sure you have installed npm-release
	$ npm install -g npm-release

	# Release (make sure you have have nothing uncommited)
	$ npm-release [<newversion> | major | minor | patch | build]

# Demos and samples

See samples here: https://github.com/gardr/gardr

## Samples in the wild

* All of the display adverst on [m.finn.no](http://m.finn.no/) is using Garðr to safely embed responsive adverts written in HTML, CSS and JS.
