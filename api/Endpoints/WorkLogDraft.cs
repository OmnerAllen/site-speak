using System.Text.Json.Serialization;

namespace SiteSpeak.Endpoints;

public class WorkLogDraft
{
    [JsonPropertyName("projectId")]
    public Guid? ProjectId { get; set; }

    [JsonPropertyName("employeeId")]
    public Guid? EmployeeId { get; set; }

    [JsonPropertyName("startedAt")]
    public DateTime? StartedAt { get; set; }

    [JsonPropertyName("endedAt")]
    public DateTime? EndedAt { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }
}
