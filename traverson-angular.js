/* global angular */
'use strict';

var traverson = require('traverson');

var ng;
if (typeof angular !== 'undefined') {
  // angular is defined globally, use this
  ng = angular;
} else {
  // angular is not defined globally, try to require it
  ng = require('angular');
  if (typeof ng.module !== 'function') {
    throw new Error('angular has either to be provided globally or made ' +
        'available as a shim for browserify. (Also, if the angular module on ' +
        'npm would actually be a proper CommonJS module, this error ' +
        'wouldn\'t be a thing.)');
  }
}

var traversonAngular = ng.module('traverson', []);

traversonAngular.factory('traverson', ['$q', function traversonFactory($q) {
  var Builder = traverson._Builder;
  var originalMethods = {
    get: Builder.prototype.get,
    getResource: Builder.prototype.getResource,
    getUrl: Builder.prototype.getUrl,
    post: Builder.prototype.post,
    put: Builder.prototype.put,
    patch: Builder.prototype.patch,
    delete: Builder.prototype.delete,
  };

  function promisify(that, originalMethod, argsArray) {
    var deferred = $q.defer();

    argsArray = argsArray || [];

    var traversal;
    var callback = function(err, result, _traversal) {
      if (err) {
        err.result = result;
        deferred.reject(err);
      } else {
        traversal = _traversal;
        deferred.resolve(result);
      }
    };

    argsArray.push(callback);

    var traversalHandler = originalMethod.apply(that, argsArray);

    function continueTraversal() {
      var deferredContinue = $q.defer();
      deferred.promise.then(function() {
        deferredContinue.resolve(traversal.continue());
      }, function() {
        throw new Error('Can\'t continue from a broken traversal.');
      });
      return deferredContinue.promise;
    }

    return {
       result: deferred.promise,
       continue: continueTraversal,
       abort: traversalHandler.abort,
       then: function() {
         throw new Error('As of version 2.0.0, Traverson\'s action methods ' +
           'do no longer return the promise directly. Code like \n' +
           'traverson.from(url).follow(...).getResource().then(...)\n' +
           'needs to be changed to \n' +
           'traverson.from(url).follow(...).getResource().result.then(...)');
       },
    };
  }

  Builder.prototype.get = function() {
    return promisify(this, originalMethods.get);
  };

  Builder.prototype.getResource = function() {
    return promisify(this, originalMethods.getResource);
  };

  Builder.prototype.getUrl = Builder.prototype.getUri = function() {
    return promisify(this, originalMethods.getUrl);
  };

  Builder.prototype.post = function(body) {
    return promisify(this, originalMethods.post, [body]);
  };

  Builder.prototype.put = function(body) {
    return promisify(this, originalMethods.put, [body]);
  };

  Builder.prototype.patch = function(body) {
    return promisify(this, originalMethods.patch, [body]);
  };

  Builder.prototype.delete = Builder.prototype.del = function() {
    return promisify(this, originalMethods.delete);
  };

  return traverson;
}]);

module.exports = traversonAngular;
