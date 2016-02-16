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
 * @module ju-shared/jwt/proxy
 * @extends ju-shared/base-proxy
 */

define([
            'jquery',
            'ju-shared/base-proxy'
        ],
        function(
                    $,
                    BaseProxy
                ) {
    'use strict';

    var AuthProxy = BaseProxy.extend({

        /**
         * @constructor
         * @alias module:ju-shared/jwt/proxy
         * @param {String} opts.appKey - The consumer ID key
         * @param {String} opts.EP.LOGIN - the login URL endpoint
         * @param {String} opts.EP.LOGOUT - the logout URL endpoint
         * @param {String} opts.EP.REFRESH_TOKEN - the refreshToken URL endpoint
         */
        init : function(opts) {
            opts = opts || {};
            opts.skipAjaxErrorsHandling = true;
            this._super.call(this, opts);
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
                    APP_KEY : this.opts.appKey || AuthProxy.opts.appKey
                },
                contentType : 'application/x-www-form-urlencoded',
                data : params,
                url : requestUrl,
                useJWTAuthentication : false,
                type : 'POST',
                success : function(result, textStatus, request) {
                    if (result.data && result.data.jwt) {
                        successCallback(result.data.jwt);
                    }else {
                        errorCallback();
                    }
                },
                error : function(request, textStatus, error) {
                    errorCallback(error, textStatus);
                }
            };
            this.makeAjaxRequest(ajaxParams);
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
                    successCallback();
                },
                error : function(request, textStatus, error) {
                    /***
                     * @TODO define what to do when the logout fails
                     */
                    Logger.error(error, request);
                    errorCallback(request, textStatus, error);
                }
            };
            this.makeAjaxRequest(ajaxParams);
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
                    if (result.data && result.data.jwt) {
                        successCallback(result.data.jwt);
                    }else {
                        errorCallback();
                    }
                },
                error : function(request, textStatus, error) {
                    /**
                     * @TODO define what to do when the refreshToken fails
                     */
                    Logger.error(error, request);
                    errorCallback(request, textStatus, error);
                }
            };
            this.makeAjaxRequest(ajaxParams);
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
