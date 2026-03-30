using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

public static class AuthWebApplicationBuilderExtensions
{
    private const string KeycloakIssuer = "https://auth.snowse-ts.duckdns.org/realms/frontend";

    public static WebApplicationBuilder AddSiteSpeakAuth(this WebApplicationBuilder builder)
    {
        var jwks = new JsonWebKeySet(KeycloakJwks.Json);

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateAudience = false,
                    ValidIssuer = KeycloakIssuer,
                    IssuerSigningKeys = jwks.GetSigningKeys(),
                };
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        context.Token = context.Request.Cookies["id_token"];
                        return Task.CompletedTask;
                    }
                };
            });

        builder.Services.AddAuthorizationBuilder()
            .AddPolicy("AdminOnly", policy =>
                policy.AddRequirements(new RoleRequirement("admin")))
            .AddPolicy("WorkerOrAdmin", policy =>
                policy.AddRequirements(new RoleRequirement("worker", "admin")));

        builder.Services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationHandler, RoleAuthorizationHandler>();

        return builder;
    }
}
