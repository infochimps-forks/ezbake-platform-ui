package ezbake.globalsearch.resource;

import ezbake.base.thrift.EzSecurityToken;
import ezbake.configuration.ClasspathConfigurationLoader;
import ezbake.configuration.EzConfiguration;
import ezbake.globalsearch.service.TestContextResolver;
import ezbake.groups.thrift.EzGroups;
import ezbake.ins.thrift.gen.InternalNameService;
import ezbake.security.client.EzSecurityTokenWrapper;
import ezbake.security.client.EzbakeSecurityClient;
import ezbake.thrift.ThriftClientPool;
import ezbake.util.AuditLogger;
import org.junit.Before;
import org.junit.BeforeClass;

import java.util.Set;

import static org.easymock.EasyMock.createMockBuilder;
import static org.easymock.EasyMock.reset;

public class ApiResourceTest {
    private static InternalNameService.Client insClientMock;
    private static EzGroups.Client groupsMock;
    private static EzSecurityTokenWrapper ezTokenMock;
    private static ThriftClientPool mockPool;
    private static EzbakeSecurityClient securityClientMock;
    private static TestContextResolver contextResolver;
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
                .addMockedMethod("getWebAppsForUri", String.class)
                .createMock();
        groupsMock = createMockBuilder(EzGroups.Client.class)
                .addMockedMethod("getGroupsMask", EzSecurityToken.class, Set.class)
                .createMock();
        contextResolver = new TestContextResolver(mockPool, securityClientMock);
        auditLogger = AuditLogger.getDefaultAuditLogger(ApiResource.class,
                new EzConfiguration(new ClasspathConfigurationLoader()).getProperties());
    }

    @Before
    public void initBeforeEachTest() {
        reset(mockPool);
        reset(securityClientMock);
        reset(insClientMock);
        reset(groupsMock);
    }

//    @Test
//    public void testOne() throws Exception {
//        ApiResource tested = new ApiResource();
//    }
}
