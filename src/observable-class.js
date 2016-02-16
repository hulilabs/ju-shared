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
 * Observable Class
 */
define([
            'jquery',
            'ju-shared/class'
        ],
        function(
            $,
            Class
        ) {
    'use strict';

    /**
     * ObservableClass class
     * Extend this class to inhering the custom event/messaging for this object
     */
    var ObservableClass = Class.extend({
        addListener : function(type, listener) {
            var self = this;
            // Makes sure the listener object is defined
            if (!self._listeners) {
                (self._listeners = {});
            }

            // Declare internal function
            var _pushListenerFn = function(_type) {
                var listeners = self._listeners[_type];

                if (typeof listeners == 'undefined') {
                    self._listeners[_type] = [];
                    listeners = self._listeners[_type];
                }

                if ($.inArray(listener,listeners) == -1) {
                    self._listeners[_type].push(listener);
                } else {
                    Logger.error('ObservableClass: listener was already added. Preventing duplicate listeners');
                }
            };

            if ($.isArray(type)) {
                // type is an array so we add the listener for all the event types
                for (var i = 0, len = type.length; i < len; i++) {
                    _pushListenerFn(type[i]);
                }
            } else {
                // Type is a string so we just add the corresponding listener
                _pushListenerFn(type);
            }
        },

        on : function() {
            this.addListener.apply(this, arguments);
        },

        fireEvent : function(name) {

            var status = true;

            if (this._listeners) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (this._listeners[name] instanceof Array) {
                    var listeners = this._listeners[name];
                    for (var i = 0, len = listeners.length; i < len; i++) {
                        var result = listeners[i].apply(this, args);

                        if (!result && typeof result != 'boolean') {
                            result = true;
                        }

                        status = status && result;
                    }
                }

            }

            return status;
        },

        trigger : function() {
            return this.fireEvent.apply(this, arguments);
        },

        /**
         * Removes the specified listener from type
         * @param  {[type]} type     [description]
         * @param  {[type]} listener [description]
         * @return {[type]}          [description]
         */
        removeListener : function(type, listener) {
            // Makes sure the listener object is defined
            if (!this._listeners) {
                (this._listeners = {});
            }

            if (listener) {
                if (this._listeners[type] instanceof Array) {
                    var listeners = this._listeners[type];
                    for (var i = 0, len = listeners.length; i < len; i++) {
                        if (listeners[i] === listener) {
                            listeners.splice(i, 1);
                            break;
                        }
                    }
                }
            } else {
                // Removes all the listener for this type
                this.deleteAllListener(type);
            }
        },

        /**
         * Deletes all the listener asociates to an specific event
         */
        deleteAllListener : function(type) {

            if (!type) {
                // Removes all the listeners for this class
                this._listeners = null;
            } else {
                if (this._listeners && (this._listeners[type] instanceof Array)) {
                    this._listeners[type] = [];
                }
            }

        },

        /**
         * Alias for the remove listener method
         */
        off : function() {
            this.removeListener.apply(this, arguments);
        }
    });

    // Exporting module
    return ObservableClass;

});
