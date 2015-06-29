package ezbake.warehaus.resource;


import ezbake.services.centralPurge.thrift.CentralPurgeStatus;
import ezbake.services.provenance.thrift.PurgeInitiationResult;
import ezbake.warehaus.api.WarehausEntryApi;
import ezbake.warehaus.domain.purge.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

/**
 * <p>
 * This resource is responsible for providing RESTful interfacing to the Central
 * Purge service.
 * </p>
 */
@Path("/purge")
public class PurgeResource {
   
   private static Logger logger = LoggerFactory.getLogger(PurgeResource.class);
  
   /**
    * <p>
    * Initiates a purge event to delete the entries that are identified by the
    * list of URIs. The name and description describe the purge event for future
    * reference.
    * </p>
    * 
    * @param   purge A object detailing the purge being started
    * @return  A Response object that indicates success or failure.
    */
   @POST
   @Consumes(MediaType.APPLICATION_JSON)
   public Response purge(PurgeSubmit purge) {
      
      PurgeInitiationResult serviceResult = null;
      PurgeSubmitResult result = new PurgeSubmitResult();
      
      try {
         serviceResult = new WarehausEntryApi().removeEntries(purge.getName(), purge.getDescription(), purge.getUris());
      } catch (Exception e) {
         logger.error("An error occurred when submitting a purge request.", e);
         return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
      }
      
      result.setPurgeId(serviceResult.getPurgeId());
      result.setUrisNotFound(serviceResult.getUrisNotFound());
      result.setDescription(purge.getDescription());
      result.setName(purge.getName());
      
      return Response.ok(result).build();
   }
   
   /**
    * <p>
    * Returns the current purge state for the purge associated with the given
    * purgeId. If no corresponding purge state record can be found then null is
    * returned.
    * </p>
    * 
    * @param   purgeId The id of the purge. If no value is given then null is
    *          returned.
    * @return  A Response object that contains the CentralPurgeState object
    *          describing the state if successful.
    */
   @GET
   @Path("/status/{purgeId}")
   @Produces(MediaType.APPLICATION_JSON)
   public Response purgeStatus(@PathParam("purgeId") Long purgeId) {
      
      PurgeState state = null;
      
      try {
         state = new WarehausEntryApi().getPurgeState(purgeId);
      } catch (Exception e) {
         logger.error("An error occurred while fetching the purge state for purge id " + purgeId, e);
         return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).build();
      }
      
      if (state == null) {
         return Response.status(Response.Status.NOT_FOUND).build();
      }
      
      return Response.ok(state).build();
   }

    /**
     * <p>
     * Returns all the purges with the correct statuses and pageNumber
     * </p>
     *
     * @return  A Response object that contains a list of all the fitting purges
     */
    @POST
    @Path("/purgesListing/{pageNumber}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response purgesListing(Map<String,Boolean> statusIndices,@PathParam("pageNumber") int pageNumber) {
        PagedPurgeStates pagedPurgeStates;
        List<CentralPurgeStatus> statuses = new LinkedList<>();
        for(String key : statusIndices.keySet()) {
            if(statusIndices.get(key)){
                statuses.add(CentralPurgeStatus.valueOf(key));
            }
        }
        //statuses.add(CentralPurgeStatus.ACTIVE_MANUAL_INTERVENTION_WILL_BE_NEEDED);
        //statuses.add(CentralPurgeStatus.STOPPED_MANUAL_INTERVENTION_NEEDED);
        try {
            pagedPurgeStates = new WarehausEntryApi().getPurgesWithStatus(statuses, pageNumber);
        } catch (Exception e) {
            logger.error("An error occurred while fetching purges ", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).build();
        }

        if (pagedPurgeStates == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(pagedPurgeStates).build();
    }
    /**
     * <p>
     * Returns all the ageOffs with the correct statuses and pageNumber
     * </p>
     *
     * @return  A Response object that contains a list of all the fitting ageOff events
     */
    @POST
    @Path("/ageOffsListing/{pageNumber}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response ageOffsListing(Map<String,Boolean> statusIndices,@PathParam("pageNumber") int pageNumber) {
        PagedPurgeStates pagedPurgeStates;
        List<CentralPurgeStatus> statuses = new LinkedList<>();
        for(String key : statusIndices.keySet()) {
            if(statusIndices.get(key)){
                statuses.add(CentralPurgeStatus.valueOf(key));
            }
        }
        //statuses.add(CentralPurgeStatus.ACTIVE_MANUAL_INTERVENTION_WILL_BE_NEEDED);
        //statuses.add(CentralPurgeStatus.STOPPED_MANUAL_INTERVENTION_NEEDED);
        try {
            pagedPurgeStates = new WarehausEntryApi().getAgeOffEventsWithStatus(statuses, pageNumber);
        } catch (Exception e) {
            logger.error("An error occurred while fetching ageOffs", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).build();
        }

        if (pagedPurgeStates == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(pagedPurgeStates).build();
    }
    /**
     * <p>
     * Manually resolves a purge or ageOff event
     * </p>
     *
     * @return  A Response object that either says whether or not it completed successfully
     */
    @POST
    @Path("/resolvePurge")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response resolvePurge(ResolvePurgeSubmit purgeSubmit) {

        try {
            new WarehausEntryApi().resolvePurge(purgeSubmit.getPurgeId(), purgeSubmit.getResolveNote());
        } catch (Exception e) {
            logger.error("An error occurred while fetching the purges requiring manual intervention ", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).build();
        }

        return Response.ok().build();
    }
}