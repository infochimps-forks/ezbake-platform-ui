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

RPM_NAME=ezbake-frontend-ui
VERSION=2.1
RELEASE="${REL_PREFIX}$(date +"%Y%m%d%H%M%S").git.$(git rev-parse --short HEAD)"

SYSUSER=ezfrontendui
SYSGRP=$SYSUSER

CWD=$(pwd)
CONTAINER=container
APP_CONTAINER=$CONTAINER/feui
APP_PATH=$CWD/uiapp
APP_DESTINATION=/opt/ezfrontend-ui

DEPENDENCIES="-d 'ezbake-frontend-static-content = 2.1'"
CONFIG_FILES="--config-files /opt/ezfrontend-ui/authorized_users.yaml"


#run generate binaries with pyinstaller
PYINST_DIR=`mktemp -d $CWD/pyinstaller_XXX`
echo_and_execute_cmd "mkdir -p $PYINST_DIR"
echo_and_execute_cmd "pip install --pre -r $APP_PATH/pyRequirements.pip"
echo_and_execute_cmd "pyinstaller --distpath=$APP_CONTAINER/ --workpath=$PYINST_DIR -y --specpath=$PYINST_DIR --paths=$APP_PATH $APP_PATH/ezfrontendui.py --hidden-import=pkg_resources"
echo_and_execute_cmd "rm -rf $PYINST_DIR"

echo_and_execute_cmd "sudo chmod -R go-rwx $APP_CONTAINER/ezfrontendui"

##create RPM
echo_and_execute_cmd "sudo fpm -s dir -t rpm --rpm-use-file-permissions --rpm-user=$SYSUSER --rpm-group=$SYSGRP --directories=/opt/ezfrontend-ui --vendor=EzBake.IO -n $RPM_NAME -v $VERSION --iteration=$RELEASE $DEPENDENCIES $CONFIG_FILES $APP_CONTAINER/=$APP_DESTINATION $CONTAINER/init.d/=/etc/init.d $CONTAINER/logrotate.d/=/etc/logrotate.d"
