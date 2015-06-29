package ezbake.warehaus.domain.purge;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlRootElement;

@XmlRootElement
@XmlAccessorType(XmlAccessType.FIELD)
public class PurgeSubmitResult implements Serializable {
   
   private static final long serialVersionUID = 1L;
   
   private long purgeId;
   private List<String> urisNotFound = new ArrayList<String>();
   private String name;
   private String description;
   
   public long getPurgeId() {
      return purgeId;
   }
   
   public void setPurgeId(long purgeId) {
      this.purgeId = purgeId;
   }
   
   public boolean addUriNotFound(String uri) {
      return this.urisNotFound.add(uri);
   }
   
   public List<String> getUrisNotFound() {
      return urisNotFound;
   }
   
   public void setUrisNotFound(List<String> urisNotFound) {
      
      if (urisNotFound == null) {
         this.urisNotFound.clear();
      } else {
         this.urisNotFound = urisNotFound;
      }
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
   
 }
