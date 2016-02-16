/**                   _
 *  _             _ _| |_
 * | |           | |_   _|
 * | |___  _   _ | | |_|
 * | "_  \| | | || | | |
 * | | | || |_| || | | |
 * |_| |_|\___,_||_| |_|
 *
 * (c) Huli Inc
 */

/**
 * @file Refresh token service
 * @description In charge of refreshing the access tokens when is needed it.
 * @requires jquery
 * @requires ju-shared/observable-class
 * @requires ju-shared/jwt/token
 * @module ju-shared/jwt/refresh-token
 * @extends ju-shared/observable-class
 * @fires module:ju-shared/jwt/refresh-token#REFRESH_TOKEN
 */

define([
        'jquery',
        'ju-shared/observable-class',
        'ju-shared/jwt/token'
    ],
    function(
        $,
        ObservableClass,
        JWTToken
    ) {
        'use strict';

        /**
         * @constant {Number} NEEDED_TIME_TO_REFRESH - seconds to refresh the token before it expires
         */
        var NEEDED_TIME_TO_REFRESH = 2 * 60;

        var RefreshToken = ObservableClass.extend({

            timeoutId : null,

            /**
             * @constructor
             * @alias module:ju-shared/jwt/refresh-token
             */
            init : function(token) {
                this.setToken(token);
            },

            /**
             * Starts the process that verifies if needs to update the token
             */
            start : function() {
                if (this.token.isValid()) {
                    var expTime = this.token.getExpirationTime();
                    log('1. RefreshToken: ExpTime ' + (new Date(expTime * 1000)).toLocaleTimeString());

                    var remainingTime = expTime - Math.floor(Date.now() / 1000);
                    log('2. RefreshToken: RemainingTime ' + remainingTime);

                    if (remainingTime <= NEEDED_TIME_TO_REFRESH) {
                        this.trigger(RefreshToken.EV.REFRESH_TOKEN);
                    }else {
                        var nextValidation = remainingTime - NEEDED_TIME_TO_REFRESH;
                        log('3. RefreshToken: NextValidation ' + nextValidation);
                        this.timeoutId = window.setTimeout($.proxy(this.start,this), nextValidation * 1000);
                    }
                }else {
                    Logger.warn('RefreshToken: token invalid');
                }
            },

            /**
             * Stops the timeout execution
             */
            stop : function() {
                if (this.timeoutId) {
                    window.clearTimeout(this.timeoutId);
                    this.timeoutId = undefined;
                }
            },

            /**
             * Stops the current timeout and starts a new one
             */
            restart : function(token) {
                if (token) {
                    this.setToken(token);
                }
                log('0. RefreshToken: timeout stopped and restarted');
                this.stop();
                this.start();
            },

            /**
             * Sets the token property
             * @param {JWTToken} token - new token
             */
            setToken : function(token) {
                this.token = token;
            }
        });

        RefreshToken.classMembers({
            EV : {
                /**
                 * Event triggered when the value of token should be refreshed because is going to expire
                 * @event module:ju-shared/jwt/refresh-token#REFRESH_TOKEN
                 */
                REFRESH_TOKEN : 'refreshToken'
            }
        });

        // Exports
        return RefreshToken;
    });
