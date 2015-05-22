var crux = require("./crux");
var util = require("util");
var mhttp = require("node-mocks-http");

var routes = [
    ["/ocean", ":ocean", {":float": function(q,s,n) { console.log("float"); n(); },
                          ":sink": function(q,s,n) { console.log("sink"); n(); },
                          ":get": function(q,s,n) { console.log("get"); n(); }},
     [["/:foo/bar", ":foo", function(){}]]
    ]
];

var built = crux.buildRoutes(routes, "/azz");

//console.log(util.inspect(built));

var foo = crux.reverseRoute(built, ":foo");
console.log(foo);


var router = crux.router(built);

var req = mhttp.createRequest({
    url: "/azz/ocean"
});
var res = mhttp.createResponse();
router(req, res);

var b = crux.reverseRoute(built, ":foo", { foo: "banana", bar: "mango" }, { noQuery: true });

console.log("reverse: " + b);
