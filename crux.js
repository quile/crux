/* =====================================================
   crux - requests guided by the constellations

   Crux is sensible, composable, data-driven routing.
   It is entirely based on the excellent Clojure
   router called "Polaris", which is part of the
   "Caribou" ecosystem.

   caribou: http://let-caribou.in
   polaris: https://github.com/caribou/polaris

   It is not possible to entirely mimic the behaviour
   of polaris, as Clojure web routing is not asynchronous
   and involves the concept of "middleware", that wraps
   functions that handle web requests.  Instead, crux
   uses the concept of a middleware pipeline.

   (c) Kyle Dawkins, 2015
   ===================================================== */

var mori        = require("mori");
var parser      = require("path-to-regexp");
var util        = require("util");
var querystring = require("querystring");

function newRoute(key, method, path, route, action) {
    return mori.hashMap(":key", key,
                        ":method", method,
                        ":path", path,
                        ":route", route,
                        ":action", action);
}

function newRouteTree(order, mapping) {
    return mori.hashMap(":order", order,
                        ":mapping", mapping);
}

function _keywordise(word) {
    if (!word.match(/^:/)) {
        return ":" + word;
    }
    return word;
}

function _unkeywordise(keyword) {
    if (keyword.match(/^:/)) {
        return keyword.replace(/^:/, "");
    }
    return keyword;
}

