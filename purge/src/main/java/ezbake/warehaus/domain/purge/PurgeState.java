package ezbake.warehaus.domain.purge;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Map;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlRootElement;

import ezbake.data.common.TimeUtil;
import ezbake.services.centralPurge.thrift.ApplicationPurgeState;
import ezbake.services.centralPurge.thrift.ServicePurgeState;
import ezbake.warehaus.domain.purge.DocumentState.PurgeDocumentStatus;


/**
 * <p>
 * Represents the current state of a purge request. This structure reorganizes
 * the {@link ezbake.services.centralPurge.thrift.CentralPurgeState} class to
 * provide a consistent and simplified view of the data.
 * </p>
 * <p>
 * Use the {@link #addDocumentStates(Map, Collection, Collection)} method to
 * have the documentStates objects created in the expected manner.
 * </p>
 */
@XmlRootElement
@XmlAccessorType(XmlAccessType.FIELD)
public class PurgeState implements Serializable {

   private static final long serialVersionUID = 1L;

   private Long id;
   private String name;
   private String description;
   private String user;
   private Date timestamp;
   private boolean resolved;
   
   private String centralPurgeType;
   private String centralPurgeStatus;
   
   private List<DocumentState> documentStates = new ArrayList<DocumentState>();
   private List<ApplicationState> applicationStates = new ArrayList<ApplicationState>();
   

   /**
    * <p>
    * Constructs the collection of documents that were part of the purge request
    * and assigns the document with its proper status.
    * </p>
    * 
    * @param   purgeUriDocumentIdMap A map that corresponds a document's URI to
    *          the document purge Id. 
    * @param   purgedDocumentIds A collection of documents within the request that
    *          are already purged. The documents in this collection are identified
    *          by their document purge id.
    * @param   unfoundDocumentUris A collection of documents within the request
    *          that were not found. The documents in this collection are identified
    *          by their document URI.
    */
   public void addDocumentStates(Map<Long, String> purgeUriDocumentIdMap, Collection<Long> purgedDocumentIds, Collection<String> unfoundDocumentUris) {
      
      this.addDocumentStates(purgeUriDocumentIdMap);
      this.updateDocumentStatus(purgedDocumentIds, PurgeDocumentStatus.PURGED);
      this.addUnfoundDocumentUris(unfoundDocumentUris);
   }
   
   /**
    * <p>
    * A map that provides the application states. The key is the name of the
    * application and the value is the object listing the state of the
    * services within the application. 
    * </p>
    * 
    * @param   appStatesMap The map that provides the state for the purge
    *          request for each application registered with the purge service.
    */
   public void setApplicationStates(Map<String, ApplicationPurgeState> appStatesMap) {
      
      this.applicationStates.clear();
      
      if (appStatesMap == null) return;
      
      for (String appName : appStatesMap.keySet()) {
         
         ApplicationPurgeState purgeAppState = appStatesMap.get(appName);
         
         ApplicationState appState = new ApplicationState();
         appState.setApplicationName(appName);
         
         Map<String, ServicePurgeState> svcStatesMap = purgeAppState.getServicePurgestates();
         for (String svcName : svcStatesMap.keySet()) {
            ServicePurgeState purgeSvcState = svcStatesMap.get(svcName);
            appState.addServiceState(svcName, 
                  purgeSvcState.getPurgeState().getPurgeStatus().name(), 
                  new Date(TimeUtil.convertFromThriftDateTime(purgeSvcState.getTimeInitiated())),
                  new Date(TimeUtil.convertFromThriftDateTime(purgeSvcState.getTimeLastPoll())));
         }
         this.applicationStates.add(appState);
      }
   }
   
   private void addDocumentStates(Map<Long, String> purgeUriDocumentIdMap) {
      
      if (purgeUriDocumentIdMap == null) return;
      
      for (Long purgeDocumentId : purgeUriDocumentIdMap.keySet()) {
         String uri = purgeUriDocumentIdMap.get(purgeDocumentId);
         addDocumentState(purgeDocumentId, uri, PurgeDocumentStatus.NOT_YET_PURGED);
      }
   }
   
   private void addDocumentState(Long purgeDocumentId, String uri, PurgeDocumentStatus status) {
      
      DocumentState state = new DocumentState();
      state.setPurgeDocumentId(purgeDocumentId);
      state.setUri(uri);
      state.setStatus(status);
      
      if (documentStates == null) {
         documentStates = new ArrayList<DocumentState>();
      }
      documentStates.add(state);
   }
   
   private void updateDocumentStatus(Collection<Long> purgeDocumentIds, PurgeDocumentStatus status) {
      
      // TODO: Fix efficiency of this. Rushing. 
      if (purgeDocumentIds == null) return;
      for (Long id : purgeDocumentIds) {
         for (DocumentState docState : this.documentStates) {
            if (id.equals(docState.getPurgeDocumentId())) {
               docState.setStatus(status);
               break;
            }
         }
      }
   }
   
   private void addUnfoundDocumentUris(Collection<String> uris) {
      
      if (uris == null) return;
      for (String uri : uris) {
         addDocumentState(null, uri, PurgeDocumentStatus.NOT_FOUND);
      }
   }
   
   public Long getId() {
      return id;
   }
   
   public void setId(Long id) {
      this.id = id;
   }
   
   public String getName() {
      return name;
   }
   
   public void setName(String name) {
      this.name = name;
   }
   
   public String getDescription() {
      return description;
   }
   
   public void setDescription(String description) {
      this.description = description;
   }
   
   public String getUser() {
      return user;
   }
   
   public void setUser(String user) {
      this.user = user;
   }
   
   public Date getTimestamp() {
      return timestamp;
   }
   
   public void setTimestamp(Date timestamp) {
      this.timestamp = timestamp;
   }
   
   public boolean isResolved() {
      return resolved;
   }
   
   public void setResolved(boolean resolved) {
      this.resolved = resolved;
   }
   
   public String getCentralPurgeType() {
      return centralPurgeType;
   }
   
   public void setCentralPurgeType(String centralPurgeType) {
      this.centralPurgeType = centralPurgeType;
   }
   
   public String getCentralPurgeStatus() {
      return centralPurgeStatus;
   }
   
   public void setCentralPurgeStatus(String centralPurgeStatus) {
      this.centralPurgeStatus = centralPurgeStatus;
   }
   
   public List<DocumentState> getDocumentStates() {
      return documentStates;
   }
   
   public void setDocumentStates(List<DocumentState> documentStates) {
      
      if (documentStates == null) this.documentStates.clear();
      this.documentStates = documentStates;
   }
   
   public List<ApplicationState> getApplicationStates() {
      return applicationStates;
   }
   
   public void setApplicationStates(List<ApplicationState> applicationStates) {
      
      if (applicationStates == null) this.applicationStates.clear();
      this.applicationStates = applicationStates;
   }
   
}
