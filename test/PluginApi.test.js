/*jshint expr: true, nonew: false*/
var PluginApi = require('../lib/PluginApi.js');

describe('PluginApi', function () {

    describe('constructor', function () {
        it('should not throw if no arguments', function () {
            expect(function () {
                new PluginApi();
            }).not.to.throw();
        });
    });

    describe('events', function () {
        var api;

        beforeEach(function () {
            api = new PluginApi();
        });

        afterEach(function () {
            api._reset();
        });

        it('should exist', function () {
            expect(api.on).to.exist;
            expect(api.trigger).to.exist;
        });

        it('should allow adding listener', function () {
            var spy = sinon.spy();
            api.on('test', spy);
            expect(spy).to.not.have.been.called;
        });

        it('should trigger listeners', function () {
            var spy = sinon.spy();
            api.on('test', spy);
            api.trigger('test');
            expect(spy).to.have.been.calledOnce;
        });

        it('should pass arguments from trigger to the listeners', function () {
            var spy = sinon.spy();
            api.on('test', spy);
            api.trigger('test', 1, 2, 3);
            expect(spy).to.have.been.calledWith(1, 2, 3);
        });

        it('should allow multiple listeners', function () {
            var spy = sinon.spy();
            var spy2 = sinon.spy();
            api.on('test', spy);
            api.on('test', spy2);
            api.trigger('test');
            expect(spy).to.have.been.calledOnce;
            expect(spy2).to.have.been.calledOnce;
        });

        it('should allow triggering events without listeners', function () {
            expect(function () {
                api.trigger('foo');
            }).not.to.throw();
        });
    });
});
