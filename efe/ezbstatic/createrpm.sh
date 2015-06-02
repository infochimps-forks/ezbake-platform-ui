#!/bin/bash
fail() {
    echo $1
    exit 1
}

function echo_and_execute_cmd() {
    local cmd=$1
    echo ${cmd}
    eval ${cmd} || fail "Error in running: ${cmd}"
}

REL_PREFIX=""

RPM_NAME=ezbake-frontend-static-content
VERSION=2.1
RELEASE="${REL_PREFIX}$(date +"%Y%m%d%H%M%S").git.$(git rev-parse --short HEAD)"

SYSUSER=ezfrontend
SYSGRP=$SYSUSER

CONTAINER=container
DESTINATION_ROOT=/opt/ezfrontend/static_content
DESTINATION=$DESTINATION_ROOT/ezbstatic


#update bower dependencies
echo_and_execute_cmd "bower update"

#remove excluded files
echo_and_execute_cmd "find ./$CONTAINER -type f \( -name '*.json' -o -name 'README*' -o -name '*.log' -o -name '*.md' \) -print0 | xargs -0 rm -f"

#update permissions
echo_and_execute_cmd "sudo chmod -R ugo-wx,go+r container/*"

#create RPM
echo_and_execute_cmd "sudo fpm -s dir -t rpm --rpm-use-file-permissions --rpm-user=$SYSUSER --rpm-group=$SYSGRP --directories=$DESTINATION_ROOT --vendor=EzBake.IO -n $RPM_NAME -v $VERSION --iteration=$RELEASE $CONTAINER/=$DESTINATION"

