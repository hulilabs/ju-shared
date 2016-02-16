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
/* jshint ignore:start */
/**
 * Helper for MD5 or Base64 encoding
 */
define([
            'ju-shared/observable-class',
            'blueimp-md5'
        ],
        function(
            ObservableClass,
            md5
        ) {
    'use strict';

    var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

    // private method for UTF-8 encoding
    var utf8_encode = function(string) {
        string = string.replace(/\r\n/g,'\n');
        var utftext = '';

        for (var n = 0; n < string.length; n++) {

            var c = string.charCodeAt(n);

            if (c < 128) {
                utftext += String.fromCharCode(c);
            } else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            } else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }

        }

        return utftext;
    };

    // class definition
    var Encoder = ObservableClass.extend({});

    Encoder.classMembers({
        /**
         * Encodes string into Base64 format, using native btoa or falling back to custom function
         * based in http://stackoverflow.com/questions/246801/how-can-you-encode-a-string-to-base64-in-javascript#246813
         * @param  {string} encodeMe input
         * @return {String}
         */
        toBase64 : function(encodeMe) {
            // uses browser's function to encode if available, or falls back otherwise
            if (window.btoa) {
                return btoa(encodeMe);
            }

            var output = '';
            var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
            var i = 0;

            var input = utf8_encode(encodeMe);

            while (i < input.length) {

                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);

                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;

                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }

                output = output +
                keyStr.charAt(enc1) + keyStr.charAt(enc2) +
                keyStr.charAt(enc3) + keyStr.charAt(enc4);

            }

            return output;
        },

        /**
         * Encodes string as MD5
         * @param  {string} encodeMe input
         * @return {string}
         */
        toMD5 : function(encodeMe) {
            return md5(encodeMe);
        }
    });

    return Encoder;

});
/* jshint ignore:end */
