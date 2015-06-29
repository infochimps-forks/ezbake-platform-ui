package ezbake.ins.web;

import static ezbake.deployer.utilities.ArtifactHelpers.getAppId;
import static ezbake.deployer.utilities.ArtifactHelpers.getServiceId;
import static ezbake.util.AuditEvent.event;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.ByteBuffer;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import javax.mail.internet.AddressException;
import javax.mail.internet.InternetAddress;
import javax.management.openmbean.InvalidOpenTypeException;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
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
import javax.xml.bind.DatatypeConverter;

import com.google.common.collect.Lists;
import ezbake.groups.thrift.EzGroupOperationException;
import ezbake.groups.thrift.EzGroups;
import org.apache.commons.lang3.builder.EqualsBuilder;
import org.apache.thrift.TException;
import org.apache.thrift.TSerializer;
import org.apache.thrift.protocol.TSimpleJSONProtocol;
import org.apache.thrift.transport.TTransportException;

import com.google.common.annotations.VisibleForTesting;
import com.google.common.base.Strings;
import com.google.common.collect.Sets;
import com.google.common.io.Files;
import com.sun.jersey.multipart.FormDataBodyPart;
import com.sun.jersey.multipart.FormDataMultiPart;

import ezbake.base.thrift.EzSecurityToken;
import ezbake.base.thrift.EzSecurityTokenException;
import ezbake.configuration.EzConfigurationLoaderException;
import ezbake.deployer.utilities.PackageDeployer;
import ezbake.deployer.utilities.SecurityTokenUserProvider;
import ezbake.deployer.utilities.YamlManifestFileReader;
import ezbake.deployer.utilities.YmlKeys;
import ezbake.ins.thrift.gen.Application;
import ezbake.ins.thrift.gen.ApplicationNotFoundException;
import ezbake.ins.thrift.gen.FeedPipeline;
import ezbake.ins.thrift.gen.FeedType;
import ezbake.ins.thrift.gen.InternalNameService;
import ezbake.ins.thrift.gen.ListenerPipeline;
import ezbake.ins.thrift.gen.WebApplication;
import ezbake.query.intents.IntentType;
import ezbake.security.client.EzbakeSecurityClient;
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
import ezbakehelpers.ezconfigurationhelpers.system.SystemConfigurationHelper;
import ezbakehelpers.ezconfigurationhelpers.webapplication.WebApplicationConfigurationHelper;

@Path("application")
public class ApplicationResource extends RegistrationResourceBase {
	private static final String APP_ARCHIVE = "appArchive";
	private static final String APP_MANIFEST = "appManifest";
	private static final String APP_PROPERTIES = "appProperties";
    private static final String APP_TARGZ = "appTar";
	private static final String APP_SEC_ID = "appSecId";
	private static final String DEPLOYMENT_QUERY_TERM = "security-id";
    private static final int MAX_ALLOWED_PENDING_REGISTRATION = 3;
    private static final int MAX_APPNAME_LENGTH = 16;
    private static final String STAGE_SERVICE = "STAGE_SERVICE";
    private static final String DEPLOY_SERVICE = "DEPLOY_SERVICE";

    private static Map<String, Set<FutureExtended<String>>> futures = new ConcurrentHashMap<>();
    private static AuditLogger auditLogger;
    
	
    @VisibleForTesting 
    ApplicationResource(AuditLogger logger) {
    	auditLogger = logger;
    }
    
	public ApplicationResource() {
		if(auditLogger == null) {
			try {
				auditLogger = AuditLogger.getDefaultAuditLogger(ApplicationResource.class);
			} catch (EzConfigurationLoaderException e) {
				logger.error("Failed to initialize AuditLogger:{}", e);
				throw new WebApplicationException(Response.Status.INTERNAL_SERVER_ERROR);
			}
		}
	}
    
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Set<Application> getMyApplications(@Context ContextResolver<ServiceClient> resource) {
    	ServiceClient serviceClient = getFromContext(resource);
    	InternalNameService.Client insClient = null;
        try {
        	insClient = getINSServiceClient(serviceClient);
            return insClient.getMyApps(getSecurityToken(serviceClient));
        } catch(Exception ex) {
            logger.error("Failed to get my applications", ex);
            insClient = invalidateServiceClient(insClient, serviceClient);
            throw new WebApplicationException(Response.Status.INTERNAL_SERVER_ERROR);
        } finally {
        	freeServiceClient(insClient, serviceClient);
        }
    }

    @GET
    @Path("/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public Application getApplication(@PathParam("id") String id, @Context ContextResolver<ServiceClient> resource) {
        InternalNameService.Client client = null;
        ServiceClient serviceClient = getFromContext(resource);
        checkAuthToken(serviceClient);
        
        try {
            client = getINSServiceClient(serviceClient);
            return setNoNulls(client.getAppById(id, getSecurityToken(serviceClient)), resource);

        } catch (Exception ex) {
            logger.error("Failed to get my applications", ex);
            client = invalidateServiceClient(client, serviceClient);
            throw new WebApplicationException(Response.Status.INTERNAL_SERVER_ERROR);
        } finally {
        	freeServiceClient(client, serviceClient);
        }
    }

    /**
     * Query INS Service to check whether or not given application name exists
     * 
     * @param appName The name of the application
     * @return true if application name exists
     */
    @GET
    @Path("/isAppNameExists/{appName}")
    @Produces(MediaType.APPLICATION_JSON)
    public boolean isAppNameExists(@PathParam("appName") String appName, @Context ContextResolver<ServiceClient> resource )  {
    	InternalNameService.Client client = null;
    	ServiceClient serviceClient = getFromContext(resource);
    	EzSecurityToken token = getSecurityToken(serviceClient);
    	
    	try {
			client = getINSServiceClient(serviceClient);
			return client.getDuplicateAppNames(appName, token).size() > 0;
		} catch (TException e) {
			logger.error("General Thrift Exception", e);
			client = invalidateServiceClient(client, serviceClient);
            throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		} finally {
			freeServiceClient(client, serviceClient);
		}
    }
    
