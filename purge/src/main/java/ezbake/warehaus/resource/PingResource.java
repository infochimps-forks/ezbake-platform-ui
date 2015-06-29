package ezbake.warehaus.resource;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.core.Response;

@Path("/ping")
public class PingResource {
   
   /**
    * <p>
    * Pings the API to make sure that it is available. This always returns an
    * OK response.
    * </p>
    */
   @GET
   public Response ping() {
      return Response.ok().build();
   }
}
