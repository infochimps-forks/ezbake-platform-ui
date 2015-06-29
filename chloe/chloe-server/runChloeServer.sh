#!/bin/bash

set -e

# TODO: Test is root

if [ ! -d /etc/sysconfig/ezbake/ ]; then
	sudo ln -s /opt/ezbake/conf/ /etc/sysconfig/ezbake
fi

# EZCONFIGURATION_DIR=/opt/ezbake/conf
export EZCONFIGURATION_DIR=/vagrant/node_apps/chloe/chloe-server/chloe-configuration
echo "EZCONFIGURATION_DIR = $EZCONFIGURATION_DIR"

if [ "$1" = "--debug" ]; then
	echo "Now starting Chloe server in debug mode..."
	node-debug -p 8081 chloe-server.js 
else
	echo "Now starting Chloe server in non-debug mode..."
	node chloe-server.js -c
fi
