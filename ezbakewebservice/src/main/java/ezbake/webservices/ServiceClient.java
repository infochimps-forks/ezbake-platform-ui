package ezbake.webservices;

import ezbake.base.thrift.EzSecurityTokenException;
import ezbake.base.thrift.UserInfo;
import ezbake.configuration.EzConfiguration;
import ezbake.configuration.EzConfigurationLoaderException;
import ezbake.profile.ezprofileConstants;
import ezbake.profile.EzProfile;
import ezbake.security.client.EzbakeSecurityClient;
import ezbake.thrift.ThriftClientPool;
import ezbake.webservices.exceptions.JsonInternalServiceErorrException;

import javax.servlet.http.HttpServletRequest;

import org.apache.thrift.TException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @author blong
 */
public enum ServiceClient {

    INSTANCE;

    private final Logger logger = LoggerFactory.getLogger(ServiceClient.class);
    private ThriftClientPool pool;
    private EzbakeSecurityClient securityClient;
    private EzConfiguration ezConfiguration;

    static String STARS = "\n*********************************************************************\n";


    private ServiceClient() {
        try {
            ezConfiguration = new EzConfiguration();
            logger.info("Attempting to construct ServiceClient with {} EzConfiguration properties.",
                    ezConfiguration.getProperties().size());
            securityClient = new EzbakeSecurityClient(ezConfiguration.getProperties());
            pool = new ThriftClientPool(ezConfiguration.getProperties());
        } catch (EzConfigurationLoaderException ex) {
            final String message = "Error creating ServiceClient.  ";
            logger.error(message, ex);
            throw new JsonInternalServiceErorrException(message);
        }
    }

    private EzProfile.Client getEzProfileClient() throws TException {
        return pool.getClient(ezprofileConstants.SERVICE_NAME, EzProfile.Client.class);
    }

    public final String getUserDNString(final HttpServletRequest request) {
        try {
            return securityClient.clientDnFromRequest(request).getPrincipal();
        } catch (EzSecurityTokenException ex) {
            final String message = "There was an error getting the user's DN.";
            logger.error(message, ex);
            throw new JsonInternalServiceErorrException(message);
        }
    }

    private String getUserDNString() {
        try {
            return securityClient.clientDnFromRequest().getPrincipal();
        } catch (EzSecurityTokenException ex) {
            final String message = "There was an error getting the user's DN.";
            logger.error(message, ex);
            throw new JsonInternalServiceErorrException(message);
        }
    }

    public UserInfo getUserProfile() {
        EzProfile.Client ezProfileClient = null;
        UserInfo retVal;
        try {
            logger.info("Attempting to get User's DN");
            String userDn = ServiceClient.INSTANCE.getUserDNString();
            logger.info("Attempting to search for user's email address based on DN: {}", userDn);
            ezProfileClient = getEzProfileClient();
            retVal = ezProfileClient.userProfile(
                    securityClient.fetchTokenForProxiedUser(
                            pool.getSecurityId(ezprofileConstants.SERVICE_NAME)
                    ),
                    userDn);
        } catch (TException ex) {
            final String message = "There was an error getting the user's profile.";
            logger.error(message, ex);
            throw new JsonInternalServiceErorrException(message);
        } finally {
            pool.returnToPool(ezProfileClient);
        }
        return retVal;
    }

}
