package ezbake.ins.web;

import java.util.Properties;

import javax.ws.rs.ext.ContextResolver;

import ezbake.security.client.EzbakeSecurityClient;
import ezbake.thrift.ThriftClientPool;

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
