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
 *  Utils
 */

/* jscs: disable requireCurlyBraces */
/* jshint ignore:start */
define([],
        function() {
    'use strict';

    var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

    // Create quick reference variables for speed access to core prototypes.
    var push = ArrayProto.push,
    slice = ArrayProto.slice,
    concat = ArrayProto.concat,
    toString = ObjProto.toString,
    hasOwnProperty = ObjProto.hasOwnProperty;

    var
    nativeForEach = ArrayProto.forEach,
    nativeMap = ArrayProto.map,
    nativeReduce = ArrayProto.reduce,
    nativeReduceRight = ArrayProto.reduceRight,
    nativeFilter = ArrayProto.filter,
    nativeEvery = ArrayProto.every,
    nativeSome = ArrayProto.some,
    nativeIndexOf = ArrayProto.indexOf,
    nativeLastIndexOf = ArrayProto.lastIndexOf,
    nativeIsArray = Array.isArray,
    nativeKeys = Object.keys,
    nativeCreate = Object.create,
    nativeBind = FuncProto.bind;

    // Naked function reference for surrogate-prototype-swapping.
    var Ctor = function() {};

    var Util = {};

    // Internal function that returns an efficient (for current engines) version
    // of the passed-in callback, to be repeatedly applied in other Underscore
    // functions.
    var optimizeCb = function(func, context, argCount) {
        if (context === void 0) return func;
        switch (argCount == null ? 3 : argCount) {
            case 1:
                return function(value) {
                    return func.call(context, value);
                };
                // The 2-parameter case has been omitted only because no current consumers
                // made use of it.
            case 3:
                return function(value, index, collection) {
                    return func.call(context, value, index, collection);
                };
            case 4:
                return function(accumulator, value, index, collection) {
                    return func.call(context, accumulator, value, index, collection);
                };
        }
        return function() {
            return func.apply(context, arguments);
        };
    };

    // A mostly-internal function to generate callbacks that can be applied
    // to each element in a collection, returning the desired result — either
    // identity, an arbitrary callback, a property matcher, or a property accessor.
    var cb = function(value, context, argCount) {
        if (value == null) return Util.identity;
        if (Util.isFunction(value)) return optimizeCb(value, context, argCount);
        if (Util.isObject(value)) return Util.matcher(value);
        return Util.property(value);
    };

    var property = Util.property = function(key) {
        return function(obj) {
            return obj == null ? void 0 : obj[key];
        };
    };

    // An internal function for creating assigner functions.
    var createAssigner = function(keysFunc, defaults) {
        return function(obj) {
            var length = arguments.length;
            if (defaults) obj = Object(obj);
            if (length < 2 || obj == null) return obj;
            for (var index = 1; index < length; index++) {
                var source = arguments[index],
                    keys = keysFunc(source),
                    l = keys.length;
                for (var i = 0; i < l; i++) {
                    var key = keys[i];
                    if (!defaults || obj[key] === void 0) obj[key] = source[key];
                }
            }
            return obj;
        };
    };

    // An internal function for creating a new object that inherits from another.
    var baseCreate = function(prototype) {
        if (!Util.isObject(prototype)) return {};
        if (nativeCreate) return nativeCreate(prototype);
        Ctor.prototype = prototype;
        var result = new Ctor;
        Ctor.prototype = null;
        return result;
    };

    // Determines whether to execute a function as a constructor
    // or a normal function with the provided arguments
    var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
        if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
        var self = baseCreate(sourceFunc.prototype);
        var result = sourceFunc.apply(self, args);
        if (Util.isObject(result)) return result;
        return self;
    };

    // Internal implementation of a recursive `flatten` function.
    var flatten = function(input, shallow, strict, output) {
        output = output || [];
        var idx = output.length;
        for (var i = 0, length = getLength(input); i < length; i++) {
            var value = input[i];
            if (isArrayLike(value) && (Util.isArray(value) || Util.isArguments(value))) {
                //flatten current level of array or arguments object
                if (shallow) {
                    var j = 0,
                        len = value.length;
                    while (j < len) output[idx++] = value[j++];
                } else {
                    flatten(value, shallow, strict, output);
                    idx = output.length;
                }
            } else if (!strict) {
                output[idx++] = value;
            }
        }
        return output;
    };

    // Helper for collection methods to determine whether a collection
    // should be iterated as an array or as an object
    // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
    // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
    var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
    var getLength = property('length');
    var isArrayLike = function(collection) {
        var length = getLength(collection);
        return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
    };

    // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
    var hasEnumBug = !{
        toString : null
    }.propertyIsEnumerable('toString');
    var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
        'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'
    ];

    var collectNonEnumProps = function(obj, keys) {
        var nonEnumIdx = nonEnumerableProps.length;
        var constructor = obj.constructor;
        var proto = Util.isFunction(constructor) && constructor.prototype || ObjProto;

        // Constructor is a special case.
        var prop = 'constructor';
        if (Util.has(obj, prop) && !Util.contains(keys, prop)) keys.push(prop);

        while (nonEnumIdx--) {
            prop = nonEnumerableProps[nonEnumIdx];
            if (prop in obj && obj[prop] !== proto[prop] && !Util.contains(keys, prop)) {
                keys.push(prop);
            }
        }
    };

    // Utility Functions
    // -----------------

    // Flatten out an array, either recursively (by default), or just one level.
    Util.flatten = function(array, shallow) {
        return flatten(array, shallow, false);
    };

    // Keep the identity function around for default iteratees.
    Util.identity = function(value) {
        return value;
    };

    // Returns a predicate for checking whether an object has a given set of
    // `key:value` pairs.
    Util.matcher = Util.matches = function(attrs) {
        attrs = Util.extendOwn({}, attrs);
        return function(obj) {
            return Util.isMatch(obj, attrs);
        };
    };

    // Assigns a given object with all the own properties in the passed-in object(s)
    // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
    Util.extendOwn = Util.assign = createAssigner(Util.keys);

   // Is a given variable an object?
    Util.isObject = function(obj) {
        var type = typeof obj;
        return type === 'function' || type === 'object' && !!obj;
    };

    // Returns whether an object has a given set of `key:value` pairs.
    Util.isMatch = function(object, attrs) {
        var keys = Util.keys(attrs),
            length = keys.length;
        if (object == null) return !length;
        var obj = Object(object);
        for (var i = 0; i < length; i++) {
            var key = keys[i];
            if (attrs[key] !== obj[key] || !(key in obj)) return false;
        }
        return true;
    };

    // Similar to ES6's rest param (http://ariya.ofilabs.com/2013/03/es6-and-rest-parameter.html)
    // This accumulates the arguments passed into an array, after a given index.
    var restArgs = Util.restArgs = function(func, startIndex) {
        startIndex = startIndex == null ? func.length - 1 : +startIndex;
        return function() {
            var length = Math.max(arguments.length - startIndex, 0);
            var rest = Array(length);
            for (var index = 0; index < length; index++) {
                rest[index] = arguments[index + startIndex];
            }
            switch (startIndex) {
                case 0:
                    return func.call(this, rest);
                case 1:
                    return func.call(this, arguments[0], rest);
                case 2:
                    return func.call(this, arguments[0], arguments[1], rest);
            }
            var args = Array(startIndex + 1);
            for (index = 0; index < startIndex; index++) {
                args[index] = arguments[index];
            }
            args[startIndex] = rest;
            return func.apply(this, args);
        };
    };

    // The cornerstone, an `each` implementation, aka `forEach`.
    // Handles raw objects in addition to array-likes. Treats all
    // sparse array-likes as if they were dense.
    var each = Util.each = Util.forEach = function(obj, iteratee, context) {
        iteratee = optimizeCb(iteratee, context);
        var i, length;
        if (isArrayLike(obj)) {
            for (i = 0, length = obj.length; i < length; i++) {
                iteratee(obj[i], i, obj);
            }
        } else {
            var keys = Util.keys(obj);
            for (i = 0, length = keys.length; i < length; i++) {
                iteratee(obj[keys[i]], keys[i], obj);
            }
        }
        return obj;
    };

    // Determine if at least one element in the object matches a truth test.
    // Delegates to **ECMAScript 5**'s native `some` if available.
    // Aliased as `any`.
    var any = Util.some = Util.any = function(obj, predicate, context) {
        predicate = cb(predicate, context);
        var keys = !isArrayLike(obj) && Util.keys(obj),
            length = (keys || obj).length;
        for (var index = 0; index < length; index++) {
            var currentKey = keys ? keys[index] : index;
            if (predicate(obj[currentKey], currentKey, obj)) return true;
        }
        return false;
    };

    // Create a function bound to a given object (assigning `this`, and arguments,
    // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
    // available.
    Util.bind = restArgs(function(func, context, args) {
        if (!Util.isFunction(func)) throw new TypeError('Bind must be called on a function');
        var bound = restArgs(function(callArgs) {
            return executeBound(func, bound, context, this, args.concat(callArgs));
        });
        return bound;
    });

    // Bind a number of an object's methods to that object. Remaining arguments
    // are the method names to be bound. Useful for ensuring that all callbacks
    // defined on an object belong to it.
    Util.bindAll = restArgs(function(obj, keys) {
        keys = flatten(keys, false, false);
        var index = keys.length;
        if (index < 1) throw new Error('bindAll must be passed function names');
        while (index--) {
            var key = keys[index];
            obj[key] = Util.bind(obj[key], obj);
        }
    });

    // Retrieve the names of an object's properties.
    // Delegates to **ECMAScript 5**'s native `Object.keys`
    Util.keys = function(obj) {
        if (!Util.isObject(obj)) return [];
        if (nativeKeys) return nativeKeys(obj);
        var keys = [];
        for (var key in obj)
            if (Util.has(obj, key)) keys.push(key);
            // Ahem, IE < 9.
        if (hasEnumBug) collectNonEnumProps(obj, keys);
        return keys;
    };

    // Shortcut function for checking if an object has a given property directly
    // on itself (in other words, not on a prototype).
    Util.has = function(obj, key) {
        return obj != null && hasOwnProperty.call(obj, key);
    };

    // Return the results of applying the iteratee to each element.
    Util.map = Util.collect = function(obj, iteratee, context) {
        iteratee = cb(iteratee, context);
        var keys = !isArrayLike(obj) && Util.keys(obj),
            length = (keys || obj).length,
            results = Array(length);
        for (var index = 0; index < length; index++) {
            var currentKey = keys ? keys[index] : index;
            results[index] = iteratee(obj[currentKey], currentKey, obj);
        }
        return results;
    };

    // If the value of the named `property` is a function then invoke it with the
    // `object` as context; otherwise, return it.
    Util.result = function(object, prop, fallback) {
        var value = object == null ? void 0 : object[prop];
        if (value === void 0) {
            value = fallback;
        }
        return Util.isFunction(value) ? value.call(object) : value;
    };

    /**
     * Returns a new array removing the duplicates
     */
    Util.arrayUnique = function(array) {
        var a = array.concat();
        for (var i = 0; i < a.length; ++i) {
            for (var j = i + 1; j < a.length; ++j) {
                if (a[i] === a[j])
                    a.splice(j--, 1);
            }
        }
        return a;
    };

    /**
     * Concatenates the values in the source array to the target array
     * only if they don't exists in the target array.
     * If the getValueFn is provided then it will be used to extract the value of the item
     *
     * @return {array}            concatenated array
     */
    Util.concatUnique = function(target, source, getValueFn) {

        if (!source || source.length == 0) {
            return target;
        }

        var a = target.concat();
        getValueFn = getValueFn || function(item) {
                                        return item;
                                    };
        for (var i = 0; i < source.length; ++i) {
            var sourceItem = source[i],
                sourceVal = getValueFn(sourceItem),
                notFound = true;
            for (var j = 0; j < target.length; ++j) {
                var targetItem = target[j],
                    targetVal = getValueFn(targetItem);
                if (sourceVal == targetVal) {
                    notFound = false;
                }
            }
            if (notFound) {
                a.push(sourceItem);
            }
        }
        return a;
    };

    // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
    each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
        Util['is' + name] = function(obj) {
            return toString.call(obj) == '[object ' + name + ']';
        };
    });

    /**
     * Test if the Url Path has a query string
     * @return {boolean}         true if the url path has a query string
     */
    Util.hasQueryString = function(urlPath) {
        var hasQuery = false,
            paramsPos = 0,
            search = /([^&=]+)=?([^&]*)/g;
        if (urlPath && (paramsPos = urlPath.indexOf('?')) != -1) {
            urlPath = urlPath.slice(paramsPos + 1);
            log(urlPath);
            if (search.test(urlPath)) {
               hasQuery = true;
            }
        }
        return hasQuery;
    };

    /**
     * Utility function that parses query string and returns a JSON with the param
     */
    Util.getUrlParams = function() {
        return HH.getUrlParamsFromString(window.location.search.substring(1));
    };

    /**
     * Utility function that parses query string and returns a JSON with the param
     */
    Util.getUrlParamsFromString = function(query) {
        var match,
            pl = /\+/g,  // Regex for replacing addition symbol with a space
            search = /([^&=]+)=?([^&]*)/g,
            decode = function(s) { return decodeURIComponent(s.replace(pl, ' ')); },
            queryPos;

        // Extracts the query part from the provided path
        if (query && (queryPos = query.indexOf('?')) > -1) {
            query = query.slice(queryPos + 1);
        }

        var urlParams = {};
        while ((match = search.exec(query))) {
           urlParams[decode(match[1])] = decode(match[2]);
        }
        return urlParams;
    };

    /**
     * Returns a pseudo Id of the format
     *
     * @return {[type]} a ID with this format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
     */
    Util.getPseudoId = function(prefix) {
        // This prefix is used to easily identify a pseudoId in a string search
        if (prefix === undefined) {
            prefix = '_$';
        }
        return ((prefix + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx').replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);   // jshint ignore:line
            return v.toString(16);
        }));
    };

    /**
     * Get first element from a given object
     * This relies on the underlying 'for' implementation
     * but its consistent across the same system
     *
     * @param  {[type]} obj [description]
     * @return Object
     */
    Util.getFirstElemFromObject = function(obj) {
        var firstElem = null;
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                firstElem = {
                    key : key,
                    value : obj[key]
                };
                break;
            }
        }
        return firstElem;
    };

    /**
    * classic JS inheritance function
    */
    Util.inherit = function(Child, Parent) {
        var F = function() { };
        F.prototype = Parent.prototype;
        Child.prototype = new F();
        Child.prototype.constructor = Child;
        Child.superclass = Parent.prototype;
    };

    /**
     * This function will receive a JSON object and remove all the keys that
     * have either empty strings, null, undefined values, empty objects and empty arrays.
     *
     * @return {Object} Sanitized object
     */
    Util.sanitizeJson = function(obj) {
        for (var key in obj) {
            var item = obj[key];
            if (item === null || item === undefined || $.trim(item) === '') {
                delete obj[key];
            } else if (Array.isArray(item)) {
                if (item.length === 0) {
                    // Removes empty arrays
                    delete obj[key];
                } else {
                    Util.sanitizeJson(item);
                }
            } else if (typeof item == 'object') {
                Util.sanitizeJson(item);
                if ($.isEmptyObject(item)) {
                    delete obj[key];
                }
            }
        }
    };

    /**
     * Adds padding left of the string
     *
     */
    Util.strPaddingLeft = function(string, paddingValue) {
        return String(paddingValue + string).slice(-paddingValue.length);
    };

    /**
     * Capitalizes the first letter of a string
     */
    Util.capitalizeFirstLetter = function(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    };

    /**
     * Function to format a string with numbered parameters such as
     * {0}, {1}
     * @param  {string} source Format string
     * @param  {array} params parameters given to the format function to replace in the source
     * @return {string}        Formatted string
     */
    Util.format = function(source, params) {
        var self = this;

        if (arguments.length === 1) {
            return function() {
                var args = $.makeArray(arguments);
                args.unshift(source);
                return self.format.apply(this, args);
            };
        }
        if (arguments.length > 2 && params.constructor !== Array) {
            params = $.makeArray(arguments).slice(1);
        }
        if (params.constructor !== Array) {
            params = [params];
        }
        $.each(params, function(i, n) {
            source = source.replace(new RegExp('\\{' + i + '\\}', 'g'), function() {
                return n;
            });
        });
        return source;
    };

    /*********************************
     * Promises Util
     *********************************/

    /**
     * Returns true if the argument is a Promise object, otherwise false
     *
     * @param  {Object}  value
     * @return {Boolean}    True if promise object
     */
    Util.isPromiseObj = function(value) {
        var t = typeof value;
        if (value && (t === 'object' || t === 'function')) {
            var then = value.then,
                catchFn = value['catch'];
            if (typeof then === 'function' && typeof catchFn === 'function') {
                return true;
            }
        }
        return false;
    };

    // Export the utils
    return Util;

});
/* jshint ignore:end */
