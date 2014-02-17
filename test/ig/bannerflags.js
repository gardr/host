var helpers = require('../testHelpers.js');
var scriptUrl = '/base/test/fixtures/config_content.js';
var iframeUrl = '/base/test/fixtures/iframe.html';

describe('BannerFlags', function () {
    it('should be able to set flag', function (done) {
        var manager = helpers.testableManager({
            iframeUrl: iframeUrl
        });
        manager.flags.foo = 'bar';
        var name = 'bannerflags_' + helpers.getRandomName();
        var elem = helpers.insertContainer(name);

        manager.queue(name, {
            url: '/base/test/fixtures/bannerflag.js',
            container: elem
        });

        manager.render(name, function (err, item) {
            expect(err).to.be.undefined;
            expect(item.name).to.equal(name);
            expect(manager.flags.flag).to.equal(item.id);
            done();
        });
    });
});