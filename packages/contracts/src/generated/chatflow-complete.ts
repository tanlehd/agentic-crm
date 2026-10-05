/* Generated. Do not edit. */

export interface ChatflowComplete {
  qualification: {
    service_interest: string;
    need_summary: string;
    preferred_contact_method: "messenger" | "phone";
    phone?: string | null;
    contact_permission: boolean;
  };
  consent_message_id: string;
  owner_revision: string;
}
