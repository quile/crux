var assert = require("assert");

var crux = require("../crux");
var mori = require("mori");

describe("basic routing", function() {
    it("builds routes from route-tree", function() {
        var routes = [
            ["/ocean", ":ocean", mori.identity, [
                ["/floor", ":floor", mori.identity]
            ]],
            ["/sky", ":sky", mori.identity]
        ];
        var built = crux.buildRoutes(routes);

        assert.equal(mori.getIn(built, [":order", 0, ":key"]), ":ocean");
        assert.equal(mori.getIn(built, [":order", 1, ":key"]), ":floor");
        assert.equal(mori.getIn(built, [":order", 2, ":key"]), ":sky");
        assert.equal(mori.getIn(built, [":order", 0, ":path"]), "/ocean");
        assert.equal(mori.getIn(built, [":order", 1, ":path"]), "/ocean/floor");
        assert.equal(mori.getIn(built, [":order", 2, ":path"]), "/sky");
    });
});
