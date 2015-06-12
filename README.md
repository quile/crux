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

First, load the module using `require`:

```javascript
var crux = require("crux");
```

Crux uses a data-driven routing definition approach.  Routes are given as an
array of route definitions.  Every route definition has the following form:

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
//handler({ url: "/base-path/sub-path/yellow" }, res, next) ---> "We received yellow"
```

Route matching works with or without following slashes:

```javascript
//handler({ url: "/base-path/sub-path/chartreuse/" }, res, next) ---> "We received chartreuse"
```

Handlers can be scoped to different request methods:

```javascript
var getHandler = function(req, res, next) {
    res.send("The method defaults to GET");
    next();
};

var postHandler = function(req, res, next) {
    res.send("This is a POST");
    next();
};

var deleteHandler = function(req, res, next) {
    res.send("DELETED!!");
    next();
};

var routes = [["/method-sensitive", "base", { "GET": getHandler, "POST": postHandler, "DELETE", deleteHandler }]];

var built = crux.buildRoutes(routes);
var handler = crux.router(built);

handler({ url: "/method-sensitive" }) --> "The method defaults to GET"
handler({ url: "/method-sensitive", method: "POST"}) --> "This is a POST"
handler({ url: "/method-sensitive", method: "DELETE"}) --> "DELETED!!"
```

### Subtree Pipelines

You can define handlers to run at certain points in your routing tree, and all sub-routes will inherit those
handlers.  In order to specify whether or not the handler should run before or after the route handler itself,
you can either "float" or "sink" the handler.  A handler that is "floated" runs before the handler, and
a handler that is "sunk" runs after it.

```javascript
var pipeline = {
    oceanRock: function(req, res, next) {
        res.write("An ocean rock");
        next();
    },

    seaFloor: function(req, res, next) {
        res.write("A sandy sea floor");
        next();
    },

    anemone: function(req, res, next) {
        res.write(" covered in anemone");
        next();
    },

    whatYouSee: function(req, res, next) {
        res.write("You see: ");
        next();
    },

    boat: function(req, res, next) {
        res.write(" underneath a small boat");
        next();
    }
};

var seaRoutes = [["/ocean", ":ocean", { ":all": pipeline.oceanRock,
                                        ":sink": pipeline.anemone,
                                        ":float": pipeline.whatYouSee },
                  [["/floor", ":floor", { ":all": pipeline.seaFloor,
                                          ":sink": pipeline.boat }]]]];

var built = crux.buildRoutes(seaRoutes);
var handler = crux.router(built);

handler({ url: "/ocean" }, res, next); ---> "You see: An ocean rock covered in anemone"
handler({ url: "/ocean/floor" }, res, next); ---> "You see: A sandy sea floor covered in anemone underneath a small boat"
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