    /**
     * Remove application package from production view
     *
     * @param appId and serviceId
     * @return Server response
     */
    @POST
    @Path("/undeploy/{appId}/{serviceId}")
    public Response unDeployApplication(@PathParam("appId")String appId, 
    									@PathParam("serviceId") String serviceId,
    									@Context ContextResolver<ServiceClient> resource) {
    	
    	// am I authorized to do this?
    	checkPermissionedToDeploy(true, resource);
    	
        EzBakeServiceDeployer.Client client = null;
        ServiceClient serviceClient = getFromContext(resource);
        AuditEvent eventUndeploy = null;

		try {
			EzSecurityToken token = getDeployerSecurityToken(serviceClient);
			eventUndeploy = event(AuditEventType.FileObjectDelete.name(), token).arg("Application Id", appId).arg("Service Id", serviceId);
					
	    	client = getEzDeployerServiceClient(serviceClient);
	    	client.undeploy(appId, serviceId, token);
			
			return Response.ok().build();
		} catch (DeploymentException e) {
			logger.error("Deployment Exception undeploying application", e);
			eventFailed(eventUndeploy, e);
			return Response.serverError().build();
		} catch (TException e) {
			logger.error("Thrift Exception undeploying application", e);
			eventFailed(eventUndeploy, e);
			client = invalidateServiceClient(client, serviceClient);
            return Response.serverError().build();
        } finally {
			freeServiceClient(client, serviceClient);
			logEvent(eventUndeploy);
		}
    }

    /**
     * Remove application package from production view
     *
     * @param appId and serviceId
     * @return Server response
     */
    @POST
    @Path("/unstage/{appId}/{serviceId}")
    public Response unStageApplication(@PathParam("appId")String appId,
                                        @PathParam("serviceId") String serviceId,
                                        @Context ContextResolver<ServiceClient> resource) {

        EzBakeServiceDeployer.Client client = null;
        ServiceClient serviceClient = getFromContext(resource);
        AuditEvent eventUnStage = null;

        try {
        	EzSecurityToken token = getDeployerSecurityToken(serviceClient);
        	eventUnStage = event(AuditEventType.FileObjectDelete.name(), token).arg("Application Id", appId).arg("Service Id", serviceId);
        	
            client = getEzDeployerServiceClient(serviceClient);
            client.unstageServiceDeployment(appId, serviceId, token);

            return Response.ok().build();
        } catch (DeploymentException e) {
        	logger.error("Deployment Exception unstaging application", e);
        	eventFailed(eventUnStage, e);
            return Response.serverError().build();
        } catch (TException e) {
        	logger.error("Thrift Exception unstaging application", e);
        	eventFailed(eventUnStage, e);
        	client = invalidateServiceClient(client, serviceClient);
            return Response.serverError().build();
        } finally {
            freeServiceClient(client, serviceClient);
            logEvent(eventUnStage);
        }
    }

    /**
     * Utility function to convert Intent to set of strings
     * 
     * @return set of intents as defined in Intent
     */
    @GET
    @Path("/intents")
    @Produces(MediaType.APPLICATION_JSON) 
    public Set<String> getListOfintents(@Context ContextResolver<ServiceClient> resource) {
    	ServiceClient serviceClient = getFromContext(resource);
        checkAuthToken(serviceClient);
        Set<String> result = new HashSet<>();
       
        
        IntentType[] intents = IntentType.values();
        
        for(IntentType intent : intents) {
        	result.add(intent.name());		
        }
        
        return result;
    }
    
    /**
     * Get pipeline feed names 
     * 
     * @return set of feed names
     */
    @GET
    @Path("/allPipelineFeedNames")
    @Produces(MediaType.APPLICATION_JSON) 
    public Set<String> getAllPipelineFeedNames(@Context ContextResolver<ServiceClient> resource) {
        Set<String> result = Sets.newHashSet();
        InternalNameService.Client client = null;
    	ServiceClient serviceClient = getFromContext(resource);
    	checkAuthToken(serviceClient);
        
        try {
        	client = getINSServiceClient(serviceClient);
			Set<FeedPipeline> allPipelineFeeds = client.getPipelineFeeds();
			
			for(FeedPipeline pipelineFeed : allPipelineFeeds) {
				result.add(pipelineFeed.getFeedName());
			}
			
			return result;
			
		} catch (TException e) {
			logger.error("General Thrift Exception", e);
			client = invalidateServiceClient(client, serviceClient);
            throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		} finally {
			freeServiceClient(client, serviceClient);
		}
    }

    @GET
    @Path("/allTopicNames/{type}")
    @Produces(MediaType.APPLICATION_JSON)
    public Set<String> getAllTopicNames(@PathParam("type") String type,
    									@Context ContextResolver<ServiceClient> resource) {

        Set<String> result;
        InternalNameService.Client client = null;
    	ServiceClient serviceClient = getFromContext(resource);
        checkAuthToken(serviceClient);

        try {
            client = getINSServiceClient(serviceClient);
            result = client.allBroadcastTopicNames(FeedType.valueOf(type.toUpperCase(Locale.ENGLISH)));
            return result;
        } catch (TException e) {
            logger.error("General Thrift Exception", e);
            client = invalidateServiceClient(client, serviceClient);
            throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
        } finally{
            freeServiceClient(client, serviceClient);
        }
    }
    
    @GET
    @Path("/download/{id}")
    @Produces(MediaType.TEXT_PLAIN)
    public Response downloadApplication(@PathParam("id") String id,
    									@Context ContextResolver<ServiceClient> resource) {
        Application appData = getApplication(id, resource);

        try {
            TSerializer serializer = new TSerializer(new TSimpleJSONProtocol.Factory());
            Response.ResponseBuilder response = Response.ok(serializer.serialize(appData));
            response.header("Content-Disposition", "attachment; filename=\"application.export\"");
            return response.build();
        }
        catch (Exception e) {
            logger.error("JSONException when trying to convert appData", e);
            return Response.serverError().build();
        }
    }

