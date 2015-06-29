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


import javax.ws.rs.ext.ContextResolver;
import javax.ws.rs.ext.Provider;

/**
 * Used by Jax-RS to inject the ServiceClient into methods in the resource.
 */
@Provider
public class ServiceClientResolver implements ContextResolver<ServiceClient> {
    private final ServiceClient serviceClient;

    public ServiceClientResolver() {
        serviceClient = new ServiceClient();
    }

    @Override
    public ServiceClient getContext(Class<?> aClass) {
        return serviceClient;
    }
}
