/*jshint expr: true, nonew: false*/
var State      = require('../lib/state.js');
var Manager    = require('../lib/manager.js');
var extend     = require('util-extend');
var PluginApi  = require('gardr-core-plugin').PluginApi;
var expect     = require('expect.js');

var helpers    = require('./lib/testHelpers.js');

var SCRIPT_URL = 'test.js';

function queueRandom(num) {
    var manager = helpers.testableManager();
    var names = helpers.getRandomNames(num || 1);

    names.forEach(function (name, i) {
        manager.queue(name, {
            url: SCRIPT_URL + '?' + i,
            height: 225,
            width: 310
        });
    });

    return {
        manager: manager,
        name: names[0],
        names: names,
        forceResolveAll: function () {
            names.forEach(function (name) {
                manager._forEachWithName(name, function (item) {
                    manager._resolve(item);
                });
            });
        }
    };
}

describe('Manager', function () {
    this.timeout(5000);

    it('should be defined', function () {
        var manager = helpers.testableManager();
        expect(manager).to.be.an(Manager);
    });

    describe('options', function () {
        var IFRAME_URL = '/base/test/fixtures/echo-iframe.html';

        var validOpts = {
            iframeUrl: IFRAME_URL
        };

        function optsWithout (key) {
            var opts = extend({}, validOpts);
            opts[key] = null;
            return opts;
        }

        it('should throw if iframeUrl is missing', function () {
            expect(function () {
                new Manager(optsWithout('iframeUrl'));
            }).to.throwException();
        });

        it('should not throw if extScriptUrl is missing (deprecated)', function () {
            expect(function () {
                helpers.testableManager(validOpts);
            }).not.to.throwException();
        });

        it('should have logLevel default to 0', function () {
            var manager = helpers.testableManager();
            expect(manager.logLevel).to.equal(0);
        });

        it('should parse urlFragment for loglevel', function () {
            var manager = helpers.testableManager({ urlFragment: '#loglevel=3' });
            expect(manager.logLevel).to.equal(3);
        });

    });

    describe('pluginHandler', function () {
        it('should initialize plugins', function () {
            var spy = sinon.spy();
            helpers.testableManager(null, {
                initPlugins : spy
            });

            expect(spy.calledOnce).to.be(true);
            expect(spy.args[0][0]).to.be.an(PluginApi);
        });

        it('should pass gardr options to plugins', function () {
            var spy = sinon.spy(), opts = {};
            helpers.testableManager(opts, {
                initPlugins : spy
            });

            expect(spy.args[0][1]).to.equal(opts);
        });
    });

    describe('_get', function(){
        it('should be undefined for new name', function(){
            var manager = helpers.testableManager();

            var arr = manager._get( helpers.getRandomName() );
            expect(arr[0]).to.be(undefined);
        });

        it('should be defined for registered objects', function(){
            var manager = helpers.testableManager();
            var name = 'VALUE_1';
            manager.queue(name);
            var objRes = manager._get(name)[0];
            expect(objRes).to.ok();
        });
    });

    describe('_getById', function () {
        it('should return undefined for nonexisting id', function () {
            var manager = helpers.testableManager();
            expect(manager._getById('does-not-exist')).to.be(undefined);
        });

        it('should return the state item given an existing id', function() {
            var manager = helpers.testableManager();
            var name = helpers.getRandomName();
            manager.queue(name);
            var stateItem = manager._get(name)[0];

            var result = manager._getById(stateItem.id);
            expect(result).to.be.ok();
            expect(result.id).to.equal(stateItem.id);
            expect(result.name).to.equal(name);
        });
    });

    describe('config', function(){
        var manager = helpers.testableManager();

        it('should be defined', function () {
            expect(typeof manager.config === 'function').to.equal(true);
        });


        it('should allow config without options', function () {
            var name = helpers.getRandomName();

            manager.config(name);

            expect(manager._getConfig(name)).to.ok();
        });

        it('should set value and store config', function () {
            var name = helpers.getRandomName();

            manager.config(name, {
                'KEY_1': 'VALUE_1'
            });

            var obj2 = manager._getConfig(name);

            expect(obj2).to.be.ok();
            expect(obj2.KEY_1).to.equal('VALUE_1');
        });

        it('should call config done when _resolve is called', function () {

            var spy = sinon.spy();
            var name = helpers.getRandomName();

            manager.config(name, {done: spy});
            manager.queue(name, {
                scriptUrl: SCRIPT_URL
            });

            manager._resolve(manager._get(name)[0]);
            sinon.assert.calledOnce(spy);
        });

        it('extendInframeData', function () {
            var input = {
                a: helpers.getRandomName()
            };
            manager.extendInframeData(input);
            expect(manager.inject.a).to.equal(input.a);
        });

    });

    describe('queue', function(){
        var manager = helpers.testableManager();

        it('should not add queue objects to config map', function () {
            var name = helpers.getRandomName();

            manager.queue(name, {
                unique: name,
                // wrong name?
                scriptUrl: SCRIPT_URL
            });

            expect(manager._getConfig(name)).to.be(undefined);
        });

        it('should throw on missing name', function () {
            expect(manager.queue).to.throwException();
        });

        it('should allow queueing without options', function () {
            var name = helpers.getRandomName();

            manager.queue(name);
            expect(manager._get(name)).to.be.ok();
        });

        it('should allow specifying container in config', function () {
            var name = helpers.getRandomName();
            var container = document.createElement('div');
            manager.config(name, {container: container});
            manager.queue(name, {url: 'test'});
            expect(manager._get(name)[0].options.container).to.equal(container);
        });

        it('should allow specifying container in queue', function () {
            var name = helpers.getRandomName();
            var container = document.createElement('div');
            manager.queue(name, {container: container,url: 'test'});
            expect(manager._get(name)[0].options.container).to.equal(container);
        });

        it('should queue object to queued map', function () {
            var name = helpers.getRandomName();

            manager.queue(name, {
                unique: name,
                // wrong name?
                scriptUrl: SCRIPT_URL
            });

            expect(manager._get(name).length).to.equal(1);
            expect(manager._get(name)[0].options.unique).to.equal(name);
        });

        it('should extend queued object with correct config object', function(){
            var name = helpers.getRandomName();
            manager.config(name, {
                foo : 'bar'
            });

            manager.queue(name);

            var result = manager._get(name);
            expect(result.length).to.equal(1);
            expect(result[0].options.foo).to.equal('bar');

        });

        it('should overwrite property from config with queued object', function(){
            var name = helpers.getRandomName();
            manager.config(name, {
                foo : 'bar'
            });

            manager.queue(name, {
                foo : 'fighters'
            });

            var result = manager._get(name);
            expect(result.length).to.equal(1);
            expect(result[0].options.foo).to.equal('fighters');

        });

        it('should be able to queue multiple times for same config name', function () {
            var name = helpers.getRandomName();
            manager.config(name, {test: 'multiple'});

            manager.queue(name);
            manager.queue(name);
            var items = manager._get(name);
            expect(items.length).to.equal(2);
            expect(items[0].id).not.to.equal(items[1].id);
        });


    });

    describe('render', function () {
        this.timeout(5000);
        var manager = helpers.testableManager();

        it('should return a Error if non existing configname', function () {
            manager.render(helpers.getRandomName(), function (err) {
                expect(err).to.be.an(Error);
            });
        });

        it('should create an iframe', function () {
            var name = helpers.getRandomName();
            var container = document.createElement('div');
            document.body.appendChild(container);
            manager.queue(name, {
                container: container,
                url: 'test'
            });
            expect(manager._get(name)[0].iframe).not.to.ok();
            manager.render(name, function () {});

            expect(manager._get(name)[0].iframe).to.ok();
        });

        it('should pass id as unique name to iframe', function () {
            var name = helpers.getRandomName();
            manager.queue(name, {url: 'test'});

            manager.render(name, function () {});

            var items = manager._get(name);
            expect(items.length).to.have.above(0);
            expect(items[0]).to.ok();
            expect(items[0].iframe).to.ok();
            var iframe = manager._get(name)[0].iframe;
            expect(iframe.name).not.to.equal(name);
        });

        it('two items with same name should have different iframe ids', function () {
            var name = helpers.getRandomName();
            manager.queue(name, {url: 'test'});
            manager.queue(name, {url: 'test'});
            manager.render(name);
            var items = manager._get(name);
            var iframe1 = items[0].iframe;
            var iframe2 = items[1].iframe;
            expect(iframe1.id).not.to.equal(iframe2.id);
        });

        it('should pass width and height to iframe', function () {
            var name = helpers.getRandomName();
            var width = 999;
            var height = 444;
            var container = document.createElement('div');
            document.body.appendChild(container);

            manager.queue(name, {
                container: container,
                url: 'test',
                width: width,
                height: height
            });
            manager.render(name, function () {});

            var iframe = manager._get(name)[0].iframe;
            expect(iframe.width).to.equal(width);
            expect(iframe.height).to.equal(height);

        });

        it('should set script url as data on iframe', function () {
            var name = helpers.getRandomName();
            var container = document.createElement('div');
            document.body.appendChild(container);

            manager.queue(name, {
                container: container,
                url: SCRIPT_URL
            });

            manager.render(name, function () {});
            expect(manager._get(name)[0].iframe.data.url).to.equal(SCRIPT_URL);
        });

        it('should cleanup when trying to render banners without a parent', function () {
            var name = helpers.getRandomName();
            var container = document.createElement('div');

            manager.queue(name, {
                container: container,
                url: SCRIPT_URL
            });

            manager.render(name, function (err) {
                expect(err).to.be.an(Error);
                expect(manager._get(name)[0].options.container).to.be(null);
                expect(manager._get(name)[0].iframe).to.be(null);
                expect(manager.items.length).to.be(0);

            });
        });


        it('resolving banner should call callback', function (done) {
            var obj = queueRandom();
            obj.manager.render(obj.name, function (err, item) {
                expect(err).not.to.ok();
                expect(item).to.be.an(State);
                done();
            });
        });

        it('resolving banner should call callback with rendered size', function (done) {
            var obj = queueRandom();
            obj.manager.render(obj.name, function (err, item) {
                expect(item.rendered.width).to.equal(310);
                expect(item.rendered.height).to.equal(225);
                done();
            });
        });

        it('should call the callback for each item with same name', function (done) {
            var name = helpers.getRandomName();
            manager.config(name, {
                url: 'test'
            });
            manager.queue(name);
            manager.queue(name);

            var calls = 0;
            manager.render(name, function () {
                calls++;

                if (calls === 2) {
                    done();
                }
            });
        });
    });

    describe('renderAll', function () {

        it('should render in the priority order', function (done) {
            var num = 5;
            var rand = queueRandom(num);
            var manager = rand.manager;
            var reverseNames = rand.names.slice(0).reverse();
            sinon.stub(manager, 'render', function (name, cb) {
                manager._resolve(manager._get(name)[0]);
                if (cb) {cb();}
            });

            var callCount = 0;
            rand.manager.renderAll(reverseNames.join(','), function (err) {
                callCount++;
                expect(err).to.be(undefined);
                if (callCount === num) {
                    done();
                }
            });
            expect(manager.render.callCount).to.equal(rand.names.length);
            expect(manager.render.args[0][0]).to.equal(reverseNames[0]);
            expect(manager.render.args[1][0]).to.equal(reverseNames[1]);
            expect(manager.render.args[4][0]).to.equal(reverseNames[4]);

        });

        it('should _resolve not prioritated banners', function (done) {
            var num = 3;
            var rand = queueRandom(num);
            var manager = rand.manager;
            var stub = sinon.stub(manager, 'render', function (name, cb) {
                manager._forEachWithName(name, function (item) {
                    manager._resolve(item);
                });
                if (cb) {cb();}
            });

            var callCount = 0;
            manager.renderAll(rand.names[num -1], function (err) {
                callCount++;
                expect(err).to.be(undefined);

                if (callCount === num) {
                    done();
                }

            });

            expect(stub.calledThrice).to.be(true);
            expect(manager.render.callCount).to.equal(rand.names.length);
            expect(manager.render.args[0][0]).to.equal(rand.names[num -1]);
            expect(manager.render.args[1][0]).to.equal(rand.names[0]);
            expect(manager.render.args[2][0]).to.equal(rand.names[1]);
        });

        it('should call callback once for each item refresh', function(done) {
            this.timeout(5000);
            var num = 3;
            var rand = queueRandom(num);
            var manager = rand.manager;
            var callCount = 0;
            var renderedItems = [];

            var onDone = function() {
                expect(renderedItems).to.be.an('array');
                manager.items.forEach(function(i) {
                    expect(renderedItems).to.contain(i.id);
                });
                /*var res = manager.items.map(function(i) {return i.id;}).every(function (id) {
                    return renderedItems.indexOf(id) !== -1;
                });
                expect(res).to.be(true);*/
                done();
            };
            manager.renderAll(null, function(err, item) {
                callCount++;
                renderedItems.push(item.id);
                if(callCount === num) {
                    onDone();
                }
            });
        });
    });

    describe('setUrl', function() {
        it('should update url', function(done) {
            var name = 'iframe_update_url' + helpers.getRandomName();
            var manager = helpers.testableManager();

            var container = helpers.insertContainer(name);

            manager.queue(name, {
                'container': container,
                'url': SCRIPT_URL
            });

            manager.render(name, function(err, item){
                expect(item.state).to.equal(State.RESOLVED);

                manager.setUrl(name, SCRIPT_URL, function(err, item) {

                    expect(item.rendered.times).to.equal(1);

                    manager.setUrl(name, SCRIPT_URL + '?some=other', function(err, item) {

                        expect(item.rendered.times).to.equal(2);

                        manager.refresh(name, function (err, item) {
                            expect(item.options.url).to.equal( SCRIPT_URL + '?some=other');

                            expect(item.rendered.times).to.equal(3);
                            done();
                        });
                    });


                });

            });

        });
    });

    describe('setUrlMap', function() {
        it('should update url from urlmap object', function(done) {
            var name = 'iframe_update_url' + helpers.getRandomName();
            var manager = helpers.testableManager();

            var container = helpers.insertContainer(name);

            manager.queue(name, {
                'container': container,
                'url': SCRIPT_URL
            });

            manager.render(name, function(err, item){
                expect(item.state).to.equal(State.RESOLVED);
                var urlMap = {};
                urlMap[name] = SCRIPT_URL;
                manager.setUrlMap(urlMap, function(err, item) {

                    expect(item.rendered.times).to.equal(2);

                    urlMap[name] = SCRIPT_URL + '?some=other';

                    manager.setUrlMap(urlMap, function(err, item) {

                        expect(item.rendered.times).to.equal(3);

                        done();
                    });
                });
            });

        });

        it('should update multiple urls and always refresh', function(done) {
            var manager = helpers.testableManager();
            var urlMap = {};
            [SCRIPT_URL, SCRIPT_URL, SCRIPT_URL].forEach(function(name, i) {
                urlMap[i] = name + '?i=' + i;

                var container = helpers.insertContainer(i);
                manager.queue(name, {
                    'container': container,
                    'url': urlMap[i]
                });
            });

            var i = 3;
            var items = [];
            manager.renderAll(function(err, item){
                expect(err).not.to.be.ok();
                items.push(item);
                i--;
                if (i === 0) {
                    items.forEach(function(item){
                        expect(item.rendered.times).to.be(1);
                    });
                    ready();
                }
            });

            function ready() {
                var i  = 3;
                manager.setUrlMap(urlMap, function(err){
                    expect(err).not.to.be.ok();
                    i--;
                    if (i === 0) {
                        items.forEach(function(item){
                            expect(item.rendered.times).to.be(2);
                        });
                        done();
                    }
                });
            }

        });
    });


    describe('setData', function() {
        it('should update data', function(done) {
            var name = 'iframe_update_state' + helpers.getRandomName();
            var manager = helpers.testableManager();

            var container = helpers.insertContainer(name);

            manager.queue(name, {
                'container': container,
                'url': SCRIPT_URL,
                'width': 123,
                'height': 123,
                'data': {another: 321}
            });

            manager.render(name, function(err, item){
                expect(item.state).to.equal(State.RESOLVED);

                manager.setData(name, {random: 123}, function(err, item) {

                    expect(item.rendered.times).to.equal(2);

                    manager.refresh(name, function (err, item) {
                        expect(item.options.data.random).to.equal(123);
                        expect(item.options.data.another).to.equal(321);

                        expect(item.rendered.times).to.equal(3);
                        done();
                    });
                });

            });

        });
    });

    describe('_update', function() {

        it('should update state', function(done) {
            var name = 'iframe_update_state' + helpers.getRandomName();
            var manager = helpers.testableManager();

            var container = helpers.insertContainer(name);

            manager.queue(name, {
                'container': container,
                'url': SCRIPT_URL,
                'width': 123,
                'height': 123,
                'data': {another: 321}
            });

            manager.render(name, function(err, item){
                expect(item.state).to.equal(State.RESOLVED);
                expect(item.rendered.width).to.equal(123);
                manager._update(name, {
                    width: 300,
                    height: 300,
                    url: SCRIPT_URL + '?param1=23',
                    data: {random: 123}
                });

                manager.refresh(name, function (err, item) {
                    expect(item.options.data.random).to.equal(123);
                    expect(item.options.data.another).to.equal(321);
                    expect(item.options.width).to.equal(300);
                    expect(item.options.height).to.equal(300);
                    expect(item.options.url).to.equal(SCRIPT_URL + '?param1=23');

                    expect(item.rendered.times).to.equal(2);
                    expect(item.rendered.width).to.equal(300);
                    expect(item.rendered.height).to.equal(300);
                    done();
                });

            });
        });

    });

    describe('refresh', function () {

        it('should refresh single banner', function (done) {
            var name = 'iframe_refresh' + helpers.getRandomName();
            var manager = helpers.testableManager();
            var container = helpers.insertContainer(name);

            manager.queue(name, {
                'container': container,
                'url': SCRIPT_URL,
                'width': 123,
                'height': 123
            });

            manager.render(name, function(err, item){
                expect(item.state).to.equal(State.RESOLVED);
                expect(item.rendered.times).to.equal(1);

                manager.refresh(name, function (err, item) {
                    expect(item.rendered.times).to.equal(2);
                    done();
                });

            });
        });


        it('calling refresh on missing iframe should reset', function(done){
            var name = 'iframe_refresh_crash';
            var manager = helpers.testableManager();
            var container = helpers.insertContainer(name);

            manager.queue(name, {
                container: container,
                url: SCRIPT_URL,
                width: 123,
                height: 123
            });

            manager.render(name, function(err, item){
                expect(item.state).to.equal(State.RESOLVED);
                expect(item.rendered.times).to.equal(1);

                item.iframe.remove();

                var oldIframe = item.iframe;
                manager.refresh(name, function (err, item2) {
                    expect(item2.rendered.times).to.equal(2);
                    expect(item).to.equal(item2);
                    expect(oldIframe).not.to.equal(item2.iframe);
                    expect(item.isResolved()).to.equal(true);
                    done();
                });

            });
        });


        it('calling refresh on missing container should invalidate and cleanup', function(done){
            var name = 'iframe_refresh_invalidate';
            var manager = helpers.testableManager();
            var container = helpers.insertContainer(name);

            manager.queue(name, {
                container: container,
                url: SCRIPT_URL,
                width: 123,
                height: 123
            });

            manager.render(name, function(err, item){
                expect(item.state).to.equal(State.RESOLVED);
                expect(item.rendered.times).to.equal(1);

                item.options.container.parentNode.removeChild(item.options.container);

                manager.refresh(name, function (err) {
                    expect(err).to.be.an(Error);
                    expect(item.options.container).to.be(null);
                    expect(item.iframe).to.be(null);

                    expect(manager.items.length).to.be(0);

                    done();
                });

            });
        });
    });

    describe('refreshAll', function () {

        it('should refresh all banners', function (done) {
            this.timeout(10000);
            var num = 10;
            var rand = queueRandom(num);

            var historyLength = history.length;

            var callCount = 0;
            rand.manager.renderAll(function(){
                callCount ++;
                if (callCount === num) {
                    expect(historyLength).to.equal(history.length);
                    next();
                }
            });

            function next() {
                var callCount2 = 0;
                var first = rand.manager._get(rand.names[0])[0];

                expect(first.rendered.times).to.equal(1);
                expect(first).to.be.an(State);

                rand.manager.refreshAll(function (err, item) {
                    callCount2++;
                    expect(err).to.be(undefined);
                    expect(item).to.ok();

                    expect(item.rendered.times).to.equal(2, first.name + ' should be rendered 2 times');
                    if (callCount2 === num) {
                        expect(historyLength).to.equal(history.length);
                        done();
                    }
                });

                expect(first.state).to.equal(State.REFRESHING, 'expected state to be equal to NEEDS_REFRESH');
            }
        });
    });

    describe('fail', function(){

        it('should run callback with error', function (done) {
            var manager = helpers.testableManager();
            var name    = helpers.getRandomName();

            manager.queue(name, {url: 'test'});

            manager.render(name, function(err){
                expect(err).to.ok();
                done();
            });

            var item = manager._get(name)[0];
            manager._failed(item, {message: 'error'});
        });

    });

    describe('incomming commands', function () {

        describe('resize', function () {

            it.skip('should not resize if ignoreResize is true', function () {});

        });

    });

    describe('plugin', function () {
        var manager = helpers.testableManager();

        afterEach(function () {
            manager.pluginApi._reset();
        });

        it('should be defined', function () {
            expect(manager.pluginApi).to.ok();
        });

        it('should trigger item:queued after queuing item', function(done) {
            var name = helpers.getRandomName();

            manager.pluginApi.on('item:queued', function(item) {
                expect(item.name).to.equal(name);
                done();
            });

            manager.queue(name, {url: 'about:blank'});
        });

        it('should trigger item:beforerender before creating the iframe', function (done) {
            var name = helpers.getRandomName();

            manager.pluginApi.on('item:beforerender', function (item) {
                if (item.name !== name) { return; }
                expect(item.options.container).to.ok();
                expect(item.iframe).not.to.ok();
                done();
            });

            manager.queue(name, {url: 'about:blank'});
            manager.render(name);
        });

        it('should not trigger item:beforerender more than once for an item', function () {
            var name = helpers.getRandomName();
            var renderedIds = [];

            manager.pluginApi.on('item:beforerender', function (item) {
                expect(renderedIds).not.to.contain(item.id);
                renderedIds.push(item.id);
            });

            manager.queue(name, {url: 'about:blank'});
            manager.render(name);
            manager.queue(name, {url: 'about:blank'});
            manager.render(name);
        });

        var _i = document.createElement('iframe');
        _i.allowfullscreen = _i.webkitallowfullscreen = _i.mozallowfullscreen = true;
        if (_i.allowfullscreen || _i.webkitallowfullscreen || _i.mozallowfullscreen) {
            it('should not enable fullcreen by default', function(done) {
                var name = helpers.getRandomName();

                manager.queue(name, {url: 'about:blank'});
                manager.render(name, function(err, item){
                    expect(item.iframe.element.allowfullscreen).not.to.be.ok();
                    expect(item.iframe.element.webkitallowfullscreen).not.to.be.ok();
                    expect(item.iframe.element.mozallowfullscreen).not.to.be.ok();
                    done();
                });
            });

            it('should allow to pass allowfullscreen to iframe', function(done) {
                var name = helpers.getRandomName();


                manager.queue(name, {url: 'about:blank', allowfullscreen: true});
                manager.render(name, function(err, item){
                    expect(
                        item.iframe.element.allowfullscreen||
                        item.iframe.element.webkitallowfullscreen||
                        item.iframe.element.mozallowfullscreen
                    ).to.be.ok();
                    done();
                });
            });
        }



        it('should trigger item:afterrender when the iframe has been rendered', function (done) {
            var name = helpers.getRandomName();

            manager.pluginApi.on('item:afterrender', function (item) {
                if (item.name !== name) { return; }
                expect(item.iframe).to.ok();
                expect(item.rendered.width).to.equal(310);
                expect(item.rendered.height).to.equal(225);
                done();
            });

            manager.queue(name, {url: 'about:blank', width: 310, height: 225});
            manager.render(name);
        });
    });
});
