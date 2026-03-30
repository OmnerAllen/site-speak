using System.Diagnostics.Metrics;

public sealed class UsersPerCompanyMetricState
{
    readonly object _lock = new();
    IReadOnlyList<(string CompanyId, long Count)> _rows = Array.Empty<(string, long)>();

    public void SetSnapshot(IReadOnlyList<(string CompanyId, long Count)> rows)
    {
        lock (_lock)
            _rows = rows;
    }

    public IEnumerable<Measurement<long>> Observe()
    {
        IReadOnlyList<(string CompanyId, long Count)> copy;
        lock (_lock)
            copy = _rows;
        foreach (var (companyId, count) in copy)
            yield return new Measurement<long>(count, new KeyValuePair<string, object?>("company.id", companyId));
    }
}
