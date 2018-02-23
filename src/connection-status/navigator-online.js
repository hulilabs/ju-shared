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
        /**
         * Warning : Issue #22
         *
         * Navigator online is not bulletproof on detecting the real connection status because it
         * relies on the network hardware drivers too. When the browser is not able to reach the
         * hardware, it will remain window.navigator.onLine=false.
         *
         * There is alternatives like a ping to the current domain headers:
         * @see http://louisremi.com/2011/04/22/navigator-online-alternative-serverreachable/
         * @see https://gist.github.com/tspringborg/5917663
         *
         * Be aware of this issue when users complain about "not being online" notifications.
         */
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
            window.addEventListener('offline', this._onOffline.bind(this));
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
