namespace SiteSpeak.Logic;

public static class EmployeeTypeRules
{
    public static bool IsAllowed(string type) => type is "admin" or "worker";
}
