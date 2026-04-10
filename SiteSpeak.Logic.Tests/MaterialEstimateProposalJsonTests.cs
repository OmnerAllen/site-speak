using SiteSpeak.Logic;

namespace SiteSpeak.Logic.Tests;

public class MaterialEstimateProposalJsonTests
{
    [Fact]
    public void TryParse_ValidJson_Deserializes()
    {
        const string json = """
            {
              "stages": [
                {
                  "name": "demo",
                  "materials": [{"materialId": "11111111-1111-1111-1111-111111111111", "quantity": 2}],
                  "equipment": [{"equipmentId": "22222222-2222-2222-2222-222222222222", "halfDay": false}]
                }
              ]
            }
            """;

        var p = MaterialEstimateProposalJson.TryParse(json);
        Assert.NotNull(p);
        Assert.Single(p!.Stages!);
        Assert.Equal("demo", p.Stages![0].Name);
        Assert.Single(p.Stages[0].Materials!);
        Assert.Equal(2, p.Stages[0].Materials![0].Quantity);
    }

    [Fact]
    public void ExtractJsonObject_StripsMarkdownFence()
    {
        var raw = """
            ```json
            {"stages":[]}
            ```
            """;
        var extracted = MaterialEstimateProposalJson.ExtractJsonObject(raw);
        Assert.Equal("{\"stages\":[]}", extracted);
    }

    [Fact]
    public void TryParse_HalfDayAsNumber_Deserializes()
    {
        const string json = """
            {
              "stages": [
                {
                  "name": "prep",
                  "materials": [],
                  "equipment": [{"equipmentId": "22222222-2222-2222-2222-222222222222", "halfDay": 1.0, "note": null}]
                }
              ]
            }
            """;

        var p = MaterialEstimateProposalJson.TryParse(json);
        Assert.NotNull(p);
        Assert.True(p!.Stages![0].Equipment![0].HalfDay);
    }

    [Fact]
    public void TryCoerceRootStagesJson_UnwrapsNestedObject()
    {
        const string wrapped = """{"proposal":{"stages":[{"name":"demo","materials":[],"equipment":[]}]}}""";
        var coerced = MaterialEstimateProposalJson.TryCoerceRootStagesJson(wrapped);
        Assert.NotNull(coerced);
        var p = MaterialEstimateProposalJson.TryParse(coerced!);
        Assert.NotNull(p);
        Assert.Single(p!.Stages!);
        Assert.Equal("demo", p.Stages![0].Name);
    }
}
