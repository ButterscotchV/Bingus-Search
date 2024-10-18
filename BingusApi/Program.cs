using AspNetCoreRateLimit;
using BingusApi.EmbeddingServices;
using BingusLib.Config;
using BingusLib.FaqHandling;
using BingusLib.HNSW;
using HNSW.Net;
using RocksDbSharp;

var builder = WebApplication.CreateBuilder(args);

var configDir = Path.GetFullPath("config");
var appSettings = "appsettings.json";
var appSettingsEnv = $"appsettings.{builder.Environment.EnvironmentName}.json";
var bingusConfig = "bingus_config.json";
var faqConfig = "faq_config.json";

builder.Configuration.SetBasePath(configDir);
string GetConfig(string fileName)
{
    return builder.Configuration.GetFileProvider().GetFileInfo(fileName).PhysicalPath
        ?? Path.Combine(configDir, fileName);
}

// Load appsettings.json
builder.Configuration.AddJsonFile(GetConfig(appSettings), false, true);
builder.Configuration.AddJsonFile(GetConfig(appSettingsEnv), true, true);
builder.Services.AddOptions();

// Set up ratelimiting
// Needed to store rate limit counters and ip rules
builder.Services.AddMemoryCache();

// Load general configuration from appsettings.json
builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));

// Load IP rules from appsettings.json
builder.Services.Configure<IpRateLimitPolicies>(
    builder.Configuration.GetSection("IpRateLimitPolicies")
);

// Inject counter and rules stores
builder.Services.AddInMemoryRateLimiting();

// Configuration (resolvers, counter key builders)
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

// Add dependencies
builder.Services.AddSingleton<IEmbeddingStore>(sp => new RocksDbStore(
    RocksDb.Open(new DbOptions().SetCreateIfMissing(true), "embedding_cache")
));
builder.Services.AddSingleton(sp =>
    new JsonConfigHandler<BingusConfig>(GetConfig(bingusConfig)).InitializeConfig(
        BingusConfig.Default,
        sp.GetService<ILogger<BingusConfig>>()
    )
);
builder.Services.AddSingleton(sp =>
    new JsonConfigHandler<FaqConfig>(GetConfig(faqConfig)).InitializeConfig(
        FaqConfig.Default,
        sp.GetService<ILogger<FaqConfig>>()
    )
);

// Initialize Bingus library dependencies
builder.Services.AddHttpClient();
builder.Services.AddSingleton(sp => sp.GetRequiredService<BingusConfig>().GetSentenceEncoder(sp));
builder.Services.AddSingleton(CosineDistance.SIMDForUnits);
builder.Services.AddSingleton<IProvideRandomValues>(sp => new SeededRandom(
    sp.GetService<BingusConfig>()?.HnswSeed ?? 42
));
builder.Services.AddSingleton(sp =>
{
    var parameters = new SmallWorld<ILazyItem<float[]>, float>.Parameters
    {
        M = 15,
        LevelLambda = 1 / Math.Log(15),
        NeighbourHeuristic = NeighbourSelectionHeuristic.SelectHeuristic,
        ConstructionPruning = 400,
        ExpandBestSelection = true,
        KeepPrunedConnections = true,
        EnableDistanceCacheForConstruction = true,
    };
    return parameters;
});
builder.Services.AddSingleton<FaqHandler>();

// Add services to the container
builder.Services.AddControllers();

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options => options.SupportNonNullableReferenceTypes());

var app = builder.Build();

// Configure the HTTP request pipeline
app.UseSwagger();
app.UseSwaggerUI();

app.UseIpRateLimiting();

// app.UseHttpsRedirection();
// app.UseAuthorization();
app.MapControllers();

// Load FAQ
var useQ2A = app.Services.GetService<BingusConfig>()?.UseQ2A ?? false;
var faqConf = app.Services.GetRequiredService<FaqConfig>();
app.Services.GetRequiredService<FaqHandler>()
    .AddItems(useQ2A ? faqConf.AnswerEntryEnumerator() : faqConf.QaEntryEnumerator(), useQ2A);

app.Run();
