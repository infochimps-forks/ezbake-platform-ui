package ezbake.webservices;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintWriter;
import javax.servlet.ServletConfig;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.codehaus.jackson.map.ObjectMapper;
import org.json.JSONException;
import org.junit.After;
import org.skyscreamer.jsonassert.JSONAssert;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import static org.mockito.Mockito.*;
import org.mockito.runners.MockitoJUnitRunner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RunWith(MockitoJUnitRunner.class)
public class EzConfigurationServletTest {

   private static final Logger logger = LoggerFactory.getLogger(EzConfigurationServletTest.class);

   @Mock
   private HttpServletRequest mockRequest;

   @Mock
   private HttpServletResponse mockResponse;
   
   @Mock
   private ServletConfig servletConfig;

   private ByteArrayOutputStream baos;
   private EzConfigurationService servlet;
   private final static ObjectMapper objectMapper = new ObjectMapper();
      String LINE_SEPARATOR = "\n####################################################################################\n";

   @Before
   public void setUp() throws Exception {
      this.baos = new ByteArrayOutputStream();
      when(mockResponse.getWriter()).thenReturn(new PrintWriter(baos));
         
      this.servlet = new EzConfigurationService();
//      servlet.init(servletConfig);
   }

   @After
   public void tearDown() throws Exception {
      baos = null;
   }
   
   private void testEzConfigWS(String expString) throws IOException, JSONException {
//      servlet.doGet(mockRequest, mockResponse);
      logger.info("Servlet returned: " + mockResponse);
      String acString = baos.toString();
      logger.info(LINE_SEPARATOR + "acString = <"
              + acString
              + ">" + LINE_SEPARATOR);
      logger.info(LINE_SEPARATOR + "expString = <"
              + expString
              + ">" + LINE_SEPARATOR);
      
      JSONAssert.assertEquals(expString, acString, false);
   }

   /**
    * Test getting all configuration properties from EzConfigurationService.
    * @throws java.lang.Exception If something bad happens
    */
   @Test
   public void testGetAllProperties() throws Exception {
      JsonParser parser = new JsonParser();
      JsonObject obj = parser.parse("{\"application.name\":\"testapp\",\"web.application.metrics.endpoint\":\"https://test.com/stats\",\"web.application.external.domain\":\"foo.com\",\"web.application.metrics.siteid\":\"foobar\"}").getAsJsonObject();
      
      if (obj.isJsonNull()){
         logger.info(LINE_SEPARATOR + "The Json object is NULL" + LINE_SEPARATOR);
      }
      else {
         logger.info(LINE_SEPARATOR + "The Json object is not null" + LINE_SEPARATOR);
      }
      Gson gson = new Gson();
      // With a HTTP GET request to : 
      // http://<<HOST>>/ezconfiguration-webservice/ezconfiguration
      // We expect this string to be returned
      String expString = gson.toJson(obj);
      testEzConfigWS(expString);
   }

   /**
    * Test getting a single configuration property from EzConfigurationService.
    * @throws java.lang.Exception If something bad happens
    */
   @Test
   public void testGetOneProperty() throws Exception {
      /// With a HTTP GET and the query param "application.name" sent to : 
      // http://<<HOST>>/ezconfiguration-webservice/ezconfiguration
      // We expect the string "testapp" to be returned.
      // This is because "application.name" is set to "testapp" in:
      // src/test/resources/ezbake-config.properties
      when(mockRequest.getParameter(EzConfigurationService.REQUEST_KEY_PARAM)).thenReturn("application.name");

      String expString = "\"testapp\"";
      testEzConfigWS(expString);
   }
}
