package ezbake.warehaus.api;

import com.google.common.collect.Lists;
import ezbake.base.thrift.EnterpriseMetaData;
import ezbake.base.thrift.EzSecurityToken;
import ezbake.base.thrift.EzSecurityTokenException;
import ezbake.base.thrift.SSR;
import ezbake.configuration.EzConfiguration;
import ezbake.configuration.EzConfigurationLoaderException;
import ezbake.data.common.TimeUtil;
import ezbake.data.elastic.thrift.Page;
import ezbake.data.elastic.thrift.Query;
import ezbake.security.client.EzbakeSecurityClient;
import ezbake.security.permissions.PermissionUtils;
import ezbake.services.centralPurge.thrift.*;
import ezbake.services.provenance.thrift.*;
import ezbake.services.search.SSRSearchResult;
import ezbake.services.search.ssrService;
import ezbake.services.search.SsrServiceConstants;
import ezbake.thrift.ThriftClientPool;
import ezbake.warehaus.EntryNotInWarehausException;
import ezbake.warehaus.VersionDetail;
import ezbake.warehaus.WarehausService;
import ezbake.warehaus.WarehausServiceConstants;
import ezbake.warehaus.domain.document.EntryVersion;
import ezbake.warehaus.domain.purge.PagedPurgeStates;
import ezbake.warehaus.domain.purge.PurgeState;
import org.apache.thrift.TException;
import org.elasticsearch.index.query.QueryBuilders;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;

/**
 * <p>
 * A class that handles requests to the Warehaus service.
 * </p> 
 */
public class WarehausEntryApi {

   protected static Logger logger = LoggerFactory.getLogger(WarehausEntryApi.class);
   
   private static EzConfiguration config;
   private static ThriftClientPool pool;
   private static EzbakeSecurityClient securityClient;
   
   static {
      try {
         config = new EzConfiguration();
      } catch (EzConfigurationLoaderException e) {
         logger.error("The properties could not be loaded.", e);
         throw new RuntimeException(e);
      }
      pool = new ThriftClientPool(config.getProperties());
      securityClient = new EzbakeSecurityClient(config.getProperties());
   }

   /**
    * <p>
    * Fetch the warehaus entry identified by the given URI.
    * </p>
    * 
    * @param   uri The URI of the warehaus entry to fetch. Required.
    * @return  The warehaus entry that is identified by the given uri or null
    *          if no corresponding entry was found.
    * @throws  TException If an error occurs while fetching the entry.
    */
   public ezbake.warehaus.domain.document.EntryDetail fetchEntry(String uri) throws TException {

      WarehausService.Client client = null;
      ezbake.warehaus.domain.document.EntryDetail entry = null;
      
      try {
         client = pool.getClient(WarehausServiceConstants.SERVICE_NAME, WarehausService.Client.class);
         ezbake.warehaus.EntryDetail warehausEntryDetail = client.getEntryDetails(uri, getToken(WarehausServiceConstants.SERVICE_NAME));
         if (warehausEntryDetail != null) {
            entry = new ezbake.warehaus.domain.document.EntryDetail();
            entry.setUri(warehausEntryDetail.getUri());
            List<EntryVersion> versions = Lists.newArrayList();
            
            for (VersionDetail wv : warehausEntryDetail.getVersions()) {
               EntryVersion ev = new EntryVersion();
               ev.setUri(wv.getUri());
               ev.setTimestamp(new Date(wv.getTimestamp()));
               ev.setClassification(PermissionUtils.getVisibilityString(wv.getVisibility()));
               ev.setSecurityId(wv.getSecurityId());
               versions.add(ev);
            }
            entry.setVersions(versions);
            try {
               entry.setMetadata(this.getMetadata(uri));
            } catch (TException e) {
               entry.setErrorFetchingMetadata(true);
               logger.error("An error occurred when fetching the metadata tags from SSR for document " + uri + ". Returning the document without its metadata.", e);
            }
         }
      } catch (EntryNotInWarehausException e) {
         logger.debug(e.getMessage());
      } finally {
         pool.returnToPool(client);
      }

      return entry;
   }
   
   /**
    * <p>
    * Deletes the warehaus entries that are identified by the list of URIs.
    * </p>
    * 
    * @param   name The unique name given to this purge instance as defined
    *          by the user who initiated the purge. Required.
    * @param   description A description of why the purge is occurring.
    *          Required.
    * @param   uris A list of URIs that identify the warehaus entries to
    *          delete.
    * @return  A result object that outlines the success and failure of the
    *          processing of the purged items.
    * @throws  TException If an error occurs while trying to connect to an
    *          external service. If the call to the central purge service
    *          results in an error.
    * @throws  EzSecurityTokenException If the security token results in an
    *          error. 
    */
   public PurgeInitiationResult removeEntries(String name, String description, List<String> uris) throws Exception {
      
      EzCentralPurgeService.Client client = null;
      PurgeInitiationResult result = null;
      try {
         client = pool.getClient(ezCentralPurgeServiceConstants.SERVICE_NAME, EzCentralPurgeService.Client.class);
         result = client.beginPurge(getToken(ezCentralPurgeServiceConstants.SERVICE_NAME), uris, name, description);
      } finally {
         pool.returnToPool(client);
      }
      return result;
   }
   
