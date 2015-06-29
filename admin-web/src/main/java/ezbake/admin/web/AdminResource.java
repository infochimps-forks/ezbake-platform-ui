/*   Copyright (C) 2013-2015 Computer Sciences Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License. */

package ezbake.admin.web;

import static ezbake.deployer.utilities.ArtifactHelpers.getAppId;
import static ezbake.deployer.utilities.ArtifactHelpers.getSecurityId;
import static ezbake.deployer.utilities.ArtifactHelpers.getServiceId;
import static ezbake.util.AuditEvent.event;

import java.util.*;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;
import javax.ws.rs.ext.ContextResolver;

import com.google.common.base.Predicate;
import com.google.common.collect.Collections2;
import com.google.common.collect.Lists;

import org.apache.thrift.TException;

import com.google.common.annotations.VisibleForTesting;
import com.google.common.base.Joiner;
import com.google.common.base.Strings;
import com.google.common.collect.Sets;

import ezbake.base.thrift.EzSecurityToken;
import ezbake.base.thrift.EzSecurityTokenException;
import ezbake.configuration.EzConfigurationLoaderException;
import ezbake.groups.thrift.EzGroupNamesConstants;
import ezbake.groups.thrift.EzGroups;
import ezbake.groups.thrift.EzGroupsConstants;
import ezbake.groups.thrift.GroupInheritancePermissions;
import ezbake.groups.thrift.UserGroupPermissions;
import ezbake.ins.thrift.gen.Application;
import ezbake.ins.thrift.gen.ApplicationNotFoundException;
import ezbake.ins.thrift.gen.InternalNameService;
import ezbake.ins.thrift.gen.JobRegistration;
import ezbake.ins.thrift.gen.ListenerPipeline;
import ezbake.security.common.core.SecurityID;
import ezbake.security.thrift.ApplicationRegistration;
import ezbake.security.thrift.EzSecurityRegistration;
import ezbake.security.thrift.RegistrationException;
import ezbake.security.thrift.RegistrationStatus;
import ezbake.security.thrift.SecurityIDNotFoundException;
import ezbake.services.deploy.thrift.ArtifactManifest;
import ezbake.services.deploy.thrift.DeploymentException;
import ezbake.services.deploy.thrift.DeploymentMetadata;
import ezbake.services.deploy.thrift.DeploymentStatus;
import ezbake.services.deploy.thrift.EzBakeServiceDeployer;
import ezbake.util.AuditEvent;
import ezbake.util.AuditEventType;
import ezbake.util.AuditLogger;

import org.apache.thrift.transport.TTransportException;

@Path("/admin")
public class AdminResource extends AdminResourceBase {
    private static final String STATUS_FIELD_NAME = "status";
	private static final String DEPLOYMENT_QUERY_TERM = "security-id";
    private static final String ADMINS_CAN_DEPLOY_PROPERTY = "ins.admin.web.admin.self.deploy";
	private static Map<String, Set<FutureExtended<String>>> futures = new ConcurrentHashMap<>();
	private static AuditLogger auditLogger;

    @VisibleForTesting
    AdminResource(AuditLogger logger) {
        auditLogger = logger;
    }

	public AdminResource() {
		if(auditLogger == null) {
			try {
				auditLogger = AuditLogger.getDefaultAuditLogger(AdminResource.class);
			} catch (EzConfigurationLoaderException e) {
				logger.error("Failed to initialize AuditLogger", e);
				throw new WebApplicationException(Response.Status.INTERNAL_SERVER_ERROR);
			}
		}
	}
    
	
	/**
	 * Approve/Denied registered application
	 *
	 * @param appSecId - Application's security id
	 * @param isApproved - true for approved, false for denied
	 * @return http code 200 on success
	 */
	@POST
	@Path("/registerApp/{appSecId}/{isApproved}")
	public Response registerApp(@PathParam("appSecId") String appSecId,
								@PathParam("isApproved") boolean isApproved,
                                @Context ContextResolver<ServiceClient> resource) {
		
		AuditEvent eventUserGroup = null, eventRegistration = null;
		
		EzSecurityRegistration.Client client = null;
        ServiceClient serviceClient = getFromContext(resource);
        
		try {
			client =  getEzSecurityRegistrationServiceClient(serviceClient);
			EzSecurityToken ezToken = getRegistrationSecurityToken(serviceClient);
			ApplicationRegistration appReg =  client.getRegistration(ezToken, appSecId);
			Application app = getInsInfo(null, appSecId, serviceClient);
			
			if(isCurrentAppAdmin(app, serviceClient)) {
				return Response.status(Status.FORBIDDEN).build();
			}

			String msg = auditTrailLogger(ezToken, isApproved, appReg.getAppName(), appSecId, "Application Authorizations");
			eventUserGroup = event(AuditEventType.UserGroupMgmtAdd.name(), ezToken).arg("ApplicationRegistration", "appReg");
			eventRegistration = event(AuditEventType.FileObjectPermissionModifications.name(), ezToken).arg("Application Security Id", appSecId);
			
			if(isApproved) {
                addUsersAndGroups(app, appReg, serviceClient);
                client.promote(ezToken, appSecId);
                logger.info(msg);
			} else {
                client.denyApp(ezToken, appSecId);
                logger.info(msg);
			}

			return Response.status(Status.OK).build();

		} catch (RegistrationException e) {
			logger.error("General Registration Exception", e);
			eventFailed(eventRegistration, e);
			throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		} catch (SecurityIDNotFoundException e) {
			logger.error("Invalid Security ID", e);
            eventFailed(eventRegistration, e);
			throw new WebApplicationException(Status.FORBIDDEN);
		} catch (TException e) {
			logger.error("General Thrift Exception", e);
            eventFailed(eventUserGroup, e);
            eventFailed(eventRegistration, e);
            client = invalidateServiceClient(client, serviceClient);
			throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		} catch (Exception e) {
			auditLogger.log("General Exception", e);
			throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		}
	    finally {
			freeServiceClient(client, serviceClient);
			logEvent(eventUserGroup);
			logEvent(eventRegistration);
		}

	}
	
