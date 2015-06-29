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


import static org.easymock.EasyMock.createMockBuilder;
import static org.easymock.EasyMock.expect;
import static org.easymock.EasyMock.expectLastCall;
import static org.easymock.EasyMock.replay;
import static org.easymock.EasyMock.reset;
import static org.easymock.EasyMock.verify;
import static org.junit.Assert.assertEquals;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.Response.Status;

import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;

import com.google.common.base.Joiner;
import com.google.common.collect.Lists;
import com.google.common.collect.Sets;

import ezbake.admin.web.AdminResource.RegistrationData;
import ezbake.base.thrift.EzSecurityPrincipal;
import ezbake.base.thrift.EzSecurityToken;
import ezbake.configuration.ClasspathConfigurationLoader;
import ezbake.configuration.EzConfiguration;
import ezbake.groups.thrift.EzGroupNamesConstants;
import ezbake.groups.thrift.EzGroups;
import ezbake.groups.thrift.EzGroupsConstants;
import ezbake.groups.thrift.GroupInheritancePermissions;
import ezbake.groups.thrift.UserGroupPermissions;
import ezbake.ins.thrift.gen.AppAccess;
import ezbake.ins.thrift.gen.Application;
import ezbake.ins.thrift.gen.BroadcastTopic;
import ezbake.ins.thrift.gen.FeedPipeline;
import ezbake.ins.thrift.gen.InternalNameService;
import ezbake.ins.thrift.gen.InternalNameServiceConstants;
import ezbake.ins.thrift.gen.ListenerPipeline;
import ezbake.ins.thrift.gen.WebApplication;
import ezbake.ins.thrift.gen.WebApplicationLink;
import ezbake.query.intents.IntentType;
import ezbake.security.client.EzSecurityTokenWrapper;
import ezbake.security.client.EzbakeSecurityClient;
import ezbake.security.common.core.EzSecurityConstant;
import ezbake.security.thrift.ApplicationRegistration;
import ezbake.security.thrift.EzSecurityRegistration;
import ezbake.security.thrift.EzSecurityRegistrationConstants;
import ezbake.security.thrift.RegistrationStatus;
import ezbake.services.deploy.thrift.ApplicationInfo;
import ezbake.services.deploy.thrift.ArtifactManifest;
import ezbake.services.deploy.thrift.DeploymentMetadata;
import ezbake.services.deploy.thrift.DeploymentStatus;
import ezbake.services.deploy.thrift.EzBakeServiceDeployer;
import ezbake.services.deploy.thrift.EzDeployServiceConstants;
import ezbake.thrift.ThriftClientPool;
import ezbake.util.AuditLogger;

public class AdminResourceTest {
	
	private static InternalNameService.Client insClientMock;
	private static EzSecurityRegistration.Client regClientMock;
	private static EzBakeServiceDeployer.Client deployerMock;
    private static EzGroups.Client groupsMock;
	private static EzSecurityTokenWrapper ezTokenMock;
    private static ThriftClientPool mockPool;
    private static EzbakeSecurityClient securityClientMock;
    private static TestContextResolver contextResolver;
	private static String DEPLOYMENT_QUERY_TERM = "security-id";
	private static String TEST_ID = "1234567890987654321";
	private static String APP_NAME = "MyApp";
	private static String SERVICE_ID1 = "EasyListener";
	private static final String SERVICE_ID2 = "ForceFeed";
	private static String POC = "Unit Tester";
    private static AuditLogger auditLogger;
	
