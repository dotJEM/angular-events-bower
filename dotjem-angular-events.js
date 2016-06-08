/// <reference path="../typings/index.d.ts" />
(function () {
    var module = angular.module('dotjem.angular.events', []);
    /**
     * @ngdoc constructor
     * @name dxObservable
     * @requires $rootScope
     * @requires $q
     *
     * @description
     *
     * The constructor for an observable object.
     *
     * Instead of broadcasting events over the $rootScope for all to all, this provides a more
     * direct pr. service approach.
     *
     * ```js
     *
     *   function myService(dxObservable) {
     *
     *      this.myEvent = new dxObservable();
     *
     *      this.doSomethingThatNotifies = function(){
     *          // Do that something.
     *          // ...
     *
     *          // Then notify...
     *          this.myEvent.notify('some', 'stuff');
     *      }
     *   }
     * ```
     *
     * @returns {dxObservable} An observable object.
     */
    module.service('dxObservable', ['$rootScope', '$q', function ($rootScope, $q) {
            function Observable() {
                var self = this;
                var subscribers = [];
                /**
                 * @ngdoc method
                 * @name dxObservable#waitForSingleCallback
                 * @description
                 *
                 * Creates and returns a promise that will wait for the next time notify is called to be resolved.
                 *
                 * @returns a {Promise} that will get resolved next time notify is called.
                 */
                self.waitForSingleCallback = function () {
                    var defer = $q.defer();
                    var sub = self.subscribe(function () {
                        defer.resolve();
                        sub.dispose();
                    });
                    return defer.promise;
                };
                /**
                 * @ngdoc method
                 * @name dxObservable#subscribe
                 * @description
                 *
                 * Subscribes for notifications from the observable object.
                 *
                 * @param {Function} callback to register in the subscriptions.
                 *
                 * @returns a {ISubscribtion} that can be used to unsubscribe from the observable object.
                 */
                self.subscribe = function (callback) {
                    var handler = new Handler(callback);
                    subscribers.push(handler);
                    return {
                        dispose: function () {
                            var idx = subscribers.indexOf(handler);
                            if (idx !== -1) {
                                subscribers.splice(idx, 1);
                            }
                        }
                    };
                };
                /**
                 * @ngdoc method
                 * @name dxObservable#unsubscribe
                 * @description
                 *
                 * Removes a callback handler from the from the observable object.
                 *
                 * @param {Function} callback to unregister from the subscriptions..
                 */
                self.unsubscribe = function (callback) {
                    //TODO: 'index of' then remove single.
                    subscribers = subscribers.filter(function (handler) {
                        return !handler.is(callback);
                    });
                };
                /**
                 * @ngdoc method
                 * @name dxObservable#notify
                 * @description
                 *
                 * Notifies all listeners.
                 *
                 * Handlers will receiver a {Event} object as the first argument.
                 *
                 * Any arguments passed to the notify function will be passed on to the any registered
                 * handlers as the 1st to Nth+1 position.
                 *
                 * @param {...arguments} arguments for the handlers.
                 */
                self.notify = function () {
                    var event = new Event();
                    var args = [event].concat(arguments);
                    return $rootScope.$apply(function () {
                        return subscribers.every(function (handler) {
                            handler.notify(args);
                            return !event.$$defaultPrevented;
                        });
                    });
                };
                function Handler(callback) {
                    this.notify = function (args) {
                        callback.apply(callback, args);
                    };
                    this.is = function (other) {
                        return callback === other;
                    };
                }
                function Event() {
                    this.$$defaultPrevented = false;
                    this.preventDefault = function () {
                        this.$$defaultPrevented = true;
                    };
                }
            }
            return Observable;
        }]);
    module.directive('dxMouseWheel', ['$parse', function ($parse) {
            var events = 'mousewheel DOMMouseScroll MozMousePixelScroll';
            return {
                restrict: 'A',
                compile: function ($element, attr) {
                    var fn = $parse(attr.dxMouseWheel, null, true);
                    return function (scope, element) {
                        element.bind(events, function (event) {
                            scope.$apply(function () { return fn(scope, { $event: event }); });
                        });
                        scope.$on('$destroy', function () { return element.unbind(events); });
                    };
                }
            };
        }]);
    module.directive('dxImageReady', ['$parse', '$timeout', function ($parse, $timeout, $rootScope) {
            return {
                restrict: 'A',
                compile: function ($element, attr) {
                    var fn = $parse(attr.dxImageReady, null, true);
                    return function (scope, $element) {
                        var raw = $element[0];
                        function run() {
                            if (raw.complete) {
                                if (raw.naturalHeight > 0) {
                                    scope.$apply(function () { return fn(scope, { $event: { element: $element } }); });
                                }
                                else {
                                    $rootScope.$broadcast('$onImageReadyFailed', { element: $element });
                                }
                            }
                            else {
                                //TODO: This should be able to be replaced by a load event.
                                $timeout(run, 100);
                            }
                        }
                        run();
                    };
                }
            };
        }]);
})();
