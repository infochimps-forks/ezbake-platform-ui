module.exports =(function(app, express, constants, config, ezConfig, winston){
    var RedisStore = require("connect-redis")(express);
    var redis = require("redis");
    app.use(express.cookieParser());
    var sessionOpts = {
        secret: config.cookie_secret,
        key: config.session_key
    };

    var host = ezConfig.getString(constants.redis.host);
    var port = ezConfig.getString(constants.redis.port);
    var redisClient = redis.createClient(port, host);

    winston.info("Kibana-Auth-Proxy Redis Host: " + host + ":" + port);

    sessionOpts.store =  new RedisStore({
        client: redisClient,
        prefix: config.redis_prefix
    });
    winston.info("Kibana-Auth-Proxy session option secret: " + sessionOpts.secret);
    winston.info("Kibana-Auth-Proxy session option key: " + sessionOpts.key);
    winston.info("Kibana-Auth-Proxy session option store: redis");

    app.use(express.session(sessionOpts));
});