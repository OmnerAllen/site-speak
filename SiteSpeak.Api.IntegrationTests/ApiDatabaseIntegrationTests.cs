using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Xunit;

namespace SiteSpeak.Api.IntegrationTests;

public sealed class ApiDatabaseIntegrationTests : IClassFixture<SiteSpeakWebApplicationFactory>
{
    readonly HttpClient _client;

    public ApiDatabaseIntegrationTests(SiteSpeakWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            TestAuthHandler.SchemeName,
            "ignored");
    }

    [Fact]
    public async Task HealthDb_returns_ok_and_db_ping()
    {
        var response = await _client.GetAsync("/health/db");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        Assert.Equal("healthy", root.GetProperty("status").GetString());
        Assert.Equal(1, root.GetProperty("result").GetInt32());
    }

    [Fact]
    public async Task Equipment_list_includes_seeded_mini_excavator()
    {
        var response = await _client.GetAsync("/equipment");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.Equal(JsonValueKind.Array, doc.RootElement.ValueKind);

        var names = doc.RootElement.EnumerateArray().Select(e => e.GetProperty("name").GetString()).ToList();
        Assert.Contains("Mini Excavator (3.5 Ton)", names);
    }
}