    /**
     * Query service deployer for all packages/services that were deployed under given application security id
     *
     * @param appSecId - application security Id
     * @return All packages registered under given application security Id
     */
    @GET
    @Path("/deployedServices/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public Set<DeployedPackageMetadata> getListOfDeployedServices(@PathParam("id") String appSecId,
    															  @Context ContextResolver<ServiceClient> resource) {
     	ServiceClient serviceClient = getFromContext(resource);
    	checkAuthToken(serviceClient);
    	
    	Set<DeployedPackageMetadata> result = new HashSet<>();
		
		EzBakeServiceDeployer.Client client = null;
		Properties properties = serviceClient.getConfiguration();
        WebApplicationConfigurationHelper webConfiguration = new WebApplicationConfigurationHelper(properties);

		try {
			client = getEzDeployerServiceClient(serviceClient);
			
			List<DeploymentMetadata> deployedPackages =  client.listDeployed(DEPLOYMENT_QUERY_TERM, appSecId, getDeployerSecurityToken(serviceClient));
			
			for(DeploymentMetadata pkg : deployedPackages ) {
                if (pkg.getStatus() == DeploymentStatus.Deployed || pkg.getStatus() == DeploymentStatus.Staged) {
                    if( pkg.manifest.isSetWebAppInfo() ) {
                        result.add(new DeployedPackageMetadata(getAppId(pkg), appSecId, getServiceId(pkg), pkg.getStatus(),
                                checkPermissionedToDeploy(false, resource), webConfiguration.getExternalFacingDomain(),
                                pkg.manifest.webAppInfo.externalWebUrl));
                    } else {
                        result.add(new DeployedPackageMetadata(getAppId(pkg), appSecId, getServiceId(pkg),
                                pkg.getStatus(), checkPermissionedToDeploy(false, resource)));
                    }
                }
			}
			
			return result;
		} catch (DeploymentException e) {
			logger.error("EzDeployer Exception", e);
            throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		} catch (TException e) {
            logger.error("General Thrift Exception", e);
            client = invalidateServiceClient(client, serviceClient);
            throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
        } finally {
			freeServiceClient(client, serviceClient);
		}
    }

    /**
     * Check whether or not user is permission to deploy/un-deploy/delete application
     * By default only "Admin" user is permission to deployed
     *
     * @throws WebApplicationException with HTTP Status of 403 - Forbidden
     */
    private boolean checkPermissionedToDeploy(boolean throwOnError, @Context ContextResolver<ServiceClient> resource) throws WebApplicationException{
    	ServiceClient serviceClient = getFromContext(resource);
        SystemConfigurationHelper systemConfiguration = new SystemConfigurationHelper(
        		serviceClient.getConfiguration());
        boolean adminRequired = systemConfiguration.isAdminApplicationDeployment();

        if(adminRequired && throwOnError) {
            throw new WebApplicationException(Response.Status.FORBIDDEN);
        }
        return !adminRequired;
    }

    /**
     * Deploy application/package to production.
     * Currently supported apps are WAR and JAR along with yml manifest file and properties files
     * @param appFiles - application files ready for deployment, archive, manifest and configuration files
     */
    @Context HttpServletRequest httpServletRequest;
    @POST
	@Path("/deploy")
	@Consumes(MediaType.MULTIPART_FORM_DATA)
	public Response deployApplication(FormDataMultiPart appFiles, 
									  @Context ContextResolver<ServiceClient> resource)
    {
    	ServiceClient serviceClient = getFromContext(resource);
    	ExecutorService es = Executors.newSingleThreadExecutor();
    	
    	AuditEvent eventDeploy = null;
		EzBakeServiceDeployer.Client client = null;
        String homePage = httpServletRequest.getHeader("referer");

		File appArchiveFile = null;
        String appArchiveFileName = null;
        File appTarGzFile = null;
        String appTarGzFileName;
		File appManifestFile = null;
		Map<File, String> appPropertiesFiles =  new HashMap<>();
    	
    	// get list of files from the web form
		List<FormDataBodyPart> appArchiveList = appFiles.getFields(APP_ARCHIVE);
        List<FormDataBodyPart> appTarGzList = appFiles.getFields(APP_TARGZ);
		List<FormDataBodyPart> appManifestList = appFiles.getFields(APP_MANIFEST);
		List<FormDataBodyPart> appPropertiesList = appFiles.getFields(APP_PROPERTIES);
		checkAuthToken(serviceClient);
		
		// find application with the given id
        Application application = getApplication(appFiles.getField(APP_SEC_ID).getValueAs(String.class), resource);
       
		try {
			client = getEzDeployerServiceClient(serviceClient);
			
			if(appTarGzList != null) {
				for(FormDataBodyPart part : appTarGzList) {
	               appTarGzFileName = part.getContentDisposition().getFileName();
	               if (!appTarGzFileName.isEmpty()) {
	                   appTarGzFile = part.getValueAs(File.class);
	                   break; //Only expecting one
	               }
				}
			}

			//If we have a tar.gz, we don't use the archive or the properties
            if (appTarGzFile == null) {
                for (FormDataBodyPart part : appArchiveList) {
                    if (part.getContentDisposition().getFileName().isEmpty()) {
                        throw new IOException("Archive file required");
                    }
                    appArchiveFile = part.getValueAs(File.class);
                    appArchiveFileName = part.getContentDisposition().getFileName();
                }

                // sanity check
                if (checkValidFileType(getMagicNumber(appArchiveFile)).getStatus() != Response.status(Status.OK).build().getStatus()) {
                    throw new InvalidOpenTypeException("Invalid file type");
                }
                
                // get optional property files
                if(appPropertiesList != null) {
                    for(FormDataBodyPart part : appPropertiesList ) {
                        if(part.getContentDisposition().getFileName().isEmpty() ) {
                            break;
                        }
                        appPropertiesFiles.put(part.getValueAs(File.class), part.getContentDisposition().getFileName());
                    }
                }                
            } 
            
			// get manifest file - one file per deployment
			for(FormDataBodyPart part : appManifestList ) {
				if(part.getContentDisposition().getFileName().isEmpty() ) {
					throw new IOException("Manifest file required");
				}
				appManifestFile = part.getValueAs(File.class);
    		}
			
			SystemConfigurationHelper systemConfiguration = new SystemConfigurationHelper(
					serviceClient.getConfiguration());
            boolean adminRequired = systemConfiguration.isAdminApplicationDeployment();
            List<ArtifactManifest> manifests = PackageDeployer.createManifests(appManifestFile,
                    getDeployerSecurityToken(serviceClient), getYMLOverrides(application));
//            Right now we're assuming there's only 1 manifest in the file
            if (manifests.size() != 1) {
                logger.error("Manifest was invalid and did not contain just 1 manifest.  Found {} manifests", manifests.size());
                throw new WebApplicationException(Status.BAD_REQUEST);
            }
            
            eventDeploy = event(AuditEventType.FileObjectCreate.name(), getSecurityToken(serviceClient)).arg("Application Archive Name", appArchiveFileName);
            DeploymentTypePackage deploymentTypePackage;
            
            if (adminRequired) {
                //Admin is required, so we stage the deployment

                ByteBuffer artifact;
                if (appTarGzFile == null) {
                    artifact = PackageDeployer.buildArtifact(manifests.get(0), appArchiveFile, appArchiveFileName,
                            appManifestFile, appPropertiesFiles, null);
                } else {
                    artifact = ByteBuffer.wrap(Files.toByteArray(appTarGzFile));
                }
                deploymentTypePackage = new DeploymentTypePackage(STAGE_SERVICE, manifests.get(0), artifact);
            } else {
                //No admin required so we go ahead and do the deployment
                ByteBuffer artifact;
                if (appTarGzFile == null) {
                    artifact = PackageDeployer.buildArtifact(manifests.get(0), appArchiveFile, appArchiveFileName,
                            appManifestFile, appPropertiesFiles, null);
                } else {
                    artifact = ByteBuffer.wrap(Files.toByteArray(appTarGzFile));
                }
                deploymentTypePackage = new DeploymentTypePackage(DEPLOY_SERVICE, manifests.get(0), artifact);
            }
            asyncDeploy(es, deploymentTypePackage, getDeployerSecurityToken(serviceClient), serviceClient);
            
            return Response.seeOther(new URI(homePage)).build();
		} catch(IllegalStateException e) {
			logger.error("Invalid manifest file structure", e);
			return Response.serverError().build();
		} catch(InvalidOpenTypeException e) {
			logger.error("Invalid archive file type", e);
			return Response.serverError().build();
		} catch (IOException e) {
			logger.error("IOException deploying application", e);
			return Response.serverError().build();
		} catch (DeploymentException e) {
			logger.error("DeploymentException deploying application", e);
			eventFailed(eventDeploy, e);
			return Response.serverError().build();
		} catch (TException e) {
			logger.error("Thrift Exception deploying application", e);
			eventFailed(eventDeploy, e);
			client = invalidateServiceClient(client, serviceClient);
			return Response.serverError().build();
		} catch (URISyntaxException e) {
            logger.error("Referrer header wasn't a valid uri", e);
            return Response.serverError().build();
        } finally {
            quietlyDeleteFiles(Sets.newHashSet(appArchiveFile, appManifestFile, appTarGzFile));
            quietlyDeleteFiles(appPropertiesFiles.keySet());
			freeServiceClient(client, serviceClient);
			logEvent(eventDeploy);
		}
    }

