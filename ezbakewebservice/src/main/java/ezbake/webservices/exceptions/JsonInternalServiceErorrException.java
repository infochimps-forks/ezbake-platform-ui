package ezbake.webservices.exceptions;

import com.sun.jersey.core.spi.factory.ResponseBuilderImpl;

import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

/**
 * @author blong
 */
public class JsonInternalServiceErorrException extends WebApplicationException {
    public JsonInternalServiceErorrException(final String errorMessage) {
        super(new ResponseBuilderImpl()
                .status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(errorMessage)
                .type(MediaType.APPLICATION_JSON)
                .build());
    }
}