	@BeforeClass
	public static void initBeforeTestSuite() throws Exception {
        mockPool = createMockBuilder(ThriftClientPool.class)
                .addMockedMethod(ThriftClientPool.class.getDeclaredMethod("getClient", String.class, Class.class))
                .addMockedMethod("returnToPool")
                .addMockedMethod("getSecurityId")
                .createMock();
        securityClientMock = createMockBuilder(EzbakeSecurityClient.class)
                .addMockedMethod(EzbakeSecurityClient.class.getDeclaredMethod("fetchTokenForProxiedUser"))
                .addMockedMethod("fetchTokenForProxiedUser", String.class)
                .createMock();
		insClientMock = createMockBuilder(InternalNameService.Client.class)
				.addMockedMethod("getCategories")
				.addMockedMethod("addCategory", String.class, EzSecurityToken.class)
				.addMockedMethod("getAppById", String.class, EzSecurityToken.class)
				.createMock();
		regClientMock = createMockBuilder(EzSecurityRegistration.Client.class)
					.addMockedMethod("getRegistration", EzSecurityToken.class, String.class)
					.addMockedMethod("promote",  EzSecurityToken.class, String.class)
					.addMockedMethod("denyApp",  EzSecurityToken.class, String.class)
					.addMockedMethod("getAllRegistrations", EzSecurityToken.class, RegistrationStatus.class)
					.createMock(); 
		deployerMock = createMockBuilder(EzBakeServiceDeployer.Client.class)
				.addMockedMethod("listDeployed", String.class, String.class, EzSecurityToken.class)
				.addMockedMethod("undeploy", String.class, String.class, EzSecurityToken.class)
				.createMock();
        groupsMock = createMockBuilder(EzGroups.Client.class)
                .addMockedMethod("activateAppUser")
                .addMockedMethod("addUserToGroup")
                .addMockedMethod("addAppUserToGroup")
                .addMockedMethod("modifyAppUser")
                .addMockedMethod("changeGroupInheritance")
                .createMock();
		ezTokenMock = createMockBuilder(EzSecurityTokenWrapper.class).withConstructor()
                .addMockedMethod("getExternalProjectGroups")
                .addMockedMethod("getTokenPrincipal")
                .createMock();
        contextResolver = new TestContextResolver(mockPool, securityClientMock);
        auditLogger = AuditLogger.getDefaultAuditLogger(AdminResource.class,
                new EzConfiguration(new ClasspathConfigurationLoader()).getProperties());
	}
	
	@Before
	public void initBeforeEachTest() {
        reset(mockPool);
        reset(securityClientMock);
		reset(insClientMock);
		reset(regClientMock);
		reset(ezTokenMock);
        reset(groupsMock);
	}

    private void setupStandardMocks() throws Exception {
        Map<String, List<String>> externalGroups = new HashMap<>();
        externalGroups.put(EzSecurityConstant.EZ_INTERNAL_PROJECT, Lists.newArrayList(EzSecurityConstant.EZ_INTERNAL_ADMIN_GROUP));
        EzSecurityPrincipal principal = new EzSecurityPrincipal();
        principal.setPrincipal(POC).setName(POC);

        expect(mockPool.getClient(InternalNameServiceConstants.SERVICE_NAME, InternalNameService.Client.class))
                .andReturn(insClientMock).anyTimes();
        expect(mockPool.getClient(EzSecurityRegistrationConstants.SERVICE_NAME,
                EzSecurityRegistration.Client.class))
                .andReturn(regClientMock).anyTimes();
        expect(mockPool.getClient(EzGroupsConstants.SERVICE_NAME,
                EzGroups.Client.class))
                .andReturn(groupsMock).anyTimes();

        expect(mockPool.getSecurityId(EzSecurityRegistrationConstants.SERVICE_NAME)).andReturn("").anyTimes();
        expect(mockPool.getSecurityId(EzDeployServiceConstants.SERVICE_NAME)).andReturn("").anyTimes();
        expect(mockPool.getSecurityId(EzGroupsConstants.SERVICE_NAME)).andReturn("").anyTimes();

        expect(securityClientMock.fetchTokenForProxiedUser()).andReturn(ezTokenMock).anyTimes();
        expect(securityClientMock.fetchTokenForProxiedUser("")).andReturn(ezTokenMock).anyTimes();

        expect(ezTokenMock.getExternalProjectGroups()).andReturn(externalGroups).anyTimes();
        expect(ezTokenMock.getTokenPrincipal()).andReturn(principal).anyTimes();
        mockPool.returnToPool(insClientMock);
        expectLastCall().anyTimes();
        mockPool.returnToPool(regClientMock);
        expectLastCall().anyTimes();
        mockPool.returnToPool(groupsMock);
        expectLastCall().anyTimes();
    }


