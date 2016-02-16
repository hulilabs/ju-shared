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

define([],
        function(
                ) {
    'use strict';

    /**
     * Detects and exposes browser's online/offline status
     * @param {function} onlineHandler
     * @param {function} offlineHandler
     */
    var NavigatorOnlineStatus = function(onlineHandler, offlineHandler) {
        this.isUp = window.navigator.onLine;

        this.setOnlineHandler(onlineHandler);
        this.setOfflineHandler(offlineHandler);
    };

    NavigatorOnlineStatus.prototype = {
        setup : function() {
            this.bindEvents();
        },

        setOnlineHandler : function(onlineHandler) {
            this.onlineHandler = onlineHandler;
        },

        setOfflineHandler : function(offlineHandler) {
            this.offlineHandler = offlineHandler;
        },

        bindEvents : function() {
            window.addEventListener('online', this._onOnline.bind(this));
            window.addEventListener('offline', this._onOnline.bind(this));
        },

        _onOnline : function() {
            this.isUp = window.navigator.onLine;
            if ('function' === typeof this.onlineHandler) {
                this.onlineHandler();
            }
        },

        _onOffline : function() {
            this.isUp = window.navigator.onLine;
            if ('function' === typeof this.offlineHandler) {
                this.offlineHandler();
            }
        }
    };

    // API test for easy access to online status
    NavigatorOnlineStatus.testOnline = function() {
        return window.navigator.onLine !== undefined ?
               window.navigator.onLine : true;
    };

    // alias for testOnline
    NavigatorOnlineStatus.isOnline = function() {
        return NavigatorOnlineStatus.testOnline();
    };

    return NavigatorOnlineStatus;
});
