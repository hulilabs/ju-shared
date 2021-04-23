/**
 * Sets a global reference to window inside `window`
 */
/* globals module */

var jsdom = require('jsdom');

var createGlobalWindowObject = function(callback, err, jsdomWindow) {
    window = jsdomWindow; // jshint ignore:line
    callback(err, jsdomWindow);
};

module.exports = function(callback) {
    require('jsdom/lib/old-api').env({
        done : createGlobalWindowObject.bind(null, callback),
        html : '<body></body>'
    });
};