    private void quietlyDeleteFiles(Set<File> files) {
        for(File file : files) {
            try {
                if (file.exists()) {
                    file.delete();
                }
            } catch(Exception ignored) {
                //do nothing
            }
        }
    }
    
    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public Response saveApplication(Application application, 
    								@Context ContextResolver<ServiceClient> resource)  {
    	ServiceClient serviceClient = getFromContext(resource);
    	
        UserInfo user = checkAuthToken(serviceClient);
        
        AuditEvent eventSaveApp = null;
        InternalNameService.Client client = null;
        setNoNulls(application, resource);
        try {
            client = getINSServiceClient(serviceClient);
            try {
                if(application.appName.length() > MAX_APPNAME_LENGTH) {
                    logger.error("Cannot save because the application name is too long. Max length allowed is {} characters", MAX_APPNAME_LENGTH);
                    return Response.status(Status.BAD_REQUEST).entity(String.format("Application length is too long. Max length allowed is %d characters.", MAX_APPNAME_LENGTH)).build();
                }

                if(!isValidEmail(application.poc)) {
                    logger.error("Cannot save because an invalid email was provided");
                    return Response.status(Status.BAD_REQUEST).entity("An invalid email was provided").build();
                }

                // register application with registration service
            	// if application.getId() == null, then new appId will be generated and registered
            	application.setId(registerApplication(application, resource));
                
                Application existingApp = client.getAppById(application.getId(), getSecurityToken(serviceClient));
                
            	// check whether or not user reached the limit of allowed applications to register iff this not edit
            	if(existingApp == null && !isAllowedToRegister(resource)) {
                    logger.error("Cannot save because the current user has too many pending registrations");
            		return Response.status(Status.FORBIDDEN).entity("Too many pending registrations").build();
            	}
            	
            	// check whether or not app name exists
            	// check for two cases: 1. edit. 2. new app being registered
            	Set<Application> registeredDuplicateApps = client.getDuplicateAppNames(application.getAppName(), getSecurityToken(serviceClient));
            	for(Application app : registeredDuplicateApps) {
            		if(!application.getId().equals(app.getId()) && application.getAppName().equalsIgnoreCase(app.getAppName())) {
                        logger.error("Cannot save because the app name already exists");
                        return Response.status(Status.FORBIDDEN).entity("App name already exists").build();
            		}
            	}
                
                //Check the user against the existing application
                if (!existingApp.getAllowedUsers().contains(user.username)) {
                    auditLogger.logEvent(AuditEventType.FileObjectModify, false, getSecurityToken(serviceClient),
                            "User tried to modify an application they didn't have access to");
                    logger.error("Cannot save because the user is not an admin of this application");
                    return Response.status(Response.Status.FORBIDDEN).entity("User is not an admin").build();
                }
                
            } catch (ApplicationNotFoundException ex) {
                String today = new SimpleDateFormat("yyyy-MM-dd").format(new Date());
                for (FeedPipeline pipeline : application.feedPipelines) {
                    pipeline.setDateAdded(today);
                }
            }
            
            eventSaveApp = event(AuditEventType.FileObjectCreate.name(), getSecurityToken(serviceClient)).arg("Application Object", application);
            client.saveApplication(application, getSecurityToken(serviceClient));
            
            return Response.ok().build();
        } catch (Exception ex) {
            logger.error("Failed to update an application", ex);
            // check whether or not application was saved
        	try {
				checkApplicationSaved(application, client, resource);
			} catch (RegistrationException e) {
				logger.error("General Registration Exception", e);
				throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
			} catch (SecurityIDNotFoundException e) {
				logger.error("Application ID not found in Registration Service", e);
				throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
			} catch (TException e) {
				logger.error("General Thrift Exception", e);
				eventFailed(eventSaveApp, e);
				client = invalidateServiceClient(client, serviceClient);
                throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
            }

            return Response.serverError().build();
        } finally {
        	freeServiceClient(client, serviceClient);
        	logEvent(eventSaveApp);
        }
    }
    
