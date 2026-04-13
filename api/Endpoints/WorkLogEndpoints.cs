using System.Security.Claims;
using SiteSpeak.Llm;
using Microsoft.AspNetCore.Http;
using System.Threading;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using System;

public static class WorkLogEndpoints
{
    public static WebApplication MapWorkLogEndpoints(this WebApplication app)
    {
        app.MapPost("/my/work-logs/transcribe-chunk", async (
            IFormFile file,
            [FromForm] string? language,
            [FromForm] string? prompt,
            ClaimsPrincipal user,
            IWhisperClient whisper,
            CancellationToken cancellationToken) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            using var stream = file.OpenReadStream();
            var transcript = await whisper.TranscribeAudioAsync(stream, file.FileName, language ?? "auto", prompt ?? "", cancellationToken);

            return Results.Ok(new { text = transcript });
        }).DisableAntiforgery().RequireAuthorization();

        app.MapPost("/my/work-logs/parse-text", async (
            ParseTextRequest req,
            ClaimsPrincipal user,
            ProjectRepository projects,
            ILlmChatClient llm,
            CancellationToken cancellationToken) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var activeProjects = await projects.ListForCompanyAsync(companyId.Value);
            var projectContext = "Available Projects:\n" + string.Join("\n", activeProjects.Select(p => $"- {p.Name} (ID: {p.Id})"));

            var promptMsg = $@"
You are an expert parsing assistant. Extract work log details from the following transcript into a JSON object matching the 'WorkLogDraft' schema.
The current date is {DateTime.UtcNow:yyyy-MM-ddTHH:mm:ssZ}. Use this to resolve relative time like 'today' or 'yesterday'. Assume the user is in the local timezone if unspecified.

Schema:
{{
  ""projectId"": ""guid or null (try to match the project name from available projects)"",
  ""startedAt"": ""ISO 8601 date/time or null"",
  ""endedAt"": ""ISO 8601 date/time or null"",
  ""notes"": ""string (brief notes based on the transcript) or null""
}}

{projectContext}

Transcript: {req.Transcript}";

            var messages = new[] { new LlmChatMessage("user", promptMsg) };
            var (resultStr, error) = await llm.CompleteAsync(messages, true, cancellationToken);
            if (string.IsNullOrWhiteSpace(resultStr) || error != null)
                return Results.BadRequest(new { error = "Failed to parse info from LLM." });

            SiteSpeak.Endpoints.WorkLogDraft? draft = null;
            try
            {
                draft = System.Text.Json.JsonSerializer.Deserialize<SiteSpeak.Endpoints.WorkLogDraft>(resultStr, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch (System.Text.Json.JsonException)
            {
                // swallow
            }

            if (draft is null) return Results.BadRequest(new { error = "LLM returned invalid JSON." });

            return Results.Ok(new { draft, transcript = req.Transcript });
        }).RequireAuthorization();

        app.MapGet("/my/work-logs", async (ClaimsPrincipal user, ProjectRepository projects, WorkLogRepository workLogs) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            return Results.Ok(await workLogs.ListForCompanyAsync(companyId.Value));
        }).RequireAuthorization();

        app.MapPost("/my/work-logs", async (ClaimsPrincipal user, ProjectRepository projects, WorkLogRepository workLogs, WorkLogBody body) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var created = await workLogs.CreateAsync(companyId.Value, body);
            if (created is null) return Results.BadRequest(new { error = "Invalid work log (check times, employee, and project)." });
            return Results.Created($"/my/work-logs/{created.Id}", created);
        }).RequireAuthorization();

        app.MapPut("/my/work-logs/{id:guid}", async (Guid id, ClaimsPrincipal user, ProjectRepository projects, WorkLogRepository workLogs, WorkLogBody body) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var updated = await workLogs.UpdateAsync(id, companyId.Value, body);
            if (updated is null) return Results.NotFound();
            return Results.Ok(updated);
        }).RequireAuthorization();

        app.MapDelete("/my/work-logs/{id:guid}", async (Guid id, ClaimsPrincipal user, ProjectRepository projects, WorkLogRepository workLogs) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            return await workLogs.SoftDeleteAsync(id, companyId.Value) ? Results.NoContent() : Results.NotFound();
        }).RequireAuthorization();

        return app;
    }
}

public record ParseTextRequest(string Transcript);
