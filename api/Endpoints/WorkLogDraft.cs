using System.Text.Json.Serialization;

namespace SiteSpeak.Endpoints;

public class WorkLogDraft
{
    [JsonPropertyName("projectId")]
    public string ProjectId { get; set; }

    [JsonPropertyName("employeeId")]
    public string EmployeeId { get; set; }

    [JsonPropertyName("startedAt")]
    public string StartedAt { get; set; }

    [JsonPropertyName("endedAt")]
    public string EndedAt { get; set; }

    [JsonPropertyName("notes")]
    public string Notes { get; set; }
}