    @DELETE
    @Path("/{id}")
    public Response deleteApplication(@PathParam("id") String applicationId,
    								  @Context ContextResolver<ServiceClient> resource) {
    	ServiceClient serviceClient = getFromContext(resource);
    	// if the app has been approved and is active, am I authorized to do this?
        try {
            String registrationStatus = getRegistrationStatus(applicationId, serviceClient);
            if (registrationStatus.equals(RegistrationStatus.ACTIVE.toString())) {
                checkPermissionedToDeploy(true, resource);
            }
        } catch (SecurityIDNotFoundException e) {
            //this is okay, we'll go ahead and delete any way
            logger.warn("The application security id {} wasn't found in the registration service, but we're deleting anyway",
                    applicationId);
        } catch (Exception e) {
            //Anything else is bad
            logger.error("Failed communicating with Registration service", e);
            throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
        }
    	
        AuditEvent eventDelete = null;
        InternalNameService.Client insClient = null;
        EzSecurityRegistration.Client registrationClient = null;
        EzGroups.Client groupClient = null;

        try {
        	eventDelete = event(AuditEventType.FileObjectDelete.name(), getSecurityToken(serviceClient));
            insClient = getINSServiceClient(serviceClient);
            registrationClient =  getEzSecurityRegistrationServiceClient(serviceClient);
            EzSecurityToken registrationToken = getRegistrationSecurityToken(serviceClient);
            groupClient = getEzGroupsServiceClient(serviceClient);
            EzSecurityToken groupToken = getEzGroupToken(serviceClient);

            insClient.deleteApplication(applicationId, getSecurityToken(serviceClient));
            logger.info("{} was deleted from INS", applicationId);
            registrationClient.deleteApp(registrationToken, applicationId);
            logger.info("{} was deleted from Security Registration", applicationId);
            try {
                groupClient.deleteAppUser(groupToken, applicationId);
                logger.info("{} was deleted from EzGroups", applicationId);
            } catch(EzGroupOperationException groupEx) {
                logger.warn("Failed to delete the app user.  If the registration was never approved, this is expected", groupEx);
            }
            return Response.ok().build();
        } catch (Exception e) {
        	logger.error("Failed to delete application", e);
        	eventFailed(eventDelete, e);
        	insClient = invalidateServiceClient(insClient, serviceClient);
            registrationClient = invalidateServiceClient(registrationClient, serviceClient);
            groupClient = invalidateServiceClient(groupClient, serviceClient);
            return Response.serverError().build();
        } finally {
        	freeServiceClient(insClient, serviceClient);
            freeServiceClient(registrationClient, serviceClient);
            freeServiceClient(groupClient, serviceClient);
        	logEvent(eventDelete);
        }
    }

    @GET
    @Path("/export/{id}")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportApplication(@PathParam("id") String applicationId,
    		@Context ContextResolver<ServiceClient> resource) {
    	ServiceClient serviceClient = getFromContext(resource);
        checkAuthToken(serviceClient);
        InternalNameService.Client client = null;
        try {
            client = getINSServiceClient(serviceClient);
            String export = client.exportApplication(applicationId, getSecurityToken(serviceClient));
            return Response.ok(export, MediaType.APPLICATION_OCTET_STREAM_TYPE)
                    .header("content-disposition", "attachment; filename=" + applicationId + ".ins")
                    .build();
        } catch (Exception ex) {
            logger.error("Failed to export application", ex);
            client = invalidateServiceClient(client, serviceClient);
            return Response.serverError().build();
        } finally {
        	freeServiceClient(client, serviceClient);
        }
    }

    /**
     * Register application 
     * If app exists then return passed id, otherwise return new id
     * 
     * @param application  - The application
     * @return application security id
     */
    public String registerApplication(Application application,
    								  @Context ContextResolver<ServiceClient> resource) {
    	ServiceClient serviceClient = getFromContext(resource);
    	checkAuthToken(serviceClient);
    	EzSecurityRegistration.Client client = null;
    	AuditEvent eventReg = null;
    	
    	try {
    		String id = application.getId();
    		String appName = application.getAppName();
            Set<String> authorizations = application.getAuthorizations();
            Set<String> allowedUsers = application.getAllowedUsers();
    		// assume that authorization has classification, otherwise empty string
    		String classification = getHighestClassification(authorizations); 
    		    		
    		List<String> authorizationsList = new ArrayList<>(authorizations.size());
    		authorizationsList.addAll(authorizations);
            List<String> communityAuthorizations = new ArrayList<>();
            if (application.getCommunityAuthorizations() != null) {
                communityAuthorizations.addAll(application.getCommunityAuthorizations());
            }

			client = getEzSecurityRegistrationServiceClient(serviceClient);
			EzSecurityToken ezToken = getRegistrationSecurityToken(serviceClient);

			if(!Strings.isNullOrEmpty(id)) { // edit?
				// check if actual edit
				ApplicationRegistration registeredApp = client.getRegistration(ezToken, id);
				ApplicationRegistration toUpdate = new ApplicationRegistration(registeredApp);
				toUpdate.setAdmins(allowedUsers);
				toUpdate.setAppName(appName);
				toUpdate.setClassification(classification);
				toUpdate.setAuthorizations(authorizationsList);
                toUpdate.setCommunityAuthorizations(communityAuthorizations);
				
				if(!isRegistrationObjectsEqual(registeredApp, toUpdate) || isTopicsEdited(application, resource)) {
					toUpdate.setStatus(RegistrationStatus.PENDING);
					client.update(ezToken, toUpdate);
				}
			} else { // new app
	        	eventReg = event(AuditEventType.FileObjectCreate.name(), ezToken).arg("Application Name", appName)
	        			.arg("Classification", classification)
	        			.arg("Authorizations List", authorizations)
	        			.arg("Application Id", id)
	        			.arg("Allowed Users", allowedUsers);
				id = client.registerApp(ezToken, appName, classification, authorizationsList,
                        communityAuthorizations, id, allowedUsers, application.getIcgcServicesDN());
			}
			
			return id;
			
		}catch (TException e) {
			logger.error("General Thrift Exception", e);
			eventFailed(eventReg, e);
			client = invalidateServiceClient(client, serviceClient);
			throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		} catch (Exception e) {
			logger.error("Failed to register application", e);
			eventFailed(eventReg, e);
			client = invalidateServiceClient(client, serviceClient);
			throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		}
	finally {
			freeServiceClient(client, serviceClient);
			logEvent(eventReg);
		}
    }

