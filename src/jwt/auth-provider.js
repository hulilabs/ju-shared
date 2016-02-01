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
 * @file Handles the authentication flow with the Auth server.
 * @description In charge of requesting access tokens.
 * Refresh the access token when the access token expired.
 * Add the token to the Authorization header.
 * @requires jquery
 * @requires ju-shared/observable-class
 * @requires ju-shared/jwt/token
 * @requires ju-shared/web-storage
 * @module ju-shared/auth-provider
 * @extends ju-shared/observable-class
 */

define([
        'jquery',
        'ju-shared/observable-class',
        'ju-shared/jwt/token',
        'ju-shared/web-storage'
    ],
    function (
        $,
        ObservableClass,
        JWTToken,
        WebStorage
    ){
        'use strict';


        /** Constants **/

       var ERROR_INVALID_TOKEN = "Token invalid";


        var AuthProvider = ObservableClass.extend({

            /***
             *
             * @param {Object} opts - configuration
             * @param {String} opts.APP_KEY - application id
             * @param {String} opts.LoginURL - login URL
             */
            init : function (opts) {
                this.webStorage = new WebStorage();
                this.appKey = opts.APP_KEY || AuthProvider.opts.APP_KEY;
                this.LoginURL = opts.LoginURL || AuthProvider.LoginURL;
                /** JWT options needed to create and validate a token*/
                this.jwtOptions = {
                    audience: this.appKey
                };
                /**
                 * JWTToken
                 * @member token {?Object}
                 * @default null
                 * @see module:ju-shared/jwt/token
                 */
                this.accessToken = this.loadToken();
                this.webStorage.on(WebStorage.EV.STORAGE_EVENT, $.proxy(this.refreshTokenHandler,this));
            },

            /**
             * Load the token value from the source(1.local storage | 2. cookie)
             * @returns {*|token} JWTToken
             */
            loadToken : function () {
                return new JWTToken(this.webStorage.getItem(AuthProvider.WEB_STORAGE_KEY_ACCESS_TOKEN), this.jwtOptions);
            },

            /**
             * Sets and stores the token on local storage
             * @param token {String} - JWT token
             */
            updateToken : function (token) {
                this.accessToken =  new JWTToken(token, this.jwtOptions);
                var jwtToken = this.accessToken ?  this.accessToken.getToken() : null;
                this.webStorage.setItem(AuthProvider.WEB_STORAGE_KEY_ACCESS_TOKEN, jwtToken);
            },

            /**
             * Add the auth header to the request
             * @param {Function} ajaxCallback  - callback function
             * @param {Object} params  - ajax params
             * @param {Boolean} [params.useJWTAuthentication=true]  - indicates if should use JWT tokens on the request
             */
            signRequest : function (ajaxCallback, params) {
                var useJWTAuthentication = (params && params.useJWTAuthentication === false) ? false : true;
                if (useJWTAuthentication) {
                    var headers = params.headers || {};
                    headers[AuthProvider.HEADER_AUTHORIZATION] = 'Bearer ' + this.accessToken.getToken();
                    params.headers = headers;
                }
                ajaxCallback(params);
            },

            /***
             * Checks if the current token is valid
             * @returns {Boolean}
             */
            isTokenValid : function () {
                return this.accessToken && this.accessToken.isValid();
            },

            /***
             * Handle the event when the token is updated in other tab or window
             * @param {StorageEvent} event
             * @see https://developer.mozilla.org/en-US/docs/Web/Events/storage
             */
            refreshTokenHandler : function(event){
                if (event && event.key === AuthProvider.WEB_STORAGE_KEY_ACCESS_TOKEN){
                    log('new access token, updated in other tab');
                    this.accessToken = this.loadToken();
                }
            },

            /***
             * Returns a middleware object to handle the auth
             * @returns {Object}
             */
            getMiddleware  : function () {
                var _self = this;
                var Middleware = {};

                /**
                 * Defines and returns a promise that validates the authentication
                 * @param {Object }controllerInfo - controller/route information
                 * @returns {Promise}
                 */
               Middleware.run = function (controllerInfo) {
                    return new Promise(function(resolve, reject) {
                        if (!controllerInfo.needAuthentication || (controllerInfo.needAuthentication && _self.isTokenValid())) {
                            resolve(true);
                        }
                        else {
                            reject(new Error(ERROR_INVALID_TOKEN));
                        }
                    });
                };


                /**
                 * Redirects to opts.LoginURL when the authentication fails
                 * @param {Error}
                 */
                Middleware.errorHandler = function (error) {
                    log('Error handled, token invalid, redirect to login page '+ _self.LoginURL);
                    window.location.href = _self.LoginURL;
                    throw error;
                };

                return Middleware;
            }
        });


        AuthProvider.classMembers({
            /**
             * @constant {String} HEADER_AUTHORIZATION - custom request header, it will store the auth token
             */
            HEADER_AUTHORIZATION : 'authorization',

            /**
             * @constant {String} WEB_STORAGE_KEY_ACCESS_TOKEN - Web storage key for the access token, it will store the token
             */
            WEB_STORAGE_KEY_ACCESS_TOKEN : 'access_token',

            opts : {
                LoginURL : '/'
            },

            configure : function(opts) {
                $.extend(true, AuthProvider.opts, opts);
            }
        });

        // Exports
        return AuthProvider;
});