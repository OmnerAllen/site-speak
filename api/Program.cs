var builder = WebApplication.CreateBuilder(args);

builder.AddSiteSpeakTelemetry();
builder.AddSiteSpeakDatabase();
builder.AddSiteSpeakData();
builder.AddSiteSpeakAuth();

var app = builder.Build();

app.UseSiteSpeakAuth();

app.MapSiteSpeakEndpoints();

app.Run();
