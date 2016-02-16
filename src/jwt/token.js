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
 * @file Represents an JWT token
 * @description Represents an JWT
 * @requires jquery
 * @requires ju-shared/observable-class
 * @requires ju-shared/web-storage
 * @module ju-shared/jwt/token
 * @extends ju-shared/observable-class
 * @listens ju-shared/web-storage#storageEvent
 * @fires module:ju-shared/jwt/token#TOKEN_UPDATED
 */

define([
        'jquery',
        'ju-shared/observable-class',
        'ju-shared/web-storage'
    ],
    function(
        $,
        ObservableClass,
        WebStorage
    ) {
        'use strict';

        /** Constants **/

        /**
         * @constant {String} ERROR_INVALID_TOKEN - Error message for invalid tokens
         */
        var ERROR_INVALID_TOKEN = 'Invalid token';

        /**
         * @constant {String} ERROR_STORAGE_KEY - Error message if the storage key is not provided
         */
        var ERROR_STORAGE_KEY = 'storageKey value is not set, can access to localStorage';

        /**
         * Create an instance of a JWT token
         * @constructor
         * @alias module:ju-shared/jwt/token
         * @param {String} token - JWT token
         * @returns {?Object} jwtToken
         */
        var JWTToken = ObservableClass.extend({

            /**
             * Create an instance of a JWT token
             * @param {String} token - JWT token
             * @param {String} [storageKey] - localStorage key
             * @param {Object} opts - JWT library options
             * @param {Object} opts.audience - audience key(aud definition)
             * @see https://self-issued.info/docs/draft-ietf-oauth-json-web-token.html#audDef
             * @returns {?Object} jwtToken
             */
            init : function(token, storageKey, opts) {
                this.opts = opts;
                this.storageKey = storageKey;
                this._initToken(token);
                if (storageKey) {
                    this.webStorage = new WebStorage().listenStorageEvents();
                    this.webStorage.on(WebStorage.EV.STORAGE_EVENT, $.proxy(this._tokenUpdatedHandler,this));
                }
            },

            /**
             * Initialize the token
             * @param token
             * @private
             */
            _initToken : function(token) {
                /**
                 * Original JWT Token string
                 * @member source {String}
                 * @default null
                 */
                this.source = null;

                /**
                 * Decoded payload
                 * @member payload {Object}
                 * @default {}
                 */
                this.payload = {};

                if (this.validateToken(token)) {
                    this.source = token;
                }
            },

            /**
             * Stores the token in local storage
             */
            write : function() {
                if (this.storageKey) {
                    this.webStorage.setItem(this.storageKey, this.source);
                } else {
                    Logger.warn('Token - write: ' + ERROR_STORAGE_KEY);
                }
            },

            /**
             * Load the token value from local storage
             */
            load : function() {
                if (this.storageKey) {
                    var token = this.webStorage.getItem(this.storageKey);
                    this._initToken(token);
                } else {
                    Logger.warn('Token - load: ' + ERROR_STORAGE_KEY);
                }
            },

            /**
             * Update the token
             * @param {String} token - a JWT token
             */
            update : function(token) {
                if (token) {
                    this._initToken(token);
                }
            },

            /**
             * Get the JWT token
             * @returns {String}
             */
            getToken : function() {
                return this.source;
            },

            /**
             * Get the decoded token payload
             * @returns {?Object} json payload
             */
            getPayload : function() {
               return this.payload;
            },

            /**
             * Get the expiration day
             * @returns {Number} returns -1 if the token doesn't have an expiration day
             */
            getExpirationTime : function() {
                return this.payload ? this.payload.exp : -1;
            },

            /**
             * Check if the token is still valid
             * Check the expiration date and the audience
             * @returns {Boolean} if the token is valid
             */
            isValid : function() {
                return this.payload && this.opts && !this._hasExpired() && this._isTheAudienceValid();
            },

            /**
             * Parse and validate the token provided
             * save the decoded payload into the payload member.
             * @param {String} token - JWT token
             * @returns {Boolean}  if the token is valid
             */
            validateToken : function(token) {
                var tokenValues = [];
                var decodedPayload = null;
                if (token) {
                    tokenValues = token.split('.');
                    if (tokenValues.length === 3) {
                        decodedPayload = this._decode(tokenValues[1]);
                        if (decodedPayload) {
                            this.payload = decodedPayload;
                            return this.isValid();
                        }
                    }
                }
                return false;
            },

            /**
             * Handles the event when the token is updated in other tab or window (localStorage)
             * @param event
             */
            _tokenUpdatedHandler : function(event) {
                if (event && event.key === this.storageKey) {
                    log('Token: Token Updated in localStorage, reloading token in memory');
                    this.load();
                    this.trigger(JWTToken.EV.TOKEN_UPDATED + this.storageKey);
                }
            },

            /**
             * Decode the base64 value
             * @param {String} value - base64 String (encoded JSON)
             * @returns {!Object} decoded JSON
             */
            _decode : function(value) {
                try {
                    return JSON.parse(window.atob(value));
                }catch (error) {
                    Logger.error(ERROR_INVALID_TOKEN, error);
                    return null;
                }
            },

            /**
             * Checks if the expiration date is greater than the current date
             * @returns {Boolean}
             * @private
             */
            _hasExpired : function() {
                if (typeof this.payload.exp === 'number') {
                    /** if the expiration date is greater than the current date */
                    if (this.payload.exp > Math.floor(Date.now() / 1000)) {
                        return false;
                    }
                }
                return true;
            },

            /**
             * Checks if the token payload audience matches the desired audience(opts.audience)
             * @returns {Boolean}
             * @private
             */
            _isTheAudienceValid : function() {
                var options = this.opts;
                var payload = this.payload;
                if (options.audience) {
                    var audiences = Array.isArray(options.audience) ? options.audience : [options.audience];
                    var target = Array.isArray(payload.aud) ? payload.aud : [payload.aud];

                    return target.some(function(aud) {
                        return audiences.indexOf(aud) != -1;
                    });
                }
                return false;
            }
        });

        JWTToken.classMembers({
            /**
             * Event triggered when the value of token is reloaded from localStorage
             * This event has the following pattern "tokenUpdated:VALUE" VALUE is the localStorage Key
             * where the token is stored.
             * @event module:ju-shared/jwt/token#TOKEN_UPDATED
             */
            EV : {
                    TOKEN_UPDATED : 'tokenUpdated:'
                }
        });

        // Exports
        return JWTToken;
});
