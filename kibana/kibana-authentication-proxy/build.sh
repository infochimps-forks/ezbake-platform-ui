#!/bin/bash

vagrant up
vagrant ssh <<EOF
cd /vagrant
npm install
grunt build:rpm
EOF
