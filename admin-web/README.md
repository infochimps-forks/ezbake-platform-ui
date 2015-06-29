Registration Admin Website
===

Summary
---
This website provides a UI for the administrative functions of the Internal Name Service, Security Registration Service, Group Service, and EzDeployer Service.

It allows admins to register approve registrations and deployments.  By default will not allow the same user that registered an app or staged a deployment to approve those requests.  That can be overriden with `ins.admin.web.admin.self.deploy`.

When a registration is approved, the app is marked as approved with Security Registration and also has the default app groups created in ezGroups.

Dependencies 
---
INS
EzSecurity Service
Security Registration
EzDeployer
EzGroup
EzElastic and ElasticSearch - for INS
Mock Services - for testing/local runs
Local Zookeeper - local testing only if you don't want to install a real zookeeper
Local Accumulo - local testing, makes it easy to use the minicluster with ezbake


Running/Configuration
---
Admin-Web is a java web application.  It should run in any java web container, but gets deployed to JBoss in production.
To run locally, the following properties must be set
```
#if using local accumulo
accumulo.zookeepers
accumulo.instance.name=miniInstance
accumulo.use.mock=false
accumulo.username=root
accumulo.password=strongpassword
#for service discovery
zookeeper.connection.string
#for elasticsearch
elastic.host.name
elastic.port
elastic.cluster.name
#for security service 
ezbake.security.ssl.dir
thrift.use.ssl=false
ezbake.security.client.use.mock=true
ezbake.security.client.mock.target.id=client
ezbake.security.client.mock.user.dn=CN=EzbakeClient, OU=42six, O=CSC, C=US
ezbake.security.server.mock=true
ezbake.security.api.ua.userImpl=ezbake.security.impl.ua.FileUAService
thrift.server.mode=ThreadedPool
storage.backend=local
#for deploying locally
ezDeploy.mode=local
#since Thrift Client Pool will expire connections quicker than it takes to deploy
thrift.pool.abandon.timeout=600
```