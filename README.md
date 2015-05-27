# crux

### Requests guided by the constellations

![Crux](http://www.teara.govt.nz/files/hero-7484-new.jpg)

Routing defined by data.

Also, provides reverse routing for building urls from parameters!

[Crux](https://github.com/quile/crux) is based on the excellent Clojure router
[Polaris](https://github.com/caribou/polaris), which is part of the
[Caribou](http://let-caribou.in) ecosystem.

## Installation

Using npm:

    npm install --save crux-router

## Usage

Crux uses a data-driven routing defintion approach.  Routes are given as a
vector of route definitions.  Every route definition has the following form:

```javascript
["/path/to/match", "identifying-key", handler-fn, [optional-child-routes]]
```

Variables in paths can be specified with a `:keyword`:

```javascript
["/path/with/:variable", "identifying-key", handler-fn, [optional-child-routes]]

```

Once you have an array of (possibly nested) route definitions, you can
build your routes with `crux.buildRoutes`:

```javascript
function baseHandler(req, res, next) {
    res.send("This is the base");
    next();
}

function subHandler(req, res, next) {
    res.send("We received " + req.params["leaf"]);
    next();
}

var routes = 
  [["/base-path", "base",  baseHandler,
    [["/sub-path/:leaf", "sub", subHandler]]]];

var built = crux.buildRoutes(routes);
```

Once you have some routes, you can match requests!

```javascript
var handler = crux.router(built);

// assuming req and res exist...
handler(req, res, function() { console.log("finished!") });

// if req.url is "/base-path" then the response body is "This is the base"
```

Child routes inherit their path from their parent, so for the above routes the
following request would work:

```javascript
//(handler {:uri "/base-path/sub-path/yellow"}) ;; ---> {:status 200 :body "We received yellow"}
```

Route matching works with or without following slashes:

```javascript
//(handler {:uri "/base-path/sub-path/chartreuse/"}) ;; ---> {:status 200 :body "We received chartreuse"}
```

Handlers can be scoped to different request methods:

```javascript
/*
(defn get-handler
  [request]
  {:status 200
   :body "The method defaults to GET"})

(defn post-handler
  [request]
  {:status 200
   :body "This is a POST"})

(defn delete-handler
  [request]
  {:status 200
   :body "DELETED!!"})

(def route-definitions
  [["/method-sensitive" :base {:GET base-handler :POST post-handler :DELETE delete-handler}]])

(def routes (polaris.core/build-routes route-definitions))
(def handler (polaris.core/router routes))

(handler {:uri "/method-sensitive"}) ;; ---> {:status 200 :body "The method defaults to GET"}
(handler {:uri "/method-sensitive" :request-method :post}) ;; --> {:status 200 :body "This is a POST"}
(handler {:uri "/method-sensitive" :request-method :delete}) ;; --> {:status 200 :body "DELETED!!"}
*/
```

### Subtree Pipelines

You can define handlers to run at certain points in your routing tree, and all sub-routes will inherit those
handlers.  In order to specify whether or not the handler should run before or after the route handler itself,
you can either "float" or "sink" the handler.  A handler that is "floated" runs before the handler, and
a handler that is "sunk" runs after it.

```javascript
/*   # EXAMPLE TO COME - this is a polaris example
(defn ocean-rock
  [request]
  {:status 200
   :body "An ocean rock"})

(defn sea-floor
  [request]
  {:status 200
   :body "A sandy sea floor"})

(defn anemone
  [app]
  (fn [request]
    (update-in (app request) [:body] #(str % " covered in anemone"))))

(defn boat
  [app]
  (fn [request]
    (update-in (app request) [:body] #(str % " underneath a small boat"))))

(def sea-routes
  [["/ocean" :ocean {:ALL ocean-rock :sink anemone :float boat}
    [["/floor" :floor sea-floor]]]])

(def routes (polaris.core/build-routes sea-routes))
(def handler (polaris.core/router routes))

(handler {:uri "/ocean"}) ;; ---> {:status 200 :body "An ocean rock covered in anemone underneath a small boat"}
(handler {:uri "/ocean/floor"}) ;; ---> {:status 200 :body "A sandy sea floor covered in anemone underneath a small boat"}
*/
```

### Reverse Routing

Crux supports reverse routing, which means you can reconstruct a url based on
the route's identifying key and a map of values to substitute into any variable
path elements.

```javascript
var routeDefinitions = [["/path/:with/:lots/:of/:variables", "demo", function(){}]];

var routes = crux.buildRoutes(routeDefinitions);
crux.reverseRoute(routes, "demo", {with: "now", lots: "formed", of: "from", variables: "map"});
--> "/path/now/formed/from/map"
```

## License

Copyright © 2015 Kyle Dawkins
Based on original material that is copyright © 2013 Ryan Spangler

Distributed under the MIT license.