    @Test(expected = WebApplicationException.class)
    public void testGetSecurityToken() throws Exception {
        AdminResource tested = new AdminResource(auditLogger);
        expect(ezTokenMock.getExternalProjectGroups()).andReturn(new HashMap<String, List<String>>()).anyTimes();
        expect(securityClientMock.fetchTokenForProxiedUser()).andReturn(ezTokenMock).anyTimes();
        replay(securityClientMock, ezTokenMock);
        tested.getSecurityToken(contextResolver.getContext(ServiceClient.class));
        // this call is expected to fail with WebApplicationException as stated in the header @Test(expected = WebApplicationException.class)
        // test passes when return value to isEzAdmin call is false, if true is passed then test fails
    }

	@Test
	public void testGetCategories() throws Exception  {
		Set<String> expectedEmpty = Sets.newHashSet();

        AdminResource tested = new AdminResource(auditLogger);
        setupStandardMocks();
		expect(insClientMock.getCategories()).andReturn(expectedEmpty).once(); 	

        replay(mockPool, securityClientMock, ezTokenMock, insClientMock);
		assertEquals(expectedEmpty, tested.getCategories(contextResolver));
        verify(insClientMock);
	}

	@Test
	public void testRegisterApp() throws Exception {
	    AdminResource tested = new AdminResource(auditLogger);
		ApplicationRegistration appRegMock = new ApplicationRegistration().setAppName(APP_NAME).setId("12345")
                .setAdmins(Sets.newHashSet("CN=ezbake", "CN=tester"));
		Application appMock = getApplication();
        setupStandardMocks();
        
		expect(regClientMock.getRegistration(ezTokenMock, TEST_ID)).andReturn(appRegMock).anyTimes();
        expect(insClientMock.getAppById(TEST_ID, ezTokenMock)).andReturn(getApplication()).times(2);
        groupsMock.activateAppUser(ezTokenMock, appRegMock.getId());
        expectLastCall();
        
        groupsMock.modifyAppUser(ezTokenMock, appRegMock.getId(), appRegMock.getId(), appRegMock.getAppName());
        expectLastCall();
        
        UserGroupPermissions permissions = new UserGroupPermissions().setDataAccess(true).setAdminRead(true).setAdminWrite(true)
                .setAdminManage(true).setAdminCreateChild(true);
        String groupName = Joiner.on(EzGroupNamesConstants.GROUP_NAME_SEP).join(EzGroupNamesConstants.APP_GROUP, getAppRegistration().getAppName());
        
        groupsMock.addUserToGroup(ezTokenMock, groupName, "CN=ezbake", permissions);
        expectLastCall();
        
        groupsMock.addUserToGroup(ezTokenMock, groupName, "CN=tester", permissions);
        expectLastCall();

        // appaccess restriction
		GroupInheritancePermissions inheritance = new GroupInheritancePermissions(false, false, false, false, false);
		groupName = Joiner.on(EzGroupNamesConstants.GROUP_NAME_SEP).join(EzGroupNamesConstants.APP_ACCESS_GROUP, getAppRegistration().getAppName());
		groupsMock.changeGroupInheritance(ezTokenMock, groupName, inheritance);
		
     	Map<String, String> restrictedToApps = appMock.getAppAccess().getRestrictedToApps();
    	for(String appName : restrictedToApps.keySet()) {
    		groupsMock.addAppUserToGroup(ezTokenMock, groupName, restrictedToApps.get(appName), new UserGroupPermissions());
    	}
    	
        //Registering with true should promote
		regClientMock.promote(ezTokenMock, TEST_ID);
        expectLastCall();

        //Registering with false should deny
		regClientMock.denyApp(ezTokenMock, TEST_ID);
		expectLastCall();
		
		replay(mockPool, securityClientMock, regClientMock, ezTokenMock, groupsMock, insClientMock);
		
		assertEquals(tested.registerApp(TEST_ID, true, contextResolver).getStatus(), Status.OK.getStatusCode());
		assertEquals(tested.registerApp(TEST_ID, false, contextResolver).getStatus(), Status.OK.getStatusCode());
        verify(regClientMock);
	}

