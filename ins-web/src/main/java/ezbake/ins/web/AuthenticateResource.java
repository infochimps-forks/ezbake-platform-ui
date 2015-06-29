package ezbake.ins.web;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.ext.ContextResolver;

@Path("authenticate")
public class AuthenticateResource extends RegistrationResourceBase {

    @GET
    @Path("profile")
    @Produces(MediaType.APPLICATION_JSON)
    public UserInfo getProfile(@Context ContextResolver<ServiceClient> resource) {
    	ServiceClient serviceClient = getFromContext(resource);
        return checkAuthToken(serviceClient);
    }
}
