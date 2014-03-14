/* jshint nonew: false, expr: true */
var Iframe       = require('../lib/iframe.js');

describe('iframe', function () {
    var iframeUrl = 'about:blank';
    var id, iframe, testNr = 0;

    beforeEach(function () {
        id = 'iframe-' + (++testNr);
        iframe = new Iframe(id, {iframeUrl: iframeUrl});
    });

    it('should be defined', function(){
        expect(Iframe).to.exist;
    });

    it('should require id', function () {
        expect(function(){
            new Iframe(null, {iframeUrl: iframeUrl});
        }).to.throw();
    });

    it('should require iframeUrl', function(){
        expect(function(){
            new Iframe(id);
        }).to.throw();

        expect(function(){
            new Iframe(id, {});
        }).to.throw();
    });

    it('should set id as property on the instance', function () {
        expect(iframe.id).to.equal(id);
    });

    it('should use iframeUrl for iframe src', function () {
        iframe.makeIframe();
        expect(iframe.element.src.indexOf(iframeUrl) === 0).to.equal(true);
    });

    it('should set a JSON-string including the id as name-attribute on iframe element', function () {
        iframe.makeIframe();
        expect(iframe.element.name).to.exist;
        var params = JSON.parse(iframe.element.name);
        expect(params.id).to.equal(id);
    });

    it('should have width and height from constructor options', function(){
        var iframe = new Iframe('resize-test', {width:100, height:200, iframeUrl:'about:blank'});
        iframe.makeIframe();
        expect(iframe.element.style.width).to.equal('100px');
        expect(iframe.element.style.height).to.equal('200px');
    });

    it('should encode data object to a JSON-string on the name-attribute on iframe element', function () {
        iframe.setData({
            aNumber: 100,
            encodeUrl: 'http://test.com/path?a=b&c=æøå'
        });
        iframe.makeIframe();
        var params = JSON.parse(iframe.element.name);
        expect(params).to.exist;
        expect(params).to.contain.keys('aNumber', 'encodeUrl', 'origin');
    });

    it('should resize', function(){
        var iframe = new Iframe('resize-test', {width:100, height:100, iframeUrl:'about:blank'});
        iframe.makeIframe();
        iframe.resize(250, 200);
        expect(iframe.element.style.width).to.equal('250px');
        expect(iframe.element.style.height).to.equal('200px');
    });
});
