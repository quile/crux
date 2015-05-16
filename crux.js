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
        return mori.updateIn(routes, mori.vector(":order"), mori.conj, route);
    },

    METHOD_TYPES: mori.set(
        ":all", ":get", ":put", ":post", ":delete", ":options", ":head", ":trace", ":connect", ":patch"
    ),

    _actionMethods: function(action) {
        var self = this;
        if (mori.isAssociative(action)) {
            return mori.reduce(function(acc, v) {
                var k = _keywordise(mori.first(v));
                if (mori.hasKey(self.METHOD_TYPES, k)) {
                    return mori.assoc(acc, k, mori.nth(v, 1));
                }
                return acc;
            }, mori.hashMap(), action);
        }
        return mori.vector(mori.vector(":all", action));
    },

    composeWrapper: function(float, wrapper, sink) {
        // ? does this work at all for node?
        // (apply comp (filter identity [float wrapper sink])))
        return wrapper;
    },

    buildRoute: function(rootPath, wrapper, route) {
        var path      = mori.first(route);
        var key       = mori.nth(route, 1);
        var action    = mori.nth(route, 2);
        var subroutes = mori.get(route, 3, null) || [];
        var subPath = path.replace(/^\//, "");
        var fullPath = rootPath + "/" + subPath;
        fullPath = fullPath.replace(/\/$/, "");
        //var float = null;
        //var sink = null;
        //wrapper = crux.composeWrapper(float, wrapper, sink);
        var children = crux.buildRouteTree(fullPath, wrapper, subroutes);
        var actions = crux._actionMethods(action);
        var routes = mori.map(
            function(stuff) {
                var method = mori.first(stuff);
                var action = mori.nth(stuff, 1);
                return [key, method, fullPath, wrapper(action)];
            },
            actions
        );
        return mori.concat(routes, children);
    },

    buildRouteTree: function(rootPath, wrapper, routeTree) {
        var partial = function(route) {
            //console.log(route);
            return crux.buildRoute(rootPath, wrapper, route);
        };
        //console.log(">>> ");
        return mori.mapcat(partial, routeTree);
    },

    buildRoutes: function(routeTree, rootPath) {
        routeTree = mori.toClj(routeTree);
        rootPath = rootPath || "";
        var routes = crux.emptyRoutes();
        var built = crux.buildRouteTree(rootPath, mori.identity, routeTree);
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
            var match = crux.findFirst(mori.partial(crux.routeMatches, req), orderedRoutes);
            if (match) {
                var route = mori.get(match, 0);
                var params = mori.get(match, 1);

                // stuff params into req.params
                var action = mori.get(route, ":action", defaultAction);
                if (action) {
                    action.call(null, req, res, next);
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
