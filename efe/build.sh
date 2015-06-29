#!/bin/bash

cwd="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

#set abort on error
set -e

echo -e "\n\n -- Building efe-ui RPMs"
cd $cwd/ui
./build_ezbake_frontendui_rpm.sh
mv *.rpm $cwd/.


echo -e "\n\n -- Building ezbstatic RPMs"
#build ezbstatic RPM
cd $cwd/ezbstatic
./createrpm.sh
mv *.rpm $cwd/.

echo -e "\nDone"
cd $cwd

