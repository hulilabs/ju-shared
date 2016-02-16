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
 * Client vars manager
 */
define([
            'ju-shared/class'
        ],
        function(
            Class
        ) {
    'use strict';

    /**
     * Client vars manager
     * This class stores a dictionary of key-value paris
     * sent by the server. It can keep track of a group of
     * vars by storing the name of the group. This is
     * useful for the controllers to know when to fetch
     * these vars from the server of if they are already registered
     */
    var ClientVarsManager = Class.extend({

        init : function() {   // Initialize variables dictionary
            this.varsDictionary = {};
            // Tracks the names of the groups that
            // have been added to the vars collection
            this.addedGroups = {};
        },
        /**
         * Appends new key-values to the current
         * dictionary
         * @param  {object} vars      object with key-value pairs
         * @param  {string} groupName Optional. Name of the group
         *                            of vars that will be appended
         */
        append : function(vars, groupName) {

            var varsDict = this.varsDictionary,
                newVarsCount = 0;
            // Copy all the new vars to the current instance dictionary
            for (var varKey in vars) {
                if (vars.hasOwnProperty(varKey)) {
                  varsDict[varKey] = vars[varKey];
                  newVarsCount++;
                }
            }
            // If group name is defined then track it
            if (groupName) {
                this.addedGroups[groupName] = newVarsCount;
            }
        },
        /**
         * Gets a particlar value by the key
         * @param  {string} keyName name of the key to fetch
         * @return {mixed}         the value returned by the server
         *                             for that key
         */
        get : function(keyName) {
            var value = this.varsDictionary[keyName];
            if (value == null) {
                Logger.warn("ClientVarsManager: Couldn't find value for key", keyName);
            }
            return value;
        },

        set : function(keyName, value) {

            var oldValue = this.varsDictionary[keyName];
            this.varsDictionary[keyName] = value;

            return oldValue;
        },

        /**
         * Validates if a specified key exists or not
         * @return {bool}         true if the key exists
         */
        exists : function(keyName) {
            return (this.varsDictionary[keyName] != null);
        },

        /**
         * Checks if the given group name was already added
         * to the dictionary
         * @param  {string}  groupName name of the group to check
         * @return {Boolean}           true if the group name was
         *                                  already dadded
         */
        isGroupLoaded : function(groupName) {
            var groupVarsSize = this.addedGroups[groupName];
            return (groupVarsSize && groupVarsSize > 0);
        }
    });

    return ClientVarsManager;
    //context.ClientVarsManager = ClientVarsManager;

});