    /**
     * Query registration service for current status
     * 
     * @param id - application security id
     * @return registration status
     */
    @GET
    @Path("/registrationStatus/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public String getRegistrationStatus(@PathParam("id") String id,
    		@Context ContextResolver<ServiceClient> resource) {
    	ServiceClient serviceClient = getFromContext(resource);
    	checkAuthToken(serviceClient);
    	
    	try {
            return getRegistrationStatus(id, serviceClient);
		} catch (Exception e) {
			logger.error("Unexpected Exception getting registration status", e);
			throw new WebApplicationException(Status.INTERNAL_SERVER_ERROR);
		}
    }

    private String getRegistrationStatus(String id, ServiceClient serviceClient) throws TException {
        EzSecurityRegistration.Client client = null;

        try {
            client =  getEzSecurityRegistrationServiceClient(serviceClient);
            EzSecurityToken ezToken = getRegistrationSecurityToken(serviceClient);

            return client.getStatus(ezToken, id).name();

        } catch (TTransportException e) {
            logger.error("Transport Thrift Exception", e);
            client = invalidateServiceClient(client, serviceClient);
            throw e;
        }
        finally {
            freeServiceClient(client, serviceClient);
        }
    }

	/**
     * Determine whether or not user is allowed to register another application
     * Initial registration puts application into PENDING status
     * User is allowed to have no more than MAX_ALLOWED_PENDING_REGISTRATION applications in queue
     * 
     * @throws TException 
     */
    public void checkAllowedToRegister(@Context ContextResolver<ServiceClient> resource) throws TException {
    	ServiceClient serviceClient = getFromContext(resource);
		EzbakeSecurityClient securityClient = getSecurityClient(serviceClient);
		EzSecurityToken token = securityClient.fetchTokenForProxiedUser();
		String thisOwner = token.getTokenPrincipal().getPrincipal();

		EzSecurityRegistration.Client client = null;
        try {
            client = getEzSecurityRegistrationServiceClient(serviceClient);
            EzSecurityToken ezToken = getRegistrationSecurityToken(serviceClient);

            List<ApplicationRegistration> allPendingApps = client.getAllRegistrations(ezToken, RegistrationStatus.PENDING);

            int currentNumOfPending = 0;
            for (ApplicationRegistration appReg : allPendingApps) {
                if (thisOwner.equals(appReg.getOwner())) {
                    ++currentNumOfPending;
                }
            }

            if (currentNumOfPending >= MAX_ALLOWED_PENDING_REGISTRATION) {
                logger.error("User reached maximum number of registered applications with status PENDING");
                throw new WebApplicationException(Response.status(Status.PRECONDITION_FAILED).build());
            }
        } finally {
            freeServiceClient(client, serviceClient);
        }
    }
    
    /**
     * Validate yml manifest file structure
     * 
     * @param appSecId - application security id
     * @param ymlFileBase64Data - base64 string representation of yml file
     * @return - empty string: no errors found.
     */
    @POST
    @Path("/validateManifestFile/{appSecId}/{ymlFileBase64Data}")
    public String checkValidManifestFile(@PathParam("appSecId") String appSecId, 
    									 @PathParam("ymlFileBase64Data") final String ymlFileBase64Data,
    									 @Context ContextResolver<ServiceClient> resource ) {
    	ServiceClient serviceClient = getFromContext(resource);
    	// find application with the given id
		YamlManifestFileReader fileReader = new YamlManifestFileReader(new SecurityTokenUserProvider(getSecurityToken(serviceClient)), getYMLOverrides(getApplication(appSecId, resource)));
		
		try {
			fileReader.readFile(new ByteArrayInputStream(DatatypeConverter.parseBase64Binary(ymlFileBase64Data)));
		} catch (IllegalStateException | IOException e) {
			return e.getMessage();
		}
		
		return ""; // all good
	}    
    
    private boolean isValidEmail(String addr) {
        try {
            InternetAddress email = new InternetAddress(addr);
            email.validate();
            return true;
        }
        catch (AddressException e) {
            logger.error("AddressException. email is not a valid e-mail address.", e);
            return false;
        }
    }
    
    /**
     * Wrapper to check whether or not user is allowed to register another application
     * 
     * @return true if allowed, otherwise false
     */
    @GET
    @Path("/allowedToRegister")
    public boolean isAllowedToRegister(@Context ContextResolver<ServiceClient> resource) {
    	try{
    		checkAllowedToRegister(resource);
    		return true;
    	} catch(WebApplicationException e) {
    		return false;
    	} catch (Exception e) {
    		logger.error("General Exception", e);
		}
    	
    	return false;
    }

    /**
     * Prevent application registration when saving application registration form fails
     * 
     * @param app The application being saved
     * @param insClient The client to the InternalNameService
     * @throws TException thrown if getting a client to the registration service fails or deleting the registration fails
     * @throws RegistrationException thrown if deleting the registration fails
     * @throws SecurityIDNotFoundException thrown if deleting the registration fails because the app Id is not valid
     */
    private void checkApplicationSaved(final Application app, 
    								   final InternalNameService.Client insClient,
    								   @Context ContextResolver<ServiceClient> resource ) throws TException, RegistrationException, SecurityIDNotFoundException {
    	ServiceClient serviceClient = getFromContext(resource);
    	EzSecurityRegistration.Client regClient = null;
    	
    	try {
    		insClient.getAppById(app.getId(), getSecurityToken(serviceClient));
		} catch (Exception e) { // regardless of exception, assume something went wrong with saving registration form
			logger.error("Failed to save application registration form. Delete registration", e);
			
	    	regClient = getEzSecurityRegistrationServiceClient(serviceClient);
			regClient.deleteApp(getRegistrationSecurityToken(serviceClient), app.getId());
			regClient = invalidateServiceClient(regClient, serviceClient);
		} finally {
			freeServiceClient(regClient, serviceClient);
		}
    }
    
