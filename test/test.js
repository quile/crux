var assert = require("assert");
var mori   = require("mori");
var mhttp  = require("node-mocks-http");

var crux = require("../crux");

var actions = {
    home: function(req, res, next) {
        res.send("YOU ARE HOME");
        next();
    },

    child: function(req, res, next) {
        res.send("child playing with routers");
        next();
    },

    grandchild: function(req, res, next) {
        res.send(req.params["face"] + " contains wisdom");
        next();
    },

    sibling: function(req, res, next) {
        res.send("there is a " + req.params["hand"]);
        next();
    },

    parallel: function(req, res, next) {
        res.send("ALTERNATE DIMENsion ---------");
        next();
    },

    lellarap: function(req, res, next) {
        res.send("--------- noisNEMID ETANRETLA");
        next();
    },

    orthogonal: function(req, res, next) {
        res.send("ORTHOGONAL TO " + req.params["vector"]);
        next();
    },

    perpendicular: function(req, res, next) {
        res.send(req.params["tensor"] + " IS PERPENDICULAR TO " + req.params["manifold"]);
        next();
    },

    further: function(req, res, next) {
        res.send("What are you doing out here " + req.params["further"] + "?");
        next();
    },

    wrapper: function(req, res, next) {
        // increment the status
        res.status(res._getStatusCode() + 1);
        next();
    },

    fascism: function(req, res, next) {
        res.status(11);
        next();
    },
};


var TEST_ROUTES =
[
    ["/", ":home", actions.home,
       [
           ["/child", ":child", actions.child,
              [
                  ["/grandchild/:face", ":grandchild", actions.grandchild]
              ]
           ],
           ["/sibling/:hand", ":sibling", actions.sibling]
       ]
    ],
    ["/parallel", ":parallel", {":get": actions.parallel,
                                ":post": actions.lellarap,
                                ":float": actions.wrapper},
        [
            ["/orthogonal/:vector", ":orthogonal", {":put": actions.orthogonal,
                                                    ":sink": crux.pipeline(actions.wrapper, actions.wrapper),
                                                    ":float": actions.fascism}],
            ["/perpendicular/:tensor/:manifold", ":perpendicular", actions.perpendicular]
        ]
    ],
    ["/:further", ":further", actions.further]
];


describe("router", function() {
    it("builds routes from route-tree", function() {
        var built = crux.buildRoutes(TEST_ROUTES);
        var handler = crux.router(built);

        var tests = [
            { req: { url: "" }, res: { status: 200, body: "YOU ARE HOME" } },
            { req: { url: "/" }, res: { status: 200, body: "YOU ARE HOME" } },
            { req: { url: "/child" }, res: { status: 200, body: "child playing with routers" } },
            { req: { url: "/child/" }, res: { status: 200, body: "child playing with routers" } },
            { req: { url: "/child/grandchild/water" },
              res: { status: 200, body: "water contains wisdom" } },
            { req: { url: "/child/grandchild/fire/" },
              res: { status: 200, body: "fire contains wisdom" } },
            { req: { url: "/sibling/dragon" },
              res: { status: 200, body: "there is a dragon" } },
            { req: { url: "/parallel/" },
              res: { status: 201, body: "ALTERNATE DIMENsion ---------" } },
            { req: { url: "/parallel/", method: "POST" },
              res: { status: 201, body: "--------- noisNEMID ETANRETLA"} },
            { req: { url: "/parallel/orthogonal/OVOID", method: "PUT" },
              res: { status: 14, body: "ORTHOGONAL TO OVOID" } },
            { req: { url: "/parallel/orthogonal/OVOID", method: "DELETE"},
              res: { status: 404 } },
            { req: { url: "/parallel/orthogonal/OVOID" },
              res: { status: 404 } },
            { req: { url: "/parallel/perpendicular/A/XORB" },
              res: { status: 201, body: "A IS PERPENDICULAR TO XORB" } },
            { req: { url: "/wasteland" },
              res: { status: 200, body: "What are you doing out here wasteland?" } },
            { req: { url: "/wasteland/further/nothing/here/monolith" },
              res: { status: 404 }}
        ];

        tests.forEach(function(test) {
            var req = mhttp.createRequest(test.req);
            var res = mhttp.createResponse();

            handler(req, res);

            if (test.res.status) {
                assert.equal(test.res.status, res._getStatusCode());
            }
            if (test.res.body) {
                assert.equal(test.res.body, res._getData());
            }
        });
    });

    it("creates routes using reverse-routing", function() {
        var built = crux.buildRoutes(TEST_ROUTES);
        var handler = crux.router(built);

        assert.equal("/parallel/perpendicular/line/impossible",
                     crux.reverseRoute(built, ":perpendicular",
                                       {tensor: "line", manifold: "impossible"}));

        assert.equal("/parallel/perpendicular/line/impossible?bar=yellow",
                     crux.reverseRoute(built, ":perpendicular",
                                       {tensor: "line",
                                        manifold: "impossible",
                                        bar: "yellow"}));
    });
});

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

describe("pipeline", function() {
    it("nests floated and sunk handlers correctly", function() {
        var built = crux.buildRoutes(seaRoutes);
        var handler = crux.router(built);

        var req = mhttp.createRequest({url: "/ocean"});
        var res = mhttp.createResponse();
        handler(req, res);

        assert.equal("You see: An ocean rock covered in anemone", res._getData());

        req = mhttp.createRequest({url: "/ocean/floor"});
        res = mhttp.createResponse();
        handler(req, res);

        assert.equal("You see: A sandy sea floor covered in anemone underneath a small boat", res._getData());
    });
});

