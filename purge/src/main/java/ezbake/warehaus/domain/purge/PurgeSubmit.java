package ezbake.warehaus.domain.purge;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlRootElement;


@XmlRootElement
@XmlAccessorType(XmlAccessType.FIELD)
public class PurgeSubmit implements Serializable {
   
   private static final long serialVersionUID = 1L;
   
   private String name;
   private String description;
   private List<String> uris = new ArrayList<String>();
   
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
   
   public List<String> getUris() {
      return uris;
   }
   
   public void setUris(List<String> uris) {
      this.uris = uris;
   }

}