	/**
	 * Query Registration service for all applications with given registration status
	 * Enrich registration result with Internal Name Service data 
	 * 
	 * @param status - Any status that matches RegistrationStatus
	 * @return all applications from registration service for given status 
	 */
	@GET
	@Path("/registeredApps/{status}")
	@Produces(MediaType.APPLICATION_JSON)
	public Set<RegistrationData>  getListOfAppsFromRegistration(@PathParam("status") String status,
                                                                @Context ContextResolver<ServiceClient> resource) {
		EzSecurityRegistration.Client client = null;
		RegistrationStatus regStatus = RegistrationStatus.valueOf(status);
		ServiceClient serviceClient = getFromContext(resource);
		try {
			client =  getEzSecurityRegistrationServiceClient(serviceClient);
			EzSecurityToken ezToken = getRegistrationSecurityToken(serviceClient);

			Set<RegistrationData> regDataSet = new HashSet<>();
			List<ApplicationRegistration> allRegs = client.getAllRegistrations(ezToken, regStatus);

			for(ApplicationRegistration appReg : allRegs) {
                Application app = getInsInfo(appReg, null, serviceClient);
                List<String> communityAuthorizations;
                if (app.isSetCommunityAuthorizations()) {
                    communityAuthorizations = Lists.newArrayList(app.getCommunityAuthorizations());
                } else {
                    communityAuthorizations = new ArrayList<>();
                }
				regDataSet.add( new RegistrationData( 	appReg.getAppName(), appReg.getId(),
													 	appReg.getAuthorizations(), app.getPoc(),
													 	getTopics(app), app.getJobRegistrations(),
                                                        isCurrentAppAdmin(app, serviceClient),
                                                        communityAuthorizations));
			}
			
			return regDataSet;
		} catch (RegistrationException e) {
			logger.error("General Registration Exception", e);
			throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		} catch (TException e) {
			logger.error("General Thrift Exception", e);
            client = invalidateServiceClient(client, serviceClient);
			throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		}  catch (IllegalArgumentException e) {
			logger.error("Invalid status", e);
			throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		} finally {
			freeServiceClient(client, serviceClient);
		}
	}