var crux = {
    emptyRoutes: function() {
        return newRouteTree(mori.vector(), mori.hashMap());
    },

    defaultAction: function(req, res) {
        return res.status(500).send("No action defined at this route");
    },

    sanitiseMethod: function(method) {
        method = method || ":all";
        return _keywordise(method.toLowerCase());
    },

    compileRoute: function(path) {
        var keys = [];
        var re = parser(path, keys);
        return mori.hashMap(":keys", keys, ":re", re);
    },

    mergeRoute: function(routes, key, method, path, action) {
        var method = this.sanitiseMethod(method);
        var compiledRoute = this.compileRoute(path);
        var route = newRoute(key, method, path, compiledRoute, action);
        var mapped = mori.assocIn(routes, mori.vector(":mapping", key), route);
        return mori.updateIn(mapped, mori.vector(":order"), mori.conj, route);
    },

    METHOD_TYPES: mori.set(mori.vector(
        ":all", ":get", ":put", ":post", ":delete", ":options", ":head", ":trace", ":connect", ":patch"
    )),

    _actionMethods: function(action) {
        var self = this;
        if (mori.isAssociative(action)) {
            return mori.reduce(function(acc, v) {
                var k = _keywordise(mori.first(v));
                if (mori.hasKey(self.METHOD_TYPES, k)) {
                    return mori.conj(acc, mori.vector(k, mori.nth(v, 1)));
                }
                return acc;
            }, mori.vector(), action);
        }
        return mori.vector(mori.vector(":all", action));
    },

    pipeline: function() {
        var funcs = mori.filter(mori.identity, mori.primSeq(arguments));
        if (mori.count(funcs) === 0) {
            return null;
        }
        if (mori.count(funcs) === 1) {
            return mori.first(funcs);
        }
        var jsfuncs = mori.toJs(funcs);

        return function(req, res, next) {
            var _drain = function() {
                var f = jsfuncs.shift();
                if (f) {
                    return f(req, res, _drain);
                }
                return next();
            };
            _drain();
        };
    },

    buildRoute: function(rootPath, pre, post, route) {
        var path      = mori.first(route);
        var key       = mori.nth(route, 1);
        var action    = mori.nth(route, 2);
        var subroutes = mori.get(route, 3, null) || [];
        var subPath = path.replace(/^\//, "");
        var fullPath = rootPath + "/" + subPath;
        fullPath = fullPath.replace(/\/$/, "");
        var float = mori.get(action, ":float");
        var sink = mori.get(action, ":sink");
        var floated = crux.pipeline(float, pre);
        var sunk = crux.pipeline(post, sink);
        var children = crux.buildRouteTree(fullPath, floated, sunk, subroutes);
        var actions = crux._actionMethods(action);
        var routes = mori.map(
            function(stuff) {
                var method = mori.first(stuff);
                var action = mori.nth(stuff, 1);
                return mori.vector(key, method, fullPath, crux.pipeline(floated, action, sunk));
            },
            actions
        );
        return mori.concat(routes, children);
    },

    buildRouteTree: function(rootPath, pre, post, routeTree) {
        var partial = function(route) {
            return crux.buildRoute(rootPath, pre, post, route);
        };
        return mori.mapcat(partial, routeTree);
    },

    buildRoutes: function(routeTree, rootPath) {
        routeTree = mori.toClj(routeTree);
        rootPath = rootPath || "";
        var routes = crux.emptyRoutes();
        var built = crux.buildRouteTree(rootPath, null, null, routeTree);
        return mori.reduce(function(routes, route) {
            var key = mori.first(route);
            var method = mori.nth(route, 1);
            var path = mori.nth(route, 2);
            var action = mori.nth(route, 3);
            return crux.mergeRoute(routes, key, method, path, action);
        }, routes, built);
    },

    // If you're not using express or some other system to match
    // URLs to routes, then we can do it for you:
    routeMatches: function(req, route) {
        var requestMethod = _keywordise((req.method || ":get").toLowerCase());
        var compiledRoute = mori.get(route, ":route");
        var method = mori.get(route, ":method");

        if (method === ":all" || method === requestMethod) {
            var matchResult = mori.get(compiledRoute, ":re").exec(req.url);
            if (matchResult) {
                return mori.vector(route, matchResult);
            }
        }
        return null;
    },

    findFirst: function(p, s) {
        return mori.first(mori.remove(
            function(x) { return x === null; },
            mori.map(p, s)
        ));
    },

    router: function(routes, defaultAction) {
        defaultAction = defaultAction || crux.defaultAction;
        return function(req, res, next) {
            next = next || mori.identity;
            var orderedRoutes = mori.get(routes, ":order");
            var match = crux.findFirst(mori.partial(crux.routeMatches, req), orderedRoutes);
            if (match) {
                var route = mori.get(match, 0);
                var keys  = mori.getIn(route, [":route", ":keys"]);
                var result = mori.get(match, 1);
                var params = mori.rest(result);

                // What is the "legal" way to push things into req.params?
                // TODO: this is kind of bent - almost certainly not 100% correct
                if (params && !mori.isEmpty(params)) {
                    var jsParams = mori.toJs(params);
                    jsParams.forEach(function(p, i) {
                        var key = keys[i];
                        req.params[key.name] = p;
                    });
                }
                var action = mori.get(route, ":action", defaultAction);
                if (action) {
                    return action.call(null, req, res, next);
                }
            }
            return res.status(404);
        };
    },

    _getPath: function(routes, key) {
        var val = mori.getIn(routes, mori.vector(":mapping", _keywordise(key), ":path")) || null;
        if (!val) { throw new Error("Route for " + key + " not found"); }
        return val;
    },

    sortRouteParams: function(routes, key, params) {
        var path = crux._getPath(routes, key);
        var optKeys = mori.keys(params);
        var pathParts = path.split(/\//);
        var routeKeys = mori.map(_unkeywordise, mori.filter(function(p) {
            return p.match(/^\:/);
        }, mori.primSeq(pathParts)));
        var queryKeys = mori.remove(mori.into(mori.set(), routeKeys), optKeys);
        return mori.hashMap(":path", path,
                            ":route", mori.selectKeys(params, routeKeys),
                            ":query", mori.selectKeys(params, queryKeys));
    },

    reverseRoute: function(routes, key, params, options) {
        params = params || {};
        options = options || {};
        var mparams = mori.toClj(params);
        var gripped = crux.sortRouteParams(routes, key, mparams);
        var path = mori.get(gripped, ":path");
        var routeMatches = mori.get(gripped, ":route");
        var queryMatches = mori.get(gripped, ":query");
        var optKeys = mori.keys(mparams);
        debugger;
        var base = mori.reduce(function(s, rep) {
            return s.replace(_keywordise(rep), params[rep]);
        }, path, mori.keys(routeMatches));
        var query = "";
        if (!options["noQuery"]) {
            query = querystring.stringify(mori.toJs(queryMatches));
            if (query.length) {
                query = "?" + query;
            }
        }
        return base + query;
    }
};

module.exports = crux;
