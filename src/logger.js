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

/* global console, module */

/**
 * Logger module
 * This layer provides logging support for the front-end classes
 */
(function() {

/**
 * Convenience wrapper for log function
 * This function will use whatever default function was defined
 */
window.log = function() {
    Logger.debug.apply(Logger, arguments);
};

/*!
 * js-logger
 */
(function(window) {
    'use strict';

    // Top level module for the global, static logger instance.
    var Logger = { };

    // Function which handles all incoming log messages.
    var logHandler;

    // Map of ContextualLogger instances by name; used by Logger.get() to return the same named instance.
    var contextualLoggersByNameMap = {};

    // Polyfill for ES5's Function.bind.
    var bind = function(scope, func) {
        return function() {
            return func.apply(scope, arguments);
        };
    };

    var merge = function() {
        var args = arguments, target = args[0], key, i;
        for (i = 1; i < args.length; i++) {
            for (key in args[i]) {
                if (!(key in target) && args[i].hasOwnProperty(key)) {
                    target[key] = args[i][key];
                }
            }
        }
        return target;
    };

    // Helper to define a logging level object; helps with optimisation.
    var defineLogLevel = function(value, name) {
        return { value : value, name : name };
    };

    // Predefined logging levels.
    Logger.DEBUG = defineLogLevel(1, 'DEBUG');
    Logger.INFO = defineLogLevel(2, 'INFO');
    Logger.WARN = defineLogLevel(4, 'WARN');
    Logger.ERROR = defineLogLevel(8, 'ERROR');
    Logger.OFF = defineLogLevel(99, 'OFF');

    // Inner class which performs the bulk of the work; ContextualLogger instances can be configured independently
    // of each other.
    var ContextualLogger = function(defaultContext) {
        this.context = defaultContext;
        this.setLevel(defaultContext.filterLevel);
        this.log = this.info;  // Convenience alias.
    };

    ContextualLogger.prototype = {
        // Changes the current logging level for the logging instance.
        setLevel : function(newLevel) {
            // Ensure the supplied Level object looks valid.
            if (newLevel && 'value' in newLevel) {
                this.context.filterLevel = newLevel;
            }
        },

        // Is the logger configured to output messages at the supplied level?
        enabledFor : function(lvl) {
            var filterLevel = this.context.filterLevel;
            return lvl.value >= filterLevel.value;
        },

        debug : function() {
            this.invoke(Logger.DEBUG, arguments);
        },

        info : function() {
            this.invoke(Logger.INFO, arguments);
        },

        warn : function() {
            this.invoke(Logger.WARN, arguments);
        },

        error : function() {
            this.invoke(Logger.ERROR, arguments);
        },

        // Invokes the logger callback if it's not being filtered.
        invoke : function(level, msgArgs) {
            if (logHandler && this.enabledFor(level)) {
                logHandler(msgArgs, merge({ level : level }, this.context));
            }
        }
    };

    // Protected instance which all calls to the to level `Logger` module will be routed through.
    var globalLogger = new ContextualLogger({ filterLevel : Logger.OFF });

    // Configure the global Logger instance.
    (function() {
        // Shortcut for optimisers.
        var L = Logger;

        L.enabledFor = bind(globalLogger, globalLogger.enabledFor);
        L.debug = bind(globalLogger, globalLogger.debug);
        L.info = bind(globalLogger, globalLogger.info);
        L.warn = bind(globalLogger, globalLogger.warn);
        L.error = bind(globalLogger, globalLogger.error);

        // Don't forget the convenience alias!
        L.log = L.info;
    }());

    // Set the global logging handler.  The supplied function should expect two arguments, the first being an arguments
    // object with the supplied log messages and the second being a context object which contains a hash of stateful
    // parameters which the logging function can consume.
    Logger.setHandler = function(func) {
        logHandler = func;
    };

    // Sets the global logging filter level which applies to *all* previously registred, and future Logger instances.
    // (note that named loggers (retrieved via `Logger.get`) can be configured indendently if required).
    Logger.setLevel = function(level) {
        // Set the globalLogger's level.
        globalLogger.setLevel(level);

        // Apply this level to all registered contextual loggers.
        for (var key in contextualLoggersByNameMap) {
            if (contextualLoggersByNameMap.hasOwnProperty(key)) {
                contextualLoggersByNameMap[key].setLevel(level);
            }
        }
    };

    // Retrieve a ContextualLogger instance.  Note that named loggers automatically inherit the global logger's level,
    // default context and log handler.
    Logger.get = function(name) {
        // All logger instances are cached so they can be configured ahead of use.
        return contextualLoggersByNameMap[name] ||
            (contextualLoggersByNameMap[name] = new ContextualLogger(merge({ name : name }, globalLogger.context)));
    };

    // Configure and example a Default implementation which writes to the `window.console` (if present).
    Logger.useDefaults = function(defaultLevel) {
        // Check for the presence of a logger.
        if (!('console' in window)) {
            return;
        }

        Logger.setLevel(defaultLevel || Logger.DEBUG);
        Logger.setHandler(function(messages, context) {

            var firstMessage = messages[0];

            // Check if the first message is an explicit error object
            // then just throw it, so it displays all the real stack trace info
            // to the console
            if (firstMessage instanceof Error) {
                throw firstMessage;
            }

            var console = window.console;
            var hdlr = console.log;

            // Prepend the logger's name to the log message for easy identification.
            if (context.name) {
                messages[0] = '[' + context.name + '] ' + messages[0];
            }

            // Delegate through to custom warn/error loggers if present on the console.
            if (context.level === Logger.WARN && console.warn) {
                hdlr = console.warn;
            } else if (context.level === Logger.ERROR && console.error) {
                hdlr = console.error;
            }

            hdlr.apply(console, messages);
        });
    };

    // Export to popular environments boilerplate.
    if (typeof define === 'function' && define.amd) {
        window['Logger'] = Logger; //jscs: ignore
        define(Logger);
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = Logger;
    } else {
        window['Logger'] = Logger; //jscs: ignore
    }
}(window));

/**
 * Production logging handler
 */
Logger.setLevel(Logger.WARN);
Logger.setHandler(function(messages, context) {
    try {

        var mainInquiry = messages[0],
            mainMessage = mainInquiry,
            errorObj = mainInquiry;

        if (errorObj instanceof Error) {
            mainMessage = errorObj.message;
        } else {
            // Creates a new error object that will carry the callstack
            errorObj = new Error();
        }

        var payload = {
            // Message
            m : mainMessage,
            // Level
            l : context.level && context.level.name,
            // Payload
            p : JSON && JSON.stringify ? JSON.stringify(messages) : 'Payload not supported',
            //
            s : context.name || null,
            // stack trace
            st : errorObj.stack
        };

        //Setting parameters
        var params = {
                            type : 'POST',
                            url : HH.addLangPrefix('/api/log'),
                            data : payload,
                            success : function() {
                                //begin:DevOnly
                                log('Log call success');
                                //end:DevOnly
                            },
                            error : function() {
                                // Couldn't communicate with the logging endpoint
                            }
                        };
        $.ajax(params);
    }
    catch (err) {
        //begin:DevOnly
        if (console) {
            console.log('ERROR logging messages to server', err);
        }
        //end:DevOnly
    }
});

//begin:DevOnly
Logger.useDefaults(
    Logger.DEBUG
);
//end:DevOnly

//begin:DevOnly

/**
 * The following is a cross browser console.log wrapper from
 * https://github.com/cpatik/console.log-wrapper
 *
 * This logging is only used in developement and is stripped from the production code
 */

// // Tell IE9 to use its built-in console
// if (Function.prototype.bind && (typeof console === 'object' || typeof console === 'function') && typeof console.log === 'object') {
//     ['log', 'info', 'warn', 'error', 'assert', 'dir', 'clear', 'profile', 'profileEnd']
//         .forEach(function (method) {
//             console[method] = this.call(console[method], console);
//         }, Function.prototype.bind);
// }

// log() -- The complete, cross-browser (we don't judge!) console.log wrapper for his or her logging pleasure
window.log = function() {
    var args = arguments,
        isReallyIE8Plus = false,
        ua, winRegexp, script, i;

    log.history = log.history || []; // store logs to an array for reference
    log.history.push(arguments);

    // If the detailPrint plugin is loaded, check for IE10- pretending to be an older version,
    //   otherwise it won't pass the "Browser with a console" condition below. IE8-10 can use
    //   console.log normally, even though in IE7/8 modes it will claim the console is not defined.
    // TODO: Does IE11+ still have a primitive console, too? If so, how do I check for IE11+ running in old IE mode?
    // TODO: Can someone please test this on Windows Vista and Windows 8?
    if (log.detailPrint && log.needDetailPrint) {
        ua = navigator.userAgent;
        winRegexp = /Windows\sNT\s(\d+\.\d+)/;
        // Check for certain combinations of Windows and IE versions to test for IE running in an older mode
        if (console && console.log && /MSIE\s(\d+)/.test(ua) && winRegexp.test(ua)) {
            // Windows 7 or higher cannot possibly run IE7 or older
            if (parseFloat(winRegexp.exec(ua)[1]) >= 6.1) {
                isReallyIE8Plus = true;
            }
            // Cannot test for IE8+ running in IE7 mode on XP (Win 5.1) or Vista (Win 6.0)...
        }
    }

    // Browser with a console
    if (isReallyIE8Plus || (typeof console !== 'undefined' && typeof console.log === 'function')) {
        // Get argument details for browsers with primitive consoles if this optional plugin is included
        if (log.detailPrint && log.needDetailPrint && log.needDetailPrint()) {
            console.log('-----------------'); // Separator
            args = log.detailPrint(args);
            i = 0;
            while (i < args.length) {
                console.log(args[i]);
                i++;
            }
        }
        // Single argument, which is a string
        else if ((Array.prototype.slice.call(args)).length === 1 && typeof Array.prototype.slice.call(args)[0] === 'string') {
            console.log((Array.prototype.slice.call(args)).toString());
        } else {
            console.log((Array.prototype.slice.call(args)));
        }
    }

    // IE8
    else if (!Function.prototype.bind && typeof console !== 'undefined' && typeof console.log === 'object') {
        if (log.detailPrint) {
            Function.prototype.call.call(console.log, console, Array.prototype.slice.call(['-----------------'])); // Separator
            args = log.detailPrint(args);
            i = 0;
            while (i < args.length) {
                Function.prototype.call.call(console.log, console, Array.prototype.slice.call([args[i]]));
                i++;
            }
        } else {
            Function.prototype.call.call(console.log, console, Array.prototype.slice.call(args));
        }
    }

    // IE7 and lower, and other old browsers
    else {
        // Inject Firebug lite
        if (!document.getElementById('firebug-lite')) {
            // Include the script
            script = document.createElement('script');
            script.type = 'text/javascript';
            script.id = 'firebug-lite';
            // If you run the script locally, change this to /path/to/firebug-lite/build/firebug-lite.js
            script.src = 'https://getfirebug.com/firebug-lite.js';
            // If you want to expand the console window by default, uncomment this line
            //document.getElementsByTagName('HTML')[0].setAttribute('debug','true');
            document.getElementsByTagName('HEAD')[0].appendChild(script);
            setTimeout(function() {
                window.log.apply(window, args);
            }, 2000);
        } else {
            // FBL was included but it hasn't finished loading yet, so try again momentarily
            setTimeout(function() {
                window.log.apply(window, args);
            }, 500);
        }
    }
};

//end:DevOnly

// End of Logging class
})();
