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
        log('BaseProxy: AJAX error on request to URL: ', jqxhr, textStatus, errorThrown);

        var stopPropagation = false,
            handlerFunction = this.opts.statusHandlers['code' + jqxhr.status];
        // will attempt to call a handler function named code### inside statusHandlers opt
        // where ### is the status code
        if ('function' === typeof handlerFunction && $.isNumeric(jqxhr.status)) {
            stopPropagation = handlerFunction();
        }

        return stopPropagation;
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

        // first check if there's a proper error message retrieved from the app
        var appErrorMessage = getAppErrMsg(err);
        if (appErrorMessage) {
            var proxyError = {
                code : BaseProxy.PROXY_ERROR_STATUS_CODE.APP_ERROR,
                customMessage : appErrorMessage,
                defaultMessage : APP_ERROR_MSG
            };

            log('BaseProxy: defaultErrorHandler caught app-handled error', proxyError);
            return BaseProxy.opts.defaultErrorHandler(err, closeCallBack, proxyError);
        }

        // second, check for connection errors
        var isInternetConnected = this.opts.connectionObserver.isOnline();
        if (isAjaxResultDisconnected(err) || !isInternetConnected) {
            Logger.warn('BaseProxy: defaultErrorHandler disconnected error');
            return this.opts.defaultNotConnectedHandler(err, closeCallBack);
        }

        // third, fallback to uncaught ajax error status
        var proxyError = {
            code : BaseProxy.PROXY_ERROR_STATUS_CODE.AJAX_ERROR,
            customMessage : null,
            defaultMessage : ERROR_MSG
        };

        log('BaseProxy: defaultErrorHandler AJAX error', proxyError);
        return BaseProxy.opts.defaultErrorHandler(err, closeCallBack, proxyError);
    };

    /**
     * Removes the trailing slashes from the URL
     * @return {string} removes the url without the trailing slash
     */
    var removeTrailingSlashes = function(url) {
        return url ? url.replace(/\/$/, '') : null;
    };

    /**
     * Base Proxy class
     */
    var BaseProxy = Class.extend({ // jshint ignore:line

        init : function(opts) {

            this.opts = $.extend(true, {
                // if function is provided, it's called right before the ajax
                // request is performed. It receives a callback to perform the
                // ajax request and the params ready for performing the request
                beforeMakingAjaxRequest : BaseProxy.opts.defaultBeforeMakingAjaxRequest,
                statusHandlers : BaseProxy.opts.statusHandlers,
                // called before the default error handler for handling HTTP status
                // codes for requests that resulted from an error
                ajaxErrorHandler : $.proxy(ajaxErrorFn, this),
                // handles custom application errors that are returned on a successful
                // ajax request
                appErrorHandler : null,
                // skips call to ajaxErrorHandler and code###Handler
                // so ajax errors will be passed to error handler
                skipAjaxErrorsHandling : false,
                // checked wheter we want to know if there's a connection available
                connectionObserver : BaseProxy.opts.defaultConnectionObserver,
                defaultNotConnectedHandler : $.proxy(defaultNotConnectedHandler, this),
                defaultErrorHandler : $.proxy(defaultErrorHandler, this),
                defaultSuccessHandler : $.noop
            }, opts);
        },

        makeAjaxRequest : function(userParams, stringifyData) {

            var params = {
                dataType : 'json',
                jsonp : false
            };

            // removes any trailing slashes from the end
            userParams.url = removeTrailingSlashes(userParams.url);

            var originalSuccessFn = userParams.success || this.opts.defaultSuccessHandler,
                originalErrorFn = userParams.error || this.opts.defaultErrorHandler,
                appErrorHandler = userParams.appError || this.opts.appErrorHandler || originalErrorFn;

            userParams.success = $.proxy(
                this._handleAjaxRequestSuccess,
                this,
                originalSuccessFn,
                appErrorHandler,
                userParams);

            userParams.error = $.proxy(
                this._handleAjaxRequestError,
                this,
                originalErrorFn,
                userParams);

            // stringify the data before performing the AJAX call
            if (stringifyData) {
                userParams.data = JSON.stringify(userParams.data);
            }

            $.extend(params, userParams);
            // hook exposed as `beforeMakingAjaxRequest` to execute code before
            // performing any ajax request and wait for a callback to be called
            if ('function' === typeof this.opts.beforeMakingAjaxRequest) {
                var performAjaxRequestCallback = $.proxy($.ajax, $);
                return this.opts.beforeMakingAjaxRequest(performAjaxRequestCallback, params);

            } else {
            // if no hook is provided, performs the request
                return $.ajax(params);
            }
        },

        _handleAjaxRequestSuccess : function(successHandler, appErrorHandler, requestData, response, textStatus, request) {
            BaseProxy.opts.preprocessAjaxSuccess(response, textStatus, request);

            if (response && response.errors) {
                log('BaseProxy: application error on successful AJAX request ', response.errors);
                return appErrorHandler.call(this, this._normalizeError(response, null, null, null, requestData));
            }
            successHandler.call(this, response, textStatus, request);
        },

        _handleAjaxRequestError : function(errorHandler, requestData, request, textStatus, errorThrown) {
            log('BaseProxy: handling AJAX error', arguments);
            BaseProxy.opts.preprocessAjaxError(request, textStatus, errorThrown);

            var wasErrorStoppedInAjaxHandler = false;
            if (!this.opts.skipAjaxErrorsHandling) {
                wasErrorStoppedInAjaxHandler = this.opts.ajaxErrorHandler.call(this, request, textStatus, errorThrown);
            }

            if (!wasErrorStoppedInAjaxHandler) {
                errorHandler.call(this, this._normalizeError(null, request, textStatus, errorThrown, requestData));
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

        _normalizeError : function(appError, jqxhr, textStatus, errorThrown, requestData) {
            return {
                appError : appError,
                jqxhr : jqxhr,
                textStatus : textStatus,
                errorThrown : errorThrown,
                requestData : requestData
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
            },

            defaultBeforeMakingAjaxRequest : null,

            defaultConnectionObserver : NavigatorOnlineStatus,

            /*
                DEFAULT HTTP STATUS CODE HANDLERS
                every handler should return `true` if the error should not propagate
                to any other error handlers that might catch the error later
             */

            statusHandlers : {
                code302 : function() {
                    alert('Endpoint was moved permanently'); // jshint ignore:line
                    return true;
                },

                code401 : function() {
                    alert('Your session expired, please log in again.');    // jshint ignore:line
                    // Reload root page for now
                    // TODO: append a redirect URL to be redirected back
                    // to the current module
                    window.location.href = '/';
                    return true;
                },

                code403 : function() {
                    alert('Unfortunately you don\'t have permission to access this section. If you think this is an error please contact the system administrator.');    // jshint ignore:line
                    return false;
                },

                code500 : function() {
                    return false;
                }
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
         * Sets new opts for the global Base Proxy definition object
         */
        configure : function(opts) {
            $.extend(true, BaseProxy.opts, opts);
        }
    });

    // Exports
    return BaseProxy;

});
