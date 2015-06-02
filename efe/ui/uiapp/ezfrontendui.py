from gevent import monkey; monkey.patch_all()
from gevent.pywsgi import WSGIServer
import web
web.config.debug = False
import gevent
import yaml
import sys

from ezbake.configuration.EzConfiguration import EzConfiguration
from ezbake.configuration.helpers import ZookeeperConfiguration, SystemConfiguration
from ezbake.configuration.loaders.PropertiesConfigurationLoader import PropertiesConfigurationLoader
from ezbake.configuration.loaders.DirectoryConfigurationLoader import DirectoryConfigurationLoader
from ezbake.configuration.security.CryptoImplementations import SharedSecretTextCryptoImplementation
from ezbake.discovery import ServiceDiscoveryClient

from ezbake.base.thriftapi import EzBakeBaseService
from ezbake.reverseproxy.thriftapi import EzReverseProxy
from ezbake.reverseproxy.thriftapi.ttypes import *
from ezbake.reverseproxy.thriftapi.constants import SERVICE_NAME as EzFrontendServiceName
from ezbake.frontend.thriftapi import EzFrontendService
from ezbake.frontend.thriftapi.ttypes import ServerCertInfo, EzFrontendCertException
from ezbake.thrift.transport.EzSSLSocket import TSSLSocket

from thrift import Thrift
from thrift.transport import TSocket, TTransport
from thrift.protocol import TBinaryProtocol

import urllib
from netifaces import interfaces, ifaddresses, AF_INET
import os
import re
import signal
import socket
from random import choice, shuffle
import logging
import time
from socketio import socketio_manage
from socketio.server import SocketIOServer
from socketio.namespace import BaseNamespace
from socketio.mixins import BroadcastMixin
import json
from collections import (defaultdict)
from base64 import urlsafe_b64encode, urlsafe_b64decode

logger = logging.getLogger('efe-ui_control')
logger.setLevel(logging.INFO)

TEMPLATES_DIR = './html'

zkConfig = None
gState = None
tt_verify = r"_Ez_EFE"

formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
sh = logging.StreamHandler()
sh.setLevel(logging.INFO)
sh.setFormatter(formatter)
logger.addHandler(sh)

current_milli_time = lambda: int(round(time.time() * 1000))
get_registration_server = lambda reg: reg.UserFacingUrlPrefix.split('/')[0].strip()
get_registration_location = lambda reg: '/' + reg.UpstreamHostAndPort.partition('/')[2].strip()
get_registration_upstream = lambda reg: tuple(reg.UpstreamHostAndPort.split(':'))
get_registration_upstream_path = lambda reg: reg.UpstreamPath.strip()
is_path_registered  = lambda reglist, path: len([ reg.UserFacingUrlPrefix for reg in reglist if re.search(path, reg.UserFacingUrlPrefix)])
space = lambda : '&nbsp;'
ellipsis = lambda: '<div class="login-icon icon-rotate"><span aria-hidden="true" class="ezbicon-ellipsis"></span></div>'
ellipsis_link = lambda div: """<a href="javascript:ToggleContent('{div}')">{ellipsis}</a>""".format(div=div, ellipsis=ellipsis())

def buildUrlPrefix(config, base):
    if len(config['FullUserFacingUrl']) > 0:
        ufup = config['FullUserFacingUrl']
        if '/' not in ufup:
            ufup += '/'
        return ufup

    if len(config['UserFacingUrlPrefix']) > 0:
        prefix = config['UserFacingUrlPrefix']+'.'
    else:
        prefix = ''
    ufup = prefix+base+'/'+config['UserFacingUrlSuffix']
    return ufup


class GlobalState(object):
    def __init__(self):
        self.url=''
        self.runningServerConfigurations = {}
        self.mainserver = None
        self.internalhostname = None
        self.socket_resource_path = []
        self.serverConfigurations = {}
        self.testServerConfigurations = {}

        try:
            with (open('ezconfiguration.yaml')) as ssl_config_file:
                ssl_config = yaml.safe_load(ssl_config_file)
                self.configOverrideDir = ssl_config['override_props_dir']
                self.keyfile=os.path.join(ssl_config['ssldir'],'application.priv')
                self.certfile=os.path.join(ssl_config['ssldir'],'application.crt')
                self.ca_certs=os.path.join(ssl_config['ssldir'],'ezbakeca.crt')
                self.ezbakesecurityservice_pub=os.path.join(ssl_config['ssldir'],'ezbakesecurityservice.pub')
        except Exception:
            logger.exception("Exception in loading ezconfiguration.yaml")
            raise RuntimeError("Unable to load ezconfiguration.yaml file")


class WSGILog(object):

    def __init__(self):
        self.log = logger

    def write(self, string):
        self.log.info(string.rstrip("\n"))

def getFirstExposedInterface():
    for ifaceName in interfaces():
        addresses = [i['addr'] for i in ifaddresses(ifaceName).setdefault(AF_INET, [{'addr':'No IP addr'}] )]
        for address in addresses:
            if not address.startswith('127'):
                return address

def getEfeServers():
    rtn = []
    ezd = ServiceDiscoveryClient(zkConfig.getZookeeperConnectionString())
    for endpoint in ezd.get_endpoints('EzBakeFrontend', EzFrontendServiceName):
        name,port = endpoint.split(':',1)
        rtn.append((name,port))
    return rtn


def getEfeClient():
    servers = getEfeServers()
    shuffle(servers)
    client = None

    #try all available servers
    for host, port in servers:
        try:
            socket = TSSLSocket(host=host, port=int(port), ca_certs=gState.ca_certs, cert=gState.certfile, key=gState.keyfile, verify_pattern=tt_verify)
            client = EzFrontendService.Client(TBinaryProtocol.TBinaryProtocol(TTransport.TBufferedTransport(socket)))
            client._iprot.trans.open()
            logger.info('Connected to Efe: %s:%d' % (host, int(port)))
            break
        except Exception as ex:
            logger.warn('Error in connecting to %s:%d - %s' % (host, int(port), str(ex)))
            client = None

    if client is None:
        raise RuntimeError('Could not establish a thrift connection to Efe client. Exhausted all available servers %s' % str(servers))
    return client


def returnEfeClient(client):
    if isinstance(client, EzBakeBaseService.Client):
        try:
            client._iprot.trans.close()
        except Exception as ex:
            logger.warn('Exception in closing returned Efe client: %s', str(ex))
    del client


def htmlprint(dictObj, indent=0):
    p=[]
    p.append('<ul>\n')
    for k,v in dictObj.iteritems():
        if isinstance(v, dict):
            p.append('<li>'+ str(k)+ ':')
            p.append(printitems(v))
            p.append('</li>')
        else:
            p.append('<li>'+ str(k)+ ':&nbsp;'+ str(v)+ '</li>')
    p.append('</ul>\n')
    return '\n'.join(p)


def startServer(configurationNumber):
    if configurationNumber not in gState.runningServerConfigurations:
        current = gState.testServerConfigurations[configurationNumber]

        resource=[]
        if current.get('isWebSocket'):
            urls = ('/'+current['UpstreamPath']+'/','hello',
                    '/'+current['UpstreamPath']+'/upload','upload',
                    '/'+current['UpstreamPath']+'/wstest','loadWSClientPage',
                    '/'+current['UpstreamPath']+'/socket.io/(.*)','webSocket',
                    '/'+current['UpstreamPath']+'/socket.io.js','sendjs'
                    )
            resource.append(current['UpstreamPath']+'/')
            gState.socket_resource_path.append(current['UpstreamPath'])
        else:
            urls = ('/'+current['UpstreamPath']+'/','hello',
                    '/'+current['UpstreamPath']+'/upload','upload',)

        resource.append('socket.io')
        socket_io_resource = ''.join(resource)
        app = web.application(urls, globals()).wsgifunc()
        wsgifunc = app

        if current.get('validateUpstreamConnection'):
            cert_regs = gevent.ssl.CERT_REQUIRED
        else:
            cert_regs = gevent.ssl.CERT_OPTIONAL

        logger.info('Starting server with configuration {config_number} for AppName "{app_name}" with full SSL validation'.format(config_number=str(configurationNumber), app_name= current.get('AppName')))
        runningserver = SocketIOServer((gState.internalhostname, current['UpstreamPort']), wsgifunc,
                                           keyfile=gState.keyfile, certfile=gState.certfile, ca_certs=gState.ca_certs, cert_reqs=cert_regs,
                                           log=WSGILog(), resource=socket_io_resource, policy_server=False)

        gState.runningServerConfigurations[configurationNumber] = runningserver
        runningserver.serve_forever()
        gState.runningServerConfigurations.pop(configurationNumber, None)
        logger.info('starting test server with configuration{0}'.format(str(configurationNumber)))
    
