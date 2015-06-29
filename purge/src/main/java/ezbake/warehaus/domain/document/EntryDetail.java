package ezbake.warehaus.domain.document;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlRootElement;

@XmlRootElement
@XmlAccessorType(XmlAccessType.FIELD)
public class EntryDetail implements Serializable {

   private static final long serialVersionUID = 1L;

   private String uri;
   private Map<String, String> metadata = new HashMap<String, String>();
   private List<EntryVersion> versions = new ArrayList<EntryVersion>();
   private boolean errorFetchingMetadata = false;
   
   public String getUri() {
      return uri;
   }
   
   public void setUri(String uri) {
      this.uri = uri;
   }
   
   public Map<String, String> getMetadata() {
      return metadata;
   }
   
   public void setMetadata(Map<String, String> metadata) {
      
      if (metadata == null) {
         this.metadata.clear();
      } else {
         this.metadata = metadata;
      }
   }
   
   public void addMetadata(String key, String value) {
      
      if (key != null) {
         this.metadata.put(key, value);
      }
   }
   
   public List<EntryVersion> getVersions() {
      return versions;
   }
   
   public void setVersions(List<EntryVersion> versions) {
      
      if (versions == null) {
         this.versions.clear();
      } else {
         this.versions = versions;
      }
   }
   
   public boolean addVersion(EntryVersion version) {
      
      if (version == null) return false;
      return this.versions.add(version);
   }

   public boolean isErrorFetchingMetadata() {
      return errorFetchingMetadata;
   }

   public void setErrorFetchingMetadata(boolean errorFetchingMetadata) {
      this.errorFetchingMetadata = errorFetchingMetadata;
   }
   
}
