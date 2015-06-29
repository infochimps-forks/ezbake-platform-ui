(function () {
    var thrift = require("thrift");
    var ezConfig = require("./singles/ezconfig");
    var utils = require("./singles/thriftUtils");

    var getAuthToken = function (request, targetSecurityId, callback) {
        var EzSecurityClient = require("ezbake-security-client");
        var client = new EzSecurityClient.Client();
        client.fetchAppToken(targetSecurityId, callback);
    };

    utils.getSecurityId("ezgroups", function(errSecurityId, securityId) {
        console.log("Security ID: " + securityId);
        getAuthToken(undefined, securityId, function (errGetToken, token) {
            console.log("Token: " + token);
            var gened = require("./gen-nodejs/" + "EzGroups");
            var ttypes = gened.ttypes;

            utils.getConnection("common_services", "ezgroups", function (errGetThrift, connection, close) {
                var thriftClient = thrift.createClient(gened, connection);
                var params = [token, null, "ezbake_devs", new ttypes.GroupInheritancePermissions({ dataAccess: true }), function (err, result) {
                    console.log(err);
                    console.log(result);
                }];
                console.log(params);
                thriftClient["createGroup"].apply(thriftClient, params);
            });
        });
    });
}());
