package ezbake.warehaus.resource;

import com.google.common.collect.Sets;
import com.sun.jersey.spi.container.ContainerRequest;
import com.sun.jersey.spi.container.ContainerRequestFilter;
import ezbake.configuration.EzConfiguration;
import ezbake.configuration.EzConfigurationLoaderException;
import ezbake.groups.thrift.EzGroups;
import ezbake.groups.thrift.EzGroupsConstants;
import ezbake.security.client.EzSecurityTokenWrapper;
import ezbake.security.client.EzbakeSecurityClient;
import ezbake.thrift.ThriftClientPool;
import ezbakehelpers.ezconfigurationhelpers.application.EzBakeApplicationConfigurationHelper;
import org.apache.thrift.TException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Response;
import java.util.Set;

/**
 * <p>
 * Filters HTTP requests to confirm that the user has the proper rights access
 * to this service.
 * </p>
 */
public class AdminFilter implements ContainerRequestFilter {
   
   private static EzConfiguration config;
   private static ThriftClientPool pool;
   private static EzbakeSecurityClient security;
   private static Logger logger = LoggerFactory.getLogger(AdminFilter.class);

   static {
       try {
          config = new EzConfiguration();
       } catch (EzConfigurationLoaderException e) {
          logger.error("The properties could not be loaded.", e);
          throw new RuntimeException(e);
       }
       pool = new ThriftClientPool(config.getProperties());
       security = new EzbakeSecurityClient(config.getProperties());
  }

   @Override
   public ContainerRequest filter(ContainerRequest request) {

       //return request;

       try {
           EzSecurityTokenWrapper securityToken = security.fetchTokenForProxiedUser();
           Set<Long> userGroups = securityToken.getAuthorizations().getPlatformObjectAuthorizations();
           
           EzBakeApplicationConfigurationHelper configHelper = new EzBakeApplicationConfigurationHelper(config.getProperties());
           String groupName = EzGroupsConstants.APP_GROUP + EzGroupsConstants.GROUP_NAME_SEP + configHelper.getApplicationName();
           
           Set<Long> groupsMask = null;
           
           try {
              EzGroups.Client groupClient = pool.getClient(EzGroupsConstants.SERVICE_NAME, EzGroups.Client.class);
              EzSecurityTokenWrapper groupsSecurityToken = security.fetchDerivedTokenForApp(securityToken, pool.getSecurityId(EzGroupsConstants.SERVICE_NAME));
              groupsMask = groupClient.getGroupsMask(groupsSecurityToken, Sets.newHashSet(groupName), null, null);
           } finally {
              pool.close();
           }
           
           if (Sets.intersection(userGroups, groupsMask).isEmpty()) {
              logger.warn("DN {} does not have access rights to purge.", securityToken.getUserId());
              throw new WebApplicationException(Response.status(Response.Status.FORBIDDEN).entity("The user does not have access rights to Purge.").build());
           }
           
           return request;
       } catch (TException e) {
           logger.error("Unable to obtain a token from security service.", e);
           throw new WebApplicationException(Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity("Unable to obtain a token from security service.").build());
       }
   }
}
