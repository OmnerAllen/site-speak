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
            
            if (stream.Length == 0)
                throw new ArgumentException("The provided audio file is empty.");

            Console.WriteLine($"[WorkLog] Sending audio to Whisper. Size: {stream.Length / 1024.0:F2} KB");

            var transcript = await whisper.TranscribeAudioAsync(stream, file.FileName, language ?? "auto", prompt ?? "", cancellationToken);

            Console.WriteLine($"[WorkLog] Whisper transcript result: {transcript}");

            return Results.Ok(new { text = transcript });
        }).DisableAntiforgery().RequireAuthorization();

        app.MapPost("/my/work-logs/parse-text", async (
            ParseTextRequest req,
            ClaimsPrincipal user,
            ProjectRepository projects,
            EmployeeRepository employees,
            ILlmChatClient llm,
            CancellationToken cancellationToken) =>
        {
            var sub = user.FindFirstValue("sub");
            if (sub is null) return Results.Unauthorized();

            var companyId = await projects.GetCompanyIdForKeycloakSubAsync(sub);
            if (companyId is null) return Results.BadRequest(new { error = "No company assigned" });

            var activeProjects = await projects.ListForCompanyAsync(companyId.Value);
            var projectContext = "Available Projects:\n" + string.Join("\n", activeProjects.Select(p => $"- {p.Name} (ID: {p.Id})"));

            var activeEmployees = await employees.ListForCompanyAsync(companyId.Value);
            var employeeContext = "Available Employees:\n" + string.Join("\n", activeEmployees.Select(e => $"- {e.Name} (ID: {e.Id})"));

            var promptMsg = $@"
You are an expert parsing assistant. Extract work log details from the following transcript into a JSON object matching the 'WorkLogDraft' schema.
The current date is {DateTime.UtcNow:yyyy-MM-ddTHH:mm:ssZ}. Use this to resolve relative time like 'today' or 'yesterday'. Assume the user is in the local timezone if unspecified.

Schema:
{{
  ""projectId"": ""string or null (try to match the project name from available projects)"",
  ""employeeId"": ""string or null (try to match the employee name from available employees)"",
  ""startedAt"": ""ISO 8601 date/time or null"",
  ""endedAt"": ""ISO 8601 date/time or null"",
  ""notes"": ""string (brief notes based on the transcript) or null""
}}

{projectContext}

{employeeContext}

Transcript: {req.Transcript}";

            Console.WriteLine($"[WorkLog] Sending transcript to LLM for parsing: '{req.Transcript}'");

            var payload = new
            {
                messages = new object[]
                {
                    new { role = "system", content = promptMsg },
                    new { role = "user", content = req.Transcript }
                },
                temperature = 0.0,
                tools = new object[]
                {
                    new
                    {
                        type = "function",
                        function = new
                        {
                            name = "createWorkLogDraft",
                            parameters = new
                            {
                                type = "object",
                                properties = new
                                {
                                    projectId = new { type = new[] { "string", "null" } },
                                    employeeId = new { type = new[] { "string", "null" } },
                                    startedAt = new { type = new[] { "string", "null" } },
                                    endedAt = new { type = new[] { "string", "null" } },
                                    notes = new { type = new[] { "string", "null" } }
                                }
                            }
                        }
                    }
                },
                tool_choice = new
                {
                    type = "function",
                    function = new { name = "createWorkLogDraft" }
                }
            };

            var payloadElement = System.Text.Json.JsonSerializer.SerializeToElement(payload);
            var (rawBody, result, error) = await llm.PostChatCompletionsAsync(payloadElement, cancellationToken);
            
            Console.WriteLine($"[WorkLog] LLM returned. Error: {error}");
            
            if (result is null || error != null)
            {
                Console.WriteLine($"[WorkLog] Failed to parse info from LLM. Error: {error}");
                return Results.BadRequest(new { error = "Failed to parse info from LLM." });
            }

            var toolCall = result.ToolCalls.FirstOrDefault();
            if (toolCall is null || string.IsNullOrWhiteSpace(toolCall.Arguments))
            {
                Console.WriteLine($"[WorkLog] No tool call returned. Raw: {rawBody}");
                return Results.BadRequest(new { error = "LLM did not return the expected tool call." });
            }

            var (draft,errorMessage) = ParseLlmResponse<SiteSpeak.Endpoints.WorkLogDraft>(toolCall.Arguments);

            if (draft is null)
            {
                return Results.BadRequest(new { error = errorMessage ?? $"LLM returned invalid JSON: {toolCall.Arguments}" });
            }

            Console.WriteLine($"[WorkLog] Parsed completed! EmployeeId={draft.EmployeeId}, ProjectId={draft.ProjectId}, StartedAt={draft.StartedAt}, EndedAt={draft.EndedAt}, Notes={draft.Notes}");

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

    private static (T?, string?) ParseLlmResponse<T>(string json)
    {
        try
        {
            var res = 
                System.Text.Json.JsonSerializer.Deserialize<T>(
                    json, 
                    new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return (res, null);
        }
        catch (System.Text.Json.JsonException ex)
        {
            var errorMessage = $"JSON deserialization error: {ex.Message}, Original JSON: {json}, Type: {typeof(T).FullName}";
            Console.WriteLine(ex);
            Console.WriteLine(errorMessage);
            return (default(T), errorMessage);
        }
    }
}

public record ParseTextRequest(string Transcript);
