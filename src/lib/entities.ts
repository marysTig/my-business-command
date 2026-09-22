export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "url"
  | "tags"
  | "progress"
  | "relation";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  options?: readonly string[];
  relation?: string;
  required?: boolean;
  placeholder?: string;
  group?: string;
};

export const TASK_STATUSES = [
  "Backlog",
  "To Do",
  "In Progress",
  "Waiting",
  "Scheduled",
  "Done",
  "Blocked",
] as const;

export const TASK_BOARD_STATUSES = ["To Do", "In Progress", "Waiting", "Done"] as const;

export const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;

export const WEBSITE_STATUSES = [
  "Lead",
  "Planned",
  "In Progress",
  "Waiting for Client",
  "Testing",
  "Completed",
  "Blocked",
] as const;

export const SAAS_STATUSES = [
  "Idea",
  "Planned",
  "In Development",
  "Waiting",
  "Ready",
  "Scheduled",
  "Completed",
  "Paused",
] as const;

export const PROPERTY_TYPES = [
  "Apartment",
  "Villa",
  "House",
  "Land",
  "Commercial",
  "Other",
] as const;

export const PROPERTY_STATUSES = [
  "Dataset",
  "Draft",
  "Published",
  "Reserved",
  "Sold",
  "Archived",
] as const;

export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Interested",
  "Visit",
  "Negotiation",
  "Converted",
  "Lost",
] as const;

export const PRODUCT_TYPES = [
  "File",
  "Subscription",
  "Course",
  "Template",
  "Software",
  "Other",
] as const;

export const PRODUCT_STATUSES = ["Draft", "Active", "Archived"] as const;

export const PAYMENT_STATUSES = ["Pending", "Paid", "Failed", "Refunded"] as const;

export const ACCESS_STATUSES = ["Active", "Expired", "Revoked"] as const;

export const RESOURCE_CATEGORIES = [
  "UI inspiration",
  "Website",
  "Documentation",
  "Tool",
  "Tutorial",
  "Image resource",
  "Icon resource",
  "AI tool",
  "Marketing resource",
  "Other",
] as const;

export const CURRENCIES = ["USD", "EUR", "DZD", "GBP"] as const;

export const linkFields: Field[] = [
  { name: "client_website_id", label: "Client website", type: "relation", relation: "client_websites", group: "Links" },
  { name: "saas_project_id", label: "SaaS project", type: "relation", relation: "saas_projects", group: "Links" },
  { name: "property_id", label: "Property", type: "relation", relation: "properties", group: "Links" },
  { name: "digital_product_id", label: "Digital product", type: "relation", relation: "digital_products", group: "Links" },
];

export const taskFields: Field[] = [
  { name: "title", label: "Title", type: "text", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "status", label: "Status", type: "select", options: TASK_STATUSES },
  { name: "priority", label: "Priority", type: "select", options: TASK_PRIORITIES },
  { name: "due_date", label: "Due date", type: "date" },
  { name: "category", label: "Category", type: "text" },
  ...linkFields,
  { name: "notes", label: "Notes", type: "textarea" },
];

export const websiteFields: Field[] = [
  { name: "project_name", label: "Project name", type: "text", required: true },
  { name: "client_name", label: "Client name", type: "text", required: true },
  { name: "client_phone", label: "Client phone", type: "text" },
  { name: "client_email", label: "Client email", type: "text" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "status", label: "Status", type: "select", options: WEBSITE_STATUSES },
  { name: "progress_percentage", label: "Progress", type: "progress" },
  { name: "start_date", label: "Start date", type: "date" },
  { name: "deadline", label: "Deadline", type: "date" },
  { name: "website_url", label: "Website URL", type: "url" },
  { name: "domain", label: "Domain", type: "text" },
  { name: "vercel_project", label: "Vercel project URL", type: "url" },
  { name: "supabase_project", label: "Backend project URL", type: "url" },
  { name: "notes", label: "Notes", type: "textarea" },
];

export const saasFields: Field[] = [
  { name: "project_name", label: "Project name", type: "text", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "status", label: "Status", type: "select", options: SAAS_STATUSES },
  { name: "progress_percentage", label: "Progress", type: "progress" },
  { name: "start_date", label: "Start date", type: "date" },
  { name: "target_date", label: "Target date", type: "date" },
  { name: "repository_url", label: "Repository URL", type: "url" },
  { name: "production_url", label: "Production URL", type: "url" },
  { name: "notes", label: "Notes", type: "textarea" },
];

export const propertyFields: Field[] = [
  { name: "title", label: "Title", type: "text", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "property_type", label: "Type", type: "select", options: PROPERTY_TYPES },
  { name: "status", label: "Status", type: "select", options: PROPERTY_STATUSES },
  { name: "city", label: "City", type: "text" },
  { name: "commune", label: "Commune", type: "text" },
  { name: "price", label: "Price", type: "number" },
  { name: "surface", label: "Surface (m²)", type: "number" },
  { name: "bedrooms", label: "Bedrooms", type: "number" },
  { name: "bathrooms", label: "Bathrooms", type: "number" },
  { name: "marketplace_url", label: "Marketplace URL", type: "url" },
  { name: "notes", label: "Notes", type: "textarea" },
];

