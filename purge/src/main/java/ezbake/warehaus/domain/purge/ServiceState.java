package ezbake.warehaus.domain.purge;

import java.io.Serializable;
import java.util.Date;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlRootElement;

/**
 * <p>
 * The purge state for an application's service.
 * </p> 
 */
@XmlRootElement
@XmlAccessorType(XmlAccessType.FIELD)
public class ServiceState implements Serializable {

   private static final long serialVersionUID = 1L;
   
   private String serviceName;
   private String status;
   private Date initiatedTimestamp;
   private Date lastPollTimestamp;
   
   public ServiceState() {
   }
   
   public String getServiceName() {
      return serviceName;
   }
   
   public void setServiceName(String serviceName) {
      this.serviceName = serviceName;
   }
   
   public String getStatus() {
      return status;
   }
   
   public void setStatus(String status) {
      this.status = status;
   }
   
   public Date getInitiatedTimestamp() {
      return initiatedTimestamp;
   }
   
   public void setInitiatedTimestamp(Date initiatedTimestamp) {
      this.initiatedTimestamp = initiatedTimestamp;
   }
   
   public Date getLastPollTimestamp() {
      return lastPollTimestamp;
   }
   
   public void setLastPollTimestamp(Date lastPollTimestamp) {
      this.lastPollTimestamp = lastPollTimestamp;
   }

}
