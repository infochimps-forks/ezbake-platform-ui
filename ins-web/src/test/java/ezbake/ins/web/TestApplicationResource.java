package ezbake.ins.web;

import static org.easymock.EasyMock.createMockBuilder;
import static org.easymock.EasyMock.expect;
import static org.easymock.EasyMock.expectLastCall;
import static org.easymock.EasyMock.replay;
import static org.easymock.EasyMock.reset;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.ws.rs.core.Response.Status;

import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;

import com.google.common.collect.Lists;
import com.google.common.collect.Sets;

import ezbake.base.thrift.EzSecurityPrincipal;
import ezbake.base.thrift.EzSecurityToken;
import ezbake.configuration.ClasspathConfigurationLoader;
import ezbake.configuration.EzConfiguration;
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
import ezbake.security.thrift.EzSecurityRegistration;
import ezbake.security.thrift.EzSecurityRegistrationConstants;
import ezbake.security.thrift.RegistrationStatus;
import ezbake.services.deploy.thrift.EzDeployServiceConstants;
import ezbake.thrift.ThriftClientPool;
import ezbake.util.AuditLogger;

public class TestApplicationResource {
	
	private static InternalNameService.Client insClientMock;
	private static EzSecurityRegistration.Client regClientMock;
	private static EzSecurityTokenWrapper ezTokenMock;
    private static ThriftClientPool mockPool;
    private static EzbakeSecurityClient securityClientMock;
    private static TestContextResolver contextResolver;
	
	private static String TEST_ID = "48454c4c4f-20-574f524c44";
	private static String APP_NAME = "MyApp";
	private static String POC = "Unit Tester";
    private static String FEED_NAME = "Test Feed Name";
    private static String TOPIC_NAME = "Test Topic Name";
    private static AuditLogger auditLogger;

	
	@BeforeClass
	public static void initBeforeTestSuite() throws Exception {
        mockPool = createMockBuilder(ThriftClientPool.class)
                .addMockedMethod(ThriftClientPool.class.getDeclaredMethod("getClient", String.class, Class.class))
                .addMockedMethod(ServiceClient.class.getDeclaredMethod("getClientPool"))
                .addMockedMethod("returnToPool")
                .addMockedMethod("getSecurityId")
                .createMock();
        securityClientMock = createMockBuilder(EzbakeSecurityClient.class)
                .addMockedMethod(EzbakeSecurityClient.class.getDeclaredMethod("fetchTokenForProxiedUser"))
                .addMockedMethod("fetchTokenForProxiedUser", String.class)
                .addMockedMethod("isEzAdmin", EzSecurityToken.class)
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
	}
	
	@Test
	public void TestCheckValidFileType() {
		ApplicationResource tested = new ApplicationResource(auditLogger);
		int invalidMagicNumber = 12345;
		int validMagicNumber = 1347093252; // big endian 
		
		javax.ws.rs.core.Response expected = javax.ws.rs.core.Response.status(Status.UNSUPPORTED_MEDIA_TYPE).build();
		javax.ws.rs.core.Response actual = tested.checkValidFileType(invalidMagicNumber);
		assertEquals(expected.getStatus(), actual.getStatus());
		
		expected = javax.ws.rs.core.Response.status(Status.OK).build();
		actual = tested.checkValidFileType(validMagicNumber);
		assertEquals(expected.getStatus(), actual.getStatus());
	}
	
	
	@Test
	public void testIsTopicsEdited() throws Exception {
		ApplicationResource tested = new ApplicationResource(auditLogger);
		Application editedApp = getApplication();

        // both objects are the same
		resetForIsTopicsEdited();
        assertFalse(tested.isTopicsEdited(editedApp, contextResolver));
        
        // number of pipes differs
        resetForIsTopicsEdited();
        editedApp.getListenerPipelines().add((new ListenerPipeline()).setFeedName(FEED_NAME));
        assertTrue(tested.isTopicsEdited(editedApp, contextResolver));
        
        // number of pipes equal, but names different
        resetForIsTopicsEdited();
        editedApp = getApplication();
        editedApp.getListenerPipelinesIterator().next().setFeedName(FEED_NAME);
        assertTrue(tested.isTopicsEdited(editedApp, contextResolver));
        
        // number of pipes equal, pipe names equal, number of topics different
        resetForIsTopicsEdited();
        editedApp = getApplication();
        editedApp.getListenerPipelinesIterator().next().addToListeningTopics(TOPIC_NAME);
        assertTrue(tested.isTopicsEdited(editedApp, contextResolver));
        
        // number of pipes equal, pipe names equal, number of topics eqaul, topics name different
        resetForIsTopicsEdited();
        editedApp = getApplication();
        editedApp.getListenerPipelinesIterator().next().setListeningTopics(Sets.newHashSet(TOPIC_NAME, TOPIC_NAME + "_2"));
        assertTrue(tested.isTopicsEdited(editedApp, contextResolver));

        // one doesn't have any topics
        resetForIsTopicsEdited();
        editedApp.getListenerPipelinesIterator().next().setListeningTopics(null);
        assertTrue(tested.isTopicsEdited(editedApp, contextResolver));
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
        feedTopic.setThriftDefinition("a thrift idl");
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
        broadcastTopic.setThriftDefinition("a thrift idl");
        listener.setBroadcastTopics(Sets.newHashSet(broadcastTopic));
        listener.setDescription("Indexing pipeline for CNN Data");
        listener.setFeedName("CNN-Index");
        listener.setListeningTopics(Sets.newHashSet("cnn-breaking", "cnn-us"));
        app.setListenerPipelines(Sets.newHashSet(listener));

        Map<String, String> intentServiceMap = new HashMap<>();
        intentServiceMap.put(IntentType.LOCATION.name(), "Service1");
        intentServiceMap.put(IntentType.IMAGE.name(), "Service2");
        app.setIntentServiceMap(intentServiceMap);
		
		return app;
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

        expect(mockPool.getSecurityId(EzSecurityRegistrationConstants.SERVICE_NAME)).andReturn("").anyTimes();
        expect(mockPool.getSecurityId(EzDeployServiceConstants.SERVICE_NAME)).andReturn("").anyTimes();

        expect(securityClientMock.fetchTokenForProxiedUser()).andReturn(ezTokenMock).anyTimes();
        expect(securityClientMock.fetchTokenForProxiedUser("")).andReturn(ezTokenMock).anyTimes();

        expect(insClientMock.getAppById("48454c4c4f-20-574f524c44", ezTokenMock)).andReturn(getApplication());
        
        expect(ezTokenMock.getExternalProjectGroups()).andReturn(externalGroups).anyTimes();
        expect(ezTokenMock.getTokenPrincipal()).andReturn(principal).anyTimes();
        mockPool.returnToPool(insClientMock);
        expectLastCall().anyTimes();
        mockPool.returnToPool(regClientMock);
        expectLastCall().anyTimes();
    }
    
    private void resetForIsTopicsEdited() throws Exception {
        initBeforeEachTest();
        setupStandardMocks();
        replay(mockPool, insClientMock, securityClientMock, ezTokenMock);
    }
}