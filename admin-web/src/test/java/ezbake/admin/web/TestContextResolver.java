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
