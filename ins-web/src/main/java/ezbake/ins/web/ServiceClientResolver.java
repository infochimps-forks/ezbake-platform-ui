package ezbake.ins.web;


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
