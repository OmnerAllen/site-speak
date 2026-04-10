using System.Text.Json;

namespace SiteSpeak.Estimates;

/// <summary>OpenAI tool schema for submitting a material/equipment estimate (stages with catalog IDs).</summary>
public static class MaterialEstimateToolDefinition
{
    public const string ToolName = "submit_material_estimate";

    /// <summary>Applies Site Speak radioactive accent styling to the Materials &amp; equipment sidebar (client-side).</summary>
    public const string HighlightToolName = "highlight_materials_equipment_panel";

    private static readonly JsonDocument ToolsDoc = JsonDocument.Parse(
        """
        [
          {
            "type": "function",
            "function": {
              "name": "highlight_materials_equipment_panel",
              "description": "Call once at the start of your turn. Applies the Site Speak radioactive (accent yellow) styling to the Materials & equipment sidebar so the user can see a tool ran. Takes no arguments.",
              "parameters": {
                "type": "object",
                "properties": {}
              }
            }
          },
          {
            "type": "function",
            "function": {
              "name": "submit_material_estimate",
              "description": "Submit the materials and equipment estimate for all project stages. Call this when you have selected line items from the catalog. Use only catalog IDs from the user message.",
              "parameters": {
                "type": "object",
                "properties": {
                  "stages": {
                    "type": "array",
                    "description": "Exactly four stages: demo, prep, build/install, qa — each with materials and equipment arrays (may be empty).",
                    "items": {
                      "type": "object",
                      "properties": {
                        "name": { "type": "string", "description": "Stage name: demo, prep, build/install, or qa" },
                        "materials": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "materialId": { "type": "string", "description": "UUID from the materials catalog" },
                              "quantity": { "type": "number" },
                              "note": { "type": "string" }
                            },
                            "required": ["materialId", "quantity"]
                          }
                        },
                        "equipment": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "equipmentId": { "type": "string", "description": "UUID from the equipment catalog" },
                              "halfDay": { "type": "boolean", "description": "True for half-day rental, false for full day" },
                              "note": { "type": "string" }
                            },
                            "required": ["equipmentId", "halfDay"]
                          }
                        }
                      },
                      "required": ["name", "materials", "equipment"]
                    }
                  }
                },
                "required": ["stages"]
              }
            }
          }
        ]
        """);

    private static readonly JsonDocument ToolChoiceDoc = JsonDocument.Parse(
        $"{{\"type\":\"function\",\"function\":{{\"name\":\"{ToolName}\"}}}}");

    /// <summary>OpenAI-style <c>tool_choice</c> string so the model may call highlight + submit in sequence.</summary>
    private static readonly JsonDocument ToolChoiceAutoDoc = JsonDocument.Parse("\"auto\"");

    public static JsonElement Tools => ToolsDoc.RootElement;

    public static JsonElement ToolChoiceRequired => ToolChoiceDoc.RootElement;

    public static JsonElement ToolChoiceAuto => ToolChoiceAutoDoc.RootElement;
}
