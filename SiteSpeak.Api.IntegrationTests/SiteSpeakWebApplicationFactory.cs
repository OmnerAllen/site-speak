using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace SiteSpeak.Api.IntegrationTests;

public sealed class SiteSpeakWebApplicationFactory : WebApplicationFactory<Program>
{
    static SiteSpeakWebApplicationFactory()
    {
        Environment.SetEnvironmentVariable("OTEL_SDK_DISABLED", "true");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        var conn =
            Environment.GetEnvironmentVariable("INTEGRATION_TEST_CONNECTION_STRING")
            ?? "Host=127.0.0.1;Port=5434;Database=sitespeak;Username=postgres;Password=postgres";

        builder.UseSetting("ConnectionStrings:DefaultConnection", conn);

        builder.ConfigureTestServices(services =>
        {
            services.PostConfigure<AuthenticationOptions>(options =>
            {
                options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
            });

            services.AddAuthentication()
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
        });
    }
}