    /**
     * Check whether or not magic number is magic
     * Current support for .war and .jar file types
     * 
     * @param magicNumber - big endian 
     * @return Response
     */
    @POST
    @Path("/validateArchiveFile/{magicNumber}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response checkValidFileType(@PathParam("magicNumber") final int magicNumber ) {
		final int MAGIC_NUMBER = 1347093252; // big endian
		
		if(MAGIC_NUMBER != magicNumber) {
			logger.error("Invalid file type");
			return Response.status(Status.UNSUPPORTED_MEDIA_TYPE).build();
		}
		
		return Response.status(Status.OK).build();
	}
    
	/**
	 * Submit tasks and populate futures variable that hold status for each submitted task 
	 * 
     * @param es - thread service
     * @param deploymentTypePackage - type and payload to use for deployment
     * @param token - security token
     * @param resource - service resource
     */
    private void asyncDeploy(final ExecutorService es, final DeploymentTypePackage deploymentTypePackage, final EzSecurityToken token, final ServiceClient resource) {
    	Future<String> future = es.submit(new Callable<String>() { 
    		@Override
    		public String call() throws Exception {
                boolean broken = false;
                final EzBakeServiceDeployer.Client client = getEzDeployerServiceClient(resource);
                final String deploymentType = deploymentTypePackage.getDeploymentType();
    			try {
    				switch(deploymentType) {
    					case STAGE_SERVICE:
    						client.stageServiceDeployment(deploymentTypePackage.getArtifactManifest(),
                                    deploymentTypePackage.getArtifact(), token);
    						break;
    					case DEPLOY_SERVICE:
    						client.deployService(deploymentTypePackage.getArtifactManifest(),
                                    deploymentTypePackage.getArtifact(), token);
    						break;
    				}
 
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
    	
    	setFutures(future, deploymentTypePackage);
    }
    
    /**
     * Keep track of running threads and their payload 
     * 
     * @param future - deployment thread details
     * @param deploymentTypePackage - deployment package 
     */
    private void setFutures(Future<String> future, DeploymentTypePackage deploymentTypePackage)  {
    	String serviceId = deploymentTypePackage.getArtifactManifest().getApplicationInfo().getServiceId();
    	String appSecId = deploymentTypePackage.getArtifactManifest().getApplicationInfo().getSecurityId();
    	
    	if(futures.containsKey(appSecId)) {
    		futures.get(appSecId).add(new FutureExtended<>(future, serviceId));
    	} else {
    		Set<FutureExtended<String>> newFuture = new HashSet<>();
    		newFuture.add(new FutureExtended<>(future, serviceId));
    		futures.put(appSecId, newFuture);
    	}
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
	 * Remove all tasks for given appSecId
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
     * Compare two ApplicationRegistration objects
     * 
     * @param registeredApp - application that was previously registered 
     * @param toUpdate - application that is currently being modified
     * 
     * @return true if two objects are equal - no edit made
     */
    private boolean isRegistrationObjectsEqual( ApplicationRegistration registeredApp, ApplicationRegistration toUpdate) {
		return new EqualsBuilder()
								.append(registeredApp.getAdmins(), toUpdate.getAdmins())
								.append(registeredApp.getAppName(), toUpdate.getAppName())
								.append(registeredApp.getAuthorizations(), toUpdate.getAuthorizations())
								.isEquals();
	}
    
    private void eventFailed(AuditEvent auditEvent, Exception e) {
    	if(auditEvent != null) {
    		auditEvent.failed();
    	} else {
    		logger.error("Failed to initialize Audit Event for exception:{}", e.getMessage());
    	}
    }
    
    /**
     * Helper function to get YML overrides based on application object
     * 
     * @param application
     * @return
     */
    private HashMap<String, Object> getYMLOverrides(Application application) {
    	
        HashMap<String, Object> overrides = new HashMap<>();
        overrides.put(YmlKeys.RootManifestKeys.applicationName.getName(), application.getAppName());
        overrides.put(YmlKeys.RootManifestKeys.securityId.getName(), application.getId());
        
        return overrides;
    }
    
    /**
     * Utility function to extract magic number from a file
     * Current support for .war and .jar file types
     * 
     * @param file
     * @return 4 byte int magic number - big endian
     * @throws IOException
     */
    private int getMagicNumber(final File file) throws IOException  {
		// is it really a file
		if(!file.isFile()) {
			throw new InvalidOpenTypeException("Invalid file type");
		}
		
		try(FileInputStream fis = new FileInputStream(file)) {
			byte[] bytes = new byte[4];
			fis.read(bytes, 0, 4);
			ByteBuffer bB = ByteBuffer.wrap(bytes);
			
			return bB.getInt(); 
		}
    }
    
    /**
     * Scan authorization string for classification id
     * Return highest classification 
     * 
     * @param authorizations  - List of all the auths
     * @return classification id
     * @throws Exception - when unable to find classification inside given authorizations
     */
    private String getHighestClassification(Set<String> authorizations) throws Exception  {
    	String classification = "";
    	int ordinal = Integer.MAX_VALUE;
    	
    	for(String authorization : authorizations) {
    		try {
    			if(Classifications.valueOf(authorization.toUpperCase()).ordinal() < ordinal) {
    				classification = Classifications.valueOf(authorization.toUpperCase()).toString();
    			}
    		}catch(IllegalArgumentException e) {
    			// skip unknown or illegal classifications
    		}
    	}
    	
    	if(classification.equals("")) {
    		logger.error("Unable to find classification in passed authorizations. Supported classifications:" + Classifications.listSupportedClassifications());
    		throw new Exception();
    	}
    	
    	return classification;
	}

    private enum Classifications {
    	TS("TS"),
    	S("S"),
    	C("C"),
    	U("U");
    	
    	private String classification;
    	
    	private Classifications(String classification) {
    		this.classification = classification;
    	}
    	
    	@Override
    	public String toString() {
    		return classification;
    	}
    	
    	public static String listSupportedClassifications() {
    		String result = "|";
    		for(Classifications cl : Classifications.values() ) {
    			result += Classifications.valueOf(cl.name()).toString() + "|";
    		}
    		
    		return result;
    	}
    }

    private class DeploymentTypePackage {
    	private String deploymentType;
    	private ArtifactManifest artifactManifest;
    	private ByteBuffer artifact;

    	// constructor for service deployer
    	public DeploymentTypePackage(String aDeploymentType, ArtifactManifest anArtifactManifest, ByteBuffer anArtifact) {
    		deploymentType = aDeploymentType;
    		artifactManifest = anArtifactManifest;
    		artifact = anArtifact;
    	}


		public String getDeploymentType() {
			return deploymentType;
		}

		public ArtifactManifest getArtifactManifest() {
			return artifactManifest;
		}

		public ByteBuffer getArtifact() {
			return artifact;
		}
    }
    
	private Application setNoNulls(Application application,
								   @Context ContextResolver<ServiceClient> resource) {
		ServiceClient serviceClient = getFromContext(resource);
        checkAuthToken(serviceClient);
        if (application.webApp == null) {
            application.webApp = new WebApplication();
        }
        if (application.feedPipelines == null) {
            application.feedPipelines = new HashSet<>();
        }
        if (application.listenerPipelines == null) {
            application.listenerPipelines = new HashSet<>();
        }
        if (application.intentServiceMap == null) {
        	application.intentServiceMap = new HashMap<>();
        }
        
        return application;
    }
	
    /**
     * Check whether or not pipe name and topics are the same between two objects
     * 
     * @param currentApp edited application
     * @return true if topic edited
     * @throws TException 
     */
    public boolean isTopicsEdited(Application currentApp,
    							  @Context ContextResolver<ServiceClient> resource) throws TException {
    	ServiceClient serviceClient = getFromContext(resource);
    	InternalNameService.Client client = null;
    	try {
			client = getINSServiceClient(serviceClient);
		
	    	EzSecurityToken ezToken = getSecurityToken(serviceClient);
	    	
	    	Map<String, Set<String>> existingPipesTopics = getTopics(client.getAppById(currentApp.getId(), ezToken));
	    	Map<String, Set<String>> editedPipesTopics = getTopics(currentApp);
	    	
	    	// check if pipes match first
	    	if(existingPipesTopics.keySet().size() != editedPipesTopics.keySet().size()) {
	    		return true;
	    	} else if(!existingPipesTopics.keySet().containsAll(editedPipesTopics.keySet())) {
	    		return true;
	    	}
	    	
	    	// for every pipe check topics
	    	for(Map.Entry<String, Set<String>> existingPipeTopics : existingPipesTopics.entrySet()) {
	            if (existingPipeTopics.getValue() == null || editedPipesTopics.get(existingPipeTopics.getKey()) == null) {
	                return true;
	            } else if(existingPipeTopics.getValue().size() != editedPipesTopics.get(existingPipeTopics.getKey()).size()) {
	    			return true;
	    		} else if(!existingPipeTopics.getValue().containsAll(editedPipesTopics.get(existingPipeTopics.getKey()))) {
	    			return true;
	    		}
	    	}
	    	
		} finally {
			freeServiceClient(client, serviceClient);
		}
    	
    	return false;
    }
    
	/**
	 * Helper function to get list of topics pipe listens to
	 * 
	 * @param app - The application
	 * @return map of pipe name -> topics
	 */
    @VisibleForTesting
	protected Map<String, Set<String>> getTopics(Application app) {
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
     * Utility function to handle log events 
     * @param auditEvent
     */
	private void logEvent(AuditEvent auditEvent) {
		try {
			auditLogger.logEvent(auditEvent);
		} catch(Exception e) {
			// if event logger fails then...
		}
	}
	
    public class DeployedPackageMetadata {
    	private String appName; // aka appId
		private String appSecId;
    	private String appServiceId;
		private String ezfrontEndLink;
        private DeploymentStatus status;
        private boolean canDeploy;

		// for none-web applications
		public DeployedPackageMetadata(String appName, String appSecId, String appServiceId, DeploymentStatus status,
                                       boolean canDeploy) {
			this(appName, appSecId, appServiceId, status, canDeploy, "", "");
		}

        // for web applications
		public DeployedPackageMetadata(String appName, String appSecId, String appServiceId, DeploymentStatus status,
                                       boolean canDeploy, String externalFacingDomain, String externalWebUrl) {
    		setAppName(appName);
    		setAppSecId(appSecId);
    		setAppServiceId(appServiceId);
    		setEzFrontEndLink(externalFacingDomain, externalWebUrl);
            this.status = status;
            this.canDeploy = canDeploy;
    	}
    	
    	public void setEzFrontEndLink(String externalFacingDomain, String externalWebUrl) {
            if (!Strings.isNullOrEmpty(externalFacingDomain) && !Strings.isNullOrEmpty(externalWebUrl)) {
                this.ezfrontEndLink = externalFacingDomain + "/" + externalWebUrl;
            }
            else {
                this.ezfrontEndLink = "";
            }
        }
    	
        public String getEzfrontEndLink() {
            return ezfrontEndLink;
        }

        public DeploymentStatus getStatus() {
            return status;
        }

        public boolean isCanDeploy() {
            return canDeploy;
        }

        public String getAppName() {
			return appName;
		}

		public void setAppName(String appName) {
			this.appName = appName;
		}

		public String getAppSecId() {
			return appSecId;
		}

		public void setAppSecId(String appSecId) {
			this.appSecId = appSecId;
		}

		public String getAppServiceId() {
			return appServiceId;
		}

		public void setAppServiceId(String appServiceId) {
			this.appServiceId = appServiceId;
		}
		
    	@Override
		public String toString() {
			return "DeployedPackageMetadata [appName=" + appName
					+ ", appSecId=" + appSecId + ", appServiceId="
					+ appServiceId + ", ezfrontEndLink=" + ezfrontEndLink + "]";
		}
    }
}
