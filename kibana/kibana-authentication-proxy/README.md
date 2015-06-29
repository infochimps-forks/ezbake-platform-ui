kibana Authentication Proxy
============

Hosts a custom version of [kibana3](www.elasticsearch.org/overview/kibana/) and elasticsearch behind EzSecurity with NodeJS and Express.

- A proxy between Elasticsearch, kibana3 and user client
- Support Elasticsearch which protected by basic authentication, only kibana-authentication-proxy knows the user/passwd
- Compatible with the latest kibana3
- Enhanced authentication methods. Now support Google OAuth2, BasicAuth(multiple users supported) and CAS Authentication for the clients
- Per-user kibana index supported. now you can use index kibana-int-userA for user A and kibana-int-userB for user B
- Inspired by and based on [kibana-proxy](https://github.com/hmalphettes/kibana-proxy), most of the proxy libraries were written by them, thanks:)

*We NO LONGER support third-party plugins such as `Bigdesk` or `Head` since it's hard to test and maintain*

Installation
=====
To get started on development you must have ```nodejs 0.10.x``` or higher and ```grunt-cli``` installed globally.

It's just a standard nodejs application, you could install it in the same server with ES, or not. Before run the following commands, please make sure you have [nodejs](http://nodejs.org/) and npm well installed.


```
# git clone https://github.com/fangli/kibana-authentication-proxy
# cd kibana-authentication-proxy/
# git submodule init
# git submodule update
# npm install
# grunt generateThrift

// You may want to update the built-in kibana3 to the latest version, just run
# cd kibana && git checkout master && git pull

// Then edit config.js, make sure you have everything checked in the config file
// and run!
# node app.js
```

Configuration
=============

All settings are placed in /config.js, hack it as you go.

### Elasticsearch backend configurations

- ``es_host``:  *The host of ElasticSearch*
- ``es_port``:  *The port of ElasticSearch*
- ``es_using_ssl``:  *If the ES is using SSL(https)?*
- ``es_username``:  *(optional) The basic authentication user of ES server, leave it blank if no basic auth applied*
- ``es_password``:  *(optional) The password of basic authentication of ES server, leave it blank if no basic auth applied*

### Client settings

- ``listen_port``:  *The listen port of kibana3*
- ``brower_cache_maxage``:  *The browser cache max-Age controll, for a better loading speed*
- ``enable_ssl_port``: *Enable SSL or not?*
- ``listen_port_ssl``: *If enable_ssl_port set to true, this is the port of SSL*
- ``ssl_key_file``: *Point to the ssl key file*
- ``ssl_cert_file``: *Point to the ssl certification file*
- ``kibana_es_index``: *The ES index for saving kibana dashboards, now per-user configurations supported. using %user% instead of the username*
- ``which_auth_type_for_kibana_index``: *Where the variable %user% comes from? which authentication type you want to use for it?*
- ``cookie_secret``: *The secret token for cookies. replace it with a random string for security*

### Client authentication settings

We currently support 4 auth methods: Google OAuth2, BasicAuth and CAS, you can use one of them or all of them. it depends on the configuration you have.

***1. Google OAuth2***

- ``enable_google_oauth``: *Enable or not?*
- ``client_id``:  *The client ID of Google OAuth2, leave empty if you don't want to use it*
- ``client_secret``: *The client secret of Google OAuth2*
- ``allowed_emails``: *An emails list for the authorized users, should like `["a@b.com", "*@b.com", "*"]`*. All google users in the list will be allowed to access kibana.

**Important**

Google OAuth2 needs authorized redirect URIs for your app, please add it first as below, ``http://YOUR-KIBANA-SITE:[listen_port]/auth/google/callback`` in production or ``http://localhost:[listen_port]/auth/google/callback`` for local test

***2. Basic Authentication***

- ``enable_basic_auth``: *Enable or not?*
- ``basic_auth_users``:  *A list of user/passwd, see the comments in config.js for help. leave empty if you won't use it*

***3. CAS Auth***

- ``enable_cas_auth``: *Enable or not?*
- ``cas_server_url``: *Point to the CAS server URL*

***4. EzSecurity
- ``enable_ezsecurity_auth``: *Enable or not?*
- ``security_cache_time``: *Time to store retrieved indexes (Apps) for a user*
- ``use_redis_session``: *Enable the use of Redis Session or not?*
- ``redis_prefix``: *Prefix that the session will use in Redis*

Resources
=========
- The original proxy project of [kibana-proxy](https://github.com/hmalphettes/kibana-proxy)
- Current project kibana-authentication-proxy
- Original [Kibana 3](http://www.elasticsearch.org/overview/kibana/) and [Elasticsearch](https://github.com/elasticsearch/elasticsearch)
- Using Custom Kibana (see kibana fork in Ezbake repo)


License
=======
kibana Authentication Proxy is freely distributable under the terms of the MIT license.

Copyright (c) 2013 Fang Li, Funplus Game

See LICENCE for details.
