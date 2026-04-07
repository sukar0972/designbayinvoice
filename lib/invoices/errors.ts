import { ZodError } from "zod";

const PATH_LABELS: Record<string, string> = {
  "billTo.name": "Client name",
  "billTo.address1": "Client address line 1",
  "companySnapshot.companyName": "Business profile company name",
  lineItems: "Line items",
};

function pathToLabel(path: Array<string | number>) {
  if (path[0] === "lineItems" && typeof path[1] === "number" && path[2] === "description") {
    return `Line item ${path[1] + 1} description`;
  }

  const key = path.join(".");

  return PATH_LABELS[key] ?? key;
}

export function formatZodError(error: ZodError) {
  const lines = error.issues.map((issue) => {
    const safePath = issue.path.filter(
      (segment): segment is string | number =>
        typeof segment === "string" || typeof segment === "number",
    );
    const label = safePath.length > 0 ? pathToLabel(safePath) : "Form";
    return `${label}: ${issue.message}`;
  });

  return `Please fix the following before saving:\n${lines.join("\n")}`;
}

export function toUserFacingError(error: unknown) {
  if (error instanceof ZodError) {
    return new Error(formatZodError(error));
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Something went wrong.");
}
