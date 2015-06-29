#!/bin/bash

yum -y upgrade
yum groupinstall -y "Development Tools"
yum install -y wget nodejs npm
npm install -g grunt-cli

ssh-keyscan github.com >> /home/vagrant/.ssh/known_hosts
chmod 600 /home/vagrant/.ssh/known_hosts
chown vagrant /home/vagrant/.ssh/known_hosts

echo 'Defaults    env_keep+=SSH_AUTH_SOCK' >> /etc/sudoers.d/agent

mkdir -p /home/vagrant/rpmbuild/{BUILD,SOURCES,RPMS,SRPMS}
chown -R vagrant /home/vagrant/rpmbuild


cd /tmp
wget http://ftp.gnu.org/gnu/autoconf/autoconf-2.69.tar.gz
tar -xzf autoconf-2.69.tar.gz
cd autoconf-2.69
./configure --prefix=/usr
make install
cd ..

tar -xzf automake-1.14.tar.gz
wget http://ftp.gnu.org/gnu/automake/automake-1.14.tar.gz
cd automake-1.14
./configure --prefix=/usr
make install
cd ..

tar -xzf bison-2.5.1.tar.gz
wget http://ftp.gnu.org/gnu/bison/bison-2.5.1.tar.gz
cd bison-2.5.1
./configure --prefix=/usr
make install
cd ..

rm -rf autoconf-2.69*
rm -rf automake-1.14*
rm -rf bison-2.5.1*

git clone https://git-wip-us.apache.org/repos/asf/thrift.git
cd thrift
git checkout 0.9.1
./bootstrap.sh
./configure
make install
