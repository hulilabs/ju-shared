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
 * @file WebStorage Wrapper
 * @description WebStorage Wrapper, uses localStorage when available
 * Triggers an event if there is a change on a web storage key.
 * @requires jquery
 * @requires ju-shared/observable-class
 * @requires ju-shared/util
 * @module ju-shared/web-storage
 * @listens module:ju-shared/web-storage#storageEvent
 * @fires module:ju-shared/web-storage#storageEvent
 * @extends ju-shared/observable-class
 */

define([
        'jquery',
        'ju-shared/observable-class',
        'ju-shared/util'
    ],
    function(
        $,
        ObservableClass,
        Util
    ) {

        'use strict';

        var WebStorage = ObservableClass.extend({

            /**
             * @constructor
             * @alias module:ju-shared/web-storage
             */
            init : function() {
                this.isLocalStorageAvailable = this.getIsLocalStorageAvailable();
            },

            /**
             * Activate the listener of storage event, it is fired when a storage area (localStorage or sessionStorage) has been modified.
             * @return {WebStorage} itself
             */
            listenStorageEvents : function() {
                window.addEventListener('storage', $.proxy(this.storageEventHandler, this), false);
                return this;
            },

            /**
             * Sets the item in the storage
             * @param {String} key - A String containing the name of the key you want to create/update.
             * @param {String} value - A DOMString containing the value you want to give the key you are creating/updating.
             */
            setItem : function(key, value) {
                if (this.isLocalStorageAvailable) {
                    window.localStorage.setItem(key, value);
                }
            },

            /**
             * Gets the item from the storage
             * @param {String} key - A String containing the name of the key you want to create/update.
             * @return {String} value for the given key
             */
            getItem : function(key) {
                return window.localStorage.getItem(key);
            },

            /**
             * Removes the item from the storage
             * @param {String} key - A String containing the name of the key you want to create/update.
             */
            removeItem : function(key) {
                window.localStorage.removeItem(key);
            },

            /***
             * Check if localStorage is natively supported
             * @returns {Boolean}
             */
            getIsLocalStorageAvailable : function() {
                var storage = window.localStorage,
                    storageAvailable = false;
                try {
                    storage.setItem('testKey', '1');
                    storage.removeItem('testKey');
                    storageAvailable = true;
                } catch (e) {
                    Logger.error('localStorage is not available');
                }
                return storageAvailable;
            },

            /**
             * Clear local storage data
             */
            deleteLocalStorage : function() {
                window.localStorage.clear();
            },

            /**
             * Event handler for storage events
             * @param event {StorageEvent} - event {@link https://developer.mozilla.org/en-US/docs/Web/Events/storage}
             * @todo implement an event listener for key, right now fires an event for a change in any key
             */
            storageEventHandler : function(event) {
                this.trigger(WebStorage.EV.STORAGE_EVENT, event);
            }
        });

        WebStorage.classMembers({
            EV : {
                /**
                 * Event triggered when a storage value is updated
                 * {@link https://developer.mozilla.org/en-US/docs/Web/Events/storage}
                 * @event module:ju-shared/web-storage#storageEvent
                 */
                STORAGE_EVENT : 'storageEvent'
            },
            formatKey : function() {
                return Util.format.apply(Util, arguments);
            }
        });

        return WebStorage;

    });