def stopServer(configurationNumber):
    if configurationNumber in gState.runningServerConfigurations:
        current = gState.testServerConfigurations[configurationNumber]
        if gState.socket_resource_path:
            if current['UpstreamPath'] in gState.socket_resource_path:
                gState.socket_resource_path.remove(current['UpstreamPath'])
        gState.runningServerConfigurations[configurationNumber].stop()

def buildRegistration(configuration):
    if 'UpstreamHost' in configuration:
        uhp = configuration['UpstreamHost']+':'+str(configuration['UpstreamPort'])
    else:
        uhp = gState.internalhostname +':'+str(configuration['UpstreamPort'])

    registration = UpstreamServerRegistration(UserFacingUrlPrefix=buildUrlPrefix(configuration, gState.url),
                                              AppName=configuration.get('AppName'),
                                              UpstreamHostAndPort=uhp,
                                              UpstreamPath=configuration.get('UpstreamPath')+'/',
                                              timeout=configuration.get('timeout', 10),
                                              timeoutTries=configuration.get('timeoutTries', 3),
                                              uploadFileSize=configuration.get('uploadFileSize', 2),
                                              sticky=configuration.get('sticky', False),
                                              disableChunkedTransferEncoding=configuration.get('disableChunkedTransferEncoding', False),
                                              validateUpstreamConnection=configuration.get('validateUpstreamConnection', False),
                                              contentServiceType=configuration.get('ContentService', ContentServiceType.DYNAMIC_ONLY))
    return registration

def registerServer(configuration,host,port):
    try:
        socket = TSSLSocket(host=host, port=port, ca_certs=gState.ca_certs, cert=gState.certfile, key=gState.keyfile, verify_pattern=tt_verify)
        transport = TTransport.TBufferedTransport(socket)
        protocol = TBinaryProtocol.TBinaryProtocol(transport)
        client = EzReverseProxy.Client(protocol)
        transport.open()
        registration = buildRegistration(configuration)
        client.addUpstreamServerRegistration(registration)
        transport.close()
    except Exception as e:
        logger.exception('Exception in registering server: {0}'.format(str(e)))

def deregisterServer(deregistration,host,port):
    try:
        socket = TSSLSocket(host=host, port=port, ca_certs=gState.ca_certs, cert=gState.certfile, key=gState.keyfile, verify_pattern=tt_verify)
        transport = TTransport.TBufferedTransport(socket)
        protocol = TBinaryProtocol.TBinaryProtocol(transport)
        client = EzReverseProxy.Client(protocol)
        transport.open()
        client.removeUpstreamServerRegistration(deregistration)
        transport.close()
    except Exception as e:
        logger.exception('Exception in deregistering server: {0}'.format(str(e)))

def registerSelf():
    logger.info("registering with Efe")
    client = getEfeClient()
    registration = UpstreamServerRegistration(UserFacingUrlPrefix=gState.url+'/ezfrontend/', AppName='ezfrontend', UpstreamHostAndPort=gState.internalhostname+':'+str(gState.port), UpstreamPath="ezfrontend/", timeout=10, timeoutTries=3, uploadFileSize=256, sticky=True, authOperations=set([AuthorizationOperation.USER_INFO, AuthorizationOperation.USER_JSON]), validateUpstreamConnection=False)
    client.addUpstreamServerRegistration(registration)
    returnEfeClient(client)
    logger.info("registered with Efe")

def deregisterSelf():
    logger.info("deregistering with Efe")
    client = getEfeClient()
    registration = UpstreamServerRegistration(UserFacingUrlPrefix=gState.url+'/ezfrontend/', AppName='ezfrontend', UpstreamHostAndPort=gState.internalhostname+':'+str(gState.port), UpstreamPath="ezfrontend/", timeout=10, timeoutTries=3, uploadFileSize=256, sticky=True, authOperations=set([AuthorizationOperation.USER_INFO, AuthorizationOperation.USER_JSON]),validateUpstreamConnection=False)
    client.removeUpstreamServerRegistration(registration)
    returnEfeClient(client)
    logger.info("deregistered with Efe")

def deregisterServerFromConfig(config,host,port):
    deregistration = buildRegistration(config)
    deregisterServer(deregistration,host,port)

def removeReverseProxiedPath(path,host,port):
    socket = TSSLSocket(host=host, port=port, ca_certs=gState.ca_certs, cert=gState.certfile, key=gState.keyfile, verify_pattern=tt_verify)
    transport = TTransport.TBufferedTransport(socket)
    protocol = TBinaryProtocol.TBinaryProtocol(transport)
    client = EzReverseProxy.Client(protocol)
    transport.open()
    client.removeReverseProxiedPath(path)
    transport.close()

def removeReverseProxiedPathFromConfig(config,host,port):
    path = buildUrlPrefix(config,gState.url)
    removeReverseProxiedPath(path,host,port)

def isUpstreamServerRegistered(config,host,port): #UpstreamServerRegistration
    socket = TSSLSocket(host=host, port=int(port), ca_certs=gState.ca_certs, cert=gState.certfile, key=gState.keyfile, verify_pattern=tt_verify)
    transport = TTransport.TBufferedTransport(socket)
    protocol = TBinaryProtocol.TBinaryProtocol(transport)
    client = EzReverseProxy.Client(protocol)
    transport.open()
    registration = buildRegistration(config)
    rtn = client.isUpstreamServerRegistered(registration)
    transport.close()
    return rtn

def isReverseProxiedPathRegistered(config,host,port): #string
    socket = TSSLSocket(host=host, port=int(port), ca_certs=gState.ca_certs, cert=gState.certfile, key=gState.keyfile, verify_pattern=tt_verify)
    transport = TTransport.TBufferedTransport(socket)
    protocol = TBinaryProtocol.TBinaryProtocol(transport)
    client = EzReverseProxy.Client(protocol)
    transport.open()
    rtn = client.isReverseProxiedPathRegistered(buildUrlPrefix(config,gState.url))
    transport.close()
    return rtn

def isEfeHealthy(host,port):
    try:
        socket = TSSLSocket(host=host, port=int(port), ca_certs=gState.ca_certs, cert=gState.certfile, key=gState.keyfile, verify_pattern=tt_verify)
        transport = TTransport.TBufferedTransport(socket)
        protocol = TBinaryProtocol.TBinaryProtocol(transport)
        client = EzReverseProxy.Client(protocol)
        transport.open()
        return client.ping()
    except TTransport.TTransportException as ex:
        return False

def pingNoSSL(host,port):
    socket = TSocket.TSocket(host,port)
    transport = TTransport.TBufferedTransport(socket)
    protocol = TBinaryProtocol.TBinaryProtocol(transport)
    client = EzReverseProxy.Client(protocol)
    transport.open()
    try:
        client.ping()
    except:
        print "ping w/out ssl failed as expected"

def getAllUpstreamServerRegistrations(host,port):
    socket = TSSLSocket(host=host, port=int(port), ca_certs=gState.ca_certs, cert=gState.certfile, key=gState.keyfile, verify_pattern=tt_verify)
    transport = TTransport.TBufferedTransport(socket)
    protocol = TBinaryProtocol.TBinaryProtocol(transport)
    client = EzReverseProxy.Client(protocol)
    transport.open()
    rtn = client.getAllUpstreamServerRegistrations()
    transport.close()
    return rtn

def removeCertsForHosts(hosts):
    if not hosts:
        return

    feClient = getEfeClient()

    for host in hosts:
        if feClient.isServerCertPresent(host):
            try:
                feClient.removeServerCerts(host)
                logger.info("Deleted Cert and Key hostname=%s", host)
            except EzFrontendCertException:
                logger.exception("Exception in deleting server cert for host %s", host)
    returnEfeClient(feClient)

