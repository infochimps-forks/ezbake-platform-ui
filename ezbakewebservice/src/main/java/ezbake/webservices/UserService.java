package ezbake.webservices;

import ezbake.webservices.exceptions.JsonInternalServiceErorrException;
import com.sun.jersey.core.spi.factory.ResponseBuilderImpl;
import ezbake.base.thrift.UserInfo;

import java.io.IOException;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import org.codehaus.jackson.map.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @author blong
 */
@Path("/user")
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    // Thread-safe and can be reused as long as we don't
    // need to change some serialization configuration.
    private final static ObjectMapper objectMapper = new ObjectMapper();

    public UserService() {
        logger.info(ServiceClient.STARS + "UserService initialized" + ServiceClient.STARS);
    }

    @GET
    public Response getUserProfile() {
        String userProfileJson = null;
        try {
            UserInfo userInfo = ServiceClient.INSTANCE.getUserProfile();
            userProfileJson = objectMapper.writeValueAsString(userInfo);
        } catch (IOException ex) {
            final String message = "There was an error getting the users profile.";
            logger.error(message, ex);
            throw new JsonInternalServiceErorrException(message);
        }

        return new ResponseBuilderImpl()
                .status(Response.Status.OK)
                .type(MediaType.APPLICATION_JSON)
                .entity(userProfileJson)
                .build();
    }

    /**
     * Get the User's DN.
     *
     * @param request A request to get the user's DN.
     * @return
     * @throws IOException If something bad happens
     */
    @GET
    @Path("/dn")
    public Response getUserDN(@Context HttpServletRequest request)
            throws IOException {
        logger.info("Attempting to get User DN");
        String userDNJson = null;
        try {
            String userDN = ServiceClient.INSTANCE.getUserDNString(request);
            userDNJson = objectMapper.writeValueAsString(
                    new UserDn(userDN));
        } catch (IOException ex) {
            final String message = "Failed to get user DN!";
            logger.error(message, ex);
            throw new JsonInternalServiceErorrException(message);
        }
        return new ResponseBuilderImpl()
                .status(Response.Status.OK)
                .type(MediaType.APPLICATION_JSON)
                .entity(userDNJson)
                .build();
    }

    class UserDn {

        private String userDn;

        public UserDn(final String userDn) {
            this.userDn = userDn;
        }

        public String getUserDn() {
            return userDn;
        }

        public void setUserDn(String userDn) {
            this.userDn = userDn;
        }
    }

}
