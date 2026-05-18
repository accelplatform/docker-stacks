package jp.co.intra_mart.system.platform;

import javax.servlet.http.HttpServletRequest;

import jp.co.intra_mart.foundation.platform.BaseUrlProvider;

public class EnvironmentVariableBaseUrlProvider implements BaseUrlProvider {

    @Override
    public String getBaseUrl(HttpServletRequest request) {
        try {
            String baseUrl = System.getenv("BASE_URL");
            if (baseUrl == null || baseUrl.isEmpty()) {
                return null;
            }
            return baseUrl;
        } catch (SecurityException ignore) {
            return null;
        }
    }
}
