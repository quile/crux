var assert = require("assert");
var mori   = require("mori");
var mhttp  = require("node-mocks-http");

var crux = require("../crux");

var actions = {
    home: function(req, res, next) {
        res.send("YOU ARE HOME");
        //console.log("home");
        next();
    },

    child: function(req, res, next) {
        res.send("child playing with routers");
        //console.log("child");
        next();
    },

    grandchild: function(req, res, next) {
        res.send(req.params["face"] + " contains wisdom");
        //console.log("grandchild");
        next();
    },

    sibling: function(req, res, next) {
        res.send("there is a " + req.params["hand"]);
        //console.log("sibling");
        next();
    },

    parallel: function(req, res, next) {
        res.send("ALTERNATE DIMENsion ---------");
        //console.log("parallel");
        next();
    },

    lellarap: function(req, res, next) {
        res.send("--------- noisNEMID ETANRETLA");
        //console.log("lellarap");
        next();
    },

    orthogonal: function(req, res, next) {
        res.send("ORTHOGONAL TO " + req.params["vector"]);
        //console.log("orthogonal");
        next();
    },

    perpendicular: function(req, res, next) {
        res.send(req.params["tensor"] + " IS PERPENDICULAR TO " + req.params["manifold"]);
        //console.log("perpendicular");
        next();
    },

    further: function(req, res, next) {
        res.send("What are you doing out here " + req.params["further"] + "?");
        next();
    },

    wrapper: function(req, res, next) {
        // increment the status
        res.status(res._getStatusCode() + 1);
        //console.log("wrapper");
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
            //console.log(test);
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

/*
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

(deftest sea-routes-test
  (let [routes (polaris.core/build-routes sea-routes)
        handler (polaris.core/router routes)]
    (is (= "An ocean rock covered in anemone underneath a small boat" (:body (handler {:uri "/ocean"}))))
    (is (= "A sandy sea floor covered in anemone underneath a small boat" (:body (handler {:uri "/ocean/floor"}))))))
*/

