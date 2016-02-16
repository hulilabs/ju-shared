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
 * L10n client-side module
 * This layer provides access to L10n translations in the server side
 */

define([
            'jquery',
            'ju-shared/client-vars-manager'
        ],
        function(
            $,
            ClientVarsManager
        ) {
    'use strict';

    var CONTEXT_VARS_NAME = 'l10n';

    /**
     * L10n manager in the client side
     * Contains translations coming from the server side
     */
    var L10nManager = ClientVarsManager.extend({

        /**
         * This is the get method, shortened to match
         * the server side method name
         * @param  {string} keyName translation key
         * @return {string}         translated text
         */
        t : function(keyName, defaultText) {
            return this.get(keyName) || defaultText;
        },
        /**
         * Gets a callback function that will output the translated key upon
         * call returning the translated text if found, or the defaultMsg otherwise
         *
         * @param  {string}  keyName    the L10n key
         * @param  {string}  defaultMsg The fallback message if the key is not found
         * @param  {Boolean} hasParams  whether the message contains parameters to be replaced
         * @return {string}             translated text
         */
        getMsgFunction : function(keyName, defaultMsg, hasParams) {
            //log('Creating new l10nMsgBinding');
            var self = this;
            return function() {
                // var msg = $.isFunction(Validator.msgs[name]) ?
                //         Validator.msgs[name](params) : Validator.msgs[name];
                var msg = self.t(keyName) || defaultMsg;
                if (hasParams) {
                    var args = $.makeArray(arguments) || [];
                    args.unshift(msg);

                    return (HH.format.apply(HH, args));
                }
                return msg;
            };
        },
        /**
         * Mark a group as loaded, assigning a count of 1
         */
        markGroupAsLoaded : function(groupName) {
            this.addedGroups[groupName] = 1;
        }
    });

    var l10nManagerInstance = (new L10nManager());
    /**
     *  Checks for any initial L10n variable in the global scope
     *  that the server rendered in the page
     */
    l10nManagerInstance.append(window[CONTEXT_VARS_NAME], CONTEXT_VARS_NAME);

    // exports
    return l10nManagerInstance;

});
