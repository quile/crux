var mori   = require("mori");
var parser = require("path-to-regexp");
var util   = require("util");

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

    enslashRoute: function(route) {
       // add a slash to the route regexp
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
        debugger;
        var floated = crux.pipeline(float, pre);
        var sunk = crux.pipeline(post, sunk);
        var children = crux.buildRouteTree(fullPath, floated, sunk, subroutes);
        var actions = crux._actionMethods(action);
        debugger;
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
            //console.log(route);
            return crux.buildRoute(rootPath, pre, post, route);
        };
        //console.log(">>> ");
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
        var requestMethod = _keywordise(req.method || ":get");
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
            debugger;
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
    }

// (defn- get-path
//   [routes key]
//   (or
//    (get-in routes [:mapping (keyword key) :path])
//    (throw (new Exception (str "route for " key " not found")))))

// (defn sort-route-params
//   [routes key params]
//   (let [path (get-path routes key)
//         opt-keys (keys params)
//         route-keys (map
//                     read-string
//                     (filter
//                      #(= (first %) \:)
//                      (string/split path #"/")))
//         query-keys (remove (into #{} route-keys) opt-keys)]
//     {:path path
//      :route (select-keys params route-keys)
//      :query (select-keys params query-keys)}))

// (defn query-item
//   [[k v]]
//   (str
//    (codec/form-encode (name k))
//    "="
//    (codec/form-encode v)))

// (defn build-query-string
//   [params query-keys]
//   (let [query (string/join "&" (map query-item (select-keys params query-keys)))]
//     (and (seq query) (str "?" query))))

// (defn reverse-route
//   ([routes key params] (reverse-route routes key params {}))
//   ([routes key params opts]
//      (let [{path :path
//             route-matches :route
//             query-matches :query} (sort-route-params routes key params)
//             route-keys (keys route-matches)
//             query-keys (keys query-matches)
//             opt-keys (keys params)
//             base (reduce
//                   #(string/replace-first %1 (str (keyword %2)) (get params %2))
//                   path opt-keys)
//             query (if-not (:no-query opts) (build-query-string params query-keys))]
//        (str base query))))
};

module.exports = crux;
