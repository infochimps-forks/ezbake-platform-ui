package ezbake.warehaus.domain.purge;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlRootElement;

/**
 * <p>
 * The collection of applications that are registered with the central purge
 * service and provides the purge state for each service.
 * </p>
 */
@XmlRootElement
@XmlAccessorType(XmlAccessType.FIELD)
public class ApplicationState implements Serializable {

   private static final long serialVersionUID = 1L;
   
   private String applicationName;
   private List<ServiceState> serviceStates;
   
   public String getApplicationName() {
      return applicationName;
   }
   
   public void setApplicationName(String applicationName) {
      this.applicationName = applicationName;
   }
   
   public List<ServiceState> getServiceStates() {
      return serviceStates;
   }
   
   public void setServiceStates(List<ServiceState> serviceStates) {
      this.serviceStates = serviceStates;
   }
   
   public void addServiceState(ServiceState serviceState) {
      
      if (this.serviceStates == null) {
         this.serviceStates = new ArrayList<ServiceState>();
      }
      this.serviceStates.add(serviceState);
   }
   
   public void addServiceState(String serviceName, String status, Date initiatedTimestamp, Date lastPollTimestamp){
      
      ServiceState ss = new ServiceState();
      ss.setInitiatedTimestamp(initiatedTimestamp);
      ss.setLastPollTimestamp(lastPollTimestamp);
      ss.setServiceName(serviceName);
      ss.setStatus(status);
      this.addServiceState(ss);
   }

}
