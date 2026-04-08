using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SiteSpeak.Logic;

/// <summary>Models sometimes emit <c>0</c>/<c>1</c> instead of JSON booleans for flags.</summary>
internal sealed class LlmFlexibleBoolJsonConverter : JsonConverter<bool>
{
    public override bool Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        reader.TokenType switch
        {
            JsonTokenType.True => true,
            JsonTokenType.False => false,
            JsonTokenType.Number => reader.GetDouble() != 0,
            JsonTokenType.String => ParseBoolString(reader.GetString()),
            _ => throw new JsonException($"Cannot convert {reader.TokenType} to bool."),
        };

    private static bool ParseBoolString(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return false;
        if (bool.TryParse(s, out var b)) return b;
        if (long.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out var n)) return n != 0;
        return s.Equals("yes", StringComparison.OrdinalIgnoreCase);
    }

    public override void Write(Utf8JsonWriter writer, bool value, JsonSerializerOptions options) =>
        writer.WriteBooleanValue(value);
}

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
    [JsonConverter(typeof(LlmFlexibleBoolJsonConverter))]
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

    /// <summary>
    /// Some models wrap the contract in an extra object (e.g. <c>{"estimate":{"stages":[...]}}</c>).
    /// If the root has no <c>stages</c> array but exactly one nested object does, rewrite to <c>{"stages":...}</c>.
    /// </summary>
    public static string? TryCoerceRootStagesJson(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object) return null;
            if (root.TryGetProperty("stages", out var direct) && direct.ValueKind == JsonValueKind.Array)
                return json;

            foreach (var prop in root.EnumerateObject())
            {
                if (prop.Value.ValueKind != JsonValueKind.Object) continue;
                if (!prop.Value.TryGetProperty("stages", out var nested) || nested.ValueKind != JsonValueKind.Array)
                    continue;

                using var stream = new MemoryStream();
                using (var writer = new Utf8JsonWriter(stream, new JsonWriterOptions { Indented = false }))
                {
                    writer.WriteStartObject();
                    writer.WritePropertyName("stages");
                    nested.WriteTo(writer);
                    writer.WriteEndObject();
                }

                return Encoding.UTF8.GetString(stream.ToArray());
            }
        }
        catch (JsonException)
        {
            return null;
        }

        return null;
    }
}
