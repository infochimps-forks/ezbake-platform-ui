
# Overview

The UI contains the following functions:

* Searching for a specific URI which will display the corresponding entry in a read-only mode. The user may a) edit the entry's classifications, b) edit the entry's metadata and c) purge the entry.
* Viewing a list of SSR entries that were searched and selected from Global Search. 


# Testing

There are two ways to perform local testing: 1) Using Node.js and 2) Using EzCentos.

### Using Node.js for Testing
The first way to perform local testing is to use Node.js as the http server. This manner is useful when making updates and additions to the UI layout since the calls to service interfaces will not be honored. Instead, mock data is used. To establish this testing scenario, do the following:

1. In the `js/app-module.js` file, set the `wh.isInTestMode` variable to **true**.
1. See the *Deploying to Node.js* section.

### Using EzCentos for Testing
The second way is to deploy the WAR to JBoss on the EzCentos VM. This scenario is more elaborate because it requires that the Chloe server and test sender are also installed on EzCentos. However, this approach interfaces with services as opposed to sending mock data. To establish this testing scenario, do the following:

1. In the `js/app-module.js` file, set the `wh.isInTestMode` variable to **false**.
1. See the *Deploying to JBoss* section.
1. See the *Installing Chloe on EzCentos* section.
1. See the *Running Chloe Server* section.
1. See the *Running Chloe Test Sender* section.


# Deploying to Node.js

1. Download and install [Node.js](http://nodejs.org/download/).

1. Open a terminal and start the node.js server. You will need to start this where the package.json file is located in the project.

    ```
    $ cd ezbake-warehaus/warehaus-web/src/main/webapp
    $ npm start
    ```

1. Go to http://localhost:9000/#/ to see the web page.


# Deploying to JBoss

1. Make sure that EzCentos is installed. See the EzCentos wiki home page for additional information on setting up and running EzCentos.


1. In a terminal window, build the warehaus project and copy the WAR artifact to the your EzCentos home directory.

    ```
    $ cd ezbake-warehaus
    $ mvn -DskipTests install
    $ cp purgeUI/target/purge.war <ezcentos-home>
    ```

1. Open a terminal to manage the EzCentos session. Apply the `vagrant up` command and ssh into vagrant. 

    ```
    $ cd <ezcentos-home>
    $ vagrant up --provision
    $ vagrant ssh
    ```

1. Start JBoss and hot deploy the warehaus WAR by copying it to the deployment directory.

    ```
    $ sudo /vagrant/scripts/ezJBossCli.sh start
    $ sudo cp /vagrant/purge.war /usr/share/jboss-as/standalone/deployments/
    ```

1. Access http://192.168.50.105:8081/purge to see the web page. *Check the IP address and port of your EzCentos configuration since it may differ from the given URL.*


The log is written to the `/usr/share/jboss-as/standalone/server.log` file.

# Installing Chloe on EzCentos

The instructions outline the installation of the Chloe server as well as the Chloe test sender.

### Prerequisites

* [Node.js](http://nodejs.org/download/)
* EzCentos

### Setup Steps

    
1. Create a directory called `node_apps\chloe` in the EzCentos.

    ```
    $ mkdir -p <ezcentos-home>/node_apps/chloe
    ```
    
1. Copy the **chloe-test-sender** files to the node_apps/chloe directory in EzCentos.

    ```
    $ cp -R chloe/chloe-test-sender <ezcentos-home>/node_apps/chloe
    ```

1. Copy the **chloe-server** package to the node_apps/chloe directory in EzCentos.

    ```
    $ cp -R chloe/chloe-server <ezcentos-home>/node_apps/chloe/
    ```

1. Change into the **chloe-server** directory and do a node install to obtain the package modules.

    *Note that you cannot do the `npm install` within the VM because the EzSecurity dependency requires git and git is not supported on the VM.*

    ```
    $ cd <ezcentos-home>/chloe/chloe-server/
    $ npm install
    ```
 
1. Vagrant up and SSH into the EzCentos VM environment. 

    ```
    $ vagrant up
    $ vagrant ssh
    ```

1. Rebuild the Chloe node packages for zookeeper and ursa.

    The zookeeper and ursa modules need to be rebuilt for CentOS. This process requires that you install the `node-gyp` node package and then use it to rebuild the packages.

    ```
    $ sudo npm install -g node-gyp

    $ cd /vagrant/node_apps/chloe/chloe-server/node_modules/ezbakesecurityclient/node_modules/ezDiscovery/node_modules/zookeeper/
    $ sudo node-gyp rebuild

    $ cd /vagrant/node_apps/chloe/chloe-server/node_modules/ursa
    $ sudo node-gyp configure build && node install.js
    ```

# Running Chloe Server

1. Start and SSH into EzCentos.

    ```
    $ cd <ezcentos-home>
    $ vagrant up
    $ vagrant ssh
    ```
    
1. Start Redis.

    Make sure that required services are started: EzSecurity, Redis and Zookeeper. By default, EzCentos starts EzSecurity and Zookeeper. However, you may need to manually start Redis. (Run /vagrant/diagnostics/whats-running.sh for a listing of which services are running.)

    ```
    $ sudo /vagrant/scripts/startRedis.sh
    ```

1. Start the Chloe Server.

    Note that you have to change into the chloe-server directory because a configuration file is accessed in a relative manner.

    ```
    $ cd /vagrant/node_apps/chloe/chloe-server
    $ sudo ./runChloeServer.sh
    ```

# Running Chloe Test Sender


1. Start and SSH into EzCentos.

    ```
    $ cd <ezcentos-home>
    $ vagrant up
    $ vagrant ssh
    ```

1. Change into the **chloe-test-server** directory and start the sender.

    ```
    $ cd /vagrant/node_apps/chloe/chloe-test-sender
    $ node ./scripts/web-server.js 8002
    ```
    
1.  Go to http://192.168.50.105:8002/app/index.html to open the web page.

1.  To open the warehaus page,  pass in the *App Title*, *Channel* and *Chloe URI* form values as URL query parameters *app*, *channel*, *chloeUri*, respectively. For example: http://192.168.50.104:8081/purge/#/gs?app=appTitle&channel=1234567890&chloeUri=ws://192.168.50.105.8001 .



# Libraries

* angular/angular.js               [1.2.16](https://github.com/angular/angular.js/releases/tag/v1.2.16)
* angular/angular-animate.js       [1.2.8](https://github.com/angular/bower-angular-animate/releases/tag/v1.2.8)
* angular/angular-bootstrap.js     [0.11.0](http://angular-ui.github.io/bootstrap/ui-bootstrap-tpls-0.11.0.js)
* angular/angular-mocks.js         [1.2.16](https://github.com/angular/bower-angular-mocks/releases/tag/v1.2.16)
* angular/angular-ui-router.js     [0.2.10](https://github.com/angular-ui/ui-router/releases/tag/0.2.10)
* angular/angular-toaster.js       [0.4.7](https://github.com/jirikavi/AngularJS-Toaster/releases/tag/0.4.7)
* angular/angular-toaster.css      [0.4.7](https://github.com/jirikavi/AngularJS-Toaster/releases/tag/0.4.7)
* bootstrap/dist/js/bootstrap.js   3.1.1
* bootstrap/dist/css/bootstrap.css 3.1.1
* jquery/dist/jquery.js            2.1.1

Instead of using the actual toastr library, the UI is using the an angularjs port of the library.