	@Test
	public void testServiceUndeploy() throws Exception {
		final int serviceClientsUsed = 4;
		AdminResource tested = new AdminResource(auditLogger);
		ApplicationRegistration appReg = new ApplicationRegistration().setAppName(APP_NAME).setId("12345")
				.setAdmins(Sets.newHashSet("CN=ezbake", "CN=tester"));
		setupStandardMocks();
		
		expect(mockPool.getClient(EzDeployServiceConstants.SERVICE_NAME,
				EzBakeServiceDeployer.Client.class))
				.andReturn(deployerMock).times(serviceClientsUsed);
		expect(regClientMock.getRegistration(ezTokenMock, TEST_ID)).andReturn(appReg).anyTimes();
		mockPool.returnToPool(deployerMock);
		expectLastCall().times(serviceClientsUsed);

		List<DeploymentMetadata> deployedApps = new ArrayList<DeploymentMetadata>();
		DeploymentMetadata dm1 = getDeploymentMetadata();
		dm1.setStatus(DeploymentStatus.Deployed);
		DeploymentMetadata dm2 = getDeploymentMetadata();
		dm2.getManifest().getApplicationInfo().setServiceId(SERVICE_ID2);
		dm2.setStatus(DeploymentStatus.Staged);
		deployedApps.add(dm1);
		deployedApps.add(dm2);
		expect(deployerMock.listDeployed(DEPLOYMENT_QUERY_TERM, TEST_ID, ezTokenMock)).andReturn(deployedApps).anyTimes();

		List<DeploymentMetadata> noApps = new ArrayList<DeploymentMetadata>();
		expect(deployerMock.listDeployed(DEPLOYMENT_QUERY_TERM, "invalidApp", ezTokenMock)).andReturn(noApps).anyTimes();

		deployerMock.undeploy(TEST_ID, SERVICE_ID1, ezTokenMock);
		expectLastCall();

		replay(regClientMock, securityClientMock, ezTokenMock, mockPool, deployerMock);
		assertEquals(tested.setServiceDeployState(TEST_ID, SERVICE_ID1, false, contextResolver).getStatus(), Status.OK.getStatusCode());
		assertEquals(tested.setServiceDeployState(TEST_ID, "invalidId", false, contextResolver).getStatus(), Status.BAD_REQUEST.getStatusCode());
		// BAD_REQUEST status expected because service status is Staged
		assertEquals(tested.setServiceDeployState(TEST_ID, SERVICE_ID2, false, contextResolver).getStatus(), Status.BAD_REQUEST.getStatusCode());
		assertEquals(tested.setServiceDeployState("invalidApp", SERVICE_ID1, false, contextResolver).getStatus(), Status.BAD_REQUEST.getStatusCode());
		verify(deployerMock);
	}

	@Test(expected = IllegalArgumentException.class)
	public void testGetListOfAppsFromRegistration() throws Exception {
		String status = "PENDING";
		
		Application app = getApplication();
		ApplicationRegistration appReg = getAppRegistration();
		
		List<ApplicationRegistration> appRegList = new ArrayList<>();
		appRegList.add(appReg);
	
	    AdminResource tested = new AdminResource(auditLogger);
        setupStandardMocks();
		
		expect(RegistrationStatus.valueOf("ILLEGAL_STATUS")).andThrow(new IllegalArgumentException());
		expect(regClientMock.getAllRegistrations(ezTokenMock, RegistrationStatus.valueOf(status))).andReturn(appRegList);
		expect(insClientMock.getAppById(appReg.getId(), ezTokenMock)).andReturn(app);
		
		replay(mockPool, securityClientMock, insClientMock, regClientMock, ezTokenMock);
		
		Set<RegistrationData> actual = tested.getListOfAppsFromRegistration(status, contextResolver);

		assertEquals(1, actual.size());
		verify(regClientMock, insClientMock);
	}
	