export const leadFields: Field[] = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "phone", label: "Phone", type: "text" },
  { name: "email", label: "Email", type: "text" },
  { name: "source", label: "Source", type: "text" },
  { name: "status", label: "Status", type: "select", options: LEAD_STATUSES },
  { name: "budget", label: "Budget", type: "number" },
  { name: "desired_city", label: "Desired city", type: "text" },
  { name: "desired_property_type", label: "Desired type", type: "select", options: PROPERTY_TYPES },
  { name: "notes", label: "Notes", type: "textarea" },
];

export const productFields: Field[] = [
  { name: "product_name", label: "Product name", type: "text", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "product_type", label: "Type", type: "select", options: PRODUCT_TYPES },
  { name: "status", label: "Status", type: "select", options: PRODUCT_STATUSES },
  { name: "price", label: "Price", type: "number" },
  { name: "currency", label: "Currency", type: "select", options: CURRENCIES },
  { name: "google_drive_url", label: "Google Drive URL", type: "url" },
  { name: "landing_page_url", label: "Landing page URL", type: "url" },
  { name: "notes", label: "Notes", type: "textarea" },
];

export const customerFields: Field[] = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "email", label: "Email", type: "text" },
  { name: "phone", label: "Phone", type: "text" },
  { name: "product_id", label: "Product", type: "relation", relation: "digital_products" },
  { name: "product_type", label: "Product type", type: "select", options: PRODUCT_TYPES },
  { name: "purchase_date", label: "Purchase date", type: "date" },
  { name: "amount", label: "Amount", type: "number" },
  { name: "payment_status", label: "Payment status", type: "select", options: PAYMENT_STATUSES },
  { name: "access_status", label: "Access status", type: "select", options: ACCESS_STATUSES },
  { name: "expiration_date", label: "Expiration date", type: "date" },
  { name: "notes", label: "Notes", type: "textarea" },
];

export const saleFields: Field[] = [
  { name: "customer_id", label: "Customer", type: "relation", relation: "customers" },
  { name: "product_id", label: "Product", type: "relation", relation: "digital_products" },
  { name: "amount", label: "Amount", type: "number" },
  { name: "currency", label: "Currency", type: "select", options: CURRENCIES },
  { name: "payment_status", label: "Payment status", type: "select", options: PAYMENT_STATUSES },
  { name: "purchase_date", label: "Purchase date", type: "date" },
  { name: "notes", label: "Notes", type: "textarea" },
];

export const resourceFields: Field[] = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "url", label: "URL", type: "url" },
  { name: "category", label: "Category", type: "select", options: RESOURCE_CATEGORIES },
  { name: "description", label: "Description", type: "textarea" },
  { name: "tags", label: "Tags (comma separated)", type: "tags" },
  ...linkFields,
  { name: "notes", label: "Notes", type: "textarea" },
];

/** Column used as the human label of a row, per table. */
export const labelColumn: Record<string, string> = {
  tasks: "title",
  client_websites: "project_name",
  saas_projects: "project_name",
  properties: "title",
  leads: "name",
  digital_products: "product_name",
  customers: "name",
  resources: "name",
  property_dataset: "title",
};

export const searchColumns: Record<string, string[]> = {
  tasks: ["title", "description", "category", "notes"],
  client_websites: ["project_name", "client_name", "client_email", "domain", "description"],
  saas_projects: ["project_name", "description", "notes"],
  properties: ["title", "city", "commune", "description"],
  leads: ["name", "email", "phone", "desired_city", "notes"],
  digital_products: ["product_name", "description", "notes"],
  customers: ["name", "email", "phone", "notes"],
  resources: ["name", "url", "category", "description", "notes"],
};

export const entityRoutes: Record<string, string> = {
  tasks: "/tasks",
  client_websites: "/websites",
  saas_projects: "/saas",
  properties: "/properties",
  leads: "/leads",
  digital_products: "/products",
  customers: "/customers",
  resources: "/resources",
};

export const entityLabels: Record<string, string> = {
  tasks: "Tasks",
  client_websites: "Client Websites",
  saas_projects: "SaaS Projects",
  properties: "Properties",
  leads: "Leads",
  digital_products: "Digital Products",
  customers: "Customers",
  resources: "Resources",
};

export const entityFields: Record<string, Field[]> = {
  tasks: taskFields,
  client_websites: websiteFields,
  saas_projects: saasFields,
  properties: propertyFields,
  leads: leadFields,
  digital_products: productFields,
  customers: customerFields,
  resources: resourceFields,
  sales: saleFields,
};
