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

/* JavaScript Inheritance Class + Static class support
 */

/* jshint ignore:start */
define([], function() {
    var initializing = false,
        fnTest = /xyz/.test(function() {
            xyz;
        }) ? /\b_super\b/ : /.*/;

    // The base Class implementation (does nothing)
    this.Class = function() {};

    // Create a new Class that inherits from this class
    Class.extend = function(prop) {
        var _super = this.prototype;

        // Instantiate a base class (but only create the instance,
        // don't run the init constructor)
        initializing = true;
        var prototype = new this();
        initializing = false;

        // Copy the properties over onto the new prototype
        for (var name in prop) {
            // Check if we're overwriting an existing function
            prototype[name] = typeof prop[name] == 'function' &&
                typeof _super[name] == 'function' && fnTest.test(prop[name]) ?
                (function(name, fn) {
                    return function() {
                        var tmp = this._super;

                        // Add a new ._super() method that is the same method
                        // but on the super-class
                        this._super = _super[name];

                        // The method only need to be bound temporarily, so we
                        // remove it when we're done executing
                        var ret = fn.apply(this, arguments);
                        this._super = tmp;

                        return ret;
                    };
                })(name, prop[name]) :
                prop[name];
        }

        // The dummy class constructor
        function Class() {
            // All construction is actually done in the init method
            if (!initializing && this.init) {
                this.init.apply(this, arguments);
            }
            this._class = Class;
        }

        // Populate our constructed prototype object
        Class.prototype = prototype;

        // Enforce the constructor to be what we expect
        Class.prototype.constructor = Class;

        // And make this class extendable
        Class.extend = arguments.callee;

        /**
         * Custom implementation of a trait in javascript.
         * Will take all the methods in a class prototype and implement
         * them.
         * @return {[type]} [description]
         */
        Class.uses = function(classDef) {

            var ignoreProps = ['_class', 'constructor'],
                thisPrototype = this.prototype,
                classPrototype = classDef.prototype,
                newFunctions = {};

            /**
             * Implement all the properties in the prototype except the
             * properties in the ignore array
             */
            for (var name in classPrototype) {

                if (ignoreProps.indexOf(name) >= 0) continue; // jscs: ignore

                var privateFnTest = /^_.*$/,
                    implementFunction = privateFnTest.test(name) ||
                    !(classPrototype.hasOwnProperty(name) && !thisPrototype[name]);

                if (implementFunction) {
                    newFunctions[name] = classPrototype[name];

                } else {
                    var unimplementedMethodError = 'An unimplemented method called ' + name + ' is trying to be inhereted.';
                    throw Error(unimplementedMethodError);
                    return;
                }

            };

            var newClass = this.extend(newFunctions);

            return newClass;
        };

        Class.classMembers = function(obj) {
            var extended = obj.extended || obj.setup;
            delete obj.included;
            delete obj.extended;
            delete obj.setup;

            for (var i in obj) {
                this[i] = obj[i];
            }
            if (extended) {
                extended.apply(this);
            }
            delete extended;
        };

        // Automatically include a get instance method to the class
        Class.classMembers({
            /**
             * Gets a single-on instance of this class
             */
            getInst : function(params) {
                var inst = this._inst;
                if (!inst) {
                    inst = new this(params);
                    this._inst = inst;
                }
                return inst;
            }
        });

        return Class;
    };
    // Exports the module
    return Class;
});
/* jshint ignore:end */