class BasePage(object):
    """
    Base class for all pages
    """

    def __init__(self):
        self.title = "Frontend"
        self.cssfiles = []
        self.userDN = '--'
        self.userCN = 'Unknown'
        self.userJson = ''
        self.content = []

    def render(self):
        return web.template.render(TEMPLATES_DIR).base_page(''.join(self.content),
                                                            self.title, 
                                                            self.cssfiles,
                                                            self.userCN)

    def getUserInfoHeader(self):
        user_info = web.ctx.env.get('HTTP_EZB_VERIFIED_USER_INFO')
        user_info_signature = web.ctx.env.get('HTTP_EZB_VERIFIED_SIGNATURE')

        if not user_info or not user_info_signature:
            logger.error("unauthorized access attempt. EZB User Info headers not sent")
            raise ValueError('EZB User Info headers not sent')

        if not verify_sign(gState.ezbakesecurityservice_pub, user_info_signature, user_info):
            logger.error("unauthorized access (EZB User Info signature mismatch)")
            raise ValueError('EZB User Info signature mismatch')

        return user_info

    def getUserJsonHeader(self):
        user_json = web.ctx.env.get('HTTP_EZB_USER_INFO_JSON')
        user_json_signature = web.ctx.env.get('HTTP_EZB_USER_INFO_JSON_SIGNATURE')

        if not user_json or not user_json_signature:
            logger.error("unauthorized access attempt. EZB User Json headers not sent")
            raise ValueError('EZB User Json headers not sent')

        if not verify_sign(gState.ezbakesecurityservice_pub, user_json_signature, user_json):
            logger.error("unauthorized access (EZB User Json signature mismatch)")
            raise ValueError('EZB User Json signature mismatch')

        return user_json

    def validateUser(self, authorize=True):
        try:
            proxyToken = json.loads(self.getUserInfoHeader())
            tokenExpiration = int(proxyToken.get('notAfter'))
            
            if  current_milli_time() > tokenExpiration:
                raise ValueError('ezb proxy token token has expired: %i' % tokenExpiration)

            self.userDN = proxyToken.get('x509').get('subject')
            self.userCN = getCn(self.userDN)

            if authorize:
                self.userJson = self.getUserJsonHeader()
                if not (isUserAuthroized(self.userCN, self.userJson) or validateCn(self.userCN)):
                    raise ValueError('attempt by user with CN: %s\nUserJson: %s', self.userCN, self.userJson)

        except AttributeError:
            raise ValueError('unable to parse proxy token json string')
        except ValueError as ex:
            logger.error('Unauthorized access - %s', str(ex))
            raise web.unauthorized()
        
    def GET(self, _=None):
        logger.debug('GET request: %s%s', web.ctx.home, web.ctx.query)
        self.validateUser()
        
    def POST(self, _=None):
        logger.debug('POST request: %s%s', web.ctx.home, web.ctx.query)
        self.validateUser()

class ActionPage(BasePage):
    def __init__(self):
        super(ActionPage, self).__init__()

    def GET(self, name=None):
        super(ActionPage, self).POST(name)
        self.content.append('<div id="UserJson" style="display:none;">' + self.userJson + '</div>')
        self.content.append('<a href="/ezfrontend/control/"><div class="btn blue-btn">main page</div></a>')
        self.content.append('<div class="divider"></div>')

    def POST(self, name=None):
        super(ActionPage, self).POST(name)


def WANotFound():
    """
    Not found handler
    """
    page = BasePage()
    page.validateUser(authorize=False)
    return web.notfound(web.template.render(TEMPLATES_DIR).notfound(page.userCN))

class efestate(ActionPage):
    def __init__(self):
        super(efestate, self).__init__()
        #self.title = self.title + ' - State'

    def GET(self, name=None):
        super(efestate, self).GET(name)
        logger.info('%s accessed by {%s}', self.__class__.__name__, self.userDN)

        self.title = self.title + ' - {0} State'.format(name)

        host, port = name.split(':',1)

        if (host, port) not in getEfeServers():
            self.content.append('<div class="message error-message">EFE %s:%s not found</div>' % (host, port))
        else:
            registrations = []
            try:
                registrations =  getAllUpstreamServerRegistrations(host,int(port))
            except RuntimeError as ex:
                logger.warn('Unable to get all upstream server registrations from %s:%d - %s', host, int(port), str(ex))
                self.content.append('<div class="message error-message">Unable to get all upstream server registrations from %s:%d</div>' % (host, int(port)))
                return self.render()

            for registration in registrations:
                url = registration.UserFacingUrlPrefix
                registration_var = ['<div class="card shadow1">',
                                    '<ul>',
                                    '   <li>URL:&nbsp;<a href="https://{url}">https://{url}/a></li>'.format(url=url),
                                    '   <li>UpstreamHostAndPort:&nbsp;{ushp}</li>'.format(ushp=registration.UpstreamHostAndPort),
                                    '   <li>AppName:&nbsp;{appname}</li>'.format(appname=registration.AppName),
                                    '   <li>timeout:&nbsp;{timeout}</li>'.format(timeout=registration.timeout),
                                    '   <li>timeoutTries:&nbsp;{tries}</li>'.format(tries=registration.timeoutTries),
                                    '   <li>uploadFileSize:&nbsp;{filesize}</li>'.format(filesize=registration.uploadFileSize),
                                    '   <li>sticky:&nbsp;{sticky}</li>'.format(sticky=str(registration.sticky)),
                                    '   <li>disableChunkedTransferEncoding:&nbsp;{chunked}</li>'.format(chunked=str(registration.disableChunkedTransferEncoding)),
                                    '   <li>UpstreamPath:&nbsp;{usp}</li>'.format(usp=registration.UpstreamPath),
                                    '   <li>UserFacingUrlPrefix:&nbsp;{url}</li>'.format(url=url),
                                    '</ul>',
                                    '<form action="/ezfrontend/efestate/" method="post">',
                                    '   <a href="javascript:<a href="javascript:;" onclick="parentNode.submit();">',
                                    '   <div class="btn red-btn">Deregister Instance</div> </a>',
                                    '   <input type="hidden" name="deregister"',
                                    '   value="{host}|{port}|{url}|{appname}|{ushp}|{uspath}"/></form>'.format(host=host, port=port, url=url, appname=registration.AppName, ushp=registration.UpstreamHostAndPort, uspath=registration.UpstreamPath),
                                    '<form action="/ezfrontend/efestate/" method="post">',
                                    '   <a href="javascript:<a href="javascript:;" onclick="parentNode.submit();">',
                                    '   <div class="btn red-btn">Remove Path / All Instances</div> </a>',
                                    '   <input type="hidden" name="removeReverseProxiedPath"',
                                    '   value="{host}|{port}|{url}"/></form>'.format(host=host, port=port, url=url),
                                    '</div>']
                self.content.extend(registration_var)

        return self.render()


    def POST(self, name=None):
        super(efestate, self).GET(name)
        logger.info('%s accessed by {%s}', self.__class__.__name__, self.userDN)

        referer = web.ctx.env.get('HTTP_REFERER')

        data = urllib.unquote(web.data()).decode('utf8')
        action, tmp = data.split('=', 1)

        if '|' not in tmp:
            logger.error("ERROR - bad post data from user {%s} to page efestate. Data logged above", self.userDN)
            raise web.BadRequest()

        if action == 'deregister':
            logger.info("{%s} Deregistering %s", self.userDN, data)
            host, port, ufup, an, uhp, up = tmp.split('|', 5)
            registration = UpstreamServerRegistration(UserFacingUrlPrefix=ufup, AppName=an, UpstreamHostAndPort=uhp, UpstreamPath=up, timeout=10, timeoutTries=3, uploadFileSize=256, sticky=True)
            deregisterServer(registration, host, int(port))
        elif action == 'removeReverseProxiedPath':
            logger.info("{%s} Deregistering reverse proxied path %s", self.userDN, data)
            host, port, path = tmp.split('|', 2)
            removeReverseProxiedPath(path, host, int(port))
        else:
            logger.info('{%s} - bad post. Reason: unsupported action (%s)', self.userDN, str(action))
            raise web.BadRequest()
        raise web.seeother(referer)

