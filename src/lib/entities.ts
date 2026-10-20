export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "url"
  | "password"
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

export const CAR_BUYER_STATUSES = [
  "New",
  "Contacted",
  "Visit Planned",
  "Visited",
  "Negotiation",
  "Sold",
  "Lost",
] as const;

export const VELORA_ORDER_STATUSES = [
  "New",
  "Confirmed",
  "In Financing",
  "Ready",
  "Delivered",
  "Cancelled",
] as const;

export const VELORA_FINANCING_STATUSES = [
  "None",
  "Applying",
  "Approved",
  "Declined",
  "Paid",
] as const;

export const VELORA_CURRENCIES = ["DZD", "EUR", "USD"] as const;

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
  { name: "project_amount", label: "Project amount (somme projet)", type: "number" },
  { name: "amount_paid", label: "Amount paid (tranche versée)", type: "number" },
  { name: "website_url", label: "Website URL", type: "url" },
  { name: "github_url", label: "GitHub link", type: "url" },
  { name: "domain", label: "Domain", type: "text" },
  { name: "vercel_project", label: "Vercel project URL", type: "url" },
  { name: "supabase_project", label: "Backend project URL", type: "url" },
  { name: "client_password", label: "Client password", type: "password" },
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
  { name: "vercel_url", label: "Vercel URL", type: "url" },
  { name: "contact_email", label: "Email", type: "text" },
  { name: "access_password", label: "Password", type: "password" },
  { name: "notes", label: "Notes", type: "textarea" },
];

export const carBuyerFields: Field[] = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "phone", label: "Phone number", type: "text" },
  { name: "address", label: "Address", type: "text" },
  { name: "visit_date", label: "Date de visite", type: "date" },
  { name: "car_interest", label: "Car they're interested in", type: "text" },
  { name: "status", label: "Status", type: "select", options: CAR_BUYER_STATUSES },
  { name: "notes", label: "Notes", type: "textarea" },
];

export const veloraClientFields: Field[] = [
  { name: "name", label: "Client name", type: "text", required: true },
  { name: "phone", label: "Phone number", type: "text" },
  { name: "email", label: "Email", type: "text" },
  { name: "address", label: "Address", type: "text" },
  { name: "city", label: "City", type: "text" },
  { name: "notes", label: "Notes", type: "textarea" },
];

export const veloraOrderFields: Field[] = [
  {
    name: "client_id",
    label: "Client",
    type: "relation",
    relation: "velora_clients",
    required: true,
  },
  { name: "item", label: "Item / car sold", type: "text", required: true },
  { name: "status", label: "Status", type: "select", options: VELORA_ORDER_STATUSES },
  { name: "order_date", label: "Order date", type: "date" },
  { name: "sold_at", label: "Date sold", type: "date" },
  { name: "sale_price", label: "Sale price (prix de vente)", type: "number" },
  { name: "expenses", label: "Expenses (dépenses)", type: "number" },
  { name: "currency", label: "Currency", type: "select", options: VELORA_CURRENCIES },
  { name: "deposit", label: "Deposit paid (apport)", type: "number" },
  { name: "financed_amount", label: "Financed amount", type: "number" },
  { name: "monthly_payment", label: "Monthly payment", type: "number" },
  { name: "term_months", label: "Term (months)", type: "number" },
  {
    name: "financing_status",
    label: "Financing status",
    type: "select",
    options: VELORA_FINANCING_STATUSES,
  },
  { name: "financing_org", label: "Bank / organism", type: "text" },
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
  car_buyers: "name",
  velora_clients: "name",
  velora_orders: "item",
  digital_products: "product_name",
  customers: "name",
  resources: "name",
};

export const searchColumns: Record<string, string[]> = {
  tasks: ["title", "description", "category", "notes"],
  client_websites: ["project_name", "client_name", "client_email", "domain", "description"],
  saas_projects: ["project_name", "description", "notes"],
  car_buyers: ["name", "phone", "address", "car_interest", "notes"],
  velora_clients: ["name", "phone", "email", "address", "city", "notes"],
  velora_orders: ["item", "financing_org", "notes", "status", "financing_status"],
  digital_products: ["product_name", "description", "notes"],
  customers: ["name", "email", "phone", "notes"],
  resources: ["name", "url", "category", "description", "notes"],
};

export const entityRoutes: Record<string, string> = {
  tasks: "/tasks",
  client_websites: "/websites",
  saas_projects: "/saas",
  car_buyers: "/cars",
  velora_clients: "/velora",
  velora_orders: "/velora",
  digital_products: "/products",
  customers: "/customers",
  resources: "/resources",
};

export const entityLabels: Record<string, string> = {
  tasks: "Tasks",
  client_websites: "Client Websites",
  saas_projects: "SaaS Projects",
  car_buyers: "Car Buyers",
  velora_clients: "Velora Clients",
  velora_orders: "Velora Orders",
  digital_products: "Digital Products",
  customers: "Customers",
  resources: "Resources",
};

export const entityFields: Record<string, Field[]> = {
  tasks: taskFields,
  client_websites: websiteFields,
  saas_projects: saasFields,
  car_buyers: carBuyerFields,
  velora_clients: veloraClientFields,
  velora_orders: veloraOrderFields,
  digital_products: productFields,
  customers: customerFields,
  resources: resourceFields,
  sales: saleFields,
};