	private ApplicationRegistration getAppRegistration() {
		ApplicationRegistration appReg = new ApplicationRegistration();
		appReg.setOwner("CN=Owner, OU=People, O=Reg Admin, C=US");
		appReg.setAppName(APP_NAME);
		appReg.setId(TEST_ID);
		
		List<String> authorizations = new ArrayList<>();
		authorizations.add("CN=Test One, OU=People, O=Reg Admin, C=US");
		appReg.setAuthorizations(authorizations);
		
		return appReg;
	}
	
	private Application getApplication() {
        Application app = new Application();

        app.setAppName(APP_NAME);
        app.setPoc(POC);
        app.setAllowedUsers(Sets.newHashSet("CN=Test One, OU=People, O=Reg Admin, C=US"));

        HashMap<String, String> categories = new HashMap<>();
        categories.put("cnn", "NEWS");
        categories.put("facespace", "SOCIAL");
        app.setCategories(categories);
        app.setId(TEST_ID);
        app.setAuthorizations(Sets.newHashSet("U", "FOUO"));

        FeedPipeline feed = new FeedPipeline();
        feed.setFeedName("CNN");
        BroadcastTopic feedTopic = new BroadcastTopic();
        feedTopic.setDescription("News Feed");
        feedTopic.setName("cnn");
        feedTopic.setThriftDefinition("thrift idl here");
        feed.setBroadcastTopics(Sets.newHashSet(feedTopic));
        feed.setDescription("My CNN Feed");
        feed.setExportingSystem("CNN.com");
        feed.setType("Streaming");
        feed.setDataType("XML");
        app.setFeedPipelines(Sets.newHashSet(feed));

        WebApplication webApp = new WebApplication();
        webApp.setIsChloeEnabled(true);
        Map<String, WebApplicationLink> urnMap = new HashMap<>();
        WebApplicationLink link = new WebApplicationLink();
        link.setWebUrl("https://apps.some.domain.com/cnn?id={id}");
        urnMap.put("NEWS://CNN/", link);
        webApp.setUrnMap(urnMap);
        app.setWebApp(webApp);

        ListenerPipeline listener = new ListenerPipeline();
        BroadcastTopic broadcastTopic = new BroadcastTopic();
        broadcastTopic.setDescription("CNN Normalized");
        broadcastTopic.setName("CNN-Norm");
        broadcastTopic.setThriftDefinition("thrift idl here");
        listener.setBroadcastTopics(Sets.newHashSet(broadcastTopic));
        listener.setDescription("Indexing pipeline for CNN Data");
        listener.setFeedName("CNN-Index");
        listener.setListeningTopics(Sets.newHashSet("cnn-breaking", "cnn-us"));
        app.setListenerPipelines(Sets.newHashSet(listener));

        Map<String, String> intentServiceMap = new HashMap<>();
        intentServiceMap.put(IntentType.LOCATION.name(), "Service1");
        intentServiceMap.put(IntentType.IMAGE.name(), "Service2");
        app.setIntentServiceMap(intentServiceMap);

        Map<String, String> restrictedToApps = new HashMap<>();
        restrictedToApps.put("AppName-1", "AppSecId-1");
        restrictedToApps.put("AppName-2", "AppSecId-2");
        AppAccess appAccess = new AppAccess().setIsNotRestricted(false).setRestrictedToApps(restrictedToApps);
        app.setAppAccess(appAccess);
        
        return app;
    }

	private DeploymentMetadata getDeploymentMetadata () {
		ApplicationInfo ai = new ApplicationInfo();
		ai.setServiceId(SERVICE_ID1);
		ArtifactManifest m = new ArtifactManifest();
		m.setApplicationInfo(ai);
		DeploymentMetadata retval = new DeploymentMetadata();
		retval.setManifest(m);
		return retval;
	}
}
