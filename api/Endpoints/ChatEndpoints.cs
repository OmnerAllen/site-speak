using System.Security.Claims;
using SiteSpeak.Chat;

public static class ChatEndpoints
{
    public static WebApplication MapChatEndpoints(this WebApplication app)
    {
        app.MapPost("/my/ai/chat", async (
            ClaimsPrincipal user,
            AiChatRequestBody body,
            AiChatService chat,
            CancellationToken cancellationToken) =>
        {
            if (user.FindFirstValue("sub") is null)
                return Results.Unauthorized();

            if (body.Messages is null || body.Messages.Count == 0)
                return Results.BadRequest(new { error = "messages is required with at least one entry." });

            var (reply, error) = await chat.ChatAsync(body.Messages, cancellationToken);
            if (error is not null)
                return Results.Json(new { error }, statusCode: StatusCodes.Status502BadGateway);

            return Results.Ok(new { reply });
        }).RequireAuthorization();

        return app;
    }
}
