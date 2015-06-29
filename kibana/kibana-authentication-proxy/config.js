var _ = require('lodash-node');
var path = require('path');
var env = require('./package').environment;

var defaults  =  {
    //logging setup
    "log_subdirectory": "/ezlogs",
    "log_file": "kibana.log",
    "log_level": "debug", // includes these ["emerg: 0", "alert: 1", "crit: 2", "error: 3", "warning: 4", "notice: 5", "info: 6", "debug: 7"],
    "hide_console_logs": false, //sets whether logs are also shown in standard out.

    ////////////////////////////////////
    // ElasticSearch Backend Settings
    ////////////////////////////////////
    // "es_host": "localhost",  // The host of Elastic Search
    // "es_port": 9200,  // The port of Elastic Search
    //Elasticsearch host and port are set in EzConfig
    "es_using_ssl": false,  // If the ES is using SSL(https)?
    "es_username":  "",  // The basic authentication user of ES server, leave it blank if no basic auth applied
    "es_password":  "",  // The password of basic authentication of ES server, leave it blank if no basic auth applied.

    "base_relative_path": "/logs/",

    ////////////////////////////////////
    // Proxy server configurations
    ////////////////////////////////////
    // Which port listen to
    "listen_port": 8080,
    // What ip to listen on
    "listen_ip": "localhost",
    // Control HTTP max-Age header. Whether the browser cache static kibana files or not?
    // 0 for no-cache, unit in millisecond, default to 0
    // We strongly recommand you set to a larger number such as 2592000000(a month) to get a better loading speed
    "brower_cache_maxage": 0,
    // Enable SSL protocol
    "enable_ssl_port": false,
        // The following settings are valid only when enable_ssl_port is true
        "listen_port_ssl": 443,
        // Use absolute path for the key file
        "ssl_key_file": "POINT_TO_YOUR_SSL_KEY",
        // Use absolute path for the certification file
        "ssl_cert_file": "POINT_TO_YOUR_SSL_CERT",
    // Effective user. When the proxy is started as root, it will setuid to this user
    "effective_user": "nobody",
    // Effective group. When the proxy is started as root, it will setgid to this group
    "effective_group": "nobody",

    // The ES index for saving kibana dashboards
    // default to "kibana-int"
    // With the default configuration, all users will use the same index for kibana dashboards settings,
    // But we support using different kibana settings for each user.
    // If you want to use different kibana indices for individual users, use %user% instead of the real username
    // Since we support multiple authentication types(google, cas or basic), you must decide which one you gonna use.

    // Bad English:D
    // For example:
    // Config "kibana_es_index": "kibana-int-for-%user%", "which_auth_type_for_kibana_index": "basic"
    // will use kibana index settings like "kibana-int-for-demo1", "kibana-int-for-demo2" for user demo1 and demo2.
    // in this case, if you enabled both Google Oauth2 and BasicAuth, and the username of BasicAuth is the boss.
    "kibana_es_index": "kibana-int-%user%", // "kibana-int-%user%"
    "which_auth_type_for_kibana_index": "ezsecurity", // google, cas or basic

    ////////////////////////////////////
    // Security Configurations
    ////////////////////////////////////
    // Cookies secret
    // Please change the following secret randomly for security.
    "cookie_secret": "REPLACE_WITH_A_RANDOM_STRING_PLEASE",
    "session_key":"KibanaSID", //name of cookie
    //for distributed environments this must be set to true
    "use_redis_session": true,
    "redis_prefix": "Kibana",
    ////////////////////////////////////
    // Kibana3 Authentication Settings
    // Currently we support 3 different auth methods: Google OAuth2, Basic Auth and CAS SSO.
    // You can use one of them or both
    ////////////////////////////////////


    // =================================
    // Google OAuth2 settings
    // Enable? true or false
    // When set to false, google OAuth will not be applied.
    "enable_google_oauth": false,
        // We use the following redirect URI:
        // http://YOUR-KIBANA-SITE:[listen_port]/auth/google/callback
        // Please add it in the google developers console first.
        // The client ID of Google OAuth2
        "client_id": "",
        "client_secret": "",  // The client secret of Google OAuth2
        "allowed_emails": ["*"],  // An emails list for the authorized users


    // =================================
    // Basic Authentication Settings
    // The following config is different from the previous basic auth settings.
    // It will be applied on the client who access kibana3.
    // Enable? true or false
    "enable_basic_auth": false,
        // Multiple user/passwd supported
        // The User&Passwd list for basic auth
        "basic_auth_users": [
            {"user": "admin", "password": "password"},
            {"user": "demo1", "password": "pwd2"}
        ],


    // =================================
    // CAS SSO Login
    // Enable? true or false
    "enable_cas_auth": false,
        // Point to the CAS authentication URL
        "cas_server_url": "https://point-to-the-cas-server/cas",
        // CAS protocol version, one of 1.0 or 2.0
        "cas_protocol_version": 1.0,

    // =================================
    // EzSecurity Authorization
    // Enable? true or false
    "enable_ezsecurity_auth": true,
    //time in minutes to store user security info
    "security_cache_time": 120
};



var options = {};
if (env === 'dev') {

} else if (env === 'openshift') {
    options = {
        "log_level": "info", // includes these ["emerg: 0", "alert: 1", "crit: 2", "error: 3", "warning: 4", "notice: 5", "info: 6"],
        "hide_console_logs": true,
        "listen_port": process.env.OPENSHIFT_NODEJS_PORT || 8080,
        "listen_ip": process.env.OPENSHIFT_NODEJS_IP || "localhost"
    }
} else if (env === 'standalone') {
    options = {
        "log_level": "info", // includes these ["emerg: 0", "alert: 1", "crit: 2", "error: 3", "warning: 4", "notice: 5", "info: 6"],
        "hide_console_logs": true,
        "listen_port": 80,
        "listen_ip": '0.0.0.0',
        "enable_ssl_port": true,
        "listen_port_ssl": 443,
        "ssl_key_file": "/opt/kibana3-ezbake/config/ssl/application.priv",
        "ssl_cert_file": "/opt/kibana3-ezbake/config/ssl/application.crt",
        "es_host": "localhost",
        "es_port": 9199,
        "additionalEzConfigurationDirs": [path.join(__dirname,"config")]
    }
}

_.extend(defaults, options);
module.exports = defaults;
