using System.Text.Json;
using System.Text.Json.Serialization;

namespace SiteSpeak.Logic;

/// <summary>LLM JSON contract for material/equipment estimates per stage.</summary>
public sealed class MaterialEstimateProposal
{
    [JsonPropertyName("stages")]
    public List<MaterialEstimateStageJson>? Stages { get; set; }
}

public sealed class MaterialEstimateStageJson
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("materials")]
    public List<MaterialEstimateMaterialLineJson>? Materials { get; set; }

    [JsonPropertyName("equipment")]
    public List<MaterialEstimateEquipmentLineJson>? Equipment { get; set; }
}

public sealed class MaterialEstimateMaterialLineJson
{
    [JsonPropertyName("materialId")]
    public Guid MaterialId { get; set; }

    [JsonPropertyName("quantity")]
    public decimal Quantity { get; set; }

    [JsonPropertyName("note")]
    public string? Note { get; set; }
}

public sealed class MaterialEstimateEquipmentLineJson
{
    [JsonPropertyName("equipmentId")]
    public Guid EquipmentId { get; set; }

    [JsonPropertyName("halfDay")]
    public bool HalfDay { get; set; }

    [JsonPropertyName("note")]
    public string? Note { get; set; }
}

public static class MaterialEstimateProposalJson
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    /// <summary>Parse proposal JSON; returns null on failure.</summary>
    public static MaterialEstimateProposal? TryParse(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<MaterialEstimateProposal>(json, Options);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>Extract JSON object from model text (strips optional markdown fences).</summary>
    public static string? ExtractJsonObject(string? content)
    {
        if (string.IsNullOrWhiteSpace(content)) return null;
        var s = content.Trim();
        if (s.StartsWith("```", StringComparison.Ordinal))
        {
            var firstNl = s.IndexOf('\n');
            if (firstNl >= 0) s = s[(firstNl + 1)..];
            var fence = s.LastIndexOf("```", StringComparison.Ordinal);
            if (fence >= 0) s = s[..fence];
            s = s.Trim();
        }

        var start = s.IndexOf('{');
        var end = s.LastIndexOf('}');
        if (start < 0 || end <= start) return null;
        return s[start..(end + 1)];
    }
}
