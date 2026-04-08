import { ApiError } from "./ApiError";

/**
 * Maps a backend 400 Bad Request (Problem Details) payload into a dictionary
 * of field names and their corresponding error messages.
 * 
 * Typically, ASP.NET Core returns Problem Details for validation errors like this:
 * {
 *   "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
 *   "title": "One or more validation errors occurred.",
 *   "status": 400,
 *   "errors": {
 *     "Name": ["The Name field is required."],
 *     "Address": ["Address is too short."]
 *   }
 * }
 */
export function parseValidationErrors(error: unknown): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  if (error instanceof ApiError && error.status === 400) {
    const details = error.details;
    
    if (details && typeof details === "object") {
      const errors = details.errors;
      
      if (errors && typeof errors === "object") {
        for (const [key, messages] of Object.entries(errors)) {
          // Normalizes '.NET PascalCase' properties to 'camelCase' (e.g., "Address" -> "address")
          const fieldName = key.charAt(0).toLowerCase() + key.slice(1);
          
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrors[fieldName] = messages[0];
          } else if (typeof messages === "string") {
            fieldErrors[fieldName] = messages;
          }
        }
      }
    }
  }

  return fieldErrors;
}
