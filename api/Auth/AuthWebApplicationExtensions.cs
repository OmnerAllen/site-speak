public static class AuthWebApplicationExtensions
{
    public static WebApplication UseSiteSpeakAuth(this WebApplication app)
    {
        app.UseAuthentication();
        app.UseAuthorization();
        return app;
    }
}