   /**
    * <p>
    * Gets the metadata associated with the given URI. If no metadata exists
    * for the URI or no match was found on the URI then an empty Map is 
    * returned.
    * </p>
    * 
    * @param   uri The URI for which the associated metadata is returned.
    *          Required. 
    * @return  A map of name / value pairs representing the metadata associated
    *          with the given URI. If no metadata or URI was found then an empty
    *          map is returned. 
    * @throws  TException If an error occurs when fetching the tags from SSR.
    */
   private Map<String, String> getMetadata(String uri) throws TException {
      
      ssrService.Client client = null;
      SSRSearchResult result = null;
      try {
         client = pool.getClient(SsrServiceConstants.SERVICE_NAME, ssrService.Client.class);
         String search = QueryBuilders.idsQuery().addIds(uri).toString();
         Query query = new Query().setSearchString(search).setPage(new Page().setOffset(0).setPageSize((short)5));
         result = client.searchSSR(query, getToken(SsrServiceConstants.SERVICE_NAME));
      } finally {
         pool.returnToPool(client);
      }
      
      if (result != null && result.getMatchingRecordsSize() > 0) {
         List<SSR> ssrList = result.getMatchingRecords();
         EnterpriseMetaData emd = ssrList.get(0).getMetaData();
         if (emd != null) {
            return emd.getTags();
         }
      }
      
      return new HashMap<String, String>();
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
    * @return  The state corresponding to the given purge record. Or, null if
    *          no purgeId was given or if not corresponding purge record was
    *          found.
    * @throws  TException If an error occurs in the purge service.
    */
   public PurgeState getPurgeState(Long purgeId) throws TException {
    
      if (purgeId == null) return null;

      PurgeState state = null;
      CentralPurgeState centralPurgeState = this.getCentralPurgeState(purgeId);

      if (centralPurgeState != null) {

          PurgeInfo purgeInfo = centralPurgeState.getPurgeInfo();

          // NOTE: Not null checking because the thrift elements are marked as required.

          state = new PurgeState();
          state.setId(purgeId);
          state.setName(purgeInfo.getName());
          state.setDescription(purgeInfo.getDescription());
          state.setUser(purgeInfo.getUser());
          state.setTimestamp(new Date(TimeUtil.convertFromThriftDateTime(purgeInfo.getTimeStamp())));
          state.setResolved(purgeInfo.isResolved());
          state.setCentralPurgeType(centralPurgeState.getCentralPurgeType().name());
          state.setCentralPurgeStatus(centralPurgeState.getCentralStatus().name());
          state.setApplicationStates(centralPurgeState.getApplicationStates());
          state.addDocumentStates(getPurgeDocumentUriMapping(purgeInfo.getPurgeDocumentIds()),
                  purgeInfo.getCompletelyPurgedDocumentIds(), purgeInfo.getDocumentUrisNotFound());
      } else {
          CentralAgeOffEventState centralAgeOffEventState = getCentralAgeOffEventState(purgeId);
          if (centralAgeOffEventState !=null){
              AgeOffEventInfo ageOffEventInfo = centralAgeOffEventState.getAgeOffEventInfo();
              state = new PurgeState();
              state.setId(purgeId);
              state.setName("AgeOff Event for AgeOff rule " + centralAgeOffEventState.getAgeOffRuleId());
              if(ageOffEventInfo.getDescription()!=null)
                  state.setDescription(ageOffEventInfo.getDescription());
              else
                  state.setDescription("*no description given*");
              state.setUser(ageOffEventInfo.getUser());
              state.setTimestamp(new Date(TimeUtil.convertFromThriftDateTime(ageOffEventInfo.getTimeCreated())));
              state.setResolved(ageOffEventInfo.isResolved());
              state.setCentralPurgeType("AgeOff Event");
              state.setCentralPurgeStatus(centralAgeOffEventState.getCentralStatus().name());
              state.setApplicationStates(centralAgeOffEventState.getApplicationStates());
              state.addDocumentStates(getPurgeDocumentUriMapping(ageOffEventInfo.getPurgeSet()),
                      ageOffEventInfo.getCompletelyPurgedSet(),new HashSet<String>());
          }
      }
      
      return state;
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
    * @return  The state corresponding to the given purge record. Or, null if
    *          no purgeId was given or if not corresponding purge record was
    *          found.
    * @throws  TException If an error occurs in the purge service.
    */
   private CentralPurgeState getCentralPurgeState(Long purgeId) throws TException {
      
      if (purgeId == null) {
         return null;
      }
      
      EzCentralPurgeService.Client client = null;
      CentralPurgeState purgeState = null;
      
      ArrayList<Long> purgeIds = new ArrayList<Long>();
      purgeIds.add(purgeId);
      
      try {
         client = pool.getClient(ezCentralPurgeServiceConstants.SERVICE_NAME, EzCentralPurgeService.Client.class);
         List<CentralPurgeState> results = client.getPurgeState(getToken(ezCentralPurgeServiceConstants.SERVICE_NAME), purgeIds);
         if (!results.isEmpty()) {
            purgeState = results.get(0);
         }
      } finally {
         pool.returnToPool(client);
      }
      
      return purgeState;
   }
    private CentralAgeOffEventState getCentralAgeOffEventState(Long purgeId) throws TException {

        if (purgeId == null) {
            return null;
        }

        EzCentralPurgeService.Client client = null;
        CentralAgeOffEventState purgeState = null;

        ArrayList<Long> purgeIds = new ArrayList<Long>();
        purgeIds.add(purgeId);

        try {
            client = pool.getClient(ezCentralPurgeServiceConstants.SERVICE_NAME, EzCentralPurgeService.Client.class);
            List<CentralAgeOffEventState> results = client.getAgeOffEventState(getToken(ezCentralPurgeServiceConstants.SERVICE_NAME), purgeIds);
            if (!results.isEmpty()) {
                purgeState = results.get(0);
            }
        } finally {
            pool.returnToPool(client);
        }

        return purgeState;
    }
   
   /**
    * <p>
    * Given a set of ids, return a mapping of ids to URIs.
    * </p>
    * 
    * @param   purgeDocumentIds All of he id of URIs used by the purge service that
    *          are referenced in a single purge request. Required.
    * @return  A map where the value is the URI.
    * @throws  TException If an error occurs when translating the bitvector
    *          from the provenance service.
    */
   private Map<Long, String> getPurgeDocumentUriMapping(Set<Long> purgeDocumentIds) throws TException {
      
      ProvenanceService.Client client = null;
      try {
         client = pool.getClient(ProvenanceServiceConstants.SERVICE_NAME, ProvenanceService.Client.class);
      } finally {
         if (pool != null) pool.close();
      }
      ArrayList<Long> purgeDocumentIdsList = new ArrayList<Long>();
      purgeDocumentIdsList.addAll(purgeDocumentIds);
      PositionsToUris uriPositions = client.getDocumentUriFromId(getToken(ProvenanceServiceConstants.SERVICE_NAME), purgeDocumentIdsList);
      
      return uriPositions.getMapping();
   }
   
   /**
    * <p>
    * Retrieves the security token pertaining to this registered application
    * from the ezbake security service.
    * </p>
    * 
    * @param  serviceName The name of the service from where the security id
    *         should originate. Required.
    * @return The security token.
    * @throws TException 
    */
   private EzSecurityToken getToken(String serviceName) throws TException {
      
      return securityClient.fetchTokenForProxiedUser(pool.getSecurityId(serviceName));
   }

    public PagedPurgeStates getPurgesWithStatus(List<CentralPurgeStatus> statuses,int pageNumber) throws TException{
        List<PurgeState> purgesFittingStatuses = new ArrayList<>();

        EzCentralPurgeService.Client centralPurgeClient = null;
        PurgeInitiationResult result = null;
        PagedPurgeStates pagedPurgeStates;
        try {
            pagedPurgeStates = new PagedPurgeStates();
            centralPurgeClient = pool.getClient(ezCentralPurgeServiceConstants.SERVICE_NAME, EzCentralPurgeService.Client.class);
            CentralPurgeQueryResults centralPurgeQueryResults =centralPurgeClient.getPagedSortedFilteredPurgeStates(getToken(ezCentralPurgeServiceConstants.SERVICE_NAME), statuses, pageNumber, 10);

            List<CentralPurgeState> allPurgeStates = centralPurgeQueryResults.getPurgeStates();
            for(CentralPurgeState centralPurgeState : allPurgeStates){
                PurgeInfo purgeInfo = centralPurgeState.getPurgeInfo();
                PurgeState state = new PurgeState();
                state.setId(purgeInfo.getId());
                state.setName(purgeInfo.getName());
                state.setDescription(purgeInfo.getDescription());
                state.setUser(purgeInfo.getUser());
                state.setTimestamp(new Date(TimeUtil.convertFromThriftDateTime(purgeInfo.getTimeStamp())));
                state.setResolved(purgeInfo.isResolved());
                state.setCentralPurgeType(centralPurgeState.getCentralPurgeType().name());
                state.setCentralPurgeStatus(centralPurgeState.getCentralStatus().name());
                //state.setApplicationStates(centralPurgeState.getApplicationStates());
                //state.addDocumentStates(getPurgeDocumentUriMapping(purgeInfo.getPurgeDocumentIds()),
                //        purgeInfo.getCompletelyPurgedDocumentIds(), purgeInfo.getDocumentUrisNotFound());
                purgesFittingStatuses.add(state);

            }
            pagedPurgeStates.setCount(centralPurgeQueryResults.getCount());
            pagedPurgeStates.setPurgeStates(purgesFittingStatuses);
        } finally {
            if(centralPurgeClient!= null)
                pool.returnToPool(centralPurgeClient);
        }

        return pagedPurgeStates;
    }
    public PagedPurgeStates getAgeOffEventsWithStatus(List<CentralPurgeStatus> statuses,int pageNumber) throws TException{
        List<PurgeState> purgesFittingStatuses = new ArrayList<>();

        EzCentralPurgeService.Client centralPurgeClient = null;
        ProvenanceService.Client provenanceClient = null;;
        PagedPurgeStates pagedPurgeStates;
        try {
            pagedPurgeStates = new PagedPurgeStates();
            centralPurgeClient = pool.getClient(ezCentralPurgeServiceConstants.SERVICE_NAME, EzCentralPurgeService.Client.class);

            CentralAgeOffEventQueryResults centralAgeOffEventQueryResults = centralPurgeClient.getPagedSortedFilteredAgeOffEventStates(getToken(ezCentralPurgeServiceConstants.SERVICE_NAME),statuses, pageNumber,10);
            List<CentralAgeOffEventState> allAgeOffEventStates = centralAgeOffEventQueryResults.getAgeOffEventStates();
            for(CentralAgeOffEventState centralAgeOffEventState : allAgeOffEventStates){
                AgeOffEventInfo ageOffEventInfo = centralAgeOffEventState.getAgeOffEventInfo();
                PurgeState state = new PurgeState();
                state.setId(ageOffEventInfo.getId());
                state.setName("AgeOff Event for AgeOff rule " + centralAgeOffEventState.getAgeOffRuleId());
                if(ageOffEventInfo.getDescription()!=null)
                    state.setDescription(ageOffEventInfo.getDescription());
                else
                    state.setDescription("*no description given*");
                state.setUser(ageOffEventInfo.getUser());
                state.setTimestamp(new Date(TimeUtil.convertFromThriftDateTime(ageOffEventInfo.getTimeCreated())));
                state.setResolved(ageOffEventInfo.isResolved());
                state.setCentralPurgeType("AgeOff Event");
                state.setCentralPurgeStatus(centralAgeOffEventState.getCentralStatus().name());
                //state.setApplicationStates(centralAgeOffEventState.getApplicationStates());
                //state.addDocumentStates(getPurgeDocumentUriMapping(ageOffEventInfo.getPurgeSet()),
                //        ageOffEventInfo.getCompletelyPurgedSet(),new HashSet<String>());
                purgesFittingStatuses.add(state);
            }
            pagedPurgeStates.setCount(centralAgeOffEventQueryResults.getCount());
            pagedPurgeStates.setPurgeStates(purgesFittingStatuses);
        } finally {
            if(centralPurgeClient!= null)
                pool.returnToPool(centralPurgeClient);
            if(provenanceClient != null)
                pool.returnToPool(provenanceClient);
        }
        return pagedPurgeStates;
    }
    /**
     * <p>
     * Given a set of ids, return a mapping of ids to URIs.
     * </p>
     *
     * @throws  TException If an error occurs when translating the bitvector
     *          from the provenance service.
     */
    public void resolvePurge(Long purgeId,String resolveNote) throws TException {

        EzCentralPurgeService.Client centralPurgeClient = null;
        try {
            centralPurgeClient = pool.getClient(ezCentralPurgeServiceConstants.SERVICE_NAME, EzCentralPurgeService.Client.class);
            try {
                centralPurgeClient.resolvePurge(getToken(ezCentralPurgeServiceConstants.SERVICE_NAME), purgeId, resolveNote);
            } catch (CentralPurgeServiceException e){
                centralPurgeClient.resolveAgeOffEvent(getToken(ezCentralPurgeServiceConstants.SERVICE_NAME), purgeId, resolveNote);
            }
        } finally {
            if (pool != null) pool.close();
        }

    }
}
