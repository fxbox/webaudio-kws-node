(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.PocketSphinx = factory());
}(this, function () { 'use strict';

	// Circular buffer implementation
	class CircularBuffer {
	  constructor(buffer) {
	    this.buffer = buffer;
	    this.tail = 0;
	    this.head = 0;
	  }

	  push(value) {
	    this.buffer[this.head % this.buffer.length] = value;
	    this.head++;
	  }

	  get length() {
	    return this.head - this.tail;
	  }

	  pop() {
	    const value = this.buffer[this.tail % this.buffer.length];
	    this.tail++;
	    return value;
	  }
	}

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	var eventemitter2 = createCommonjsModule(function (module, exports) {
	/*!
	 * EventEmitter2
	 * https://github.com/hij1nx/EventEmitter2
	 *
	 * Copyright (c) 2013 hij1nx
	 * Licensed under the MIT license.
	 */
	;!function(undefined) {

	  var isArray = Array.isArray ? Array.isArray : function _isArray(obj) {
	    return Object.prototype.toString.call(obj) === "[object Array]";
	  };
	  var defaultMaxListeners = 10;

	  function init() {
	    this._events = {};
	    if (this._conf) {
	      configure.call(this, this._conf);
	    }
	  }

	  function configure(conf) {
	    if (conf) {

	      this._conf = conf;

	      conf.delimiter && (this.delimiter = conf.delimiter);
	      conf.maxListeners && (this._events.maxListeners = conf.maxListeners);
	      conf.wildcard && (this.wildcard = conf.wildcard);
	      conf.newListener && (this.newListener = conf.newListener);

	      if (this.wildcard) {
	        this.listenerTree = {};
	      }
	    }
	  }

	  function EventEmitter(conf) {
	    this._events = {};
	    this.newListener = false;
	    configure.call(this, conf);
	  }
	  EventEmitter.EventEmitter2 = EventEmitter; // backwards compatibility for exporting EventEmitter property

	  //
	  // Attention, function return type now is array, always !
	  // It has zero elements if no any matches found and one or more
	  // elements (leafs) if there are matches
	  //
	  function searchListenerTree(handlers, type, tree, i) {
	    if (!tree) {
	      return [];
	    }
	    var listeners=[], leaf, len, branch, xTree, xxTree, isolatedBranch, endReached,
	        typeLength = type.length, currentType = type[i], nextType = type[i+1];
	    if (i === typeLength && tree._listeners) {
	      //
	      // If at the end of the event(s) list and the tree has listeners
	      // invoke those listeners.
	      //
	      if (typeof tree._listeners === 'function') {
	        handlers && handlers.push(tree._listeners);
	        return [tree];
	      } else {
	        for (leaf = 0, len = tree._listeners.length; leaf < len; leaf++) {
	          handlers && handlers.push(tree._listeners[leaf]);
	        }
	        return [tree];
	      }
	    }

	    if ((currentType === '*' || currentType === '**') || tree[currentType]) {
	      //
	      // If the event emitted is '*' at this part
	      // or there is a concrete match at this patch
	      //
	      if (currentType === '*') {
	        for (branch in tree) {
	          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
	            listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+1));
	          }
	        }
	        return listeners;
	      } else if(currentType === '**') {
	        endReached = (i+1 === typeLength || (i+2 === typeLength && nextType === '*'));
	        if(endReached && tree._listeners) {
	          // The next element has a _listeners, add it to the handlers.
	          listeners = listeners.concat(searchListenerTree(handlers, type, tree, typeLength));
	        }

	        for (branch in tree) {
	          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
	            if(branch === '*' || branch === '**') {
	              if(tree[branch]._listeners && !endReached) {
	                listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], typeLength));
	              }
	              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
	            } else if(branch === nextType) {
	              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+2));
	            } else {
	              // No match on this one, shift into the tree but not in the type array.
	              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
	            }
	          }
	        }
	        return listeners;
	      }

	      listeners = listeners.concat(searchListenerTree(handlers, type, tree[currentType], i+1));
	    }

	    xTree = tree['*'];
	    if (xTree) {
	      //
	      // If the listener tree will allow any match for this part,
	      // then recursively explore all branches of the tree
	      //
	      searchListenerTree(handlers, type, xTree, i+1);
	    }

	    xxTree = tree['**'];
	    if(xxTree) {
	      if(i < typeLength) {
	        if(xxTree._listeners) {
	          // If we have a listener on a '**', it will catch all, so add its handler.
	          searchListenerTree(handlers, type, xxTree, typeLength);
	        }

	        // Build arrays of matching next branches and others.
	        for(branch in xxTree) {
	          if(branch !== '_listeners' && xxTree.hasOwnProperty(branch)) {
	            if(branch === nextType) {
	              // We know the next element will match, so jump twice.
	              searchListenerTree(handlers, type, xxTree[branch], i+2);
	            } else if(branch === currentType) {
	              // Current node matches, move into the tree.
	              searchListenerTree(handlers, type, xxTree[branch], i+1);
	            } else {
	              isolatedBranch = {};
	              isolatedBranch[branch] = xxTree[branch];
	              searchListenerTree(handlers, type, { '**': isolatedBranch }, i+1);
	            }
	          }
	        }
	      } else if(xxTree._listeners) {
	        // We have reached the end and still on a '**'
	        searchListenerTree(handlers, type, xxTree, typeLength);
	      } else if(xxTree['*'] && xxTree['*']._listeners) {
	        searchListenerTree(handlers, type, xxTree['*'], typeLength);
	      }
	    }

	    return listeners;
	  }

	  function growListenerTree(type, listener) {

	    type = typeof type === 'string' ? type.split(this.delimiter) : type.slice();

	    //
	    // Looks for two consecutive '**', if so, don't add the event at all.
	    //
	    for(var i = 0, len = type.length; i+1 < len; i++) {
	      if(type[i] === '**' && type[i+1] === '**') {
	        return;
	      }
	    }

	    var tree = this.listenerTree;
	    var name = type.shift();

	    while (name) {

	      if (!tree[name]) {
	        tree[name] = {};
	      }

	      tree = tree[name];

	      if (type.length === 0) {

	        if (!tree._listeners) {
	          tree._listeners = listener;
	        }
	        else if(typeof tree._listeners === 'function') {
	          tree._listeners = [tree._listeners, listener];
	        }
	        else if (isArray(tree._listeners)) {

	          tree._listeners.push(listener);

	          if (!tree._listeners.warned) {

	            var m = defaultMaxListeners;

	            if (typeof this._events.maxListeners !== 'undefined') {
	              m = this._events.maxListeners;
	            }

	            if (m > 0 && tree._listeners.length > m) {

	              tree._listeners.warned = true;
	              console.error('(node) warning: possible EventEmitter memory ' +
	                            'leak detected. %d listeners added. ' +
	                            'Use emitter.setMaxListeners() to increase limit.',
	                            tree._listeners.length);
	              if(console.trace){
	                console.trace();
	              }
	            }
	          }
	        }
	        return true;
	      }
	      name = type.shift();
	    }
	    return true;
	  }

	  // By default EventEmitters will print a warning if more than
	  // 10 listeners are added to it. This is a useful default which
	  // helps finding memory leaks.
	  //
	  // Obviously not all Emitters should be limited to 10. This function allows
	  // that to be increased. Set to zero for unlimited.

	  EventEmitter.prototype.delimiter = '.';

	  EventEmitter.prototype.setMaxListeners = function(n) {
	    this._events || init.call(this);
	    this._events.maxListeners = n;
	    if (!this._conf) this._conf = {};
	    this._conf.maxListeners = n;
	  };

	  EventEmitter.prototype.event = '';

	  EventEmitter.prototype.once = function(event, fn) {
	    this.many(event, 1, fn);
	    return this;
	  };

	  EventEmitter.prototype.many = function(event, ttl, fn) {
	    var self = this;

	    if (typeof fn !== 'function') {
	      throw new Error('many only accepts instances of Function');
	    }

	    function listener() {
	      if (--ttl === 0) {
	        self.off(event, listener);
	      }
	      fn.apply(this, arguments);
	    }

	    listener._origin = fn;

	    this.on(event, listener);

	    return self;
	  };

	  EventEmitter.prototype.emit = function() {

	    this._events || init.call(this);

	    var type = arguments[0];

	    if (type === 'newListener' && !this.newListener) {
	      if (!this._events.newListener) {
	        return false;
	      }
	    }

	    var al = arguments.length;
	    var args,l,i,j;
	    var handler;

	    if (this._all && this._all.length) {
	      handler = this._all.slice();
	      if (al > 3) {
	        args = new Array(al);
	        for (j = 0; j < al; j++) args[j] = arguments[j];
	      }

	      for (i = 0, l = handler.length; i < l; i++) {
	        this.event = type;
	        switch (al) {
	        case 1:
	          handler[i].call(this, type);
	          break;
	        case 2:
	          handler[i].call(this, type, arguments[1]);
	          break;
	        case 3:
	          handler[i].call(this, type, arguments[1], arguments[2]);
	          break;
	        default:
	          handler[i].apply(this, args);
	        }
	      }
	    }

	    if (this.wildcard) {
	      handler = [];
	      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
	      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
	    } else {
	      handler = this._events[type];
	      if (typeof handler === 'function') {
	        this.event = type;
	        switch (al) {
	        case 1:
	          handler.call(this);
	          break;
	        case 2:
	          handler.call(this, arguments[1]);
	          break;
	        case 3:
	          handler.call(this, arguments[1], arguments[2]);
	          break;
	        default:
	          args = new Array(al - 1);
	          for (j = 1; j < al; j++) args[j - 1] = arguments[j];
	          handler.apply(this, args);
	        }
	        return true;
	      } else if (handler) {
	        // need to make copy of handlers because list can change in the middle
	        // of emit call
	        handler = handler.slice();
	      }
	    }

	    if (handler && handler.length) {
	      if (al > 3) {
	        args = new Array(al - 1);
	        for (j = 1; j < al; j++) args[j - 1] = arguments[j];
	      }
	      for (i = 0, l = handler.length; i < l; i++) {
	        this.event = type;
	        switch (al) {
	        case 1:
	          handler[i].call(this);
	          break;
	        case 2:
	          handler[i].call(this, arguments[1]);
	          break;
	        case 3:
	          handler[i].call(this, arguments[1], arguments[2]);
	          break;
	        default:
	          handler[i].apply(this, args);
	        }
	      }
	      return true;
	    } else if (!this._all && type === 'error') {
	      if (arguments[1] instanceof Error) {
	        throw arguments[1]; // Unhandled 'error' event
	      } else {
	        throw new Error("Uncaught, unspecified 'error' event.");
	      }
	      return false;
	    }

	    return !!this._all;
	  };

	  EventEmitter.prototype.emitAsync = function() {

	    this._events || init.call(this);

	    var type = arguments[0];

	    if (type === 'newListener' && !this.newListener) {
	        if (!this._events.newListener) { return Promise.resolve([false]); }
	    }

	    var promises= [];

	    var al = arguments.length;
	    var args,l,i,j;
	    var handler;

	    if (this._all) {
	      if (al > 3) {
	        args = new Array(al);
	        for (j = 1; j < al; j++) args[j] = arguments[j];
	      }
	      for (i = 0, l = this._all.length; i < l; i++) {
	        this.event = type;
	        switch (al) {
	        case 1:
	          promises.push(this._all[i].call(this, type));
	          break;
	        case 2:
	          promises.push(this._all[i].call(this, type, arguments[1]));
	          break;
	        case 3:
	          promises.push(this._all[i].call(this, type, arguments[1], arguments[2]));
	          break;
	        default:
	          promises.push(this._all[i].apply(this, args));
	        }
	      }
	    }

	    if (this.wildcard) {
	      handler = [];
	      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
	      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
	    } else {
	      handler = this._events[type];
	    }

	    if (typeof handler === 'function') {
	      this.event = type;
	      switch (al) {
	      case 1:
	        promises.push(handler.call(this));
	        break;
	      case 2:
	        promises.push(handler.call(this, arguments[1]));
	        break;
	      case 3:
	        promises.push(handler.call(this, arguments[1], arguments[2]));
	        break;
	      default:
	        args = new Array(al - 1);
	        for (j = 1; j < al; j++) args[j - 1] = arguments[j];
	        promises.push(handler.apply(this, args));
	      }
	    } else if (handler && handler.length) {
	      if (al > 3) {
	        args = new Array(al - 1);
	        for (j = 1; j < al; j++) args[j - 1] = arguments[j];
	      }
	      for (i = 0, l = handler.length; i < l; i++) {
	        this.event = type;
	        switch (al) {
	        case 1:
	          promises.push(handler[i].call(this));
	          break;
	        case 2:
	          promises.push(handler[i].call(this, arguments[1]));
	          break;
	        case 3:
	          promises.push(handler[i].call(this, arguments[1], arguments[2]));
	          break;
	        default:
	          promises.push(handler[i].apply(this, args));
	        }
	      }
	    } else if (!this._all && type === 'error') {
	      if (arguments[1] instanceof Error) {
	        return Promise.reject(arguments[1]); // Unhandled 'error' event
	      } else {
	        return Promise.reject("Uncaught, unspecified 'error' event.");
	      }
	    }

	    return Promise.all(promises);
	  };

	  EventEmitter.prototype.on = function(type, listener) {

	    if (typeof type === 'function') {
	      this.onAny(type);
	      return this;
	    }

	    if (typeof listener !== 'function') {
	      throw new Error('on only accepts instances of Function');
	    }
	    this._events || init.call(this);

	    // To avoid recursion in the case that type == "newListeners"! Before
	    // adding it to the listeners, first emit "newListeners".
	    this.emit('newListener', type, listener);

	    if(this.wildcard) {
	      growListenerTree.call(this, type, listener);
	      return this;
	    }

	    if (!this._events[type]) {
	      // Optimize the case of one listener. Don't need the extra array object.
	      this._events[type] = listener;
	    }
	    else if(typeof this._events[type] === 'function') {
	      // Adding the second element, need to change to array.
	      this._events[type] = [this._events[type], listener];
	    }
	    else if (isArray(this._events[type])) {
	      // If we've already got an array, just append.
	      this._events[type].push(listener);

	      // Check for listener leak
	      if (!this._events[type].warned) {

	        var m = defaultMaxListeners;

	        if (typeof this._events.maxListeners !== 'undefined') {
	          m = this._events.maxListeners;
	        }

	        if (m > 0 && this._events[type].length > m) {

	          this._events[type].warned = true;
	          console.error('(node) warning: possible EventEmitter memory ' +
	                        'leak detected. %d listeners added. ' +
	                        'Use emitter.setMaxListeners() to increase limit.',
	                        this._events[type].length);
	          if(console.trace){
	            console.trace();
	          }
	        }
	      }
	    }
	    return this;
	  };

	  EventEmitter.prototype.onAny = function(fn) {

	    if (typeof fn !== 'function') {
	      throw new Error('onAny only accepts instances of Function');
	    }

	    if(!this._all) {
	      this._all = [];
	    }

	    // Add the function to the event listener collection.
	    this._all.push(fn);
	    return this;
	  };

	  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

	  EventEmitter.prototype.off = function(type, listener) {
	    if (typeof listener !== 'function') {
	      throw new Error('removeListener only takes instances of Function');
	    }

	    var handlers,leafs=[];

	    if(this.wildcard) {
	      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
	      leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);
	    }
	    else {
	      // does not use listeners(), so no side effect of creating _events[type]
	      if (!this._events[type]) return this;
	      handlers = this._events[type];
	      leafs.push({_listeners:handlers});
	    }

	    for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
	      var leaf = leafs[iLeaf];
	      handlers = leaf._listeners;
	      if (isArray(handlers)) {

	        var position = -1;

	        for (var i = 0, length = handlers.length; i < length; i++) {
	          if (handlers[i] === listener ||
	            (handlers[i].listener && handlers[i].listener === listener) ||
	            (handlers[i]._origin && handlers[i]._origin === listener)) {
	            position = i;
	            break;
	          }
	        }

	        if (position < 0) {
	          continue;
	        }

	        if(this.wildcard) {
	          leaf._listeners.splice(position, 1);
	        }
	        else {
	          this._events[type].splice(position, 1);
	        }

	        if (handlers.length === 0) {
	          if(this.wildcard) {
	            delete leaf._listeners;
	          }
	          else {
	            delete this._events[type];
	          }
	        }

	        this.emit("removeListener", type, listener);

	        return this;
	      }
	      else if (handlers === listener ||
	        (handlers.listener && handlers.listener === listener) ||
	        (handlers._origin && handlers._origin === listener)) {
	        if(this.wildcard) {
	          delete leaf._listeners;
	        }
	        else {
	          delete this._events[type];
	        }

	        this.emit("removeListener", type, listener);
	      }
	    }

	    function recursivelyGarbageCollect(root) {
	      if (root === undefined) {
	        return;
	      }
	      var keys = Object.keys(root);
	      for (var i in keys) {
	        var key = keys[i];
	        var obj = root[key];
	        if ((obj instanceof Function) || (typeof obj !== "object"))
	          continue;
	        if (Object.keys(obj).length > 0) {
	          recursivelyGarbageCollect(root[key]);
	        }
	        if (Object.keys(obj).length === 0) {
	          delete root[key];
	        }
	      }
	    }
	    recursivelyGarbageCollect(this.listenerTree);

	    return this;
	  };

	  EventEmitter.prototype.offAny = function(fn) {
	    var i = 0, l = 0, fns;
	    if (fn && this._all && this._all.length > 0) {
	      fns = this._all;
	      for(i = 0, l = fns.length; i < l; i++) {
	        if(fn === fns[i]) {
	          fns.splice(i, 1);
	          this.emit("removeListenerAny", fn);
	          return this;
	        }
	      }
	    } else {
	      fns = this._all;
	      for(i = 0, l = fns.length; i < l; i++)
	        this.emit("removeListenerAny", fns[i]);
	      this._all = [];
	    }
	    return this;
	  };

	  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

	  EventEmitter.prototype.removeAllListeners = function(type) {
	    if (arguments.length === 0) {
	      !this._events || init.call(this);
	      return this;
	    }

	    if(this.wildcard) {
	      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
	      var leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);

	      for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
	        var leaf = leafs[iLeaf];
	        leaf._listeners = null;
	      }
	    }
	    else {
	      if (!this._events || !this._events[type]) return this;
	      this._events[type] = null;
	    }
	    return this;
	  };

	  EventEmitter.prototype.listeners = function(type) {
	    if(this.wildcard) {
	      var handlers = [];
	      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
	      searchListenerTree.call(this, handlers, ns, this.listenerTree, 0);
	      return handlers;
	    }

	    this._events || init.call(this);

	    if (!this._events[type]) this._events[type] = [];
	    if (!isArray(this._events[type])) {
	      this._events[type] = [this._events[type]];
	    }
	    return this._events[type];
	  };

	  EventEmitter.prototype.listenersAny = function() {

	    if(this._all) {
	      return this._all;
	    }
	    else {
	      return [];
	    }

	  };

	  if (typeof exports === 'object') {
	    // CommonJS
	    module.exports = EventEmitter;
	  } else if (typeof define === 'function' && define.amd) {
	     // AMD. Register as an anonymous module.
	    define(function() {
	      return EventEmitter;
	    });
      } else {
	    // Browser global.
	    window.EventEmitter2 = EventEmitter;
	  }
	}();
	});

	var EventEmitter = (eventemitter2 && typeof eventemitter2 === 'object' && 'default' in eventemitter2 ? eventemitter2['default'] : eventemitter2);

	var index$3 = createCommonjsModule(function (module, exports) {
	'use strict';

	/**
	 * Create a UUID string.
	 *
	 * http://jsperf.com/guid-generation-stackoverflow
	 *
	 * @return {String}
	 */

	exports.uuid = function() {
	  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	    return v.toString(16);
	  });
	};

	exports.deferred = function() {
	  var promise = {};
	  promise.promise = new Promise((resolve, reject) => {
	    promise.resolve = resolve;
	    promise.reject = reject;
	  });
	  return promise;
	};
	});

	var require$$1 = (index$3 && typeof index$3 === 'object' && 'default' in index$3 ? index$3['default'] : index$3);

	var emitter = createCommonjsModule(function (module) {
	'use strict';

	/**
	 * Exports
	 * @ignore
	 */

	module.exports = Emitter;

	/**
	 * Simple logger
	 *
	 * @type {Function}
	 * @private
	 */

	var debug = () => {};

	/**
	 * Create new `Emitter`
	 *
	 * @class Emitter
	 */

	function Emitter(host) {
	  if (host) return Object.assign(host, Emitter.prototype);
	}

	Emitter.prototype = {

	  /**
	   * Add an event listener.
	   *
	   * It is possible to subscript to * events.
	   *
	   * @param  {String}   type
	   * @param  {Function} callback
	   * @return {this} for chaining
	   */

	  on: function(type, callback) {
	    debug('on', type, callback);
	    if (!this._callbacks) this._callbacks = {};
	    if (!this._callbacks[type]) this._callbacks[type] = [];
	    this._callbacks[type].push(callback);
	    return this;
	  },

	  /**
	   * Remove an event listener.
	   *
	   * @example
	   *
	   * emitter.off('name', fn); // remove one callback
	   * emitter.off('name'); // remove all callbacks for 'name'
	   * emitter.off(); // remove all callbacks
	   *
	   * @param  {String} [type]
	   * @param  {Function} [callback]
	   * @return {this} for chaining
	   */

	  off: function(type, callback) {
	    debug('off', type, callback);
	    if (this._callbacks) {
	      switch (arguments.length) {
	        case 0: this._callbacks = {}; break;
	        case 1: delete this._callbacks[type]; break;
	        default:
	          var typeListeners = this._callbacks[type];
	          if (!typeListeners) return;
	          var i = typeListeners.indexOf(callback);
	          if (~i) typeListeners.splice(i, 1);
	      }
	    }
	    return this;
	  },

	  /**
	   * Emit an event.
	   *
	   * @example
	   *
	   * emitter.emit('name', { some: 'data' });
	   *
	   * @param  {String} type
	   * @param  {*} [data]
	   * @return {this} for chaining
	   */

	  emit: function(type, data) {
	    debug('emit', type, data);
	    if (this._callbacks) {
	      var fns = this._callbacks[type] || [];
	      fns = fns.concat(this._callbacks['*'] || []);
	      for (var i = 0; i < fns.length; i++) fns[i].call(this, data, type);
	    }
	    return this;
	  }
	};

	var p = Emitter.prototype;
	p['off'] = p.off;
	p['on'] = p.on;
	});

	var require$$2 = (emitter && typeof emitter === 'object' && 'default' in emitter ? emitter['default'] : emitter);

	var portAdaptors = createCommonjsModule(function (module) {
	'use strict';

	/**
	 * Dependencies
	 * @ignore
	 */

	var deferred = require$$1.deferred;

	/**
	 * Message event name
	 * @type {String}
	 */
	const MSG = 'message';

	/**
	 * Mini Logger
	 * @type {Function}
	 * @private
	 */
	var debug = () => {};

	/**
	 * Creates a bridge.js port abstraction
	 * with a consistent interface.
	 *
	 * @param  {Object} target
	 * @param  {Object} options
	 * @return {PortAdaptor}
	 */
	module.exports = function create(target, options) {
	  if (!target) throw error(1);
	  if (isAdaptor(target)) return target;
	  var type = target.constructor.name;
	  var CustomAdaptor = adaptors[type];
	  debug('creating port adaptor for', type);
	  if (CustomAdaptor) return CustomAdaptor(target, options);
	  return new PortAdaptor(target, options);
	};

	/**
	 * The default adaptor.
	 * @private
	 */
	function PortAdaptor(target) {
	  debug('PortAdaptor');
	  this.target = target;
	}

	var PortAdaptorProto = PortAdaptor.prototype = {
	  constructor: PortAdaptor,
	  addListener(callback) { on(this.target, MSG, callback); },
	  removeListener(callback) { off(this.target, MSG, callback); },
	  postMessage(data, transfer) { this.target.postMessage(data, transfer); }
	};

	/**
	 * A registry of specific adaptors
	 * for when the default PortAdaptor
	 * is not suitable.
	 *
	 * @type {Object}
	 */
	var adaptors = {

	  /**
	   * Create an HTMLIframeElement PortAdaptor.
	   *
	   * @param {HTMLIframeElement} iframe
	   */
	  'HTMLIFrameElement': function(iframe) {
	    debug('HTMLIFrameElement');
	    var ready = windowReady(iframe);
	    return {
	      addListener(callback) { on(window, MSG, callback); },
	      removeListener(callback) { off(window, MSG, callback); },
	      postMessage(data, transfer) {
	        ready.then(() => postMessageSync(iframe.contentWindow, data, transfer));
	      }
	    };
	  },

	  /**
	   * Create a BroadcastChannel port-adaptor.
	   *
	   * @param {Object} channel
	   * @param {[type]} options [description]
	   */
	  'BroadcastChannel': function(channel, options) {
	    debug('BroadcastChannel', channel.name);
	    var receiver = options && options.receiver;
	    var ready = options && options.ready;
	    var sendReady = () => {
	      channel.postMessage('ready');
	      debug('sent ready');
	    };

	    ready = ready || receiver
	      ? Promise.resolve()
	      : setupSender();

	    if (receiver) {
	      sendReady();
	      on(channel, MSG, e => {
	        if (e.data != 'ready?') return;
	        sendReady();
	      });
	    }

	    function setupSender() {
	      debug('setup sender');
	      var promise = deferred();

	      channel.postMessage('ready?');
	      on(channel, MSG, function fn(e) {
	        if (e.data != 'ready') return;
	        off(channel, MSG, fn);
	        debug('BroadcastChannel: ready');
	        promise.resolve();
	      });

	      return promise.promise;
	    }

	    return {
	      target: channel,
	      addListener: PortAdaptorProto.addListener,
	      removeListener: PortAdaptorProto.removeListener,
	      postMessage(data, transfer) {
	        ready.then(() => channel.postMessage(data, transfer));
	      }
	    };
	  },

	  'Window': function(win, options) {
	    debug('Window');
	    var ready = options && options.ready
	      || win === parent // parent always ready
	      || win === self; // self always ready

	    ready = ready ? Promise.resolve() : windowReady(win);

	    return {
	      addListener(callback) { on(window, MSG, callback); },
	      removeListener(callback) { off(window, MSG, callback); },
	      postMessage(data, transfer) {
	        ready.then(() => postMessageSync(win, data, transfer));
	      }
	    };
	  },

	  'SharedWorker': function(worker) {
	    worker.port.start();
	    return new PortAdaptor(worker.port);
	  },

	  'SharedWorkerGlobalScope': function() {
	    var ports = [];

	    return {
	      postMessage() {}, // noop
	      addListener(callback, listen) {
	        this.onconnect = e => {
	          var port = e.ports[0];
	          ports.push(port);
	          port.start();
	          listen(port);
	        };

	        on(self, 'connect', this.onconnect);
	      },

	      removeListener(callback) {
	        off(self, 'connect', this.onconnect);
	        ports.forEach(port => {
	          port.close();
	          port.removeEventListener(MSG, callback);
	        });
	      }
	    };
	  }
	};

	/**
	 * Return a Promise that resolves
	 * when a Window is ready to start
	 * receiving messages.
	 *
	 * @param  {Window} target
	 * @return {Promise}
	 */
	var windowReady = (function() {
	  if (typeof window == 'undefined') return;
	  var parent = window.opener || window.parent;
	  var domReady = 'DOMContentLoaded';
	  var windows = new WeakSet();

	  // Side B: Dispatches 'load'
	  // from the child window
	  if (parent != self) {
	    if (document.readyState === 'loading') {
	      on(window, domReady, function fn() {
	        off(window, domReady, fn);
	        postMessageSync(parent, 'load');
	      });
	    } else {
	      postMessageSync(parent, 'load');
	    }
	  }

	  // Side A: Listens for 'ready' in the parent window
	  on(self, 'message', e => e.data == 'load' && windows.add(e.source));

	  return target => {
	    var win = target.contentWindow || target;

	    // Ready if the target has previously announces itself ready
	    if (windows.has(win)) return Promise.resolve();

	    // Ready if the target is the parent window
	    if (win == window.parent) return Promise.resolve();

	    var def = deferred();
	    debug('waiting for Window to be ready ...');
	    on(window, 'message', function fn(e) {
	      if (e.data == 'load' && e.source == win) {
	        debug('Window ready');
	        off(window, 'message', fn);
	        def.resolve();
	      }
	    });
	    return def.promise;
	  };
	})();

	/**
	 * Utils
	 * @ignore
	 */

	function isAdaptor(thing) {
	  return !!(thing && thing.addListener);
	}

	// Shorthand
	function on(target, name, fn) { target.addEventListener(name, fn); }
	function off(target, name, fn) { target.removeEventListener(name, fn); }

	/**
	 * Dispatches syncronous 'message'
	 * event on a Window.
	 *
	 * We use this because standard
	 * window.postMessage() gets blocked
	 * until the main-thread is free.
	 *
	 * @param  {Window} win
	 * @param  {*} data
	 * @private
	 */
	function postMessageSync(win, data, transfer) {
	  var event = {
	    data: data,
	    source: self
	  };

	  if (transfer) event.ports = transfer;

	  win.dispatchEvent(new MessageEvent('message', event));
	}

	/**
	 * Creates new `Error` from registery.
	 *
	 * @param  {Number} id Error Id
	 * @return {Error}
	 * @private
	 */
	function error(id) {
	  return new Error({
	    1: 'target is undefined'
	  }[id]);
	}
	});

	var require$$3 = (portAdaptors && typeof portAdaptors === 'object' && 'default' in portAdaptors ? portAdaptors['default'] : portAdaptors);

	var index$2 = createCommonjsModule(function (module, exports) {
	'use strict';

	/**
	 * Dependencies
	 * @ignore
	 */

	var createPort = require$$3;
	var Emitter = require$$2;
	var utils = require$$1;
	var defer = utils.deferred;
	var uuid = utils.uuid;

	/**
	 * Exports
	 * @ignore
	 */

	exports = module.exports = type => new Message(type);
	exports.receiver = (id, n) => new Receiver(id, n);
	exports.Receiver = Receiver;
	exports.Message = Message;

	/**
	 * Mini Logger
	 *
	 * 0: off
	 * 1: performance
	 * 2: console.log
	 *
	 * @type {Function}
	 * @private
	 */
	var debug = {
	  0: () => {},
	  1: arg => performance.mark(`[${self.constructor.name}][Message] - ${arg}`),
	  2: (arg1, ...args) => {
	    var type = `[${self.constructor.name}][${location.pathname}]`;
	    console.log(`[Message]${type} - "${arg1}"`, ...args);
	  }
	}[0];

	/**
	 * Default response timeout.
	 *
	 * @type {Number}
	 * @private
	 */
	var TIMEOUT = 2000;

	/**
	 * Initialize a new `Message`
	 *
	 * @class Message
	 * @borrows Emitter#on as #on
	 * @borrows Emitter#off as #off
	 * @borrows Emitter#emit as #emit
	 * @param {String} type Message type
	 */
	function Message(type) {
	  this.cancelled = false;
	  this.listeners = [];
	  this.deferred = defer();
	  this.listen = this.listen.bind(this);
	  this.onMessage = this.onMessage.bind(this);
	  this.onTimeout = this.onTimeout.bind(this);
	  if (typeof type === 'object') this.setupInbound(type);
	  else this.setupOutbound(type);
	  debug('initialized', this.type);
	}

	Message.prototype = {
	  setupOutbound(type) {
	    this.id = uuid();
	    this.type = type;
	    this.sent = false;
	    this.recipient = '*';
	  },

	  setupInbound (e) {
	    debug('inbound');
	    this.hasResponded = false;
	    this.setSourcePort(e.source || e.target);

	    // Keep a reference to the MessageEvent
	    this.event = e;

	    // Mixin the properties of the original message
	    Object.assign(this, e.data);
	  },

	  setSourcePort(endpoint) {
	    debug('set source', endpoint.constructor.name);
	    this.sourcePort = createPort(endpoint, { ready: true });
	    return this;
	  },

	  set(key, value) {
	    debug('set', key, value);
	    if (typeof key == 'object') Object.assign(this, key);
	    else this[key] = value;
	    return this;
	  },

	  serialize() {
	    return {
	      id: this.id,
	      type: this.type,
	      data: this.data,
	      recipient: this.recipient,
	      noRespond: this.noRespond
	    };
	  },

	  preventDefault() {
	    debug('prevent default');
	    this.defaultPrevented = true;
	  },

	  /**
	   * Send the message to an endpoint.
	   *
	   * @param  {(Iframe|Window|Worker|MessagePort)} endpoint
	   * @return {Promise}
	   */
	  send(endpoint) {
	    debug('send', this.type);
	    if (this.sent) throw error(1);
	    var serialized = this.serialize();
	    var expectsResponse = !this.noRespond;

	    // A port is resolved from either a predefined
	    // port, or an endpoint given as first argument
	    this.port = endpoint ? createPort(endpoint) : this.port;
	    if (!this.port) throw error(3);

	    // If we're expecting a response listen
	    // on the port else resolve promise instantly
	    if (expectsResponse) {
	      this.listen(this.port);
	      this.setResponseTimeout();
	    } else this.deferred.resolve();

	    this.port.postMessage(serialized, this.getTransfer());
	    debug('sent', serialized);
	    return this.deferred.promise;
	  },

	  /**
	   * Set the response timeout.
	   *
	   * When set to `false` no timeout
	   * is installed.
	   *
	   * @private
	   */
	  setResponseTimeout() {
	    if (this.timeout === false) return;
	    var ms = this.timeout || TIMEOUT;
	    this._timer = setTimeout(this.onTimeout, ms);
	  },

	  /**
	   * Clear the response timeout.
	   *
	   * @private
	   */
	  clearResponseTimeout() {
	    clearTimeout(this._timer);
	  },

	  getTransfer() {
	    return this.transfer || this.event && this.event.ports;
	  },

	  onMessage(e) {
	    var valid = !!e.data.response
	      && e.data.id === this.id
	      && !this.cancelled;

	    if (valid) this.onResponse(e);
	  },

	  onTimeout() {
	    debug('response timeout', this.type);
	    if (!this.silentTimeout) this.deferred.reject(error(4));
	    this.teardown();
	  },

	  listen(thing) {
	    debug('add response listener', thing);
	    var port = createPort(thing);
	    port.addListener(this.onMessage, this.listen);
	    this.listeners.push(port);
	    return this;
	  },

	  unlisten() {
	    debug('remove response listeners');
	    this.listeners.forEach(port => port.removeListener(this.onMessage));
	    this.listeners = [];
	  },

	  /**
	   * Cancel a pending Message.
	   *
	   * @example
	   *
	   * var msg = message('foo')
	   *
	   * msg.send(new Worker('my-worker.js'))
	   *   .then(response => {
	   *     // this will never run
	   *   })
	   *
	   * msg.cancel();
	   *
	   * @public
	   */
	  cancel() {
	    this.teardown();
	    this.cancelled = true;
	    this.emit('cancel');
	  },

	  teardown() {
	    this.clearResponseTimeout();
	    this.unlisten();
	  },

	  /**
	   * Respond to a message.
	   *
	   * @example
	   *
	   * receiver.on('hello', message => {
	   *   message.respond('world');
	   * });
	   *
	   * @public
	   * @param  {*} [result] Data to send back with the response
	   */
	  respond(result) {
	    debug('respond', result, this.id);
	    if (this.hasResponded) throw error(2);
	    if (!this.sourcePort) return;
	    if (this.noRespond) return;

	    this.hasResponded = true;
	    var self = this;

	    // Reject when result is an `Error`
	    if (this.error) reject(this.error);

	    // Call the handler and make
	    // sure return value is a promise.
	    // If the returned value is unclonable
	    // then the send() method will throw,
	    // the .catch() will reject in this case.
	    Promise.resolve(result)
	      .then(resolve, reject)
	      .catch(reject);

	    function resolve(value) {
	      debug('resolve', value);
	      respond({
	        type: 'resolve',
	        value: value
	      });
	    }

	    function reject(err) {
	      var serialized = serializeError(err);
	      debug('reject', serialized);
	      respond({
	        type: 'reject',
	        value: serialized
	      });
	    }

	    function respond(response) {
	      self.response = response;

	      self.sourcePort.postMessage({
	        id: self.id,
	        response: response
	      }, self.transfer);

	      debug('responded with:', response);
	    }
	  },

	  /**
	   * Forward a `Message` onto another endpoint.
	   *
	   * The `silentTrue` option prevents the
	   * message request timing out should
	   * the response come back via an
	   * alternative route.
	   *
	   * TODO: If forwarded message errors
	   * check it reaches origin (#86).
	   *
	   * @param  {(HTMLIframeElement|MessagePort|Window)} endpoint
	   * @public
	   */
	  forward(endpoint) {
	    debug('forward');
	    return this
	      .set('silentTimeout', true)
	      .send(endpoint)
	      .then(result => this.respond(result.value));
	  },

	  onResponse(e) {
	    debug('on response', e.data);
	    var response = e.data.response;
	    var type = response.type;
	    var value = type == 'reject'
	      ? response.value
	      : response;

	    response.event = e;
	    this.response = response;
	    this.teardown();

	    this.deferred[this.response.type](value);
	    this.emit('response', response);
	  }
	};

	// Mixin Emitter methods
	Emitter(Message.prototype);

	/**
	 * Initialize a new `Receiver`.
	 *
	 * @class Receiver
	 * @extends Emitter
	 * @param {String} name - corresponds to `Message.recipient`
	 */
	function Receiver(name) {
	  this.name = name;
	  this.ports = new Set();
	  this.onMessage = this.onMessage.bind(this);
	  this.listen = this.listen.bind(this);
	  this.unlisten = this.unlisten.bind(this);
	  debug('receiver initialized', name);
	}

	Receiver.prototype = {

	  /**
	   * Begin listening for inbound messages.
	   *
	   * @example
	   *
	   * // When no arguments are given
	   * // messages will be listened for
	   * // on the default global scope
	   * .listen();
	   *
	   * // When an endpoint is out of reach
	   * // BroadcastChannel can be used.
	   * .listen(new BroadcastChannel('foo'));
	   *
	   * @param {(HTMLIframeElement|Worker|MessagePort|
	   * BroadcastChannel|Window|Object)} [thing]
	   * @public
	   */
	  listen(thing) {
	    debug('listen');
	    var _port = createPort(thing || self, { receiver: true });
	    if (this.ports.has(_port)) return;
	    _port.addListener(this.onMessage, this.listen);
	    this.ports.add(_port);
	    return this;
	  },

	  /**
	   * Stop listening for inbound messages
	   * on all endpoints listened to prior.
	   *
	   * @public
	   */
	  unlisten() {
	    debug('unlisten');
	    this.ports.forEach(port => port.removeListener(this.onMessage));
	  },

	  /**
	   * Callback to handle inbound messages.
	   *
	   * @param  {MessageEvent} e
	   * @private
	   */
	  onMessage(e) {
	    if (!e.data.id) return;
	    if (!e.data.type) return;
	    if (!this.isRecipient(e.data.recipient)) return;
	    debug('receiver on message', e.data);
	    var message = new Message(e);

	    // Before hook
	    this.emit('message', message);
	    if (message.defaultPrevented) return;

	    try { this.emit(message.type, message); }
	    catch (e) {
	      message.error = e;
	      message.respond();
	      throw e;
	    }
	  },

	  isRecipient(recipient) {
	    return recipient == this.name
	      || recipient == '*'
	      || this.name == '*';
	  },

	  destroy: function() {
	    this.unlisten();
	    delete this.name;
	    return this;
	  }
	};

	// Mixin Emitter methods
	Emitter(Receiver.prototype);

	/**
	 * Error object can't be sent via
	 * .postMessage() so we have to
	 * serialize them into an error-like
	 * Object that can be sent.
	 *
	 * @param  {*} err
	 * @return {(Object|*)}
	 * @private
	 */
	function serializeError(err) {
	  switch (err && err.constructor.name) {
	    case 'DOMException':
	    case 'Error': return { message: err.message };
	    case 'DOMError': return { message: err.message, name: err.name };
	    default: return err;
	  }
	}

	/**
	 * Creates new `Error` from registry.
	 *
	 * @param  {Number} id Error Id
	 * @return {Error}
	 * @private
	 */
	function error(id, ...args) {
	  return new Error({
	    1: '.send() can only be called once',
	    2: 'response already sent for this message',
	    3: 'a port must be defined',
	    4: 'timeout'
	  }[id]);
	}
	});

	var require$$0 = (index$2 && typeof index$2 === 'object' && 'default' in index$2 ? index$2['default'] : index$2);

	var client$1 = createCommonjsModule(function (module) {
	'use strict';

	/**
	 * Dependencies
	 * @ignore
	 */

	var createPort = require$$3;
	var Emitter = require$$2;
	var message = require$$0;
	var uuid = require$$1.uuid;

	/**
	 * Exports
	 * @ignore
	 */

	module.exports = Client;

	/**
	 * Mini Logger
	 *
	 * 0: off
	 * 1: performance
	 * 2: console.log
	 *
	 * @type {Function}
	 * @private
	 */
	var debug = {
	  0: () => {},
	  1: arg => performance.mark(`[${self.constructor.name}][Client] - ${arg}`),
	  2: (arg1, ...args) => {
	    var type = `[${self.constructor.name}][${location.pathname}]`;
	    console.log(`[Client]${type} - "${arg1}"`, ...args);
	  }
	}[0];

	/**
	 * The type environment.
	 * @type {String}
	 * @private
	 */
	var env = self.constructor.name;

	/**
	 * A Client is a remote interface
	 * to a Service within a given endpoint.
	 *
	 * See {@tutorial What's an endpoint?}
	 * for more information on 'endpoints'.
	 *
	 * @example
	 *
	 * var endpoint = document.querySelector('iframe');
	 * var client = bridge.client('my-service', endpoint);
	 *
	 * @constructor
	 * @param {String} service The service name to connect to
	 * @param {(Iframe|Worker|MessagePort|BroadcastChannel|Window)} endpoint
	 * @param {Number} [timeout] Override default response timeout
	 * The context/thread this service can be found in.
	 * @public
	 */
	function Client(service, endpoint, timeout) {
	  if (!(this instanceof Client)) return new Client(service, endpoint, timeout);

	  // Parameters can be passed as single object
	  if (typeof service == 'object') {
	    endpoint = service.endpoint;
	    timeout = service.timeout;
	    service = service.service;
	  }

	  this.id = uuid();
	  this.service = service;
	  this.timeout = timeout;

	  // Keep a reference to the original endpoint
	  // so that it's not garbage collected (Workers)
	  this.endpoint = endpoint || this.endpoint;
	  if (!this.endpoint) throw error(1);

	  this.setPort(this.endpoint);
	  this.pending = new Set();

	  this.receiver = message.receiver(this.id)
	    .on('_push', this.onPush.bind(this));

	  debug('initialized', service);
	}

	Client.prototype = {

	  /**
	   * Connect with the Service. Called
	   * automatically internally, so
	   * only required if you have
	   * perposely called .disconnect().
	   *
	   * @public
	   */
	  connect() {
	    debug('connect');
	    if (this.connected) return this.connected;
	    debug('connecting...', this.service);

	    var mc = new MessageChannel();
	    this.channel = mc.port1;
	    this.channel.start();

	    var data = {
	      clientId: this.id,
	      service: this.service,
	      originEnv: env
	    };

	    return this.connected = this.message('_connect')
	      .set('transfer', [mc.port2])
	      .set('data', data)
	      .listen(mc.port1)
	      .send()
	      .then(response => {
	        debug('connected', response);

	        // Check if the response came back on
	        // the MessageChannel. If it did then
	        // update the endpoint so that all
	        // subsequent messaging uses this channel.
	        var usingChannel = response.event.target === this.channel;
	        if (usingChannel) this.setPort(this.channel);
	        else {
	          this.channel.close();
	          delete this.channel;
	        }

	        // Begin listening so that Clients can
	        // respond to service pushed messages
	        this.receiver.listen(this.port);
	      })

	      // In the event of message timeout we
	      // upgrade the message to something more
	      // informative. console.error() is used to
	      // makesure the message is seen even when
	      // the user hasn't registered a .catch() handler.
	      .catch(err => {
	        var msg = err && err.message;
	        if (msg == 'timeout') {
	          err = error(2, this.service);
	          console.error(err.message);
	        }

	        throw err;
	      });
	  },

	  /**
	   * Disconnect from the `Service`.
	   *
	   * @public
	   */
	  disconnect(options) {
	    if (!this.connected) return Promise.resolve();
	    debug('disconnecting ...');

	    var config = {
	      noRespond: options && options.noRespond,
	      data: this.id
	    };

	    this.cancelPending();

	    return this.message('_disconnect')
	      .set(config)
	      .send()
	      .then(() => this.onDisconnected());
	  },

	  /**
	   * Call a method on the connected Service.
	   *
	   * @example
	   *
	   * client.method('greet', 'wilson').then(result => {
	   *   console.log(result); //=> 'hello wilson'
	   * });
	   *
	   * // my-service.js:
	   *
	   * service.method('greet', name => {
	   *   return 'hello ' + name;
	   * });
	   *
	   * @param  {String} name The method name
	   * @param  {...*} [args] Arguments to send
	   * @return {Promise}
	   */
	  method(name, ...args) {
	    return this.connect()
	      .then(() => {
	        debug('method', name);
	        return this.message('_method')
	          .set({
	            recipient: this.service,
	            data: {
	              name: name,
	              args: args
	            }
	          })
	          .send();
	      })

	      // Only send back the response value
	      .then(response => response.value)

	      // In the event of message timeout we
	      // upgrade the message to something more
	      // informative. console.error() is used to
	      // make sure the message is seen even when
	      // the user hasn't registered a .catch() handler.
	      .catch(err => {
	        var msg = err && err.message;
	        if (msg == 'timeout') {
	          err = error(3, name);
	          console.error(err.message);
	        }

	        throw err;
	      });
	  },

	  /**
	   * Use a plugin with this Client.
	   * See {@tutorial Writing plugins}.
	   *
	   * @example
	   *
	   * client.plugin(megaPlugin);
	   *
	   * @param  {Function} fn The plugin
	   * @return {this} for chaining
	   * @public
	   */
	  plugin(fn) {
	    fn(this, {
	      'Emitter': Emitter,
	      'uuid': uuid
	    });

	    return this;
	  },

	  /**
	   * A wrapper around Message that
	   * ensures pending messages are
	   * noted and the Client's endpoint
	   * is predefined.
	   *
	   * @param  {String} type The message type
	   * @return {Message}
	   * @private
	   */
	  message(type) {
	    debug('create message', type);

	    var msg = message(type)
	      .set('port', this.port)
	      .set('timeout', this.timeout)
	      .on('response', () => this.pending.delete(msg))
	      .on('cancel', () => this.pending.delete(msg));

	    this.pending.add(msg);
	    return msg;
	  },

	  /**
	   * Cancel any message that we have
	   * not recieved a response from yet.
	   *
	   * @private
	   */
	  cancelPending() {
	    debug('cancel pending');
	    this.pending.forEach(msg => { msg.cancel();});
	    this.pending.clear();
	  },

	  /**
	   * Returns a Promise that resolves
	   * once all pending messages have
	   * responded.
	   *
	   * @private
	   * @return {Promise}
	   */
	  pendingResponded() {
	    var responded = [];
	    this.pending.forEach(msg => responded.push(msg.responded));
	    return Promise.all(responded);
	  },

	  /**
	   * Emits a event when a 'push' Message
	   * is recieved from the Service.
	   *
	   * @private
	   * @param  {Message} message The pushed message
	   */
	  onPush(message) {
	    debug('on push', message.data);
	    this._emit(message.data.type, message.data.data);
	  },

	  // Needs testing!
	  onDisconnected() {
	    delete this.connected;
	    this.pendingResponded().then(() => {
	      debug('disconnected');
	      if (this.channel) this.channel.close();
	      this._emit('disconnected');
	    });
	  },

	  /**
	   * Set the port which all messages
	   * will be sent over. This can differ
	   * to the endpoint if we successfully
	   * upgrade transport to MessageChannel.
	   *
	   * @param {(Iframe|Worker|MessagePort|BroadcastChannel|Window)} endpoint
	   */
	  setPort(endpoint) {
	    debug('set port');
	    this.port = createPort(endpoint);
	  },

	  /**
	   * Destroy the Client. Waits from all
	   * pending Messages to have responded.
	   *
	   * @example
	   *
	   * client.destroy().then(() => ...);
	   *
	   * @public
	   * @return {Promise}
	   */
	  destroy: function() {
	    return this.disconnect()
	      .then(() => {
	        if (this.destroyed) return;
	        debug('destroy');
	        this.destroyed = true;
	        this.receiver.destroy();
	        this._off();

	        // Wipe references
	        this.port
	          = this.endpoint
	          = this.receiver
	          = null;
	      });
	  },

	  _on: Emitter.prototype.on,
	  _off: Emitter.prototype.off,
	  _emit: Emitter.prototype.emit
	};

	/**
	 * Listen to a Service .broadcast() or .push().
	 *
	 * Services get notified whenever a Client
	 * starts listening to a particular event.
	 *
	 * @example
	 *
	 * client
	 *   .on('importantevent', data => ...)
	 *   .on('thingchanged', thing => ...);
	 *
	 * @param  {String} name The event name
	 * @param  {Function} fn Callback function
	 * @return {this} for chaining
	 * @public
	 */
	Client.prototype.on = function(name, fn) {
	  this.connect().then(() => {
	    debug('bind on', name);
	    Emitter.prototype.on.call(this, name, fn);
	    this.message('_on')
	      .set('noRespond', true)
	      .set('data', {
	        name: name,
	        clientId: this.id
	      })
	      .send(this.port);
	  });

	  return this;
	};

	/**
	 * Unlisten to a Service event.
	 *
	 * @example
	 *
	 * client
	 *   .off('importantevent') // remove all
	 *   .off('thingchanged', onThingChanged); // remove one
	 *
	 * @this Client
	 * @param  {String} name The event name
	 * @param  {Function} fn Callback function
	 * @return {this} for chaining
	 * @public
	 */
	Client.prototype.off = function(name, fn) {
	  this.connect().then(() => {
	    Emitter.prototype.off.call(this, name, fn);
	    this.message('_off')
	      .set('noRespond', true)
	      .set('data', {
	        name: name,
	        clientId: this.id
	      })
	      .send(this.port);
	  });

	  return this;
	};

	/**
	 * Creates new `Error` from registery.
	 *
	 * @param  {Number} id Error Id
	 * @return {Error}
	 * @private
	 */

	function error(id, ...args) {
	  /*jshint maxlen:false*/
	  var help = 'Either the target endpoint is not alive or the Service is not `.listen()`ing.';
	  return new Error({
	    1: 'an endpoint must be defined',
	    2: `Unable to establish a connection with "${args[0]}". ${help}`,
	    3: `Method "${args[0]}" didn't get a response. ${help}`
	  }[id]);
	}
	});

	var require$$1$1 = (client$1 && typeof client$1 === 'object' && 'default' in client$1 ? client$1['default'] : client$1);

	var service$1 = createCommonjsModule(function (module) {
	'use strict';

	/**
	 * Dependencies
	 * @ignore
	 */

	var uuid = require$$1.uuid;
	var message = require$$0;
	var Receiver = message.Receiver;

	/**
	 * Exports
	 * @ignore
	 */

	module.exports = Service;

	/**
	 * Debug logger
	 *
	 * 0: off
	 * 1: performance
	 * 2: console.log
	 *
	 * @type {Function}
	 * @private
	 */
	var debug = {
	  0: () => {},
	  1: arg => performance.mark(`[${self.constructor.name}][Service] - ${arg}`),
	  2: (arg1, ...args) => {
	    var type = `[${self.constructor.name}][${location.pathname}]`;
	    console.log(`[Service]${type} - "${arg1}"`, ...args);
	  }
	}[0];

	/**
	 * Extends `Receiver`
	 * @ignore
	 */

	Service.prototype = Object.create(Receiver.prototype);

	/**
	 * A `Service` is a collection of methods
	 * exposed to a `Client`. Methods can be
	 * sync or async (using Promises).
	 *
	 * @example
	 *
	 * bridge.service('my-service')
	 *   .method('ping', param => 'pong: ' + param)
	 *   .listen();
	 *
	 * @class Service
	 * @extends Receiver
	 * @param {String} name The service name
	 * @public
	 */
	function Service(name) {
	  if (!(this instanceof Service)) return new Service(name);
	  message.Receiver.call(this, name); // call super

	  this.clients = {};
	  this.methods = {};

	  this
	    .on('_disconnect', this.onDisconnect.bind(this))
	    .on('_connect', this.onConnect.bind(this))
	    .on('_method', this.onMethod.bind(this))
	    .on('_off', this.onOff.bind(this))
	    .on('_on', this.onOn.bind(this));

	  this.destroy = this.destroy.bind(this);
	  debug('initialized', name);
	}

	Service.prototype.inWindow = constructor.name === 'Window';

	/**
	 * Define a method to expose to Clients.
	 * The return value of the result of a
	 * returned Promise will be sent back
	 * to the Client.
	 *
	 * @example
	 *
	 * bridge.service('my-service')
	 *
	 *   // sync return value
	 *   .method('myMethod', function(param) {
	 *     return 'hello: ' + param;
	 *   })
	 *
	 *   // or async Promise
	 *   .method('myOtherMethod', function() {
	 *     return new Promise(resolve => {
	 *       setTimeout(() => resolve('result'), 1000);
	 *     });
	 *   })
	 *
	 *   .listen();
	 *
	 * @param  {String}   name
	 * @param  {Function} fn
	 * @return {this} for chaining
	 */
	Service.prototype.method = function(name, fn) {
	  this.methods[name] = fn;
	  return this;
	};

	/**
	 * Broadcast's an event from a `Service`
	 * to connected `Client`s.
	 *
	 * The third argument can be used to
	 * target selected clients by their
	 * `client.id`.
	 *
	 * @example
	 *
	 * service.broadcast('my-event', { some: data }); // all clients
	 * service.broadcast('my-event', { some: data }, [ clientId ]); // one client
	 *
	 * @memberof Service
	 * @param  {String} type The message type/name
	 * @param  {*} [data] Data to send with the event
	 * @param  {Array} [only] A select list of clients to message
	 * @return {this}
	 */
	Service.prototype.broadcast = function(type, data, only) {
	  debug('broadcast', type, data, only);

	  this.eachClient(client => {
	    if (only && !~only.indexOf(client.id)) return;
	    debug('broadcasting to', client.id);
	    this.push(type, data, client.id, { noRespond: true });
	  });

	  return this;
	};

	/**
	 * Push message to a single connected Client.
	 *
	 * @example
	 *
	 * client.on('my-event', data => ...)
	 *
	 * ...
	 *
	 * service.push('my-event', { some: data}, clientId)
	 *   .then(() => console.log('sent'));
	 *
	 * @public
	 * @param  {String} type
	 * @param  {Object} data
	 * @param  {String} clientId The Id of the Client to push to
	 * @param  {Object} options Optional parameters
	 * @param  {Boolean} options.noResponse Tell the Client not to respond
	 *   (Promise resolves instantly)
	 * @return {Promise}
	 */
	Service.prototype.push = function(type, data, clientId, options) {
	  var noRespond = options && options.noRespond;
	  var client = this.getClient(clientId);
	  return message('_push')
	    .set({
	      recipient: clientId,
	      noRespond: noRespond,
	      data: {
	        type: type,
	        data: data
	      }
	    }).send(client.port);
	};

	Service.prototype.eachClient = function(fn) {
	  for (var id in this.clients) fn(this.clients[id]);
	};

	Service.prototype.getClient = function(id) {
	  return this.clients[id];
	};

	/**
	 * @fires Service#before-connect
	 * @fires Service#connected
	 * @param  {Message} message
	 * @private
	 */
	Service.prototype.onConnect = function(message) {
	  debug('connection attempt', message.data, this.name);
	  var data = message.data;
	  var clientId = data.clientId;

	  if (!clientId) return;
	  if (data.service !== this.name) return;
	  if (this.clients[clientId]) return;

	  // before hook
	  this.emit('before-connect', message);
	  if (message.defaultPrevented) return;

	  this.upgradeChannel(message);
	  this.addClient(clientId, message.sourcePort);
	  message.respond();

	  this.emit('connected', clientId);
	  debug('connected', clientId);
	};

	/**
	 * When a Client attempt to connect we
	 * can sometimes upgrade the to a direct
	 * MessageChannel 'pipe' to prevent
	 * hopping threads.
	 *
	 * We only do this if both:
	 *
	 *  A. `MessagePort` was supplied with the 'connect' event.
	 *  B. The Client and Service are not both in `Window` contexts
	 *     (it's faster to use sync messaging window -> window).
	 *
	 * @param  {Message} message  the 'connect' message
	 * @private
	 */
	Service.prototype.upgradeChannel = function(message) {
	  if (this.inWindow && message.data.originEnv === 'Window') return;

	  var ports = message.event.ports;
	  var channel = ports && ports[0];

	  if (channel) {
	    message.setSourcePort(channel);
	    this.listen(channel);
	    channel.start();
	  }

	  debug('channel upgraded');
	};

	/**
	 * @fires Service#before-disconnect
	 * @fires Service#disconnected
	 * @param  {Message} message
	 * @private
	 */
	Service.prototype.onDisconnect = function(message) {
	  var client = this.clients[message.data];
	  if (!client) return;

	  // before hook
	  this.emit('before-disconnect', message);
	  if (message.defaultPrevented) return;

	  this.removeClient(client.id);
	  message.respond();

	  this.emit('disconnected', client.id);
	  debug('disconnected', client.id);
	};

	/**
	 * @fires Service#before-method
	 * @param  {Message} message
	 * @private
	 */
	Service.prototype.onMethod = function(message) {
	  debug('on method', message.data);
	  this.emit('before-method', message);
	  if (message.defaultPrevented) return;

	  var method = message.data;
	  var name = method.name;
	  var fn = this.methods[name];
	  var result;

	  if (!fn) throw error(4, name);

	  try { result = fn.apply(this, method.args); }
	  catch (err) { message.error = err; }

	  message.respond(result);
	};

	/**
	 * @fires Service#on
	 * @param  {Message} message
	 * @private
	 */
	Service.prototype.onOn = function(message) {
	  debug('on on', message.data);
	  this.emit('on', message.data);
	};

	/**
	 * @fires Service#off
	 * @param  {Message} message
	 * @private
	 */
	Service.prototype.onOff = function(message) {
	  debug('on off');
	  this.emit('off', message.data);
	};

	Service.prototype.addClient = function(id, port) {
	  this.clients[id] = {
	    id: id,
	    port: port
	  };
	};

	Service.prototype.removeClient = function(id) {
	  delete this.clients[id];
	};

	/**
	 * Use a plugin with this Service.
	 * @param  {Function} fn Plugin function
	 * @return {this} for chaining
	 * @public
	 */
	Service.prototype.plugin = function(fn) {
	  fn(this, { 'uuid': uuid });
	  return this;
	};

	/**
	 * Disconnect a Client from the Service.
	 * @param  {Object} client
	 * @private
	 */
	Service.prototype.disconnect = function(client) {
	  this.removeClient(client.id);
	  message('disconnect')
	    .set({
	      recipient: client.id,
	      noRespond: true
	    })
	    .send(client.port);
	};

	/**
	 * Destroy the Service.
	 * @public
	 */
	Service.prototype.destroy = function() {
	  delete this.clients;
	  this.unlisten();
	  this.off();
	};

	var sp = Service.prototype;
	sp['broadcast'] = sp.broadcast;
	sp['destroy'] = sp.destroy;
	sp['method'] = sp.method;
	sp['plugin'] = sp.plugin;

	/**
	 * Creates new `Error` from registery.
	 *
	 * @param  {Number} id Error Id
	 * @return {Error}
	 * @private
	 */
	function error(id) {
	  var args = [].slice.call(arguments, 1);
	  return new Error({
	    4: 'method "' + args[0] + '" doesn\'t exist'
	  }[id]);
	}

	/**
	 * Fires before the default 'connect' logic.
	 * This event acts as a hook for plugin authors
	 * to override default 'connect' behaviour.
	 *
	 * @example
	 *
	 * service.on('before-connect', message => {
	 *   message.preventDefault();
	 *   // alternative connection logic ...
	 * });
	 *
	 * @event Service#before-connect
	 * @param {Message} message - The connect message
	 */

	/**
	 * Signals that a Client has connected.
	 *
	 * @example
	 *
	 * service.on('connected', clientId => {
	 *   console.log('client (%s) has connected', clientId);
	 * });
	 *
	 * @event Service#connected
	 * @param {String} clientId - The id of the connected Client
	 */

	/**
	 * Fires before the default 'disconnect' logic.
	 * This event acts as a hook for plugin authors
	 * to override default 'disconnect' behaviour.
	 *
	 * @example
	 *
	 * service.on('before-disconnect', message => {
	 *   message.preventDefault();
	 *   // alternative disconnection logic ...
	 * });
	 *
	 * @event Service#before-disconnect
	 * @param {Message} message - The disconnect message
	 */

	/**
	 * Signals that a Client has disconnected.
	 *
	 * @example
	 *
	 * service.on('disconnected', clientId => {
	 *   console.log('client (%s) has disconnected', clientId);
	 * });
	 *
	 * @event Service#disconnected
	 * @param {String} clientId - The id of the disconnected Client
	 */

	/**
	 * Signals that a Client has begun
	 * listening to a broadcast event.
	 *
	 * @example
	 *
	 * service.on('on', data => {
	 *   console.log('client (%s) is listening to %s', data.clientId, data.name);
	 * });
	 *
	 * @event Service#on
	 * @type {Object}
	 * @property {String} name - The broadcast name
	 * @property {String} clientId - The id of the Client that started listening
	 */

	/**
	 * Signals that a Client has stopped
	 * listening to a broadcast event.
	 *
	 * @example
	 *
	 * service.on('off', data => {
	 *   console.log('client (%s) stopped listening to %s', data.clientId, data.name);
	 * });
	 *
	 * @event Service#off
	 * @param {Object} data
	 * @param {String} data.name - The broadcast name
	 * @param {String} data.clientId - The id of the Client that stopped listening
	 */
	});

	var require$$2$1 = (service$1 && typeof service$1 === 'object' && 'default' in service$1 ? service$1['default'] : service$1);

	var index = createCommonjsModule(function (module) {
	module.exports = {
	  service: require$$2$1,
	  client: require$$1$1,
	  _message: require$$0
	};
	});

	var client = index.client;

	const p$1 = Object.freeze({
	  worker: Symbol('worker'),
	  workerClient: Symbol('workerClient'),
	  initialize: Symbol('initialize'),
	  pocketSphinxArguments: Symbol('pocketSphinxArguments'),
	  pocketSphinxUrl: Symbol('pocketSphinxUrl'),
	});

	class PocketSphinx extends EventEmitter {
	  constructor(options = {}) {
	    super();
	    // TODO: Compile worker as a string and then create a blob URL (to keep everything
	    // self contained)?
	    const workerUrl = options.workerUrl || undefined;
	    this[p$1.pocketSphinxUrl] = options.pocketSphinxUrl || 'pocketsphinx.js';
	    this[p$1.pocketSphinxArguments] = options.args || [];

	    this[p$1.worker] = new Worker(workerUrl);
	    this[p$1.workerClient] = client('pocketsphinx', this[p$1.worker], 50000);
	  }

	  get requiredSampleRate() {
	    return 16000;
	  }

	  initialize() {
	    console.log("calling initialize...");
	    return this[p$1.workerClient].method('initialize', {
	      pocketSphinxUrl: this[p$1.pocketSphinxUrl],
	      args: this[p$1.pocketSphinxArguments],
	    });
	  }

	  addDictionary(dictionary) {
	    return this[p$1.workerClient].method('addWords', dictionary);
	  }

	  addGrammar(grammar) {
	    return this[p$1.workerClient].method('addGrammar', grammar);
	  }

	  lookupWords(words) {
	    return this[p$1.workerClient].method('lookupWords', words);
	  }

	  addKeyword(keyword) {
	    return this[p$1.workerClient].method('addKeyword', keyword);
	  }

	  start() {
	    return this[p$1.workerClient].method('start');
	  }

	  stop() {
	    // TODO
	  }

	  process(buffer) {
	    return this[p$1.workerClient].method('process', buffer)
	      .then((result) => {
	        if (result && result.hypothesis && result.hypothesis.length) {
	          console.log("res: ", result);
	          this.emit('keywordspotted', result);
	        }
	      });
	  }
	}

	/* VAD.js https://github.com/kdavis-mozilla/vad.js/
	 *
	 * Copyright (c) 2015, Kelly Davis
	 * All rights reserved.
	 *
	 * Redistribution and use in source and binary forms, with or without modification,
	 * are permitted provided that the following conditions are met:
	 *
	 * * Redistributions of source code must retain the above copyright notice, this
	 *   list of conditions and the following disclaimer.
	 *
	 * * Redistributions in binary form must reproduce the above copyright notice, this
	 *   list of conditions and the following disclaimer in the documentation and/or
	 *   other materials provided with the distribution.
	 *
	 * * Neither the name of the {organization} nor the names of its
	 *   contributors may be used to endorse or promote products derived from
	 *   this software without specific prior written permission.
	 *
	 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
	 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
	 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
	 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
	 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
	 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
	 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
	 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
	 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
	 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	 */
	var VAD = function(options) {
	  // Default options
	  this.options = {
	    fftSize: 512,
	    bufferLen: 512,
	    voice_stop: function() {},
	    voice_start: function() {},
	    smoothingTimeConstant: 0.99,
	    energy_offset: 1e-8, // The initial offset.
	    energy_threshold_ratio_pos: 2, // Signal must be twice the offset
	    energy_threshold_ratio_neg: 0.5, // Signal must be half the offset
	    energy_integration: 1, // Size of integration change compared to the signal per second.
	    filter: [
	      {f: 200, v:0}, // 0 -> 200 is 0
	      {f: 2000, v:1} // 200 -> 2k is 1
	    ],
	    source: null,
	    context: null
	  };

	  // User options
	  for(var option in options) {
	    if(options.hasOwnProperty(option)) {
	      this.options[option] = options[option];
	    }
	  }

	  // Require source
	 if(!this.options.source)
	   throw new Error("The options must specify a MediaStreamAudioSourceNode.");

	  // Set this.options.context
	  this.options.context = this.options.source.context;

	  // Calculate time relationships
	  this.hertzPerBin = this.options.context.sampleRate / this.options.fftSize;
	  this.iterationFrequency = this.options.context.sampleRate / this.options.bufferLen;
	  this.iterationPeriod = 1 / this.iterationFrequency;

	  var DEBUG = true;
	  if(DEBUG) console.log(
	    'Vad' +
	    ' | sampleRate: ' + this.options.context.sampleRate +
	    ' | hertzPerBin: ' + this.hertzPerBin +
	    ' | iterationFrequency: ' + this.iterationFrequency +
	    ' | iterationPeriod: ' + this.iterationPeriod
	  );

	  this.setFilter = function(shape) {
	    this.filter = [];
	    for(var i = 0, iLen = this.options.fftSize / 2; i < iLen; i++) {
	      this.filter[i] = 0;
	      for(var j = 0, jLen = shape.length; j < jLen; j++) {
	        if(i * this.hertzPerBin < shape[j].f) {
	          this.filter[i] = shape[j].v;
	          break; // Exit j loop
	        }
	      }
	    }
	  }

	  this.setFilter(this.options.filter);

	  this.ready = {};
	  this.vadState = false; // True when Voice Activity Detected

	  // Energy detector props
	  this.energy_offset = this.options.energy_offset;
	  this.energy_threshold_pos = this.energy_offset * this.options.energy_threshold_ratio_pos;
	  this.energy_threshold_neg = this.energy_offset * this.options.energy_threshold_ratio_neg;

	  this.voiceTrend = 0;
	  this.voiceTrendMax = 10;
	  this.voiceTrendMin = -10;
	  this.voiceTrendStart = 5;
	  this.voiceTrendEnd = -5;

	  // Create analyser
	  this.analyser = this.options.context.createAnalyser();
	  this.analyser.smoothingTimeConstant = this.options.smoothingTimeConstant; // 0.99;
	  this.analyser.fftSize = this.options.fftSize;

	  this.floatFrequencyData = new Float32Array(this.analyser.frequencyBinCount);

	  // Setup local storage of the Linear FFT data
	  this.floatFrequencyDataLinear = new Float32Array(this.floatFrequencyData.length);

	  // Connect this.analyser
	  this.options.source.connect(this.analyser);

	  // Create ScriptProcessorNode
	  this.scriptProcessorNode = this.options.context.createScriptProcessor(this.options.bufferLen, 1, 1);

	  // Connect scriptProcessorNode (Theretically, not required)
	  this.scriptProcessorNode.connect(this.options.context.destination);

	  // Create callback to update/analyze floatFrequencyData
	  var self = this;
	  this.scriptProcessorNode.onaudioprocess = function(event) {
	    self.analyser.getFloatFrequencyData(self.floatFrequencyData);
	    self.update();
	    self.monitor();
	  };

	  // Connect scriptProcessorNode
	  this.options.source.connect(this.scriptProcessorNode);

	  // log stuff
	  this.logging = false;
	  this.log_i = 0;
	  this.log_limit = 100;

	  this.triggerLog = function(limit) {
	    this.logging = true;
	    this.log_i = 0;
	    this.log_limit = typeof limit === 'number' ? limit : this.log_limit;
	  }

	  this.log = function(msg) {
	    if(this.logging && this.log_i < this.log_limit) {
	      this.log_i++;
	      console.log(msg);
	    } else {
	      this.logging = false;
	    }
	  }

	  this.update = function() {
	    // Update the local version of the Linear FFT
	    var fft = this.floatFrequencyData;
	    for(var i = 0, iLen = fft.length; i < iLen; i++) {
	      this.floatFrequencyDataLinear[i] = Math.pow(10, fft[i] / 10);
	    }
	    this.ready = {};
	  }

	  this.getEnergy = function() {
	    if(this.ready.energy) {
	      return this.energy;
	    }

	    var energy = 0;
	    var fft = this.floatFrequencyDataLinear;

	    for(var i = 0, iLen = fft.length; i < iLen; i++) {
	      energy += this.filter[i] * fft[i] * fft[i];
	    }

	    this.energy = energy;
	    this.ready.energy = true;

	    return energy;
	  }

	  this.monitor = function() {
	    var energy = this.getEnergy();
	    var signal = energy - this.energy_offset;

	    if(signal > this.energy_threshold_pos) {
	      this.voiceTrend = (this.voiceTrend + 1 > this.voiceTrendMax) ? this.voiceTrendMax : this.voiceTrend + 1;
	    } else if(signal < -this.energy_threshold_neg) {
	      this.voiceTrend = (this.voiceTrend - 1 < this.voiceTrendMin) ? this.voiceTrendMin : this.voiceTrend - 1;
	    } else {
	      // voiceTrend gets smaller
	      if(this.voiceTrend > 0) {
	        this.voiceTrend--;
	      } else if(this.voiceTrend < 0) {
	        this.voiceTrend++;
	      }
	    }

	    var start = false, end = false;
	    if(this.voiceTrend > this.voiceTrendStart) {
	      // Start of speech detected
	      start = true;
	    } else if(this.voiceTrend < this.voiceTrendEnd) {
	      // End of speech detected
	      end = true;
	    }

	    // Integration brings in the real-time aspect through the relationship with the frequency this functions is called.
	    var integration = signal * this.iterationPeriod * this.options.energy_integration;

	    // Idea?: The integration is affected by the voiceTrend magnitude? - Not sure. Not doing atm.

	    // The !end limits the offset delta boost till after the end is detected.
	    if(integration > 0 || !end) {
	      this.energy_offset += integration;
	    } else {
	      this.energy_offset += integration * 10;
	    }
	    this.energy_offset = this.energy_offset < 0 ? 0 : this.energy_offset;
	    this.energy_threshold_pos = this.energy_offset * this.options.energy_threshold_ratio_pos;
	    this.energy_threshold_neg = this.energy_offset * this.options.energy_threshold_ratio_neg;

	    // Broadcast the messages
	    if(start && !this.vadState) {
	      this.vadState = true;
	      this.options.voice_start();
	    }
	    if(end && this.vadState) {
	      this.vadState = false;
	      this.options.voice_stop();
	    }

	    this.log(
	      'e: ' + energy +
	      ' | e_of: ' + this.energy_offset +
	      ' | e+_th: ' + this.energy_threshold_pos +
	      ' | e-_th: ' + this.energy_threshold_neg +
	      ' | signal: ' + signal +
	      ' | int: ' + integration +
	      ' | voiceTrend: ' + this.voiceTrend +
	      ' | start: ' + start +
	      ' | end: ' + end
	    );

	    return signal;
	  }
	};

	// Polyfill AudioNode to allow composite audio nodes:
	// https://github.com/GoogleChrome/web-audio-samples/wiki/CompositeAudioNode
	const _connect = Symbol('_connect');
	const _input = Symbol('_input');
	const _output = Symbol('_output');
	const _isCompositeAudioNode = Symbol('_isCompositeAudioNode');

	AudioNode.prototype[_connect] = AudioNode.prototype.connect;
	AudioNode.prototype.connect = function() {
	  const args = Array.prototype.slice.call(arguments);
	  if (args[0][_isCompositeAudioNode]) {
	    args[0] = args[0][_input];
	  }

	  return this[_connect].apply(this, args);
	};

	// Must be a power of 2
	const DEFAULT_BUFFER_LENGTH = 4096;

	const p = Object.freeze({
	  decimate: Symbol('decimate'),
	  audioContext: Symbol('audioContext'),
	  sampleInterval: Symbol('sampleInterval'),
	  buffer: Symbol('buffer'),
	  setupEvents: Symbol('setupEvents'),
	  pocketSphinx: Symbol('pocketSphinx'),
	});

	class PocketSphinxAnalyzerNode extends EventEmitter {

	  constructor(audioContext, options) {
	    super();

	    this[p.pocketSphinx] = new PocketSphinx(options);

	    this[p.audioContext] = audioContext;

	    const targetRate = this[p.pocketSphinx].requiredSampleRate;
	    const sampleRate = audioContext.sampleRate;
	    this[p.sampleInterval] = sampleRate / targetRate;

	    this[_input] = audioContext.createGain();
	    this[_output] = audioContext.createGain();

	    // To avoid signal aliasing first lowpass everything below the new
	    // Nyquist frequency
	    const nyquist = targetRate / 2;
	    const lowpass = createLowPassFilter(audioContext, nyquist);

	    this[_input].connect(lowpass);

	    const decimationNode = this[p.audioContext].createScriptProcessor(4096);
	    console.log("Using buffer size: ", decimationNode.bufferSize);

	    this[p.buffer] = new CircularBuffer(new Int16Array(decimationNode.bufferSize * 2));

	    decimationNode.onaudioprocess = this[p.decimate].bind(this);

	    // Merge every output channel of the lowpass filter into a single input in the
	    // decimation node (PocketSphinx expects mono audio)
	    for (let outputIndex = 0; outputIndex < this[_input].numberOfOutputs; outputIndex++) {
	      lowpass.connect(decimationNode, outputIndex, 0);
	    }

	    this[_output] = decimationNode;
	    this.voiceDetected = false;

	    const vadOptions = {
	      source: this[_input],
	      voice_start: () => {
	        console.log('Voice activity detected');
	        this.voiceDetected = true;
	      },
	      voice_stop: () => {
	        console.log('Voice activity stopped');
	        this.voiceDetected = false;
	      },
	    };

	    this.vad = new VAD(vadOptions);
	    // Turn on logging for debug
	    this.vad.triggerLog();

	    this[p.setupEvents]();
	    // Kick off initialization.
	    this[p.initialization] = this[p.pocketSphinx].initialize();
	  }

	  addDictionary(dictionary) {
	    return this[p.initialization].then(() => {
	      return this[p.pocketSphinx].addDictionary(dictionary);
	    });
	  }

	  addKeyword(keyword) {
	    return this[p.initialization].then(() => {
	      return this[p.pocketSphinx].addKeyword(keyword);
	    });
	  }

	  // PocketSphinx expects audio as a single-channel (monaural), little-endian,
	  // 16-bit signed PCM audio, sampled at 16 kHz
	  //
	  // This processor constrains input to 16 kHZ and combines multichannel inputs,
	  // listen for the 'data' event after hooking up to the WebAudio API for input,
	  // to get buffered 16KHz Int16Array buffers.
	  [p.decimate](audioProcessingEvent) {

	    const inputBuffer = audioProcessingEvent.inputBuffer;
	    const outputBuffer = audioProcessingEvent.outputBuffer;

	    // Only care about channel 0 because it should be mono thanks to the merge
	    // in `start` (we only care about one channel anyway).
	    const inputData = inputBuffer.getChannelData(0);

	    for (let sample = 0; sample < (inputBuffer.length - 1); sample += this[p.sampleInterval]) {

	      // Calculate a value between two samples using linear interpolation
	      // (`sample` will be a floating point number)
	      const lowerIndex = sample|0;
	      const upperIndex = lowerIndex + 1;
	      const blend = sample - lowerIndex;
	      const lowerValue = inputData[lowerIndex];
	      const upperValue = inputData[upperIndex];
	      const sampleData = lerp(lowerValue, upperValue, blend);

	      this[p.buffer].push(floatToInt16(sampleData));
	    }

	    if (this[p.buffer].length >= DEFAULT_BUFFER_LENGTH) {
	      const buffer = new Int16Array(DEFAULT_BUFFER_LENGTH);

	      // Create audioBuffer if we have enough data samples.
	      for (let i = 0; i < DEFAULT_BUFFER_LENGTH; i++) {
	        buffer[i]  = this[p.buffer].pop();
	      }

	      this[p.pocketSphinx].process(buffer);
	    }
	  }

	  get [_isCompositeAudioNode]() {
	    return true;
	  }

	  get context() {
	    return this[p.audioContext];
	  }

	  // Polyfill method
	  connect() {

	    // NOTE: (Spec question really) Is it ok for this method to be async?
	    // Although not explicit here - nothing will apparently happen until
	    // this[p.initialization] has resolved.

	    this[p.pocketSphinx].start();
	    this[_output].connect.apply(this[_output], arguments);
	  }

	  // Polyfill method
	  disconnect() {
	    this[_output].disconnect.apply(this[_output], arguments);
	    this[p.pocketSphinx].stop();
	  }

	  [p.setupEvents]() {
	    this[p.pocketSphinx].on('keywordspotted', (event) => {
	      if (!this.voiceDetected) { return };

	      this.voiceDetected = false;
	      console.log('Voice activity stopped');
	      this.emit('keywordspotted', event);
	    });
	  }
	}

	function floatToInt16(f) {
	  const _f = (f * 32768)|0;

	  if (_f > 32767) {
	    return 32767;
	  } else if (_f < -32768) {
	    return -32768;
	  } else {
	    return _f;
	  }
	}

	function createLowPassFilter(audioContext, cutoffFrequency) {
	  const lowpassFilter = audioContext.createBiquadFilter();
	  lowpassFilter.type = 'lowpass';
	  lowpassFilter.frequency.value = cutoffFrequency;
	  return lowpassFilter;
	}

	function lerp(a, b, blend) {
	  return a * (1 - blend) + b * blend;
	}

	return PocketSphinxAnalyzerNode;

}));