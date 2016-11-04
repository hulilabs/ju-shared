/* globals describe, it, before, afterEach */

var async = require('async'),
    chai = require('chai'),
    expect = chai.expect,
    requirejs = require('requirejs'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai');

// config and bootstrap
sinon.assert.expose(chai.assert, { prefix : '' });
chai.use(sinonChai);

var bootstrapProxyDefinition = function(callback) {
    // @NOTICE this is required to prevent not defined 'window' warning
    //         and must happen before loading the BaseProxy definition

    requirejs(['base-proxy'], function(BaseProxy) {
        callback(null, BaseProxy);
    });
};

var BaseProxy;
/*
    Before performing any tests, loads the BaseProxy definition, that's because
    loading it inside every case will cause some of the chai errors to not be
    properly caught by mocha
 */
before(function(done) {

    async.waterfall([
        bootstrapProxyDefinition
    ],
    function(err, proxyDefinition) {
        if (err) {
            return done(err);
        } else {
            BaseProxy = proxyDefinition;
            return done();
        }
    });
});

describe('HTTP Proxy', function() {

    afterEach(function() {
        if ('function' === typeof $.ajax.restore) {
            $.ajax.restore();
        }
    });

    it('Includes makeAjaxRequest in its API', function() {
        expect(BaseProxy).to.be.a('function');
        expect(BaseProxy.getInst().makeAjaxRequest).to.be.a('function');
        return true;
    });

    it('Performs an AJAX request', function(done) {
        sinon.stub($, 'ajax')
            .yieldsTo('success', {
                data : 'dummy-response'
            });

        var proxy = new BaseProxy(),
            successHandler = function() {
                done();
            };
            // successHandler = sinon.spy();

        proxy.makeAjaxRequest({
            url : BaseProxy.EP.API_PREFIX + 'test',
            success : successHandler,
        });

        // expect(successHandler).to.have.been.calledWithMatch({
        //     url : '/api/test',
        //     dataType: 'json'
        // });
    });

    it('Calls provided default error handler on AJAX error', function(done) {

        var requestInsideResponse = {
            status : 500,
            getResponseHeader : function() {return '9999';}
        };

        sinon.stub($, 'ajax')
            .yieldsTo('error', requestInsideResponse, 'textstatus', 'error thrown');

        var proxy = new BaseProxy(),
            errorHandler = function(/*error*/) {
                // error argument is:
                // { appError: null,
                // jqxhr: { status: 500, getResponseHeader: [Function] },
                // textStatus: 'textstatus',
                // errorThrown: 'error thrown' }

                done();
            };

        proxy.makeAjaxRequest({
            url : BaseProxy.EP.API_PREFIX + 'test',
            success : $.noop,
            error : errorHandler
        });

    });

    it('Calls custom handler for status code 500', function(done) {
        var requestInsideResponse = {
            status : 500,
            getResponseHeader : function() {return '9999';}
        };

        sinon.stub($, 'ajax')
            .yieldsTo('error', requestInsideResponse, 'textstatus', 'error thrown');

        var proxy = new BaseProxy({
            statusHandlers : {
                code500 : done
            }
        });

        proxy.makeAjaxRequest({
            url : BaseProxy.EP.API_PREFIX
        });

    });

    it('Calls provided beforeMakingAjaxRequest handler and yields to success', function(done) {
        sinon.stub($, 'ajax')
            .yieldsTo('success', {
                data : 'dummy-response'
            });

        var beforeMakingAjaxRequest = function(params) {
            expect(params).to.be.an('object');

            return params;
        },
            successHandler = function() {
                done();
        };

        var spy = sinon.spy(beforeMakingAjaxRequest);

        var proxy = new BaseProxy({
            beforeMakingAjaxRequest : spy
        });

        proxy.makeAjaxRequest({
            url : BaseProxy.EP.API_PREFIX,
            success : successHandler
        });

        expect(spy).to.have.been.calledOnce;
    });

    it('Uses custom connection observer and yields to disconnected', function() {
        var requestInsideResponse = {
            status : 9999, // fake status code
            getResponseHeader : function() {return '9999';} // fake app version
        };

        var onlineTestSpy = sinon.spy(sinon.stub().returns(false));

        var proxy = new BaseProxy({
            connectionObserver : {
                isOnline : onlineTestSpy
            }
        });

        // fakes $.ajax method
        sinon.stub($, 'ajax')
            .yieldsTo('error', requestInsideResponse, 'textstatus', 'error thrown');

        // the ajax request should return in a disconnected state
        // so we spy the defaultNotConnectedHandler
        sinon.spy(proxy.opts, 'defaultNotConnectedHandler');
        proxy.makeAjaxRequest({
            url : BaseProxy.EP.API_PREFIX
        });

        expect(onlineTestSpy).to.have.been.calledOnce;
        expect(proxy.opts.defaultNotConnectedHandler).to.have.been.calledOnce;
    });

    it('Causes a response code 0 to be handled as a disconnection', function() {
        var requestInsideResponse = {
            status : 0, // should be handled as a disconnection
            getResponseHeader : function() {return '9999';} // fake app version
        };

        var proxy = new BaseProxy({
        });

        // fakes $.ajax method
        sinon.stub($, 'ajax')
            .yieldsTo('error', requestInsideResponse, 'textstatus', 'error thrown');

        sinon.spy(proxy.opts, 'defaultNotConnectedHandler');
        proxy.makeAjaxRequest({
            url : BaseProxy.EP.API_PREFIX
        });

        expect(proxy.opts.defaultNotConnectedHandler).to.have.been.calledOnce;
    });

});