def isEfeServersSynchronized(serverlist=None):
    """
    For all the servers in the serverlist, get the registrations and
    check if they match.
    serverlist is a list of tuples [(host1, port2),(host2, port2)..]
    """
    if not serverlist:
        return False

    # If one healthy server registered. it's already synchronized
    if len(serverlist) > 1:
        # Get the registration of the first EFE
        host, port = serverlist[0]
        regfirst = sorted(getAllUpstreamServerRegistrations(host, port), key=lambda reg: (str(reg.UserFacingUrlPrefix), str(reg.UpstreamPath), str(reg.UpstreamHostAndPort)))
        # Compare it with the reset of the EFEs
        for host, port in serverlist[1:]:
            regcurrent = sorted(getAllUpstreamServerRegistrations(host, port), key=lambda reg: (str(reg.UserFacingUrlPrefix), str(reg.UpstreamPath), str(reg.UpstreamHostAndPort)))
            # Current EFE is not matched yet with first EFE
            if not len(regfirst) == len(regcurrent):
                # If number of registration does not match, it is not synchronized
                return False
            # Compare all upstream registration
            for count, _ in enumerate(regcurrent):
                # Check the content by checking if they have equal instance
                # dictionaries
                if not regfirst[count].__dict__ == regcurrent[count].__dict__:
                    return False
    return True

def add_elllipsis(html_var, count, div_name, msg_type, message):
    html_var.append('<div class="message {msg_type}">{ellipsis}{count} {msg}'.format(msg_type=msg_type, count=count, ellipsis=ellipsis_link(div_name), msg=message))
    html_var.append('<div id="{div}" style="display:none;">'.format(div=div_name))

class control(BasePage):

    def __init__(self):
        super(control, self).__init__()
        self.title = self.title + ' - Control'

    def GET(self, name=None):
        super(control, self).GET(name)
        logger.info('%s accessed by {%s}', self.__class__.__name__, self.userDN)

        html_var = ['<div id="UserJson" style="display:none;">',
                    self.userJson,
                    '</div>',
                    '<div>',
                    '<h3>Front Ends:</h3>'
                    ]

        # Create a list of registered efes
        registered_efe =[(host, int(port)) for host, port in getEfeServers()]

        # Check if you can ping
        healthy_efe = []
        nhealthy_efe = []
        for host, port in registered_efe:
            if isEfeHealthy(host, port):
                healthy_efe.append((host, port))
            else:
                nhealthy_efe.append((host, port))

        # Check if they are synchronized
        synced = isEfeServersSynchronized(serverlist=healthy_efe)

        if healthy_efe:
           if synced:
                # Display in GREEN
                add_elllipsis(html_var, len(healthy_efe), 'div_sync', 'success-message', 'EFE Healthy')

                # Display the servers in columns
                for count, (host, port) in enumerate(healthy_efe):
                    if count % 4 == 0:
                        html_var.append('<div class="col4-set">')
                    html_var.append('<div class="col-{count}"><a href="/ezfrontend/efestate/{host}:{port}">{host}:{port}</a></div>'.format(count=(count + 1) % 4, host=host, port=port))
                    if (count + 1) % 4 == 0 or (count + 1) == len(healthy_efe):
                        html_var.append('</div>')
                html_var.append('</div>')  # for div_sync
                html_var.append('</div>')  # for success-message

           else:
                # Display in RED
                add_elllipsis(html_var, len(healthy_efe), 'div_notsync', 'error-message', 'EFE not Syncronized')

                # Display the servers in columns
                for count, (host, port) in enumerate(healthy_efe):
                    if count % 4 == 0:
                        html_var.append('<div class="col4-set">')
                    html_var.append('<div class="col-{count}"><a href="/ezfrontend/efestate/{host}:{port}">{host}:{port}</a></div>'.format(count=(count + 1) % 4, host=host, port=port))
                    if (count + 1) % 4 == 0 or (count + 1) == len(healthy_efe):
                        html_var.append('</div>')
                html_var.append('</div>')  # for div_notsync
                html_var.append('</div>')  # for success-message

        if nhealthy_efe:
            # Display in ORANGE
            add_elllipsis(html_var, len(nhealthy_efe), 'div_uhealthy', 'system-message', 'EFE not Healthy')

            # Display the servers in columns
            for count, (host, port) in enumerate(nhealthy_efe):
                if count % 4 == 0:
                    html_var.append('<div class="col4-set">')
                html_var.append('<div class="col-{count}">{host}:{port}</div>'.format(count=(count + 1) % 4, host=host, port=port))
                if (count + 1) % 4 == 0 or (count + 1) == len(nhealthy_efe):
                    html_var.append('</div>')
            html_var.append('</div>')  # for div_notsync
            html_var.append('</div>')  # for system-message

        links_to_pages = ['<div class="col4-set">',
                          '<div class="col-1"><a href="/ezfrontend/manage/"><div class="btn blue-btn">Manage Certificates</div></a></div>',
                          '<div class="col-2"><a href="#"><div class="btn gray-btn">Manage Static Contents</div></a></div>',
                          '<div class="col-3"><a href="/ezfrontend/upstreams/"><div class="btn blue-btn">View Registrations</div></a></div>',
                          '<div class="col-4"><a href="/ezfrontend/register/"><div class="btn blue-btn">Register an instance</div></a></div>',
                          '</div>'
                          ]

        divider = ['<div class="divider"></div>']
        self.content.append(''.join(html_var + divider + links_to_pages))
        return self.render()

