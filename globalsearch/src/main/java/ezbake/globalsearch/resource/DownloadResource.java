package ezbake.globalsearch.resource;

import ezbake.globalsearch.service.ServiceClient;

import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.ext.ContextResolver;

@Path("download")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class DownloadResource extends GlobalSearchResourceBase {

    @POST
    public String downloadDocument(String uri, @Context ContextResolver<ServiceClient> resource) {
        ServiceClient serviceClient = getFromContext(resource);
        return getDocumentFromWarehaus(uri, serviceClient).toString();
    }
}
