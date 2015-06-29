package ezbake.webservices;

import ezbake.webservices.exceptions.JsonInternalServiceErorrException;
import com.sun.jersey.core.spi.factory.ResponseBuilderImpl;
import ezbake.configuration.EzConfiguration;
import ezbake.configuration.EzConfigurationLoaderException;

import java.io.IOException;
import java.util.Properties;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import org.codehaus.jackson.map.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @author blong
 */
@Path("/ezconfiguration")
public class EzConfigurationService {

    private static final Logger logger = LoggerFactory.getLogger(EzConfigurationService.class);

    static final String REQUEST_KEY_PARAM = "propertyName";

    // Thread-safe and can be reused as long as we don't
    // need to change some serialization configuration.
    private final static ObjectMapper objectMapper = new ObjectMapper();

    private Properties clientVisibleProperties;

    public EzConfigurationService() throws EzConfigurationLoaderException {
        logger.debug(ServiceClient.STARS + "EzConfigurationService initialized" + ServiceClient.STARS);

        EzConfiguration ezConfiguration = new EzConfiguration();

        if (ezConfiguration.getProperties() == null) {
            final String message = "Can't initialize EzConfigurationService, EzConfiguration appears null";
            logger.error(message);
            throw new JsonInternalServiceErorrException(message);
        }

        Properties serverVisibleProperties = new Properties(ezConfiguration.getProperties());

        logger.info(ServiceClient.STARS + "EzConfigurationService initialized, with {} properties.",
                ezConfiguration.getProperties().size());

        Properties clientVisibleKeys = new Properties();

        try {
            clientVisibleKeys.load(Thread.currentThread().getContextClassLoader().getResourceAsStream("client-side.properties"));
        } catch (IOException ex) {
            final String message = "An error occurred loading the list of client-side properties!";
            logger.error(message, ex);
            throw new JsonInternalServiceErorrException(message);
        }
        logger.info("Contents of client-side.properties file:"
                + "\n"
                + clientVisibleKeys.toString());

        logger.debug("The following properties are marked as client-visibile:");
        clientVisibleProperties = new Properties();
        for (Object key : clientVisibleKeys.keySet()) {
            String clientKey = (String) key;
            logger.debug("Property: '" + clientKey + "' is client visible");
            String clientValue = serverVisibleProperties.getProperty(clientKey);
            if (clientValue == null || clientValue.isEmpty()) {
                final String message = "The client-visible property '"
                        + clientKey
                        + "' is not available in EzConfiguration!";
                logger.error(message);
                throw new WebApplicationException(new ResponseBuilderImpl()
                        .status(Response.Status.INTERNAL_SERVER_ERROR)
                        .entity(message)
                        .type(MediaType.APPLICATION_JSON)
                        .build());
            }
            clientVisibleProperties.setProperty(clientKey, clientValue);
        }
    }

    /**
     * Get ezConfiguration property given a key, or return all properties if no key provided.
     *
     * @param request A request, optionally containing a query parameter "propertyName".
     * @return A JSON representation of the property/properties. Note, simple String returned in the case of a single
     * property requested.
     * @throws IOException If something bad happens
     */
    @GET
    public Response doGet(@Context HttpServletRequest request)
            throws IOException {
        logger.info("Attempting to get (client-side) EzConfiguration data");

        String responseString;
        try {
            //A bug in getParameter doesn't like a common way to prevent caching, so we'll only call it
            //if we know our parameter was passed in
            if (request.getQueryString() != null && request.getQueryString().contains(REQUEST_KEY_PARAM)) {
                final String reqKey = request.getParameter(REQUEST_KEY_PARAM);
                logger.info("Processing ezConfiguration request, reqKey = <"
                        + reqKey
                        + ">");
                responseString = objectMapper.writeValueAsString(clientVisibleProperties.getProperty(reqKey));
            } else {
                responseString = objectMapper.writeValueAsString(clientVisibleProperties);
            }
        } catch (IOException ex) {
            final String message = "An error occurred converting EzConfiguration object to JSON!";
            logger.error(message, ex);
            throw new JsonInternalServiceErorrException(message);
        }
        return new ResponseBuilderImpl()
                .status(Response.Status.OK)
                .type(MediaType.APPLICATION_JSON)
                .entity(responseString)
                .build();
    }
}
