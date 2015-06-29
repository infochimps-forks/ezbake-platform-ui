package ezbake.warehaus.resource;

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import ezbake.warehaus.api.WarehausEntryApi;
import ezbake.warehaus.domain.document.EntryDetail;

/**
 * <p>
 * This resource is responsible for providing a RESTful interface to obtaining
 * warehaus entries.
 * </p>
 */
@Path("/entries")
public class EntryResource {
   
   private static Logger logger = LoggerFactory.getLogger(EntryResource.class);

   /**
    * <p>
    * Fetch the warehaus entry identified by the given URI.
    * </p>
    * 
    * @param   uri The URI of the warehaus entry to fetch. Required.
    * @return  The warehaus entry that is identified by the given uri or null if
    *          no corresponding entry was found.
    * @return  A response object that indicates success or failure.
    */
   @GET
   @Path("/{uri}")
   @Produces(MediaType.APPLICATION_JSON)
   public Response fetch(@PathParam("uri") String uri) {

      EntryDetail entry = null;
      
      try {
         uri = URLDecoder.decode(uri, "UTF-8");
      } catch (UnsupportedEncodingException e) {
         logger.error("An error occured while decoding the URI upon fetching an entry: " + uri, e);
         return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).build();
      }

      try {
         entry = new WarehausEntryApi().fetchEntry(uri);
      } catch (Exception e) {
         logger.error("An error occurred while fetching the URI from the warehaus: " + uri, e);
         return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).build();
      }
      
      if (entry == null) {
         return Response.status(Response.Status.NOT_FOUND).entity("The warehouse document " + uri + " was not found.").build();
      }
      return Response.ok(entry).build();
   }
}