'''
Class to manage certificates
'''
class manage(ActionPage):
    def __init__(self):
        super(manage, self).__init__()
        self.title = self.title + ' - Manage Certificates'

    def GET(self, name=None):
        super(manage, self).GET(name)
        logger.info('%s accessed by {%s}', self.__class__.__name__, self.userDN)
        message = ''

        if name:
            msg = urlsafe_b64decode(str(name))
            status = dict()
            status[str(msg.split('|')[0])] = msg.split('|')[1:]
            if 'NOK' in status:
                message = '<div class="message error-message">{errmsg}</div>'.format(errmsg=''.join(status['NOK']))
            if 'OK' in status:
                message = '<div class="message success-message">{errmsg}</div>'.format(errmsg=''.join(status['OK']))

        rtn_upl = []
        rtn_del = []
        upload_servers = defaultdict(list)
        delete_servers = defaultdict(list)
        path = web.ctx.env['PATH_INFO'].strip('/')

        efeClient = getEfeClient()
        registrations = efeClient.getAllUpstreamServerRegistrations()

        for reg in registrations:
            #map registrations to host_name
            serverName = get_registration_server(reg)
            host_name, _ = get_registration_upstream(reg)
            if serverName:
                #if we have a specified user facing server name, use that instead
                host_name = serverName

            if efeClient.isServerCertPresent(host_name):
                delete_servers[host_name].append(reg)
            else:
                upload_servers[host_name].append(reg)
             
        if upload_servers:
            card_start = ['<div class="card shadow3">',
                          '<form action="/ezfrontend/uploadcert" method="post" enctype="multipart/form-data">'
                          ]
            for server, registrations in upload_servers.iteritems():
                server_name = 'Server: {server}'.format(server=server)
                divider = '<div class="divider"></div>'
                loc_lst =[]
                # Get all the locations for this server
                for reg in registrations:
                    path = get_registration_upstream_path(reg)
                    upstream_host, upstream_port = get_registration_upstream(reg)
                    loc_lst.append('{path}&nbsp;=>&nbsp;{upstream_host}:{upstream_port}'.format(path=path, upstream_host=upstream_host, upstream_port=upstream_port))

                more = '<div id="div_more_upload" style="display:none;">{{{usinfo}}}</div>'.format(usinfo=',&nbsp;'.join(loc_lst))
                file_upload_button =['<label for="type">Certificate</label>',
                                     '<span>',
                                     '  <div class="fileUpload btn file-btn">',
                                     '  <span>Choose File</span>',
                                     '  <input id="certBtn" type="file" class="upload" name="upload_cert:{server}">'.format(server=server),
                                     '  </div>',
                                     '  <input id="uploadCert" placeholder="Choose Certificate file" disabled="disabled" class="transparent half inline">',
                                     '</span>',
                                     '<label for="type">Key</label>',
                                     '<span>',
                                     '  <div class="fileUpload btn file-btn">',
                                     '  <span>Choose File</span>',
                                     '  <input id="keyBtn" type="file" class="upload" name="upload_key:{server}">'.format(server=server),
                                     ' </div>',
                                     '  <input id="uploadKey" placeholder="Choose Key file" disabled="disabled" class="transparent half inline">',
                                     '</span>',
                                     '<script type="text/javascript">',
                                     '     document.getElementById("certBtn").onchange = function () {',
                                     '           document.getElementById("uploadCert").value = this.value;',
                                     ' };',
                                     '     document.getElementById("keyBtn").onchange = function () {',
                                     '           document.getElementById("uploadKey").value = this.value;',
                                     ' };',
                                     '</script>'
                                    ]
                upload_button=['<div><input type="submit" class="btn file-upload-btn" value="Upload"></div>',
                               '</form>'
                               ]
                rtn_upl.extend('{card_start}{ellipsis}{server}{more}{divider}{cert}{card_end}{upload}'.format(card_start=''.join(card_start),
                                                                                                              ellipsis=ellipsis_link('div_more_upload'),
                                                                                                              server=server_name,
                                                                                                              more=more,
                                                                                                              cert=''.join(file_upload_button),
                                                                                                              upload=''.join(upload_button),
                                                                                                              divider=divider,
                                                                                                              card_end='</div>'))

        if delete_servers:
            card_start = ['<div class="card shadow3">',
                          '<form action="/ezfrontend/deletecert" method="post" enctype="multipart/form-data">',
                          ]
            for server, registrations in delete_servers.iteritems():
                server_name = 'Server: {server}'.format(server=server)
                divider = '<div class="divider"></div>'
                loc_lst =[]
                for reg in registrations:
                     path = get_registration_upstream_path(reg)
                     upstream_host, upstream_port = get_registration_upstream(reg)
                     loc_lst.append('{path}&nbsp;=>&nbsp;{upstream_host}:{upstream_port}'.format(path=path, upstream_host=upstream_host, upstream_port=upstream_port))
        
                more = '<div id="div_more_delete" style="display:none;">{{{usinfo}}}</div>'.format(usinfo=',&nbsp;'.join(loc_lst))
                delete_list = ['<span>',
                               ' <input type="checkbox" class="regular-checkbox" id="checkboxdel" name="delete_:{server}" value="True"><label for="checkboxdel"></label>'.format(server=server),
                               ' <div class="tag">Select to delete Certificate and key</div>',
                               '</span>'
                               ]
        
                delete_button=['<div><input type="submit" class="btn file-delete-btn" value="Delete"></div>',
                               '</form>'
                               ]
        
                rtn_del.extend('{card_start}{ellipsis}{server}{more}{divider}{delist}{card_end}{delete}'.format(card_start=''.join(card_start),
                                                                                                                ellipsis=ellipsis_link('div_more_delete'),
                                                                                                                server=server_name,
                                                                                                                more=more,
                                                                                                                delist=''.join(delete_list),
                                                                                                                delete=''.join(delete_button),
                                                                                                                divider=divider,
                                                                                                                card_end='</div>'))

        
        returnEfeClient(efeClient)

        # Display status message if any
        self.content.extend(message)
        if rtn_upl:
            self.content.extend('<h3>Update Certificates:</h3>')
            self.content.extend(rtn_upl)
            if rtn_del:
                # divider between Update and delete
                self.content.append('<div class="divider"></div>')
        if rtn_del:
            self.content.extend('<h3>Remove Certificates:</h3>')
            self.content.extend(rtn_del)

        return self.render()

    def POST(self, name=None):
        super(manage, self).POST(name)
        return


class uploadCerts:
    '''
    Upload cert and key of host(s)
    '''
    def POST(self):
        redirect = '/ezfrontend/manage/'
        form = web.input()

        serverCerts = defaultdict(dict)

        for k, v in form.iteritems():
            if not (k.startswith('upload_') and len(str(v)) > 0):
                continue

            cert_type, host_name = k.split(':')[0], k.split(':')[1]

            if 'cert' in cert_type:
                serverCerts[host_name]['crt'] = str(v)
            else:
                serverCerts[host_name]['key'] = str(v)

        if serverCerts:
            feClient = getEfeClient()

            #save certs to database and update zookeeper
            status='OK'
            rtn=[]
            for server, certData in serverCerts.iteritems():
                try:
                    feClient.addServerCerts(server, ServerCertInfo(certificateContents=certData['crt'], keyContents=certData['key']))
                    logger.info("Uploaded Cert and Key for %s", server)
                    rtn.append("Uploaded Certificate and Key for host: %s" % server)
                except EzFrontendCertException as e:
                    status='NOK'
                    logger.error("Error in Uploading Cert and Key for %s: %s", server, str(e))
                    rtn.append("Error in Uploading Certificate and Key for host: %s" % server)

            returnEfeClient(feClient)

        if 'NOK' in status:
            value = 'NOK|{0}'.format(''.join(rtn))
        else:
            value = 'OK|{0}'.format(''.join(rtn))

        raise web.seeother('{redirect}/{status}'.format(redirect=redirect, status=urlsafe_b64encode(value)))

class deleteCerts:
    '''
    delete cert and key of host(s)
    '''
    def POST(self):
        redirect = '/ezfrontend/manage/'
        form = web.input()

        hostsToDelete = set()

        rtn=[]
        for k, v in form.iteritems():
            if not k.startswith('delete_'):
                continue
            hostsToDelete.add(k.split(':')[1])

        if hostsToDelete:
            removeCertsForHosts(hostsToDelete)
            for h in hostsToDelete:
                rtn.append("Deleted Certificate and Key for host: %s <br>" %(h))
        
        value = 'OK|{0}'.format(''.join(rtn))
        raise web.seeother('{redirect}/{status}'.format(redirect=redirect, status=urlsafe_b64encode(value)))


