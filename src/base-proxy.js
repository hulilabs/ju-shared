/**                   _
 *  _             _ _| |_
 * | |           | |_   _|
 * | |___  _   _ | | |_|
 * | '_  \| | | || | | |
 * | | | || |_| || | | |
 * |_| |_|\___,_||_| |_|
 *
 * (c) Huli Inc
 */

/**
 * Proxy Services
 * This layer provides access to the AJAX server endpoints
 */
define([
            'jquery',
            'ju-shared/class',
            'ju-shared/connection-status/navigator-online'
        ],
        function(
            $,
            Class,
            NavigatorOnlineStatus
        ) {
    'use strict';

    var ERROR_MSG = 'Oops! Something did not go as expected. We are working on it right now. Please try again later.',
        DISCONNECTED_MSG = 'Your Internet connection isn\'t stable and we\'re not able to communicate with the server.  Please check your connection and try again',
        APP_ERROR_MSG = 'There\'s an error message sent by the application. Check custom message argument.';

    /**
     * Global Ajax error handler to catch special HTTP status codes
     */
    var ajaxErrorFn = function(jqxhr, textStatus, errorThrown) {
        log('AjaxError on request to URL: ', jqxhr, textStatus, errorThrown);

        var stopPropagation = false,
            handlerFunction = this.opts['code' + jqxhr.status + 'Handler'];
        // will attempt to call a handler function named code###Handler
        // where ### is the status code
        if ('function' === typeof handlerFunction && $.isNumeric(jqxhr.status)) {
            stopPropagation = handlerFunction();
        }

        return stopPropagation;
    };

    /*
        DEFAULT HTTP STATUS CODE HANDLERS
        every handler should return `true` if the error should not propagate
        to any other error handlers that might catch the error later
     */
    var code302Handler = function() {
        alert('Endpoint was moved permanently'); // jshint ignore:line
        return true;
    };

    var code401Handler = function() {
        alert('Your session expired, please log in again.');    // jshint ignore:line
        // Reload root page for now
        // TODO: append a redirect URL to be redirected back
        // to the current module
        window.location.href = '/';
        return true;
    };

    var code403Handler = function() {
        alert('Unfortunately you don\'t have permission to access this section. If you think this is an error please contact the system administrator.');    // jshint ignore:line
        return false;
    };

    var code500Handler = function() {
        return false;
    };

    /**
     * Gets the first error message from the err object
     */
    var getAppErrMsg = function(err) {
        var errMsg = null,
            appErr = null;

        // Test all the path down to the first message
        // and assigns it to the local variable
        // If any of the conditions is not met then
        // errMsg will remain null
        if (err &&
            err.appError &&
            err.appError.errors &&
            err.appError.errors.length > 0 &&
            (appErr = err.appError.errors[0])) {

            errMsg = appErr.msg ? appErr.msg
                                : appErr.code;
        }

        return errMsg;
    };

    /**
     * Displays default 'you are offline' message
     */
    var defaultNotConnectedHandler = function(err, closeCallBack) {
        var proxyError = {
            code : BaseProxy.PROXY_ERROR_STATUS_CODE.OFFLINE_ERROR,
            customMessage : null,
            defaultMessage : DISCONNECTED_MSG
        };

        BaseProxy.opts.defaultNotConnectedHandler(err, closeCallBack, proxyError);
    };

    /**
     * Checks if a jquery ajax error seems to be causes by a disconnected status
     * @param  {Object}  err jQuery.ajax error
     * @return {Boolean}
     */
    var isAjaxResultDisconnected = function(err) {
        return (err && err.jqxhr && 0 === err.jqxhr.status);
    };

    /**
     * This is the default AJAX error handler if no error handler was provided
     */
    var defaultErrorHandler = function(err, closeCallBack) {
        Logger.warn('AJAX error handler', err);

        // first check if there's a proper error message retrieved from the app
        var appErrorMessage = getAppErrMsg(err);
        if (appErrorMessage) {
            var proxyError = {
                code : BaseProxy.PROXY_ERROR_STATUS_CODE.APP_ERROR,
                customMessage : appErrorMessage,
                defaultMessage : APP_ERROR_MSG
            };

            return BaseProxy.opts.defaultErrorHandler(err, closeCallBack, proxyError);
        }

        // second, check for connection errors
        var isInternetConnected = this.opts.connectionObserver.isOnline();
        if (isAjaxResultDisconnected(err) || !isInternetConnected) {
            return this.opts.defaultNotConnectedHandler(err, closeCallBack);
        }

        // third, fallback to uncaught ajax error status
        var proxyError = {
            code : BaseProxy.PROXY_ERROR_STATUS_CODE.AJAX_ERROR,
            customMessage : null,
            defaultMessage : ERROR_MSG
        };
        BaseProxy.opts.defaultErrorHandler(err, closeCallBack, proxyError);
    };

    /**
     * Removes the trailing slashes from the URL
     * @return {[string]} removes the url without the trailing slash
     */
    var removeTrailingSlashes = function(url) {
        return url ? url.replace(/\/$/, '') : null;
    };

    /**
     * Base Proxy class
     */
    var BaseProxy = Class.extend({

        init : function(opts) {

            this.opts = $.extend({
                // if function is provided, it's called right before the ajax
                // request is performed. It receives a callback to perform the
                // ajax request and the params ready for performing the request
                beforeMakingAjaxRequest : null,
                code302Handler : code302Handler,
                code401Handler : code401Handler,
                code403Handler : code403Handler,
                code500Handler : code500Handler,
                // called before the default error handler for handling HTTP status
                // codes for requests that resulted from an error
                ajaxErrorHandler : $.proxy(ajaxErrorFn, this),
                // handles custom application errors that are returned on a successful
                // ajax request
                appErrorHandler : $.proxy(defaultErrorHandler, this),
                // skips call to ajaxErrorHandler and code###Handler
                // so ajax errors will be passed to error handler
                skipAjaxErrorsHandling : false,
                // checked wheter we want to know if there's a connection available
                connectionObserver : NavigatorOnlineStatus,
                defaultNotConnectedHandler : $.proxy(defaultNotConnectedHandler, this),
                defaultErrorHandler : $.proxy(defaultErrorHandler, this),
                defaultSuccessHandler : $.noop
            }, opts);
        },

        makeAjaxRequest : function(userParams, stringifyData) {

            var params = {
                dataType: 'json'
            };

            // Remove any trailing slashes from the end
            userParams.url = removeTrailingSlashes(userParams.url);

            var originalSuccessFn = userParams.success,
                originalErrorFn = userParams.error || this.opts.defaultErrorHandler,
                appErrorHandler = userParams.appError || this.opts.appErrorHandler;

            userParams.success = $.proxy(
                this._handleAjaxRequestSuccess,
                this,
                originalSuccessFn,
                appErrorHandler);

            userParams.error = $.proxy(
                this._handleAjaxRequestError,
                this,
                originalErrorFn);

            // Stringify the data before performing the AJAX call
            if (stringifyData) {
                userParams.data = JSON.stringify(userParams.data);
            }

            $.extend(params, userParams);
            // hook exposed as `beforeMakingAjaxRequest` to execute code before
            // performing any ajax request and wait for a callback to be called
            if ('function' === typeof this.opts.beforeMakingAjaxRequest) {
                var performAjaxRequestCallback = $.proxy($.ajax, $);
                this.opts.beforeMakingAjaxRequest(performAjaxRequestCallback, params);

            } else {
            // if no hook is provided, performs the request
                $.ajax(params);
            }
        },

        _handleAjaxRequestSuccess : function(originalSuccessFn, originalErrorFn, response, textStatus, request) {
            BaseProxy.opts.preprocessAjaxSuccess(response, textStatus, request);

            if (response && response.errors) {
                log('Application error on AJAX request ', response.errors);
                originalErrorFn.call(this, this.normalizeError(response));
                return;
            }
            originalSuccessFn.call(this, response, textStatus, request);
        },

        _handleAjaxRequestError : function(originalErrorFn, request, textStatus, errorThrown) {
            BaseProxy.opts.preprocessAjaxError(request, textStatus, errorThrown);

            var wasErrorStoppedInAjaxHandler = false;
            if (!this.opts.skipAjaxErrorsHandling) {
                wasErrorStoppedInAjaxHandler = this.opts.ajaxErrorHandler.call(this, request, textStatus, errorThrown);
            }

            if (!wasErrorStoppedInAjaxHandler) {
                originalErrorFn.call(this, this.normalizeError(null, request, textStatus, errorThrown));
            }
        },

        /**
         * Creates a normalized version of the error to handle for either a server error or an app error
         *
            {
                'appError' : {
                                response: 'error',
                                errors : [
                                            {
                                                code : 'error_xyz',
                                                msg : 'Error message from L10n'
                                            }
                                ]
                            },
                'jqxhr' : jqxhr,
                'textStatus' : textStatus,
                'errorThrown' : errorThrown
            }
         */

        normalizeError : function(appError, jqxhr, textStatus, errorThrown) {
            return {
                appError : appError,
                jqxhr : jqxhr,
                textStatus : textStatus,
                errorThrown : errorThrown
            };
        },

        /**
         * Expose default error handler
         */
        defaultErrorHandler : function() {
            return this.opts.defaultErrorHandler.apply(this, arguments);
        }
    });

    BaseProxy.classMembers({

        opts : {

            defaultNotConnectedHandler : function(/*err, closeCallBack, errorMsg*/) {
                log('BaseProxy: method `defaultNotConnectedHandler` has not been implemented for this application ');
            },

            defaultErrorHandler : function(/*err, closeCallBack, errorMsg*/) {
                log('BaseProxy: method `defaultErrorHandler` has not been implemented for this application ');
            },

            preprocessAjaxSuccess : function(/*originalSuccessFn, originalErrorFn, response, textStatus, request*/) {
                log('BaseProxy: method `preprocessAjaxSuccess` has not been implemented for this application ');
            },

            preprocessAjaxError : function(/*request, textStatus, errorThrown*/) {
                log('BaseProxy: method `preprocessAjaxError` has not been implemented for this application ');
            }
        },

        /**
         * HTTP Status codes
         */
        HTTP_CODE : {
            OK : 200,
            MOVED_PERMANENTLY : 302,
            UNAUTHORIZED : 401,
            FORBIDDEN : 403,
            SERVER_ERROR : 500
        },

        PROXY_ERROR_STATUS_CODE : {
            // uncaught ajax error
            AJAX_ERROR : 'PE_AJAX',
            // caught app error
            APP_ERROR : 'PE_APP',
            // caught offline error
            OFFLINE_ERROR : 'PE_OFFLINE'
        },

        /**
         * Endpoints definition
         */
        EP : {
            API_PREFIX : '/api/'
        },

        /**
         * Sets new opts for the global Base Proxy object
         */
        configure : function(opts) {
            $.extend(BaseProxy.opts, opts);
        }
    });

    // Exports
    return BaseProxy;

});