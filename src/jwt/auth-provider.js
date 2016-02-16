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
 * @file Manage the authentication token
 * @description Manages the authentication token(CRUD operations), signs requests
 * Handles the Login and logout requests and the refresh token flow.
 * @requires jquery
 * @requires ju-shared/observable-class
 * @requires ju-shared/jwt/token
 * @requires ju-shared/jwt/refresh-token
 * @requires ju-shared/jwt/proxy
 * @module ju-shared/jwt/auth-provider
 * @extends ju-shared/observable-class
 * @listens  module:ju-shared/jwt/token#TOKEN_UPDATED
 * @listens  module:ju-shared/jwt/refresh-token#REFRESH_TOKEN
 */

define([
        'jquery',
        'ju-shared/observable-class',
        'ju-shared/jwt/token',
        'ju-shared/jwt/refresh-token',
        'ju-shared/jwt/proxy'
    ],
    function(
        $,
        ObservableClass,
        JWTToken,
        RefreshToken,
        AuthProxy
    ) {
        'use strict';

        var AuthProvider = ObservableClass.extend({

            /**
             * @constructor
             * @alias module:ju-shared/jwt/auth-provider
             * @param {Object} opts - configuration
             * @param {String} opts.appKey - App key used to validate and request tokens
             * @param {String} [opts.storageKey] - localStorage key name
             * @param {Object} [opts.proxy] - AuthProxy configuration, check: @see module:ju-shared/jwt/proxy
             */
            init : function(opts) {
                this.opts = opts || {};

                this.appKey = this.opts.appKey || AuthProvider.opts.appKey;

                // JWT options needed to create and validate a token
                this.jwtOptions = {
                    audience : this.appKey
                };
                this.storageKey = this.opts.storageKey || AuthProvider.opts.storageKey;

                this.accessToken = new JWTToken(null, this.storageKey, this.jwtOptions);
                this.accessToken.load();

                // any time the token changed, let it know to the refreshToken to restart the timer
                this.accessToken.on(JWTToken.EV.TOKEN_UPDATED + this.storageKey, $.proxy(this._restartRefreshToken,this));

                this._configureProxy();

                this._initRefreshTokenTimer();
            },

            /**
             * Initializes the refresh token timer
             * @private
             */
            _initRefreshTokenTimer : function() {
                this.refreshTokenTimer = RefreshToken.getInst(this.accessToken);
                this.refreshTokenTimer.on(RefreshToken.EV.REFRESH_TOKEN, $.proxy(this._requestNewToken, this));
                if (this.accessToken) {
                    log('0. RefreshToken: timeout started');
                    this.refreshTokenTimer.start();
                }
            },

            /**
             * configures the proxy.
             * @private
             */
            _configureProxy : function() {
                // configuring the proxy
                var proxyConfig = this.opts.proxy || AuthProvider.opts.proxy || {};
                proxyConfig.appKey = this.appKey;
                AuthProxy.configure(proxyConfig);
            },

            /**
             * Add the auth header to the request
             * @param {Function} ajaxCallback  - callback function
             * @param {Object} params  - ajax params
             * @param {Boolean} [params.useJWTAuthentication=true]  - indicates if should use JWT tokens on the request
             */
            signRequest : function(ajaxCallback, params) {
                var useJWTAuthentication = (params && params.useJWTAuthentication === false) ? false : true;
                if (useJWTAuthentication) {
                    var headers = params.headers || {};
                    headers[AuthProvider.HEADER_AUTHORIZATION] = 'Bearer ' + this.accessToken.getToken();
                    params.headers = headers;
                }
                ajaxCallback(params);
            },

            /**
             * Checks if the current user is authenticated
             * @returns {Boolean}
             */
            isAuthenticated : function() {
                return this.accessToken && this.accessToken.isValid();
            },

            /**
             * Authenticates the user
             * @param {Object} credentials
             * @param {String} credentials.email - email address
             * @param {String} credentials.password - user password
             * @param {Function} callback - returns an error and textStatus parameters if the authentication fails
             */
            login : function(credentials, callback) {
                var self = this;
                AuthProxy.getInst().login(credentials,
                    function onSuccess(token) {
                        self.accessToken.update(token);
                        self.accessToken.write();
                        self.refreshTokenTimer.restart(self.accessToken);
                        callback();
                    },
                    function onError(error, textStatus) {
                        callback(error, textStatus);
                    }
                );
            },

            /**
             *  Logs out the user.
             * @param {Function} callback - returns an error and textStatus parameters if the logout fails
             */
            logout : function(callback) {
                AuthProxy.getInst().logout(
                    function onSuccess() {
                        callback();
                    },
                    function onError(error, textStatus) {
                        callback(error, textStatus);
                    }
                );
            },

            /**
             * Request a new token to the Auth server.
             * @private
             */
            _requestNewToken : function() {
                var self = this;
                log('3. RefreshToken: requesting a new token');
                AuthProxy.getInst().refreshToken(
                    function onSuccess(token) {
                        self.accessToken.update(token);
                        self.accessToken.write();
                        log('4. RefreshToken: token updated');
                        self.refreshTokenTimer.restart(self.accessToken);
                    },
                    function onError() {
                        Logger.error("AuthProvider: couldn't refresh the token");
                    }
                );
            },

            /**
             * Restarts the refresh token timer
             * @private
             */
            _restartRefreshToken : function() {
                this.refreshTokenTimer.restart();
            },
        });

        AuthProvider.classMembers({
            /**
             * @constant {String} HEADER_AUTHORIZATION - custom request header, it will store the auth token
             */
            HEADER_AUTHORIZATION : 'authorization',

            opts : {
                storageKey : 'access_token'
            },

            configure : function(opts) {
                $.extend(true, AuthProvider.opts, opts);
            }
        });

        // Exports
        return AuthProvider;
});
