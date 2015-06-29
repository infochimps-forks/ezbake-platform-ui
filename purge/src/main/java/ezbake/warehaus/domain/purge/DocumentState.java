package ezbake.warehaus.domain.purge;

import java.io.Serializable;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlRootElement;

/**
 * <p>
 * Identifies a document that was submitted for purging and provides its current
 * status. The purge document id is the corresponding id used by the provenance
 * and central purge services.
 * </p>
 */
@XmlRootElement
@XmlAccessorType(XmlAccessType.FIELD)
public class DocumentState implements Serializable {

   private static final long serialVersionUID = 1L;
   
   private String uri;
   private Long purgeDocumentId;
   private PurgeDocumentStatus status;
   
   public DocumentState() {
   }
   
   public DocumentState(String uri, Long purgeDocumentId, PurgeDocumentStatus status) {
      
      this.uri = uri;
      this.purgeDocumentId = purgeDocumentId;
      this.status = status;
   }
   
   public String getUri() {
      return uri;
   }
   
   public void setUri(String uri) {
      this.uri = uri;
   }
   
   public Long getPurgeDocumentId() {
      return purgeDocumentId;
   }

   public void setPurgeDocumentId(Long purgeDocumentId) {
      this.purgeDocumentId = purgeDocumentId;
   }

   public PurgeDocumentStatus getStatus() {
      return status;
   }
   
   public void setStatus(PurgeDocumentStatus status) {
      this.status = status;
   }

   public enum PurgeDocumentStatus {
      
      NOT_FOUND,
      NOT_YET_PURGED,
      PURGED;
   }

}
