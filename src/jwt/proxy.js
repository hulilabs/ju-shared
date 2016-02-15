/**                   _
 *  _             _ _| |_
 * | |           | |_   _|
 * | |___  _   _ | | |_|
 * | '_  \| | | || | | |
 * | | | || |_| || | | |
 * |_| |_|\___,_||_| |_|
 *`
 * (c) Huli Inc
 */

/**
 * @file Make requests to the auth server
 * @description Handles the login, logout and refreshToken requests
 * @requires jquery
 * @requires ju-shared/base-proxy
 * @requires ju-shared/jwt/auth-provider
 * @module ju-shared/jwt/proxy
 * @extends ju-shared/base-proxy
 */

define([
            'jquery',
            'ju-shared/base-proxy',
            'ju-shared/jwt/auth-provider'
        ],
        function(
                    $,
                    BaseProxy,
                    AuthProvider
                ) {
    'use strict';

    var AuthProxy = BaseProxy.extend({

        /**
         * @constructor
         * @alias module:ju-shared/jwt/proxy
         * @param {String} opts.APP_KEY - The consumer ID key
         * @param {String} opts.EP.LOGIN - the login URL endpoint
         * @param {String} opts.EP.LOGOUT - the logout URL endpoint
         * @param {String} opts.EP.REFRESH_TOKEN - the refreshToken URL endpoint
         */
        init : function(opts) {
            opts = opts || {};
            opts.skipAjaxErrorsHandling = true;
            this._super.call(this, opts);
            this.authProvider = AuthProvider.getInst();
        },

        /**
         * Login request
         * @param {Object} params
         * @param {String} params.email - email address
         * @param {String} params.password - user password
         * @param {Function} successCallback
         * @param {Function} errorCallback
         */
        login : function(params, successCallback, errorCallback) {
            var requestUrl = this.EP && this.EP.LOGIN ? this.EP.LOGIN : AuthProxy.opts.EP.LOGIN;
            var ajaxParams = {
                headers : {
                    APP_KEY : this.opts.appKey || AuthProvider.opts.appKey
                },
                contentType : 'application/x-www-form-urlencoded',
                data : params,
                url : requestUrl,
                useJWTAuthentication : false,
                type : 'POST',
                success : function(result, textStatus, request) {
                    this._loginSuccess(result, textStatus, request, successCallback);
                },
                error : function(request, textStatus, error) {
                    this._loginError(request, textStatus, error, errorCallback);
                }
            };
            this.makeAjaxRequest(ajaxParams);
        },

        /**
         * Is executed when the login is successful, it saves the provided token.
         * @param {Anything} result
         * @param {String} textStatus
         * @param {jqXHR} request
         * @param {Function} callback
         * @private
         * @see http://api.jquery.com/jquery.ajax/#jQuery-ajax-settings
         */
        _loginSuccess : function(result, textStatus, request, callback) {
            var token = result.data && result.data.jwt ? result.data.jwt : null;
            /** Update the localStorage with the returned token **/
            this.authProvider.updateToken(token);
            callback(result, textStatus, request);
        },

        /**
         * Is executed when the login fails, set the token as null
         * @param {jqXHR} request
         * @param {String} textStatus
         * @param {String} error
         * @param {Function} callback
         * @private
         */
        _loginError : function(request, textStatus, error, callback) {
            this.authProvider.updateToken(null);
            callback(request, textStatus, error);
        },

        /**
         * Logout request
         * @param {Function} successCallback
         * @param {Function} errorCallback
         * @see https://github.com/hulilabs/portunus#get-authlogout
         */
        logout : function(successCallback, errorCallback) {
            var requestUrl = this.EP && this.EP.LOGOUT ? this.EP.LOGOUT : AuthProxy.opts.EP.LOGOUT;
            var ajaxParams = {
                url : requestUrl,
                type : 'GET',
                success : function(result, textStatus, request) {
                    this._logoutSuccess(result, textStatus, request, successCallback);
                },
                error : function(request, textStatus, error) {
                    this._logoutError(request, textStatus, error, errorCallback);
                }
            };
            this.makeAjaxRequest(ajaxParams);
        },

        /**
         * Is executed when the logout is successful, sets the token null.
         * @param {Anything} result
         * @param {String} textStatus
         * @param {jqXHR} request
         * @param {Function} callback
         * @private
         * @see http://api.jquery.com/jquery.ajax/#jQuery-ajax-settings
         */
        _logoutSuccess : function(result, textStatus, request, callback) {
            this.authProvider.updateToken(null);
            callback(result, textStatus, request);
        },

        /**
         * Is executed when the logout fails
         * @param {jqXHR} request
         * @param {String} textStatus
         * @param {String} error
         * @param {Function} callback
         * @private
         */
        _logoutError : function(request, textStatus, error, callback) {
            /***
             * @TODO define what to do when the logout fails
             */
            Logger.error(error, request);
            callback(request, textStatus, error);
        },

        /**
         * Refresh token request
         * @param {Function} successCallback
         * @param {Function} errorCallback
         * @see https://github.com/hulilabs/portunus#get-authrefresh
         */
        refreshToken : function(successCallback, errorCallback) {
            var requestUrl = this.EP && this.EP.REFRESH_TOKEN ? this.EP.REFRESH_TOKEN : AuthProxy.opts.EP.REFRESH_TOKEN;
            var ajaxParams = {
                url : requestUrl,
                type : 'GET',
                success : function(result, textStatus, request) {
                    this._refreshTokenSuccess(result, textStatus, request, successCallback);
                },
                error : function(request, textStatus, error) {
                    this._refreshTokenError(request, textStatus, error, errorCallback);
                }
            };
            this.makeAjaxRequest(ajaxParams);
        },

        /**
         * Is executed when the refreshToken is successfully.
         * @param {Anything} result
         * @param {String} textStatus
         * @param {jqXHR} request
         * @param {Function} callback
         * @private
         * @see http://api.jquery.com/jquery.ajax/#jQuery-ajax-settings
         */
        _refreshTokenSuccess : function(result, textStatus, request, callback) {
            var token = result.data ? result.data.jwt : null;
            /** Update the localStorage with the returned token **/
            this.authProvider.updateToken(token);
            callback(result, textStatus, request);
        },

        /**
         * Is executed when the refreshToken fails
         * @param {jqXHR} request
         * @param {String} textStatus
         * @param {String} error
         * @param {Function} callback
         * @private
         */
        _refreshTokenError : function(request, textStatus, error, callback) {
            /**
             * @TODO define what to do when the refreshToken fails
             */
            Logger.error(error, request);
            callback(request, textStatus, error);
        }
    });

    AuthProxy.classMembers({
        opts : {},
        /**
         * Sets new opts for the global Base Proxy definition object
         */
        configure : function(opts) {
            $.extend(AuthProxy.opts, opts);
        }
    });

    /**
     * Export models
     */
     return AuthProxy;
});
