package ezbake.warehaus.domain.document;

import java.io.Serializable;
import java.util.Date;


public class EntryVersion implements Serializable {

   private static final long serialVersionUID = 1L;
   
   private String uri;
   private Date timestamp;
   private String classification;
   private String securityId;
   
   public EntryVersion() {
      
   }
   
   public EntryVersion(String uri, Date timestamp, String classification, String securityId) {
      
      this.setUri(uri);
      this.setTimestamp(timestamp);
      this.setClassification(classification);
      this.setSecurityId(securityId);
   }
   
   public String getUri() {
      return uri;
   }
   
   public void setUri(String uri) {
      this.uri = uri;
   }
   
   public Date getTimestamp() {
      return timestamp;
   }
   
   public void setTimestamp(Date timestamp) {
      this.timestamp = timestamp;
   }
   
   public String getClassification() {
      return classification;
   }
   
   public void setClassification(String classification) {
      this.classification = classification;
   }
   
   public String getSecurityId() {
      return securityId;
   }
   
   public void setSecurityId(String securityId) {
      this.securityId = securityId;
   }

}
