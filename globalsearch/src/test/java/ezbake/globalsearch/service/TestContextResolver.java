package ezbake.globalsearch.service;

import ezbake.security.client.EzbakeSecurityClient;
import ezbake.thrift.ThriftClientPool;

import javax.ws.rs.ext.ContextResolver;
import java.util.Properties;

/**
 * Test resolver to take the place of the one used for JAX-RS
 */
public class TestContextResolver implements ContextResolver<ServiceClient> {
    private ThriftClientPool mockPool;
    private EzbakeSecurityClient mockClient;

    public TestContextResolver(ThriftClientPool mockPool, EzbakeSecurityClient mockClient) {
        this.mockPool = mockPool;
        this.mockClient = mockClient;
    }

    @Override
    public ServiceClient getContext(Class<?> aClass) {
        Properties properties = new Properties();
        return new ServiceClient(mockPool, properties, mockClient);
    }
}