def isServerListening(host, port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.connect((host, port))
        s.close()
        return True
    except socket.error as ex:
        s.close()
        return False

class RegisterWebPage(ActionPage):
    def __init__(self):
        super(RegisterWebPage, self).__init__()
        self.title = self.title + ' - App Registeration'

    def GET(self, name=None):
        super(RegisterWebPage, self).GET(name)
        logger.info('%s accessed by {%s}', self.__class__.__name__, self.userDN)
        message=''

        if name:
            msg = urlsafe_b64decode(str(name))
            status=dict()
            status[str(msg.split('|')[0])] = msg.split('|')[1:]
            if 'NOK' in status:
                message = '<div class="message error-message">{errmsg}</div>'.format(errmsg=''.join(status['NOK']))
            if 'OK' in status:
                reg = dict(item.split(':') for value in status['OK'] for item in str(value).split(','))
                message_without_end_div = '<div class="message success-message">{ellipsis} {msg} {app}'.format(msg='Registered ', app=reg['AppName'], ellipsis=ellipsis_link('div_more'))
                reginfo_in_card = '<div class="card shadow1"> <p style="color:black">{msg}</p> </div>'.format(msg=str(reg))
                more = '<div id="div_more" style="display:none;">{reginfo} </div>'.format(reginfo=reginfo_in_card)
                message = '{msg} {more} </div> '.format(msg=message_without_end_div, more=more)

        html_var = [message,
                    '<h3>Register an Instance:</h3>',
                    '<div class="card shadow3">',
                    '<form action="/ezfrontend/reginstance" method="post">',
                    '<fieldset>',
                    #ROW1
                    '<div class="col3-set">',
                    ' <div class="col-1"><label>URL</label><input type="text" name="UserFacingUrlPrefix" > </div>',
                    ' <div class="col-2"> </div>',
                    ' <div class="col-3"> </div>',
                    '</div>',
                    #ROW2
                    '<div class="col3-set">',
                    ' <div class="col-1"><label>App Name</label><input type="text" name="AppName" > </div>',
                    ' <div class="col-2"><label>Upstream Path</label><input type="text" name="UpstreamPath" > </div>',
                    ' <div class="col-3"> </div>',
                    '</div>',
                    #ROW3
                    '<div class="col3-set">',
                    ' <div class="col-1"><label>Upstream Host</label><input type="text" name="UpstreamHost" > </div>',
                    ' <div class="col-2"><label>Upstream Port</label><input type="text" name="UpstreamPort" > </div>',
                    ' <div class="col-3"> </div>',
                    '</div>',
                    #ROW4
                    '<div class="col3-set">',
                    ' <div class="col-1"><label>Timeout</label><input type="text" name="timeout" value=10>[1-120]s </div>',
                    ' <div class="col-2"><label>Timeout Tries</label><input type="text" name="timeoutTries" value=1>[1-10] </div>',
                    ' <div class="col-3"><label>Upload File Size</label><input type="text" name="uploadFileSize" value=2>[1-{max}]MB </div>'.format(max=100),
                    '</div>',
                    #Checkboxes
                    '<div class="mar-t30"></div>',
                    '<h3 class="green"><font color="black">Flags</font></h3>',
                    '<ul>',
                       '<li>',
                           '<input type="checkbox" class="regular-checkbox" id="checkbox1" name="sticky" value="True"><label for="checkbox1"></label>',
                           '<div class="tag">Sticky session</div>',
                       '</li>',
                       '<li>',
                           '<input type="checkbox" class="regular-checkbox" id="checkbox2" name="disableChunkedTransferEncoding" value="True"><label for="checkbox2"></label>',
                           '<div class="tag">Chunk Transfer</div>',
                       '</li>',
                    '</ul>',
                    #submit button
                    '<input type="submit" class="green-btn mar-t20" name="submit" id="submit" value="Submit" >',
                    '</fieldset>',
                    '</form>',
                    '</div>']
        # Get current registrations
        efeClient = getEfeClient()
        registrations = efeClient.getAllUpstreamServerRegistrations()

        test_app_name = 'EFE_ui_test_app'
        app = list()
        for i in range(1, 3):
            if is_path_registered(registrations, '{test_app}_{number}'.format(test_app=test_app_name, number=i)):
                app.append('<input type="submit" class="red-btn mar-t20" name="{test_app}_{number}" id="submit" value="Remove Test App {number}" >'.format(test_app=test_app_name, number=i))
            else:
                app.append('<input type="submit" class="green-btn mar-t20" name="{test_app}_{number}" id="submit" value="Add Test App {number}" >'.format(test_app=test_app_name, number=i))

        test_app_var = ['<div class="card shadow3">',
                        ' <form action="/ezfrontend/reginstance" method="post">',
                        ' <div class="col3-set">',
                        '   <div class="col-1">{test_app}</div>'.format(test_app=app[0]),
                        '   <div class="col-2">{test_app}</div>'.format(test_app=app[1]),
                        '   <div class="col-3"> </div>',
                        ' </div>',
                        '</div>']

        self.content.append(''.join(html_var + test_app_var))
        return self.render()

class RegisterInstance:

    '''
     Register an instance.
     Register/Deregister Test App, start/stop Test server
    '''

    def POST(self):
        redirect = '/ezfrontend/register/'
        logger.info("accessed RegisterInstance")
        form = web.input()
        us_registration = dict()
        deregister = False
        configuration_number = None
        test_app_1 ="EFE_ui_test_app_1"
        test_app_2 ="EFE_ui_test_app_2"

        if test_app_1 in form:
            us_registration['UpstreamPort'] = int(31210)
            us_registration['AppName'] = "TestApp1"
            us_registration['UpstreamPath'] = test_app_1
            us_registration['UserFacingUrlPrefix'] = ''
            us_registration['UserFacingUrlSuffix'] = test_app_1 + '/'
            us_registration['FullUserFacingUrl'] = '' 
            us_registration['isWebSocket'] = False
            configuration_number = 0
            if 'Remove' in form[test_app_1]:
                deregister = True
        elif test_app_2 in form:
            us_registration['UpstreamPort'] = int(31211)
            us_registration['AppName'] = "TestApp2"
            us_registration['UpstreamPath'] = test_app_2
            us_registration['UserFacingUrlPrefix'] = ''
            us_registration['UserFacingUrlSuffix'] = test_app_2 + '/'
            us_registration['FullUserFacingUrl'] = '' 
            us_registration['isWebSocket'] = True
            configuration_number = 1
            if 'Remove' in form[test_app_2]:
                deregister = True
        else:
            # Not ezFrontend UI test apps
            try:
                if len(form['AppName']) == 0 or len(form['UserFacingUrlPrefix']) == 0: 
                    raise ValueError
                us_registration['AppName'] = str(form['AppName'])
                # Remove xxx:// prefix if any
                us_registration['UserFacingUrlPrefix'] = str(form['UserFacingUrlPrefix']).split('//')[-1]
                us_registration['FullUserFacingUrl'] = us_registration['UserFacingUrlPrefix'] 
            except ValueError: 
                value='NOK|Needs AppName and URL for registration'
                raise web.seeother('{redirect}/{nok}'.format(redirect=redirect, nok=urlsafe_b64encode(value)))

            us_registration['UpstreamPort'] = form['UpstreamPort']
            us_registration['UpstreamHost'] = form['UpstreamHost'] 
            us_registration['UpstreamPath'] = form['UpstreamPath']
            us_registration['UserFacingUrlSuffix'] = ''

        # Common for all
        us_registration['timeout'] = int(form.get('timeout', 10))
        us_registration['timeoutTries'] = int(form.get('timeoutTries', 1))
        us_registration['uploadFileSize'] = int(form.get('uploadFileSize', 2))
        us_registration['sticky'] = True if form.get('sticky') else False
        us_registration['disableChunkedTransferEncoding'] = True if form.get('disableChunkedTransferEncoding') else False

        efeServers = getEfeServers()
        host, port = choice(efeServers)
        port = int(port)

        # If registered/deregistered Test App start/stop it
        if configuration_number >= 0:
            gState.testServerConfigurations[configuration_number] = us_registration

        status='NOK|Unable to register'
        if not deregister:
            try:
                registerServer(us_registration, host, port)
                if configuration_number >=0 and not isServerListening(host, us_registration['UpstreamPort']):
                    gevent.spawn(startServer, configuration_number)
                status = 'OK'
            except Exception as e:
                status = 'NOK|{0}'.format(str(e))
        else:
            try:
                deregisterServerFromConfig(us_registration, host, port)
                if configuration_number >=0:
                    stopServer(configuration_number)
                status = 'OK'
            except Exception as e:
                status = 'NOK|{0}'.format(str(e))

        if 'NOK' in status:
            value = '{0}'.format(status)
        else:
            value = 'OK|{0}'.format(','.join(['{k}:{v}'.format(k=str(key), v=str(value)) for(key, value) in us_registration.items()]))

        # Ignore Test App deregistration
        if deregister:
            value = 'IGNORE|Ignore'

        raise web.seeother('{redirect}/{ok}'.format(redirect=redirect, ok=urlsafe_b64encode(value)))

class ViewRegistrations(ActionPage):
    def __init__(self):
        super(ViewRegistrations, self).__init__()

    def GET(self, name=None):
        super(ViewRegistrations, self).GET(name)
        logger.info('%s accessed by {%s}', self.__class__.__name__, self.userDN)
        
        efeServers = getEfeServers()

        if name:
            hp_match = re.match('^(.*?):(.*?)$', name)
            if not hp_match:
                self.title = self.title + ' - View Registerations'
                self.content.append('<div class="message error-message">Invalid EFE host: {0}</div>'.format(name))
                return self.render()

            self.title = self.title + ' - {0} Registrations'.format(name)
            host, port = hp_match.group(1), hp_match.group(2)

            if (host, port) not in efeServers:
                self.content.append('<div class="message error-message">EFE %s:%s not found</div>' % (host, port))
                return self.render()
        else:
            #choose a random EFE host
            host, port = choice(efeServers)

        self.title = self.title + ' - View Registrations'

        registrations = []
        try:
            registrations = getAllUpstreamServerRegistrations(host, int(port))
        except RuntimeError as ex:
            logger.warn('Unable to get all upstream server registrations from %s:%d - %s', host, int(port), str(ex))
            self.content.append('<div class="message error-message">Unable to get all upstream server registrations from %s:%d</div>' % (host, int(port)))
            return self.render()

        # Sort the registrations by AppName
        reg_dict = defaultdict(list)
        for reg in registrations:
            reg_dict[reg.AppName].append(reg)

        # For all the App registered in alphabetical order
        for app in sorted(reg_dict, key=lambda app_name: str(app_name).upper()):
            registration = reg_dict[app][0]
            url = registration.UserFacingUrlPrefix
            registration_var = ['<div class="card shadow1">',
                                '<h3>{appname}</h3>'.format(appname=registration.AppName),
                                'URL:&nbsp;<a href="https://{url}">https://{url}</a>'.format(url=url),
                                '<div class="col3-set">',
                                '   <div class="col-1">UserFacingUrlPrefix:&nbsp;{url}</div>'.format(url=url),
                                '   <div class="col-2">sticky:&nbsp;{sticky}</div>'.format(sticky=str(registration.sticky)),
                                '   <div class="col-3">disableChunkedTransferEncoding:&nbsp;{chunked}</div>'.format(chunked=str(registration.disableChunkedTransferEncoding)),
                                '</div>']

            # For all the registrations under this App name
            upfz_list, usp_list, to_list, tot_list, ushp_list= list(), list(), list(), list(), list()
            number_of_col = 4
            for registration in reg_dict[app]:
                # For all the registered instances, create a list of registered parameters
                upfz_list.append(('uploadFileSize:&nbsp;{filesize}'.format(filesize=registration.uploadFileSize), registration.uploadFileSize))
                usp_list.append(('UpstreamPath:&nbsp;{usp}'.format(usp=registration.UpstreamPath), str(registration.UpstreamPath)))
                ushp_list.append(('UpstreamHostAndPort:&nbsp;{ushp}'.format(ushp=registration.UpstreamHostAndPort), str(registration.UpstreamHostAndPort)))
                to_list.append(('timeout:&nbsp;{timeout}'.format(timeout=registration.timeout), registration.timeout))
                tot_list.append(('timeoutTries:&nbsp;{tries}'.format(tries=registration.timeoutTries), registration.timeoutTries))



            # Arrange the registration in column
            remove_instance_button = ['<form action="/ezfrontend/efestate/" method="post">',
                                      '   <a href="javascript:<a href="javascript:;" onclick="parentNode.submit();">',
                                      '   <div class="btn red-btn">Deregister Instance</div> </a>',
                                      '   <input type="hidden" name="deregister"']

            remove_app_button = [ '<form action="/ezfrontend/efestate/" method="post">',
                                  '   <a href="javascript:<a href="javascript:;" onclick="parentNode.submit();">',
                                  '   <div class="btn red-btn">Remove App</div> </a>',
                                  '   <input type="hidden" name="removeReverseProxiedPath"',
                                  '   value="{host}|{port}|{url}"/></form>'.format(host=host, port=port, url=url)]
            # Build the html page
            border_style =''

            self.content.extend(registration_var)
            # populate the columns
            for i in range(0, len(ushp_list), number_of_col):
                self.content.append('<div class="divider"></div>')
                self.content.append('<div class="col4-set">')
                for count, _ in enumerate(ushp_list[i:i + number_of_col]):
                    self.content.append('<div class="col-{count}"{border_style}>{value}</div>'.format(count=(count % number_of_col) + 1, value=ushp_list[i + count][0], border_style=border_style))
                self.content.append('</div>')

                self.content.append('<div class="col4-set">')
                for count, _ in enumerate(usp_list[i:i + number_of_col]):
                    self.content.append('<div class="col-{count}"{border_style}>{value}</div>'.format(count=(count % number_of_col) + 1, value=usp_list[i + count][0], border_style=border_style))
                self.content.append('</div>')

                self.content.append('<div class="col4-set">')
                for count, _ in enumerate(upfz_list[i:i + number_of_col]):
                    self.content.append('<div class="col-{count}"{border_style}>{value}</div>'.format(count=(count % number_of_col) + 1, value=upfz_list[i + count][0], border_style=border_style))
                self.content.append('</div>')

                self.content.append('<div class="col4-set">')
                for count, _ in enumerate(to_list[i:i + number_of_col]):
                    self.content.append('<div class="col-{count}"{border_style}>{value}</div>'.format(count=(count % number_of_col) + 1, value=to_list[i + count][0], border_style=border_style))
                self.content.append('</div>')

                self.content.append('<div class="col4-set">')
                for count, _ in enumerate(tot_list[i:i+ number_of_col]):
                    self.content.append('<div class="col-{count}"{border_style}>{value}</div>'.format(count=(count % number_of_col) + 1, value=tot_list[i + count][0], border_style=border_style))
                self.content.append('</div>')

                # Add Deregister instance button if there is multiple instances
                if len(upfz_list) > 1:
                    self.content.append('<div class="col4-set">')
                    for count, _ in enumerate(upfz_list[i:i + number_of_col]):
                        self.content.append('<div class="col-{count}"{border_style}>{button}value="{host}|{port}|{url}|{appname}|{ushp}|{uspath}"/></form></div>'.format(button=''.join(remove_instance_button),
                                            count=(count % number_of_col) + 1, host=host, port=port, url=url, appname=str(app), ushp=ushp_list[i + count][1], uspath=usp_list[i + count][1], border_style=border_style))
                    self.content.append('</div>')

            self.content.append('<div class="divider"></div>')
            self.content.extend(remove_app_button)
            self.content.append('</div>') # for card shadow1

        return self.render()


class hello(BasePage):
    def __init__(self):
        super(hello, self).__init__()
        self.title = self.title + ' - TestApp'

    def GET(self, _=None):
        self.validateUser(authorize=False)
        logger.info('%s accessed by {%s}', self.__class__.__name__, self.userDN)

        headers = []
        for key in web.ctx.env:
            headers.append('<li>'+str(key)+': '+str(web.ctx.env[key])+'</li>')
        
        qp = web.input()
        queryParameters = []
        for key in qp:
            queryParameters.append(key + ":\t" + qp[key])
        rtn = []
        rtn.append('<html>')
        rtn.append('<!doctype html>')
        rtn.append('<html lang="en">')
        rtn.append('<head>')
        rtn.append('<script src="/ezbstatic/components/platform/platform.js" type="text/javascript"></script>')
        rtn.append('<link rel="import" href="/ezbstatic/components/classification-banner/classification-banner.html">')
        rtn.append('</head>')
        rtn.append('<body>')
        rtn.append('<classification-banner class="banner-component"></classification-banner>')
        rtn.append('<br/><h3>port</h3>'+''+'<h3>headers</h3><ul>'+"\n".join(headers)+'</ul><h3>query parameters</h3><ul>'+"\n".join(queryParameters)+'</ul>')
        
        path = web.ctx.env['PATH_INFO'].strip('/')
        
        # Upload form
        rtn.append('<h3>Upload</h3>')
        rtn.append('<form action="/' + path + '/upload" method="post" enctype="multipart/form-data">')
        rtn.append('<input type="file" name="upload_file">')
        rtn.append('<input type="submit" value="Upload">')
        rtn.append('</form>')
        
        if path in gState.socket_resource_path:
            rtn.append('<h3>WebSocket</h3>')
            web_socket_url = 'https://'+ str(web.ctx.env.get('HTTP_X_ORIGINAL_HOST'))+'/'+ path + '/wstest'
            rtn.append('<a href = "' + web_socket_url + '">WebSocket Test </a>')
        
        rtn.append('</body></html>')
        return ''.join(rtn)

        
class loadWSClientPage:
    ''' 
    Load WebSocket Test page
    ''' 
    def GET(self):
        path = web.ctx.env['PATH_INFO'].strip('/').split('/')[0]
        
        if path in gState.socket_resource_path:
            return web.template.render(TEMPLATES_DIR).websocket_test_page(web.ctx.env.get('HTTP_X_ORIGINAL_HOST', 'localhost'), path)
        # This should not happen
        logger.error('Web Socket Test Page called without enabling SocketIOServer')
        raise web.internalerror('Web Socket Test Page called without enabling SocketIOServer')


class sendjs:
    ''' 
    Send node.io.js file for the client
    ''' 
    def GET(self):
         try:
            js = open('{0}/socket.io.js'.format(TEMPLATES_DIR))
            return js.read()
         except:
            logger.info('socket.io.js Not Found')
            return "<h1>Not Found</h1>"
        
class webSocket:
    ''' 
    Service Websocket request
    ''' 
    def GET(self, name):
        # Extract the resource path
        path = web.ctx.env['PATH_INFO'].strip('/').split('/')[0]
       
        if path in gState.socket_resource_path:
             # It must be socket.io request, strip the resource path
             path = web.ctx.env['PATH_INFO'].strip('/'+path+'/')
        if path.startswith("socket.io"):
            socketio_manage(web.ctx.env , {
                                          '/test': dateNamespace,
                                          }, request = name)
        else:
           logger.info('socket.io not in PATH_INFO')
           return "<h1>Not Found</h1>"
           
           
class dateNamespace(BaseNamespace, BroadcastMixin):
    '''    
     Updates epoch time, ip address and
     DN constantly. Echos back received message.
    '''
    def recv_connect(self):
        dn = str(self.environ['HTTP_X_CLIENT_CERT_S_DN'])
        ip = str(self.environ.get('REMOTE_ADDR', 'UNKNOWN'))
        def sendTime():
            while True:
                dtime = time.time()
                self.emit('time_data', {
                                        'time':int(dtime),
                                        'ipaddr':ip,
                                        'DN':dn
                                        })
                gevent.sleep(0.1)
        self.spawn(sendTime)
    
    def on_msg(self, message):
        '''
         Echo back the received message
        '''
        self.emit('msg',{'message':message})  
                                       
class upload:
    '''
    Upload file into /tmp dir
    '''
    def POST(self):
        length = web.ctx.env['CONTENT_LENGTH']
        # Note: upload_file is the 'name' in form
        form = web.input(upload_file={})
        upload_dir = '/tmp'
        if 'upload_file' in form:
            filepath = form.upload_file.filename.replace('\\', '/')
            filename = filepath.split('/')[-1]
            fout = open(upload_dir + '/' + filename, 'w')
            fout.write(form.upload_file.file.read())
            fout.close()
            logger.info('uploaded ' + length + ' bytes into file:' + upload_dir + '/' + filename)
            htmlText = '<!doctype html><html lang="en"><head>'
            htmlText += '<script src="/ezbstatic/components/platform/platform.js" type="text/javascript"></script>'
            htmlText += '<link rel="import" href="/ezbstatic/components/classification-banner/classification-banner.html">'
            htmlText += '</head><body><classification-banner class="banner-component"></classification-banner>'
            htmlText += "<h1>Upload</h1>Uploaded file: \"" + filename + "\" of length: " + length + " bytes into " + upload_dir
            return htmlText

        return ("<h1> Could not read file </h1>")

def verify_sign(public_key_loc, signature, data):
    '''    
    Verifies with a public key from whom the data came that it was indeed 
    signed by their private key
    param: public_key_loc Path to public key
    param: signature String signature to be verified
    return: Boolean. True if the signature is valid; False otherwise. 
    '''
    from Crypto.PublicKey import RSA
    from Crypto.Signature import PKCS1_v1_5
    from Crypto.Hash import SHA256
    from base64 import b64decode
    from base64 import b64encode
    pub_key = open(public_key_loc, "r").read()
    rsakey = RSA.importKey(pub_key)
    signer = PKCS1_v1_5.new(rsakey)
    digest = SHA256.new()
    # Assumes the data is base64 encoded to begin with
    #digest.update(b64decode(data))
    #digest.update(b64encode(data))
    digest.update(data)
    if signer.verify(digest, b64decode(signature)):
        logger.info("SIGNATURE VERIFIED FOR: %s" % str(digest))
        return True
    logger.error("Signature not verified for:%s " % data)
    return False

def getCn(subject):
    csvs = subject.split(',')
    for csv in csvs:
        kv = csv.strip().rstrip()
        key, value = kv.split('=', 1)
        if key == 'CN':
            return value
    logger.error("no CN in subject: %s" % subject)
    raise web.unauthorized


def validateCn(cn):
    if cn.startswith('_Ez_'):
        logger.info("access granted to special cert with prefix _Ez_: %s", cn)
        return True
    try:
        with (open('authorized_users.yaml')) as userfile:
            authorized_users = yaml.safe_load(userfile)
            if authorized_users is not None:
                for authorized_user in authorized_users:
                    if cn == authorized_user:
                        logger.info("validated access for user (%s) using authorization file", cn)
                        return True
    except IOError as ex:
        logger.info("Unable to validate CN against authorized_users file: %s", str(ex))
    return False

def isUserAuthroized(cn, userJsonInfo):
    ezAdminProject = '_Ez_internal_project_'
    ezAdminGroup = '_Ez_administrator'
    userCreds = json.loads(userJsonInfo)

    for groups in [p.get('groups') for p in userCreds.get('projects') if ('projectName' in p and p.get('projectName') == ezAdminProject)]:
        if ezAdminGroup in groups:
            logger.info("validated access for user (%s) using json header", cn)
            return True
    return False

def getEzProperties():
    #load default configurations
    config = EzConfiguration()
    logger.info("loaded default ezbake configuration properties")

    #load configuration overrides
    overrideLoader = DirectoryConfigurationLoader(gState.configOverrideDir)
    config = EzConfiguration(PropertiesConfigurationLoader(config.getProperties()), overrideLoader)
    logger.info("loaded property overrides")

    #load cryptoImpl
    cryptoImpl = SystemConfiguration(config.getProperties()).getTextCryptoImplementer()
    if not isinstance(cryptoImpl, SharedSecretTextCryptoImplementation):
        logger.warn("Couldn't get a SharedSecretTextCryptoImplementation. Is the EZB shared secret set properly?")

    return config.getProperties(cryptoImpl)


def handler(signalnum,frame):
    gState.mainserver.stop()


def main():
    import logging.handlers
    wfh = logging.handlers.WatchedFileHandler('/opt/ezfrontend-ui/ezfrontend-ui.log')
    wfh.setLevel(logging.INFO)
    wfh.setFormatter(formatter)
    logger.addHandler(wfh)
    # comment the next line to also send the log to the terminal
    logger.removeHandler(sh)
    logger.info('. starting.')

    global gState
    gState = GlobalState()

    signal.signal(signal.SIGTERM, handler)

    ezProps = getEzProperties()

    global zkConfig
    zkConfig = ZookeeperConfiguration(ezProps)
    gState.port = int(ezProps.get('efe.tester.port', -1))
    gState.url = ezProps.get('web.application.external.domain')
    gState.internalhostname = ezProps.get('internal_hostname')

    urls = ('/ezfrontend/control/', 'control',
            '/ezfrontend/efestate/(.*)', 'efestate',
            '/ezfrontend/manage/(.*)', 'manage',
            '/ezfrontend/uploadcert', 'uploadCerts',
            '/ezfrontend/deletecert', 'deleteCerts',
            '/ezfrontend/register/(.*)', 'RegisterWebPage',
            '/ezfrontend/reginstance', 'RegisterInstance',
            '/ezfrontend/upstreams/(.*)', 'ViewRegistrations',
             )

    app = web.application(urls, globals())
    app.notfound = WANotFound
    wsgifunc = app.wsgifunc()

    try:
        registerSelf()
    except Exception:
        logger.exception('Error in registering with Efe')
        return
    try:
        gState.mainserver = WSGIServer((gState.internalhostname, gState.port), wsgifunc,
                                       keyfile=gState.keyfile, certfile=gState.certfile, ca_certs=gState.ca_certs, cert_reqs=gevent.ssl.CERT_OPTIONAL,
                                       log=WSGILog())
        gState.mainserver.serve_forever()
    except Exception:
        logger.exception('Exception raised while running server')
    try:
        deregisterSelf()
    except Exception:
        logger.exception('Error in deregistering with Efe')
    logger.info('done. exiting.')
           
if __name__ == '__main__':
    main()
