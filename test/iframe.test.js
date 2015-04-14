/* jshint nonew: false, expr: true */
var Iframe       = require('../lib/iframe.js');
var expect       = require('expect.js');

function getHash(src) {
    return src.substring(src.indexOf('#')+1);
}

describe('iframe', function () {
    var iframeUrl = 'about:blank';
    var id, iframe, testNr = 0;

    beforeEach(function () {
        id = 'iframe-' + (++testNr);
        iframe = new Iframe(id, {iframeUrl: iframeUrl});
    });

    it('should be defined', function(){
        expect(Iframe).to.be.ok();
    });

    it('should require id', function () {
        expect(function(){
            new Iframe(null, {iframeUrl: iframeUrl});
        }).to.throwException();
    });

    it('should require iframeUrl', function(){
        expect(function(){
            new Iframe(id);
        }).to.throwException();

        expect(function(){
            new Iframe(id, {});
        }).to.throwException();
    });

    it('should set id as property on the instance', function () {
        expect(iframe.id).to.equal(id);
    });

    it('should use iframeUrl for iframe src', function () {
        iframe.makeIframe();
        expect(iframe.element.src.indexOf(iframeUrl) === 0).to.equal(true);
    });

    it('should set a JSON-string including the id as hash on iframe src', function () {
        iframe.makeIframe();
        var hash = getHash(iframe.element.src);
        expect(hash).to.ok();
        expect(hash.substring(0,3)).to.equal('%7B');
        var params = JSON.parse( decodeURIComponent(hash) );
        expect(params.id).to.equal(id);
    });

    it('should have width and height from constructor options', function(){
        var iframe = new Iframe('resize-test', {width:100, height:200, iframeUrl:'about:blank'});
        iframe.makeIframe();
        expect(iframe.element.style.width).to.equal('100px');
        expect(iframe.element.style.height).to.equal('200px');
    });

    it('should have a responsive width if no width specified', function () {
        var iframe = new Iframe('resize-test', {height:200, iframeUrl:'about:blank'});
        iframe.makeIframe();
        // Safari on iOS forces the iframe size to equal the visible content size if it has 100% width.
        // This is a trick to work around that bug. See discussion here:
        // https://github.com/gardr/host/pull/8
        expect(iframe.element.style.width).to.equal('1px');
        expect(iframe.element.style.minWidth).to.equal('100%');
    });

    it('should encode data object to a JSON-string as hash on the iframe src', function () {
        iframe.setData({
            aNumber: 100,
            encodeUrl: 'http://test.com/path?a=b&c=æøå'
        });
        iframe.makeIframe();
        var hash = getHash(iframe.element.src);
        expect(hash).to.ok();
        var params = JSON.parse(decodeURIComponent(hash));
        expect(params).to.ok();
        ['aNumber', 'encodeUrl', 'origin'].forEach(function(key){
            expect(Object.keys(params)).to.contain(key);
        });
    });

    it('should send the data object as iframe.name if the iframe URL is close to max URL length', function () {
        var data = {a: ''}, i=0;
        while (i++ <= 2083) { data.a += '.'; }
        iframe.setData(data);
        iframe.makeIframe();
        expect(iframe.element.src).not.to.contain('#');
        expect(iframe.element.name).to.ok();
        var params = JSON.parse(iframe.element.name);
        expect(params).to.ok();
        expect(params.a).to.ok();
    });

    it('should resize', function(){
        var iframe = new Iframe('resize-test', {width:100, height:100, iframeUrl:'about:blank'});
        iframe.makeIframe();
        iframe.resize(250, 200);
        expect(iframe.element.style.width).to.equal('250px');
        expect(iframe.element.style.height).to.equal('200px');
    });

    it('should not throw an error when resizing if element was removed', function() {
        var iframe = new Iframe('resize-test', {width:100, height:100, iframeUrl:'about:blank'});
        var fakeParent  = document.createElement('div');

        iframe.makeIframe();
        fakeParent.appendChild(iframe.wrapper);
        iframe.remove();
        expect(iframe.resize).to.not.throwException(Error);
    });

    it('should add tabindex as an iframe attribute', function () {
        iframe.makeIframe();
        expect(iframe.element.tabIndex).to.equal(-1);
    });


});
