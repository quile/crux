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
        debugger;
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
        res.send(req.param["tensor"] + " IS PERPENDICULAR TO " + req.params["manifold"]);
        next();
    },

    perpendicular: function(req, res, next) {
        res.send("What are you doing out here " + req.params["further"]);
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
    /*
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
     */
    ["/parallel", ":parallel", {":get": actions.parallel,
                                ":post": actions.lellarap,
                                ":float": actions.wrapper},
        [
            ["/orthogonal/:vector", ":orthogonal", {":put": actions.orthogonal,
                                                    ":sink": actions.fascism,
                                                    ":float": crux.pipeline(actions.wrapper, actions.wrapper)}],
            ["/perpendicular/:tensor/:manifold", ":perpendicular", actions.perpendicular]
        ]
    ],
    ["/:further", ":further", actions.further]
];


/*
describe("basic routing", function() {
    it("builds routes from route-tree", function() {
        var built = crux.buildRoutes(TEST_ROUTES);
        var handler = crux.router(built);

        var res = mhttp.createResponse();
        handler(mhttp.createRequest({"method": "GET", "url": ""}), res);
        assert.equal("YOU ARE HOME", res._getData());
        res = mhttp.createResponse();
        handler(mhttp.createRequest({"method": "GET", "url": "/"}), res);
        assert.equal("YOU ARE HOME", res._getData());
    });
});
 */

describe("nested routes", function() {
    it("builds routes from route-tree", function() {
        var built = crux.buildRoutes(TEST_ROUTES);
        var handler = crux.router(built);

        var tests = [
            /*
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
                */
            { req: { url: "/parallel/" },
              res: { status: 201, body: "ALTERNATE DIMENsion ---------" } },
            { req: { url: "/parallel/", method: "POST" },
              res: { status: 200, body: "--------- noisNEMID ETANRETLA"} },
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
            console.log(test);
        });
    });
});

/*
(deftest build-routes-test
  (let [routes (build-routes test-routes)
        handler (router routes)]
    (println routes)
    (is (= "YOU ARE HOME" (:body (handler {:uri ""}))))
    (is (= "YOU ARE HOME" (:body (handler {:uri "/"}))))
    (is (= "child playing with routers" (:body (handler {:uri "/child"}))))
    (is (= "child playing with routers" (:body (handler {:uri "/child/"}))))
    (is (= "water contains wisdom" (:body (handler {:uri "/child/grandchild/water"}))))
    (is (= "fire contains wisdom" (:body (handler {:uri "/child/grandchild/fire/"}))))
    (is (= "there is a dragon" (:body (handler {:uri "/sibling/dragon/"}))))
    (is (= "ALTERNATE DIMENsion ---------" (:body (handler {:uri "/parallel/"}))))
    (is (= 201 (:status (handler {:uri "/parallel/"}))))
    (is (= "--------- noisNEMID ETANRETLA" (:body (handler {:uri "/parallel/" :request-method :post}))))
    (is (= "ORTHOGONAL TO OVOID" (:body (handler {:uri "/parallel/orthogonal/OVOID" :request-method :put}))))
    (is (= 14 (:status (handler {:uri "/parallel/orthogonal/OVOID" :request-method :put}))))
    (is (= 404 (:status (handler {:uri "/parallel/orthogonal/OVOID" :request-method :delete}))))
    (is (= 404 (:status (handler {:uri "/parallel/orthogonal/OVOID"}))))
    (is (= "A IS PERPENDICULAR TO XORB" (:body (handler {:uri "/parallel/perpendicular/A/XORB"}))))
    (is (= 201 (:status (handler {:uri "/parallel/perpendicular/A/XORB"}))))
    (is (= "What are you doing out here wasteland?" (:body (handler {:uri "/wasteland"}))))
    (is (= 404 (:status (handler {:uri "/wasteland/further/nothing/here/monolith"}))))
    (is (= "/parallel/perpendicular/line/impossible" (reverse-route routes :perpendicular {:tensor "line" :manifold "impossible"})))
    (is (= "/parallel/perpendicular/line/impossible?bar=yellow" (reverse-route routes :perpendicular {:tensor "line" :manifold "impossible" :bar "yellow"})))
    (is (= "/child?qp=with+plus" (URLDecoder/decode(reverse-route routes :child {:qp "with+plus"}))))))

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

