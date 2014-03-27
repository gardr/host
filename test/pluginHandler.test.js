/*jshint expr: true*/
var pluginHandler = require('../lib/pluginHandler.js');
var PluginApi     = require('../lib/PluginApi.js');


describe('pluginHandler', function () {

    describe('register', function () {
        it('should be a method', function () {
            expect(pluginHandler.register).to.be.an.instanceof(Function);
        });

        it('should throw if argument is not a function', function () {
            var args = [null, 'foo', {}, [], 123];
            args.map(function (arg) { return function () { pluginHandler.register(arg); }; })
                .forEach(function (shouldThrow) {
                    expect(shouldThrow).to.throw();
                });
        });

        it('should not throw when argument is a function', function () {
            expect(function () {
                pluginHandler.register(function() {});
            }).not.to.throw();
        });
    });

    describe('initPlugins', function () {
        it('should throw if missing PluginApi instance', function () {
            expect(function () {
                pluginHandler.initPlugins();
            }).to.throw();
        });

        it('should accept a PluginApi instance', function () {
            pluginHandler.initPlugins(new PluginApi());
        });


        it('should init the registered plugins', function () {
            var spy1 = sinon.spy(), spy2 = sinon.spy();
            pluginHandler.register(spy1);
            pluginHandler.register(spy2);
            pluginHandler.initPlugins(new PluginApi());

            expect(spy1).to.have.been.calledOnce;
            expect(spy2).to.have.been.calledOnce;
        });

        it('should pass the PluginApi instance when initializing plugins', function () {
            var spy = sinon.spy(), pluginApi = new PluginApi();
            pluginHandler.register(spy);
            pluginHandler.initPlugins(pluginApi);

            expect(spy).to.have.been.calledWithExactly(pluginApi);
        });

        it('should remove _reset method from PluginApi before sending it to plugins', function () {
            var pluginApi = new PluginApi();
            pluginHandler.register(function (pluginApi) {
                expect(pluginApi._reset).not.to.exist;
            });
            pluginHandler.initPlugins(pluginApi);
        });

        it('should freeze pluginApi after removing _reset', function () {
            var pluginApi = new PluginApi();
            pluginHandler.initPlugins(pluginApi);
            expect(Object.isFrozen(pluginApi)).to.be.true;
        });
    });

});
