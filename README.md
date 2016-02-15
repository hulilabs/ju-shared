[![Build Status](https://travis-ci.org/hulilabs/ju-shared.svg?branch=master)](https://travis-ci.org/hulilabs/ju-shared)

# ju-shared
Using an Object-Oriented Javascript approach in most cases, the following classes and modules are provided:

## Object-Oriented Javascript
### class.js
Can be used to implement a Javascript `Class`, with support for constructor, inheritance, class methods, singleton pattern and method injection
### observable-class.js
Build on top of `Class`, with support for triggering events that can have an attached observer function

## Ajax
### base-proxy.js
Wraps `jQuery.ajax` and exposes methods for handling request success/error, together with error handling utilities

## Client-side variable handling
### client-vars-manager.js
Stores a variable dictionary with helpers for handling stored values
### app-config-manager.js
Specialization of ClientVarsManager for handling configuration values
### l10n.js
Specialization of ClientVarsManager for handling localization

## Utilities
### dependency-loader.js
Asynchronous dependency injection with `require.js`
### logger.js
Safe logging with support for server or browser console logging
### md5-encoder.js
Helper for MD5 or Base64 encoding
### util.js
Utility functions
