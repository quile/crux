var assert = require("assert");

var crux = require("../crux");
var mori = require("mori");

var actions = {
    home: function(req) {
        return mori.hashMap(":status", 200,
                            ":body", "YOU ARE HOME");
    },

    child: function(req) {
        return mori.hashMap(":status", 200,
                            ":body", "child playing with routers");
    },

    grandchild: function(req) {
        return mori.hashMap(":status", 200,
                            ":body", req.params["face"] + " contains wisdom");
    },

    sibling: function(req) {
        return mori.hashMap(":status", 200,
                            ":body", "there is a " + req.params["hand"]);
    },

    parallel: function(req) {
        return mori.hashMap(":status", 200,
                            ":body", "ALTERNATE DIMENsion ---------");
    },

    lellarap: function(req) {
        return mori.hashMap(":status", 200,
                            ":body", "--------- noisNEMID ETANRETLA");
    },

    orthogonal: function(req) {
        return mori.hashMap(":status", 200,
                            ":body", "ORTHOGONAL TO " + req.params["vector"]);
    },

    perpendicular: function(req) {
        return mori.hashMap(":status", 200,
                            ":body", req.param["tensor"] + " IS PERPENDICULAR TO " + req.params["manifold"]);
    },

    perpendicular: function(req) {
        return mori.hashMap(":status", 200,
                            ":body", "What are you doing out here " + req.params["further"]);
    },

    wrapper: function(handler) {
        return function(req) {
            return mori.updateIn(handler(req), [":status"], mori.inc);
        };
    },

    fascism: function(handler) {
        return function(req) {
            return mori.assoc(handler(req), ":status", 11);
        };
    }
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
                                                    ":sink": actions.fascism,
                                                    ":float": mori.comp(actions.wrapper, actions.wrapper)}],
            ["/perpendicular/:tensor/:manifold", ":perpendicular", actions.perpendicular]
        ]
    ],
    ["/:further", ":further", "further"]
];

var built = crux.buildRoutes(TEST_ROUTES);

//console.log(built);


/*
(deftest single-route-test
  (let [routes (build-routes [["/" :home home]])
        handler (router routes)]
    (is (= "YOU ARE HOME" (:body (handler {:uri ""}))))
    (is (= "YOU ARE HOME" (:body (handler {:uri "/"}))))))

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

describe("basic routing", function() {
    it("builds routes from route-tree", function() {
    });
});
