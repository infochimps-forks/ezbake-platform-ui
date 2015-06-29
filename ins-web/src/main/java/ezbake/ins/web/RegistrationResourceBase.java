package ezbake.ins.web;

import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriInfo;
import javax.ws.rs.ext.ContextResolver;

import ezbake.groups.thrift.EzGroups;
import ezbake.groups.thrift.EzGroupsConstants;
import org.apache.thrift.TException;
import org.apache.thrift.TServiceClient;
import org.apache.thrift.transport.TTransportException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import ezbake.base.thrift.EzSecurityToken;
import ezbake.base.thrift.EzSecurityTokenException;
import ezbake.ins.thrift.gen.InternalNameService;
import ezbake.ins.thrift.gen.InternalNameServiceConstants;
import ezbake.security.client.EzbakeSecurityClient;
import ezbake.security.thrift.EzSecurityRegistration;
import ezbake.security.thrift.EzSecurityRegistrationConstants;
import ezbake.services.deploy.thrift.EzBakeServiceDeployer;
import ezbake.services.deploy.thrift.EzDeployServiceConstants;

public class RegistrationResourceBase {
    protected static Logger logger = LoggerFactory.getLogger("InsWeb");

    @Context
    protected UriInfo context;

    @Context
    protected HttpServletRequest httpRequest;

    protected InternalNameService.Client getINSServiceClient(ServiceClient resource) throws TException {
    	return resource.getClientPool().getClient(InternalNameServiceConstants.SERVICE_NAME,
                InternalNameService.Client.class);
    }

    protected EzSecurityToken getSecurityToken(ServiceClient resource) {
    	EzbakeSecurityClient securityClient = getSecurityClient(resource);
    	try {
			return securityClient.fetchTokenForProxiedUser();
		} catch (EzSecurityTokenException e) {
			throw new RuntimeException(e);
		}
    }

    protected EzbakeSecurityClient getSecurityClient(ServiceClient resource) {
    	return resource.getSecurityClient();
    }
    
    protected EzSecurityToken getRegistrationSecurityToken(ServiceClient resource) {
    	EzbakeSecurityClient securityClient = getSecurityClient(resource);
    	try {
			return securityClient.fetchTokenForProxiedUser(resource.getClientPool().getSecurityId(
			        EzSecurityRegistrationConstants.SERVICE_NAME));
		} catch (EzSecurityTokenException e) {
			throw new RuntimeException(e);
		}
    }

    protected EzSecurityToken getEzGroupToken(ServiceClient resource) {
        EzbakeSecurityClient securityClient = getSecurityClient(resource);
        try {
            return securityClient.fetchTokenForProxiedUser(resource.getClientPool().getSecurityId(
                    EzGroupsConstants.SERVICE_NAME));
        } catch (EzSecurityTokenException e) {
            throw new RuntimeException(e);
        }
    }

    protected EzSecurityToken getDeployerSecurityToken(ServiceClient resource) {
    	EzbakeSecurityClient securityClient = getSecurityClient(resource);
    	try {
			return securityClient.fetchTokenForProxiedUser(resource.getClientPool().getSecurityId(
					EzDeployServiceConstants.SERVICE_NAME));
		} catch (EzSecurityTokenException e) {
			throw new RuntimeException(e);
		}
   }
    
    protected EzBakeServiceDeployer.Client getEzDeployerServiceClient(ServiceClient resource) throws TException {
        return resource.getClientPool().getClient(EzDeployServiceConstants.SERVICE_NAME,
                EzBakeServiceDeployer.Client.class);
    }
    
    protected EzSecurityRegistration.Client getEzSecurityRegistrationServiceClient(ServiceClient resource) throws TException {
        return resource.getClientPool().getClient(EzSecurityRegistrationConstants.SERVICE_NAME,
        		EzSecurityRegistration.Client.class);
    }

    protected EzGroups.Client getEzGroupsServiceClient(ServiceClient resource) throws TException {
        return resource.getClientPool().getClient(EzGroupsConstants.SERVICE_NAME,
                EzGroups.Client.class);
    }
    
    protected <T extends TServiceClient> T invalidateServiceClient(T client, ServiceClient resource, Exception ex) {
        if (ex.getClass().getName().equals(TTransportException.class.getName())) {
            return invalidateServiceClient(client, resource);
        } else {
            return client;
        }
    }

    protected <T extends TServiceClient> T invalidateServiceClient(T client, ServiceClient resource)  {
        resource.getClientPool().returnBrokenToPool(client);
        return null;
    } 

    protected ServiceClient getFromContext(ContextResolver<ServiceClient> context) {
        return context.getContext(ServiceClient.class);
    }
    
    protected void freeServiceClient(TServiceClient client, ServiceClient resource) {
        resource.getClientPool().returnToPool(client);
    }
    
    protected UserInfo checkAuthToken(ServiceClient resource) {
        EzbakeSecurityClient securityClient = getSecurityClient(resource);
        UserInfo info = new UserInfo();
        try {
            EzSecurityToken token = securityClient.fetchTokenForProxiedUser();
            info.username = token.getTokenPrincipal().getPrincipal();
            info.isAdmin = false;
            return info;
        } catch(Exception ex) {
            logger.warn("Failed to get security token.", ex);
            throw new WebApplicationException(Response.Status.UNAUTHORIZED);
        }
    }

    public static class UserInfo {
        public String username;
        public boolean isAdmin;
    }
}