	/**
     * Query EzDeployer for all applications with given status 
     * 
     * @param status status
     * @return Set of all application from deployer with given status
     */
	@GET
	@Path("/deploymentApps/{status}")
	@Produces(MediaType.APPLICATION_JSON)
	public  Map<String, Set<PackageMetadata>> getListOfAppsFromDeployer(@PathParam("status") String status,
                                                                        @Context ContextResolver<ServiceClient> resource) {
	  	EzBakeServiceDeployer.Client deployerClient = null;
	  	DeploymentStatus.valueOf(status);
		ServiceClient serviceClient = getFromContext(resource);
		try {
			deployerClient = getEzDeployerServiceClient(serviceClient);
			EzSecurityToken deployerEzToken = getDeployerSecurityToken(serviceClient);

			String appId;
			String appSecId;
			String serviceId;
			
			Map<String, Set<PackageMetadata>> result = new HashMap<>();
			List<DeploymentMetadata> list = deployerClient.listDeployed(STATUS_FIELD_NAME,
					status, deployerEzToken);
			
			for(DeploymentMetadata meta : list) {
                //The way the filters work, it will return any app that has any packages in a given status,
                //but we only want to show those packages in the current status, so we have to filter again here
				if (meta.getStatus().toString().equals(status)) {
					ArtifactManifest manifest = meta.getManifest();
                    appId = getAppId(meta);
                    appSecId = getSecurityId(meta);
                    serviceId = getServiceId(meta);
                    
                    Application app = getInsInfo(null, appSecId, serviceClient);
                    String poc = app.getPoc();
                    boolean isCurrentAppAdmin = isCurrentAppAdmin(app, serviceClient);
                    
                     if(result.containsKey(appSecId)) {
                         result.get(appSecId).add(new PackageMetadata( appId, appSecId, serviceId, poc, status, manifest, isCurrentAppAdmin));
                     } else {
                         Set<PackageMetadata> pkg = new HashSet<>();
                         pkg.add(new PackageMetadata(appId, appSecId, serviceId, poc, status, manifest, isCurrentAppAdmin));
                         result.put(appSecId, pkg);
                     }
                }
			}
			
			return result;
		}  catch (DeploymentException e) {
			logger.error("EzDeployer Exception", e);
            throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		} catch (ApplicationNotFoundException e) {
			logger.error("Application Not Found Exception", e);
			throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR); 
		} catch (TException e) {
			logger.error("General Thrift Exception", e);
            deployerClient = invalidateServiceClient(deployerClient, serviceClient);
            throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		} catch (IllegalArgumentException e) {
			logger.error("Invalid status", e);
			throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		} finally {
			freeServiceClient(deployerClient, serviceClient);
		}
	}
	
	/**
	 * Approve/Deploy application
	 *
	 * @param appSecId - The app's security id
	 * @param isApproved - if true -> deploy to prod otherwise set status STATUS_DENIED
	 * @return http code 200 on success
	 */
    @POST
	@Path("/deployApp/{appSecId}/{isApproved}/{status}")
	public Response deployApp(@PathParam("appSecId") String appSecId, @PathParam("isApproved") boolean isApproved,
                              @PathParam("status") String status, @Context ContextResolver<ServiceClient> resource)
    {
	  	EzBakeServiceDeployer.Client client = null;
		ServiceClient serviceClient = getFromContext(resource);
        DeploymentStatus requestedStatus =  DeploymentStatus.valueOf(status);
        AuditEvent eventDeployment = null; 
		try {
			client = getEzDeployerServiceClient(serviceClient);
			EzSecurityToken deployerEzToken = getDeployerSecurityToken(serviceClient);
			
			if((requestedStatus == DeploymentStatus.Staged) && isCurrentAppAdmin(getInsInfo(null, appSecId, serviceClient), serviceClient)) {
				return Response.status(Status.FORBIDDEN).build();
			}
			
			List<DeploymentMetadata> allPackages = client.listDeployed(DEPLOYMENT_QUERY_TERM, appSecId, deployerEzToken);
            ExecutorService es = Executors.newSingleThreadExecutor();

			for(final DeploymentMetadata pkg : allPackages) {
				eventDeployment = event(AuditEventType.FileObjectModify.name(), deployerEzToken).arg("Application Id", getAppId(pkg))
						.arg("Service Id", getServiceId(pkg))
						.arg("Status", pkg.getStatus())
						.arg("Is Approved", isApproved);
				
                //We only want to update packages that have the status the admin is looking at
                //For example, you could have a staged package and a denied package.  If the admin is looking at the
                //staged tab, we only want to operate on the package that is staged.
                if (pkg.getStatus() == requestedStatus) {
                    if (isApproved) {
                        asyncDeploy(es, appSecId, getAppId(pkg), getServiceId(pkg), deployerEzToken, serviceClient);
                    } else if (pkg.getStatus() == DeploymentStatus.Staged) {
                        client.unstageServiceDeployment(getAppId(pkg), getServiceId(pkg), deployerEzToken);
                    } else {
                        client.undeploy(getAppId(pkg), getServiceId(pkg), deployerEzToken);
                    }
                    logger.info(auditTrailLogger(deployerEzToken, isApproved, getAppId(pkg), getServiceId(pkg), "Service Deployment"));
                    auditLogger.log(auditTrailLogger(deployerEzToken, isApproved, getAppId(pkg), getServiceId(pkg), "Service Deployment"));
                }
			}
			
			return Response.status(Status.OK).build();
		} catch (DeploymentException e) {
			logger.error("EzDeployer Exception", e);
			eventFailed(eventDeployment, e);
            throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		} catch (TException e) {
			logger.error("General Thrift Exception", e);
			eventFailed(eventDeployment, e);
            client = invalidateServiceClient(client, serviceClient);
            throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		} finally {
			freeServiceClient(client, serviceClient);
			logEvent(eventDeployment);
		}
    }
    
    /**
	 * Delete undeployed application along with all services permanently from the store.
	 * Every service under given application must be of Undeployed DeploymentStatus,
	 * 
	 * @param appSecId - application security id
	 * @return HTTP response status
	 */
	  @DELETE
	  @Path("/deleteApp/{appSecId}")
	  public Response deleteApp(@PathParam("appSecId") String appSecId, @Context ContextResolver<ServiceClient> resource) {
		  EzBakeServiceDeployer.Client client = null;
          ServiceClient serviceClient = getFromContext(resource);
          AuditEvent eventDelete = null;
		  try {
			  client = getEzDeployerServiceClient(serviceClient);
			  EzSecurityToken token = getDeployerSecurityToken(serviceClient);
			
			  if(isCurrentAppAdmin(getInsInfo(null, appSecId, serviceClient), serviceClient)) {
				  return Response.status(Status.FORBIDDEN).build();
			}

			// get all services for given application security id
			List<DeploymentMetadata> metadatas = client.listDeployed(DEPLOYMENT_QUERY_TERM, appSecId, token);

			for(DeploymentMetadata metadata : metadatas) {
				
				// if any of the services has status other than undeployed or denied then abort
				if(metadata.getStatus() != DeploymentStatus.Undeployed && metadata.getStatus() != DeploymentStatus.Denied) {
                    logger.error("\nFailed to delete application {}.\nService id {} has status {}.\nExpected {}.",
                            metadata.getManifest().getApplicationInfo().getApplicationId(),
                            metadata.getManifest().getApplicationInfo().getServiceId(),
                            metadata.getStatus(),
                            DeploymentStatus.Undeployed.name());
                    return Response.status(Status.BAD_REQUEST).build();
                }
			}
			
			// delete all
			for(DeploymentMetadata metadata : metadatas) {
				eventDelete = event(AuditEventType.FileObjectDelete.name(), token).arg("Application Id", getAppId(metadata)).arg("Service Id", getServiceId(metadata));
				client.deleteArtifact(getAppId(metadata), getServiceId(metadata), token);
			}

			return Response.status(Status.OK).build();
			
		  } catch (DeploymentException e) {
			logger.error("EzDeployer Exception", e);
			eventFailed(eventDelete, e);
			throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		  } catch (TException e) {
			logger.error("General Thrift Exception", e);
			eventFailed(eventDelete, e);
            client = invalidateServiceClient(client, serviceClient);
            throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		  }
		finally {
			freeServiceClient(client, serviceClient);
			logEvent(eventDelete);
		}
	}

    /**
	 * Undeploy a service in an application.
	 *
	 * @param appSecId - application security id
	 * @param appServiceId - application service id
     * @param isDeployed - true to deploy the service, false to undeploy
	 * @return HTTP response status
	 */
    @POST
    @Path("/appServiceDeployment/{appSecId}/{appServiceId}/{isDeployed}")
    public Response setServiceDeployState(@PathParam("appSecId") String appSecId,
			      @PathParam("appServiceId") String appServiceId,
			      @PathParam("isDeployed") boolean isDeployed,
			      @Context ContextResolver<ServiceClient> resource) {
        EzBakeServiceDeployer.Client client = null;
        ServiceClient serviceClient = getFromContext(resource);
        AuditEvent eventUndeploy = null;
        try {
            client = getEzDeployerServiceClient(serviceClient);
            EzSecurityToken token = getDeployerSecurityToken(serviceClient);

            // get all services for given application security id
            List<DeploymentMetadata> metadatas = client.listDeployed(DEPLOYMENT_QUERY_TERM, appSecId, token);

            final String svcIdFinal = appServiceId;
            Collection<DeploymentMetadata> matchedServices = Collections2.filter(
                    metadatas, new Predicate<DeploymentMetadata>() {
                        @Override
                        public boolean apply(DeploymentMetadata metadata) {
                            return metadata.getManifest().getApplicationInfo().getServiceId().equals(svcIdFinal);
                        }
                    });
            if (matchedServices.iterator().hasNext()) {
                DeploymentMetadata metadata = matchedServices.iterator().next();
                if (isDeployed == false) {

                    // if the service is not in Deployed status then abort
                    if (metadata.getStatus() != DeploymentStatus.Deployed) {
                        logger.error("\nFailed to undeploy service {} from application {}.\n{} has status {}.\nExpected {}.",
                                appServiceId,
                                appSecId,
                                appServiceId,
                                metadata.getStatus(),
                                DeploymentStatus.Deployed.name());
                        return Response.status(Status.BAD_REQUEST).build();
                    }
                    eventUndeploy = event(AuditEventType.FileObjectDelete.name(), token).arg("Application Id", getAppId(metadata)).arg("Service Id", getServiceId(metadata));
                    client.undeploy(appSecId, appServiceId, token);
                } else {
                    // Not implemented now
                    return Response.status(Status.SERVICE_UNAVAILABLE).build();
                }
            } else {
                logger.error("No deployed artifact with ID " + appServiceId + " found");
                return Response.status(Status.BAD_REQUEST).build();
            }

            return Response.status(Status.OK).build();

        } catch (DeploymentException e) {
            logger.error("EzDeployer Exception", e);
            eventFailed(eventUndeploy, e);
            throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);

        } catch (TException e) {
            logger.error("General Thrift Exception", e);
            eventFailed(eventUndeploy, e);
            client = invalidateServiceClient(client, serviceClient);
            throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
        } finally {
            freeServiceClient(client, serviceClient);
            logEvent(eventUndeploy);
        }
    }

    @GET
    @Path("/applicationRegistrationDetails/{appSecId}")
    @Produces(MediaType.APPLICATION_JSON)
    public Application getApplicationRegistrationDetails(@PathParam("appSecId") String appSecId,
                                                         @Context ContextResolver<ServiceClient> resource) {
        try {
            return getInsInfo(null, appSecId, getFromContext(resource));
        } catch (Exception e) {
        	logger.error("Failed to get application", e);
            throw new WebApplicationException(Response.Status.INTERNAL_SERVER_ERROR);
        }
    }
    
    @GET
    @Path("/systemTopics")
    @Produces(MediaType.APPLICATION_JSON)
    public Set<String> getSystemTopics(@Context ContextResolver<ServiceClient> resource) {
        InternalNameService.Client client = null;
        ServiceClient serviceClient = getFromContext(resource);
        try {
            client = getINSServiceClient(serviceClient);
            return client.getSystemTopics();
        } catch (Exception ex) {
        	logger.error("Failed to get system topics", ex);
            client = invalidateServiceClient(client, serviceClient, ex);
            throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
        } finally {
        	freeServiceClient(client, serviceClient);
        }
    }

    @POST
    @Path("/systemTopics/{systemTopic}")
    public Set<String> addSystemTopic(@PathParam("systemTopic") String systemTopic, @Context ContextResolver<ServiceClient> resource) {
    	EzSecurityToken ezToken;
        InternalNameService.Client client = null;
        ServiceClient serviceClient = getFromContext(resource);
        AuditEvent eventSystemTopic = null;
        
        try {
        	ezToken = getSecurityToken(serviceClient);
            client = getINSServiceClient(serviceClient);
            
            eventSystemTopic = event(AuditEventType.FileObjectCreate.name(), ezToken).arg("System Topic", systemTopic);
            client.addSystemTopic(systemTopic, ezToken);
            
            return client.getSystemTopics();
        } catch (Exception e) {
        	logger.error("Failed to add system topics", e);
            eventFailed(eventSystemTopic, e);
            client = invalidateServiceClient(client, serviceClient, e);
            throw new WebApplicationException(Response.Status.INTERNAL_SERVER_ERROR);
        } finally {
        	freeServiceClient(client, serviceClient);
        	logEvent(eventSystemTopic);
        }
    }

    @DELETE
    @Path("/systemTopics/{systemTopic}")
    public Set<String> deleteSystemTopic(@PathParam("systemTopic") String systemTopic,
                                         @Context ContextResolver<ServiceClient> resource) {
    	EzSecurityToken ezToken;
        InternalNameService.Client client = null;
        ServiceClient serviceClient = getFromContext(resource);
        AuditEvent eventSystemTopic = null;
        try {
        	ezToken = getSecurityToken(serviceClient);
            client = getINSServiceClient(serviceClient);
            
            eventSystemTopic = event(AuditEventType.FileObjectDelete.name(), ezToken).arg("System Topic", systemTopic);
            client.removeSystemTopic(systemTopic, ezToken);
            
            return client.getSystemTopics();
        } catch (Exception e) {
        	logger.error("Failed to delete system topic", e);
            eventFailed(eventSystemTopic, e);
            client = invalidateServiceClient(client, serviceClient, e);
            throw new WebApplicationException(Response.Status.INTERNAL_SERVER_ERROR);
        } finally {
        	freeServiceClient(client, serviceClient);
        	logEvent(eventSystemTopic);
        }
    }
    
    @GET
    @Path("/categories")
    @Produces(MediaType.APPLICATION_JSON)
    public Set<String> getCategories(@Context ContextResolver<ServiceClient> resource) throws Exception {
        InternalNameService.Client client = null;
        ServiceClient serviceClient = getFromContext(resource);
        try {
            client = getINSServiceClient(serviceClient);
            return client.getCategories();
        } catch (Exception ex) {
        	logger.error("Failed to get categories", ex);
            client = invalidateServiceClient(client, serviceClient, ex);
            throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
        } finally {
        	freeServiceClient(client, serviceClient);
        }
    }

    @POST
    @Path("/categories/{category}")
    public Set<String> addCategory(@PathParam("category") String category, @Context ContextResolver<ServiceClient> resource) {
    	EzSecurityToken ezToken;
        InternalNameService.Client client = null;
        ServiceClient serviceClient = getFromContext(resource);
        AuditEvent eventCategory = null;
        
        try {
        	ezToken = getSecurityToken(serviceClient);
            client = getINSServiceClient(serviceClient);
            eventCategory = event(AuditEventType.FileObjectCreate.name(), ezToken).arg("Category", category);
            client.addCategory(category, ezToken);
            return client.getCategories();
        } catch (Exception e) {
        	logger.error("Failed to add category", e);
            eventFailed(eventCategory, e);
            client = invalidateServiceClient(client, serviceClient, e);
            throw new WebApplicationException(Response.Status.INTERNAL_SERVER_ERROR);
        } finally {
        	freeServiceClient(client, serviceClient);
        	logEvent(eventCategory);
        }
    }

    @DELETE
    @Path("/categories/{category}")
    public Set<String> deleteCategory(@PathParam("category") String category,
                                      @Context ContextResolver<ServiceClient> resource) {
    	EzSecurityToken ezToken;
        InternalNameService.Client client = null;
        ServiceClient serviceClient = getFromContext(resource);
        AuditEvent eventCategory = null;
        try {
        	ezToken = getSecurityToken(serviceClient);
            client = getINSServiceClient(serviceClient);
            
            eventCategory = event(AuditEventType.FileObjectDelete.name(), ezToken).arg("Category", category);
            client.removeCategory(category, ezToken);

            return client.getCategories();
        } catch (Exception e) {
        	logger.error("Failed to delete category", e);
            eventFailed(eventCategory, e);
            client = invalidateServiceClient(client, serviceClient, e);
            throw new WebApplicationException(Response.Status.INTERNAL_SERVER_ERROR);
        } finally {
        	freeServiceClient(client, serviceClient);
        	logEvent(eventCategory);
        }
    }
    
    
    /**
     * Update deployed application number of instances it is currently running on and redeploy app
     * 
     * @param appName - application name
     * @param appServiceId - given application service id
     * @param numOfInstances - number of instances application will be running/distributed on
     * @return http code 200 on success 
     */
    @POST
    @Path("/updateAndDeploy/{appName}/{appServiceId}/{numOfInstances}")
    public Response updateDeploymentMetadataAndDeploy(@PathParam("appName") String appName,
                                                      @PathParam("appServiceId") String appServiceId,
                                                      @PathParam("numOfInstances") short numOfInstances,
                                                      @Context ContextResolver<ServiceClient> resource) {
        EzBakeServiceDeployer.Client client = null;
        ServiceClient serviceClient = getFromContext(resource);
        AuditEvent eventUpdateMetadata = null;
        AuditEvent eventPublishMetadata = null;
        
        try {
            client = getEzDeployerServiceClient(serviceClient);
            EzSecurityToken token = getDeployerSecurityToken(serviceClient);

            DeploymentMetadata metadata = client.getLatestApplicationVersion(appName, appServiceId, token);

            short currentNumberOfInstances = -1;
            if (metadata.getManifest().getScaling().isSetNumberOfInstances()) {
                currentNumberOfInstances = metadata.getManifest().getScaling().getNumberOfInstances();
            }

            if (numOfInstances >= 0 && numOfInstances != currentNumberOfInstances && numOfInstances <= Short.MAX_VALUE) {
                logger.info("Update number of instances from {} to {}.", currentNumberOfInstances, numOfInstances);
                eventUpdateMetadata = event(AuditEventType.FileObjectModify.name(), token).arg("Update Number of Instances", numOfInstances);
                metadata.getManifest().getScaling().setNumberOfInstances(numOfInstances);
                client.updateDeploymentMetadata(metadata, token);

                logger.info("Publish updated artifact.");
                eventPublishMetadata = event(AuditEventType.FileObjectCreate.name(), token).arg("Application Name", appName)
                		.arg("Application Service Id", appServiceId);
                client.publishArtifactLatestVersion(appName, appServiceId, token);
            }


            return Response.status(Status.OK).build();

        } catch (TException e) {
        	logger.error("General Thrift Exception", e);
            eventFailed(eventPublishMetadata, e);
            eventFailed(eventUpdateMetadata, e);
            client = invalidateServiceClient(client, serviceClient, e);
            throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
        } finally {
            freeServiceClient(client, serviceClient);
            logEvent(eventUpdateMetadata);
            logEvent(eventPublishMetadata);
        }
    }
    
    @GET
    @Path("/token")
    @Produces(MediaType.APPLICATION_JSON)
    public EzSecurityToken getUsersTokenInformation(@Context ContextResolver<ServiceClient> resource) {
        return getSecurityToken(getFromContext(resource));
    }

    /**
     * Check whether or not user is admin
     * 
     * @return http code 200 on success for admin and Unauthorized 403 otherwise 
     */
    @GET
    @Path("/isAdmin")
    @Produces(MediaType.APPLICATION_JSON)
    public Response isAdmin(@Context ContextResolver<ServiceClient> resource) {
    	try {
    		getSecurityToken(getFromContext(resource));
    	} catch(WebApplicationException e) {
    		logger.error("Unauthorized user.", e);
    		return Response.status(Status.FORBIDDEN).build();
    	}
    	
    	return Response.status(Status.OK).build();    	
    }
    
    @POST
    @Path("/clearSystemCache")
    public Response clearSystemCache(@Context ContextResolver<ServiceClient> resource) {
    	try {
            ServiceClient serviceClient = getFromContext(resource);
			getSecurityClient(serviceClient).getClient().invalidateCache(getSecurityToken(serviceClient));
		} catch (EzSecurityTokenException e) {
			logger.error("EzSecurityToken Exception", e);
			throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		} catch (TException e) {
			logger.error("General Thrift Exception", e);
			throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		}
    	
    	return Response.status(Status.OK).build();
    }
    
    /**
     * If there are any deployments running on the server then return none empty status
     * 
     * @param appSecId - get all tasks related to given application security id
     * @return currently running deployments or empty structure
     */
	@GET
	@Path("/pollDeploymentStatusMap/{appSecId}")
	@Produces(MediaType.APPLICATION_JSON)
	public Map<String, Set<FutureExtended<String>>> pollDeploymentStatusMap(@PathParam("appSecId") String appSecId) {
		Map<String, Set<FutureExtended<String>>> result = new HashMap<>();
		
		if(!Strings.isNullOrEmpty(appSecId) && futures.containsKey(appSecId)) {
			// check for errors
			for(FutureExtended<String> future : futures.get(appSecId)) {
				future.setErrors(logger);
			}
			
			result.put(appSecId, futures.get(appSecId));
		}
		
		return result;
	}
	

	/**
	 * Remove all tasks for given application security id
	 * 
	 * @param appSecId - application security id
	 * @return http code 200 on success
	 */
	@POST
	@Path("/removeFromDeploymentStatusMap/{appSecId}")
	public Response removeFromDeploymentStatusMap(@PathParam("appSecId") String appSecId) {
		if(!Strings.isNullOrEmpty(appSecId) && futures.containsKey(appSecId)) {
			for(FutureExtended<String> future : futures.get(appSecId)) { // cancel all tasks before removing from queue
				future.getFuture().cancel(true);
			}
			
			futures.remove(appSecId);
		} else {
            logger.info("Trying to remove {} from deployments", appSecId);
			return Response.status(Status.BAD_REQUEST).build();
		}
		
		return Response.status(Status.OK).build();
	}

	/**
	 * Get INS information.  Must pass either appReg or appSecId
	 * 
	 * @param appReg The application registration from the Registration service
	 * @param appSecId The application security id
     * @param resource The ServiceClient to get the pool and security client
	 * @return Application object
	 * @throws TException
	 */
    protected Application getInsInfo(ApplicationRegistration appReg, String appSecId, ServiceClient resource) throws TException {
        Application application = new Application();
        if (appReg == null) {
            application.setId(appSecId);
        } else {
            application.setId(appReg.getId());
            application.setAppName(appReg.getAppName());
            application.setAllowedUsers(appReg.getAdmins());
            application.setAuthorizations(Sets.newHashSet(appReg.getAuthorizations()));
        }

        if (SecurityID.isReserved(application.getId())) {
            application.setPoc("System Application");
        } else {
            InternalNameService.Client insClient = null;
            try {
                insClient = getINSServiceClient(resource);
                EzSecurityToken insEzToken = getSecurityToken(resource);
                application = insClient.getAppById(application.getId(), insEzToken);
            } catch (ApplicationNotFoundException ex) {
                logger.warn("Application {} with id {} was not registered.  Something may be wrong",
                        application.getAppName(), application.getId());
                application.setPoc("Unregistered");
            } finally {
                freeServiceClient(insClient, resource);
            }
        }
        return application;
    }

    private void addUsersAndGroups(Application app, ApplicationRegistration appReg, ServiceClient serviceClient) throws TException{
        EzGroups.Client groupsClient = null;
        try {
            //Can't add app groups if we're registering the group service
            if (appReg.getAppName().equalsIgnoreCase(EzGroupsConstants.SERVICE_NAME)) {
                return;
            }
            logger.info("Add users and groups for {}", appReg.getAppName());
            groupsClient = getEzGroupsClient(serviceClient);
            String groupServiceSecurityId = serviceClient.getClientPool().getSecurityId(
                    EzGroupsConstants.SERVICE_NAME);
            EzSecurityToken groupToken = serviceClient.getSecurityClient().fetchTokenForProxiedUser(
                    groupServiceSecurityId);
            
            //Activate or Add the Application User
            try {
                groupsClient.activateAppUser(groupToken, appReg.getId());
                //If activate succeeded, the app and group already exist.  We update here, just in case the app name has changed
                groupsClient.modifyAppUser(groupToken, appReg.getId(), appReg.getId(), appReg.getAppName());
                
                // restrict access to appaccess group
                if(app.isSetAppAccess() && !app.getAppAccess().isNotRestricted) {
                	String groupName = Joiner.on(EzGroupNamesConstants.GROUP_NAME_SEP).join(EzGroupNamesConstants.APP_ACCESS_GROUP, app.getAppName());
                	groupsClient.changeGroupInheritance(groupToken, groupName, new GroupInheritancePermissions(false, false, false, false, false));
                	
                	Map<String, String> restrictedToApps = app.getAppAccess().getRestrictedToApps();
                	for(String appName : restrictedToApps.keySet()) {
                		groupsClient.addAppUserToGroup(groupToken, groupName, restrictedToApps.get(appName), new UserGroupPermissions());
                	}
                }
            } catch (TException ex ) {
                logger.warn("Failed to activate the user {} ({}).  This is probably okay since the user probably didn't exist",
                        appReg.getId(), ex.getMessage());
                //Now try to add the user if activation didn't work
                groupsClient.createAppUser(groupToken, appReg.getId(), appReg.getAppName());
            }

            //And add the registered app admins as members of the group
            String groupName = EzGroupNamesConstants.APP_GROUP + EzGroupNamesConstants.GROUP_NAME_SEP + appReg.getAppName();
            UserGroupPermissions permissions = new UserGroupPermissions()
                    .setDataAccess(true)
                    .setAdminRead(true)
                    .setAdminWrite(true)
                    .setAdminManage(true)
                    .setAdminCreateChild(true);
            for(String admin : appReg.getAdmins()) {
                groupsClient.addUserToGroup(groupToken, groupName, admin, permissions);
            }
        } finally {
            freeServiceClient(groupsClient, serviceClient);
        }
    }


    /**
	 * Create logger string for application registration status
	 *
	 * @param ezToken - Security token
	 * @param isApproved - whether the request has been approved or denied
	 * @param appName - The application's name
	 * @param appId - The application's security id
	 * @param msg - description message, i.e. Application Authorizations or Application Deployment
	 * @return string with application and user details
	 */
	private String auditTrailLogger(final EzSecurityToken ezToken, final boolean isApproved, final String appName, final String appId, final String msg) {
		return String.format("\n%s %s\nApplication Details:\n - Name: %s\n - ID: %s\nApprover Details:\n - Name: %s\n - DN: %s", 
								(isApproved) ? "Approved" : "Denied", msg, appName, appId, ezToken.getTokenPrincipal().getName(), ezToken.getTokenPrincipal().getPrincipal() );
	}
    
	/**
	 * Utility function to determine whether or not current user is admin for given app sec id
	 * 
	 * @param app As much details as we have about the app
	 * @return true if current user is admin for given app sec id, false otherwise
	 * @throws ApplicationNotFoundException
	 * @throws TException
	 */
    private boolean isCurrentAppAdmin(Application app, ServiceClient resource) throws TException {
        if (resource.getConfiguration().getBoolean(ADMINS_CAN_DEPLOY_PROPERTY, false)) {
            return false;
        }

        EzSecurityToken token = getSecurityToken(resource);
        if (app.getAllowedUsers() != null &&
                app.getAllowedUsers().contains(token.getTokenPrincipal().getPrincipal())) {
            logger.error("You are an admin of this application.\nNo action is allowed for application security id {}.",
                    app.getId());
            return true;
        } else {
            return false;
        }
	}

    private ServiceClient getFromContext(ContextResolver<ServiceClient> context) {
        return context.getContext(ServiceClient.class);
    }
    
	/**
	 * Get list of topics pipe listens to
	 * 
	 * @param app - The application
	 * @return map of pipe name -> topics
	 */
	private Map<String, Set<String>> getTopics(Application app) {
		Map<String, Set<String>> result = new HashMap<>();
		
		if(app == null || app.getListenerPipelines() == null) {
			return result;
		}
		
		Set<ListenerPipeline> lPipes = app.getListenerPipelines();
		for(ListenerPipeline pipe : lPipes) {
			result.put(pipe.getFeedName(), pipe.getListeningTopics());
		}
		
		return result;
	}
	
	/**
	 * Submit tasks and populate futures variable that hold status for each submitted task 
	 * 
	 * @param es - ExecutorService
     * @param appSecId - The application security id
	 * @param appId - application name
	 * @param serviceId - service name
	 * @param token - security token
	 */
    private void asyncDeploy(final ExecutorService es, final String appSecId, final String appId, final String serviceId,
                             final EzSecurityToken token, final ServiceClient resource) {
    	Future<String> future = es.submit(new Callable<String>() { 
    		@Override
    		public String call() throws Exception {
                boolean broken = false;
                final EzBakeServiceDeployer.Client client = getEzDeployerServiceClient(resource);
    			try {
                    client.publishArtifactLatestVersion(appId, serviceId, token);
                } catch(TTransportException e) {
                    broken = true;
                    resource.getClientPool().returnBrokenToPool(client);
                } finally {
                    if (!broken) {
                        freeServiceClient(client, resource);
                    }
                }
    			return null;
    		}
    	});
    	
    	if(futures.containsKey(appSecId)) {
    		futures.get(appSecId).add(new FutureExtended<>(future, serviceId));
    	} else {
    		Set<FutureExtended<String>> newFuture = new HashSet<>();
    		newFuture.add(new FutureExtended<>(future, serviceId));
    		futures.put(appSecId, newFuture);
    	}
    }
    
    
    /**
     * Utility function to handle log events 
     * @param auditEvent the event to log
     */
	private void logEvent(AuditEvent auditEvent) {
		try {
			auditLogger.logEvent(auditEvent);
		} catch(Exception e) {
			// if event logger fails then...
		}
	}

    private void eventFailed(AuditEvent auditEvent, Exception e) {
        if (auditEvent != null) {
            auditEvent.failed();
        } else {
        	logger.error("Failed to initialize Audit Event for exception:{}", e.getMessage());
        }
    }
    
	protected class PackageMetadata {
		private String appName; // aka appId
		private String appSecId;
    	private String appServiceId;
    	private String poc;
        private String status;
        private ArtifactManifest manifest;
        private String stringManifest;
		private boolean isCurrentAppAdmin;
        
        
		public PackageMetadata(String appName, String appSecId,	String appServiceId, String poc, 
							   String status, ArtifactManifest manifest, boolean isCurrentAppAdmin) {
			super();
			this.appName = appName;
			this.appSecId = appSecId;
			this.appServiceId = appServiceId;
			this.poc = poc;
			this.status = status;
			this.manifest = manifest;
			this.manifest.unsetUser(); //User isn't supplied in the manifest, and it's hard to parse
			this.isCurrentAppAdmin = isCurrentAppAdmin;
			this.stringManifest = this.manifest.toString();
		}

		public String getAppName() {
			return appName;
		}

		public String getAppSecId() {
			return appSecId;
		}

		public String getAppServiceId() {
			return appServiceId;
		}

	 	public String getPoc() {
			return poc;
		}

		public String getStatus() {
			return status;
		}
		
		public ArtifactManifest getManifest() {
			return manifest;
		}
		
		public boolean isCurrentAppAdmin() {
			return isCurrentAppAdmin;
		}

        public String getStringManifest() {
			return stringManifest;
		}

		@Override
		public String toString() {
			return "PackageMetadata [appName=" + getAppName() + ", appSecId="
					+ getAppSecId() + ", appServiceId=" + getAppServiceId() + ", poc="
					+ getPoc() + ", status=" + getStatus() + ", manifest=" + getManifest()
					+ ", stringManifest=" + getStringManifest()
					+ ", isCurrentAppAdmin=" + isCurrentAppAdmin() + "]";
		}
		
	}
	
	protected class RegistrationData {
		
		private String appName;
		private String appId;
		private List<String> authorizations;
        private List<String> communityAuthorizations;
		private String poc;
		private Map<String, Set<String>> topics;
		private Set<JobRegistration> jobRegistrations;
		private boolean isCurrentAppAdmin;
		
		public RegistrationData(String appName, String appId, List<String> authorizations, String poc, 
								Map<String, Set<String>> topics, Set<JobRegistration> jobRegistrations,
								boolean isCurrentAppAdmin, List<String> communityAuthorizations) {
			this.appName = appName;
			this.appId = appId;
			this.authorizations = authorizations;
			this.poc = poc;
			this.topics = topics;
			this.jobRegistrations = jobRegistrations;
			this.isCurrentAppAdmin = isCurrentAppAdmin;
            this.communityAuthorizations = communityAuthorizations;
		}

		public String getAppName() {
			return appName;
		}
		
		public String getAppId() {
			return appId;
		}
		
		public List<String> getAuthorizations() {
			return authorizations;
		}

        public List<String> getCommunityAuthorizations() {
            return communityAuthorizations;
        }
		
		public String getPoc() {
			return poc;
		}
		
		public Map<String, Set<String>> getTopics() {
			return topics;
		}
		
		public Set<JobRegistration> getJobRegistrations() {
			return jobRegistrations;
		}

		public boolean getCurrentAppAdmin() {
			return isCurrentAppAdmin;
		}
		
		@Override
		public String toString() {
			return "RegistrationData [appName=" + getAppName() + ", appId=" + getAppId()
					+ ", authorizations=" + getAuthorizations() + ", poc=" + getPoc()
					+ ", topics=" + getTopics() + ", communityAuths=" + getCommunityAuthorizations()
                    + ", jobRegistrations=" + getJobRegistrations()
                    + ", isCurrentAppAdmin=" + getCurrentAppAdmin() + "]";
		}
	}

}

